#!/usr/bin/env node
'use strict';
/**
 * sincronizar-fotos-pneus-oi.js
 * Baixa fotos de pneus do OI → salva no Google Drive → atualiza estoque_pneus.foto_url
 *
 * USO:
 *   node tools/sincronizar-fotos-pneus-oi.js BR01
 *   node tools/sincronizar-fotos-pneus-oi.js BR03
 *   node tools/sincronizar-fotos-pneus-oi.js BR04
 *   node tools/sincronizar-fotos-pneus-oi.js PEG1
 *
 * Pré-requisito:
 *   1. Chrome aberto na porta 9222 (oi-browser-ws.txt existe)
 *   2. OI da loja especificada já está logado nessa sessão Chrome
 *   3. .env com SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL
 *
 * Comportamento:
 *   - Só processa produtos SEM foto_url no banco (não re-baixa os que já têm)
 *   - Navega por grupos de pneus no OI, coleta ProdutoID de cada item
 *   - Para cada produto correspondente no banco, acessa a aba Fotos e baixa a primeira
 *   - Faz upload ao Drive via edge function upload-to-drive
 *   - Salva a URL de thumbnail do Drive em estoque_pneus.foto_url
 */

require('dotenv').config();
const puppeteer  = require('puppeteer');
const fs         = require('fs');
const { createClient } = require('@supabase/supabase-js');

// ── Configuração ───────────────────────────────────────────────────────────────

const WS_FILE    = 'C:/Users/Nick/AppData/Local/Temp/oi-browser-ws.txt';
const BASE_OI    = 'https://sistemaoficinainteligente.com.br';
const LOJA       = (process.argv[2] || 'BR01').toUpperCase();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EDGE_DRIVE   = `${SUPABASE_URL}/functions/v1/upload-to-drive`;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Grupos de pneus que o sistema sincroniza (mesmo conjunto da edge function)
const GRUPOS_PNEU = new Set([
  'PNEU IMPORTADO (CURVA A)', 'PNEU IMPORTADO (PROMOCIONAL)', 'PNEU IMPORTADO AGRICOLA',
  'PNEU IMPORTADO ALL TERRAIN', 'PNEU IMPORTADO CAMIONETE', 'PNEU IMPORTADO CARGA LEVE',
  'PNEU IMPORTADO CARGA PESADA', 'PNEU IMPORTADO INDUSTRIAL', 'PNEU IMPORTADO MOTO',
  'PNEU IMPORTADO PASSEIO/SUV', 'PNEU IMPORTADO PERFIL BAIXO', 'PNEU IMPORTADO RUNFLAT',
  'PNEU NACIONAL AGRICOLA', 'PNEU NACIONAL ALL TERRAIN', 'PNEU NACIONAL CAMIONETE',
  'PNEU NACIONAL CARGA LEVE', 'PNEU NACIONAL CARGA PESADA', 'PNEU NACIONAL INDUSTRIAL',
  'PNEU NACIONAL MOTO', 'PNEU NACIONAL PASSEIO/SUV', 'PNEU NACIONAL PERFIL BAIXO',
  'PNEU NACIONAL RUNFLAT',
]);

function log(msg) { console.log(`[${new Date().toISOString().slice(11,19)}] [${LOJA}] ${msg}`); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Drive upload ───────────────────────────────────────────────────────────────

async function uploadToDrive(imageBuffer, fileName) {
  const blob     = new Blob([imageBuffer], { type: 'image/jpeg' });
  const form     = new FormData();
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

  // Extrai o ID e retorna URL de thumbnail pública
  const fileId = data.file_url.match(/\/d\/([^\/]+)\//)?.[1];
  if (!fileId) return data.file_url; // fallback
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

// ── Baixar imagem via página autenticada ───────────────────────────────────────

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

// ── Coletar produtos de um grupo via search page ───────────────────────────────

async function coletarProdutosDoGrupo(page, grupValor) {
  await page.goto(`${BASE_OI}/wfProdutoBusca.aspx`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(1500);

  const url = page.url();
  if (url.includes('Entrar') || url.includes('Login')) {
    throw new Error('Sessão expirada — faça login no OI antes de rodar o script');
  }

  // Seleciona o grupo
  await page.evaluate((val) => {
    const s = document.getElementById('ctl00_cph_ddlGrupoDeProduto');
    if (s) { s.value = val; s.dispatchEvent(new Event('change', { bubbles: true })); if (s.onchange) s.onchange(); }
  }, grupValor);
  await sleep(1200);

  // Status "Ambos" para ver ativos e inativos
  await page.evaluate(() => {
    const s = document.getElementById('ctl00_cph_ddlStatusProduto');
    if (s) {
      const opt = Array.from(s.options).find(o => o.text.toUpperCase().includes('AMBOS'));
      if (opt) { s.value = opt.value; s.dispatchEvent(new Event('change', { bubbles: true })); }
    }
  });
  await sleep(400);

  // Clica em Buscar
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

    // Clica na aba Fotos e Documentos
    const clicou = await pg.evaluate(() => {
      const tab = document.getElementById('__tab_tab_tabDocumento');
      if (tab) { tab.click(); return true; }
      // Fallback: procura por texto
      const link = Array.from(document.querySelectorAll('a')).find(a => /fotos?/i.test(a.textContent?.trim()));
      if (link) { link.click(); return true; }
      return false;
    });
    if (!clicou) return null;
    await sleep(1200);

    // Pega o src da primeira imagem válida no painel de fotos
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

    // Baixa a imagem usando a sessão autenticada
    const buffer = await baixarImagem(pg, imgSrc);
    return buffer;
  } catch (e) {
    log(`  ⚠️  Erro ao buscar foto do ProdutoID ${produtoId.slice(0, 20)}: ${e.message.slice(0, 60)}`);
    return null;
  } finally {
    await pg.close().catch(() => {});
  }
}

// ── Principal ──────────────────────────────────────────────────────────────────

(async () => {
  log(`Iniciando sincronização de fotos para ${LOJA}`);

  // 1. Busca produtos sem foto_url no banco
  const { data: semFoto, error: dbErr } = await supabase
    .from('estoque_pneus')
    .select('id, descricao, grupo')
    .eq('loja', LOJA)
    .is('foto_url', null)
    .gt('estoque', 0);

  if (dbErr) { log('❌ Erro ao consultar banco: ' + dbErr.message); process.exit(1); }
  if (!semFoto?.length) { log('✅ Nenhum produto sem foto — já está tudo sincronizado!'); process.exit(0); }

  log(`📋 ${semFoto.length} produtos sem foto para processar`);

  // Mapeia descrição → id para lookup rápido (case insensitive)
  const semFotoMap = new Map(semFoto.map(p => [p.descricao.toUpperCase(), p.id]));

  // 2. Conecta ao Chrome existente
  const ws = fs.readFileSync(WS_FILE, 'utf8').trim();
  const browser = await puppeteer.connect({ browserWSEndpoint: ws, defaultViewport: null });
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch (e) {} });

  let processados = 0, comFoto = 0, erros = 0;

  try {
    // 3. Vai ao OI e lê os grupos disponíveis no dropdown
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
    log(`Grupos no OI: ${gruposOI.length} encontrados`);

    // Filtra só os grupos que são de pneu
    const gruposPneu = gruposOI.filter(g => GRUPOS_PNEU.has(g.text));
    log(`Grupos de pneu: ${gruposPneu.length}`);

    if (!gruposPneu.length) {
      log('⚠️  Nenhum grupo de pneu encontrado no OI — verifique se está logado na loja correta');
      browser.disconnect(); process.exit(1);
    }

    // 4. Para cada grupo, coleta produtos e processa os que precisam de foto
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
        // Procura por correspondência exata ou parcial (OI pode truncar a descrição)
        let prodId = semFotoMap.get(descUp);
        if (!prodId) {
          // Tenta correspondência parcial (OI trunca no máximo ~40 chars na lista)
          for (const [dbDesc, id] of semFotoMap) {
            if (dbDesc.startsWith(descUp) || descUp.startsWith(dbDesc.slice(0, 35))) {
              prodId = id;
              break;
            }
          }
        }
        if (!prodId) continue; // não está na lista de sem-foto

        processados++;
        log(`  [${processados}/${semFoto.length}] ${prod.desc.slice(0, 50)}`);

        // Busca foto no produto
        const imgBuffer = await buscarFoto(browser, prod.empresaId, prod.produtoId);
        if (!imgBuffer) {
          log(`    ↳ Sem foto no OI`);
          continue;
        }

        // Faz upload ao Drive
        const fileName = `pneu-${prodId}.jpg`;
        let driveUrl;
        try {
          driveUrl = await uploadToDrive(imgBuffer, fileName);
        } catch (e) {
          log(`    ↳ ❌ Erro no upload Drive: ${e.message.slice(0, 80)}`);
          erros++;
          continue;
        }

        // Atualiza no banco
        const { error: upErr } = await supabase
          .from('estoque_pneus')
          .update({ foto_url: driveUrl })
          .eq('id', prodId);

        if (upErr) {
          log(`    ↳ ❌ Erro ao salvar no banco: ${upErr.message}`);
          erros++;
        } else {
          log(`    ↳ ✅ Foto salva`);
          semFotoMap.delete(descUp); // evita processar de novo se aparecer em outro grupo
          comFoto++;
        }

        await sleep(800); // pequena pausa entre produtos
      }

      await sleep(500); // pausa entre grupos
    }
  } finally {
    await page.close().catch(() => {});
    browser.disconnect();
  }

  log('');
  log('=== RESULTADO ===');
  log(`Processados:  ${processados}`);
  log(`Com foto:     ${comFoto}`);
  log(`Sem foto OI:  ${processados - comFoto - erros}`);
  log(`Erros:        ${erros}`);
  log(`Ainda sem foto no banco: ${semFoto.length - comFoto}`);
  log('Pronto.');
})();
