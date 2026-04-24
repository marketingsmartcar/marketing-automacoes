#!/usr/bin/env node
/**
 * gerar-criativo-html.js
 * Gerador de criativos HTML completos com imagem IA via Gemini
 * BR Pneus & Oficina
 *
 * Uso:
 *   node tools/gerar-criativo-html.js <template> <cidade> [opcoes-json]
 *
 * Templates: promo-servico | promo-pneus | stories | ads
 * Cidades:   araraquara | americana | sao-carlos | maringa | jau | ibitinga | bauru
 *
 * Exemplos:
 *   node tools/gerar-criativo-html.js promo-servico araraquara '{"servico":"Pastilha de Freio","preco":"79","centavos":"90","imagem":"car brake disc and brake pads"}'
 *   node tools/gerar-criativo-html.js promo-pneus maringa '{"imagem":"premium car tire"}'
 *   node tools/gerar-criativo-html.js stories jau '{"headline":"PNEUS EM PROMOÇÃO","oferta":"A partir de R$179","imagem":"sport car tire"}'
 *   node tools/gerar-criativo-html.js ads araraquara '{"headline":"PNEU NOVO É NA BR PNEUS","oferta":"A partir de R$179 em até 18x","imagem":"tire on modern car wheel"}'
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Carregar .env ──────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.resolve('.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
  }
}

loadEnv();

// ── ImageResolver (multi-fonte) ────────────────────────────────────────────
const ImageResolver = require('./image-resolver');
const imgResolver   = new ImageResolver();

// ── Dados das unidades ─────────────────────────────────────────────────────
const UNIDADES = {
  'araraquara': { cidade: 'Araraquara', estado: 'SP', tel: '(16) 3190-2380' },
  'americana':  { cidade: 'Americana',  estado: 'SP', tel: '(16) 3397-5424' },
  'sao-carlos': { cidade: 'São Carlos', estado: 'SP', tel: '(16) 3376-0011' },
  'maringa':    { cidade: 'Maringá',    estado: 'PR', tel: '(44) 3170-0441' },
  'jau':        { cidade: 'Jaú',        estado: 'SP', tel: '(14) 3149-0549' },
  'ibitinga':   { cidade: 'Ibitinga',   estado: 'SP', tel: '(16) 3188-0547' },
  'bauru':      { cidade: 'Bauru',      estado: 'SP', tel: ''               },
};

// ── Gerar imagem via Gemini (fundo branco → transparente) ──────────────────
async function gerarImagemGemini(descricao, nome) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'COLE_SUA_CHAVE_AQUI') {
    console.log('⚠️  GEMINI_API_KEY não configurada. Criativo será gerado sem imagem.');
    return null;
  }

  const prompt = `${descricao}, isolated on pure white background, product photography, studio lighting, clean cutout, centered, high quality 8k. No text, no logos, no watermarks, completely white background.`;

  console.log(`\n📸 Gerando imagem via Gemini AI...`);
  console.log(`   ${descricao.substring(0, 70)}...`);

  let imageBuffer = null;

  // ── Tentativa 1: Imagen 4.0 (plano pago) ────────────────────────────────
  const imagenModelos = [
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${apiKey}`,
  ];

  for (const modelUrl of imagenModelos) {
    try {
      const res = await fetch(modelUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1, aspectRatio: '1:1', safetySetting: 'block_low_and_above' },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err.error?.message || res.statusText;
        console.log(`   ⚠️  Imagen indisponível: ${msg.substring(0, 80)}`);
        continue;
      }

      const data = await res.json();
      const b64 = data.predictions?.[0]?.bytesBase64Encoded;
      if (b64) { imageBuffer = Buffer.from(b64, 'base64'); break; }
    } catch (err) {
      console.log(`   ⚠️  Erro Imagen: ${err.message}`);
    }
  }

  // ── Tentativa 2: gemini-2.0-flash-preview-image-generation (gratuito) ───
  if (!imageBuffer) {
    console.log(`   🔄 Tentando gemini-2.0-flash (geração de imagem gratuita)...`);

    const flashModelos = [
      'gemini-3.1-flash-image-preview',
      'gemini-2.5-flash-image',
      'gemini-2.5-flash',
    ];

    for (const modelo of flashModelos) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const msg = err.error?.message || res.statusText;
          console.log(`   ⚠️  ${modelo}: ${msg.substring(0, 80)}`);
          continue;
        }

        const data = await res.json();
        const parts = data.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            imageBuffer = Buffer.from(part.inlineData.data, 'base64');
            console.log(`   ✅ Imagem gerada via ${modelo}`);
            break;
          }
        }
        if (imageBuffer) break;
      } catch (err) {
        console.log(`   ⚠️  Erro ${modelo}: ${err.message}`);
      }
    }
  }

  if (!imageBuffer) {
    console.log('   ❌ Imagem não gerada. Criativo será sem imagem.');
    return null;
  }

  // Remover fundo branco → transparente via sharp
  try {
    const sharp = require('sharp');
    const metadata = await sharp(imageBuffer).metadata();
    const { width, height } = metadata;
    const channels = metadata.channels || 3;

    const rawBuffer = await sharp(imageBuffer).raw().toBuffer();
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
      rgbaBuffer[d + 3] = (r > 235 && g > 235 && b > 235) ? 0 : 255;
    }

    const pngBuffer = await sharp(rgbaBuffer, { raw: { width, height, channels: 4 } }).png().toBuffer();

    // Salvar PNG para referência
    const outputDir = path.resolve('output/criativos/imagens');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const pngPath = path.join(outputDir, `${nome}-${hoje()}.png`);
    fs.writeFileSync(pngPath, pngBuffer);

    const base64 = pngBuffer.toString('base64');
    console.log(`   ✅ Imagem gerada: ${width}x${height}px (fundo removido)`);
    console.log(`   📁 PNG salvo: ${path.relative(process.cwd(), pngPath)}`);

    return `data:image/png;base64,${base64}`;

  } catch (sharpErr) {
    console.log(`   ⚠️  Sharp não instalado (${sharpErr.message})`);
    console.log(`       Fundo não removido — usando imagem original.`);
    console.log(`       Para remover o fundo: npm install sharp`);

    const base64 = imageBuffer.toString('base64');
    return `data:image/png;base64,${base64}`;
  }
}

// ── Utilitários ────────────────────────────────────────────────────────────
function hoje() {
  return new Date().toISOString().split('T')[0];
}

// ══════════════════════════════════════════════════════════════════════════
// TEMPLATES HTML
// ══════════════════════════════════════════════════════════════════════════

// ── Template 1: Promoção de Serviço (Feed 1080×1350) ──────────────────────
function templatePromoServico({ headline, servico, preco, centavos, complemento, cta, cidade, telefone, imagemHTML }) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>BR Pneus — ${servico} — ${cidade}</title>
<style>
/* ═══ RESET E REGRAS GLOBAIS BR PNEUS ═══ */
* { margin:0; padding:0; box-sizing:border-box; }
body { background:#333; display:flex; justify-content:center; padding:40px; }

/* Container — REGRAS INVIOLÁVEIS */
.art {
  width:1080px; height:1350px;
  background:linear-gradient(135deg,#1B2A4A 0%,#0F1B33 100%);
  position:relative !important;
  overflow:hidden !important;
  font-family:'Arial Black',Impact,Arial,sans-serif;
}

/* Nenhuma imagem ultrapassa o container */
.art img { max-width:100%; object-fit:contain; }

/* Textos nunca transbordam */
.art h1,.art h2,.art p,.art span,.art div { overflow-wrap:break-word; word-wrap:break-word; }

.barra-topo { width:100%; height:8px; background:#F5A623; position:relative; z-index:4; }
.barra-base { position:absolute; bottom:0; width:100%; height:8px; background:#F5A623; z-index:4; }
.diagonal   { position:absolute; top:0; right:0; width:60%; height:100%; background:#F5A623; clip-path:polygon(30% 0,100% 0,100% 100%,0% 100%); z-index:1; }

/* Conteúdo textual — METADE ESQUERDA (máx 55%) */
.conteudo    { position:relative; z-index:2; padding:40px; width:55%; height:100%; display:flex; flex-direction:column; overflow:hidden; }
.headline    { font-size:48px; color:#fff; line-height:1.15; margin-top:80px; }
.headline em { font-style:normal; color:#F5A623; }
.preco-box   { margin-top:24px; }
.preco-label { font-size:18px; color:#F5A623; }
.cifrao      { font-size:32px; color:#fff; vertical-align:super; }
.valor       { font-size:110px; font-weight:900; color:#fff; line-height:1; }
.cents       { font-size:36px; color:#fff; vertical-align:super; }
.servico-tag { background:rgba(255,255,255,0.15); border-radius:12px; padding:10px 20px; display:inline-block; margin-top:16px; max-width:100%; }
.servico-tag span { font-size:20px; color:#fff; font-weight:700; }
.complemento { font-size:18px; color:rgba(255,255,255,0.8); margin-top:10px; font-family:Arial,sans-serif; }
.cta         { background:#F5A623; color:#1A1A1A; font-size:24px; font-weight:900; padding:18px 32px; border-radius:12px; display:inline-flex; align-items:center; gap:10px; margin-top:auto; margin-bottom:100px; text-transform:uppercase; width:fit-content; max-width:100%; }
.cta .seta   { font-size:28px; }

/* Logo — SEMPRE visível, SEMPRE acima de tudo */
.logo { position:absolute; top:20px; right:30px; z-index:10 !important; height:56px; }
.logo img { height:56px; width:auto; object-fit:contain; filter:drop-shadow(0 2px 8px rgba(0,0,0,0.5)); }

.rodape      { position:absolute; bottom:20px; left:40px; z-index:5; }
.rodape span { font-size:14px; color:rgba(255,255,255,0.6); font-family:Arial,sans-serif; }

/* Imagem produto — METADE DIREITA (máx 45% largura, 50% altura) */
.imagem-produto {
  position:absolute;
  right:20px;
  top:50%;
  transform:translateY(-50%);
  z-index:3;
  max-width:45%;
  max-height:50%;
  display:flex;
  align-items:center;
  justify-content:center;
}
.imagem-produto img, .imagem-produto svg {
  max-width:100%;
  max-height:100%;
  object-fit:contain;
  filter:drop-shadow(0 10px 30px rgba(0,0,0,0.4));
}
.imagem-produto span { display:block; text-align:center; }
</style>
</head>
<body>
<div class="art" data-width="1080" data-height="1350">
  <div class="barra-topo"></div>
  <div class="diagonal"></div>

  <div class="conteudo">
    <div class="headline">${headline}</div>

    <div class="preco-box">
      <div class="preco-label">a partir de</div>
      <span class="cifrao">R$</span><span class="valor">${preco}</span><span class="cents">,${centavos}</span>
    </div>

    <div class="servico-tag"><span>${servico}</span></div>
    <div class="complemento">${complemento}</div>

    <div class="cta">${cta} <span class="seta">→</span></div>
  </div>

  ${imagemHTML ? `<div class="imagem-produto">${imagemHTML}</div>` : ''}

  <div class="rodape"><span>${telefone ? telefone + ' | ' : ''}0800 942 4402</span></div>

  <div class="logo">
    <img src="../../assets/imagens/logos-marcas/brpneus-logo-borda.png" alt="BR Pneus & Oficina">
  </div>

  <div class="barra-base"></div>
</div>
</body>
</html>`;
}

// ── Template 2: Promoção de Pneus por Aro (Feed 1080×1350) ────────────────
function templatePromoPneus({ headline, pneus, condicao, cta, cidade, telefone, imagemHTML }) {
  const pneusHTML = pneus.map(p => `
    <div class="pneu-card">
      <div class="aro">ARO ${p.aro}</div>
      <div class="apartir">a partir de</div>
      <div class="preco"><span class="rs">R$</span>${p.preco}</div>
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>BR Pneus — Promoção Pneus — ${cidade}</title>
<style>
/* ═══ RESET E REGRAS GLOBAIS BR PNEUS ═══ */
* { margin:0; padding:0; box-sizing:border-box; }
body { background:#333; display:flex; justify-content:center; padding:40px; }

/* Container — REGRAS INVIOLÁVEIS */
.art {
  width:1080px; height:1350px;
  background:linear-gradient(180deg,#1A1A1A 0%,#111 100%);
  position:relative !important;
  overflow:hidden !important;
  font-family:'Arial Black',Impact,Arial,sans-serif;
}

/* Nenhuma imagem ultrapassa o container */
.art img { max-width:100%; object-fit:contain; }

/* Textos nunca transbordam */
.art h1,.art h2,.art p,.art span,.art div { overflow-wrap:break-word; word-wrap:break-word; }

.barra-topo { width:100%; height:8px; background:#F5A623; position:relative; z-index:4; }
.barra-base { position:absolute; bottom:0; width:100%; height:60px; background:#F5A623; display:flex; align-items:center; justify-content:center; z-index:4; }
.barra-base span { font-size:18px; color:#1A1A1A; font-weight:700; font-family:Arial,sans-serif; letter-spacing:2px; text-transform:uppercase; }

.headline { font-size:56px; color:#fff; text-align:center; padding:50px 240px 10px; line-height:1.1; text-transform:uppercase; }
.headline .destaque { color:#F5A623; }

/* Imagem central — máx 280px para caber com os cards */
.imagem-centro { text-align:center; padding:10px 40px; display:flex; justify-content:center; align-items:center; max-height:300px; overflow:hidden; }
.imagem-centro img, .imagem-centro svg { max-height:280px; max-width:80%; object-fit:contain; }
.imagem-centro span { display:block; }

/* Cards de pneus — caber TODOS na mesma linha */
.pneus-row { display:flex; justify-content:center; gap:12px; padding:16px 30px; flex-wrap:nowrap; }
.pneu-card { background:rgba(255,255,255,0.08); border:2px solid rgba(245,166,35,0.3); border-radius:16px; padding:16px 10px; text-align:center; flex:1; min-width:0; flex-shrink:1; }
.pneu-card .aro { font-size:16px; color:#F5A623; font-weight:900; margin-bottom:4px; }
.pneu-card .apartir { font-size:10px; color:#999; font-family:Arial,sans-serif; }
.pneu-card .preco { font-size:48px; font-weight:900; color:#fff; line-height:1.1; }
.pneu-card .rs { font-size:18px; vertical-align:super; color:#F5A623; }

.condicao { text-align:center; padding:12px 30px; font-size:18px; color:rgba(255,255,255,0.7); font-family:Arial,sans-serif; }
.cta { background:#F5A623; color:#1A1A1A; font-size:26px; font-weight:900; padding:16px 40px; border-radius:12px; text-align:center; margin:10px 60px; text-transform:uppercase; }

/* Logo — SEMPRE visível, SEMPRE acima de tudo */
.logo { position:absolute; top:20px; right:20px; z-index:10 !important; height:56px; }
.logo img { height:56px; width:auto; object-fit:contain; filter:drop-shadow(0 2px 8px rgba(0,0,0,0.5)); }

.rodape { text-align:center; padding:8px; }
.rodape span { font-size:13px; color:rgba(255,255,255,0.5); font-family:Arial,sans-serif; }
.marcas { text-align:center; padding:4px; font-size:11px; color:rgba(255,255,255,0.4); font-family:Arial,sans-serif; }
</style>
</head>
<body>
<div class="art" data-width="1080" data-height="1350">
  <div class="barra-topo"></div>

  <div class="logo">
    <img src="../../assets/imagens/logos-marcas/brpneus-logo-borda.png" alt="BR Pneus & Oficina">
  </div>

  <div class="headline">${headline}</div>

  ${imagemHTML ? `<div class="imagem-centro">${imagemHTML}</div>` : ''}

  <div class="pneus-row">${pneusHTML}</div>

  <div class="condicao">${condicao}</div>
  <div class="cta">${cta}</div>

  <div class="marcas">Continental • Pirelli • Michelin • Bridgestone • Firestone • Goodyear • XBRI</div>
  <div class="rodape"><span>${telefone ? telefone + ' | ' : ''}0800 942 4402</span></div>

  <div class="barra-base"><span>Liberdade para Rodar</span></div>
</div>
</body>
</html>`;
}

// ── Template 3: Stories (1080×1920) ───────────────────────────────────────
function templateStories({ headline, oferta, cta, cidade, telefone, imagemHTML }) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>BR Pneus — Stories — ${cidade}</title>
<style>
/* ═══ RESET E REGRAS GLOBAIS BR PNEUS ═══ */
* { margin:0; padding:0; box-sizing:border-box; }
body { background:#333; display:flex; justify-content:center; padding:40px; }

/* Container — REGRAS INVIOLÁVEIS */
.art {
  width:1080px; height:1920px;
  background:linear-gradient(180deg,#1B2A4A 0%,#0F1B33 60%,#F5A623 100%);
  position:relative !important;
  overflow:hidden !important;
  font-family:'Arial Black',Impact,Arial,sans-serif;
}

/* Nenhuma imagem ultrapassa o container */
.art img { max-width:100%; object-fit:contain; }

/* Textos nunca transbordam */
.art h1,.art h2,.art p,.art span,.art div { overflow-wrap:break-word; word-wrap:break-word; }

/* Logo — topo esquerdo, SEMPRE visível */
.logo { position:absolute; top:50px; left:50px; z-index:10 !important; height:64px; }
.logo img { height:64px; width:auto; object-fit:contain; filter:drop-shadow(0 2px 10px rgba(0,0,0,0.6)); }

/* Imagem — centro superior, máx 400px para caber com textos abaixo */
.imagem-area {
  position:absolute;
  top:18%;
  left:50%;
  transform:translateX(-50%);
  z-index:2;
  text-align:center;
  width:80%;
  max-height:400px;
  display:flex;
  justify-content:center;
  align-items:center;
  overflow:hidden;
}
.imagem-area img, .imagem-area svg {
  max-height:400px;
  max-width:100%;
  object-fit:contain;
  filter:drop-shadow(0 10px 40px rgba(0,0,0,0.5));
}
.imagem-area span { display:block; }

/* Conteúdo textual — parte inferior, com margem de segurança 50px */
.conteudo { position:absolute; bottom:0; left:0; right:0; padding:60px 50px 140px; z-index:3; }
.headline { font-size:68px; color:#fff; line-height:1.1; text-transform:uppercase; margin-bottom:20px; }
.headline .destaque { color:#F5A623; }
.oferta { font-size:72px; font-weight:900; color:#1A1A1A; margin-bottom:24px; line-height:1; }
.cta { font-size:24px; color:#1A1A1A; font-weight:700; font-family:Arial,sans-serif; }

/* Rodapé com margem de segurança 50px — celular */
.rodape { position:absolute; bottom:50px; left:50px; right:50px; display:flex; justify-content:space-between; z-index:5; }
.rodape span { font-size:18px; color:rgba(255,255,255,0.7); font-family:Arial,sans-serif; }
</style>
</head>
<body>
<div class="art" data-width="1080" data-height="1920">
  <div class="logo">
    <img src="../../assets/imagens/logos-marcas/brpneus-logo-borda.png" alt="BR Pneus & Oficina">
  </div>

  ${imagemHTML ? `<div class="imagem-area">${imagemHTML}</div>` : ''}

  <div class="conteudo">
    <div class="headline">${headline}</div>
    <div class="oferta">${oferta}</div>
    <div class="cta">${cta}</div>
  </div>

  <div class="rodape">
    <span>${telefone || 'Consulte a loja'}</span>
    <span>0800 942 4402</span>
  </div>
</div>
</body>
</html>`;
}

// ── Template 4: Patrocinado/Ads (1080×1080) ───────────────────────────────
function templateAds({ headline, oferta, cta, cidade, telefone, imagemHTML }) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>BR Pneus — Ads — ${cidade}</title>
<style>
/* ═══ RESET E REGRAS GLOBAIS BR PNEUS ═══ */
* { margin:0; padding:0; box-sizing:border-box; }
body { background:#333; display:flex; justify-content:center; padding:40px; }

/* Container — REGRAS INVIOLÁVEIS */
.art {
  width:1080px; height:1080px;
  background:linear-gradient(135deg,#1A1A1A 0%,#111 100%);
  position:relative !important;
  overflow:hidden !important;
  font-family:'Arial Black',Impact,Arial,sans-serif;
}

/* Nenhuma imagem ultrapassa o container */
.art img { max-width:100%; object-fit:contain; }

/* Textos nunca transbordam */
.art h1,.art h2,.art p,.art span,.art div { overflow-wrap:break-word; word-wrap:break-word; }

.barra-topo { width:100%; height:8px; background:#F5A623; position:relative; z-index:4; }
.barra-base { position:absolute; bottom:0; width:100%; height:8px; background:#F5A623; z-index:4; }

/* Logo — SEMPRE visível, SEMPRE acima de tudo */
.logo { position:absolute; top:25px; right:30px; z-index:10 !important; height:52px; }
.logo img { height:52px; width:auto; object-fit:contain; filter:drop-shadow(0 2px 8px rgba(0,0,0,0.5)); }

/* Conteúdo textual — metade esquerda (máx 55% da largura = ~590px) */
.headline { font-size:48px; color:#fff; padding:80px 40px 20px; line-height:1.1; text-transform:uppercase; max-width:560px; }
.headline .destaque { color:#F5A623; }
.oferta { font-size:30px; color:#F5A623; padding:0 40px 20px; font-family:Arial,sans-serif; font-weight:700; max-width:560px; }
.cta { background:#F5A623; color:#1A1A1A; font-size:24px; font-weight:900; padding:16px 32px; border-radius:10px; display:inline-block; margin:10px 40px 30px; text-transform:uppercase; }

.rodape { position:absolute; bottom:20px; left:40px; z-index:5; }
.rodape span { font-size:13px; color:rgba(255,255,255,0.5); font-family:Arial,sans-serif; }

/* Imagem — metade direita (máx 380×380px para formato quadrado 1:1) */
.imagem {
  position:absolute;
  right:20px;
  bottom:40px;
  z-index:2;
  max-width:380px;
  max-height:380px;
  display:flex;
  align-items:flex-end;
  justify-content:center;
}
.imagem img, .imagem svg {
  max-width:380px;
  max-height:380px;
  object-fit:contain;
  filter:drop-shadow(0 8px 20px rgba(0,0,0,0.5));
}
.imagem span { display:block; }
</style>
</head>
<body>
<div class="art" data-width="1080" data-height="1080">
  <div class="barra-topo"></div>

  <div class="logo">
    <img src="../../assets/imagens/logos-marcas/brpneus-logo-borda.png" alt="BR Pneus & Oficina">
  </div>

  <div class="headline">${headline}</div>
  <div class="oferta">${oferta}</div>
  <div class="cta">${cta}</div>

  <div class="rodape"><span>${telefone ? telefone + ' | ' : ''}0800 942 4402</span></div>

  ${imagemHTML ? `<div class="imagem">${imagemHTML}</div>` : ''}

  <div class="barra-base"></div>
</div>
</body>
</html>`;
}

// ══════════════════════════════════════════════════════════════════════════
// CLI PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════
async function main() {
  const args = process.argv.slice(2);

  if (args[0] === '--help' || args.length === 0) {
    console.log(`
🎨 Gerador de Criativos HTML — BR Pneus & Oficina
─────────────────────────────────────────────────

Uso:
  node tools/gerar-criativo-html.js <template> <cidade> [opcoes-json]

Templates disponíveis:
  promo-servico   Feed 1080×1350 — promoção de serviço com preço
  promo-pneus     Feed 1080×1350 — promoção de pneus por aro
  stories         Stories 1080×1920 — promoção/oferta
  ads             Patrocinado 1080×1080 — anúncio pago

Cidades:
  araraquara | americana | sao-carlos | maringa | jau | ibitinga | bauru

Opções JSON (todos opcionais):
  imagem       Descrição em inglês para gerar via Gemini AI
  headline     Headline principal da peça
  servico      Nome do serviço (promo-servico)
  preco        Preço inteiro (ex: "79")
  centavos     Centavos (ex: "90")
  complemento  Complemento do preço (ex: "+ Instalação")
  cta          Texto do botão de ação
  pneus        Array de pneus: [{"aro":"13","preco":"179"},...]
  condicao     Condição de pagamento
  oferta       Oferta em destaque (stories/ads)

Exemplos:
  node tools/gerar-criativo-html.js promo-servico araraquara \\
    '{"servico":"Pastilha de Freio","preco":"79","centavos":"90","imagem":"car brake disc and brake pads"}'

  node tools/gerar-criativo-html.js promo-pneus maringa \\
    '{"imagem":"premium black car tire"}'

  node tools/gerar-criativo-html.js stories jau \\
    '{"headline":"PNEUS EM PROMOÇÃO","oferta":"A partir de R$179","imagem":"sport car tire"}'

  node tools/gerar-criativo-html.js ads araraquara \\
    '{"headline":"PNEU NOVO É NA BR PNEUS","oferta":"A partir de R$179 em até 18x","imagem":"tire on modern car wheel"}'
`);
    return;
  }

  const template  = args[0];
  const cidadeKey = args[1];
  const opcoes    = args[2] ? JSON.parse(args[2]) : {};

  const unidade = UNIDADES[cidadeKey];
  if (!unidade) {
    console.error(`❌ Cidade não encontrada: ${cidadeKey}`);
    console.log('   Cidades disponíveis:', Object.keys(UNIDADES).join(', '));
    process.exit(1);
  }

  // Resolver imagem (multi-fonte: local, svg, emoji, url, gemini)
  let imagemHTML = null;
  if (opcoes.imagem) {
    console.log(`\n📸 Resolvendo imagem: ${opcoes.imagem}`);
    imagemHTML = await imgResolver.resolve(opcoes.imagem, `${template}-${cidadeKey}`);
    if (imagemHTML) console.log(`   ✅ Imagem pronta!\n`);
    else            console.log(`   ⚠️  Sem imagem — usando placeholder.\n`);
  }
  // Placeholder quando nenhuma imagem fornecida/resolvida
  if (!imagemHTML) {
    imagemHTML = imgResolver.placeholder('ADICIONE SUA IMAGEM');
  }

  // Gerar HTML conforme template
  let html     = '';
  let filename = '';
  const ts     = hoje();

  switch (template) {

    case 'promo-servico':
      html = templatePromoServico({
        headline:    opcoes.headline    || `Está precisando trocar sua <em>${opcoes.servico || 'pastilha de freio'}</em>?`,
        servico:     opcoes.servico     || 'Pastilha de Freio',
        preco:       opcoes.preco       || '79',
        centavos:    opcoes.centavos    || '90',
        complemento: opcoes.complemento || '+ Instalação',
        cta:         opcoes.cta         || 'GARANTA JÁ!',
        cidade:      unidade.cidade,
        telefone:    unidade.tel,
        imagemHTML,
      });
      filename = `feed-promo-servico-${cidadeKey}-${ts}.html`;
      break;

    case 'promo-pneus':
      html = templatePromoPneus({
        headline:  opcoes.headline  || 'MEGA <span class="destaque">OFERTA</span> DE PNEUS',
        pneus:     opcoes.pneus     || [
          { aro: '13', preco: '179' },
          { aro: '14', preco: '199' },
          { aro: '15', preco: '239' },
          { aro: '16', preco: '269' },
        ],
        condicao:  opcoes.condicao  || 'Parcelamento em até 18x • Garantia BR Total Plus',
        cta:       opcoes.cta       || 'AGENDE AGORA!',
        cidade:    unidade.cidade,
        telefone:  unidade.tel,
        imagemHTML,
      });
      filename = `feed-promo-pneus-${cidadeKey}-${ts}.html`;
      break;

    case 'stories':
      html = templateStories({
        headline: opcoes.headline || 'PNEUS EM <span class="destaque">PROMOÇÃO</span>',
        oferta:   opcoes.oferta   || 'A partir de R$179',
        cta:      opcoes.cta      || '☝️ Arraste para cima e agende',
        cidade:   unidade.cidade,
        telefone: unidade.tel,
        imagemHTML,
      });
      filename = `stories-promo-${cidadeKey}-${ts}.html`;
      break;

    case 'ads':
      html = templateAds({
        headline: opcoes.headline || 'PNEU NOVO É NA <span class="destaque">BR PNEUS</span>',
        oferta:   opcoes.oferta   || 'A partir de R$179 em até 18x',
        cta:      opcoes.cta      || 'SAIBA MAIS',
        cidade:   unidade.cidade,
        telefone: unidade.tel,
        imagemHTML,
      });
      filename = `ads-promo-${cidadeKey}-${ts}.html`;
      break;

    default:
      console.error(`❌ Template não encontrado: ${template}`);
      console.log('   Disponíveis: promo-servico, promo-pneus, stories, ads');
      process.exit(1);
  }

  // Salvar HTML
  const outputDir  = path.resolve('output/criativos');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, filename);
  fs.writeFileSync(outputPath, html);

  const dimensoes = {
    'promo-servico': '1080×1350px (Feed 4:5)',
    'promo-pneus':   '1080×1350px (Feed 4:5)',
    'stories':       '1080×1920px (Stories 9:16)',
    'ads':           '1080×1080px (Ads 1:1)',
  };

  console.log(`\n🎨 ════════════════════════════════════════════`);
  console.log(`✅ Criativo gerado com sucesso!`);
  console.log(`📁 Arquivo: output/criativos/${filename}`);
  console.log(`📐 Formato: ${dimensoes[template]}`);
  console.log(`🏙️  Cidade:  ${unidade.cidade} - ${unidade.estado}`);
  console.log(`📸 Imagem: ${opcoes.imagem ? opcoes.imagem.substring(0, 40) : 'placeholder'}`);
  console.log(`═══════════════════════════════════════════════\n`);
  console.log(`👀 PARA VISUALIZAR NO VSCODE:`);
  console.log(`   Abra o arquivo → botão direito → Show Preview`);
  console.log(`   Atalho: Ctrl+Shift+V\n`);
  console.log(`📥 PARA EXPORTAR COMO PNG:`);
  console.log(`   node tools/export-html-to-png.js "${outputPath}"\n`);
  console.log(`📦 PARA EXPORTAR TODOS OS CRIATIVOS:`);
  console.log(`   node tools/export-html-to-png.js --all\n`);

  // Abrir no VSCode automaticamente
  try {
    const { exec } = require('child_process');
    exec(`code "${outputPath}"`);
  } catch (_) { /* silencioso se code CLI não disponível */ }
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
