'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs       = require('fs');
const path     = require('path');
const os       = require('os');
const { execFile } = require('child_process');
const chokidar = require('chokidar');
const ffmpegPath = require('ffmpeg-static');
const { getVideoDurationInSeconds } = require('get-video-duration');

// ─── Paths ────────────────────────────────────────────────────────────────────
const PASTA_ENTRADA = 'C:\\Users\\Nick\\Desktop\\Projetos\\Videos\\Conteudo das lojas\\#1 PARA EDITAR';
const PASTA_SAIDA   = path.join(PASTA_ENTRADA, '#1 EDITADOS');

const LOGO_BR    = path.join(__dirname, '..', '..', 'assets', 'imagens', 'logos-marcas', 'brpneus-logo-borda.png');
const LOGO_PEG   = path.join(__dirname, '..', '..', 'assets', 'imagens', 'logos-marcas',
  'Logotipo-PEGPNEUS-Aplicações-Fundos_Prancheta 1 cópia 2.png'); // verde + preto (padrão colorido)
const PASTA_AUDIO = path.join(__dirname, '..', '..', 'assets', 'audio');

function getMusicaAleatoria() {
  if (!fs.existsSync(PASTA_AUDIO)) return null;
  const arquivos = fs.readdirSync(PASTA_AUDIO).filter(f => /\.(mp3|wav|aac|m4a)$/i.test(f));
  if (arquivos.length === 0) return null;
  return path.join(PASTA_AUDIO, arquivos[Math.floor(Math.random() * arquivos.length)]);
}

const DURACAO_CLIP = 30; // segundos por clip

// ─── Whisper via Groq (grátis) ou OpenAI (pago) — opcional ───────────────────
let openai = null;
if (process.env.GROQ_API_KEY) {
  const { OpenAI } = require('openai');
  openai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  });
} else if (process.env.OPENAI_API_KEY) {
  const { OpenAI } = require('openai');
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ─── Queue ────────────────────────────────────────────────────────────────────
const fila = [];
let processando = false;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getLogo(cidade) {
  return cidade.toUpperCase().startsWith('PEG') ? LOGO_PEG : LOGO_BR;
}

// ASS color format: &H00BBGGRR
function getCorLegenda(cidade) {
  return cidade.toUpperCase().startsWith('PEG')
    ? '&H0000FF00'   // verde  — Peg Pneus
    : '&H0000FFFF';  // amarelo — BR Pneus
}

function pad2(n) { return String(n).padStart(2, '0'); }

function segundosParaSrt(s) {
  const h   = Math.floor(s / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms  = Math.round((s % 1) * 1000);
  return `${pad2(h)}:${pad2(m)}:${pad2(sec)},${String(ms).padStart(3, '0')}`;
}

// Converte path do Windows para o formato aceito pelo filtro subtitles do ffmpeg
function pathParaFiltro(p) {
  return p.replace(/\\/g, '/').replace(/^([A-Za-z]):/, '$1\\:');
}

function runFfmpeg(args, timeoutMs = 300000) {
  return new Promise((resolve, reject) => {
    const proc = execFile(ffmpegPath, args, { maxBuffer: 100 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(Object.assign(new Error(err.message), { stderr }));
      else resolve({ stdout, stderr });
    });
    setTimeout(() => { proc.kill(); reject(new Error('ffmpeg timeout')); }, timeoutMs);
  });
}

// Verifica se o vídeo tem stream de áudio usando saída stderr do ffmpeg
async function temStreamAudio(videoPath) {
  return new Promise((resolve) => {
    execFile(ffmpegPath, ['-i', videoPath], (_err, _stdout, stderr) => {
      resolve((stderr || '').includes('Audio:'));
    });
  });
}

// Retorna {width, height} do vídeo
async function getVideoDimensoes(videoPath) {
  return new Promise((resolve) => {
    execFile(ffmpegPath, ['-i', videoPath], (_err, _stdout, stderr) => {
      const m = (stderr || '').match(/,\s*(\d{2,5})x(\d{2,5})[\s,]/);
      if (m) resolve({ width: parseInt(m[1]), height: parseInt(m[2]) });
      else   resolve({ width: 1080, height: 1920 }); // fallback portrait
    });
  });
}

// Encontra o melhor trecho de 30s usando silencedetect para detectar início de fala
async function encontrarMelhor30s(videoPath, duracao) {
  return new Promise((resolve) => {
    execFile(
      ffmpegPath,
      ['-i', videoPath, '-af', 'silencedetect=n=-35dB:d=0.5', '-f', 'null', '-'],
      (_err, _stdout, stderr) => {
        const endsRe = /silence_end:\s*([\d.]+)/g;
        let m;
        const ends = [];
        while ((m = endsRe.exec(stderr || '')) !== null) ends.push(parseFloat(m[1]));
        // Primeiro fim de silêncio = início do primeiro trecho de fala
        const firstSpeech = ends.length > 0 ? Math.max(0, ends[0] - 0.3) : 0;
        const start = Math.min(firstSpeech, Math.max(0, duracao - 30));
        resolve({ start, dur: 30 });
      }
    );
  });
}

// ─── Transcrição (Whisper) ────────────────────────────────────────────────────
async function transcrever(videoPath, startSec, dur) {
  if (!openai) return null;

  const tmpAudio = path.join(os.tmpdir(), `aud_${Date.now()}.wav`);
  try {
    await runFfmpeg([
      '-ss', String(startSec), '-t', String(dur),
      '-i', videoPath,
      '-vn', '-ar', '16000', '-ac', '1',
      '-f', 'wav', tmpAudio, '-y',
    ], 60000);

    const modelo = process.env.GROQ_API_KEY ? 'whisper-large-v3-turbo' : 'whisper-1';
    const resp = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tmpAudio),
      model: modelo,
      language: 'pt',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    });
    return resp.segments || [];
  } catch (e) {
    console.warn(`    ⚠️  Transcrição falhou: ${e.message?.slice(0, 80)}`);
    return null;
  } finally {
    if (fs.existsSync(tmpAudio)) fs.unlinkSync(tmpAudio);
  }
}

function segundosParaAss(s) {
  const h  = Math.floor(s / 3600);
  const m  = Math.floor((s % 3600) / 60);
  const sc = Math.floor(s % 60);
  const cs = Math.round((s % 1) * 100);
  return `${h}:${pad2(m)}:${pad2(sc)}.${String(cs).padStart(2, '0')}`;
}

// Gera arquivo ASS com PlayResX/PlayResY corretos → FontSize em pixels reais
function criarAss(segments, corLegenda, videoWidth, videoHeight, maxPalavras = 4) {
  const cor      = corLegenda || '&H00FFFFFF';
  const fontSize = Math.round(videoHeight * 0.028);     // ~54px em 1920p, ~30px em 1080p
  const marginV  = Math.round(videoHeight * 0.18);      // 18% do rodapé → ~346px em 1920p

  const header = [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${videoWidth}`,
    `PlayResY: ${videoHeight}`,
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: Default,Arial,${fontSize},${cor},&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,3,0,2,10,10,${marginV},1`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ].join('\n') + '\n';

  const linhas = [];
  for (const seg of segments) {
    if (!seg.text?.trim()) continue;
    const palavras = seg.text.trim().split(/\s+/);
    const durSeg   = Math.max(seg.end - seg.start, 0.1);
    const chunks   = [];
    for (let i = 0; i < palavras.length; i += maxPalavras) {
      chunks.push(palavras.slice(i, i + maxPalavras));
    }
    const durChunk = durSeg / chunks.length;
    chunks.forEach((chunk, ci) => {
      const s = seg.start + ci * durChunk;
      const e = s + durChunk - 0.05;
      linhas.push(`Dialogue: 0,${segundosParaAss(s)},${segundosParaAss(e)},Default,,0,0,0,,${chunk.join(' ')}`);
    });
  }

  return header + linhas.join('\n') + '\n';
}

// ─── Renderizar um clip ───────────────────────────────────────────────────────
async function renderizarClip({ input, output, start, dur, logo, srtPath, musicaPath, comAudio, corLegenda, modo, dims }) {
  const comMusica = !!musicaPath;
  const semVoz    = modo === 'sem_voz';

  // Logo em pixels absolutos (22% da largura do vídeo) — independente do tamanho do PNG da logo
  const logoW = Math.round((dims?.width || 1080) * 0.22);

  const inputs = [
    '-ss', String(start), '-t', String(dur), '-i', input,
    '-i', logo,
  ];
  if (comMusica) {
    inputs.push('-stream_loop', '-1', '-t', String(dur + 5), '-i', musicaPath);
  }
  const musicIdx = comMusica ? 2 : null;

  // --- Filtros de vídeo ---
  const vf = [
    '[0:v]eq=brightness=0.05:contrast=1.25:saturation=1.35[eq]',
    `[1:v]scale=${logoW}:-1[logo_s]`,
    '[eq][logo_s]overlay=(W-w)/2:15[v1]',
  ];
  let vout = '[v1]';

  if (semVoz) {
    const fadeOutStart = Math.max(0, dur - 0.5).toFixed(2);
    vf.push(`[v1]fade=t=in:st=0:d=0.5,fade=t=out:st=${fadeOutStart}:d=0.5[vfade]`);
    vout = '[vfade]';
  } else if (srtPath) {
    // srtPath agora aponta para um arquivo .ass com estilos embutidos
    const ep = pathParaFiltro(srtPath);
    vf.push(`[v1]subtitles='${ep}'[vout]`);
    vout = '[vout]';
  }

  // --- Filtros de áudio ---
  const af = [];
  let amap = null;

  if (semVoz) {
    if (comMusica) {
      af.push(`[${musicIdx}:a]volume=0.10,atrim=0:${dur},asetpts=PTS-STARTPTS[aout]`);
      amap = '[aout]';
    }
  } else if (comAudio) {
    // highpass: remove grave, lowpass: remove chiado, afftdn: reduz ruído de fundo, dynaudnorm: nivelar volume
    const voiceFx = 'highpass=f=100,lowpass=f=8000,afftdn=nf=-20:tn=1,dynaudnorm=p=0.9,volume=1.8';
    if (comMusica) {
      af.push(`[0:a]${voiceFx}[orig]`);
      af.push(`[${musicIdx}:a]volume=0.07,atrim=0:${dur},asetpts=PTS-STARTPTS[music_t]`);
      af.push(`[orig][music_t]amix=inputs=2:duration=first:dropout_transition=3[aout]`);
      amap = '[aout]';
    } else {
      af.push(`[0:a]${voiceFx}[aout]`);
      amap = '[aout]';
    }
  } else if (comMusica) {
    af.push(`[${musicIdx}:a]volume=0.15,atrim=0:${dur},asetpts=PTS-STARTPTS[aout]`);
    amap = '[aout]';
  }

  const filterComplex = [...vf, ...af].join('; ');

  const args = [
    ...inputs,
    '-filter_complex', filterComplex,
    '-map', vout,
    ...(amap ? ['-map', amap] : ['-an']),
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
    '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart',
    output, '-y',
  ];

  await runFfmpeg(args);
}

// ─── Processar um vídeo completo ──────────────────────────────────────────────
async function processarVideo(videoPath, cidade) {
  const ext  = path.extname(videoPath);
  const base = path.basename(videoPath, ext);
  console.log(`\n🎬 ${base}  [${cidade}]`);

  const pastaOut       = path.join(PASTA_SAIDA, cidade);
  const pastaSemEdicao = path.join(PASTA_ENTRADA, cidade, 'SEM EDIÇÃO');
  [pastaOut, pastaSemEdicao].forEach(p => { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); });

  // Arquivar original
  const originalSalvo = path.join(pastaSemEdicao, path.basename(videoPath));
  if (!fs.existsSync(originalSalvo)) {
    fs.copyFileSync(videoPath, originalSalvo);
  }

  let duracao;
  try {
    duracao = await getVideoDurationInSeconds(originalSalvo);
  } catch (e) {
    console.error(`  ❌ Não foi possível ler duração: ${e.message}`);
    return;
  }

  const logo      = getLogo(cidade);
  const musicaPath = getMusicaAleatoria();
  const comAudio  = await temStreamAudio(originalSalvo);
  const numClips  = Math.ceil(duracao / DURACAO_CLIP);

  console.log(`  ⏱  ${Math.round(duracao)}s → ${numClips} clip(s)` +
    (musicaPath ? ` 🎵 ${path.basename(musicaPath)}` : '') + (openai ? ' 📝' : '') + (!comAudio ? ' [sem áudio]' : ''));

  for (let i = 0; i < numClips; i++) {
    const start   = i * DURACAO_CLIP;
    const dur     = Math.min(DURACAO_CLIP, duracao - start);
    const sufixo  = numClips > 1 ? `_parte${String(i + 1).padStart(2, '0')}` : '';
    const output  = path.join(pastaOut, `${base}${sufixo}.mp4`);

    console.log(`  ✂️  Parte ${i + 1}/${numClips}  (${start}s–${Math.round(start + dur)}s)`);

    // Transcrição opcional
    let srtPath = null;
    if (openai && comAudio) {
      const segments = await transcrever(originalSalvo, start, dur);
      if (segments?.length) {
        srtPath = path.join(os.tmpdir(), `sub_${Date.now()}_${i}.srt`);
        fs.writeFileSync(srtPath, criarSrt(segments), 'utf8');
        console.log(`    📝 ${segments.length} linha(s) de legenda`);
      }
    }

    let sucesso = false;

    // Tentativa 1: pipeline completo
    try {
      await renderizarClip({ input: originalSalvo, output, start, dur, logo, srtPath, musicaPath, comAudio });
      console.log(`    ✅ ${path.basename(output)}`);
      sucesso = true;
    } catch (e) {
      console.warn(`    ⚠️  Erro: ${e.message?.slice(0, 100)}`);
    }

    // Tentativa 2: sem música
    if (!sucesso && musicaPath) {
      console.log(`    🔄 Tentando sem música...`);
      try {
        await renderizarClip({ input: originalSalvo, output, start, dur, logo, srtPath, musicaPath: null, comAudio });
        console.log(`    ✅ ${path.basename(output)} (sem música)`);
        sucesso = true;
      } catch (e) {
        console.warn(`    ⚠️  ${e.message?.slice(0, 100)}`);
      }
    }

    // Tentativa 3: só vídeo + logo + brilho (sem áudio, sem legendas)
    if (!sucesso) {
      console.log(`    🔄 Tentando só vídeo...`);
      try {
        await renderizarClip({ input: originalSalvo, output, start, dur, logo, srtPath: null, musicaPath: null, comAudio: false });
        console.log(`    ✅ ${path.basename(output)} (só vídeo)`);
      } catch (e) {
        console.error(`    ❌ Falhou definitivamente: ${e.message?.slice(0, 100)}`);
      }
    }

    if (srtPath && fs.existsSync(srtPath)) fs.unlinkSync(srtPath);
  }

  // Remover da pasta de entrada
  try { fs.unlinkSync(videoPath); } catch {}
  console.log(`  📦 Original arquivado → SEM EDIÇÃO/`);
  console.log(`  🎉 Pronto → ${pastaOut}`);
}

// ─── Listar vídeos prontos numa pasta de cidade ───────────────────────────────
function listarVideosCidade(cidade) {
  const pasta = path.join(PASTA_ENTRADA, cidade);
  if (!fs.existsSync(pasta)) return [];
  return fs.readdirSync(pasta)
    .filter(f => /\.(mp4|mov|avi|mkv)$/i.test(f))
    .map(f => path.join(pasta, f))
    .sort(); // ordem alfabética = ordem cronológica se nomeados por data
}

// ─── Listar todas as cidades que têm vídeos aguardando ───────────────────────
function listarCidadesComVideos() {
  if (!fs.existsSync(PASTA_ENTRADA)) return [];
  return fs.readdirSync(PASTA_ENTRADA, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== '#1 EDITADOS')
    .map(d => d.name)
    .filter(cidade => listarVideosCidade(cidade).length > 0)
    .sort();
}

// ─── Concatenar vários vídeos em um só ───────────────────────────────────────
async function concatenarVideos(videos, outputPath) {
  if (videos.length === 1) {
    fs.copyFileSync(videos[0], outputPath);
    return;
  }
  // Cria arquivo de lista para o concat demuxer do ffmpeg
  const listFile = path.join(os.tmpdir(), `concat_${Date.now()}.txt`);
  const linhas = videos.map(v => `file '${v.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`);
  fs.writeFileSync(listFile, linhas.join('\n'), 'utf8');
  try {
    await runFfmpeg([
      '-f', 'concat', '-safe', '0',
      '-i', listFile,
      '-c', 'copy',
      outputPath, '-y',
    ], 120000);
  } finally {
    if (fs.existsSync(listFile)) fs.unlinkSync(listFile);
  }
}

// ─── Helper de fallback para renderização ────────────────────────────────────
async function renderizarComFallback(log, params) {
  const { input, output, start, dur, logo, srtPath, musicaPath, comAudio, corLegenda, modo, dims } = params;
  const clipsGerados = [];

  let sucesso = false;
  try {
    await renderizarClip({ input, output, start, dur, logo, srtPath, musicaPath, comAudio, corLegenda, modo, dims });
    log(`    ✅ ${path.basename(output)}`);
    clipsGerados.push(output);
    sucesso = true;
  } catch (e) {
    log(`    ⚠️  Erro: ${e.message?.slice(0, 80)}`);
  }

  if (!sucesso && musicaPath) {
    try {
      await renderizarClip({ input, output, start, dur, logo, srtPath, musicaPath: null, comAudio, corLegenda, modo, dims });
      log(`    ✅ ${path.basename(output)} (sem música)`);
      clipsGerados.push(output);
      sucesso = true;
    } catch (e) {
      log(`    ⚠️  ${e.message?.slice(0, 80)}`);
    }
  }

  if (!sucesso) {
    try {
      await renderizarClip({ input, output, start, dur, logo, srtPath: null, musicaPath: null, comAudio: false, corLegenda, modo: 'sem_voz', dims });
      log(`    ✅ ${path.basename(output)} (só vídeo)`);
      clipsGerados.push(output);
    } catch (e) {
      log(`    ❌ Falhou: ${e.message?.slice(0, 80)}`);
    }
  }

  if (srtPath && fs.existsSync(srtPath)) fs.unlinkSync(srtPath);
  return clipsGerados;
}

// ─── Processar todos os vídeos de uma cidade ──────────────────────────────────
// modo:    'com_audio' | 'sem_voz'
// subtipo: 'juntar' (padrão) | 'individuais'  — só relevante para com_audio
async function processarCidade(cidade, onProgresso, modo = 'com_audio', subtipo = 'juntar') {
  const videos = listarVideosCidade(cidade);
  if (videos.length === 0) throw new Error(`Nenhum vídeo encontrado em ${cidade}`);

  const log        = (msg) => { console.log(msg); if (onProgresso) onProgresso(msg); };
  const semVoz     = modo === 'sem_voz';
  const corLegenda = getCorLegenda(cidade);
  const logo       = getLogo(cidade);
  const musicaPath = getMusicaAleatoria();

  const p2 = (n) => String(n).padStart(2, '0');
  const agora = new Date();
  const ts = `${agora.getFullYear()}-${p2(agora.getMonth()+1)}-${p2(agora.getDate())}_${p2(agora.getHours())}-${p2(agora.getMinutes())}`;

  const pastaOut       = path.join(PASTA_SAIDA, cidade, ts);
  const pastaSemEdicao = path.join(PASTA_ENTRADA, cidade, 'SEM EDIÇÃO', ts);
  [pastaOut, pastaSemEdicao].forEach(p => { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); });

  const modoLabel = semVoz ? 'Sem voz' : `Com áudio / ${subtipo}`;
  log(`\n🎬 Iniciando edição — ${cidade} (${videos.length} arquivo(s)) [${modoLabel}]`);

  // Arquivar todos os originais antes de qualquer processamento
  const arquivados = [];
  for (const v of videos) {
    const dest = path.join(pastaSemEdicao, path.basename(v));
    if (!fs.existsSync(dest)) fs.copyFileSync(v, dest);
    try { fs.unlinkSync(v); } catch {}
    arquivados.push(dest);
  }

  const clipsGerados = [];

  // ── Branch A: sem_voz — fades em cada clip → junta tudo → música → partes de 30s ──
  if (semVoz) {
    const dims = await getVideoDimensoes(arquivados[0]);
    const logoW = Math.round(dims.width * 0.22);
    const tempClips = [];

    // Passo 1: processar cada clip individualmente (eq + logo + fade-in/out), sem áudio
    for (let idx = 0; idx < arquivados.length; idx++) {
      const clipPath = arquivados[idx];
      const base     = path.basename(clipPath, path.extname(clipPath));
      const tempOut  = path.join(os.tmpdir(), `sv_clip_${Date.now()}_${idx}.mp4`);

      let duracao;
      try { duracao = await getVideoDurationInSeconds(clipPath); } catch { duracao = 30; }

      let start = 0;
      let dur   = Math.min(duracao, DURACAO_CLIP);
      if (duracao > DURACAO_CLIP) {
        const melhor = await encontrarMelhor30s(clipPath, duracao);
        start = melhor.start;
        dur   = melhor.dur;
      }

      log(`  🎬 Preparando clip ${idx + 1}/${arquivados.length} — ${base} (${Math.round(duracao)}s${duracao > DURACAO_CLIP ? `, início ${Math.round(start)}s` : ''})`);

      const fadeOutStart = Math.max(0, dur - 0.5).toFixed(2);
      const fc = [
        `[0:v]eq=brightness=0.05:contrast=1.25:saturation=1.35[eq]`,
        `[1:v]scale=${logoW}:-1[logo_s]`,
        `[eq][logo_s]overlay=(W-w)/2:15[v1]`,
        `[v1]fade=t=in:st=0:d=0.5,fade=t=out:st=${fadeOutStart}:d=0.5[vfade]`,
      ].join('; ');

      try {
        await runFfmpeg([
          '-ss', String(start), '-t', String(dur), '-i', clipPath,
          '-i', logo,
          '-filter_complex', fc,
          '-map', '[vfade]', '-an',
          '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
          '-movflags', '+faststart',
          tempOut, '-y',
        ]);
        tempClips.push(tempOut);
      } catch (e) {
        log(`    ⚠️  Clip ${idx + 1} falhou: ${e.message?.slice(0, 60)}`);
      }
    }

    if (tempClips.length === 0) {
      log(`  ❌ Nenhum clip processado`);
    } else {
      // Passo 2: concatenar todos os clips processados
      const base0       = path.basename(arquivados[0], path.extname(arquivados[0]));
      const nomeBase    = `${base0}${arquivados.length > 1 ? `_+${arquivados.length - 1}` : ''}`;
      const videoJuntado = path.join(os.tmpdir(), `sv_joined_${Date.now()}.mp4`);

      log(`  🔗 Juntando ${tempClips.length} clip(s) processado(s)...`);
      await concatenarVideos(tempClips, videoJuntado);
      for (const t of tempClips) { try { fs.unlinkSync(t); } catch {} }

      // Passo 3: dividir em partes de 30s com música
      const duracaoTotal = await getVideoDurationInSeconds(videoJuntado);
      const numPartes    = Math.ceil(duracaoTotal / DURACAO_CLIP);
      log(`  ⏱  ${Math.round(duracaoTotal)}s → ${numPartes} parte(s)${musicaPath ? ' 🎵' : ''}`);

      for (let i = 0; i < numPartes; i++) {
        const start  = i * DURACAO_CLIP;
        const dur    = Math.min(DURACAO_CLIP, duracaoTotal - start);
        const sufixo = numPartes > 1 ? `_parte${String(i + 1).padStart(2, '0')}` : '';
        const output = path.join(pastaOut, `${nomeBase}${sufixo}.mp4`);

        log(`  ✂️  Parte ${i + 1}/${numPartes}  (${start}s–${Math.round(start + dur)}s)`);

        try {
          if (musicaPath) {
            await runFfmpeg([
              '-ss', String(start), '-t', String(dur), '-i', videoJuntado,
              '-stream_loop', '-1', '-t', String(dur + 5), '-i', musicaPath,
              '-filter_complex', `[1:a]volume=0.10,atrim=0:${dur},asetpts=PTS-STARTPTS[aout]`,
              '-map', '0:v', '-map', '[aout]',
              '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
              '-movflags', '+faststart',
              output, '-y',
            ]);
          } else {
            await runFfmpeg([
              '-ss', String(start), '-t', String(dur), '-i', videoJuntado,
              '-map', '0:v', '-an', '-c:v', 'copy',
              '-movflags', '+faststart',
              output, '-y',
            ]);
          }
          log(`    ✅ ${path.basename(output)}`);
          clipsGerados.push(output);
        } catch (e) {
          log(`    ❌ Falhou: ${e.message?.slice(0, 60)}`);
        }
      }

      try { fs.unlinkSync(videoJuntado); } catch {}
    }
  }

  // ── Branch B: com_audio individuais — cada clip separado, máx 30s ──────────
  else if (subtipo === 'individuais') {
    for (let idx = 0; idx < arquivados.length; idx++) {
      const clipPath = arquivados[idx];
      const base     = path.basename(clipPath, path.extname(clipPath));
      const output   = path.join(pastaOut, `${base}_editado.mp4`);

      let duracao;
      try { duracao = await getVideoDurationInSeconds(clipPath); } catch { duracao = 30; }

      const comAudio = await temStreamAudio(clipPath);
      let start = 0;
      let dur   = Math.min(duracao, DURACAO_CLIP);
      if (duracao > DURACAO_CLIP) {
        const melhor = await encontrarMelhor30s(clipPath, duracao);
        start = melhor.start;
        dur   = melhor.dur;
      }

      const dims = await getVideoDimensoes(clipPath);

      log(`  🎙️ Clip ${idx + 1}/${arquivados.length} — ${base} (${Math.round(duracao)}s${duracao > DURACAO_CLIP ? `, início ${Math.round(start)}s` : ''})`);

      let srtPath = null;
      if (openai && comAudio) {
        const segments = await transcrever(clipPath, start, dur);
        if (segments?.length) {
          srtPath = path.join(os.tmpdir(), `sub_${Date.now()}_${idx}.ass`);
          fs.writeFileSync(srtPath, criarAss(segments, corLegenda, dims.width, dims.height), 'utf8');
          log(`    📝 ${segments.length} segmento(s)`);
        }
      }

      const gerados = await renderizarComFallback(log, {
        input: clipPath, output, start, dur, logo,
        srtPath, musicaPath, comAudio, corLegenda, modo: 'com_audio', dims,
      });
      clipsGerados.push(...gerados);
    }
  }

  // ── Branch C: com_audio juntar — concatena tudo, divide em clips de 30s ────
  else {
    const base        = path.basename(arquivados[0], path.extname(arquivados[0]));
    const nomeJuntado = `${base}${arquivados.length > 1 ? `_+${arquivados.length - 1}` : ''}`;
    const videoJuntado = path.join(pastaSemEdicao, `${nomeJuntado}.mp4`);

    if (arquivados.length > 1) {
      log(`  🔗 Juntando ${arquivados.length} clips...`);
      await concatenarVideos(arquivados, videoJuntado);
    } else if (arquivados[0] !== videoJuntado) {
      fs.copyFileSync(arquivados[0], videoJuntado);
    }

    const duracao  = await getVideoDurationInSeconds(videoJuntado);
    const numClips = Math.ceil(duracao / DURACAO_CLIP);
    const comAudio = await temStreamAudio(videoJuntado);
    const dims     = await getVideoDimensoes(videoJuntado);

    log(`  ⏱  ${Math.round(duracao)}s → ${numClips} clip(s)${musicaPath ? ` 🎵` : ''}${openai ? ' 📝' : ''}`);

    for (let i = 0; i < numClips; i++) {
      const start  = i * DURACAO_CLIP;
      const dur    = Math.min(DURACAO_CLIP, duracao - start);
      const sufixo = numClips > 1 ? `_parte${String(i + 1).padStart(2, '0')}` : '';
      const output = path.join(pastaOut, `${nomeJuntado}${sufixo}.mp4`);

      log(`  ✂️  Parte ${i + 1}/${numClips}  (${start}s–${Math.round(start + dur)}s)`);

      let srtPath = null;
      if (openai && comAudio) {
        const segments = await transcrever(videoJuntado, start, dur);
        if (segments?.length) {
          srtPath = path.join(os.tmpdir(), `sub_${Date.now()}_${i}.ass`);
          fs.writeFileSync(srtPath, criarAss(segments, corLegenda, dims.width, dims.height), 'utf8');
          log(`    📝 ${segments.length} segmento(s) → ${segments.reduce((a, s) => a + s.text.trim().split(/\s+/).length, 0)} palavras`);
        }
      }

      const gerados = await renderizarComFallback(log, {
        input: videoJuntado, output, start, dur, logo,
        srtPath, musicaPath, comAudio, corLegenda, modo: 'com_audio', dims,
      });
      clipsGerados.push(...gerados);
    }
  }

  log(`  🎉 Pronto → ${pastaOut}`);
  return { cidade, numClips: clipsGerados.length, pasta: pastaOut };
}

// ─── Runner da fila ───────────────────────────────────────────────────────────
async function runFila() {
  if (processando || fila.length === 0) return;
  processando = true;
  const item = fila.shift();
  try {
    await processarVideo(item.videoPath, item.cidade);
  } catch (e) {
    console.error(`❌ ${path.basename(item.videoPath)}: ${e.message}`);
  }
  processando = false;
  setImmediate(runFila);
}

// ─── Entry point ──────────────────────────────────────────────────────────────
if (require.main === module) {
  // Modo manual: node editor-automatico.js "C:\path\video.mp4"
  if (process.argv[2] && fs.existsSync(process.argv[2])) {
    const videoPath = process.argv[2];
    const cidade    = path.basename(path.dirname(videoPath));
    fila.push({ videoPath, cidade });
    runFila();
    return;
  }

  // Modo automático: monitoramento contínuo
  console.log('\n🎬 Editor Automático de Vídeos');
  console.log('────────────────────────────────────────');
  console.log(`📂 Entrada : ${PASTA_ENTRADA}`);
  console.log(`📁 Saída   : ${PASTA_SAIDA}`);
  const legendaStatus = !openai
    ? '💡 Legendas : desabilitadas — adicione GROQ_API_KEY no .env (grátis)'
    : process.env.GROQ_API_KEY
      ? '✅ Legendas : Groq Whisper (grátis)'
      : '✅ Legendas : OpenAI Whisper (pago)';
  console.log(legendaStatus);
  const totalMusicas = fs.existsSync(PASTA_AUDIO) ? fs.readdirSync(PASTA_AUDIO).filter(f => /\.(mp3|wav|aac|m4a)$/i.test(f)).length : 0;
  console.log(totalMusicas > 0 ? `🎵 Música   : ${totalMusicas} arquivo(s) em assets/audio/ (sorteio por vídeo)` : `🔇 Música   : sem arquivo — coloque MP3s em assets/audio/`);
  console.log('────────────────────────────────────────\n');

  const watcher = chokidar.watch(
    path.join(PASTA_ENTRADA, '**', '*.{mp4,mov,avi,mkv,MP4,MOV,AVI,MKV}'),
    {
      ignored: (p) => {
        const norm = p.replace(/\\/g, '/');
        return norm.includes('SEM EDIÇÃO') || norm.includes('#1 EDITADOS') || norm.includes('EDITADOS');
      },
      persistent: true,
      awaitWriteFinish: { stabilityThreshold: 5000, pollInterval: 1000 },
      ignoreInitial: false,
    }
  );

  watcher.on('add', (filePath) => {
    const cidade = path.basename(path.dirname(filePath));
    if (cidade === '#1 PARA EDITAR') return;
    console.log(`📥 ${path.basename(filePath)}  →  ${cidade}`);
    fila.push({ videoPath: filePath, cidade });
    runFila();
  });

  watcher.on('error', e => console.error('Watcher error:', e.message));
}

module.exports = { processarVideo, processarCidade, listarCidadesComVideos };
