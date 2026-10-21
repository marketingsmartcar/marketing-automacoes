#!/usr/bin/env node
'use strict';
/**
 * sincronizar-fotos-headless.js
 * Baixa fotos de pneus do OI → Google Drive → estoque_pneus.foto_url
 *
 * Estratégia:
 *   1. Tenta conectar ao Chrome existente na porta 9222 (já logado no OI)
 *   2. Se não disponível: abre Chromium headless e faz login
 *      - Se OI mostrar tela de mensalidade (CoreExterno), tenta clicar via frames
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
const http = require('http');

const BASE_OI   = 'https://sistemaoficinainteligente.com.br';
const FORCE     = process.argv.includes('--force');
const OI_EMAIL  = process.env.OI_EMAIL;
const OI_SENHA  = process.env.OI_SENHA;

const SUPABASE_URL = process.env.NEXUSZ_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const EDGE_DRIVE   = `${SUPABASE_URL}/functions/v1/upload-to-drive`;

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ SUPABASE vars ausentes'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
function log(msg) { console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function isGrupoPneu(g) {
  const t = (g || '').trim().toUpperCase();
  return t.startsWith('PNEU IMPORTADO') || t.startsWith('PNEU NACIONAL');
}

// ── Chrome 9222 ────────────────────────────────────────────────────────────────

function getChromeWsUrl() {
  return new Promise(resolve => {
    const req = http.get('http://localhost:9222/json/version', res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve(JSON.parse(body).webSocketDebuggerUrl || null); } catch { resolve(null); }
      });
    });
    req.setTimeout(2000, () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
  });
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
  return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w500` : data.file_url;
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

// ── Tratar tela de mensalidade em atraso (CoreExterno.aspx) ───────────────────

async function tratarCoreExterno(page) {
  const url = page.url();
  if (!url.includes('CoreExterno') && !url.includes('MensalidadeAtraso')) return;

  log('⚠️  Tela de mensalidade detectada — tentando contornar via iframe...');
  await sleep(3000); // aguarda iframe carregar

  // Tenta clicar em qualquer botão/link dentro do iframe do aviso
  const frames = page.frames();
  for (const frame of frames) {
    const fUrl = frame.url();
    if (!fUrl.includes('MensalidadeAtraso') && !fUrl.includes('app.sistema')) continue;
    try {
      const clicou = await frame.evaluate(() => {
        const clickable = document.querySelector('button, input[type=button], input[type=submit], a[href], .btn, [onclick]');
        if (clickable) { clickable.click(); return true; }
        return false;
      });
      if (clicou) { log('  Clicou no botão do aviso'); await sleep(2000); break; }
    } catch { /* cross-origin pode bloquear */ }
  }

  // Aguarda possível navegação e verifica se saiu
  await sleep(2000);
  const urlDepois = page.url();
  if (urlDepois.includes('CoreExterno') || urlDepois.includes('MensalidadeAtraso')) {
    // Tenta navegar direto — pode funcionar se o servidor apenas mostrou aviso
    try {
      await page.goto(`${BASE_OI}/wfProdutoBusca.aspx`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await sleep(1000);
    } catch { /* ignora */ }
  }
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

  const urlAposLogin = page.url();
  if (urlAposLogin.includes('CoreExterno') || urlAposLogin.includes('MensalidadeAtraso')) {
    await tratarCoreExterno(page);
  }

  const urlFinal = page.url();
  if (urlFinal.includes('Entrar') || urlFinal.includes('Login')) {
    throw new Error('Login falhou — OI recusou credenciais ou mensalidade bloqueou sessão');
  }
  log('Login OK — URL: ' + urlFinal.split('/').pop());
}

// ── Coletar produtos de um grupo ──────────────────────────────────────────────

async function coletarProdutosDoGrupo(page, grupValor) {
  await page.goto(`${BASE_OI}/wfProdutoBusca.aspx`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(1500);

  if (page.url().includes('Entrar') || page.url().includes('Login')) {
    throw new Error('Sessão expirada');
  }

  await page.evaluate((val) => {
    const s = document.getElementById('ctl00_cph_ddlGrupoDeProduto');
    if (s) { s.value = val; s.dispatchEvent(new Event('change', { bubbles: true })); }
  }, grupValor);
  await sleep(800);

  await page.evaluate(() => {
    const btn = document.querySelector('#ctl00_cph_btnBuscar, input[id*="btnBuscar"]');
    if (btn) btn.click();
  });
  await sleep(4000);

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

    // Clica na aba Fotos/Documentos
    const clicou = await pg.evaluate(() => {
      const tab = document.getElementById('__tab_tab_tabDocumento');
      if (tab) { tab.click(); return true; }
      const link = Array.from(document.querySelectorAll('a'))
        .find(a => /foto|documento/i.test(a.textContent?.trim()));
      if (link) { link.click(); return true; }
      return false;
    });
    if (!clicou) return null;

    // Aguarda a base64 aparecer no DOM (OI renderiza async após clicar na aba)
    try {
      await pg.waitForSelector('#tab_tabDocumento img[src^="data:image/"]', { timeout: 5000 });
    } catch {
      return null; // produto sem foto
    }

    const bytes = await pg.evaluate(() => {
      const panel = document.getElementById('tab_tabDocumento') || document;
      const imgs = Array.from(panel.querySelectorAll('img[src^="data:image/"]')).filter(img => {
        if (!img.src || img.naturalWidth < 80 || img.naturalHeight < 80) return false;
        if (/qr|qrcode|barcode|codigo|codbarra/i.test(img.id + '|' + img.className)) return false;
        return true;
      });
      if (!imgs[0]) return null;
      const b64 = imgs[0].src.split(',')[1];
      if (!b64) return null;
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return Array.from(arr);
    });
    return bytes ? Buffer.from(bytes) : null;
  } catch (e) {
    log(`  ⚠️  Foto ${produtoId.slice(0,20)}: ${e.message.slice(0,60)}`);
    return null;
  } finally {
    await pg.close().catch(() => {});
  }
}

// ── Principal ──────────────────────────────────────────────────────────────────

(async () => {
  log(`=== Sync fotos pneus — ${FORCE ? 'FORCE' : 'somente sem foto'} ===`);

  // 1. Produtos sem foto
  let query = supabase.from('estoque_pneus').select('id, descricao, grupo, loja');
  if (!FORCE) query = query.is('foto_url', null);
  const { data: semFoto, error: dbErr } = await query;

  if (dbErr) { log('❌ Erro banco: ' + dbErr.message); process.exit(1); }
  if (!semFoto?.length) { log('✅ Nenhum produto sem foto'); process.exit(0); }

  const porLoja = semFoto.reduce((a, p) => { a[p.loja] = (a[p.loja] || 0) + 1; return a; }, {});
  log(`📋 ${semFoto.length} sem foto: ${Object.entries(porLoja).map(([l, n]) => `${l}=${n}`).join(', ')}`);

  const semFotoMap = new Map(semFoto.map(p => [p.descricao.toUpperCase(), { id: p.id, loja: p.loja }]));

  // 2. Conecta ao browser (Chrome 9222 ou headless)
  let browser, viaChrome9222 = false;

  const wsUrl = await getChromeWsUrl();
  if (wsUrl) {
    log('Conectando ao Chrome existente (porta 9222)...');
    try {
      browser = await puppeteer.connect({ browserWSEndpoint: wsUrl, defaultViewport: null });
      viaChrome9222 = true;
      log('Chrome conectado — sessão OI já ativa');
    } catch (e) {
      log('⚠️  Falha ao conectar na porta 9222: ' + e.message.slice(0, 60));
    }
  }

  if (!browser) {
    if (!OI_EMAIL || !OI_SENHA) { log('❌ OI_EMAIL / OI_SENHA ausentes no .env'); process.exit(1); }
    log('Chrome não disponível — iniciando Chromium headless...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
      ],
      defaultViewport: { width: 1280, height: 900 },
    });
    // Anti-detecção: remove navigator.webdriver e ajusta user-agent
    const antiBot = async (p) => {
      await p.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
      await p.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      });
    };
    browser.on('targetcreated', async t => {
      if (t.type() === 'page') { try { await antiBot(await t.page()); } catch {} }
    });
  }

  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch {} });
  if (!viaChrome9222) {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
  }

  let processados = 0, comFoto = 0, semFotoOI = 0, erros = 0;

  try {
    // 3. Login (só se não veio do Chrome 9222)
    if (!viaChrome9222) {
      await loginOI(page);
    }

    // 4. Grupos de pneu
    await page.goto(`${BASE_OI}/wfProdutoBusca.aspx`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(1500);

    const urlAtual = page.url();
    if (urlAtual.includes('Entrar') || urlAtual.includes('Login')) {
      throw new Error('Não está logado no OI — faça login no Chrome com --remote-debugging-port=9222');
    }

    const gruposOI = await page.evaluate(() => {
      const s = document.getElementById('ctl00_cph_ddlGrupoDeProduto');
      return Array.from(s?.options || []).map(o => ({ value: o.value, text: o.text.trim() }));
    });

    const gruposPneu = gruposOI.filter(g => isGrupoPneu(g.text));
    log(`Grupos de pneu: ${gruposPneu.length}`);

    // 5. Por grupo: coleta produtos e busca fotos
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
    await page.close().catch(() => {});
    if (viaChrome9222) {
      browser.disconnect(); // NUNCA fechar o Chrome existente
    } else {
      await browser.close().catch(() => {});
    }
  }

  log('');
  log(`=== Resultado: ${processados} processados, ${comFoto} fotos salvas, ${semFotoOI} sem foto no OI, ${erros} erros ===`);
})().catch(err => {
  console.error('❌ Falha fatal:', err.message || err);
  process.exit(1);
});
