'use strict';
/**
 * tools/comparar-precos-pneustore.js
 *
 * Busca o menor preço de cada medida da tabela no site da Pneu Store
 * e atualiza uma planilha no Google Sheets + gera Excel local.
 *
 * Uso:
 *   node tools/comparar-precos-pneustore.js            # roda tudo
 *   node tools/comparar-precos-pneustore.js --limpar   # limpa cache do dia e re-scrapa
 *   node tools/comparar-precos-pneustore.js --teste    # só as primeiras 5 medidas de carro
 *   node tools/comparar-precos-pneustore.js --sheets   # só atualiza o Sheets (sem scraping)
 *
 * Env vars necessárias:
 *   GOOGLE_SERVICE_ACCOUNT_KEY   caminho para o arquivo JSON da service account (preferido)
 *   GOOGLE_SERVICE_ACCOUNT_JSON  JSON ou base64 da service account (fallback)
 *   COMPARATIVO_SHEETS_ID        ID da planilha de comparativo (cria na 1ª vez se vazio)
 *
 * Cache diário em output/debug-bi/pneustore-cache.json
 * Excel em output/relatorios/comparativo-precos-YYYY-MM-DD.xlsx
 */

require('dotenv').config();

const puppeteer  = require('puppeteer');
const ExcelJS    = require('exceljs');
const { google } = require('googleapis');
const path       = require('path');
const fs         = require('fs');

const { entradas } = require('../knowledge/tabela-precos.json');

const CACHE_FILE = path.join(__dirname, '..', 'output', 'debug-bi', 'pneustore-cache.json');
const OUTPUT_DIR = path.join(__dirname, '..', 'output', 'relatorios');
const SLEEP      = ms => new Promise(r => setTimeout(r, ms));

// ── Medidas ───────────────────────────────────────────────────────────────────

function parseMedida(medida) {
  const n = medida.replace(/\s+/g, '').toUpperCase();
  const car  = n.match(/^(\d+)\/(\d+)R(\d+)/);
  if (car)  return { largura: car[1], perfil: car[2], aro: car[3], tipo: 'carro' };
  const moto = n.match(/^(\d+)\/(\d+)-(\d+)/);
  if (moto) return { largura: moto[1], perfil: moto[2], aro: moto[3], tipo: 'moto' };
  return null;
}

function buildUrl({ largura, perfil, aro }) {
  return `https://www.pneustore.com.br/pneus?largura=${largura}&perfil=${perfil}&aro=${aro}&ordenacao=menorpreco`;
}

function normKey(medida) {
  return medida.replace(/\s+/g, '').replace(/R\s*(\d)/i, 'R$1').toUpperCase();
}

function parsePrice(str) {
  const m = str && str.match(/R\$\s*([\d.]+),(\d+)/);
  return m ? parseFloat(m[1].replace('.', '') + '.' + m[2]) : null;
}

// ── Scraping ──────────────────────────────────────────────────────────────────

async function scrapeUrl(page, url, key) {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await SLEEP(2500);
    const products = await page.evaluate(() => {
      const lines = document.body.innerText.split('\n').map(l => l.trim()).filter(Boolean);
      const out = [];
      for (let i = 0; i < lines.length; i++) {
        if (/\d+\/\d+[R\-]\d+/i.test(lines[i])) {
          const pr = lines.slice(i, i + 6).filter(l => /^R\$ [\d.,]+$/.test(l));
          if (pr.length >= 2) out.push({ nome: lines[i], precoVista: pr[1] });
        }
      }
      return out;
    });
    const matching = products.filter(p => p.nome.replace(/\s+/g, '').toUpperCase().includes(key));
    const prices = matching.map(p => parsePrice(p.precoVista)).filter(v => v !== null);
    return prices.length ? Math.min(...prices) : null;
  } catch { return null; }
}

// ── Google Sheets ─────────────────────────────────────────────────────────────

function getAuthClient() {
  let creds;

  // Tenta KEY_FILE primeiro (já tem APIs habilitadas no projeto)
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (keyPath && fs.existsSync(keyPath)) {
    let raw = fs.readFileSync(keyPath, 'utf8').replace(/^﻿/, '').trim();
    if (!raw.startsWith('{')) raw = Buffer.from(raw, 'base64').toString('utf8');
    creds = JSON.parse(raw);
  } else {
    const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!json) throw new Error('Defina GOOGLE_SERVICE_ACCOUNT_KEY ou GOOGLE_SERVICE_ACCOUNT_JSON no .env');
    try { creds = JSON.parse(json); }
    catch { creds = JSON.parse(Buffer.from(json.trim(), 'base64').toString('utf8')); }
  }

  return new google.auth.GoogleAuth({
    credentials: creds,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
    ],
  });
}

function getPlanilhaId() {
  const id = process.env.COMPARATIVO_SHEETS_ID || process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!id) throw new Error(
    'Defina COMPARATIVO_SHEETS_ID no .env com o ID de uma planilha compartilhada com a service account.\n' +
    '  1. Crie uma planilha no Google Sheets\n' +
    '  2. Compartilhe com o e-mail da service account (editor)\n' +
    '  3. Adicione no .env: COMPARATIVO_SHEETS_ID=<id da planilha>'
  );
  return id;
}

const ABA_COMPARATIVO = 'Comparativo Pneu Store';
const ABA_RESUMO      = 'Resumo Pneu Store';

async function garantirAba(sheets, sheetId, titulo) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const existente = meta.data.sheets.find(s => s.properties.title === titulo);
  if (existente) return existente.properties.sheetId;
  const resp = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: { requests: [{ addSheet: { properties: { title: titulo } } }] },
  });
  return resp.data.replies[0].addSheet.properties.sheetId;
}

async function atualizarSheets(resultados, dataStr) {
  const authClient = getAuthClient();
  const sheets     = google.sheets({ version: 'v4', auth: authClient });
  const sheetId    = getPlanilhaId();

  // Garantir que as abas existem
  await garantirAba(sheets, sheetId, ABA_COMPARATIVO);
  await garantirAba(sheets, sheetId, ABA_RESUMO);

  // Limpar só as abas do comparativo
  await sheets.spreadsheets.values.clear({ spreadsheetId: sheetId, range: `'${ABA_COMPARATIVO}'!A:Z` });
  await sheets.spreadsheets.values.clear({ spreadsheetId: sheetId, range: `'${ABA_RESUMO}'!A:Z` });

  // Montar dados
  const header = [
    'Medida', 'Modelo', 'Tab1 (Combo)', 'Tab2 (PF/PJ)', 'Tab3 (Parc.)',
    'Pneu Store (menor)', 'Dif. Tab1 R$', 'Dif. Tab1 %', 'Dif. Tab2 R$', 'Dif. Tab2 %',
    'Status', 'Atualizado em',
  ];

  const rows = [
    [`Comparativo BR Pneus vs Pneu Store — Atualizado: ${dataStr.split('-').reverse().join('/')}`],
    header,
    ...resultados.map(({ medida, modelo, tab1, tab2, tab3, precoPS }) => {
      const dif1   = precoPS !== null ? (tab1 - precoPS).toFixed(2) : '';
      const pct1   = precoPS !== null ? ((tab1 - precoPS) / precoPS * 100).toFixed(1) + '%' : '';
      const dif2   = precoPS !== null ? (tab2 - precoPS).toFixed(2) : '';
      const pct2   = precoPS !== null ? ((tab2 - precoPS) / precoPS * 100).toFixed(1) + '%' : '';
      const status = precoPS === null ? '—'
        : tab1 <= precoPS        ? '✅ Mais barato'
        : tab1 <= precoPS * 1.05 ? '🟡 Similar'
        : '🔴 Mais caro';
      return [medida, modelo, tab1, tab2, tab3, precoPS ?? '', dif1, pct1, dif2, pct2, status, dataStr];
    }),
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `'${ABA_COMPARATIVO}'!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: rows },
  });

  // Aba de resumo
  const found    = resultados.filter(r => r.precoPS !== null);
  const maisCaro = found.filter(r => r.tab1 > r.precoPS * 1.05);
  const maisBar  = found.filter(r => r.tab1 <= r.precoPS);
  const naoEnc   = resultados.filter(r => r.precoPS === null);

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `'${ABA_RESUMO}'!A1`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [
        [`Resumo — ${dataStr.split('-').reverse().join('/')}`],
        ['Indicador', 'Qtd', '%'],
        ['Total medidas', resultados.length, '100%'],
        ['Encontradas no Pneu Store', found.length, found.length ? ((found.length/resultados.length)*100).toFixed(1)+'%' : '—'],
        ['Não encontradas', naoEnc.length, naoEnc.length ? ((naoEnc.length/resultados.length)*100).toFixed(1)+'%' : '—'],
        ['', '', ''],
        ['✅ Mais baratas (Tab1 ≤ PS)', maisBar.length, found.length ? ((maisBar.length/found.length)*100).toFixed(1)+'%' : '—'],
        ['🟡 Similares (até 5% acima)', found.length - maisBar.length - maisCaro.length, ''],
        ['🔴 Mais caras (Tab1 > PS +5%)', maisCaro.length, found.length ? ((maisCaro.length/found.length)*100).toFixed(1)+'%' : '—'],
      ],
    },
  });

  return `https://docs.google.com/spreadsheets/d/${sheetId}`;
}

// ── Excel local ───────────────────────────────────────────────────────────────

async function gerarExcel(resultados, dataStr) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(OUTPUT_DIR, `comparativo-precos-${dataStr}.xlsx`);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Comparativo', { views: [{ state: 'frozen', ySplit: 2 }] });

  const COLS = [
    { header: 'Medida',         key: 'medida',  width: 16 },
    { header: 'Modelo',         key: 'modelo',  width: 34 },
    { header: 'Tab1 (Combo)',   key: 'tab1',    width: 14 },
    { header: 'Tab2 (PF/PJ)',   key: 'tab2',    width: 14 },
    { header: 'Tab3 (Parc.)',   key: 'tab3',    width: 14 },
    { header: 'Pneu Store',     key: 'precoPS', width: 14 },
    { header: 'Dif. Tab1 R$',  key: 'dif1',    width: 14 },
    { header: 'Dif. Tab1 %',   key: 'pct1',    width: 13 },
    { header: 'Dif. Tab2 R$',  key: 'dif2',    width: 14 },
    { header: 'Dif. Tab2 %',   key: 'pct2',    width: 13 },
    { header: 'Status',         key: 'status',  width: 18 },
  ];
  ws.columns = COLS;

  ws.mergeCells('A1:K1');
  const t = ws.getCell('A1');
  t.value = `Comparativo BR Pneus & Oficina vs Pneu Store — ${dataStr.split('-').reverse().join('/')}`;
  t.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A1A' } };
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 24;

  const hr = ws.getRow(2);
  COLS.forEach((col, i) => {
    const c = hr.getCell(i + 1);
    c.value = col.header;
    c.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = { bottom: { style: 'thin', color: { argb: 'FFF5A623' } } };
  });
  hr.height = 20;

  resultados.forEach(({ medida, modelo, tab1, tab2, tab3, precoPS }, idx) => {
    const dif1   = precoPS !== null ? tab1 - precoPS : null;
    const pct1   = dif1   !== null ? (dif1 / precoPS) * 100 : null;
    const dif2   = precoPS !== null ? tab2 - precoPS : null;
    const pct2   = dif2   !== null ? (dif2 / precoPS) * 100 : null;
    const status = precoPS === null ? '—'
      : tab1 <= precoPS       ? '✅ Mais barato'
      : tab1 <= precoPS * 1.05 ? '🟡 Similar'
      : '🔴 Mais caro';

    const row = ws.addRow({ medida, modelo, tab1, tab2, tab3,
      precoPS: precoPS ?? '', dif1: dif1 ?? '', pct1: pct1 ?? '',
      dif2: dif2 ?? '', pct2: pct2 ?? '', status });
    row.height = 17;

    const bg = idx % 2 === 0 ? 'FFFAFAFA' : 'FFF0F0F0';
    const bgS = status === '✅ Mais barato' ? 'FFD4EDDA'
              : status === '🟡 Similar'     ? 'FFFFF3CD'
              : status === '🔴 Mais caro'   ? 'FFF8D7DA' : bg;

    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font = { size: 9, name: 'Calibri' };
      cell.alignment = { vertical: 'middle', horizontal: col <= 2 ? 'left' : 'center' };
      cell.border = { top: { style: 'hair', color: { argb: 'FFCCCCCC' } }, bottom: { style: 'hair', color: { argb: 'FFCCCCCC' } }, left: { style: 'hair', color: { argb: 'FFCCCCCC' } }, right: { style: 'hair', color: { argb: 'FFCCCCCC' } } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: col >= 6 ? bgS : bg } };
      if ([3,4,5,6,7].includes(col) && typeof cell.value === 'number') cell.numFmt = 'R$ #,##0.00';
      if ([8,10].includes(col) && typeof cell.value === 'number') cell.numFmt = '#,##0.0"%"';
    });
  });

  await wb.xlsx.writeFile(outPath);
  return outPath;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const limpar    = process.argv.includes('--limpar');
  const teste     = process.argv.includes('--teste');
  const somenteSheets = process.argv.includes('--sheets');

  const dataStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());

  let cache = {};
  if (!limpar && fs.existsSync(CACHE_FILE)) {
    try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch {}
  }
  if (!cache[dataStr]) cache[dataStr] = {};
  const cacheHoje = cache[dataStr];

  // No modo --sheets, usa o cache do dia sem scraping
  if (somenteSheets) {
    const resultados = entradas.map(e => ({ ...e, precoPS: cacheHoje[e.medida] ?? null }));
    console.log('\n📤 Atualizando Google Sheets a partir do cache...');
    const url = await atualizarSheets(resultados, dataStr);
    console.log(`✅ Sheets atualizado: ${url}`);
    return;
  }

  // Filtrar medidas de carro para o modo --teste
  const lista = teste
    ? entradas.filter(e => e.medida.includes('R')).slice(0, 5)
    : entradas;

  console.log(`\n🔍 Comparativo de Preços — Pneu Store vs BR Pneus — ${dataStr}`);
  console.log(`   Medidas: ${lista.length}${teste ? ' (modo teste — só carros)' : ''} | Cache: ${Object.keys(cacheHoje).length} já consultadas\n`);

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page    = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36');

  const resultados = [];

  for (let i = 0; i < lista.length; i++) {
    const { medida, modelo, tab1, tab2, tab3 } = lista[i];
    process.stdout.write(`  [${String(i + 1).padStart(3)}/${lista.length}] ${medida.padEnd(16)}`);

    let precoPS;
    if (cacheHoje[medida] !== undefined) {
      precoPS = cacheHoje[medida];
      process.stdout.write(` (cache)`);
    } else {
      const parsed = parseMedida(medida);
      if (!parsed) {
        process.stdout.write(` ⚠️  formato desconhecido\n`);
        cacheHoje[medida] = null;
        resultados.push({ medida, modelo, tab1, tab2, tab3, precoPS: null });
        continue;
      }
      precoPS = await scrapeUrl(page, buildUrl(parsed), normKey(medida));
      cacheHoje[medida] = precoPS;
      fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
      await SLEEP(1500);
    }

    if (precoPS === null) {
      process.stdout.write(` ❌ não encontrado\n`);
    } else {
      const dif  = tab1 - precoPS;
      const pct  = ((dif / precoPS) * 100).toFixed(1);
      const icon = tab1 <= precoPS ? '✅' : tab1 <= precoPS * 1.05 ? '🟡' : '🔴';
      process.stdout.write(` ${icon} PS: R$${precoPS.toFixed(2)} | Tab1: R$${tab1} (${dif >= 0 ? '+' : ''}${dif.toFixed(0)} / ${pct}%)\n`);
    }

    resultados.push({ medida, modelo, tab1, tab2, tab3, precoPS });
  }

  await browser.close();

  // Excel local
  console.log('\n📊 Gerando Excel...');
  const xlsxPath = await gerarExcel(resultados, dataStr);
  console.log(`✅ Excel: ${xlsxPath}`);

  // Google Sheets
  console.log('\n📤 Atualizando Google Sheets...');
  try {
    const sheetUrl = await atualizarSheets(resultados, dataStr);
    console.log(`✅ Sheets: ${sheetUrl}`);
  } catch (e) {
    console.warn(`⚠️  Sheets falhou: ${e.message}`);
  }

  const found    = resultados.filter(r => r.precoPS !== null);
  const maisCaro = found.filter(r => r.tab1 > r.precoPS * 1.05);
  const maisBar  = found.filter(r => r.tab1 <= r.precoPS);
  console.log(`\n📈 Resumo:`);
  console.log(`   Encontradas no Pneu Store: ${found.length}/${resultados.length}`);
  console.log(`   ✅ Mais baratas (Tab1 ≤ PS): ${maisBar.length}`);
  console.log(`   🔴 Mais caras (Tab1 > PS +5%): ${maisCaro.length}`);
}

main().catch(e => { console.error('\n❌ Fatal:', e.message); process.exit(1); });
