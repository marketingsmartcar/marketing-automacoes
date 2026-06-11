'use strict';
/**
 * Cloud Stories Scheduler — roda no GitHub Actions sem PC ligado
 *
 * Todo dia às 8h BRT:
 *   BR Pneus:  3 vídeos aleatórios das lojas + arte arraia fixa + arte arraia rotativa
 *   Peg Pneus: 3 vídeos aleatórios das lojas + arte arraia fixa + arte arraia rotativa
 *
 * Seg/Qua/Sex: + vídeo Arraia para BR e Peg
 * Ter/Qui/Sáb: + vídeo Sazonal para BR Pneus
 *
 * Só roda em Junho 2026 para a parte Arraia; histórias normais sempre.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const ffmpeg = require('fluent-ffmpeg');
try { ffmpeg.setFfmpegPath(require('@ffmpeg-installer/ffmpeg').path); } catch {
  // Se instalado via apt-get no Actions
}

const { postarInstagramStory, postarFacebookStory } = require('./story-poster');
const { listarPastas, listarPasta, baixarArquivo }   = require('./drive-downloader');
const { PASTAS_BR, PASTAS_PEG, ARRAIA, SAZONAIS }   = require('./drive-config');

const STATE_FILE    = path.join(__dirname, '..', '..', 'data', 'stories-cloud-state.json');
const SCHEDULE_FILE = path.join(__dirname, '..', '..', 'data', 'stories-schedule.json');

function carregarSchedule() {
  if (!fs.existsSync(SCHEDULE_FILE)) return null;
  try { return JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8')); } catch { return null; }
}

// ─── Configuração das contas ──────────────────────────────────────────────────

const CONTAS = [
  {
    key: 'br', nome: 'BR Pneus',
    instagram: { igUserId: process.env.META_IG_ID_BR,        pageToken: process.env.META_PAGE_TOKEN_BR },
    facebook:  { pageId:   process.env.META_PAGE_ID_BR,      pageToken: process.env.META_PAGE_TOKEN_BR },
    pastasLojas:     PASTAS_BR,
    pastaArraia:     ARRAIA.artes_br,
    pastaVideosArr:  ARRAIA.videos_br,
    pastaSazonal:    SAZONAIS.br,
    videosPorDia:    3,
  },
  {
    key: 'peg', nome: 'Peg Pneus',
    paused: true, // desativado — reativar removendo esta linha
    instagram: { igUserId: process.env.META_IG_ID_PEG_ARQ,   pageToken: process.env.META_PAGE_TOKEN_PEG_ARQ },
    facebook:  { pageId:   process.env.META_PAGE_ID_PEG_ARQ, pageToken: process.env.META_PAGE_TOKEN_PEG_ARQ },
    pastasLojas:     PASTAS_PEG,
    pastaArraia:     ARRAIA.artes_peg,
    pastaVideosArr:  ARRAIA.videos_peg,
    pastaSazonal:    null,
    videosPorDia:    3,
  },
];

// ─── Helpers de data ──────────────────────────────────────────────────────────

function brt() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
}
function dataHoje() {
  const d = brt();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function isJunho2026() { const d=brt(); return d.getFullYear()===2026 && d.getMonth()===5; }
function isSegQuaSex() { return [1,3,5].includes(brt().getDay()); }
function isTerQuiSab() { return [2,4,6].includes(brt().getDay()); }

// ─── Estado ───────────────────────────────────────────────────────────────────

function carregarEstado() {
  if (!fs.existsSync(STATE_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return {}; }
}
function salvarEstado(e) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(e, null, 2));
}

// ─── Fila de vídeos das lojas (cooldown 2 dias) ───────────────────────────────

function emCooldown(fileId, historico, cooldownDias = 2) {
  const data = historico[fileId];
  if (!data) return false;
  const diff = (new Date(dataHoje()) - new Date(data)) / 86400000;
  return diff < cooldownDias;
}

async function proxVideosLojas(conta, estado, qtd) {
  const historico = estado.historico || {};
  const todos = await listarPastas(conta.pastasLojas, ['.mp4', '.mov', '.avi']);
  const disponiveis = todos.filter(f => !emCooldown(f.id, historico));

  if (disponiveis.length === 0) {
    console.log(`  ⚠️  Todos vídeos em cooldown — usando todos mesmo assim`);
    disponiveis.push(...todos);
  }

  // Embaralha e pega os primeiros N
  const embaralhados = disponiveis.sort(() => Math.random() - 0.5).slice(0, qtd);
  return embaralhados;
}

// ─── Converter PNG → MP4 ──────────────────────────────────────────────────────

function pngParaMp4(inputPng) {
  return new Promise((resolve, reject) => {
    const output = path.join(os.tmpdir(), `cloud_arte_${Date.now()}.mp4`);
    ffmpeg()
      .input(inputPng).inputOptions(['-loop', '1'])
      .videoCodec('libx264')
      .outputOptions(['-t','7','-pix_fmt','yuv420p','-vf','scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black','-r','25'])
      .output(output)
      .on('end', () => resolve(output))
      .on('error', reject)
      .run();
  });
}

// ─── Postar arquivo ───────────────────────────────────────────────────────────

async function postarArquivo(conta, localPath, nome, tipo) {
  const ext = path.extname(localPath).toLowerCase();
  let fileToPost = localPath;
  let tempMp4 = null;

  if (['.png','.jpg','.jpeg'].includes(ext)) {
    console.log(`  🖼️  Convertendo ${nome} para MP4...`);
    fileToPost = await pngParaMp4(localPath);
    tempMp4 = fileToPost;
  }

  let igOk = false, fbOk = false;

  if (conta.instagram?.igUserId && conta.instagram?.pageToken) {
    try { await postarInstagramStory(conta.instagram.igUserId, conta.instagram.pageToken, fileToPost); igOk = true; }
    catch (e) { console.error(`  ❌ [IG] ${e.message?.slice(0,100)}`); }
  }
  if (conta.facebook?.pageId && conta.facebook?.pageToken) {
    try { await postarFacebookStory(conta.facebook.pageId, conta.facebook.pageToken, fileToPost); fbOk = true; }
    catch (e) { console.error(`  ❌ [FB] ${e.message?.slice(0,100)}`); }
  }

  if (tempMp4 && fs.existsSync(tempMp4)) try { fs.unlinkSync(tempMp4); } catch {}

  console.log(`  [${tipo}] IG: ${igOk?'✅':'❌'} | FB: ${fbOk?'✅':'❌'} | ${nome}`);
  return igOk || fbOk;
}

// ─── Publicação principal ─────────────────────────────────────────────────────

async function publicarStories() {
  const hoje        = dataHoje();
  const postarArr   = isSegQuaSex() && isJunho2026();
  const postarSaz   = isTerQuiSab() && isJunho2026();
  const estado      = carregarEstado();
  const schedule    = carregarSchedule();
  const diaPlano    = schedule?.[hoje] ?? null;

  console.log(`\n📱 [${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}] Cloud Stories Scheduler`);
  console.log(`   Data: ${hoje} | Plano mensal: ${diaPlano ? 'Sim ✅' : 'Não (modo aleatório)'}`);
  if (!diaPlano) console.log(`   Arraia Seg/Qua/Sex: ${postarArr?'Sim':'Não'} | Sazonal Ter/Qui/Sáb: ${postarSaz?'Sim':'Não'}`);

  for (const conta of CONTAS) {
    if (conta.paused) {
      console.log(`\n📂 ${conta.nome} — ⏸️  PAUSADO (paused: true em cloud-scheduler.js)`);
      continue;
    }
    console.log(`\n📂 ${conta.nome}`);

    if (!estado[conta.key]) estado[conta.key] = { historico: {}, arraia_arte_index: 1, arraia_video_index: 0, sazonal_index: 0 };
    const st = estado[conta.key];
    if (!st.historico) st.historico = {};

    // Plano do dia para esta conta (br ou peg)
    const plano = diaPlano?.[conta.key] ?? null;

    // ── 3 vídeos das lojas (plano ou aleatório) ───────────────────────────────
    if (st.ultima_regular === hoje) {
      console.log(`  ⏭️  Vídeos regulares já postados hoje — pulando.`);
    } else {
      st.ultima_regular = hoje;
      salvarEstado(estado);

      // Se há plano para hoje: usa vídeos pré-definidos; senão: sorteia
      const videos = plano
        ? plano.lojas  // já tem {id, name}
        : await proxVideosLojas(conta, st, conta.videosPorDia);

      for (const v of videos) {
        const local = await baixarArquivo(v.id, v.name);
        const ok = await postarArquivo(conta, local, v.name, 'Regular');
        if (ok) st.historico[v.id] = hoje;
        // Limpa arquivo baixado
        try { fs.unlinkSync(local); } catch {}
      }
      salvarEstado(estado);
    }

    // ── Arte Arraia fixa (1.png) + arte rotativa ──────────────────────────────
    if (isJunho2026() && (conta.pastaArraia || plano?.arte)) {
      if (st.ultima_arte === hoje) {
        console.log(`  ⏭️  Artes Arraia já postadas hoje — pulando.`);
      } else {
        st.ultima_arte = hoje;
        salvarEstado(estado);

        if (plano?.arte) {
          // Modo plano: usa as artes pré-definidas
          const { fixa, rotativa } = plano.arte;
          if (fixa) {
            const local = await baixarArquivo(fixa.id, fixa.name);
            await postarArquivo(conta, local, fixa.name, 'Arte fixa');
            try { fs.unlinkSync(local); } catch {}
          }
          if (rotativa) {
            const local = await baixarArquivo(rotativa.id, rotativa.name);
            await postarArquivo(conta, local, rotativa.name, 'Arte rotativa');
            try { fs.unlinkSync(local); } catch {}
          }
        } else {
          // Modo aleatório (fallback)
          const artes = await listarPasta(conta.pastaArraia, ['.png','.jpg']);
          artes.sort((a,b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true }));
          if (artes[0]) {
            const local = await baixarArquivo(artes[0].id, artes[0].name);
            await postarArquivo(conta, local, artes[0].name, 'Arte fixa');
            try { fs.unlinkSync(local); } catch {}
          }
          if (artes.length > 1) {
            const idx = Math.max(1, (st.arraia_arte_index ?? 1)) % artes.length || 1;
            const arteRot = artes[idx];
            const local = await baixarArquivo(arteRot.id, arteRot.name);
            const ok = await postarArquivo(conta, local, arteRot.name, `Arte ${idx+1}`);
            if (ok) { let next = idx + 1; if (next >= artes.length) next = 1; st.arraia_arte_index = next; }
            try { fs.unlinkSync(local); } catch {}
          }
        }
        salvarEstado(estado);
      }
    }

    // ── Vídeo Arraia (Seg/Qua/Sex) ────────────────────────────────────────────
    const temArraiaDia = plano?.arraia_video || (postarArr && conta.pastaVideosArr);
    if (temArraiaDia) {
      if (st.ultimo_video_arr === hoje) {
        console.log(`  ⏭️  Vídeo Arraia já postado hoje — pulando.`);
      } else {
        st.ultimo_video_arr = hoje;
        salvarEstado(estado);
        if (plano?.arraia_video) {
          const v = plano.arraia_video;
          const local = await baixarArquivo(v.id, v.name);
          await postarArquivo(conta, local, v.name, 'Vídeo Arraia');
          try { fs.unlinkSync(local); } catch {}
        } else {
          const videos = await listarPasta(conta.pastaVideosArr, ['.mp4','.mov']);
          if (videos.length > 0) {
            const idx = (st.arraia_video_index ?? 0) % videos.length;
            const v = videos[idx];
            const local = await baixarArquivo(v.id, v.name);
            const ok = await postarArquivo(conta, local, v.name, 'Vídeo Arraia');
            if (ok) st.arraia_video_index = (idx+1) % videos.length;
            try { fs.unlinkSync(local); } catch {}
          }
        }
        salvarEstado(estado);
      }
    }

    // ── Vídeo Sazonal BR (Ter/Qui/Sáb) ───────────────────────────────────────
    const temSazonal = plano?.sazonal || (postarSaz && conta.pastaSazonal);
    if (temSazonal) {
      if (st.ultimo_sazonal === hoje) {
        console.log(`  ⏭️  Vídeo sazonal já postado hoje — pulando.`);
      } else {
        st.ultimo_sazonal = hoje;
        salvarEstado(estado);
        if (plano?.sazonal) {
          const v = plano.sazonal;
          const local = await baixarArquivo(v.id, v.name);
          await postarArquivo(conta, local, v.name, 'Vídeo Sazonal');
          try { fs.unlinkSync(local); } catch {}
        } else {
          const videos = await listarPasta(conta.pastaSazonal, ['.mp4','.mov']);
          if (videos.length > 0) {
            const idx = (st.sazonal_index ?? 0) % videos.length;
            const v = videos[idx];
            const local = await baixarArquivo(v.id, v.name);
            const ok = await postarArquivo(conta, local, v.name, 'Vídeo Sazonal');
            if (ok) st.sazonal_index = (idx+1) % videos.length;
            try { fs.unlinkSync(local); } catch {}
          }
        }
        salvarEstado(estado);
      }
    }

    estado[conta.key] = st;
  }

  salvarEstado(estado);
  console.log('\n✅ Cloud Stories Scheduler concluído.');
}

// ─── Execução ─────────────────────────────────────────────────────────────────

publicarStories().catch(e => { console.error('ERRO FATAL:', e); process.exit(1); });
