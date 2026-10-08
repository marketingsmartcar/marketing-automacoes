#!/usr/bin/env node
'use strict';
/**
 * sincronizar-fotos-todas-lojas.js
 * Baixa fotos de pneus do OI (todas as lojas) → Google Drive → estoque_pneus.foto_url
 *
 * USO:
 *   node tools/sincronizar-fotos-todas-lojas.js
 *   node tools/sincronizar-fotos-todas-lojas.js --force   (re-baixa mesmo quem já tem foto)
 *
 * Pré-requisito:
 *   - Chrome aberto na porta 9222 com OI logado
 *   - .env com SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Como funciona:
 *   - Uma conta OI vê produtos das 4 lojas (BR01, BR03, BR04, PEG1)
 *   - Uma única passagem pelos grupos de pneu retorna produtos de todas as lojas
 *   - Só processa produtos sem foto_url (a menos que --force seja passado)
 *   - Integra naturalmente com o estoque: basta rodar periodicamente
 */

require('dotenv').config();
const puppeteer = require('puppeteer');
const fs        = require('fs');
const path      = require('path');
const { createClient } = require('@supabase/supabase-js');

// ── Config ─────────────────────────────────────────────────────────────────────

const WS_FILE    = 'C:/Users/Nick/AppData/Local/Temp/oi-browser-ws.txt';
const BASE_OI    = 'https://sistemaoficinainteligente.com.br';
const FORCE      = process.argv.includes('--force');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EDGE_DRIVE   = `${SUPABASE_URL}/functions/v1/upload-to-drive`;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function isGrupoPneu(grupo) {
  const g = (grupo || '').trim().toUpperCase();
  return g.startsWith('PNEU IMPORTADO') || g.startsWith('PNEU NACIONAL');
}

function log(msg) { console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Drive upload HTTP ${res.status}: ${txt.slice(0, 120)}`);
  }
  const data = await res.json();
  if (!data.success || !data.file_url) throw new Error('Drive retornou sem file_url: ' + JSON.stringify(data));

  const fileId = data.file_url.match(/\/d\/([^\/]+)\//)?.[1];
  if (!fileId) return data.file_url;
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

// ── Baixar imagem via sessão autenticada ───────────────────────────────────────

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

// ── Coletar produtos de um grupo no OI ────────────────────────────────────────

async function coletarProdutosDoGrupo(page, grupValor) {
  await page.goto(`${BASE_OI}/wfProdutoBusca.aspx`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(1500);

  if (page.url().includes('Entrar') || page.url().includes('Login')) {
    throw new Error('Sessão expirada — faça login no OI antes de rodar o script');
  }

  // Seleciona o grupo
  await page.evaluate((val) => {
    const s = document.getElementById('ctl00_cph_ddlGrupoDeProduto');
    if (s) { s.value = val; s.dispatchEvent(new Event('change', { bubbles: true })); if (s.onchange) s.onchange(); }
  }, grupValor);
  await sleep(1200);

  // Status "Ambos"
  await page.evaluate(() => {
    const s = document.getElementById('ctl00_cph_ddlStatusProduto');
    if (s) {
      const opt = Array.from(s.options).find(o => o.text.toUpperCase().includes('AMBOS'));
      if (opt) { s.value = opt.value; s.dispatchEvent(new Event('change', { bubbles: true })); }
    }
  });
  await sleep(400);

  // Buscar
  await page.evaluate(() => {
    const btn = document.querySelector('#ctl00_cph_btnBuscar, input[id*="btnBuscar"]');
    if (btn) btn.click();
  });
  await sleep(4000);

  // Coleta resultados: {desc, produtoId, empresaId}
  const produtos = await page.evaluate(() => {
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
  return produtos;
}

// ── Buscar foto de um produto ──────────────────────────────────────────────────

async function buscarFoto(browser, empresaId, produtoId) {
  const pg = await browser.newPage();
  pg.on('dialog', async d => { try { await d.dismiss(); } catch (e) {} });
  try {
    const url = `${BASE_OI}/wfProduto.aspx?EmpresaID=${encodeURIComponent(empresaId)}&ProdutoID=${encodeURIComponent(produtoId)}`;
    await pg.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(1000);

    const clicou = await pg.evaluate(() => {
      const tab = document.getElementById('__tab_tab_tabDocumento');
      if (tab) { tab.click(); return true; }
      const link = Array.from(document.querySelectorAll('a')).find(a => /fotos?/i.test(a.textContent?.trim()));
      if (link) { link.click(); return true; }
      return false;
    });
    if (!clicou) return null;
    await sleep(1200);

    const imgSrc = await pg.evaluate(() => {
      const panel = document.getElementById('tab_tabDocumento') || document;
      const imgs = Array.from(panel.querySelectorAll('img')).filter(img =>
        img.src &&
        img.naturalWidth > 50 &&
        !img.src.includes('spacer') &&
        !img.src.includes('logo') &&
        !img.src.includes('bg') &&
        !img.src.includes('btn') &&
        !img.src.includes('icon')
      );
      return imgs[0]?.src || null;
    });
    if (!imgSrc) return null;

    return await baixarImagem(pg, imgSrc);
  } catch (e) {
    log(`  ⚠️  Erro ao buscar foto de ProdutoID ${produtoId.slice(0, 20)}: ${e.message.slice(0, 60)}`);
    return null;
  } finally {
    await pg.close().catch(() => {});
  }
}

// ── Principal ──────────────────────────────────────────────────────────────────

(async () => {
  log(`Iniciando sincronização de fotos — ${FORCE ? 'MODO FORCE (re-baixa tudo)' : 'apenas sem foto'}`);

  // 1. Busca todos os produtos sem foto de todas as lojas
  let query = supabase.from('estoque_pneus').select('id, descricao, grupo, loja');
  if (!FORCE) {
    query = query.is('foto_url', null);
  }
  const { data: semFoto, error: dbErr } = await query;

  if (dbErr) { log('❌ Erro ao consultar banco: ' + dbErr.message); process.exit(1); }
  if (!semFoto?.length) { log('✅ Nenhum produto sem foto — tudo sincronizado!'); process.exit(0); }

  // Agrupa por loja para exibir resumo
  const porLoja = semFoto.reduce((acc, p) => { acc[p.loja] = (acc[p.loja] || 0) + 1; return acc; }, {});
  log(`📋 ${semFoto.length} produto(s) sem foto: ${Object.entries(porLoja).map(([l, n]) => `${l}=${n}`).join(', ')}`);

  // Mapa descrição → id (case insensitive) — cobre todas as lojas de uma vez
  const semFotoMap = new Map(semFoto.map(p => [p.descricao.toUpperCase(), { id: p.id, loja: p.loja }]));

  // 2. Conecta ao Chrome existente
  if (!fs.existsSync(WS_FILE)) {
    log('❌ Arquivo de WebSocket não encontrado. Chrome está aberto na porta 9222?');
    process.exit(1);
  }
  const ws = fs.readFileSync(WS_FILE, 'utf8').trim();
  const browser = await puppeteer.connect({ browserWSEndpoint: ws, defaultViewport: null });
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch (e) {} });

  let processados = 0, comFoto = 0, semFotoOi = 0, erros = 0;

  try {
    // 3. Lê grupos disponíveis no OI (uma passagem = todas as lojas)
    await page.goto(`${BASE_OI}/wfProdutoBusca.aspx`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(1500);

    if (page.url().includes('Entrar') || page.url().includes('Login')) {
      log('❌ Chrome não está logado no OI — faça login primeiro');
      browser.disconnect(); process.exit(1);
    }

    const gruposOI = await page.evaluate(() => {
      const s = document.getElementById('ctl00_cph_ddlGrupoDeProduto');
      return Array.from(s?.options || []).map(o => ({ value: o.value, text: o.text.trim() }));
    });

    const gruposPneu = gruposOI.filter(g => isGrupoPneu(g.text));
    log(`Grupos de pneu no OI: ${gruposPneu.length}`);

    if (!gruposPneu.length) {
      log('⚠️  Nenhum grupo de pneu encontrado — verifique se está logado no OI');
      browser.disconnect(); process.exit(1);
    }

    // 4. Para cada grupo, coleta produtos e baixa fotos dos que precisam
    for (const grupo of gruposPneu) {
      log(`→ Grupo: ${grupo.text}`);

      let produtosGrupo;
      try {
        produtosGrupo = await coletarProdutosDoGrupo(page, grupo.value);
      } catch (e) {
        log(`  ⚠️  Erro ao coletar grupo ${grupo.text}: ${e.message.slice(0, 80)}`);
        continue;
      }
      log(`   ${produtosGrupo.length} produtos no grupo`);

      for (const prod of produtosGrupo) {
        const descUp = prod.desc.toUpperCase();

        // Busca correspondência exata ou parcial (OI pode truncar ~40 chars na lista)
        let match = semFotoMap.get(descUp);
        if (!match) {
          for (const [dbDesc, info] of semFotoMap) {
            if (dbDesc.startsWith(descUp) || descUp.startsWith(dbDesc.slice(0, 35))) {
              match = info;
              break;
            }
          }
        }
        if (!match) continue;

        processados++;
        log(`  [${processados}/${semFoto.length}] [${match.loja}] ${prod.desc.slice(0, 55)}`);

        const imgBuffer = await buscarFoto(browser, prod.empresaId, prod.produtoId);
        if (!imgBuffer) { semFotoOi++; log(`    ↳ Sem foto no OI`); continue; }

        const fileName = `pneu-${match.id}.jpg`;
        let driveUrl;
        try {
          driveUrl = await uploadToDrive(imgBuffer, fileName);
        } catch (e) {
          log(`    ↳ ❌ Erro Drive: ${e.message.slice(0, 80)}`);
          erros++; continue;
        }

        const { error: upErr } = await supabase
          .from('estoque_pneus')
          .update({ foto_url: driveUrl })
          .eq('id', match.id);

        if (upErr) {
          log(`    ↳ ❌ Erro banco: ${upErr.message}`);
          erros++;
        } else {
          log(`    ↳ ✅ Foto salva (${match.loja})`);
          semFotoMap.delete(descUp);
          comFoto++;
        }

        await sleep(800);
      }

      await sleep(500);
    }

  } finally {
    await page.close().catch(() => {});
    browser.disconnect();
  }

  log('');
  log('=== RESULTADO ===');
  log(`Processados:    ${processados}`);
  log(`Fotos salvas:   ${comFoto}`);
  log(`Sem foto no OI: ${semFotoOi}`);
  log(`Erros:          ${erros}`);
  log(`Ainda sem foto: ${semFoto.length - comFoto}`);
  log('Pronto.');
})();
