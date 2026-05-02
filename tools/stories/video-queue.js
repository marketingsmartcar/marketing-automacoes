'use strict';

const fs   = require('fs');
const path = require('path');
const { getVideoDurationInSeconds } = require('get-video-duration');

const STATE_FILE = path.join(__dirname, '..', '..', 'data', 'stories-state.json');

const PASTA_BASE     = 'C:\\Users\\Nick\\Desktop\\Projetos\\Videos\\Conteudo das lojas';
const PASTA_PEG_EXTRA = 'C:\\Users\\Nick\\Desktop\\Projetos\\Videos\\Peg Pneus';

// Vídeos da pasta Peg Pneus extra que devem ser ignorados (por nome parcial)
const PEG_EXTRA_EXCLUIR = [
  '0131',
  'Troca de pneu volvo - Kaike',
  'Depoimento Rafa Peg pneus EDITADO',
  'Depoimento Claudinei Peg pneus',
];

// Cooldown personalizado por vídeo (dias mínimos entre postagens)
// Padrão global: 2 dias. Vídeos listados aqui têm cooldown maior.
const VIDEO_COOLDOWN_DIAS = {
  'pneu michelin': 7,
};

// Pastas por conta (Bauru excluído conforme solicitado)
const PASTAS_POR_CONTA = {
  br: [
    'Americana',
    'Araraquara Loja 1',
    'Araraquara Loja 2',
    'Maringá',
    'São Carlos',
  ],
  peg_araraquara: ['Peg Pneus Araraquara', 'Peg Pneus Sorocaba'],
};

function carregarEstado() {
  if (!fs.existsSync(STATE_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return {}; }
}

function salvarEstado(estado) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(estado, null, 2));
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Lista vídeos de um diretório recursivamente
function listarVideosDir(dir, excluirNomes = []) {
  const videos = [];
  if (!fs.existsSync(dir)) return videos;
  const entradas = fs.readdirSync(dir, { withFileTypes: true });
  for (const entrada of entradas) {
    const fullPath = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      // Verifica se o nome da pasta está na lista de exclusão
      const nomeExcluido = excluirNomes.some(ex =>
        entrada.name.toLowerCase().includes(ex.toLowerCase())
      );
      if (!nomeExcluido) videos.push(...listarVideosDir(fullPath, excluirNomes));
    } else if (/\.(mp4|mov|avi|mkv)$/i.test(entrada.name) && !entrada.name.startsWith('desktop')) {
      const nomeExcluido = excluirNomes.some(ex =>
        entrada.name.toLowerCase().includes(ex.toLowerCase())
      );
      if (!nomeExcluido) videos.push(fullPath);
    }
  }
  return videos;
}

function listarVideos(contaKey) {
  const pastas = PASTAS_POR_CONTA[contaKey] || [];
  const videos = [];

  for (const pasta of pastas) {
    const dir = path.join(PASTA_BASE, pasta);
    videos.push(...listarVideosDir(dir));
  }

  // Pasta extra da Peg Araraquara
  if (contaKey === 'peg_araraquara') {
    videos.push(...listarVideosDir(PASTA_PEG_EXTRA, PEG_EXTRA_EXCLUIR));
  }

  return videos;
}

async function filtrarPorDuracao(videos, maxSegundos) {
  const resultado = [];
  for (const v of videos) {
    try {
      const dur = await getVideoDurationInSeconds(v);
      if (dur <= maxSegundos) resultado.push(v);
    } catch {
      // não conseguiu ler duração — ignora
    }
  }
  return resultado;
}

function dataHoje() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// Retorna datas dos últimos N dias (inclusive hoje) no formato YYYY-MM-DD
function ultimosDias(n) {
  const datas = new Set();
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    datas.add(d.toISOString().slice(0, 10));
  }
  return datas;
}

// Registra um vídeo como postado hoje (evita repostagem no mesmo dia)
function registrarPostagem(videoPath) {
  const estado = carregarEstado();
  if (!estado.historico) estado.historico = {};
  estado.historico[videoPath] = dataHoje();
  salvarEstado(estado);
}

// Devolve um vídeo para o início da fila (quando foi pego mas não postado)
function restituirVideo(contaKey, maxSegundos, videoPath) {
  const estado = carregarEstado();
  const hoje = dataHoje();
  const jaPostadoHoje = (estado.historico || {})[videoPath] === hoje;
  if (jaPostadoHoje) return; // não devolve se já foi postado hoje
  const filaKey = `${contaKey}_${maxSegundos}s`;
  if (!estado[filaKey]) estado[filaKey] = [];
  // Evita duplicata na fila
  if (!estado[filaKey].includes(videoPath)) {
    estado[filaKey].unshift(videoPath);
    salvarEstado(estado);
  }
}

// Retorna os próximos N vídeos para a conta, respeitando maxSegundos
// Se a fila esvaziar, embaralha tudo de novo
async function getProximosVideos(contaKey, quantidade, maxSegundos) {
  const estado = carregarEstado();
  const todosVideos = listarVideos(contaKey);
  const elegíveis = await filtrarPorDuracao(todosVideos, maxSegundos);

  if (elegíveis.length === 0) {
    console.warn(`⚠️  [${contaKey}] Nenhum vídeo elegível com duração ≤ ${maxSegundos}s`);
    return [];
  }

  const historico = estado.historico || {};

  // Verifica se um vídeo está no período de cooldown (padrão 2 dias, personalizável)
  function emCooldown(videoPath) {
    const dataPost = historico[videoPath];
    if (!dataPost) return false;
    const nomeBase = path.basename(videoPath).toLowerCase();
    const cooldown = Object.entries(VIDEO_COOLDOWN_DIAS).find(([nome]) =>
      nomeBase.includes(nome.toLowerCase())
    );
    const dias = cooldown ? cooldown[1] : 2;
    return ultimosDias(dias).has(dataPost);
  }

  const jaPostadosRecente = new Set(
    Object.keys(historico).filter(emCooldown)
  );

  const filaKey = `${contaKey}_${maxSegundos}s`;

  // Remove da fila: não existe em disco OU já postado recentemente
  if (estado[filaKey]) {
    estado[filaKey] = estado[filaKey].filter(
      v => fs.existsSync(v) && !jaPostadosRecente.has(v)
    );
  }

  if (!estado[filaKey] || estado[filaKey].length === 0) {
    // Re-embaralha excluindo recentes; se não sobrar nada, usa todos os elegíveis
    const disponiveis = elegíveis.filter(v => !jaPostadosRecente.has(v));
    if (disponiveis.length === 0) {
      console.warn(`⚠️  [${contaKey}] Todos os vídeos já postados recentemente — aguardando novos.`);
      salvarEstado(estado);
      return [];
    }
    estado[filaKey] = shuffleArray(disponiveis);
    console.log(`🔀 [${contaKey} ≤${maxSegundos}s] Fila recriada com ${estado[filaKey].length} vídeos.`);
  }

  const hoje = dataHoje();
  if (!estado.historico) estado.historico = {};

  const selecionados = [];
  while (selecionados.length < quantidade && estado[filaKey].length > 0) {
    const video = estado[filaKey].shift();
    // Registra no histórico junto com a retirada da fila — operação atômica.
    // Garante que reboots entre aqui e o post não causem repostagem.
    estado.historico[video] = hoje;
    selecionados.push(video);
  }

  salvarEstado(estado); // salva fila + histórico de uma vez
  return selecionados;
}

module.exports = { getProximosVideos, registrarPostagem, restituirVideo, listarVideos, filtrarPorDuracao, PASTAS_POR_CONTA };
