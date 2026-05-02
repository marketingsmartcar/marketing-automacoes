/**
 * tools/preencher-vendas-diarias.js
 *
 * Preenche a aba "Vendas diárias" da planilha VENDA DO MÊS com os dados do dia.
 * A cada execução: detecta se o bloco do dia já existe; se não, duplica o bloco
 * template (linhas 1-22) para abaixo do último bloco e preenche os dados.
 *
 * Uso:
 *   node tools/preencher-vendas-diarias.js           # hoje
 *   node tools/preencher-vendas-diarias.js 2026-04-21 # data específica
 *
 * Pré-requisito: compartilhar a planilha com a service account como Editor:
 *   br-pneus-sheets@claude-code-493711.iam.gserviceaccount.com
 */

'use strict';
require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { google } = require('googleapis');

const SPREADSHEET_ID   = '1NFsBbu1MIG1Tl_XJc8VnhP8OVDupivbVxiYKpv8_mGw';
const SHEET_ID         = 1220160954;
const SHEET_NAME       = 'Vendas diárias';
const BLOCK_SIZE       = 22;   // linhas por bloco diário
const TOTAL_COLS       = 16;   // colunas A(0)…P(15)
const CREDENTIALS_PATH = path.join(__dirname, '..', 'credentials', 'google-sheets-key.json');

// ── Helpers de data ───────────────────────────────────────────────────────────

/** Converte Date em serial do Google Sheets (dias desde 30/12/1899). */
function toSheetSerial(date) {
  return Math.round(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
     Date.UTC(1899, 11, 30)) / 86400000
  );
}

/** Conta dias Seg–Sáb no intervalo [from, to] (1-indexed, inclusivo). */
function countWorkingDays(year, month, from, to) {
  let n = 0;
  for (let d = from; d <= to; d++) {
    if (new Date(year, month, d).getDay() !== 0) n++;
  }
  return n;
}

/** Último dia do mês. */
function lastDayOfMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

async function getAuth() {
  const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  return new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

// ── Planilha helpers ──────────────────────────────────────────────────────────

async function getSheetRowCount(sheets) {
  const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const s   = res.data.sheets.find(s => s.properties.sheetId === SHEET_ID);
  return s?.properties.gridProperties.rowCount ?? 0;
}

/**
 * Procura um bloco cujo C4 (offset 3 dentro do bloco) contenha todaySerial.
 * Blocos ficam em offsets 0, BLOCK_SIZE, 2*BLOCK_SIZE, …
 *
 * Retorna:
 *   blockStart — linha inicial (0-indexed) do bloco a usar
 *   isNew      — true se precisa criar (copiar template + inserir linhas)
 */
async function findOrReserveBlock(sheets, todaySerial) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!C:C`,
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  const colC = (res.data.values || []).map(r => (r && r[0] != null ? Number(r[0]) : null));

  let highestBlockEnd = BLOCK_SIZE; // fim do último bloco encontrado (0-indexed exclusive)
  let todayStart      = -1;

  // Seriais de datas dos anos 2020–2035 ficam entre ~43831 e ~49640
  // C4 de cada bloco está 3 linhas abaixo do início do bloco
  for (let i = 3; i < colC.length; i++) {
    const val = colC[i];
    if (!val || isNaN(val) || val < 43831 || val > 49640) continue;

    const blockStart = i - 3; // 0-indexed
    const blockEnd   = blockStart + BLOCK_SIZE;
    if (blockEnd > highestBlockEnd) highestBlockEnd = blockEnd;
    if (val === todaySerial) todayStart = blockStart;
  }

  if (todayStart >= 0) return { blockStart: todayStart, isNew: false };
  // Próximo bloco começa 1 linha após o fim do último (linha separadora em branco)
  // prevBlockStart = início do último bloco encontrado (para usar como fonte de cópia)
  const prevBlockStart = highestBlockEnd - BLOCK_SIZE;
  return { blockStart: highestBlockEnd + 1, isNew: true, prevBlockStart };
}

async function ensureRows(sheets, neededRows) {
  const current = await getSheetRowCount(sheets);
  if (current >= neededRows) return;
  const toAdd = neededRows - current;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        insertDimension: {
          range: {
            sheetId: SHEET_ID,
            dimension: 'ROWS',
            startIndex: current,
            endIndex:   current + toAdd,
          },
          inheritFromBefore: false,
        },
      }],
    },
  });
  console.log(`  Inseridas ${toAdd} linhas (total: ${current + toAdd})`);
}

/**
 * Limpa o cabeçalho (VENDA DO MÊS + cidades) e as células de input de dados
 * no bloco indicado. Preserva fórmulas (mark-up, totais, médias, coluna P).
 * Chamada tanto em novos blocos (pós-copy) quanto em blocos existentes (re-run).
 */
async function clearBlockCells(sheets, blockStart) {
  const R = off => blockStart + off + 1; // offset → linha 1-indexed para A1

  // Células de input de dados (G–O apenas; coluna P tem fórmulas =SUM e é preservada)
  const dataRanges = [
    `'${SHEET_NAME}'!G${R(5)}:O${R(5)}`,   // Faturamento
    `'${SHEET_NAME}'!G${R(6)}:O${R(6)}`,   // Lucro Bruto
    `'${SHEET_NAME}'!G${R(9)}:O${R(14)}`,  // OS tipos (Carro/Retira/Revisão × Porta/Agend)
    `'${SHEET_NAME}'!G${R(21)}:O${R(21)}`, // Pneu Vendidos
  ];

  await sheets.spreadsheets.values.batchClear({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { ranges: dataRanges },
  });
  console.log(`  Células limpas (dados)`);
}

/** Copia o bloco srcStart para destStart usando copyPaste.
 *  Fórmulas relativas são ajustadas automaticamente pela API. */
async function copyTemplateToBlock(sheets, destStart, srcStart = 0) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        copyPaste: {
          source: {
            sheetId:          SHEET_ID,
            startRowIndex:    srcStart,
            endRowIndex:      srcStart + BLOCK_SIZE,
            startColumnIndex: 0,
            endColumnIndex:   TOTAL_COLS,
          },
          destination: {
            sheetId:          SHEET_ID,
            startRowIndex:    destStart,
            endRowIndex:      destStart + BLOCK_SIZE,
            startColumnIndex: 0,
            endColumnIndex:   TOTAL_COLS,
          },
          pasteType:        'PASTE_NORMAL',
          pasteOrientation: 'NORMAL',
        },
      }],
    },
  });
  console.log(`  Template copiado (src L${srcStart + 1}) → linhas ${destStart + 1}–${destStart + BLOCK_SIZE}`);
}

// ── Escrita incremental por loja ──────────────────────────────────────────────

// Ordem das colunas G..O → BR1…PEG2
const STORE_KEYS = ['BR1','BR2','BR3','BR4','BR5','BR6','BR7','PEG1','PEG2'];
const COL_G      = 'G'.charCodeAt(0);

const DATA_FIELDS = [
  { off: 5,  field: 'faturamento'        },
  { off: 6,  field: 'lucroBruto'         },
  { off: 9,  field: 'carroPorta'         },
  { off: 10, field: 'retiraPorta'        },
  { off: 11, field: 'revisaoPorta'       },
  { off: 12, field: 'carroAgendamento'   },
  { off: 13, field: 'retiraAgendamento'  },
  { off: 14, field: 'revisaoAgendamento' },
  { off: 21, field: 'pneuVendidos'       },
];

async function writeStoreColumn(sheets, blockStart, storeKey, storeData) {
  const idx = STORE_KEYS.indexOf(storeKey);
  if (idx < 0) return;
  const col = String.fromCharCode(COL_G + idx);
  const R   = off => blockStart + off + 1;

  const updates = DATA_FIELDS.map(({ off, field }) => ({
    range:  `'${SHEET_NAME}'!${col}${R(off)}`,
    values: [[ storeData?.[field] ?? '' ]],
  }));

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { valueInputOption: 'USER_ENTERED', data: updates },
  });
  console.log(`  📊 ${storeKey} → planilha atualizada`);
}

// Offsets (dentro do bloco) das linhas separadoras vazias
const EMPTY_ROW_OFFSETS = [8, 15, 17, 20];

// Restaura bordas cinza padrão nas linhas Data/separador; borda grossa no topo do Faturamento
async function clearBlockHeaderFormatting(sheets, blockStart) {
  const grayColor = { red: 0.8, green: 0.8, blue: 0.8 };
  const thinGray  = { style: 'SOLID',       color: grayColor };
  const thickGray = { style: 'SOLID_THICK', color: grayColor };

  // Apenas offset 3-4 (linha Data + separador) — não toca título/lojas (offsets 0-2)
  const metaRange = {
    sheetId:          SHEET_ID,
    startRowIndex:    blockStart + 3,
    endRowIndex:      blockStart + 5,
    startColumnIndex: 6,   // G
    endColumnIndex:   16,  // P+1
  };

  // Linha do Faturamento (offset 5) — borda grossa no topo
  const fatTopRange = {
    sheetId:          SHEET_ID,
    startRowIndex:    blockStart + 5,
    endRowIndex:      blockStart + 6,
    startColumnIndex: 6,
    endColumnIndex:   16,
  };

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          updateBorders: {
            range:           metaRange,
            top:             thinGray,
            bottom:          thinGray,
            left:            thinGray,
            right:           thinGray,
            innerHorizontal: thinGray,
            innerVertical:   thinGray,
          },
        },
        {
          updateBorders: {
            range: fatTopRange,
            top:   thickGray,
          },
        },
      ],
    },
  });
}

// Define altura 10px nas linhas separadoras vazias do bloco
async function setEmptyRowHeights(sheets, blockStart) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: EMPTY_ROW_OFFSETS.map(off => ({
        updateDimensionProperties: {
          range: {
            sheetId:    SHEET_ID,
            dimension:  'ROWS',
            startIndex: blockStart + off,
            endIndex:   blockStart + off + 1,
          },
          properties: { pixelSize: 10 },
          fields: 'pixelSize',
        },
      })),
    },
  });
  console.log('  Linhas vazias → 10px');
}

const STORE_LABELS = [
  'BR1 Centro', 'BR2 V. Xavier', 'BR3 Americana', 'BR4 S. Carlos', 'BR5 Maringá',
  'Peg1 Araraquara', 'Peg2 Sorocaba', 'Rede',
];

async function writeBlockHeaders(sheets, blockStart) {
  const R = off => blockStart + off + 1;
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: `'${SHEET_NAME}'!G${R(0)}`,       values: [['VENDA DO MÊS']]     },
        { range: `'${SHEET_NAME}'!G${R(2)}:P${R(2)}`, values: [STORE_LABELS]      },
      ],
    },
  });
  console.log('  Cabeçalhos escritos (título + lojas)');
}

async function writeMeta(sheets, blockStart, date, diasTotal, diasFeitos) {
  const R = off => blockStart + off + 1;
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: `'${SHEET_NAME}'!C${R(0)}`, values: [[diasTotal]]           },
        { range: `'${SHEET_NAME}'!C${R(1)}`, values: [[diasFeitos]]          },
        { range: `'${SHEET_NAME}'!C${R(3)}`, values: [[toSheetSerial(date)]] },
      ],
    },
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const arg   = process.argv[2];
  // Sempre coleta o dia ANTERIOR (para estar disponível às 7h do dia seguinte)
  const today = arg ? new Date(arg + 'T12:00:00') : (() => {
    const d = new Date(); d.setDate(d.getDate() - 1); return d;
  })();
  const y = today.getFullYear(), m = today.getMonth(), d = today.getDate();
  const serial    = toSheetSerial(today);
  const dateStr   = `${String(d).padStart(2,'0')}/${String(m+1).padStart(2,'0')}/${y}`;
  const diasTotal  = countWorkingDays(y, m, 1, lastDayOfMonth(y, m));
  const diasFeitos = countWorkingDays(y, m, 1, d);

  console.log(`📅 ${dateStr}  |  Dias: ${diasFeitos}/${diasTotal}  |  Serial: ${serial}`);

  console.log('\n🔐 Autenticando...');
  const auth   = await getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  console.log('🔍 Localizando bloco na planilha...');
  const { blockStart, isNew, prevBlockStart } = await findOrReserveBlock(sheets, serial);

  if (isNew) {
    console.log(`\n➕ Criando bloco na linha ${blockStart + 1}`);
    await ensureRows(sheets, blockStart + BLOCK_SIZE);
    // Usa o bloco anterior como fonte (tem formato correto); fallback para template (linha 0)
    const srcStart = (prevBlockStart != null && prevBlockStart >= 0) ? prevBlockStart : 0;
    await copyTemplateToBlock(sheets, blockStart, srcStart);
  } else {
    console.log(`\n🔄 Bloco do dia ${dateStr} já existe na linha ${blockStart + 1} — atualizando`);
  }

  await clearBlockCells(sheets, blockStart);
  await clearBlockHeaderFormatting(sheets, blockStart);
  await setEmptyRowHeights(sheets, blockStart);
  await writeBlockHeaders(sheets, blockStart);
  await writeMeta(sheets, blockStart, today, diasTotal, diasFeitos);
  console.log('  Meta escrita (data, dias)');

  console.log('\n📡 Coletando OI — planilha atualiza a cada loja (~6 min)...\n');

  let oiData = null;
  try {
    const { getOIDataBrowser } = require('./scraper-oi-browser');
    oiData = await getOIDataBrowser(today, async (key, data) => {
      await writeStoreColumn(sheets, blockStart, key, data).catch(e =>
        console.warn(`  ⚠️ Falha ao escrever ${key}: ${e.message}`)
      );
    });
  } catch (err) {
    console.warn('⚠️  Scraper OI falhou:', err.message);
  }

  console.log(`\n✅ Concluído! Bloco ${dateStr} → linhas ${blockStart + 1}–${blockStart + BLOCK_SIZE}`);

  if (oiData) {
    const { notificarVendasDiarias } = require('./gerar-dashboard-vendas');
    await notificarVendasDiarias(oiData, dateStr).catch(e =>
      console.warn('⚠️  Notificação falhou:', e.message)
    );

    const { syncVendasOI } = require('./supabase-vendas-sync');
    await syncVendasOI(today, oiData).catch(e =>
      console.warn('⚠️  Supabase sync falhou:', e.message)
    );
  }
  console.log(`   https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit#gid=${SHEET_ID}`);
}

main().catch(e => { console.error(e.message || e); process.exit(1); });
