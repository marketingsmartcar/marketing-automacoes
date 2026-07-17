'use strict';
/**
 * Renova GOOGLE_ADS_REFRESH_TOKEN automaticamente via servidor local.
 * Uso: node tools/renovar-google-token.js
 */
require('dotenv').config();

const http    = require('http');
const { exec } = require('child_process');
const fs      = require('fs');
const path    = require('path');
const { OAuth2Client } = require('google-auth-library');

const CLIENT_ID     = process.env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
const PORT          = 8765;
const REDIRECT      = `http://localhost:${PORT}/callback`;
const ENV_PATH      = path.join(__dirname, '..', '.env');

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ GOOGLE_ADS_CLIENT_ID ou GOOGLE_ADS_CLIENT_SECRET não configurados no .env');
  process.exit(1);
}

const oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt:      'consent',
  scope:       ['https://www.googleapis.com/auth/adwords'],
});

// Servidor local para capturar o callback do Google
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== '/callback') { res.end(); return; }

  const code  = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h2>❌ Autorização cancelada.</h2><p>Você pode fechar esta aba.</p>');
    console.error(`\n❌ Autorização recusada: ${error}\n`);
    server.close();
    process.exit(1);
  }

  if (!code) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h2>❌ Código não recebido.</h2><p>Tente novamente.</p>');
    server.close();
    process.exit(1);
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    const newRefresh  = tokens.refresh_token;

    if (!newRefresh) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h2>⚠️ Sem refresh_token.</h2><p>Revogue o app em myaccount.google.com/permissions e tente de novo.</p>');
      console.error('\n⚠️  Nenhum refresh_token retornado. Revogue o acesso em:\n   https://myaccount.google.com/permissions\n');
      server.close();
      process.exit(1);
    }

    // Atualizar o .env
    let envContent = fs.readFileSync(ENV_PATH, 'utf8');
    if (envContent.includes('GOOGLE_ADS_REFRESH_TOKEN=')) {
      envContent = envContent.replace(/GOOGLE_ADS_REFRESH_TOKEN=.*/,
        `GOOGLE_ADS_REFRESH_TOKEN=${newRefresh}`);
    } else {
      envContent += `\nGOOGLE_ADS_REFRESH_TOKEN=${newRefresh}\n`;
    }
    fs.writeFileSync(ENV_PATH, envContent, 'utf8');

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <h2>✅ Token renovado com sucesso!</h2>
      <p>O arquivo <code>.env</code> foi atualizado automaticamente.</p>
      <p>Você pode fechar esta aba.</p>
    `);

    console.log('\n✅ Refresh token renovado e .env atualizado!');
    console.log('   Reiniciando o bot...\n');

    server.close(() => {
      exec('npx pm2 restart br-pneus-bot', { cwd: path.join(__dirname, '..') }, (err, stdout) => {
        if (err) console.error('⚠️  Reinício manual necessário: npx pm2 restart br-pneus-bot');
        else console.log('✅ Bot reiniciado.\n');
        process.exit(0);
      });
    });

  } catch (err) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h2>❌ Erro ao obter token.</h2><pre>${err.message}</pre>`);
    console.error('\n❌ Erro:', err.message);
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  🔑  RENOVAR REFRESH TOKEN — Google Ads');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n  Abrindo navegador para autorização...');
  console.log('  Faça login com a conta Google do MCC e clique em Permitir.\n');

  // Abrir navegador no Windows
  exec(`start "" "${authUrl}"`, (err) => {
    if (err) {
      console.log('  Não foi possível abrir automaticamente. Acesse manualmente:');
      console.log(`\n  ${authUrl}\n`);
    }
  });

  console.log('  Aguardando autorização...\n');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Porta ${PORT} em uso. Feche outros processos e tente novamente.\n`);
  } else {
    console.error('\n❌ Erro no servidor:', err.message);
  }
  process.exit(1);
});
