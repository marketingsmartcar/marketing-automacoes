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

function buildUrl(medida) {
  // Converte "175/65 R 14" → "175/65R14" (formato usado pelo filtro do Pneu Store)
  const psMedida = medida.replace(/\s+/g, '');
  return `https://www.pneustore.com.br/pneus?page=1&Medida=${encodeURIComponent(psMedida)}&ordenacao=menorpreco`;
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
const COR_VERDE   = { red: 0.82, green: 0.95, blue: 0.84 };
const COR_AMAREL2 = { red: 1.00, green: 0.95, blue: 0.75 };
const COR_VERMELHO= { red: 0.98, green: 0.82, blue: 0.83 };
const COR_CINZAC  = { red: 0.95, green: 0.95, blue: 0.95 };
const COR_ALT     = { red: 0.98, green: 0.98, blue: 0.98 };
const COR_SEC_BG  = { red: 0.13, green: 0.13, blue: 0.13 };  // fundo seção
const COR_SEC_TX  = { red: 0.96, green: 0.65, blue: 0.14 };  // texto seção (amarelo)

const SECAO_LABELS = {
  'PASSEIO':     'PASSEIO / SUV / PERFIL BAIXO / CAMIONETE / ALL TERRAIN / CARGA LEVE / RUNFLAT',
  'CAMINHÃO':    'CAMINHÃO / ÔNIBUS / CARGA MÉDIA  (Montamos o ARO 16)',
  'EMPILHADEIRA':'EMPILHADEIRA / INDUSTRIAL / RETROESCAVADEIRA  (NÃO montamos em loja)',
  'AGRÍCOLA':    'AGRÍCOLA',
  'MOTO':        'MOTO  (NÃO montamos em loja)',
};

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

async function formatarAbaComparativo(sheets, planilhaId, sid, totalRows, secaoRows) {
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
  // CF na linha inteira baseado no status (col K = índice 10)
  const cf = (value, bg, idx) => ({
    addConditionalFormatRule: {
      rule: {
        ranges: [{ sheetId: sid, startRowIndex: 2, endRowIndex: totalRows + 2, startColumnIndex: 0, endColumnIndex: 12 }],
        booleanRule: {
          condition: { type: 'TEXT_CONTAINS', values: [{ userEnteredValue: value }] },
          format: { backgroundColor: bg },
        },
      },
      index: idx,
    },
  });

  // Remove banding existente antes de aplicar novamente
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: planilhaId, includeGridData: false });
    const sheetMeta = meta.data.sheets.find(s => s.properties.sheetId === sid);
    const bandings = sheetMeta && sheetMeta.bandedRanges;
    if (bandings && bandings.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: planilhaId,
        requestBody: { requests: bandings.map(b => ({ deleteBanding: { bandedRangeId: b.bandedRangeId } })) },
      });
    }
  } catch {}

  // Remove formatação condicional existente
  try {
    const meta2 = await sheets.spreadsheets.get({ spreadsheetId: planilhaId, includeGridData: false });
    const sheetMeta2 = meta2.data.sheets.find(s => s.properties.sheetId === sid);
    const cfRules = sheetMeta2 && sheetMeta2.conditionalFormats;
    if (cfRules && cfRules.length > 0) {
      const delRequests = cfRules.map((_, i) => ({ deleteConditionalFormatRule: { sheetId: sid, index: 0 } }));
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: planilhaId,
        requestBody: { requests: delRequests },
      });
    }
  } catch {}

  const requests = [
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
          range: { sheetId: sid, startRowIndex: 2, endRowIndex: totalRows + 2, startColumnIndex: 0, endColumnIndex: 12 },
          rowProperties: { firstBandColor: COR_BRANCO, secondBandColor: COR_ALT },
        },
      },
    },
    // Formato moeda colunas C–F (índices 2–5)
    {
      repeatCell: {
        range: { sheetId: sid, startRowIndex: 2, endRowIndex: totalRows + 2, startColumnIndex: 2, endColumnIndex: 6 },
        cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '"R$" #,##0.00' } } },
        fields: 'userEnteredFormat.numberFormat',
      },
    },
    // Formato moeda diferença R$ colunas G, I (índices 6, 8)
    {
      repeatCell: {
        range: { sheetId: sid, startRowIndex: 2, endRowIndex: totalRows + 2, startColumnIndex: 6, endColumnIndex: 7 },
        cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: 'R$ #,##0.00;"-"R$ #,##0.00' } } },
        fields: 'userEnteredFormat.numberFormat',
      },
    },
    {
      repeatCell: {
        range: { sheetId: sid, startRowIndex: 2, endRowIndex: totalRows + 2, startColumnIndex: 8, endColumnIndex: 9 },
        cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: 'R$ #,##0.00;"-"R$ #,##0.00' } } },
        fields: 'userEnteredFormat.numberFormat',
      },
    },
    // Formato % nas colunas H e J (índices 7, 9) — valor numérico ex: 7.1 → "7,1%"
    {
      repeatCell: {
        range: { sheetId: sid, startRowIndex: 2, endRowIndex: totalRows + 2, startColumnIndex: 7, endColumnIndex: 8 },
        cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '#,##0.0"%"' }, textFormat: { bold: true } } },
        fields: 'userEnteredFormat(numberFormat,textFormat)',
      },
    },
    {
      repeatCell: {
        range: { sheetId: sid, startRowIndex: 2, endRowIndex: totalRows + 2, startColumnIndex: 9, endColumnIndex: 10 },
        cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '#,##0.0"%"' }, textFormat: { bold: true } } },
        fields: 'userEnteredFormat(numberFormat,textFormat)',
      },
    },
    // Alinhamento centro nas colunas de números
    {
      repeatCell: {
        range: { sheetId: sid, startRowIndex: 2, endRowIndex: totalRows + 2, startColumnIndex: 2, endColumnIndex: 12 },
        cell: { userEnteredFormat: { horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE' } },
        fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment)',
      },
    },
    // Larguras de colunas
    col(0, 1, 120),   // Medida
    col(1, 2, 220),   // Modelo
    col(2, 6, 110),   // Tab1-Tab3-PS
    col(6, 8, 100),   // Dif Tab1 R$ e %
    col(8, 10, 100),  // Dif Tab2 R$ e %
    col(10, 11, 150), // Status
    col(11, 12, 100), // Data
    // Alturas de linhas
    row(0, 1, 34),    // título
    row(1, 2, 30),    // cabeçalho
    row(2, totalRows + 2, 20), // dados
    // Formatação condicional: linha inteira colorida por status
    cf('✅', COR_VERDE,    0),
    cf('🟡', COR_AMAREL2,  1),
    cf('🔴', COR_VERMELHO, 2),
    cf('—',  COR_CINZAC,   3),
  ];

  // Gradiente no % Tab1 (col H = índice 7): verde=barato, branco=0%, vermelho=caro
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [{ sheetId: sid, startRowIndex: 2, endRowIndex: totalRows + 2, startColumnIndex: 7, endColumnIndex: 8 }],
        gradientRule: {
          minpoint: { colorStyle: { rgbColor: { red: 0.56, green: 0.85, blue: 0.64 } }, type: 'NUMBER', value: '-20' },
          midpoint: { colorStyle: { rgbColor: COR_BRANCO }, type: 'NUMBER', value: '0' },
          maxpoint: { colorStyle: { rgbColor: { red: 0.96, green: 0.50, blue: 0.50 } }, type: 'NUMBER', value: '30' },
        },
      },
      index: 4,
    },
  });

  await sheets.spreadsheets.batchUpdate({ spreadsheetId: planilhaId, requestBody: { requests } });

  // Formatar linhas de seção (separadores por categoria)
  if (secaoRows && secaoRows.length > 0) {
    const secRequests = [];
    for (const rowIdx of secaoRows) {
      secRequests.push({
        mergeCells: {
          range: { sheetId: sid, startRowIndex: rowIdx, endRowIndex: rowIdx + 1, startColumnIndex: 0, endColumnIndex: 12 },
          mergeType: 'MERGE_ALL',
        },
      });
      secRequests.push({
        repeatCell: {
          range: { sheetId: sid, startRowIndex: rowIdx, endRowIndex: rowIdx + 1 },
          cell: {
            userEnteredFormat: {
              backgroundColor: COR_SEC_BG,
              textFormat: { bold: true, fontSize: 10, foregroundColor: COR_SEC_TX },
              horizontalAlignment: 'LEFT',
              verticalAlignment: 'MIDDLE',
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
        },
      });
      secRequests.push(row(rowIdx, rowIdx + 1, 26));
    }
    await sheets.spreadsheets.batchUpdate({ spreadsheetId: planilhaId, requestBody: { requests: secRequests } });
  }
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

async function atualizarSheets(resultados, dtDisplay) {
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

  // ── Aba Comparativo: monta linhas com separadores por categoria ──────────────
  const header = ['Medida', 'Modelo', 'Tab1 (Combo)', 'Tab2 (PF/PJ)', 'Tab3 (Parc.)', 'Pneu Store', 'Dif. Tab1 R$', 'Dif. Tab1 %', 'Dif. Tab2 R$', 'Dif. Tab2 %', 'Status', 'Atualizado'];
  const dataRows = [];
  const secaoRowIndices = []; // índices absolutos (0-based) dentro de dataRows onde ficam os cabeçalhos de seção
  let categoriaAtual = null;

  for (const { medida, modelo, tab1, tab2, tab3, precoPS, categoria } of resultados) {
    if (categoria && categoria !== categoriaAtual) {
      categoriaAtual = categoria;
      secaoRowIndices.push(dataRows.length); // posição ANTES de adicionar a linha de seção
      dataRows.push([SECAO_LABELS[categoria] || `▸ ${categoria}`, '', '', '', '', '', '', '', '', '', '', '']);
    }
    const dif1   = precoPS !== null ? parseFloat((tab1 - precoPS).toFixed(2)) : '';
    const pct1   = precoPS !== null ? parseFloat(((tab1 - precoPS) / precoPS * 100).toFixed(1)) : '';
    const dif2   = precoPS !== null ? parseFloat((tab2 - precoPS).toFixed(2)) : '';
    const pct2   = precoPS !== null ? parseFloat(((tab2 - precoPS) / precoPS * 100).toFixed(1)) : '';
    const status = precoPS === null ? '—'
      : tab1 <= precoPS        ? '✅ Mais barato'
      : tab1 <= precoPS * 1.05 ? '🟡 Similar'
      : '🔴 Mais caro';
    dataRows.push([medida, modelo, tab1, tab2, tab3, precoPS ?? '', dif1, pct1, dif2, pct2, status, dtDisplay]);
  }

  const rows = [
    [`Comparativo de Preços — BR Pneus & Oficina vs Pneu Store  |  Atualizado: ${dtDisplay}`],
    header,
    ...dataRows,
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
        ['Total de entradas na tabela', resultados.length, '100%'],
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

  // ── Formatação (secaoRowIndices são offset +2 por título+cabeçalho) ──────────
  const secaoAbsolutos = secaoRowIndices.map(i => i + 2);
  await formatarAbaComparativo(sheets, planilhaId, sidComp, dataRows.length, secaoAbsolutos);
  await formatarAbaResumo(sheets, planilhaId, sidResumo);

  return `https://docs.google.com/spreadsheets/d/${planilhaId}`;
}

// ── Excel local ───────────────────────────────────────────────────────────────

async function gerarExcel(resultados, dtDisplay, dataStr) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(OUTPUT_DIR, `comparativo-precos-${dataStr}.xlsx`);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Comparativo', { views: [{ state: 'frozen', ySplit: 2 }] });

  const COLS = [
    { header: 'Medida',        key: 'medida',  width: 16 },
    { header: 'Modelo',        key: 'modelo',  width: 36 },
    { header: 'Tab1 (Combo)',  key: 'tab1',    width: 13 },
    { header: 'Tab2 (PF/PJ)', key: 'tab2',    width: 13 },
    { header: 'Tab3 (Parc.)', key: 'tab3',    width: 13 },
    { header: 'Pneu Store',   key: 'precoPS', width: 13 },
    { header: 'Dif. Tab1 R$', key: 'dif1',    width: 13 },
    { header: 'Dif. Tab1 %',  key: 'pct1',    width: 12 },
    { header: 'Dif. Tab2 R$', key: 'dif2',    width: 13 },
    { header: 'Dif. Tab2 %',  key: 'pct2',    width: 12 },
    { header: 'Status',        key: 'status',  width: 18 },
  ];
  ws.columns = COLS;

  ws.mergeCells('A1:K1');
  const t = ws.getCell('A1');
  t.value = `Comparativo BR Pneus & Oficina vs Pneu Store — ${dtDisplay}`;
  t.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A1A' } };
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 26;

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

  let categoriaAtual = null;
  let rowIdx = 0;

  for (const { medida, modelo, tab1, tab2, tab3, precoPS, categoria } of resultados) {
    // Separador de seção
    if (categoria && categoria !== categoriaAtual) {
      categoriaAtual = categoria;
      const secRow = ws.addRow([SECAO_LABELS[categoria] || `▸ ${categoria}`]);
      ws.mergeCells(`A${secRow.number}:K${secRow.number}`);
      secRow.height = 22;
      secRow.eachCell({ includeEmpty: true }, cell => {
        cell.font = { bold: true, size: 10, color: { argb: 'FFF5A623' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF212121' } };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      });
    }

    const dif1   = precoPS !== null ? tab1 - precoPS : null;
    const pct1   = dif1 !== null ? (dif1 / precoPS) * 100 : null;
    const dif2   = precoPS !== null ? tab2 - precoPS : null;
    const pct2   = dif2 !== null ? (dif2 / precoPS) * 100 : null;
    const status = precoPS === null ? '—'
      : tab1 <= precoPS        ? '✅ Mais barato'
      : tab1 <= precoPS * 1.05 ? '🟡 Similar'
      : '🔴 Mais caro';

    const row = ws.addRow({ medida, modelo, tab1, tab2, tab3,
      precoPS: precoPS ?? '', dif1: dif1 ?? '', pct1: pct1 ?? '',
      dif2: dif2 ?? '', pct2: pct2 ?? '', status });
    row.height = 17;

    const bg = rowIdx % 2 === 0 ? 'FFFAFAFA' : 'FFF2F2F2';
    const bgS = status === '✅ Mais barato' ? 'FFD4EDDA'
              : status === '🟡 Similar'     ? 'FFFFF3CD'
              : status === '🔴 Mais caro'   ? 'FFF8D7DA' : bg;

    row.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cell.font = { size: 9, name: 'Calibri', bold: [8, 10].includes(colNum) };
      cell.alignment = { vertical: 'middle', horizontal: colNum <= 2 ? 'left' : 'center' };
      cell.border = {
        top:    { style: 'hair', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'hair', color: { argb: 'FFCCCCCC' } },
        left:   { style: 'hair', color: { argb: 'FFCCCCCC' } },
        right:  { style: 'hair', color: { argb: 'FFCCCCCC' } },
      };
      // Diff columns get status color, others get alternating
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colNum >= 7 ? bgS : bg } };
      if ([3,4,5,6,7].includes(colNum) && typeof cell.value === 'number') cell.numFmt = '"R$" #,##0.00';
      if ([8,10].includes(colNum) && typeof cell.value === 'number') cell.numFmt = '#,##0.0"%"';
    });
    rowIdx++;
  }

  await wb.xlsx.writeFile(outPath);
  return outPath;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const limpar    = process.argv.includes('--limpar');
  const teste     = process.argv.includes('--teste');
  const somenteSheets = process.argv.includes('--sheets');

  const dataStr   = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const dtDisplay = dataStr.split('-').reverse().join('/'); // DD/MM/YYYY

  let cache = {};
  if (!limpar && fs.existsSync(CACHE_FILE)) {
    try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch {}
  }
  if (!cache[dataStr]) cache[dataStr] = {};
  const cacheHoje = cache[dataStr];

  // No modo --sheets, usa o cache do dia sem scraping
  if (somenteSheets) {
    const resultados = entradas.map(e => ({ ...e, precoPS: cacheHoje[e.medida] !== undefined ? cacheHoje[e.medida] : null }));
    console.log('\n📤 Atualizando Google Sheets a partir do cache...');
    const url = await atualizarSheets(resultados, dtDisplay);
    console.log(`✅ Sheets atualizado: ${url}`);
    return;
  }

  // Filtrar medidas de carro para o modo --teste
  const lista = teste
    ? entradas.filter(e => e.medida.includes('R')).slice(0, 5)
    : entradas;

  console.log(`\n🔍 Comparativo de Preços — Pneu Store vs BR Pneus — ${dtDisplay}`);
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
      precoPS = await scrapeUrl(page, buildUrl(medida), normKey(medida));
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
  const xlsxPath = await gerarExcel(resultados, dtDisplay, dataStr);
  console.log(`✅ Excel: ${xlsxPath}`);

  // Google Sheets
  console.log('\n📤 Atualizando Google Sheets...');
  try {
    const sheetUrl = await atualizarSheets(resultados, dtDisplay);
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
