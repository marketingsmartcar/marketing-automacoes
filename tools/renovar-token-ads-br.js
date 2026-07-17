'use strict';
/**
 * tools/renovar-token-ads-br.js
 *
 * Converte token curto do Graph API Explorer em token de longa duração
 * e salva como META_ACCESS_TOKEN_BR no .env.
 *
 * Uso:
 *   node tools/renovar-token-ads-br.js SEU_TOKEN_CURTO
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');

const shortToken = process.argv[2];
const APP_ID     = process.env.META_APP_ID_BR || process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET_BR || process.env.META_APP_SECRET;
const GRAPH      = 'https://graph.facebook.com/v21.0';

if (!shortToken) {
  console.log('\n📋 Como obter o token curto:');
  console.log('  1. Acesse: developers.facebook.com/tools/explorer');
  console.log('  2. App: selecione "840865955024232" (BR Pneus)');
  console.log('  3. Permissões: marque ads_read + ads_management + business_management');
  console.log('  4. Clique "Gerar token de acesso" e copie o token');
  console.log('  5. Execute: node tools/renovar-token-ads-br.js COLE_O_TOKEN_AQUI\n');
  process.exit(0);
}

async function main() {
  console.log('\n🔑 Renovando META_ACCESS_TOKEN_BR...\n');

  // Trocar por long-lived user token (60 dias)
  const res  = await fetch(
    `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token` +
    `&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${shortToken}`
  );
  const data = await res.json();

  if (data.error) {
    console.error('❌ Erro:', data.error.message);
    process.exit(1);
  }

  const longToken  = data.access_token;
  const diasValido = Math.round((data.expires_in || 5184000) / 86400);

  // Atualizar .env
  const envPath = path.join(__dirname, '..', '.env');
  let env       = fs.readFileSync(envPath, 'utf8');
  env = env.replace(/META_ACCESS_TOKEN_BR=.*/, `META_ACCESS_TOKEN_BR=${longToken}`);
  fs.writeFileSync(envPath, env, 'utf8');

  console.log(`✅ Token long-lived gerado (~${diasValido} dias de validade)`);
  console.log('✅ META_ACCESS_TOKEN_BR atualizado no .env\n');
  console.log('Agora rode: node tools/coletar-ads-supabase.js --recargas\n');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
