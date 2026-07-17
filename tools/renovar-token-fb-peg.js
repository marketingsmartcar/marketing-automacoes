'use strict';
/**
 * tools/renovar-token-fb-peg.js
 *
 * Converte um token de curta duração do Graph API Explorer em
 * Page Access Token de longa duração para META_PAGE_TOKEN_PEG_ARQ
 * e User Token para META_ACCESS_TOKEN_PEG (usado pelo monitor de Ads).
 *
 * Uso:
 *   node tools/renovar-token-fb-peg.js SEU_TOKEN_CURTO_AQUI
 */

require('dotenv').config();

const shortToken = process.argv[2];
const pageIdArq  = process.env.META_PAGE_ID_PEG_ARQ;

const APPS = [
  { id: process.env.META_APP_ID_PEG, secret: process.env.META_APP_SECRET_PEG, nome: 'Peg Pneus' },
  { id: '1702717160858852',           secret: process.env.META_APP_SECRET_PEG, nome: 'Claude Code Peg Pneus' },
  { id: process.env.META_APP_ID,     secret: process.env.META_APP_SECRET,     nome: 'Genérico' },
  { id: process.env.META_APP_ID_BR,  secret: process.env.META_APP_SECRET_BR,  nome: 'BR Pneus' },
];

if (!shortToken) {
  console.error('Uso: node tools/renovar-token-fb-peg.js SEU_TOKEN_CURTO');
  process.exit(1);
}

async function main() {
  // 1. Troca token curto por long-lived user token
  let longUserToken = null;
  let appUsado = null;
  for (const app of APPS) {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token` +
      `?grant_type=fb_exchange_token` +
      `&client_id=${app.id}` +
      `&client_secret=${app.secret}` +
      `&fb_exchange_token=${shortToken}`
    );
    const data = await res.json();
    if (!data.error) {
      longUserToken = data.access_token;
      appUsado = app;
      console.log(`✅ App funcionou: ${app.nome} (${app.id})`);
      break;
    }
    console.log(`  ↩️  App ${app.nome}: ${data.error.message}`);
  }
  if (!longUserToken) {
    console.error('❌ Nenhum app conseguiu trocar o token. Gere um novo token no Explorer.');
    process.exit(1);
  }
  console.log('✅ Token de usuário long-lived gerado');

  // 2. Busca páginas disponíveis
  const accountsRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?access_token=${longUserToken}`
  );
  const accountsData = await accountsRes.json();
  if (accountsData.error) {
    console.error('❌ Erro ao buscar páginas:', accountsData.error.message);
    process.exit(1);
  }

  const pages = accountsData.data || [];

  // Página Peg Araraquara
  const pageArq = pages.find(p => p.id === pageIdArq);
  if (!pageArq) {
    console.log('Páginas encontradas:', pages.map(p => `${p.name} (${p.id})`).join(', '));
    console.error('❌ Página Peg Araraquara não encontrada. Verifique se o usuário é admin.');
    process.exit(1);
  }

  console.log(`✅ Página: ${pageArq.name} (${pageArq.id})`);
  console.log(`\n📋 Novo META_PAGE_TOKEN_PEG_ARQ:\n${pageArq.access_token}\n`);

  // 3. Atualiza .env
  const fs   = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '..', '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');

  envContent = envContent.replace(
    /META_PAGE_TOKEN_PEG_ARQ=.*/,
    `META_PAGE_TOKEN_PEG_ARQ=${pageArq.access_token}`
  );
  // User token para o monitor de Ads
  envContent = envContent.replace(
    /META_ACCESS_TOKEN_PEG=.*/,
    `META_ACCESS_TOKEN_PEG=${longUserToken}`
  );

  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('✅ .env atualizado: META_PAGE_TOKEN_PEG_ARQ + META_ACCESS_TOKEN_PEG');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
