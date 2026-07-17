'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const axios  = require('axios');
const fs     = require('fs');
const path   = require('path');

const BASE   = 'https://graph.facebook.com/v19.0';

const CONTAS = [
  {
    key:     'br',
    nome:    'BR Pneus',
    ig:      { userId: process.env.META_IG_ID_BR,      token: process.env.META_PAGE_TOKEN_BR },
    fb:      { pageId: process.env.META_PAGE_ID_BR,    token: process.env.META_PAGE_TOKEN_BR },
  },
  {
    key:     'peg_araraquara',
    nome:    'Peg Pneus Araraquara',
    ig:      { userId: process.env.META_IG_ID_PEG_ARQ,  token: process.env.META_PAGE_TOKEN_PEG_ARQ },
    fb:      { pageId: process.env.META_PAGE_ID_PEG_ARQ, token: process.env.META_PAGE_TOKEN_PEG_ARQ },
  },
];

const STATE_FILE = path.join(__dirname, '..', '..', 'data', 'stories-state.json');
const LOCK_FILE  = path.join(__dirname, '..', '..', '.stories-running.lock');

async function deletarStoriesIG(userId, token, nome) {
  console.log(`\n  🔍 [IG] ${nome} — buscando stories...`);
  try {
    const { data } = await axios.get(`${BASE}/${userId}/stories`, {
      params: { access_token: token },
    });
    const items = data.data || [];
    if (items.length === 0) { console.log(`  ✅ [IG] ${nome} — nenhum story ativo.`); return; }
    console.log(`  🗑  [IG] ${nome} — ${items.length} storie(s) para deletar.`);
    for (const item of items) {
      try {
        await axios.delete(`${BASE}/${item.id}`, { params: { access_token: token } });
        console.log(`  ✅ [IG] deletado: ${item.id}`);
      } catch (e) {
        console.warn(`  ⚠️  [IG] Não foi possível deletar ${item.id}: ${e.response?.data?.error?.message || e.message}`);
      }
    }
  } catch (e) {
    console.warn(`  ⚠️  [IG] Erro ao listar stories de ${nome}: ${e.response?.data?.error?.message || e.message}`);
  }
}

async function deletarStoriesFB(pageId, token, nome) {
  console.log(`\n  🔍 [FB] ${nome} — buscando stories...`);

  // Resolver page access token
  let pageToken = token;
  try {
    const { data } = await axios.get(`${BASE}/${pageId}`, {
      params: { fields: 'access_token', access_token: token },
    });
    if (data.access_token) pageToken = data.access_token;
  } catch {}

  // Tentar via /{page-id}/video_stories (lista stories de vídeo ativos)
  let deletados = 0;
  try {
    const { data } = await axios.get(`${BASE}/${pageId}/video_stories`, {
      params: { access_token: pageToken, fields: 'id' },
    });
    const items = data.data || [];
    if (items.length > 0) {
      console.log(`  🗑  [FB] ${nome} — ${items.length} storie(s) via video_stories.`);
      for (const item of items) {
        try {
          await axios.delete(`${BASE}/${item.id}`, { params: { access_token: pageToken } });
          console.log(`  ✅ [FB] deletado: ${item.id}`);
          deletados++;
        } catch (e) {
          console.warn(`  ⚠️  [FB] Não deletou ${item.id}: ${e.response?.data?.error?.message || e.message}`);
        }
      }
    }
  } catch {}

  // Tentar via /stories (outro endpoint)
  try {
    const { data } = await axios.get(`${BASE}/${pageId}/stories`, {
      params: { access_token: pageToken, fields: 'id' },
    });
    const items = (data.data || []).filter(i => i.id);
    if (items.length > 0) {
      console.log(`  🗑  [FB] ${nome} — ${items.length} storie(s) via /stories.`);
      for (const item of items) {
        try {
          await axios.delete(`${BASE}/${item.id}`, { params: { access_token: pageToken } });
          console.log(`  ✅ [FB] deletado: ${item.id}`);
          deletados++;
        } catch (e) {
          console.warn(`  ⚠️  [FB] Não deletou ${item.id}: ${e.response?.data?.error?.message || e.message}`);
        }
      }
    }
  } catch {}

  if (deletados === 0) {
    console.log(`  ℹ️  [FB] ${nome} — API não expõe stories para deleção direta (expiram em 24h automaticamente).`);
  }
}

function limparHistoricoHoje() {
  if (!fs.existsSync(STATE_FILE)) return;
  const estado = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  const hoje = new Date().toISOString().slice(0, 10);
  if (estado.historico) {
    const antes = Object.keys(estado.historico).length;
    for (const k of Object.keys(estado.historico)) {
      if (estado.historico[k] === hoje) delete estado.historico[k];
    }
    const depois = Object.keys(estado.historico).length;
    console.log(`\n🧹 Histórico limpo: ${antes - depois} entradas de hoje removidas.`);
  }
  // Remover lock antigo
  if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
  fs.writeFileSync(STATE_FILE, JSON.stringify(estado, null, 2));
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  DELETAR STORIES + REPOSTAR');
  console.log('═══════════════════════════════════════════════');

  // 1. Deletar
  for (const c of CONTAS) {
    console.log(`\n📱 ${c.nome}`);
    if (c.ig) await deletarStoriesIG(c.ig.userId, c.ig.token, c.nome);
    if (c.fb) await deletarStoriesFB(c.fb.pageId, c.fb.token, c.nome);
  }

  // 2. Limpar histórico de hoje
  limparHistoricoHoje();

  // 3. Repostar
  console.log('\n═══════════════════════════════════════════════');
  console.log('  REPOSTANDO STORIES DO DIA');
  console.log('═══════════════════════════════════════════════');
  const { publicarStoriesDoDia } = require('./story-scheduler');
  await publicarStoriesDoDia();

  console.log('\n✅ Concluído.');
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
