#!/usr/bin/env node
'use strict';
/**
 * sincronizar-fotos-todas-lojas.js  v2
 * Sincroniza fotos de pneus do OI → Google Drive → estoque_pneus.foto_url
 *
 * Melhoria v2: detecta na LISTA quais produtos têm foto (input btnFoto),
 * só abre o produto quando a lista confirma que existe foto. Evita abrir
 * centenas de produtos vazios.
 *
 * USO:
 *   node tools/sincronizar-fotos-todas-lojas.js
 *   node tools/sincronizar-fotos-todas-lojas.js --force
 */

require('dotenv').config();
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');

const BASE_OI  = 'https://sistemaoficinainteligente.com.br';
const OI_EMAIL = process.env.OI_EMAIL;
const OI_SENHA  = process.env.OI_SENHA;
const FORCE    = process.argv.includes('--force');

const SUPABASE_URL = process.env.NEXUSZ_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const EDGE_DRIVE   = `${SUPABASE_URL}/functions/v1/upload-to-drive`;

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ SUPABASE_URL/KEY não definidos'); process.exit(1); }
if (!OI_EMAIL || !OI_SENHA)         { console.error('❌ OI_EMAIL/OI_SENHA não definidos'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function log(msg) { console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`); }

// ── Drive upload ───────────────────────────────────────────────────────────────

async function uploadToDrive(imageBuffer, fileName) {
  const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
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
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(`Drive ${res.status}: ${t.slice(0,120)}`); }
  const data = await res.json();
  if (!data.success || !data.file_url) throw new Error('Drive sem file_url: ' + JSON.stringify(data));
  const fileId = data.file_url.match(/\/d\/([^\/]+)\//)?.[1];
  if (!fileId) return data.file_url;
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w500`;
}

// ── Download de imagem via sessão autenticada ──────────────────────────────────

async function baixarImagem(page, src) {
  const bytes = await page.evaluate(async (url) => {
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      return [...new Uint8Array(buf)];
    } catch (e) { return null; }
  }, src);
  return bytes ? Buffer.from(bytes) : null;
}

// ── Coletar produtos COM foto de um grupo ─────────────────────────────────────
// Retorna apenas os que têm <input id="*btnFoto*"> na coluna td[8]

async function coletarProdutosComFoto(page, grupoValue) {
  await page.goto(`${BASE_OI}/wfProdutoBusca.aspx`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(1200);

  if (page.url().includes('Entrar') || page.url().includes('Login') || page.url().includes('CoreExterno')) {
    throw new Error('Sessão expirada');
  }

  await page.evaluate((val) => {
    const s = document.getElementById('ctl00_cph_ddlGrupoDeProduto');
    if (s) { s.value = val; s.dispatchEvent(new Event('change', { bubbles: true })); }
  }, grupoValue);
  await sleep(800);

  // Status "Com Estoque" para focar em produtos ativos
  await page.evaluate(() => {
    const s = document.getElementById('ctl00_cph_ddlStatusProduto');
    if (s) {
      const opt = Array.from(s.options).find(o => o.text.toUpperCase().includes('ESTOQUE'));
      if (opt) { s.value = opt.value; s.dispatchEvent(new Event('change', { bubbles: true })); }
    }
  });
  await sleep(400);

  await page.evaluate(() => {
    const btn = document.querySelector('#ctl00_cph_btnBuscar, input[id*="btnBuscar"]');
    if (btn) btn.click();
  });
  await sleep(4000);

  // Coleta apenas produtos que têm btnFoto na coluna td[8]
  return await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('#ctl00_cph_grd tr')).slice(1);
    const found = [];
    for (const tr of rows) {
      const tds = Array.from(tr.querySelectorAll('td'));
      if (tds.length < 9) continue;
      const btnFoto = tds[8].querySelector('input[id*="btnFoto"]');
      if (!btnFoto) continue;

      const link = tr.querySelector('a[onclick*="ProdutoID"], a[href*="ProdutoID"]');
      const src = (link?.href || '') + (link?.getAttribute('onclick') || '');
      const pid = src.match(/ProdutoID=([^&'"]+)/)?.[1];
      const eid = src.match(/EmpresaID=([^&'"]+)/)?.[1];
      const desc = tds[2]?.innerText?.trim() || '';
      if (!pid || !eid || !desc) continue;

      found.push({
        desc,
        produtoId: decodeURIComponent(pid),
        empresaId: decodeURIComponent(eid),
      });
    }
    return found;
  });
}

// ── Download de imagem (S3 via Node https, interno via Puppeteer fetch) ───────

async function downloadImagem(browser, imgUrl) {
  if (imgUrl.includes('amazonaws.com') || imgUrl.includes('s3.')) {
    try {
      return await new Promise((resolve, reject) => {
        const mod = imgUrl.startsWith('https') ? require('https') : require('http');
        mod.get(imgUrl, res => {
          if (res.statusCode !== 200) { resolve(null); return; }
          const chunks = [];
          res.on('data', c => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
          res.on('error', reject);
        }).on('error', reject);
      });
    } catch (e) {
      log(`  ⚠️  S3 download falhou: ${e.message.slice(0, 60)}`);
      return null;
    }
  }
  // URL interna OI: usa sessão do browser (cookies compartilhados)
  const pg = await browser.newPage();
  try {
    const bytes = await pg.evaluate(async (url) => {
      try {
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) return null;
        return [...new Uint8Array(await res.arrayBuffer())];
      } catch { return null; }
    }, imgUrl);
    return bytes ? Buffer.from(bytes) : null;
  } finally {
    await pg.close().catch(() => {});
  }
}

// ── Buscar TODAS as URLs de foto via aba Fotos e Documentos ──────────────────

async function buscarFotos(browser, empresaId, produtoId) {
  const pg = await browser.newPage();
  await pg.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
  pg.on('dialog', async d => { try { await d.dismiss(); } catch (e) {} });
  try {
    const url = `${BASE_OI}/wfProduto.aspx?EmpresaID=${encodeURIComponent(empresaId)}&ProdutoID=${encodeURIComponent(produtoId)}`;
    await pg.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(800);

    await pg.evaluate(() => {
      const tab = document.getElementById('__tab_tab_tabDocumento');
      if (tab) tab.click();
    });
    await sleep(1500);

    return await pg.evaluate((base) => {
      const links = Array.from(document.querySelectorAll('[id*="lkbVisualizar"]'));
      const urls = [];
      for (const a of links) {
        const onclick = a.getAttribute('onclick') || '';
        const match = onclick.match(/fncNovaAba\('([^']+)'\)/);
        if (!match) continue;
        const caminho = match[1];
        if (!/\.(png|jpg|jpeg|gif|webp)(\?|$)/i.test(caminho)) continue;
        urls.push(caminho.startsWith('http') ? caminho : `${base}${caminho}`);
      }
      return urls;
    }, BASE_OI);
  } catch (e) {
    log(`  ⚠️  Erro ProdutoID ${produtoId.slice(0, 20)}: ${e.message.slice(0, 60)}`);
    return [];
  } finally {
    await pg.close().catch(() => {});
  }
}

// ── Login ──────────────────────────────────────────────────────────────────────

async function login(browser) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
  await page.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });
  page.on('dialog', async d => { try { await d.dismiss(); } catch (e) {} });

  await page.goto(`${BASE_OI}/Entrar.aspx?sair=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(2000);
  await page.type('#Login1_UserName', OI_EMAIL, { delay: 40 });
  await page.type('#Login1_Password', OI_SENHA, { delay: 40 });
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
    page.click('#Login1_btnEntrar'),
  ]);
  await sleep(2000);
  log('Login: ' + page.url());
  return page;
}

// ── Principal ──────────────────────────────────────────────────────────────────

(async () => {
  log(`Sync de fotos de pneus — ${FORCE ? 'MODO FORCE' : 'apenas sem foto'}`);

  // 1. Busca produtos sem foto no Supabase
  let query = supabase.from('estoque_pneus').select('id, descricao, grupo, loja');
  if (!FORCE) query = query.is('foto_url', null);
  const { data: semFoto, error: dbErr } = await query;
  if (dbErr) { log('❌ Erro BD: ' + dbErr.message); process.exit(1); }
  if (!semFoto?.length) { log('✅ Todos os produtos já têm foto!'); process.exit(0); }

  const porLoja = semFoto.reduce((a, p) => { a[p.loja] = (a[p.loja] || 0) + 1; return a; }, {});
  log(`${semFoto.length} produto(s) sem foto: ${Object.entries(porLoja).map(([l, n]) => `${l}=${n}`).join(', ')}`);

  // Índice: descricao → {id, loja}
  const semFotoMap = new Map(semFoto.map(p => [p.descricao.toUpperCase(), { id: p.id, loja: p.loja }]));

  // 2. Conecta ao OI
  let browser;
  let connected = false;
  try {
    const res = await fetch('http://localhost:9222/json/version');
    const data = await res.json();
    browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl, defaultViewport: null });
    connected = true;
    log('Conectado ao Chrome existente (porta 9222)');
  } catch (e) {
    log('Chrome 9222 não disponível, lançando headless...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-blink-features=AutomationControlled'],
      defaultViewport: { width: 1280, height: 900 },
    });
  }

  let page;
  try {
    page = await login(browser);
  } catch (e) {
    log('❌ Falha no login: ' + e.message);
    connected ? browser.disconnect() : await browser.close();
    process.exit(1);
  }

  page.on('dialog', async d => { try { await d.dismiss(); } catch (e) {} });

  // 3. Lista grupos de pneu
  await page.goto(`${BASE_OI}/wfProdutoBusca.aspx`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(1200);

  const gruposPneu = await page.evaluate(() => {
    const s = document.getElementById('ctl00_cph_ddlGrupoDeProduto');
    return Array.from(s?.options || [])
      .map(o => ({ value: o.value, text: o.text.trim() }))
      .filter(o => o.text.toUpperCase().startsWith('PNEU IMPORTADO') || o.text.toUpperCase().startsWith('PNEU NACIONAL'));
  });
  log(`Grupos de pneu: ${gruposPneu.length}`);

  let processados = 0, comFoto = 0, semFotoOi = 0, erros = 0;

  try {
    for (const grupo of gruposPneu) {
      log(`→ Grupo: ${grupo.text}`);

      let produtosComFoto;
      try {
        produtosComFoto = await coletarProdutosComFoto(page, grupo.value);
      } catch (e) {
        log(`  ⚠️  Erro ao coletar grupo: ${e.message.slice(0, 80)}`);
        continue;
      }

      if (!produtosComFoto.length) {
        log(`   ○ Nenhum produto com foto neste grupo`);
        continue;
      }
      log(`   ${produtosComFoto.length} produto(s) com foto neste grupo`);

      for (const prod of produtosComFoto) {
        // Limpa descrição do OI: remove "()" vazios e espaços extras do final
        const descLimpa = prod.desc.replace(/\s*\(\s*\)\s*$/, '').trim();
        const descUp = descLimpa.toUpperCase();

        // Match exato, depois parcial (OI lista pode truncar em ~40 chars)
        let match = semFotoMap.get(descUp);
        if (!match) {
          // Testa também com a versão crua (sem limpeza)
          match = semFotoMap.get(prod.desc.toUpperCase());
        }
        if (!match) {
          for (const [dbDesc, info] of semFotoMap) {
            const minLen = Math.min(descUp.length, 40);
            if (dbDesc.startsWith(descUp.slice(0, minLen)) || descUp.startsWith(dbDesc.slice(0, minLen))) {
              match = info;
              break;
            }
          }
        }
        if (!match) {
          log(`  [skip] ${prod.desc.slice(0, 55)} — não encontrado no BD`);
          continue;
        }

        processados++;
        log(`  [${processados}] [${match.loja}] ${prod.desc.slice(0, 55)}`);

        const oiUrls = await buscarFotos(browser, prod.empresaId, prod.produtoId);
        if (!oiUrls.length) { semFotoOi++; log(`    ↳ Sem foto acessível no OI`); continue; }

        const driveUrls = [];
        for (let i = 0; i < oiUrls.length; i++) {
          const buf = await downloadImagem(browser, oiUrls[i]);
          if (!buf) continue;
          try {
            const url = await uploadToDrive(buf, `pneu-${match.id}-${i + 1}.jpg`);
            driveUrls.push(url);
          } catch (e) {
            log(`    ↳ ⚠️  Drive foto ${i + 1}: ${e.message.slice(0, 60)}`);
          }
        }

        if (!driveUrls.length) { erros++; log(`    ↳ ❌ Nenhuma foto enviada ao Drive`); continue; }

        const { error: upErr } = await supabase
          .from('estoque_pneus')
          .update({ foto_url: driveUrls.join(',') })
          .eq('id', match.id);

        if (upErr) {
          log(`    ↳ ❌ BD: ${upErr.message}`);
          erros++;
        } else {
          log(`    ↳ ✅ OK (${match.loja}) — ${driveUrls.length} foto(s)`);
          semFotoMap.delete(descUp);
          comFoto++;
        }

        await sleep(600);
      }

      await sleep(400);
    }
  } finally {
    await page.close().catch(() => {});
    if (connected) browser.disconnect(); else await browser.close().catch(() => {});
  }

  log('');
  log('=== RESULTADO ===');
  log(`Processados:       ${processados}`);
  log(`Fotos salvas:      ${comFoto}`);
  log(`Sem foto no OI:    ${semFotoOi}`);
  log(`Erros:             ${erros}`);
  log(`Ainda sem foto BD: ${semFoto.length - comFoto}`);
  log('Concluído.');
})().catch(err => { console.error('❌ Fatal:', err.message || err); process.exit(1); });
