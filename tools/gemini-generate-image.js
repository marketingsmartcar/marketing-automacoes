#!/usr/bin/env node
/**
 * gemini-generate-image.js
 * Gera imagens via Gemini Imagen para usar em criativos BR Pneus
 *
 * Uso:
 *   node tools/gemini-generate-image.js "prompt" nome-arquivo tipo
 *
 * Exemplo:
 *   node tools/gemini-generate-image.js "premium black car tire on dark background, orange rim light, studio photography" teste-pneu-brpneus pneu
 *
 * Tipos disponíveis: pneu | carro | oficina | servico | promocao | institucional
 *
 * Saída: output/criativos/imagens/[nome-arquivo]-[YYYY-MM-DD].png
 */

const fs   = require('fs');
const path = require('path');

// ── Carregar .env ──────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.resolve('.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ Arquivo .env não encontrado. Configure a GEMINI_API_KEY primeiro.');
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
  }
}

// ── Prompts base por tipo (identidade BR Pneus) ────────────────────────────
const PROMPTS_BASE = {
  pneu:         'studio product photography, dark concrete background, dramatic orange accent lighting, professional automotive photography, 8k sharp detail, no text, no logos',
  carro:        'modern car on dark background, atmospheric orange underglow lighting, cinematic automotive photography, high quality, no text, no logos',
  oficina:      'modern automotive workshop, clean organized workspace, yellow accent lighting, professional environment, no text, no logos',
  servico:      'automotive service being performed, professional mechanic, modern workshop, orange and black color scheme, no text, no logos',
  promocao:     'dark background with golden orange light rays, luxury automotive feel, dramatic lighting, abstract geometric shapes, no text, no logos',
  institucional:'professional automotive brand background, dark textured surface, orange gradient light, premium feel, no text, no logos',
};

// ── Gerar data atual ───────────────────────────────────────────────────────
function hoje() {
  return new Date().toISOString().split('T')[0];
}

// ── Geração via Gemini Imagen ──────────────────────────────────────────────
async function gerarViaImagen(apiKey, promptCompleto, outputPath) {
  // Tenta Imagen 4.0 (requer plano pago)
  // Fallback automático para gemini-2.5-flash-image (gera imagem via generateContent)
  const modelos = [
    { url: `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`, tipo: 'imagen' },
    { url: `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${apiKey}`, tipo: 'imagen' },
  ];

  for (const modelo of modelos) {
    const body = {
      instances: [{ prompt: promptCompleto }],
      parameters: { sampleCount: 1, aspectRatio: '1:1', safetySetting: 'block_low_and_above' },
    };

    const res = await fetch(modelo.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      const msg = err.error?.message || res.statusText;
      if (msg.includes('paid') || msg.includes('quota') || msg.includes('not found')) {
        continue; // tenta próximo modelo
      }
      throw new Error(`Imagen API: ${msg}`);
    }

    const data = await res.json();
    const b64  = data.predictions?.[0]?.bytesBase64Encoded;
    if (!b64) throw new Error('Nenhuma imagem retornada pela API.');
    fs.writeFileSync(outputPath, Buffer.from(b64, 'base64'));
    return;
  }

  throw new Error('Imagen requer plano pago (Gemini API Paid). Usando geração de prompt como alternativa.');
}

// ── Fallback: Gemini Flash gera prompt Midjourney otimizado ───────────────
async function gerarPromptMidjourney(apiKey, promptUsuario, tipo) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const system = `Você é especialista em prompts para geração de imagens com IA (Midjourney, DALL-E, Ideogram).
A BR Pneus & Oficina tem identidade visual: fundo preto/escuro, destaque em amarelo/laranja (#F5A623), estilo industrial e bold.
Gere um prompt em inglês, otimizado para Midjourney, para uso como background/elemento visual em posts de marketing.
Nunca incluir texto ou logos na imagem. Máximo de 200 palavras. Responda APENAS com o prompt, sem explicações.`;

  const body = {
    contents: [{
      parts: [{ text: `Tipo: ${tipo}\nDescrição: ${promptUsuario}` }]
    }],
    systemInstruction: { parts: [{ text: system }] },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Gemini Flash: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  loadEnv();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'COLE_SUA_CHAVE_AQUI') {
    console.error('❌ Configure a GEMINI_API_KEY no arquivo .env primeiro.');
    console.error('   node tools/test-gemini.js  para verificar a configuração.');
    process.exit(1);
  }

  const [,, promptUsuario, nomeArquivo, tipo = 'pneu'] = process.argv;

  if (!promptUsuario || !nomeArquivo) {
    console.log(`
Uso: node tools/gemini-generate-image.js "prompt" nome-arquivo tipo

Tipos: pneu | carro | oficina | servico | promocao | institucional

Exemplo:
  node tools/gemini-generate-image.js \\
    "premium black car tire on dark background, orange rim light" \\
    teste-pneu-brpneus \\
    pneu
`);
    process.exit(0);
  }

  const basePrompt  = PROMPTS_BASE[tipo] || PROMPTS_BASE.pneu;
  const promptFinal = `${promptUsuario}, ${basePrompt}`;
  const outDir      = path.resolve('output/criativos/imagens');
  const outPath     = path.join(outDir, `${nomeArquivo}-${hoje()}.png`);

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log(`\n🎨 Gerando imagem...`);
  console.log(`   Tipo: ${tipo}`);
  console.log(`   Prompt: ${promptFinal.slice(0, 80)}...\n`);

  try {
    // Tenta Imagen primeiro
    await gerarViaImagen(apiKey, promptFinal, outPath);
    console.log(`✅ Imagem salva: ${path.relative(process.cwd(), outPath)}`);
    console.log(`📐 Use em criativos HTML como: <img src="../../${path.relative(process.cwd(), outPath)}">`);

  } catch (imagenErr) {
    console.log(`⚠️  Imagen não disponível: ${imagenErr.message}`);
    console.log(`\n🔄 Gerando prompt otimizado para Midjourney/DALL-E como alternativa...\n`);

    try {
      const promptMj = await gerarPromptMidjourney(apiKey, promptUsuario, tipo);

      // Salvar prompt como .txt
      const promptPath = outPath.replace('.png', '-prompt.txt');
      fs.writeFileSync(promptPath, `PROMPT MIDJOURNEY/DALL-E\nGerado: ${hoje()}\nTipo: ${tipo}\n\n${promptMj}`);

      console.log(`✅ Prompt gerado e salvo: ${path.relative(process.cwd(), promptPath)}`);
      console.log(`\n📋 PROMPT PARA USAR NO MIDJOURNEY OU DALL-E:\n`);
      console.log(`─────────────────────────────────────────────`);
      console.log(promptMj);
      console.log(`─────────────────────────────────────────────\n`);
      console.log(`👉 Cole este prompt no Midjourney (midjourney.com) ou DALL-E (chatgpt.com)`);
      console.log(`   Salve a imagem em: output/criativos/imagens/${nomeArquivo}-${hoje()}.png`);

    } catch (flashErr) {
      console.error('❌ Erro ao gerar prompt:', flashErr.message);
      process.exit(1);
    }
  }
}

main();

// ── Gerar imagem com fundo transparente (para composição em HTML) ──────────
async function generateTransparentImage(prompt, outputName) {
  loadEnv();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'COLE_SUA_CHAVE_AQUI') {
    console.error('❌ Configure a GEMINI_API_KEY no arquivo .env primeiro.');
    process.exit(1);
  }

  const fullPrompt = `${prompt}, isolated on pure white background, product photography, studio lighting, clean cutout style, centered in frame, high quality, 8k resolution. The background must be completely clean and white for easy removal. No shadows on background, no text, no logos, no watermarks.`;

  console.log(`🎨 Gerando imagem para recorte...`);
  console.log(`📝 Prompt: ${fullPrompt.substring(0, 100)}...`);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
  const modelos = [
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${apiKey}`,
  ];

  let imageBuffer = null;

  for (const modelUrl of modelos) {
    const body = {
      instances: [{ prompt: fullPrompt }],
      parameters: { sampleCount: 1, aspectRatio: '1:1', safetySetting: 'block_low_and_above' },
    };

    try {
      const res = await fetch(modelUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        const msg = err.error?.message || res.statusText;
        console.log(`⚠️  Modelo não disponível: ${msg}`);
        continue;
      }

      const data = await res.json();
      const b64 = data.predictions?.[0]?.bytesBase64Encoded;
      if (b64) {
        imageBuffer = Buffer.from(b64, 'base64');
        break;
      }
    } catch (err) {
      console.log(`⚠️  Erro: ${err.message}`);
      continue;
    }
  }

  if (!imageBuffer) {
    console.error('❌ Nenhuma imagem retornada. Verifique a API key e plano.');
    return null;
  }

  const outputDir = path.resolve('output/criativos/imagens');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // Salvar original
  const originalPath = path.join(outputDir, `${outputName}-original.png`);
  fs.writeFileSync(originalPath, imageBuffer);

  // Tentar remover fundo com sharp
  try {
    const sharp = require('sharp');
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const { width, height } = metadata;
    const channels = metadata.channels || 3;

    const rawBuffer = await image.raw().toBuffer();
    const rgbaBuffer = Buffer.alloc(width * height * 4);

    for (let i = 0; i < width * height; i++) {
      const s = i * channels;
      const d = i * 4;
      const r = rawBuffer[s];
      const g = rawBuffer[s + 1];
      const b = rawBuffer[s + 2];
      rgbaBuffer[d]     = r;
      rgbaBuffer[d + 1] = g;
      rgbaBuffer[d + 2] = b;
      // Tornar transparente se pixel é quase branco (threshold 235+)
      rgbaBuffer[d + 3] = (r > 235 && g > 235 && b > 235) ? 0 : 255;
    }

    const pngPath = path.join(outputDir, `${outputName}.png`);
    await sharp(rgbaBuffer, { raw: { width, height, channels: 4 } }).png().toFile(pngPath);

    const base64 = fs.readFileSync(pngPath).toString('base64');
    const base64Path = path.join(outputDir, `${outputName}.base64.txt`);
    fs.writeFileSync(base64Path, `data:image/png;base64,${base64}`);

    console.log(`✅ Imagem com fundo transparente: ${pngPath}`);
    console.log(`📋 Base64 salvo: ${base64Path}`);

    return { path: pngPath, base64: `data:image/png;base64,${base64}` };

  } catch (sharpError) {
    console.log(`⚠️  Sharp não disponível (${sharpError.message}). Usando imagem original.`);
    console.log(`   Instale com: npm install sharp`);

    const base64 = imageBuffer.toString('base64');
    return { path: originalPath, base64: `data:image/png;base64,${base64}` };
  }
}

// Exportar para uso em outros módulos
module.exports = { generateTransparentImage };

// Modo CLI --transparent
if (process.argv[2] === '--transparent') {
  const [,, , promptArg, nameArg] = process.argv;
  if (!promptArg || !nameArg) {
    console.log('Uso: node tools/gemini-generate-image.js --transparent "prompt" nome-arquivo');
    process.exit(0);
  }
  generateTransparentImage(promptArg, nameArg).then(result => {
    if (result) {
      console.log(`\n📂 Usar no HTML:`);
      console.log(`   <img src="${result.base64.substring(0, 60)}..." />`);
    }
  });
}
