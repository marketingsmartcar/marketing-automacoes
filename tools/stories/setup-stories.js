'use strict';

/**
 * Roda UMA vez para descobrir automaticamente:
 *  - Page IDs (Facebook)
 *  - Instagram Business Account IDs
 *  - Page Access Tokens (de longa duração)
 *
 * Uso: node tools/stories/setup-stories.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

const ENV_FILE    = path.join(__dirname, '..', '..', '.env');
const BASE_GRAPH  = 'https://graph.facebook.com/v19.0';

// Usa os tokens de usuário já existentes no .env
const TOKENS = [
  { label: 'BR Pneus',    token: process.env.META_ACCESS_TOKEN_BR  },
  { label: 'Peg Pneus',   token: process.env.META_ACCESS_TOKEN_PEG },
];

async function buscarPaginasEInstagram(userToken, label) {
  console.log(`\n🔍 Buscando páginas de: ${label}`);

  // Tenta ambos os campos (novo e antigo) para compatibilidade com diferentes versões da API
  const { data } = await axios.get(`${BASE_GRAPH}/me/accounts`, {
    params: {
      fields:       'id,name,access_token,instagram_business_account{id,username},connected_instagram_account{id,username}',
      access_token: userToken,
    },
  });

  if (!data.data || data.data.length === 0) {
    console.log('  ⚠️  Nenhuma página encontrada para este token.');
    return;
  }

  for (const page of data.data) {
    // Suporta tanto instagram_business_account (API antiga) quanto connected_instagram_account (API nova)
    const igConta = page.instagram_business_account || page.connected_instagram_account;
    const igId    = igConta?.id || '(sem conta IG vinculada)';
    const igUser  = igConta?.username || '';
    console.log(`\n  📘 Página: ${page.name}`);
    console.log(`     Page ID:           ${page.id}`);
    console.log(`     Page Access Token: ${page.access_token}`);
    console.log(`     Instagram ID:      ${igId}${igUser ? ` (${igUser})` : ''}`);
  }

  return data.data;
}

async function salvarNoEnv(chave, valor) {
  let conteudo = fs.readFileSync(ENV_FILE, 'utf8');
  const linha  = `${chave}=${valor}`;
  if (conteudo.includes(`${chave}=`)) {
    conteudo = conteudo.replace(new RegExp(`${chave}=.*`), linha);
  } else {
    conteudo += `\n${linha}`;
  }
  fs.writeFileSync(ENV_FILE, conteudo);
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Setup de Stories — BR Pneus & Oficina');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const todasPaginas = [];

  for (const { label, token } of TOKENS) {
    if (!token) { console.warn(`⚠️  Token não encontrado para ${label}`); continue; }
    try {
      const paginas = await buscarPaginasEInstagram(token, label);
      if (paginas) todasPaginas.push(...paginas.map(p => ({ ...p, _label: label })));
    } catch (err) {
      console.error(`❌ Erro para ${label}:`, err.response?.data?.error?.message || err.message);
    }
  }

  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  COPIE OS VALORES ABAIXO PARA O SEU .env');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Mapeamento por nome de página esperado
  const mapa = {
    'Rede BR PNEUS':      { pageVar: 'META_PAGE_ID_BR',      tokenVar: 'META_PAGE_TOKEN_BR',      igVar: 'META_IG_ID_BR'      },
    'PegPneus':           { pageVar: 'META_PAGE_ID_PEG_ARQ', tokenVar: 'META_PAGE_TOKEN_PEG_ARQ', igVar: 'META_IG_ID_PEG_ARQ' },
    'PegPneus Sorocaba':  { pageVar: 'META_PAGE_ID_PEG_SOR', tokenVar: 'META_PAGE_TOKEN_PEG_SOR', igVar: null                 },
  };

  let algumSalvo = false;

  for (const page of todasPaginas) {
    const cfg = Object.entries(mapa).find(([nome]) =>
      page.name.toLowerCase().includes(nome.toLowerCase())
    );
    if (!cfg) continue;

    const [, vars] = cfg;
    console.log(`# ${page.name}`);
    console.log(`${vars.pageVar}=${page.id}`);
    console.log(`${vars.tokenVar}=${page.access_token}`);
    const igConta2 = page.instagram_business_account || page.connected_instagram_account;
    if (vars.igVar && igConta2?.id) {
      console.log(`${vars.igVar}=${igConta2.id}`);
    }
    console.log('');

    // Salva automaticamente no .env
    await salvarNoEnv(vars.pageVar,  page.id);
    await salvarNoEnv(vars.tokenVar, page.access_token);
    const igConta3 = page.instagram_business_account || page.connected_instagram_account;
    if (vars.igVar && igConta3?.id) {
      await salvarNoEnv(vars.igVar, igConta3.id);
    }
    algumSalvo = true;
  }

  if (!algumSalvo) {
    console.log('⚠️  Nenhuma página mapeada automaticamente.');
    console.log('    Copie os IDs acima manualmente para o .env conforme o comentário.');
    console.log('\n  Chaves esperadas no .env:');
    console.log('  META_PAGE_ID_BR, META_PAGE_TOKEN_BR, META_IG_ID_BR');
    console.log('  META_PAGE_ID_PEG_ARQ, META_PAGE_TOKEN_PEG_ARQ, META_IG_ID_PEG_ARQ');
    console.log('  META_PAGE_ID_PEG_SOR, META_PAGE_TOKEN_PEG_SOR');
  } else {
    console.log('✅ Variáveis salvas automaticamente no .env!');
    console.log('\nPróximo passo: adicionar ao PM2:');
    console.log('  pm2 start tools/stories/story-scheduler.js --name stories');
    console.log('  pm2 save');
  }

  console.log('\n⚠️  IMPORTANTE: Os Page Access Tokens expiram em ~60 dias.');
  console.log('   Para tokens permanentes, gere um token de Sistema via:');
  console.log('   Business Manager → Configurações → Usuários do Sistema\n');
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.response?.data || err.message);
  process.exit(1);
});
