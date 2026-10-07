'use strict';
/**
 * Stories Runner — lê automações da tabela `stories_automacoes` no Supabase
 * e posta no horário e dias configurados pelo NexusZ.
 *
 * Roda no HostGator via cron a cada minuto: * * * * *
 * Sai instantâneo se nenhuma automação está agendada para o minuto atual.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs   = require('fs');
const path = require('path');

const { postarInstagramStory, postarFacebookStory } = require('./story-poster');
const { listarPasta, baixarArquivo }                = require('./drive-downloader');

// ─── Supabase ─────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sbGet(table, query = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase GET ${table}: ${res.status}`);
  return res.json();
}

async function sbPatch(table, id, fields) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=minimal',
    },
    body: JSON.stringify(fields),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`Supabase PATCH ${table}: ${res.status} — ${t}`); }
}

// ─── Config Meta por marca ────────────────────────────────────────────────────

const META_CONFIG = {
  br:  {
    instagram: { igUserId: process.env.META_IG_ID_BR,        pageToken: process.env.META_PAGE_TOKEN_BR },
    facebook:  { pageId:   process.env.META_PAGE_ID_BR,      pageToken: process.env.META_PAGE_TOKEN_BR },
  },
  peg: {
    instagram: { igUserId: process.env.META_IG_ID_PEG_ARQ,   pageToken: process.env.META_PAGE_TOKEN_PEG_ARQ },
    facebook:  { pageId:   process.env.META_PAGE_ID_PEG_ARQ, pageToken: process.env.META_PAGE_TOKEN_PEG_ARQ },
  },
};

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const agora  = new Date();
  const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
  const hoje   = agora.toISOString().slice(0, 10);        // YYYY-MM-DD
  const diaSemana = agora.getDay();                        // 0=Dom...6=Sáb

  console.log(`\n⏱  [${agora.toLocaleString('pt-BR')}] Stories Runner — hora: ${horaAtual}`);

  // Busca automações ativas com hora_postagem == agora
  const automacoes = await sbGet('stories_automacoes',
    `?ativa=eq.true&hora_postagem=eq.${horaAtual}&select=*`);

  if (!automacoes.length) {
    console.log('   Nenhuma automação agendada para este minuto. Saindo.');
    return;
  }

  for (const auto of automacoes) {
    console.log(`\n📋 Automação: "${auto.nome}" (${auto.marca})`);

    // Verificações de elegibilidade
    if (!auto.dias_semana.includes(diaSemana)) {
      console.log(`   ⏭  Hoje (dia ${diaSemana}) não está nos dias configurados.`); continue;
    }
    if (hoje < auto.data_inicio) {
      console.log(`   ⏭  Antes da data de início (${auto.data_inicio}).`); continue;
    }
    if (auto.data_fim && hoje > auto.data_fim) {
      console.log(`   ⏭  Após a data de fim (${auto.data_fim}).`); continue;
    }
    if (auto.ultima_execucao === hoje) {
      console.log(`   ⏭  Já executou hoje (${hoje}).`); continue;
    }
    if (auto.em_execucao) {
      console.log(`   ⚠️  Já está em execução — pulando para evitar duplicata.`); continue;
    }

    // Marca como em execução
    await sbPatch('stories_automacoes', auto.id, { em_execucao: true });

    try {
      await executarAutomacao(auto, hoje);
    } catch (err) {
      console.error(`   ❌ Erro na automação "${auto.nome}":`, err.message);
    } finally {
      await sbPatch('stories_automacoes', auto.id, { em_execucao: false });
    }
  }

  console.log('\n✅ Runner concluído.');
}

async function executarAutomacao(auto, hoje) {
  const meta = META_CONFIG[auto.marca];
  if (!meta) throw new Error(`Marca desconhecida: ${auto.marca}`);

  // Lista arquivos na pasta do Drive
  const arquivos = await listarPasta(auto.drive_folder_id);
  if (!arquivos.length) {
    console.log(`   📁 Pasta Drive vazia — nada a postar.`);
    await sbPatch('stories_automacoes', auto.id, { ultima_execucao: hoje });
    return;
  }

  const total       = arquivos.length;
  const quantidade  = Math.min(auto.quantidade_por_dia, total);
  let   indice      = auto.ultimo_index ?? 0;

  // Arquivos fixados têm prioridade no início da fila
  const fixados = (auto.arquivos_fixados ?? []).filter(id => arquivos.find(a => a.id === id));
  const rotativos = arquivos.filter(a => !fixados.includes(a.id));

  // Monta lista: fixados primeiro, depois rotativos a partir do índice
  const fila = [...fixados, ...rotativos];
  const selecionados = [];
  for (let i = 0; i < quantidade; i++) {
    selecionados.push(fila[(indice + i) % fila.length]);
  }

  console.log(`   📂 ${total} arquivo(s) na pasta | postando ${quantidade} | índice atual: ${indice}`);

  let postados = 0;
  for (const arquivo of selecionados) {
    const tmpPath = await baixarArquivo(arquivo.id, arquivo.name);
    try {
      const isVideo = /\.(mp4|mov|avi)$/i.test(arquivo.name);
      const tipo    = isVideo ? 'video' : 'imagem';

      console.log(`   📤 Postando ${tipo}: ${arquivo.name}`);

      const redes = auto.redes_sociais ?? ['instagram', 'facebook'];

      // Instagram
      if (redes.includes('instagram') && meta.instagram.igUserId && meta.instagram.pageToken) {
        try {
          await postarInstagramStory(meta.instagram.igUserId, meta.instagram.pageToken, tmpPath);
          console.log(`      ✅ Instagram OK`);
        } catch (e) { console.error(`      ❌ Instagram:`, e.message); }
      }

      // Facebook
      if (redes.includes('facebook') && meta.facebook.pageId && meta.facebook.pageToken) {
        try {
          await postarFacebookStory(meta.facebook.pageId, meta.facebook.pageToken, tmpPath);
          console.log(`      ✅ Facebook OK`);
        } catch (e) { console.error(`      ❌ Facebook:`, e.message); }
      }

      postados++;
    } finally {
      try { fs.unlinkSync(tmpPath); } catch {}
    }
  }

  // Atualiza índice e data de execução
  const novoIndice = (indice + quantidade) % fila.length;
  await sbPatch('stories_automacoes', auto.id, {
    ultimo_index:    novoIndice,
    ultima_execucao: hoje,
  });

  console.log(`   ✅ ${postados}/${quantidade} postado(s) | próximo índice: ${novoIndice}`);
}

main().catch(err => {
  console.error('❌ Runner falhou:', err);
  process.exit(1);
});
