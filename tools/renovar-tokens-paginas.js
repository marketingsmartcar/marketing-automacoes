'use strict';

/**
 * renovar-tokens-paginas.js
 * Gera novos tokens de página Meta (long-lived) a partir dos tokens de Ads
 * e salva automaticamente no .env.
 *
 * Uso: node tools/renovar-tokens-paginas.js
 */

require('dotenv').config();

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const ENV_PATH = path.join(__dirname, '..', '.env');

// ── Páginas a renovar ──────────────────────────────────────────────────────────
// userTokenEnv: token de usuário/ads com permissão pages_show_list + pages_manage_posts
// pages: lista de páginas para buscar tokens

const GRUPOS = [
  {
    nome:         'BR Pneus',
    userTokenEnv: 'META_ACCESS_TOKEN_BR',
    appIdEnv:     'META_APP_ID_BR',
    appSecretEnv: 'META_APP_SECRET_BR',
    pages: [
      { envKey: 'META_PAGE_TOKEN_BR',      pageIdEnv: 'META_PAGE_ID_BR',      nome: 'BR Pneus Pages' },
    ],
  },
  {
    nome:         'Peg Pneus',
    userTokenEnv: 'META_ACCESS_TOKEN_PEG',
    appIdEnv:     'META_APP_ID_PEG',
    appSecretEnv: 'META_APP_SECRET_PEG',
    pages: [
      { envKey: 'META_PAGE_TOKEN_PEG_ARQ', pageIdEnv: 'META_PAGE_ID_PEG_ARQ', nome: 'Peg Pneus Araraquara' },
      { envKey: 'META_PAGE_TOKEN_PEG_SOR', pageIdEnv: 'META_PAGE_ID_PEG_SOR', nome: 'Peg Pneus Sorocaba' },
    ],
  },
];

// ── Helpers HTTP ───────────────────────────────────────────────────────────────

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    }).on('error', reject);
  });
}

// ── Trocar short-lived por long-lived user token ───────────────────────────────

async function getLongLivedToken(shortToken, appId, appSecret) {
  const url = `https://graph.facebook.com/v19.0/oauth/access_token` +
    `?grant_type=fb_exchange_token` +
    `&client_id=${appId}` +
    `&client_secret=${appSecret}` +
    `&fb_exchange_token=${encodeURIComponent(shortToken)}`;
  const resp = await get(url);
  if (resp.error) throw new Error(resp.error.message);
  return resp.access_token;
}

// ── Buscar token da página ─────────────────────────────────────────────────────

async function getPageToken(userToken, pageId) {
  const url = `https://graph.facebook.com/v19.0/${pageId}?fields=access_token&access_token=${encodeURIComponent(userToken)}`;
  const resp = await get(url);
  if (resp.error) throw new Error(resp.error.message);
  if (!resp.access_token) throw new Error('access_token não retornado para página ' + pageId);
  return resp.access_token;
}

// ── Salvar no .env ─────────────────────────────────────────────────────────────

function salvarNoEnv(chave, valor) {
  let conteudo = fs.readFileSync(ENV_PATH, 'utf8');
  const regex = new RegExp(`^${chave}=.*`, 'm');
  if (regex.test(conteudo)) {
    conteudo = conteudo.replace(regex, `${chave}=${valor}`);
  } else {
    conteudo += `\n${chave}=${valor}\n`;
  }
  fs.writeFileSync(ENV_PATH, conteudo, 'utf8');
}

// ── Principal ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  🔑  Renovação de Tokens de Página Meta');
  console.log('══════════════════════════════════════════════════\n');

  let totalOk = 0;
  let totalErro = 0;

  for (const grupo of GRUPOS) {
    console.log(`📦 ${grupo.nome}`);

    const shortToken = process.env[grupo.userTokenEnv];
    const appId      = process.env[grupo.appIdEnv];
    const appSecret  = process.env[grupo.appSecretEnv];

    if (!shortToken || !appId || !appSecret) {
      console.error(`  ❌ Variáveis ${grupo.userTokenEnv} / ${grupo.appIdEnv} / ${grupo.appSecretEnv} não configuradas`);
      totalErro += grupo.pages.length;
      continue;
    }

    // Obter long-lived user token
    let longToken;
    try {
      longToken = await getLongLivedToken(shortToken, appId, appSecret);
      console.log(`  ✅ Long-lived user token obtido`);
    } catch (err) {
      console.error(`  ❌ Erro ao obter long-lived token: ${err.message}`);
      totalErro += grupo.pages.length;
      continue;
    }

    // Para cada página do grupo
    for (const pg of grupo.pages) {
      const pageId = process.env[pg.pageIdEnv];
      if (!pageId) {
        console.error(`  ❌ ${pg.nome}: variável ${pg.pageIdEnv} não configurada`);
        totalErro++;
        continue;
      }

      try {
        const pageToken = await getPageToken(longToken, pageId);
        salvarNoEnv(pg.envKey, pageToken);
        console.log(`  ✅ ${pg.nome}: token renovado e salvo (${pg.envKey})`);
        totalOk++;
      } catch (err) {
        console.error(`  ❌ ${pg.nome}: ${err.message}`);
        totalErro++;
      }
    }
    console.log('');
  }

  console.log('══════════════════════════════════════════════════');
  if (totalErro === 0) {
    console.log(`  ✅  ${totalOk} token(s) renovado(s) com sucesso!`);
    console.log('\n  Reinicie o bot e o scheduler:');
    console.log('  pm2 restart br-pneus-bot stories-scheduler --update-env');
  } else {
    console.log(`  ⚠️  ${totalOk} ok, ${totalErro} com erro`);
  }
  console.log('══════════════════════════════════════════════════\n');
}

main().catch(err => { console.error('Erro fatal:', err.message); process.exit(1); });
