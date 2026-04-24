// tools/gerar-arte.js
// Geração de artes de Novo Colaborador e Aniversariante via composição de imagem
const sharp  = require('sharp');
const path   = require('path');
const fs     = require('fs');

const TEMPLATES = path.join(__dirname, '..', 'assets', 'templates');
const OUTPUT    = path.join(__dirname, '..', 'output', 'criativos');
fs.mkdirSync(OUTPUT, { recursive: true });

// ─── Montserrat embutida (WOFF2 → base64) ─────────────────────────────────────
const FONT_DIR = path.join(__dirname, '..', 'node_modules', '@fontsource', 'montserrat', 'files');
function loadFont(file) {
  const full = path.join(FONT_DIR, file);
  return fs.existsSync(full) ? fs.readFileSync(full).toString('base64') : null;
}
const FONT_800 = loadFont('montserrat-latin-800-normal.woff2');
const FONT_600 = loadFont('montserrat-latin-600-normal.woff2');
const FONT_400 = loadFont('montserrat-latin-400-normal.woff2');

function fontFaceStyle() {
  if (!FONT_800) return '';
  const face = (weight, b64) => b64
    ? `@font-face{font-family:'Montserrat';font-weight:${weight};src:url('data:font/woff2;base64,${b64}')format('woff2');}`
    : '';
  return `<defs><style>${face(800,FONT_800)}${face(600,FONT_600)}${face(400,FONT_400)}</style></defs>`;
}

// ─── Configurações de layout (px, imagens 1080x1080) ─────────────────────────
// Ajuste as constantes abaixo se a posição ficar levemente fora do lugar

const CFG = {
  colaborador: {
    // Foto circular no topo da pílula (novo design sem placeholder de texto)
    foto: { cx: 540, cy: 316, r: 188 },
    // Textos na área branca inferior da pílula (y=504–782)
    nome:   { x: 540, y: 592, size: 52, weight: '800',   color: '#1A2A4A', fontFamily: "Montserrat, 'Nunito', 'Segoe UI Black', 'Arial Black', sans-serif" },
    cargo:  { x: 540, y: 622, size: 24, weight: '600',   color: '#555555', fontFamily: "Montserrat, 'Nunito', 'Segoe UI Semibold', 'Segoe UI', Arial, sans-serif" },
    cidade: { x: 540, y: 648, size: 22, weight: '400',   color: '#777777', fontFamily: "Montserrat, 'Nunito', 'Segoe UI', Arial, sans-serif" },
    // Arquivo de template por marca
    templates: {
      brpneus:  'colaborador-brpneus.png',
      pegpneus: 'colaborador-pegpneus.png',
      smartcar: 'colaborador-smartcar.png',
    },
  },

  aniversario: {
    // Foto retangular dentro do polaroid (templates sem NOME — área branca limpa)
    foto: { x: 83, y: 275, w: 379, h: 500 },
    // Nome diretamente na faixa branca inferior do polaroid (y=780–895)
    nome:  { x: 272, y: 848, size: 65, weight: 'bold' },
    // Cor do texto por marca (confirmada por pixel scan — outline sempre preto)
    cores: {
      brpneus:  { texto: '#FFCC10' },
      pegpneus: { texto: '#32CD33' },
      smartcar: { texto: '#3E73FF' },
    },
    // Arquivo de template por marca (mapeado conforme conteúdo visual real)
    templates: {
      brpneus:  'aniversario-pegpneus.png',
      pegpneus: 'aniversario-smartcar.png',
      smartcar: 'aniversario-brpneus.png',
    },
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeSvg(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function svgBuffer(elementos) {
  const body = elementos.map(el => {
    if (el.type === 'rect') {
      return `<rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" fill="${el.fill}"/>`;
    }
    if (el.type === 'text') {
      const ff = el.fontFamily || 'Arial, sans-serif';
      const strokeAttr = el.stroke
        ? `stroke="${el.stroke}" stroke-width="${el.strokeWidth || 3}" paint-order="stroke fill"`
        : '';
      return `<text x="${el.x}" y="${el.y}" font-family="${ff}" font-size="${el.size}" font-weight="${el.weight || 'normal'}" fill="${el.color}" text-anchor="middle" ${strokeAttr}>${escapeSvg(el.text)}</text>`;
    }
    return '';
  }).join('\n');
  return Buffer.from(`<svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">\n${fontFaceStyle()}\n${body}\n</svg>`);
}

async function fotoCircular(fotoPath, diametro) {
  const r = diametro / 2;
  const mask = Buffer.from(
    `<svg width="${diametro}" height="${diametro}"><circle cx="${r}" cy="${r}" r="${r}" fill="white"/></svg>`
  );
  return sharp(fotoPath)
    .resize(diametro, diametro, { fit: 'cover', position: 'attention' })
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

// ─── Gerador: Novo Colaborador ────────────────────────────────────────────────

async function gerarColaborador({ marca, nome, cargo, cidade, fotoPath }) {
  const cfg = CFG.colaborador;
  const templateFile = cfg.templates[marca] || cfg.templates.brpneus;
  const templatePath = path.join(TEMPLATES, templateFile);

  if (!fs.existsSync(fotoPath)) throw new Error('Foto não encontrada: ' + fotoPath);

  const diametro  = cfg.foto.r * 2;
  const fotoBuf   = await fotoCircular(fotoPath, diametro);

  // Tamanho dinâmico: nomes longos reduzem automaticamente
  const nomeUpper = nome.toUpperCase();
  const nomeSize = nomeUpper.length <= 7  ? 58
                 : nomeUpper.length <= 11 ? 52
                 : nomeUpper.length <= 15 ? 46
                 : nomeUpper.length <= 20 ? 40
                 : 34;

  const overlay = svgBuffer([
    { type: 'text', ...cfg.nome,   size: nomeSize, text: nomeUpper },
    { type: 'text', ...cfg.cargo,  text: cargo.toUpperCase() },
    { type: 'text', ...cfg.cidade, text: cidade.toUpperCase() },
  ]);

  const outFile = path.join(OUTPUT, `colaborador_${marca}_${Date.now()}.png`);
  await sharp(templatePath)
    .composite([
      { input: fotoBuf,  left: cfg.foto.cx - cfg.foto.r, top: cfg.foto.cy - cfg.foto.r },
      { input: overlay, top: 0, left: 0 },
    ])
    .png()
    .toFile(outFile);

  return outFile;
}

// ─── Gerador: Aniversariante ──────────────────────────────────────────────────

async function gerarAniversario({ marca, nome, fotoPath }) {
  const cfg    = CFG.aniversario;
  const templateFile = cfg.templates[marca] || cfg.templates.brpneus;
  const templatePath = path.join(TEMPLATES, templateFile);
  const cores  = cfg.cores[marca] || cfg.cores.brpneus;

  if (!fs.existsSync(fotoPath)) throw new Error('Foto não encontrada: ' + fotoPath);

  const fotoBuf = await sharp(fotoPath)
    .resize(cfg.foto.w, cfg.foto.h, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer();

  const overlay = svgBuffer([
    {
      type: 'text', x: cfg.nome.x, y: cfg.nome.y,
      size: cfg.nome.size, weight: cfg.nome.weight,
      fontFamily: "Impact, 'Arial Black', sans-serif",
      color: cores.texto, stroke: '#000000', strokeWidth: 4,
      text: nome.toUpperCase(),
    },
  ]);

  const outFile = path.join(OUTPUT, `aniversario_${marca}_${Date.now()}.png`);
  await sharp(templatePath)
    .composite([
      { input: fotoBuf, left: cfg.foto.x, top: cfg.foto.y },
      { input: overlay, top: 0, left: 0 },
    ])
    .png()
    .toFile(outFile);

  return outFile;
}

// ─── CLI ──────────────────────────────────────────────────────────────────────
// Uso: node tools/gerar-arte.js colaborador brpneus "João Silva" "Mecânico" "Araraquara" /path/foto.jpg
//      node tools/gerar-arte.js aniversario brpneus "Maria Santos" /path/foto.jpg

if (require.main === module) {
  const [,, tipo, marca, ...rest] = process.argv;
  (async () => {
    let result;
    if (tipo === 'colaborador') {
      const [nome, cargo, cidade, fotoPath] = rest;
      if (!nome || !cargo || !cidade || !fotoPath) {
        console.error('Uso: gerar-arte.js colaborador <marca> <nome> <cargo> <cidade> <foto>');
        process.exit(1);
      }
      result = await gerarColaborador({ marca, nome, cargo, cidade, fotoPath });
    } else if (tipo === 'aniversario') {
      const [nome, fotoPath] = rest;
      if (!nome || !fotoPath) {
        console.error('Uso: gerar-arte.js aniversario <marca> <nome> <foto>');
        process.exit(1);
      }
      result = await gerarAniversario({ marca, nome, fotoPath });
    } else {
      console.error('Tipo inválido. Use: colaborador | aniversario');
      process.exit(1);
    }
    console.log('✅ Arte gerada:', result);
  })().catch(err => { console.error('❌ Erro:', err.message); process.exit(1); });
}

module.exports = { gerarColaborador, gerarAniversario };
