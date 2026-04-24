#!/usr/bin/env node
/**
 * buscar-imagem.js
 * Busca imagens em bancos gratuitos + remove fundo automaticamente
 * BR Pneus & Oficina
 *
 * Uso:
 *   node tools/buscar-imagem.js buscar "car tire"
 *   node tools/buscar-imagem.js processar "brake disc" disco-freio
 *   node tools/buscar-imagem.js remover-fundo foto.jpg saida
 */

'use strict';

require('dotenv').config({ path: require('path').resolve('.env') });
const fs   = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// FONTES DE BUSCA
// ═══════════════════════════════════════════════════════════════════════════

// 1. Openverse — gratuito, sem API key (imagens Creative Commons)
// Docs: https://api.openverse.org/v1/
async function buscarOpenverse(query, quantidade = 5) {
  try {
    const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=${quantidade}&license_type=all`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.results || []).map(img => ({
      fonte: 'Openverse',
      url:   img.url,
      urlHD: img.url,
      thumb: img.thumbnail,
      autor: img.creator || '—',
      descricao: img.title || query,
    }));
  } catch (err) {
    console.log(`   ⚠️  Openverse: ${err.message}`);
    return [];
  }
}

// 1b. Unsplash oficial — gratuito com Access Key (https://unsplash.com/developers)
async function buscarUnsplash(query, quantidade = 5) {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return [];
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${quantidade}&client_id=${accessKey}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.results || []).map(img => ({
      fonte: 'Unsplash',
      url:   img.urls.regular,
      urlHD: img.urls.full,
      thumb: img.urls.thumb,
      autor: img.user?.name || '—',
      descricao: img.alt_description || query,
    }));
  } catch (err) {
    console.log(`   ⚠️  Unsplash: ${err.message}`);
    return [];
  }
}

// 2. Pexels — gratuito com API key (https://www.pexels.com/api/)
async function buscarPexels(query, quantidade = 3) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return [];
  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${quantidade}&orientation=square`;
    const res = await fetch(url, { headers: { 'Authorization': apiKey } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.photos || []).map(img => ({
      fonte: 'Pexels',
      url:   img.src.large,
      urlHD: img.src.original,
      thumb: img.src.tiny,
      autor: img.photographer,
      descricao: img.alt || query,
    }));
  } catch (err) {
    console.log(`   ⚠️  Pexels: ${err.message}`);
    return [];
  }
}

// 3. Pixabay — gratuito com API key (https://pixabay.com/api/docs/)
async function buscarPixabay(query, quantidade = 3) {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) return [];
  try {
    const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&per_page=${quantidade}&image_type=photo`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.hits || []).map(img => ({
      fonte: 'Pixabay',
      url:   img.webformatURL,
      urlHD: img.largeImageURL,
      thumb: img.previewURL,
      autor: img.user,
      descricao: img.tags,
    }));
  } catch (err) {
    console.log(`   ⚠️  Pixabay: ${err.message}`);
    return [];
  }
}

// ─── Busca unificada em paralelo ─────────────────────────────────────────────
async function buscarImagens(query, quantidade = 5) {
  console.log(`\n🔍 Buscando: "${query}"...\n`);
  const [openverse, unsplash, pexels, pixabay] = await Promise.all([
    buscarOpenverse(query, quantidade),
    buscarUnsplash(query, quantidade),
    buscarPexels(query, Math.ceil(quantidade / 2)),
    buscarPixabay(query, Math.ceil(quantidade / 2)),
  ]);

  const todas = [...openverse, ...unsplash, ...pexels, ...pixabay].slice(0, quantidade + 4);

  if (todas.length === 0) {
    console.log('❌ Nenhuma imagem encontrada. Dica: use termos em inglês.');
    return [];
  }

  console.log(`✅ ${todas.length} imagem(ns) encontrada(s):\n`);
  todas.forEach((img, i) => {
    console.log(`  [${i + 1}] ${img.fonte} — ${img.descricao}`);
    console.log(`      👤 ${img.autor}`);
    console.log(`      🔗 ${img.url.substring(0, 90)}\n`);
  });
  return todas;
}

// ═══════════════════════════════════════════════════════════════════════════
// DOWNLOAD
// ═══════════════════════════════════════════════════════════════════════════
async function downloadImagem(url, nomeArquivo) {
  console.log(`\n📥 Baixando imagem...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download falhou: ${res.status}`);

  const buffer  = Buffer.from(await res.arrayBuffer());
  const dir     = path.resolve('assets/imagens/downloads');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const savePath = path.join(dir, nomeArquivo);
  fs.writeFileSync(savePath, buffer);

  const sharp    = require('sharp');
  const meta     = await sharp(buffer).metadata();
  console.log(`   💾 Salvo: ${savePath} (${meta.width}×${meta.height})`);
  return { path: savePath, buffer, meta };
}

// ═══════════════════════════════════════════════════════════════════════════
// REMOÇÃO DE FUNDO
// ═══════════════════════════════════════════════════════════════════════════

// Método A: Remove.bg API (qualidade profissional, 50 chamadas/mês grátis)
async function removerFundoAPI(inputBuffer) {
  const apiKey = process.env.REMOVEBG_API_KEY;
  if (!apiKey) return null;

  console.log('   🌐 Tentando Remove.bg API...');
  try {
    const form = new FormData();
    const blob = new Blob([inputBuffer], { type: 'image/jpeg' });
    form.append('image_file', blob, 'image.jpg');
    form.append('size', 'auto');

    const res = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: form,
    });
    if (!res.ok) throw new Error(`Remove.bg: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    console.log('   ✅ Fundo removido via Remove.bg (qualidade profissional)');
    return buf;
  } catch (err) {
    console.log(`   ⚠️  Remove.bg: ${err.message}`);
    return null;
  }
}

// Método B: Remoção por detecção de bordas (analisa os 4 cantos como cor de fundo)
async function removerFundoBordas(inputBuffer, tolerancia = 40) {
  console.log(`   🎨 Removendo fundo por bordas (tolerância: ${tolerancia})...`);
  const sharp = require('sharp');

  const image = sharp(inputBuffer).ensureAlpha();
  const { width, height } = await sharp(inputBuffer).metadata();
  const raw = await image.raw().toBuffer();
  const ch  = 4; // RGBA após ensureAlpha

  // Cor de fundo = média dos 4 cantos
  const corners = [0, (width - 1), (height - 1) * width, (height - 1) * width + (width - 1)];
  const corFundo = corners.reduce(
    (acc, idx) => {
      const p = idx * ch;
      return { r: acc.r + raw[p] / 4, g: acc.g + raw[p + 1] / 4, b: acc.b + raw[p + 2] / 4 };
    },
    { r: 0, g: 0, b: 0 }
  );

  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const s = i * ch, d = i * 4;
    const r = raw[s], g = raw[s + 1], b = raw[s + 2];
    rgba[d] = r; rgba[d + 1] = g; rgba[d + 2] = b;
    const diff = Math.abs(r - corFundo.r) + Math.abs(g - corFundo.g) + Math.abs(b - corFundo.b);
    rgba[d + 3] = diff < tolerancia ? 0 : 255;
  }

  return sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

// Método C: Remoção de branco (pixels claros → transparente)
async function removerFundoBranco(inputBuffer, threshold = 230) {
  console.log(`   🎨 Removendo fundo branco (threshold: ${threshold})...`);
  const sharp = require('sharp');

  const { width, height, channels } = await sharp(inputBuffer).metadata();
  const raw  = await sharp(inputBuffer).raw().toBuffer();
  const ch   = channels || 3;
  const rgba = Buffer.alloc(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    const s = i * ch, d = i * 4;
    const r = raw[s], g = raw[s + 1], b = raw[s + 2];
    rgba[d] = r; rgba[d + 1] = g; rgba[d + 2] = b;
    rgba[d + 3] = (r > threshold && g > threshold && b > threshold) ? 0 : 255;
  }

  return sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

// Seletor automático de método
async function removerFundo(inputBuffer, metodo = 'auto') {
  if (metodo === 'api' || metodo === 'auto') {
    const r = await removerFundoAPI(inputBuffer);
    if (r) return r;
  }
  if (metodo === 'bordas' || metodo === 'auto') {
    return await removerFundoBordas(inputBuffer);
  }
  return await removerFundoBranco(inputBuffer);
}

// ═══════════════════════════════════════════════════════════════════════════
// FLUXO COMPLETO: BUSCAR + BAIXAR + REMOVER FUNDO → base64 HTML pronto
// ═══════════════════════════════════════════════════════════════════════════
async function buscarEProcessar(query, nomeArquivo, options = {}) {
  const {
    removerBg     = true,
    metodoRemocao = 'auto',
    indice        = 0,
  } = options;

  // 1. Buscar
  const imagens = await buscarImagens(query, 5);
  if (imagens.length === 0) return null;

  const selecionada = imagens[Math.min(indice, imagens.length - 1)];
  console.log(`\n📌 Usando [${indice + 1}] ${selecionada.fonte} — ${selecionada.descricao}`);
  console.log(`   👤 Autor: ${selecionada.autor}\n`);

  // 2. Baixar
  const download = await downloadImagem(selecionada.url, `${nomeArquivo}-original.jpg`);

  let finalBuffer = download.buffer;
  let finalPath   = download.path;

  // 3. Remover fundo
  if (removerBg) {
    try {
      const semFundo = await removerFundo(download.buffer, metodoRemocao);
      finalPath   = path.join(path.dirname(download.path), `${nomeArquivo}.png`);
      fs.writeFileSync(finalPath, semFundo);
      finalBuffer = semFundo;
      console.log(`   ✅ PNG transparente: ${finalPath}`);
    } catch (err) {
      console.log(`   ⚠️  Remoção de fundo falhou: ${err.message}. Usando original.`);
    }
  }

  // 4. Converter para HTML base64 (pronto para usar nos templates)
  const b64       = finalBuffer.toString('base64');
  const mime      = finalPath.endsWith('.png') ? 'image/png' : 'image/jpeg';
  const htmlTag   = `<img src="data:${mime};base64,${b64}" alt="${nomeArquivo}" style="max-width:100%;max-height:100%;object-fit:contain;filter:drop-shadow(0 15px 30px rgba(0,0,0,0.4));">`;

  console.log(`\n📊 Resultado:`);
  console.log(`   Arquivo: ${path.relative(process.cwd(), finalPath)}`);
  console.log(`   Tamanho: ${(b64.length / 1024).toFixed(0)}KB em base64`);
  console.log(`   Pronto para usar com: "imagem":"local:downloads/${nomeArquivo}.png"\n`);

  return {
    path:     finalPath,
    htmlTag,
    base64:   `data:${mime};base64,${b64}`,
    fonte:    selecionada.fonte,
    autor:    selecionada.autor,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════════════
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help') {
    console.log(`
🔍 Buscador de Imagens + Remoção de Fundo — BR Pneus & Oficina
──────────────────────────────────────────────────────────────

Comandos:

  BUSCAR (só listar resultados):
    node tools/buscar-imagem.js buscar "car tire close up"
    node tools/buscar-imagem.js buscar "brake disc and pads"
    node tools/buscar-imagem.js buscar "motor oil bottle"

  BUSCAR + BAIXAR + REMOVER FUNDO:
    node tools/buscar-imagem.js processar "car tire"        pneu-generico
    node tools/buscar-imagem.js processar "brake disc"      disco-freio
    node tools/buscar-imagem.js processar "motor oil"       oleo-motor
    node tools/buscar-imagem.js processar "air filter car"  filtro-ar

  SÓ REMOVER FUNDO (foto que você já tem):
    node tools/buscar-imagem.js remover-fundo assets/imagens/produtos/meu-pneu.jpg pneu-limpo

Opções:
  --sem-remocao          Não remove o fundo (só baixa)
  --metodo=bordas        Remove fundo pela cor das bordas (padrão)
  --metodo=branco        Remove pixels brancos/claros
  --metodo=api           Remove via Remove.bg (melhor qualidade, requer API key)
  --indice=2             Usar a 3ª imagem dos resultados (começa em 0)

Termos de busca em inglês funcionam melhor:
  ✅ "car tire"                 → pneu
  ✅ "brake disc and pads"      → disco e pastilha de freio
  ✅ "motor oil bottle"         → garrafa de óleo
  ✅ "air conditioning filter"  → filtro do ar-condicionado
  ✅ "wheel alignment machine"  → equipamento de alinhamento
  ✅ "car suspension shock"     → amortecedor
  ✅ "clutch disc"              → disco de embreagem

APIs opcionais (melhoram os resultados — todas gratuitas):
  PEXELS_API_KEY     → https://www.pexels.com/api/
  PIXABAY_API_KEY    → https://pixabay.com/api/docs/
  REMOVEBG_API_KEY   → https://www.remove.bg/api (50/mês grátis)

O sistema funciona SEM nenhuma API key (usa Unsplash gratuito).
`);
    return;
  }

  const cmd = args[0];

  // ── buscar ────────────────────────────────────────────────────────────────
  if (cmd === 'buscar') {
    if (!args[1]) { console.error('❌ Informe o termo de busca.'); process.exit(1); }
    await buscarImagens(args[1], parseInt(args[2]) || 5);
    return;
  }

  // ── processar ─────────────────────────────────────────────────────────────
  if (cmd === 'processar') {
    if (!args[1] || !args[2]) {
      console.error('❌ Uso: processar "termo de busca" nome-do-arquivo');
      process.exit(1);
    }
    const options = {
      removerBg:     !args.includes('--sem-remocao'),
      metodoRemocao: (args.find(a => a.startsWith('--metodo=')) || '').replace('--metodo=', '') || 'auto',
      indice:        parseInt((args.find(a => a.startsWith('--indice=')) || '0').replace('--indice=', '')) || 0,
    };
    const result = await buscarEProcessar(args[1], args[2], options);
    if (!result) process.exit(1);
    return;
  }

  // ── remover-fundo ─────────────────────────────────────────────────────────
  if (cmd === 'remover-fundo') {
    if (!args[1]) { console.error('❌ Informe o caminho da imagem.'); process.exit(1); }
    const inputPath  = path.resolve(args[1]);
    const outputName = args[2] || path.basename(args[1], path.extname(args[1])) + '-sem-fundo';

    if (!fs.existsSync(inputPath)) {
      console.error(`❌ Arquivo não encontrado: ${inputPath}`);
      process.exit(1);
    }

    const buffer     = fs.readFileSync(inputPath);
    const metodo     = (args.find(a => a.startsWith('--metodo=')) || '').replace('--metodo=', '') || 'auto';
    const resultado  = await removerFundo(buffer, metodo);

    const outputDir  = path.resolve('assets/imagens/downloads');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `${outputName}.png`);
    fs.writeFileSync(outputPath, resultado);
    console.log(`\n✅ Fundo removido: ${outputPath}`);
    console.log(`   Use nos criativos: "imagem":"local:downloads/${outputName}.png"\n`);
    return;
  }

  console.error(`❌ Comando não reconhecido: ${cmd}`);
  console.log('   Execute sem argumentos para ver a ajuda.');
  process.exit(1);
}

// Exportar para uso em outros scripts
module.exports = { buscarImagens, downloadImagem, removerFundo, buscarEProcessar };

// Só executa o CLI quando chamado diretamente (não quando importado)
if (require.main === module) {
  main().catch(err => {
    console.error(`\n❌ Erro: ${err.message}`);
    process.exit(1);
  });
}
