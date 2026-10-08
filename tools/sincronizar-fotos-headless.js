#!/usr/bin/env node
'use strict';
/**
 * sincronizar-fotos-headless.js
 * Baixa fotos de pneus do OI → Google Drive → estoque_pneus.foto_url
 * Roda com Puppeteer headless (sem janela visível) via PM2.
 *
 * USO:
 *   node tools/sincronizar-fotos-headless.js
 *   node tools/sincronizar-fotos-headless.js --force
 *
 * PM2:
 *   pm2 start tools/sincronizar-fotos-headless.js --name fotos-pneus --cron "0 8,12,16 * * *" --no-autorestart
 */

require('dotenv').config();
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');

const BASE_OI   = 'https://sistemaoficinainteligente.com.br';
const FORCE     = process.argv.includes('--force');
const OI_EMAIL  = process.env.OI_EMAIL;
const OI_SENHA  = process.env.OI_SENHA;

const SUPABASE_URL = process.env.NEXUSZ_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const EDGE_DRIVE   = `${SUPABASE_URL}/functions/v1/upload-to-drive`;

if (!OI_EMAIL || !OI_SENHA) { console.error('❌ OI_EMAIL / OI_SENHA ausentes'); process.exit(1); }
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ SUPABASE vars ausentes'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
function log(msg) { console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function isGrupoPneu(g) {
  const t = (g || '').trim().toUpperCase();
  return t.startsWith('PNEU IMPORTADO') || t.startsWith('PNEU NACIONAL');
}

// ── Drive upload ───────────────────────────────────────────────────────────────

async function uploadToDrive(imageBuffer, fileName) {
  const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
  const form = new FormData();
  form.append('file', blob, fileName);
  form.append('category_name', 'CRM');
  form.append('unit_name', 'Catalogo Pneus');
  form.append('subcategory_name', 'Fotos');

  const res = await fetch(EDGE_DRIVE, {
    method:  'POST',
    headers: { Authorization: `Bearer ${SUPABASE_KEY}` },
    body:    form,
  });
  if (!res.ok) throw new Error(`Drive HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 100)}`);
  const data = await res.json();
  if (!data.success || !data.file_url) throw new Error('Drive sem file_url: ' + JSON.stringify(data).slice(0, 100));

  const fileId = data.file_url.match(/\/d\/([^\/]+)\//)?.[1];
  return fileId ? `https://drive.google.com/uc?export=view&id=${fileId}` : data.file_url;
}

// ── Baixar imagem via sessão autenticada ───────────────────────────────────────

async function baixarImagem(page, src) {
  const bytes = await page.evaluate(async (url) => {
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) return null;
      return [...new Uint8Array(await res.arrayBuffer())];
    } catch { return null; }
  }, src);
  return bytes ? Buffer.from(bytes) : null;
}

// ── Login no OI ───────────────────────────────────────────────────────────────

async function loginOI(page) {
  log('Fazendo login no OI...');
  await page.goto(`${BASE_OI}/Entrar.aspx?sair=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(1500);

  await page.type('#Login1_UserName', OI_EMAIL, { delay: 30 });
  await page.type('#Login1_Password', OI_SENHA, { delay: 30 });
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
    page.click('#Login1_btnEntrar'),
  ]);
  await sleep(2000);

  if (page.url().includes('Entrar') || page.url().includes('Login')) {
    throw new Error('Login falhou — verifique OI_EMAIL e OI_SENHA no .env');
  }
  log('Login OK');
}

// ── Coletar produtos de um grupo ──────────────────────────────────────────────

async function coletarProdutosDoGrupo(page, grupValor) {
  await page.goto(`${BASE_OI}/wfProdutoBusca.aspx`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(1500);

  // Seleciona grupo
  await page.evaluate((val) => {
    const s = document.getElementById('ctl00_cph_ddlGrupoDeProduto');
    if (s) { s.value = val; s.dispatchEvent(new Event('change', { bubbles: true })); }
  }, grupValor);
  await sleep(800);

  // Ativo = Ativo (1) ou Ambos
  await page.evaluate(() => {
    const s = document.getElementById('ctl00_cph_ddlAtivo');
    if (s) s.value = '1'; // Ativo
  });

  // Com estoque = Sim (rblEstoque = 1)
  await page.evaluate(() => {
    const r = document.querySelector('input[name="ctl00$cph$rblEstoque"][value="1"]');
    if (r) r.click();
  });
  await sleep(300);

  // Buscar
  await page.evaluate(() => {
    const btn = document.querySelector('#ctl00_cph_btnBuscar, input[id*="btnBuscar"]');
    if (btn) btn.click();
  });
  await sleep(4000);

  // Coleta linhas com ProdutoID + EmpresaID
  return await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tr')).slice(1);
    return rows.flatMap(tr => {
      const tds = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
      if (!tds[2]) return [];
      const link = tr.querySelector('a');
      const href = link?.href || '';
      const onclick = link?.getAttribute('onclick') || '';
      const src = href + onclick;
      const pid = src.match(/ProdutoID=([^&'"]+)/)?.[1];
      const eid = src.match(/EmpresaID=([^&'"]+)/)?.[1];
      if (!pid || !eid) return [];
      return [{ desc: tds[2].trim(), produtoId: decodeURIComponent(pid), empresaId: decodeURIComponent(eid) }];
    });
  });
}

// ── Buscar foto de um produto ──────────────────────────────────────────────────

async function buscarFoto(browser, empresaId, produtoId) {
  const pg = await browser.newPage();
  pg.on('dialog', async d => { try { await d.dismiss(); } catch {} });
  try {
    const url = `${BASE_OI}/wfProduto.aspx?EmpresaID=${encodeURIComponent(empresaId)}&ProdutoID=${encodeURIComponent(produtoId)}`;
    await pg.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(1000);

    const clicou = await pg.evaluate(() => {
      const tab = document.getElementById('__tab_tab_tabDocumento');
      if (tab) { tab.click(); return true; }
      const link = Array.from(document.querySelectorAll('a'))
        .find(a => /fotos?/i.test(a.textContent?.trim()));
      if (link) { link.click(); return true; }
      return false;
    });
    if (!clicou) return null;
    await sleep(1200);

    const imgSrc = await pg.evaluate(() => {
      const panel = document.getElementById('tab_tabDocumento') || document;
      const imgs = Array.from(panel.querySelectorAll('img')).filter(img =>
        img.src && img.naturalWidth > 50 &&
        !/spacer|logo|bg\.|btn|icon/i.test(img.src)
      );
      return imgs[0]?.src || null;
    });
    if (!imgSrc) return null;
    return await baixarImagem(pg, imgSrc);
  } catch (e) {
    log(`  ⚠️  Foto ${produtoId.slice(0,20)}: ${e.message.slice(0,60)}`);
    return null;
  } finally {
    await pg.close().catch(() => {});
  }
}

// ── Principal ──────────────────────────────────────────────────────────────────

(async () => {
  log(`=== Sync fotos pneus (headless) — ${FORCE ? 'FORCE' : 'somente sem foto'} ===`);

  // 1. Busca produtos sem foto no banco
  let query = supabase.from('estoque_pneus').select('id, descricao, grupo, loja');
  if (!FORCE) query = query.is('foto_url', null);
  const { data: semFoto, error: dbErr } = await query;

  if (dbErr) { log('❌ Erro banco: ' + dbErr.message); process.exit(1); }
  if (!semFoto?.length) { log('✅ Nenhum produto sem foto'); process.exit(0); }

  const porLoja = semFoto.reduce((a, p) => { a[p.loja] = (a[p.loja] || 0) + 1; return a; }, {});
  log(`📋 ${semFoto.length} sem foto: ${Object.entries(porLoja).map(([l, n]) => `${l}=${n}`).join(', ')}`);

  const semFotoMap = new Map(semFoto.map(p => [p.descricao.toUpperCase(), { id: p.id, loja: p.loja }]));

  // 2. Abre Chromium headless
  log('Iniciando Chromium headless...');
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
    defaultViewport: { width: 1280, height: 900 },
  });

  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch {} });

  let processados = 0, comFoto = 0, semFotoOI = 0, erros = 0;

  try {
    // 3. Login
    await loginOI(page);

    // 4. Coleta grupos de pneu
    await page.goto(`${BASE_OI}/wfProdutoBusca.aspx`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(1500);

    const gruposOI = await page.evaluate(() => {
      const s = document.getElementById('ctl00_cph_ddlGrupoDeProduto');
      return Array.from(s?.options || []).map(o => ({ value: o.value, text: o.text.trim() }));
    });

    const gruposPneu = gruposOI.filter(g => isGrupoPneu(g.text));
    log(`Grupos de pneu: ${gruposPneu.length}`);

    // 5. Para cada grupo, coleta produtos e busca fotos
    for (const grupo of gruposPneu) {
      if (semFotoMap.size === 0) { log('Todos encontrados, parando.'); break; }

      log(`→ ${grupo.text}`);
      let produtosGrupo;
      try {
        produtosGrupo = await coletarProdutosDoGrupo(page, grupo.value);
      } catch (e) {
        log(`  ⚠️  Erro grupo: ${e.message.slice(0, 80)}`);
        continue;
      }
      log(`   ${produtosGrupo.length} produtos`);

      for (const prod of produtosGrupo) {
        const descUp = prod.desc.toUpperCase();

        // Correspondência exata ou prefixo (OI trunca a ~40 chars na lista)
        let match = semFotoMap.get(descUp);
        if (!match) {
          for (const [dbDesc, info] of semFotoMap) {
            if (dbDesc.startsWith(descUp) || descUp.startsWith(dbDesc.slice(0, 35))) {
              match = info; break;
            }
          }
        }
        if (!match) continue;

        processados++;
        log(`  [${processados}] [${match.loja}] ${prod.desc.slice(0, 55)}`);

        const imgBuffer = await buscarFoto(browser, prod.empresaId, prod.produtoId);
        if (!imgBuffer) { semFotoOI++; log(`    ↳ sem foto no OI`); continue; }

        const fileName = `pneu-${match.id}.jpg`;
        let driveUrl;
        try {
          driveUrl = await uploadToDrive(imgBuffer, fileName);
        } catch (e) {
          log(`    ↳ ❌ Drive: ${e.message.slice(0, 80)}`);
          erros++; continue;
        }

        const { error: upErr } = await supabase
          .from('estoque_pneus').update({ foto_url: driveUrl }).eq('id', match.id);

        if (upErr) { log(`    ↳ ❌ Banco: ${upErr.message}`); erros++; }
        else { log(`    ↳ ✅ ${match.loja}`); semFotoMap.delete(descUp); comFoto++; }

        await sleep(800);
      }

      await sleep(500);
    }

  } finally {
    await browser.close().catch(() => {});
  }

  log('');
  log(`=== Resultado: ${processados} processados, ${comFoto} fotos salvas, ${semFotoOI} sem foto no OI, ${erros} erros ===`);
})().catch(err => {
  console.error('❌ Falha fatal:', err.message || err);
  process.exit(1);
});
