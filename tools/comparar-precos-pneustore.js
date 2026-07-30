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

const ABA_COMPARATIVO  = 'Comparativo';
const ABA_RESUMO       = 'Resumo';
const SHEETS_ID_CACHE  = path.join(__dirname, '..', 'output', 'debug-bi', 'comparativo-sheets-id.json');

// Cores BR Pneus
const COR_PRETO   = { red: 0.10, green: 0.10, blue: 0.10 };
const COR_CINZA   = { red: 0.20, green: 0.20, blue: 0.20 };
const COR_AMARELO = { red: 0.96, green: 0.65, blue: 0.14 };
const COR_BRANCO  = { red: 1.00, green: 1.00, blue: 1.00 };
const COR_VERDE   = { red: 0.83, green: 0.93, blue: 0.85 };
const COR_AMAREL2 = { red: 1.00, green: 0.95, blue: 0.80 };
const COR_VERMELHO= { red: 0.97, green: 0.84, blue: 0.85 };
const COR_CINZAC  = { red: 0.95, green: 0.95, blue: 0.95 };
const COR_ALT     = { red: 0.98, green: 0.98, blue: 0.98 };

function getAuthClient() {
  let creds;
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
      'https://www.googleapis.com/auth/drive',
    ],
  });
}

async function obterOuCriarPlanilha(sheets, drive) {
  // 1) env var explícita
  if (process.env.COMPARATIVO_SHEETS_ID) return process.env.COMPARATIVO_SHEETS_ID;

  // 2) cache local
  if (fs.existsSync(SHEETS_ID_CACHE)) {
    try {
      const { id } = JSON.parse(fs.readFileSync(SHEETS_ID_CACHE, 'utf8'));
      if (id) { console.log(`  📋 Planilha existente: https://docs.google.com/spreadsheets/d/${id}`); return id; }
    } catch {}
  }

  // 3) criar nova planilha
  console.log('  📋 Criando nova planilha dedicada...');
  const resp = await sheets.spreadsheets.create({
    requestBody: { properties: { title: '📊 Comparativo de Preços — BR Pneus vs Pneu Store' } },
  });
  const id = resp.data.spreadsheetId;

  // Compartilhar com o usuário
  try {
    await drive.permissions.create({
      fileId: id,
      sendNotificationEmail: false,
      requestBody: { role: 'writer', type: 'user', emailAddress: 'marketing@redesmartcar.com.br' },
    });
    console.log('  ✅ Compartilhada com marketing@redesmartcar.com.br');
  } catch (e) {
    console.warn(`  ⚠️  Compartilhamento automático falhou (acesse manualmente): ${e.message}`);
  }

  // Salvar cache local
  fs.mkdirSync(path.dirname(SHEETS_ID_CACHE), { recursive: true });
  fs.writeFileSync(SHEETS_ID_CACHE, JSON.stringify({ id }, null, 2));

  console.log(`\n  🔗 LINK DA PLANILHA: https://docs.google.com/spreadsheets/d/${id}`);
  console.log(`  💡 Salve no .env e no GitHub Secrets: COMPARATIVO_SHEETS_ID=${id}\n`);
  return id;
}

async function garantirAba(sheets, planilhaId, titulo, cor) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: planilhaId });
  const existente = meta.data.sheets.find(s => s.properties.title === titulo);
  if (existente) return existente.properties.sheetId;
  const resp = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: planilhaId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: titulo, tabColor: cor } } }],
    },
  });
  return resp.data.replies[0].addSheet.properties.sheetId;
}

async function formatarAbaComparativo(sheets, planilhaId, sid, nRows) {
  const col = (start, end, px) => ({
    updateDimensionProperties: {
      range: { sheetId: sid, dimension: 'COLUMNS', startIndex: start, endIndex: end },
      properties: { pixelSize: px }, fields: 'pixelSize',
    },
  });
  const row = (start, end, px) => ({
    updateDimensionProperties: {
      range: { sheetId: sid, dimension: 'ROWS', startIndex: start, endIndex: end },
      properties: { pixelSize: px }, fields: 'pixelSize',
    },
  });
  const cf = (value, bg, idx) => ({
    addConditionalFormatRule: {
      rule: {
        ranges: [{ sheetId: sid, startRowIndex: 2, endRowIndex: nRows + 2, startColumnIndex: 10, endColumnIndex: 11 }],
        booleanRule: {
          condition: { type: 'TEXT_CONTAINS', values: [{ userEnteredValue: value }] },
          format: { backgroundColor: bg },
        },
      },
      index: idx,
    },
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: planilhaId,
    requestBody: {
      requests: [
        // Freeze linhas 1-2
        { updateSheetProperties: { properties: { sheetId: sid, gridProperties: { frozenRowCount: 2 } }, fields: 'gridProperties.frozenRowCount' } },
        // Mesclar título
        { mergeCells: { range: { sheetId: sid, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 12 }, mergeType: 'MERGE_ALL' } },
        // Estilo título
        {
          repeatCell: {
            range: { sheetId: sid, startRowIndex: 0, endRowIndex: 1 },
            cell: { userEnteredFormat: { backgroundColor: COR_PRETO, textFormat: { bold: true, fontSize: 13, foregroundColor: COR_AMARELO }, horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE' } },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
          },
        },
        // Estilo cabeçalho
        {
          repeatCell: {
            range: { sheetId: sid, startRowIndex: 1, endRowIndex: 2 },
            cell: { userEnteredFormat: { backgroundColor: COR_CINZA, textFormat: { bold: true, fontSize: 9, foregroundColor: COR_BRANCO }, horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE', wrapStrategy: 'WRAP' } },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)',
          },
        },
        // Banding (linhas alternadas)
        {
          addBanding: {
            bandedRange: {
              range: { sheetId: sid, startRowIndex: 2, endRowIndex: nRows + 2, startColumnIndex: 0, endColumnIndex: 12 },
              rowProperties: { firstBandColor: COR_BRANCO, secondBandColor: COR_ALT },
            },
          },
        },
        // Formato moeda colunas C–F (índices 2–5)
        {
          repeatCell: {
            range: { sheetId: sid, startRowIndex: 2, endRowIndex: nRows + 2, startColumnIndex: 2, endColumnIndex: 6 },
            cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '"R$" #,##0.00' } } },
            fields: 'userEnteredFormat.numberFormat',
          },
        },
        // Formato moeda diferença R$ colunas G, I (índices 6, 8)
        {
          repeatCell: {
            range: { sheetId: sid, startRowIndex: 2, endRowIndex: nRows + 2, startColumnIndex: 6, endColumnIndex: 7 },
            cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '"R$" #,##0.00;"-R$" #,##0.00' } } },
            fields: 'userEnteredFormat.numberFormat',
          },
        },
        {
          repeatCell: {
            range: { sheetId: sid, startRowIndex: 2, endRowIndex: nRows + 2, startColumnIndex: 8, endColumnIndex: 9 },
            cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '"R$" #,##0.00;"-R$" #,##0.00' } } },
            fields: 'userEnteredFormat.numberFormat',
          },
        },
        // Alinhamento centro nas colunas de números
        {
          repeatCell: {
            range: { sheetId: sid, startRowIndex: 2, endRowIndex: nRows + 2, startColumnIndex: 2, endColumnIndex: 12 },
            cell: { userEnteredFormat: { horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE' } },
            fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment)',
          },
        },
        // Larguras de colunas
        col(0, 1, 120),   // Medida
        col(1, 2, 210),   // Modelo
        col(2, 6, 108),   // Tab1-Tab3-PS
        col(6, 10, 95),   // Difs
        col(10, 11, 140), // Status
        col(11, 12, 100), // Data
        // Alturas de linhas
        row(0, 1, 32),    // título
        row(1, 2, 28),    // cabeçalho
        row(2, nRows + 2, 20), // dados
        // Formatação condicional status (coluna K = índice 10)
        cf('✅', COR_VERDE,    0),
        cf('🟡', COR_AMAREL2,  1),
        cf('🔴', COR_VERMELHO, 2),
        cf('—',  COR_CINZAC,   3),
      ],
    },
  });
}

async function formatarAbaResumo(sheets, planilhaId, sid) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: planilhaId,
    requestBody: {
      requests: [
        { mergeCells: { range: { sheetId: sid, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 3 }, mergeType: 'MERGE_ALL' } },
        {
          repeatCell: {
            range: { sheetId: sid, startRowIndex: 0, endRowIndex: 1 },
            cell: { userEnteredFormat: { backgroundColor: COR_PRETO, textFormat: { bold: true, fontSize: 12, foregroundColor: COR_AMARELO }, horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE' } },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
          },
        },
        {
          repeatCell: {
            range: { sheetId: sid, startRowIndex: 1, endRowIndex: 2 },
            cell: { userEnteredFormat: { backgroundColor: COR_CINZA, textFormat: { bold: true, foregroundColor: COR_BRANCO }, horizontalAlignment: 'CENTER' } },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
          },
        },
        { updateDimensionProperties: { range: { sheetId: sid, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 260 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId: sid, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 80 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId: sid, dimension: 'COLUMNS', startIndex: 2, endIndex: 3 }, properties: { pixelSize: 80 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId: sid, dimension: 'ROWS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 30 }, fields: 'pixelSize' } },
      ],
    },
  });
}

async function atualizarSheets(resultados, dataStr) {
  const authClient = getAuthClient();
  const sheets     = google.sheets({ version: 'v4', auth: authClient });
  const drive      = google.drive({ version: 'v3', auth: authClient });

  const planilhaId = await obterOuCriarPlanilha(sheets, drive);

  // Garantir abas
  const sidComp   = await garantirAba(sheets, planilhaId, ABA_COMPARATIVO, COR_AMARELO);
  const sidResumo = await garantirAba(sheets, planilhaId, ABA_RESUMO,      COR_PRETO);

  // Limpar
  await sheets.spreadsheets.values.clear({ spreadsheetId: planilhaId, range: `'${ABA_COMPARATIVO}'!A:Z` });
  await sheets.spreadsheets.values.clear({ spreadsheetId: planilhaId, range: `'${ABA_RESUMO}'!A:Z` });

  const dtDisplay = dataStr.split('-').reverse().join('/');

  // ── Aba Comparativo ──────────────────────────────────────────────────────────
  const header = ['Medida', 'Modelo', 'Tab1 (Combo)', 'Tab2 (PF/PJ)', 'Tab3 (Parc.)', 'Pneu Store', 'Dif. Tab1 R$', 'Dif. Tab1 %', 'Dif. Tab2 R$', 'Dif. Tab2 %', 'Status', 'Atualizado'];
  const rows = [
    [`Comparativo de Preços — BR Pneus & Oficina vs Pneu Store  |  Atualizado: ${dtDisplay}`],
    header,
    ...resultados.map(({ medida, modelo, tab1, tab2, tab3, precoPS }) => {
      const dif1   = precoPS !== null ? parseFloat((tab1 - precoPS).toFixed(2)) : '';
      const pct1   = precoPS !== null ? ((tab1 - precoPS) / precoPS * 100).toFixed(1) + '%' : '';
      const dif2   = precoPS !== null ? parseFloat((tab2 - precoPS).toFixed(2)) : '';
      const pct2   = precoPS !== null ? ((tab2 - precoPS) / precoPS * 100).toFixed(1) + '%' : '';
      const status = precoPS === null ? '—'
        : tab1 <= precoPS        ? '✅ Mais barato'
        : tab1 <= precoPS * 1.05 ? '🟡 Similar'
        : '🔴 Mais caro';
      return [medida, modelo, tab1, tab2, tab3, precoPS ?? '', dif1, pct1, dif2, pct2, status, dataStr];
    }),
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: planilhaId,
    range: `'${ABA_COMPARATIVO}'!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
  });

  // ── Aba Resumo ───────────────────────────────────────────────────────────────
  const found    = resultados.filter(r => r.precoPS !== null);
  const maisCaro = found.filter(r => r.tab1 > r.precoPS * 1.05);
  const maisBar  = found.filter(r => r.tab1 <= r.precoPS);
  const similar  = found.length - maisBar.length - maisCaro.length;
  const naoEnc   = resultados.filter(r => r.precoPS === null);
  const pct = (a, b) => b ? ((a / b) * 100).toFixed(1) + '%' : '—';

  await sheets.spreadsheets.values.update({
    spreadsheetId: planilhaId,
    range: `'${ABA_RESUMO}'!A1`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [
        [`Resumo — ${dtDisplay}`],
        ['Indicador', 'Qtd', '%'],
        ['Total de medidas na tabela', resultados.length, '100%'],
        ['Encontradas no Pneu Store', found.length, pct(found.length, resultados.length)],
        ['Não encontradas (moto/agrícola/raras)', naoEnc.length, pct(naoEnc.length, resultados.length)],
        ['', '', ''],
        ['Das encontradas:', '', ''],
        ['✅ Mais baratas (Tab1 ≤ Pneu Store)', maisBar.length, pct(maisBar.length, found.length)],
        ['🟡 Similares (Tab1 até 5% acima)', similar, pct(similar, found.length)],
        ['🔴 Mais caras (Tab1 > 5% acima)', maisCaro.length, pct(maisCaro.length, found.length)],
      ],
    },
  });

  // ── Formatação ───────────────────────────────────────────────────────────────
  await formatarAbaComparativo(sheets, planilhaId, sidComp, resultados.length);
  await formatarAbaResumo(sheets, planilhaId, sidResumo);

  return `https://docs.google.com/spreadsheets/d/${planilhaId}`;
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
