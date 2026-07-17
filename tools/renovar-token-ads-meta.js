'use strict';
/**
 * tools/renovar-token-ads-meta.js
 *
 * Renova o META_ACCESS_TOKEN_BR usando Facebook Device Login Flow.
 * Não precisa de navegador automatizado nem Graph API Explorer.
 *
 * Uso:
 *   node tools/renovar-token-ads-meta.js
 */

require('dotenv').config();

const APP_ID     = process.env.META_APP_ID_BR;
const APP_SECRET = process.env.META_APP_SECRET_BR;
const GRAPH      = 'https://graph.facebook.com/v21.0';

const SCOPES = [
  'ads_read',
  'ads_management',
  'business_management',
  'pages_read_engagement',
  'pages_read_user_content',
].join(',');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  if (!APP_ID || !APP_SECRET) {
    console.error('❌ META_APP_ID_BR / META_APP_SECRET_BR não configurados');
    process.exit(1);
  }

  console.log('\n🔑 Renovação de Token Meta Ads — Device Login Flow\n');

  // 1. Iniciar device login (app access token = APP_ID|APP_SECRET)
  const appToken = `${APP_ID}|${APP_SECRET}`;
  const initRes  = await fetch(`${GRAPH}/device/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({ access_token: appToken, scope: SCOPES }),
  });
  const init = await initRes.json();

  if (init.error) {
    console.error('❌ Erro ao iniciar device login:', init.error.message);
    process.exit(1);
  }

  const { code, user_code, verification_uri, interval, expires_in } = init;

  console.log('═'.repeat(60));
  console.log(`\n📱 SIGA AS INSTRUÇÕES:\n`);
  console.log(`1. Acesse: ${verification_uri}`);
  console.log(`2. Digite o código: ${user_code}`);
  console.log(`3. Faça login com a conta reuniaobrpneus@gmail.com`);
  console.log(`4. Aprove as permissões solicitadas\n`);
  console.log(`⏳ Aguardando aprovação (expira em ${Math.round(expires_in / 60)} minutos)...`);
  console.log('═'.repeat(60) + '\n');

  // 2. Fazer polling até aprovação
  const pollInterval = (interval || 5) * 1000;
  const expires      = Date.now() + expires_in * 1000;
  let token          = null;

  while (Date.now() < expires) {
    await sleep(pollInterval);

    const pollRes  = await fetch(`${GRAPH}/device/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({ access_token: appToken, code }),
    });
    const poll = await pollRes.json();

    if (poll.error) {
      if (poll.error.code === 31) { process.stdout.write('.'); continue; } // authorization_pending
      if (poll.error.code === 32) { process.stdout.write('·'); continue; } // slow_down
      console.error('\n❌ Erro no polling:', poll.error.message);
      process.exit(1);
    }

    if (poll.access_token) {
      token = poll.access_token;
      break;
    }
  }

  if (!token) {
    console.error('\n❌ Tempo expirado sem aprovação');
    process.exit(1);
  }

  console.log('\n\n✅ Aprovado! Trocando por token de longa duração...');

  // 3. Trocar por long-lived token (60 dias)
  const llRes  = await fetch(
    `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token` +
    `&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${token}`
  );
  const ll = await llRes.json();

  if (ll.error) {
    console.error('❌ Erro ao gerar long-lived token:', ll.error.message);
    process.exit(1);
  }

  const longToken = ll.access_token;
  const diasValido = Math.round((ll.expires_in || 5184000) / 86400);

  console.log(`✅ Token long-lived gerado (válido por ~${diasValido} dias)\n`);

  // 4. Atualizar .env
  const fs      = require('fs');
  const path    = require('path');
  const envPath = path.join(__dirname, '..', '.env');
  let env       = fs.readFileSync(envPath, 'utf8');

  if (env.includes('META_ACCESS_TOKEN_BR=')) {
    env = env.replace(/META_ACCESS_TOKEN_BR=.*/, `META_ACCESS_TOKEN_BR=${longToken}`);
  } else {
    env += `\nMETA_ACCESS_TOKEN_BR=${longToken}\n`;
  }

  fs.writeFileSync(envPath, env, 'utf8');
  console.log('✅ .env atualizado com META_ACCESS_TOKEN_BR');
  console.log('\nAgora rode: node tools/coletar-ads-supabase.js --meta\n');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
