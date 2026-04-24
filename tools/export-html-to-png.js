#!/usr/bin/env node
/**
 * export-html-to-png.js
 * BR Pneus & Oficina — Exportador de artes HTML para PNG
 *
 * Uso:
 *   node tools/export-html-to-png.js output/criativos/feed-alinhamento.html
 *   node tools/export-html-to-png.js --all
 *
 * Requer: npm install puppeteer
 */

const path = require('path');
const fs   = require('fs');

// ── Detecção automática de dimensões pelo nome do arquivo ──────────────────
function detectDimensions(file) {
  const name = path.basename(file).toLowerCase();

  // Padrão: feed orgânico 4:5
  let w = 1080, h = 1350;

  if (name.includes('stories') || name.includes('status') || name.includes('1920')) {
    w = 1080; h = 1920;
  }
  if (name.includes('ads') || name.includes('patrocinado') || name.includes('1080x1080')) {
    w = 1080; h = 1080;
  }
  if (name.includes('banner') || name.includes('hero') || name.includes('1920x600')) {
    w = 1920; h = 600;
  }
  if (name.includes('whatsapp') || name.includes('800x800')) {
    w = 800; h = 800;
  }
  if (name.includes('tema-landscape') || name.includes('1270x720')) {
    w = 1270; h = 720;
  }
  if (name.includes('gads-300') || name.includes('300x250')) {
    w = 300; h = 250;
  }
  if (name.includes('gads-728') || name.includes('728x90')) {
    w = 728; h = 90;
  }
  if (name.includes('gads-160') || name.includes('160x600')) {
    w = 160; h = 600;
  }

  return { w, h };
}

// ── Exportar um arquivo HTML para PNG ─────────────────────────────────────
async function exportFile(htmlPath) {
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch {
    console.error('❌ Puppeteer não encontrado. Execute: npm install puppeteer');
    process.exit(1);
  }

  const absPath = path.resolve(htmlPath);
  if (!fs.existsSync(absPath)) {
    console.error(`❌ Arquivo não encontrado: ${absPath}`);
    return;
  }

  const { w, h } = detectDimensions(htmlPath);
  const outPath  = absPath.replace(/\.html$/i, '.png');

  console.log(`📐 ${path.basename(htmlPath)} → ${w}×${h}px`);

  const browser = await puppeteer.launch({ headless: 'new' });
  const page    = await browser.newPage();

  // Viewport maior para garantir renderização sem scroll
  await page.setViewport({ width: w + 200, height: h + 200, deviceScaleFactor: 2 });
  await page.goto(`file://${absPath}`, { waitUntil: 'networkidle0' });

  // Seleciona o elemento da arte diretamente para evitar offset do body
  const artContainer = await page.$('.art-container');
  const artEl        = await page.$('.art') || await page.$('.arte');

  if (artContainer) {
    await artContainer.screenshot({ path: outPath, omitBackground: false });
  } else if (artEl) {
    await artEl.screenshot({ path: outPath, omitBackground: false });
  } else {
    // Fallback: descobrir o offset real do conteúdo para clipar corretamente
    await page.screenshot({
      path: outPath,
      clip: { x: 0, y: 0, width: w, height: h },
    });
  }

  await browser.close();
  console.log(`✅ PNG salvo: ${path.relative(process.cwd(), outPath)}`);
}

// ── Exportar TODAS as artes em output/criativos/ ──────────────────────────
async function exportAll() {
  const dir = path.resolve('output/criativos');
  if (!fs.existsSync(dir)) {
    console.error('❌ Pasta output/criativos/ não encontrada.');
    process.exit(1);
  }

  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.html'))
    .map(f => path.join('output/criativos', f));

  if (files.length === 0) {
    console.log('ℹ️  Nenhum arquivo HTML encontrado em output/criativos/');
    return;
  }

  console.log(`\n🎨 Exportando ${files.length} arte(s)...\n`);
  for (const file of files) {
    await exportFile(file);
  }
  console.log('\n✅ Exportação concluída!');
}

// ── Entry point ────────────────────────────────────────────────────────────
(async () => {
  const arg = process.argv[2];

  if (!arg) {
    console.log(`
BR Pneus — Exportador de Artes HTML para PNG
============================================
Uso:
  node tools/export-html-to-png.js output/criativos/[arquivo].html
  node tools/export-html-to-png.js --all

Detecção automática de dimensões pelo nome do arquivo:
  feed-*        → 1080×1350 (padrão)
  ads-* / patrocinado-* → 1080×1080
  stories-*     → 1080×1920
  banner-*      → 1920×600
  whatsapp-*    → 800×800
  gads-300-*    → 300×250
  gads-728-*    → 728×90
`);
    process.exit(0);
  }

  if (arg === '--all') {
    await exportAll();
  } else {
    await exportFile(arg);
  }
})();
