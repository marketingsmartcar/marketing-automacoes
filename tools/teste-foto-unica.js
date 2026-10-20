#!/usr/bin/env node
'use strict';
/**
 * Teste de sync de foto para UMA medida/marca específica.
 * Usa: node tools/teste-foto-unica.js
 */
require('dotenv').config();
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');

const BASE_OI   = 'https://sistemaoficinainteligente.com.br';
const OI_EMAIL  = process.env.OI_EMAIL;
const OI_SENHA  = process.env.OI_SENHA;
const SUPABASE_URL = process.env.NEXUSZ_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const EDGE_DRIVE   = `${SUPABASE_URL}/functions/v1/upload-to-drive`;

// ── Produto alvo do teste ────────────────────────────────────────────────────
const DESCRICAO_ALVO = 'PNEU 175 60 14 GALLANT GL-16 79H';
const GRUPO_BUSCA    = 'IMPORTADO CURVA B'; // grupo OI onde esse produto costuma estar
// ────────────────────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function log(msg)  { console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`); }

async function uploadToDrive(buf, fileName) {
  const blob = new Blob([buf], { type: 'image/jpeg' });
  const form = new FormData();
  form.append('file', blob, fileName);
  form.append('category_name', 'CRM');
  form.append('unit_name', 'Catalogo Pneus');
  form.append('subcategory_name', 'Fotos');
  const res = await fetch(EDGE_DRIVE, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SUPABASE_KEY}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Drive ${res.status}: ${(await res.text()).slice(0,80)}`);
  const data = await res.json();
  if (!data.success || !data.file_url) throw new Error('Drive sem file_url');
  const id = data.file_url.match(/\/d\/([^\/]+)\//)?.[1];
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w500` : data.file_url;
}

async function buscarFotos(browser, empresaId, produtoId) {
  const pg = await browser.newPage();
  pg.on('dialog', async d => { try { await d.dismiss(); } catch {} });
  try {
    await pg.goto(`${BASE_OI}/wfProduto.aspx?EmpresaID=${encodeURIComponent(empresaId)}&ProdutoID=${encodeURIComponent(produtoId)}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(800);
    await pg.evaluate(() => { document.getElementById('__tab_tab_tabDocumento')?.click(); });
    try { await pg.waitForSelector('#tab_tabDocumento img[src^="data:image/"]', { timeout: 5000 }); } catch {}
    await sleep(500);

    return await pg.evaluate((base) => {
      function isQRCode(img) {
        try {
          const sz = 120;
          const canvas = document.createElement('canvas');
          canvas.width = sz; canvas.height = sz;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, sz, sz);
          const data = ctx.getImageData(0, 0, sz, sz).data;
          const total = sz * sz;
          let semSaturacao = 0, bw = 0;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i+1], b = data[i+2];
            if (Math.max(r,g,b) - Math.min(r,g,b) < 20) semSaturacao++;
            const lum = (r + g + b) / 3;
            if (lum < 50 || lum > 200) bw++;
          }
          return (semSaturacao / total > 0.80) && (bw / total > 0.65);
        } catch { return false; }
      }
      const results = [];
      const tab = document.getElementById('tab_tabDocumento');
      if (tab) {
        for (const img of tab.querySelectorAll('img')) {
          if (!img.src?.startsWith('data:image/')) continue;
          if (img.naturalWidth < 100 || img.naturalHeight < 100) continue;
          if (isQRCode(img)) { results.push({ type: 'qrcode_ignorado' }); continue; }
          const mm = img.src.match(/^data:(image\/[^;]+);base64,(.+)$/s);
          if (mm) results.push({ type: 'base64', data: mm[2], ext: mm[1].split('/')[1].replace('jpeg','jpg'), w: img.naturalWidth, h: img.naturalHeight });
        }
      }
      if (!results.some(r => r.type === 'base64')) {
        for (const a of document.querySelectorAll('[id*="lkbVisualizar"]')) {
          const m = (a.getAttribute('onclick') || '').match(/fncNovaAba\('([^']+)'\)/);
          if (!m) continue;
          const caminho = m[1].replace(/&amp;/g, '&');
          if (/\.(png|jpg|jpeg|gif|webp)(\?|$)/i.test(caminho))
            results.push({ type: 's3', url: caminho.startsWith('http') ? caminho : `${base}${caminho}` });
        }
      }
      return results;
    }, BASE_OI);
  } finally { await pg.close().catch(() => {}); }
}

(async () => {
  let browser, connected = false;
  try {
    const r = await fetch('http://localhost:9222/json/version'); const d = await r.json();
    browser = await puppeteer.connect({ browserWSEndpoint: d.webSocketDebuggerUrl, defaultViewport: null });
    connected = true; log('Chrome 9222 conectado');
  } catch {
    log('Headless...');
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu'], defaultViewport: { width: 1280, height: 900 } });
  }

  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch {} });

  log('Login...');
  await page.goto(`${BASE_OI}/Entrar.aspx?sair=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(1500);
  await page.waitForSelector('#Login1_UserName', { timeout: 15000 });
  await page.type('#Login1_UserName', OI_EMAIL, { delay: 40 });
  await page.type('#Login1_Password', OI_SENHA,  { delay: 40 });
  await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }), page.click('#Login1_btnEntrar')]);
  await sleep(1500);
  log('Logado ✅');

  log(`\nBuscando: "${DESCRICAO_ALVO}"`);
  await page.goto(`${BASE_OI}/wfProdutoBusca.aspx`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(1200);

  // Busca por descrição diretamente
  await page.evaluate((desc) => {
    const inp = document.getElementById('ctl00_cph_txtDescricao');
    if (inp) { inp.value = desc; inp.dispatchEvent(new Event('change', { bubbles: true })); }
  }, DESCRICAO_ALVO);
  await sleep(400);
  await page.evaluate(() => { document.querySelector('#ctl00_cph_btnBuscar, input[id*="btnBuscar"]')?.click(); });
  await sleep(4000);

  const produtos = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('#ctl00_cph_grd tr')).slice(1);
    const found = [];
    for (const tr of rows) {
      const tds = Array.from(tr.querySelectorAll('td'));
      if (tds.length < 3) continue;
      const link = tr.querySelector('a[onclick*="ProdutoID"]');
      const src = link?.getAttribute('onclick') || '';
      const pid = src.match(/ProdutoID=([^&'"]+)/)?.[1];
      const eid = src.match(/EmpresaID=([^&'"]+)/)?.[1];
      const desc = tds[2]?.innerText?.trim();
      const loja = tds[0]?.innerText?.trim() || '?';
      if (!pid) continue;
      found.push({ desc, loja, pid: decodeURIComponent(pid), eid: decodeURIComponent(eid) });
    }
    return found;
  });

  log(`Produtos encontrados no OI: ${produtos.length}`);
  if (!produtos.length) { log('❌ Nenhum produto encontrado'); process.exit(1); }

  // Busca o produto no banco
  const { data: dbRows } = await supabase.from('estoque_pneus')
    .select('id, descricao, loja, medida, marca')
    .ilike('descricao', `%GALLANT GL-16 79H%`)
    .eq('estoque', 1)
    .limit(5);
  log(`Registros no BD: ${dbRows?.length ?? 0}`);

  let okCount = 0, failCount = 0;

  for (const prod of produtos.slice(0, 3)) {
    log(`\n→ [${prod.loja}] ${prod.desc}`);
    const fotos = await buscarFotos(browser, prod.eid, prod.pid);
    log(`  Fotos encontradas: ${fotos.length} (${fotos.map(f => f.type).join(', ') || 'nenhuma'})`);

    const qrs = fotos.filter(f => f.type === 'qrcode_ignorado');
    if (qrs.length) log(`  ⚠️  ${qrs.length} QR code(s) filtrado(s)`);

    const validas = fotos.filter(f => f.type === 'base64' || f.type === 's3');
    if (!validas.length) { log('  ❌ Sem foto válida'); failCount++; continue; }

    const f = validas[0];
    let buf;
    if (f.type === 'base64') {
      buf = Buffer.from(f.data, 'base64');
      log(`  Base64 extraído: ${Math.round(buf.length/1024)}KB — ${f.w}×${f.h}px`);
    }

    try {
      const driveUrl = await uploadToDrive(buf, `teste-${Date.now()}.${f.ext || 'jpg'}`);
      log(`  ✅ Drive: ${driveUrl}`);

      // Tenta atualizar o banco para os registros correspondentes
      const dbMatch = dbRows?.find(r => r.desc?.includes('GALLANT') && r.loja?.includes('BR0'));
      if (dbMatch) {
        await supabase.from('estoque_pneus').update({ foto_url: driveUrl }).eq('id', dbMatch.id);
        log(`  ✅ BD atualizado: id=${dbMatch.id}`);
      }
      okCount++;
    } catch (e) {
      log(`  ❌ Erro upload: ${e.message}`);
      failCount++;
    }
  }

  log(`\n═══════════════════════════════`);
  log(`Resultado: ${okCount} OK | ${failCount} falhas`);

  await page.close().catch(() => {});
  if (connected) browser.disconnect(); else await browser.close().catch(() => {});
})().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
