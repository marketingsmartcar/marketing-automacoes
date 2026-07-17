'use strict';
/**
 * tools/renovar-token-fb-br.js
 *
 * Converte um token de curta duração do Graph API Explorer em um
 * Page Access Token de longa duração para META_PAGE_TOKEN_BR.
 *
 * Uso:
 *   node tools/renovar-token-fb-br.js SEU_TOKEN_CURTO_AQUI
 */

require('dotenv').config();

const shortToken  = process.argv[2];
const pageId      = process.env.META_PAGE_ID_BR;

// Tenta os 3 apps disponíveis até um funcionar
const APPS = [
  { id: process.env.META_APP_ID_BR,  secret: process.env.META_APP_SECRET_BR,  nome: 'BR Pneus' },
  { id: process.env.META_APP_ID,     secret: process.env.META_APP_SECRET,     nome: 'Genérico' },
  { id: process.env.META_APP_ID_PEG, secret: process.env.META_APP_SECRET_PEG, nome: 'Peg Pneus (antigo)' },
  { id: '1702717160858852',           secret: process.env.META_APP_SECRET_PEG, nome: 'Claude Code Peg Pneus' },
];

if (!shortToken) {
  console.error('Uso: node tools/renovar-token-fb-br.js SEU_TOKEN_CURTO');
  process.exit(1);
}

async function main() {
  // 1. Tenta trocar token curto com cada app até um funcionar
  let longUserToken = null;
  let appUsado = null;
  for (const app of APPS) {
    const llRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token` +
      `?grant_type=fb_exchange_token` +
      `&client_id=${app.id}` +
      `&client_secret=${app.secret}` +
      `&fb_exchange_token=${shortToken}`
    );
    const llData = await llRes.json();
    if (!llData.error) {
      longUserToken = llData.access_token;
      appUsado = app;
      console.log(`✅ App funcionou: ${app.nome} (${app.id})`);
      break;
    }
    console.log(`  ↩️  App ${app.nome}: ${llData.error.message}`);
  }
  if (!longUserToken) {
    console.error('❌ Nenhum app conseguiu trocar o token. Gere um novo token no Explorer.');
    process.exit(1);
  }
  console.log('✅ Token de usuário long-lived gerado');

  // 2. Busca o Page Access Token via /me/accounts (lista todas as páginas)
  const accountsRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?access_token=${longUserToken}`
  );
  const accountsData = await accountsRes.json();
  if (accountsData.error) {
    console.error('❌ Erro ao buscar páginas:', accountsData.error.message);
    process.exit(1);
  }

  const page = (accountsData.data || []).find(p => p.id === pageId);
  if (!page) {
    console.log('Páginas encontradas:', (accountsData.data || []).map(p => `${p.name} (${p.id})`).join(', '));
    console.error('❌ Página BR não encontrada. Verifique se o usuário é admin da página.');
    process.exit(1);
  }
  const pagesData = page;
  const pageToken = page.access_token;
  if (!pageToken) {
    console.error('❌ Token da página não retornado — verifique se você é admin da página');
    process.exit(1);
  }

  console.log(`✅ Página: ${pagesData.name} (${pagesData.id})`);
  console.log(`\n📋 Novo META_PAGE_TOKEN_BR:\n${pageToken}\n`);

  // 3. Atualiza o .env automaticamente
  const fs   = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '..', '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  envContent = envContent.replace(
    /META_PAGE_TOKEN_BR=.*/,
    `META_PAGE_TOKEN_BR=${pageToken}`
  );
  // Salva também o user token longo (usado pelo monitor de Ads)
  envContent = envContent.replace(
    /META_ACCESS_TOKEN_BR=.*/,
    `META_ACCESS_TOKEN_BR=${longUserToken}`
  );
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('✅ .env atualizado: META_PAGE_TOKEN_BR + META_ACCESS_TOKEN_BR');
  console.log('\nAgora rode: node tools/coletar-social-media.js');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
