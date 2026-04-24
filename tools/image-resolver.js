#!/usr/bin/env node
/**
 * image-resolver.js
 * Sistema unificado de resolução de imagens para criativos HTML — BR Pneus
 *
 * Fontes suportadas:
 *   local:produtos/pneu.png         → arquivo em assets/imagens/
 *   svg:pneu                        → SVG da biblioteca assets/svgs.js
 *   emoji:🛞,120                    → emoji com tamanho em px
 *   gemini:premium car tire         → geração via Gemini AI
 *   https://url.com/img.png         → URL externa (inline no HTML)
 *   (sem prefixo)                   → tenta SVG → tenta Gemini
 */

'use strict';

require('dotenv').config({ path: require('path').resolve('.env') });
const fs   = require('fs');
const path = require('path');

class ImageResolver {

  constructor() {
    this.assetsDir = path.resolve('assets/imagens');
    this.svgsPath  = path.resolve('assets/svgs.js');
    this._svgs     = null; // carregado sob demanda
  }

  get svgs() {
    if (!this._svgs) {
      try { this._svgs = require(this.svgsPath); }
      catch (e) { this._svgs = {}; }
    }
    return this._svgs;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FONTE 1 — Imagem local (pasta assets/imagens/)
  // ══════════════════════════════════════════════════════════════════════════
  fromLocal(relativePath) {
    const fullPath = path.join(this.assetsDir, relativePath);

    if (!fs.existsSync(fullPath)) {
      console.warn(`   ⚠️  Imagem local não encontrada: assets/imagens/${relativePath}`);
      console.warn(`       Coloque o arquivo em: ${fullPath}`);
      return null;
    }

    const ext      = path.extname(fullPath).slice(1).toLowerCase();
    const mime     = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
                       svg: 'image/svg+xml', webp: 'image/webp' }[ext] || 'image/png';
    const base64   = fs.readFileSync(fullPath).toString('base64');
    const dataUri  = `data:${mime};base64,${base64}`;

    console.log(`   📁 Imagem local: assets/imagens/${relativePath}`);
    return `<img src="${dataUri}" alt="produto" style="max-width:100%;max-height:100%;object-fit:contain;filter:drop-shadow(0 15px 30px rgba(0,0,0,0.4));">`;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FONTE 2 — URL externa
  // ══════════════════════════════════════════════════════════════════════════
  fromURL(url) {
    console.log(`   🌐 Imagem URL: ${url.substring(0, 70)}...`);
    return `<img src="${url}" alt="produto" style="max-width:100%;max-height:100%;object-fit:contain;filter:drop-shadow(0 15px 30px rgba(0,0,0,0.4));" crossorigin="anonymous">`;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FONTE 3 — SVG inline da biblioteca
  // ══════════════════════════════════════════════════════════════════════════
  fromSVG(nome, tamanho = 180) {
    const svg = this.svgs[nome.trim()];
    if (!svg) {
      console.warn(`   ⚠️  SVG não encontrado: "${nome}"`);
      console.warn(`       Disponíveis: ${Object.keys(this.svgs).join(', ')}`);
      return null;
    }

    console.log(`   🎨 SVG: ${nome} (${tamanho}px)`);
    // Injeta width/height e estilo de sombra
    return svg
      .replace('<svg', `<svg width="${tamanho}" height="${tamanho}" style="filter:drop-shadow(0 10px 24px rgba(0,0,0,0.5));"`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FONTE 4 — Emoji/Unicode
  // ══════════════════════════════════════════════════════════════════════════
  fromEmoji(emoji, tamanho = 120) {
    console.log(`   😀 Emoji: ${emoji} (${tamanho}px)`);
    return `<span style="font-size:${tamanho}px;line-height:1;display:block;filter:drop-shadow(0 8px 16px rgba(0,0,0,0.4));">${emoji.trim()}</span>`;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FONTE 5 — Gemini AI
  // ══════════════════════════════════════════════════════════════════════════
  async fromGemini(prompt, nome = 'gemini-img') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'COLE_SUA_CHAVE_AQUI') {
      console.warn('   ⚠️  GEMINI_API_KEY não configurada.');
      return null;
    }

    const fullPrompt = `${prompt}, isolated on pure white background, product photography, studio lighting, clean cutout, centered, high quality 8k. No text, no logos, no watermarks.`;
    console.log(`   🤖 Gemini AI: ${prompt.substring(0, 60)}...`);

    let imageBuffer = null;

    // Tentativa 1: Imagen 4.0 (plano pago)
    const imagenUrls = [
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${apiKey}`,
    ];
    for (const url of imagenUrls) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt: fullPrompt }],
            parameters: { sampleCount: 1, aspectRatio: '1:1' },
          }),
        });
        if (!res.ok) { const e = await res.json().catch(() => ({})); console.log(`      ↳ Imagen: ${(e.error?.message || res.statusText).substring(0, 60)}`); continue; }
        const data = await res.json();
        const b64 = data.predictions?.[0]?.bytesBase64Encoded;
        if (b64) { imageBuffer = Buffer.from(b64, 'base64'); break; }
      } catch (e) { console.log(`      ↳ Erro: ${e.message}`); }
    }

    // Tentativa 2: gemini-flash-image (gratuito)
    if (!imageBuffer) {
      const flashModelos = ['gemini-3.1-flash-image-preview', 'gemini-2.5-flash-image'];
      for (const modelo of flashModelos) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: fullPrompt }] }],
              generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
            }),
          });
          if (!res.ok) { const e = await res.json().catch(() => ({})); console.log(`      ↳ ${modelo}: ${(e.error?.message || res.statusText).substring(0, 60)}`); continue; }
          const data = await res.json();
          const parts = data.candidates?.[0]?.content?.parts || [];
          for (const p of parts) {
            if (p.inlineData?.data) { imageBuffer = Buffer.from(p.inlineData.data, 'base64'); console.log(`      ✅ Gerada via ${modelo}`); break; }
          }
          if (imageBuffer) break;
        } catch (e) { console.log(`      ↳ Erro ${modelo}: ${e.message}`); }
      }
    }

    if (!imageBuffer) {
      console.log('   ❌ Gemini: nenhuma imagem gerada.');
      return null;
    }

    // Remover fundo branco → transparente via sharp
    try {
      const sharp    = require('sharp');
      const meta     = await sharp(imageBuffer).metadata();
      const { width, height } = meta;
      const channels = meta.channels || 3;
      const raw      = await sharp(imageBuffer).raw().toBuffer();
      const rgba     = Buffer.alloc(width * height * 4);

      for (let i = 0; i < width * height; i++) {
        const s = i * channels, d = i * 4;
        const r = raw[s], g = raw[s + 1], b = raw[s + 2];
        rgba[d] = r; rgba[d+1] = g; rgba[d+2] = b;
        rgba[d+3] = (r > 235 && g > 235 && b > 235) ? 0 : 255;
      }

      const png = await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer();

      // Salvar na pasta gemini
      const geminiDir = path.join(this.assetsDir, 'gemini');
      if (!fs.existsSync(geminiDir)) fs.mkdirSync(geminiDir, { recursive: true });
      fs.writeFileSync(path.join(geminiDir, `${nome}.png`), png);
      console.log(`   💾 Salvo em: assets/imagens/gemini/${nome}.png`);

      const b64 = png.toString('base64');
      return `<img src="data:image/png;base64,${b64}" alt="${nome}" style="max-width:100%;max-height:100%;object-fit:contain;filter:drop-shadow(0 15px 30px rgba(0,0,0,0.4));">`;

    } catch (sharpErr) {
      console.log(`   ⚠️  sharp não disponível — fundo não removido.`);
      const b64 = imageBuffer.toString('base64');
      return `<img src="data:image/png;base64,${b64}" alt="${nome}" style="max-width:100%;max-height:100%;object-fit:contain;filter:drop-shadow(0 15px 30px rgba(0,0,0,0.4));">`;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PLACEHOLDER SVG (quando nenhuma imagem disponível)
  // ══════════════════════════════════════════════════════════════════════════
  placeholder(texto = 'SUA IMAGEM AQUI', w = 420, h = 420) {
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#1e2a1e" rx="16"/>
      <rect x="12" y="12" width="${w-24}" height="${h-24}" fill="none" stroke="#F5A623"
            stroke-width="2.5" stroke-dasharray="12,6" rx="12"/>
      <text x="50%" y="44%" fill="#F5A623" font-size="18" font-family="Arial Black,Arial" font-weight="900"
            text-anchor="middle" dominant-baseline="middle" text-transform="uppercase">${texto}</text>
      <text x="50%" y="54%" fill="rgba(245,166,35,0.5)" font-size="13" font-family="Arial,sans-serif"
            text-anchor="middle" dominant-baseline="middle">coloque em assets/imagens/</text>
    </svg>`;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FONTE 6 — Buscar na internet (Unsplash/Pexels/Pixabay) + remover fundo
  // ══════════════════════════════════════════════════════════════════════════
  async fromWeb(query, nome, removerBg = true) {
    try {
      const { buscarEProcessar } = require('./buscar-imagem');
      console.log(`   🌐 Buscando na internet: "${query}"${removerBg ? ' + removendo fundo' : ''}...`);
      const result = await buscarEProcessar(query, nome, { removerBg, metodoRemocao: 'auto' });
      if (result) return result.htmlTag;
    } catch (err) {
      console.log(`   ⚠️  fromWeb: ${err.message}`);
    }
    return null;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RESOLVER AUTOMÁTICO — detecta a fonte pelo prefixo/formato
  // ══════════════════════════════════════════════════════════════════════════
  async resolve(input, nomeGemini = 'gemini-img') {
    if (!input) return null;

    const inp = input.trim();

    // local:caminho/arquivo.png
    if (inp.startsWith('local:'))
      return this.fromLocal(inp.slice(6));

    // svg:nome[,tamanho]
    if (inp.startsWith('svg:')) {
      const [nome, tam] = inp.slice(4).split(',');
      return this.fromSVG(nome, parseInt(tam) || 180);
    }

    // emoji:🛞[,tamanho]
    if (inp.startsWith('emoji:')) {
      const [emoji, tam] = inp.slice(6).split(',');
      return this.fromEmoji(emoji, parseInt(tam) || 120);
    }

    // gemini:prompt de imagem
    if (inp.startsWith('gemini:'))
      return await this.fromGemini(inp.slice(7), nomeGemini);

    // web:termo → busca na internet + remove fundo automaticamente
    if (inp.startsWith('web:'))
      return await this.fromWeb(inp.slice(4), nomeGemini, true);

    // web-raw:termo → busca na internet SEM remover fundo
    if (inp.startsWith('web-raw:'))
      return await this.fromWeb(inp.slice(8), nomeGemini, false);

    // http/https → URL externa
    if (inp.startsWith('http'))
      return this.fromURL(inp);

    // É um nome de arquivo com extensão? → tenta local
    if (/\.(png|jpg|jpeg|svg|webp)$/i.test(inp))
      return this.fromLocal(inp);

    // É uma palavra simples que existe no catálogo SVG? → usa SVG
    if (this.svgs[inp])
      return this.fromSVG(inp);

    // Fallback 1: tenta buscar na internet
    console.log(`   🔍 Fonte não identificada — buscando na internet: "${inp}"`);
    const webResult = await this.fromWeb(inp, nomeGemini, true);
    if (webResult) return webResult;

    // Fallback 2: Gemini AI
    console.log(`   🤖 Tentando Gemini: "${inp}"`);
    return await this.fromGemini(inp, nomeGemini);
  }

  // ── Utilitários ────────────────────────────────────────────────────────────
  listLocal() {
    const pastas = ['produtos','fachadas','equipe','servicos','logos-marcas','backgrounds','icones','gemini'];
    const res = {};
    for (const p of pastas) {
      const dir = path.join(this.assetsDir, p);
      res[p] = fs.existsSync(dir)
        ? fs.readdirSync(dir).filter(f => /\.(png|jpg|jpeg|svg|webp)$/i.test(f))
        : [];
    }
    return res;
  }

  listSVGs() { return Object.keys(this.svgs); }
}

module.exports = ImageResolver;

// ── CLI ────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const resolver = new ImageResolver();
  const cmd = process.argv[2];

  if (cmd === '--list') {
    console.log('\n📁 Imagens locais disponíveis:');
    const local = resolver.listLocal();
    for (const [pasta, arquivos] of Object.entries(local)) {
      console.log(`\n  ${pasta}/`);
      if (arquivos.length === 0) console.log('    (vazio — adicione imagens aqui)');
      else arquivos.forEach(f => console.log(`    ✓ ${f}`));
    }

    console.log('\n🎨 SVGs disponíveis (use com svg:nome):');
    console.log(`  ${resolver.listSVGs().join('  •  ')}`);

    console.log('\n😀 Emojis sugeridos (use com emoji:🛞,120):');
    console.log('  🛞 🚗 🏎️ 🛻 🚛 🏍️ 🔧 🔩 ⚙️ 🛡️ ✅ ⚠️ 📍 📱 💰 🏷️ 🔑 🪝');

  } else {
    console.log(`
🖼️  Image Resolver — BR Pneus & Oficina
───────────────────────────────────────

Fontes disponíveis (campo "imagem" no JSON):

  local:produtos/pneu-aro14.png      → foto da pasta assets/imagens/
  svg:pneu                           → SVG inline da biblioteca
  svg:pneu,200                       → SVG com tamanho 200px
  emoji:🛞,120                       → emoji com tamanho 120px
  gemini:car tire product photo      → geração via Gemini AI
  https://url.com/imagem.jpg         → URL externa

SVGs disponíveis: ${resolver.listSVGs().join(', ')}

Comandos:
  node tools/image-resolver.js --list    lista tudo disponível
  node tools/image-resolver.js --help    este menu
`);
  }
}
