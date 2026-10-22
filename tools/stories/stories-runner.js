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

// ─── Apaga stories anteriores ─────────────────────────────────────────────────

async function apagarStoriesAtuais(meta) {
  const { igUserId, pageToken: igToken } = meta.instagram;
  if (igUserId && igToken) {
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/stories?access_token=${igToken}`);
      const json = await res.json();
      const lista = json.data || [];
      if (lista.length) {
        console.log(`   🗑️  Apagando ${lista.length} story(ies) IG anterior(es)...`);
        for (const s of lista) {
          try {
            await fetch(`https://graph.facebook.com/v19.0/${s.id}`, {
              method: 'DELETE',
              body: new URLSearchParams({ access_token: igToken }),
            });
            console.log(`      ✅ IG ${s.id} removido`);
          } catch {}
        }
      } else {
        console.log(`   ℹ️  Nenhum story IG anterior para apagar.`);
      }
    } catch (e) { console.log(`   ⚠️ Erro ao apagar stories IG: ${e.message}`); }
  }

  const { pageId, pageToken: fbToken } = meta.facebook;
  if (pageId && fbToken) {
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/stories?access_token=${fbToken}`);
      const json = await res.json();
      const lista = json.data || [];
      if (lista.length) {
        console.log(`   🗑️  Apagando ${lista.length} story(ies) FB anterior(es)...`);
        for (const s of lista) {
          try {
            await fetch(`https://graph.facebook.com/v19.0/${s.id}`, {
              method: 'DELETE',
              body: new URLSearchParams({ access_token: fbToken }),
            });
            console.log(`      ✅ FB ${s.id} removido`);
          } catch {}
        }
      } else {
        console.log(`   ℹ️  Nenhum story FB anterior para apagar.`);
      }
    } catch (e) { console.log(`   ⚠️ Erro ao apagar stories FB: ${e.message}`); }
  }
}

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

  // Rastreia marcas que já postaram nesta rodada (evita múltiplas automações no mesmo dia)
  const marcasQueJaPostaram = new Set();

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
      console.log(`   ⏭  Já executou hoje (${hoje}).`);
      marcasQueJaPostaram.add(auto.marca);
      continue;
    }
    if (auto.em_execucao) {
      console.log(`   ⚠️  Já está em execução — pulando para evitar duplicata.`); continue;
    }
    // Impede que outra automação da mesma marca rode no mesmo dia (guarda em memória)
    if (marcasQueJaPostaram.has(auto.marca)) {
      console.log(`   ⏭  Marca "${auto.marca}" já postou hoje (mesma execução) — pulando "${auto.nome}".`); continue;
    }
    // Guarda cross-execução: checa no Supabase se QUALQUER automação da marca já rodou hoje
    const outrasHoje = await sbGet('stories_automacoes',
      `?marca=eq.${auto.marca}&ativa=eq.true&ultima_execucao=eq.${hoje}&id=neq.${auto.id}&select=id,nome&limit=1`);
    if (outrasHoje.length > 0) {
      console.log(`   ⏭  Automação "${outrasHoje[0].nome}" da marca "${auto.marca}" já rodou hoje — pulando "${auto.nome}".`);
      marcasQueJaPostaram.add(auto.marca);
      continue;
    }

    // Marca como em execução E já registra ultima_execucao para evitar double-run
    await sbPatch('stories_automacoes', auto.id, { em_execucao: true, ultima_execucao: hoje });

    try {
      await executarAutomacao(auto, hoje);
      marcasQueJaPostaram.add(auto.marca);
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

  // Apaga stories do dia anterior antes de postar novos
  await apagarStoriesAtuais(meta);

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

  // Pool maior que o necessário para compensar falhas do IG (IG é mais exigente que FB)
  const maxPool = Math.min(quantidade * 3, fila.length);

  if (maxPool < quantidade) {
    console.log(`   ⚠️  Pasta tem apenas ${fila.length} arquivo(s) — meta: ${quantidade}.`);
  }

  console.log(`   📂 ${total} arquivo(s) na pasta | meta: ${quantidade} | pool: ${maxPool} | índice: ${indice}`);

  const redes = auto.redes_sociais ?? ['instagram', 'facebook'];
  const usarIG = redes.includes('instagram') && !!meta.instagram.igUserId && !!meta.instagram.pageToken;
  const usarFB = redes.includes('facebook')  && !!meta.facebook.pageId   && !!meta.facebook.pageToken;

  let igPostados = 0;
  let fbPostados = 0;
  let postados   = 0; // conta arquivos processados (para atualizar índice)

  for (let i = 0; i < maxPool && (igPostados < quantidade || fbPostados < quantidade); i++) {
    const arquivo  = fila[(indice + i) % fila.length];
    const tmpPath  = await baixarArquivo(arquivo.id, arquivo.name);
    const isVideo  = /\.(mp4|mov|avi)$/i.test(arquivo.name);
    const tipo     = isVideo ? 'video' : 'imagem';
    const igNeed   = usarIG && igPostados < quantidade;
    const fbNeed   = usarFB && fbPostados < quantidade;

    console.log(`   📤 [${i + 1}/${maxPool}] ${tipo}: ${arquivo.name} | IG ${igPostados}/${quantidade} FB ${fbPostados}/${quantidade}`);

    try {
      // Instagram
      if (igNeed) {
        try {
          await postarInstagramStory(meta.instagram.igUserId, meta.instagram.pageToken, tmpPath);
          igPostados++;
          console.log(`      ✅ Instagram OK (${igPostados}/${quantidade})`);
        } catch (e) { console.error(`      ❌ Instagram: ${e.message} — tentará próximo vídeo`); }
      }

      // Facebook
      if (fbNeed) {
        try {
          await postarFacebookStory(meta.facebook.pageId, meta.facebook.pageToken, tmpPath);
          fbPostados++;
          console.log(`      ✅ Facebook OK (${fbPostados}/${quantidade})`);
        } catch (e) { console.error(`      ❌ Facebook: ${e.message}`); }
      }

      postados++;
    } finally {
      try { fs.unlinkSync(tmpPath); } catch {}
    }
  }

  // Avança índice pelo número de arquivos que realmente entrariam na rotação normal
  const avanco = Math.min(quantidade, fila.length);
  const novoIndice = fila.length > 0 ? (indice + avanco) % fila.length : 0;
  await sbPatch('stories_automacoes', auto.id, {
    ultimo_index:    novoIndice,
    ultima_execucao: hoje,
  });

  console.log(`   ✅ IG ${igPostados}/${quantidade} | FB ${fbPostados}/${quantidade} | próximo índice: ${novoIndice}`);
}

main().catch(err => {
  console.error('❌ Runner falhou:', err);
  process.exit(1);
});
