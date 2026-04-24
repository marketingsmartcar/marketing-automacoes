#!/usr/bin/env node
/**
 * renovar-token-google.js
 * Gera um novo refresh_token para o Google Ads API.
 *
 * Uso: node tools/renovar-token-google.js
 */

'use strict';

require('dotenv').config();

const https        = require('https');
const http         = require('http');
const { execSync } = require('child_process');
const fs           = require('fs');
const path         = require('path');
const { GoogleAdsApi } = require('google-ads-api');

const MCC_ESPERADO = '1258920694';

const CLIENT_ID     = process.env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
const REDIRECT_URI  = 'http://localhost:9876/callback';
const SCOPE         = 'https://www.googleapis.com/auth/adwords';
const ENV_PATH      = path.join(__dirname, '..', '.env');

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ GOOGLE_ADS_CLIENT_ID ou GOOGLE_ADS_CLIENT_SECRET não configurados no .env');
  process.exit(1);
}

const authUrl =
  `https://accounts.google.com/o/oauth2/auth` +
  `?client_id=${CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent(SCOPE)}` +
  `&access_type=offline` +
  `&prompt=consent`;

console.log('\n══════════════════════════════════════════════════');
console.log('  🔑  Renovação de Token Google Ads');
console.log('══════════════════════════════════════════════════');
console.log('\n1. Abrindo o navegador para autorização...');
console.log('\n   Se não abrir automaticamente, acesse:');
console.log(`\n   ${authUrl}\n`);

// Tenta abrir o navegador no Windows
try { execSync(`start "" "${authUrl}"`, { stdio: 'ignore' }); } catch (_) {}

// Sobe servidor local para capturar o callback
const server = http.createServer(async (req, res) => {
  const url  = new URL(req.url, 'http://localhost:9876');
  const code = url.searchParams.get('code');

  if (!code) {
    res.writeHead(400); res.end('Código não encontrado.');
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<h2 style="font-family:sans-serif;color:green">✅ Autorizado! Volte ao terminal.</h2>');

  server.close();
  console.log('✅ Código recebido. Trocando por refresh_token...\n');

  // Troca o code pelo refresh_token
  const body = new URLSearchParams({
    code,
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri:  REDIRECT_URI,
    grant_type:    'authorization_code',
  }).toString();

  const tokenResp = await new Promise((resolve, reject) => {
    const req2 = https.request({
      hostname: 'oauth2.googleapis.com',
      path:     '/token',
      method:   'POST',
      headers:  { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    }, res2 => {
      let data = '';
      res2.on('data', c => data += c);
      res2.on('end', () => resolve(JSON.parse(data)));
    });
    req2.on('error', reject);
    req2.write(body);
    req2.end();
  });

  if (tokenResp.error) {
    console.error('❌ Erro ao trocar token:', tokenResp.error_description || tokenResp.error);
    process.exit(1);
  }

  const newRefreshToken = tokenResp.refresh_token;
  if (!newRefreshToken) {
    console.error('❌ Nenhum refresh_token retornado. Tente revogar o acesso e repetir.');
    process.exit(1);
  }

  // Verifica se o token tem acesso ao MCC correto
  console.log('🔍 Verificando contas acessíveis...\n');
  const gadsApi = new GoogleAdsApi({
    client_id:       CLIENT_ID,
    client_secret:   CLIENT_SECRET,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
  });
  let ids = [];
  try {
    const contasResp = await gadsApi.listAccessibleCustomers(newRefreshToken);
    const idsRaw = contasResp.resource_names || contasResp.resourceNames || [];
    ids = idsRaw.map(n => n.replace('customers/', ''));
  } catch (e) {
    console.log('   Aviso ao listar contas:', e.message);
  }
  console.log('   Contas encontradas:', ids.length ? ids.join(', ') : '(nenhuma)');

  if (!ids.includes(MCC_ESPERADO)) {
    console.error(`\n❌ CONTA ERRADA! O MCC ${MCC_ESPERADO} não está acessível com este token.`);
    console.error('   Contas disponíveis:', ids.join(', ') || '(nenhuma)');
    console.error('\n   ➡️  Rode o script de novo e selecione a conta correta do Google Ads.');
    console.error('       (a conta que gerencia as lojas BR Pneus e Peg Pneus)\n');
    process.exit(1);
  }

  console.log(`   ✅ MCC ${MCC_ESPERADO} confirmado!\n`);

  // Atualiza o .env
  let envContent = fs.readFileSync(ENV_PATH, 'utf8');
  if (envContent.includes('GOOGLE_ADS_REFRESH_TOKEN=')) {
    envContent = envContent.replace(/GOOGLE_ADS_REFRESH_TOKEN=.*/,
      `GOOGLE_ADS_REFRESH_TOKEN=${newRefreshToken}`);
  } else {
    envContent += `\nGOOGLE_ADS_REFRESH_TOKEN=${newRefreshToken}\n`;
  }
  fs.writeFileSync(ENV_PATH, envContent, 'utf8');

  // Salva timestamp de renovação para monitor-token-google.js rastrear a idade do token
  const stateFile = path.join(__dirname, '..', 'output', 'google-token-state.json');
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.writeFileSync(stateFile, JSON.stringify({ renovadoEm: new Date().toISOString() }, null, 2), 'utf8');

  console.log('══════════════════════════════════════════════════');
  console.log('  ✅  Novo refresh_token salvo no .env!');
  console.log('══════════════════════════════════════════════════');
  console.log('\n  Agora reinicie o bot:');
  console.log('  pm2 restart br-pneus-bot --update-env\n');
  process.exit(0);
});

server.listen(9876, () => {
  console.log('   Aguardando autorização no navegador...\n');
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error('❌ Porta 9876 em uso. Feche outro processo e tente novamente.');
  } else {
    console.error('❌ Erro no servidor:', err.message);
  }
  process.exit(1);
});
