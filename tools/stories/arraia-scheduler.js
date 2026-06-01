'use strict';
/**
 * Arraia Scheduler — Junho 2026
 *
 * Todo dia (além dos 3 vídeos aleatórios do stories-scheduler normal):
 *   1. Arte 1 fixa (sempre 1.png) → IG + FB
 *   2. 1 arte rotativa (2.png → 3.png → ... uma por dia) → IG + FB
 *
 * Seg/Qua/Sex: também posta 1 vídeo da campanha Arraia → IG + FB
 *
 * Só roda em Junho 2026. Encerra automaticamente em julho.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs     = require('fs');
const path   = require('path');
const os     = require('os');
const cron   = require('node-cron');
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(require('@ffmpeg-installer/ffmpeg').path);

const { postarInstagramStory, postarFacebookStory } = require('./story-poster');

// ─── Configuração das contas ──────────────────────────────────────────────────

const CONTAS = [
  {
    key:       'br',
    nome:      'BR Pneus',
    instagram: { igUserId: process.env.META_IG_ID_BR,        pageToken: process.env.META_PAGE_TOKEN_BR },
    facebook:  { pageId:   process.env.META_PAGE_ID_BR,      pageToken: process.env.META_PAGE_TOKEN_BR },
    pastaArtes:  'C:\\Users\\Nick\\Desktop\\Projetos\\Artes\\#1 Campanhas\\Junho 2026\\ARRAIA\\Artes\\BR Pneus 1080x1920',
    pastaVideos: 'C:\\Users\\Nick\\Desktop\\Projetos\\Artes\\#1 Campanhas\\Junho 2026\\ARRAIA\\Videos\\BR Pneus',
  },
  {
    key:       'peg',
    nome:      'Peg Pneus',
    instagram: { igUserId: process.env.META_IG_ID_PEG_ARQ,   pageToken: process.env.META_PAGE_TOKEN_PEG_ARQ },
    facebook:  { pageId:   process.env.META_PAGE_ID_PEG_ARQ, pageToken: process.env.META_PAGE_TOKEN_PEG_ARQ },
    pastaArtes:  'C:\\Users\\Nick\\Desktop\\Projetos\\Artes\\#1 Campanhas\\Junho 2026\\ARRAIA\\Artes\\Peg Pneus 1080x1920',
    pastaVideos: 'C:\\Users\\Nick\\Desktop\\Projetos\\Artes\\#1 Campanhas\\Junho 2026\\ARRAIA\\Videos\\Peg Pneus',
  },
];

const STATE_FILE = path.join(__dirname, '..', '..', 'data', 'arraia-state.json');

// ─── Helpers de data ──────────────────────────────────────────────────────────

function brt() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
}

function dataHoje() {
  const d = brt();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function isJunho2026() {
  const d = brt();
  return d.getFullYear() === 2026 && d.getMonth() === 5;
}

function isSegQuaSex() {
  return [1, 3, 5].includes(brt().getDay());
}

// ─── Estado ───────────────────────────────────────────────────────────────────

function carregarEstado() {
  if (!fs.existsSync(STATE_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return {}; }
}

function salvarEstado(e) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(e, null, 2));
}

// ─── Listar arquivos ordenados numericamente ──────────────────────────────────

function listarArquivos(pasta, exts) {
  if (!fs.existsSync(pasta)) return [];
  return fs.readdirSync(pasta)
    .filter(f => exts.some(e => f.toLowerCase().endsWith(e)))
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }))
    .map(f => path.join(pasta, f));
}

// ─── Converter PNG → MP4 (7s estático) ───────────────────────────────────────

function pngParaMp4(inputPng) {
  return new Promise((resolve, reject) => {
    const output = path.join(os.tmpdir(), `arraia_${Date.now()}.mp4`);
    ffmpeg()
      .input(inputPng)
      .inputOptions(['-loop', '1'])
      .videoCodec('libx264')
      .outputOptions([
        '-t', '7',
        '-pix_fmt', 'yuv420p',
        '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black',
        '-r', '25',
      ])
      .output(output)
      .on('end', () => resolve(output))
      .on('error', reject)
      .run();
  });
}

// ─── Postar arquivo (imagem ou vídeo) em IG + FB ──────────────────────────────

async function postarArquivo(conta, arquivoPath, tipo) {
  const nomeArq = path.basename(arquivoPath);
  const ext = path.extname(arquivoPath).toLowerCase();
  const isImagem = ['.png', '.jpg', '.jpeg'].includes(ext);

  let tempMp4 = null;
  let fileToPost = arquivoPath;

  if (isImagem) {
    console.log(`  🖼️  Convertendo para MP4: ${nomeArq}`);
    fileToPost = await pngParaMp4(arquivoPath);
    tempMp4 = fileToPost;
    console.log(`  ✅ Conversão concluída`);
  }

  let igOk = false, fbOk = false;

  if (conta.instagram?.igUserId && conta.instagram?.pageToken) {
    try {
      await postarInstagramStory(conta.instagram.igUserId, conta.instagram.pageToken, fileToPost);
      igOk = true;
    } catch (err) {
      console.error(`  ❌ [IG] ${err.message}`);
    }
  }

  if (conta.facebook?.pageId && conta.facebook?.pageToken) {
    try {
      await postarFacebookStory(conta.facebook.pageId, conta.facebook.pageToken, fileToPost);
      fbOk = true;
    } catch (err) {
      console.error(`  ❌ [FB] ${err.message}`);
    }
  }

  if (tempMp4 && fs.existsSync(tempMp4)) {
    try { fs.unlinkSync(tempMp4); } catch {}
  }

  console.log(`  [${tipo}] IG: ${igOk?'✅':'❌'} | FB: ${fbOk?'✅':'❌'} | ${nomeArq}`);
  return igOk || fbOk;
}

// ─── Publicação principal ─────────────────────────────────────────────────────

async function publicarArraia() {
  if (!isJunho2026()) {
    console.log('📅 Arraia Scheduler: fora de Junho 2026 — encerrando.');
    process.exit(0);
    return;
  }

  const hoje = dataHoje();
  const postarVideo = isSegQuaSex();
  const estado = carregarEstado();

  console.log(`\n🎪 [${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}] Arraia Scheduler`);
  console.log(`   Data: ${hoje} | Vídeo hoje: ${postarVideo ? 'Sim (Seg/Qua/Sex)' : 'Não'}`);

  for (const conta of CONTAS) {
    console.log(`\n📂 ${conta.nome}`);

    if (!estado[conta.key]) {
      estado[conta.key] = { arte_rotativa_index: 1, ultima_arte: null, ultimo_video: null };
    }
    const st = estado[conta.key];

    const artes = listarArquivos(conta.pastaArtes, ['.png', '.jpg', '.jpeg']);
    const arte1 = artes[0] ?? null;          // 1.png — fixa todo dia
    const artesRotativas = artes.slice(1);   // 2.png, 3.png, ... — uma por dia

    // ── Arte 1 (fixa, todo dia) ───────────────────────────────────────────────
    if (st.ultima_arte === hoje) {
      console.log(`  ⏭️  Artes já postadas hoje — pulando.`);
    } else {
      if (arte1) {
        console.log(`  🎨 Arte fixa: ${path.basename(arte1)}`);
        await postarArquivo(conta, arte1, 'Arte 1 fixa');
      }

      // ── Arte rotativa (2.png → 3.png → ...) ──────────────────────────────
      if (artesRotativas.length > 0) {
        const idx = (st.arte_rotativa_index ?? 1) % artes.length;
        // Garante que idx aponta para uma arte rotativa (índice >= 1)
        const idxRotativo = idx === 0 ? 1 : idx;
        const arteRot = artes[idxRotativo] ?? artesRotativas[0];
        console.log(`  🎨 Arte rotativa ${idxRotativo+1}/${artes.length}: ${path.basename(arteRot)}`);
        const ok = await postarArquivo(conta, arteRot, `Arte ${idxRotativo+1}`);
        if (ok) {
          // Próxima arte rotativa: avança, pulando índice 0 (arte 1 fixa)
          let proximo = idxRotativo + 1;
          if (proximo >= artes.length) proximo = 1; // volta para 2.png
          st.arte_rotativa_index = proximo;
        }
      }

      st.ultima_arte = hoje;
    }

    // ── Vídeo Arraia (Seg/Qua/Sex) ────────────────────────────────────────────
    if (postarVideo) {
      if (st.ultimo_video === hoje) {
        console.log(`  ⏭️  Vídeo já postado hoje — pulando.`);
      } else {
        const videos = listarArquivos(conta.pastaVideos, ['.mp4', '.mov', '.avi']);
        if (videos.length > 0) {
          const vidIdx = (st.video_index ?? 0) % videos.length;
          const video = videos[vidIdx];
          console.log(`  🎬 Vídeo ${vidIdx+1}/${videos.length}: ${path.basename(video)}`);
          const ok = await postarArquivo(conta, video, 'Vídeo');
          if (ok) {
            st.video_index = (vidIdx + 1) % videos.length;
            st.ultimo_video = hoje;
          }
        } else {
          console.log(`  ⚠️  Nenhum vídeo encontrado.`);
        }
      }
    }

    estado[conta.key] = st;
  }

  salvarEstado(estado);
  console.log('\n✅ Arraia Scheduler concluído.');
}

// ─── Agendamento: 8h30 todo dia ───────────────────────────────────────────────

if (process.argv.includes('--agora')) {
  publicarArraia().catch(console.error);
} else {
  console.log('🎪 Arraia Scheduler iniciado. Agendado para 08:30 todos os dias (somente Junho 2026).');
  cron.schedule('30 8 * * *', () => publicarArraia().catch(console.error), {
    timezone: 'America/Sao_Paulo',
  });
}
