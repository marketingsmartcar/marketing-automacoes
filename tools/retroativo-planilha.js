'use strict';
/**
 * tools/retroativo-planilha.js
 *
 * Reprocessa múltiplos dias: coleta OI, grava planilha + Supabase.
 * NÃO envia notificações WhatsApp.
 *
 * Uso:
 *   node tools/retroativo-planilha.js                    # mês atual (dia 1 até ontem)
 *   node tools/retroativo-planilha.js --mes 5 --ano 2026 # maio 2026 completo
 *   node tools/retroativo-planilha.js --semana           # seg–sáb da semana atual
 */
require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { getOIDataBrowser } = require('./scraper-oi-browser');
const { syncVendasOI }     = require('./supabase-vendas-sync');

// ── Constantes (espelham preencher-vendas-diarias.js) ─────────────────────────

const SPREADSHEET_ID   = '1NFsBbu1MIG1Tl_XJc8VnhP8OVDupivbVxiYKpv8_mGw';
const SHEET_ID         = 1220160954;
const SHEET_NAME       = 'Vendas diárias';
const BLOCK_SIZE       = 22;
const TOTAL_COLS       = 16;
const CREDENTIALS_PATH = path.join(__dirname, '..', 'credentials', 'google-sheets-key.json');

const STORE_KEYS   = ['BR1','BR2','BR3','BR4','BR5','BR6','BR7','PEG1','PEG2'];
const STORE_LABELS = [
  'BR1 Centro','BR2 V. Xavier','BR3 Americana','BR4 S. Carlos','BR5 Maringá',
  'Peg1 Araraquara','Peg2 Sorocaba','Rede',
];
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
const EMPTY_ROW_OFFSETS = [8, 15, 17, 20];
const COL_G = 'G'.charCodeAt(0);

// ── Helpers de data ───────────────────────────────────────────────────────────

function toSheetSerial(date) {
  return Math.round(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
     Date.UTC(1899, 11, 30)) / 86400000
  );
}

function countWorkingDays(year, month, from, to) {
  let n = 0;
  for (let d = from; d <= to; d++) {
    if (new Date(year, month, d).getDay() !== 0) n++;
  }
  return n;
}

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

// ── Helpers planilha ──────────────────────────────────────────────────────────

async function getSheetRowCount(sheets) {
  const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const s   = res.data.sheets.find(s => s.properties.sheetId === SHEET_ID);
  return s?.properties.gridProperties.rowCount ?? 0;
}

async function findOrReserveBlock(sheets, todaySerial) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!C:C`,
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  const colC = (res.data.values || []).map(r => (r && r[0] != null ? Number(r[0]) : null));

  let highestBlockEnd = BLOCK_SIZE;
  let todayStart      = -1;

  for (let i = 3; i < colC.length; i++) {
    const val = colC[i];
    if (!val || isNaN(val) || val < 43831 || val > 49640) continue;
    const blockStart = i - 3;
    const blockEnd   = blockStart + BLOCK_SIZE;
    if (blockEnd > highestBlockEnd) highestBlockEnd = blockEnd;
    if (val === todaySerial) todayStart = blockStart;
  }

  if (todayStart >= 0) return { blockStart: todayStart, isNew: false };
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
      requests: [{ insertDimension: {
        range: { sheetId: SHEET_ID, dimension: 'ROWS', startIndex: current, endIndex: current + toAdd },
        inheritFromBefore: false,
      }}],
    },
  });
}

async function copyTemplateToBlock(sheets, destStart, srcStart = 0) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{ copyPaste: {
        source:      { sheetId: SHEET_ID, startRowIndex: srcStart,   endRowIndex: srcStart + BLOCK_SIZE,   startColumnIndex: 0, endColumnIndex: TOTAL_COLS },
        destination: { sheetId: SHEET_ID, startRowIndex: destStart,  endRowIndex: destStart + BLOCK_SIZE,  startColumnIndex: 0, endColumnIndex: TOTAL_COLS },
        pasteType: 'PASTE_NORMAL', pasteOrientation: 'NORMAL',
      }}],
    },
  });
}

async function clearBlockCells(sheets, blockStart) {
  const R = off => blockStart + off + 1;
  await sheets.spreadsheets.values.batchClear({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { ranges: [
      `'${SHEET_NAME}'!G${R(5)}:O${R(5)}`,
      `'${SHEET_NAME}'!G${R(6)}:O${R(6)}`,
      `'${SHEET_NAME}'!G${R(9)}:O${R(14)}`,
      `'${SHEET_NAME}'!G${R(21)}:O${R(21)}`,
    ]},
  });
}

async function clearBlockHeaderFormatting(sheets, blockStart) {
  const grayColor = { red: 0.8, green: 0.8, blue: 0.8 };
  const thinGray  = { style: 'SOLID',       color: grayColor };
  const thickGray = { style: 'SOLID_THICK', color: grayColor };
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests: [
      { updateBorders: { range: { sheetId: SHEET_ID, startRowIndex: blockStart+3, endRowIndex: blockStart+5, startColumnIndex:6, endColumnIndex:16 }, top: thinGray, bottom: thinGray, left: thinGray, right: thinGray, innerHorizontal: thinGray, innerVertical: thinGray } },
      { updateBorders: { range: { sheetId: SHEET_ID, startRowIndex: blockStart+5, endRowIndex: blockStart+6, startColumnIndex:6, endColumnIndex:16 }, top: thickGray } },
    ]},
  });
}

async function setEmptyRowHeights(sheets, blockStart) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests: EMPTY_ROW_OFFSETS.map(off => ({
      updateDimensionProperties: {
        range: { sheetId: SHEET_ID, dimension: 'ROWS', startIndex: blockStart+off, endIndex: blockStart+off+1 },
        properties: { pixelSize: 10 }, fields: 'pixelSize',
      },
    }))},
  });
}

async function writeBlockHeaders(sheets, blockStart) {
  const R = off => blockStart + off + 1;
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { valueInputOption: 'USER_ENTERED', data: [
      { range: `'${SHEET_NAME}'!G${R(0)}`,       values: [['VENDA DO MÊS']] },
      { range: `'${SHEET_NAME}'!G${R(2)}:P${R(2)}`, values: [STORE_LABELS] },
    ]},
  });
}

async function writeMeta(sheets, blockStart, date, diasTotal, diasFeitos) {
  const R = off => blockStart + off + 1;
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { valueInputOption: 'USER_ENTERED', data: [
      { range: `'${SHEET_NAME}'!C${R(0)}`, values: [[diasTotal]]           },
      { range: `'${SHEET_NAME}'!C${R(1)}`, values: [[diasFeitos]]          },
      { range: `'${SHEET_NAME}'!C${R(3)}`, values: [[toSheetSerial(date)]] },
    ]},
  });
}

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
  process.stdout.write(`  📊 ${storeKey} `);
}

// ── Processamento de um dia ───────────────────────────────────────────────────

async function processDay(sheets, dateISO) {
  const today = new Date(dateISO + 'T12:00:00');
  if (today.getDay() === 0) { console.log(`  ⏭️  Domingo — pulado`); return null; }

  const y = today.getFullYear(), m = today.getMonth(), d = today.getDate();
  const serial     = toSheetSerial(today);
  const dateStr    = `${String(d).padStart(2,'0')}/${String(m+1).padStart(2,'0')}/${y}`;
  const diasTotal  = countWorkingDays(y, m, 1, lastDayOfMonth(y, m));
  const diasFeitos = countWorkingDays(y, m, 1, d);

  const { blockStart, isNew, prevBlockStart } = await findOrReserveBlock(sheets, serial);

  if (isNew) {
    await ensureRows(sheets, blockStart + BLOCK_SIZE);
    const srcStart = (prevBlockStart != null && prevBlockStart >= 0) ? prevBlockStart : 0;
    await copyTemplateToBlock(sheets, blockStart, srcStart);
  }

  await clearBlockCells(sheets, blockStart);
  await clearBlockHeaderFormatting(sheets, blockStart);
  await setEmptyRowHeights(sheets, blockStart);
  await writeBlockHeaders(sheets, blockStart);
  await writeMeta(sheets, blockStart, today, diasTotal, diasFeitos);

  process.stdout.write(`  OI → `);
  const oiData = await getOIDataBrowser(today, async (key, data) => {
    await writeStoreColumn(sheets, blockStart, key, data).catch(() => {});
  });

  if (!oiData || Object.keys(oiData).length === 0) {
    console.log(`\n  ⚠️  Sem dados OI para ${dateStr}`);
    return null;
  }

  await syncVendasOI(today, oiData).catch(e =>
    console.warn(`\n  ⚠️  Supabase sync falhou: ${e.message}`)
  );

  console.log(`\n  ✅ ${dateStr} → planilha + Supabase`);
  return oiData;
}

// ── Montagem da lista de datas ────────────────────────────────────────────────

function getDatas(args) {
  // Modo --semana: seg–sáb da semana atual (horário BRT)
  if (args.includes('--semana')) {
    const nowBRT = new Date(Date.now() - 3 * 3600 * 1000);
    const dow = nowBRT.getUTCDay(); // 0=dom,1=seg,…,6=sáb
    const daysFromMon = dow === 0 ? 6 : dow - 1;
    const datas = [];
    for (let i = 0; i <= daysFromMon; i++) {
      const d = new Date(nowBRT);
      d.setUTCDate(nowBRT.getUTCDate() - daysFromMon + i);
      if (d.getUTCDay() === 0) continue;
      datas.push(
        `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`
      );
    }
    return datas;
  }

  // Modo --mes M --ano YYYY (ou mês atual)
  const mesIdx = args.indexOf('--mes');
  const anoIdx = args.indexOf('--ano');
  const nowBRT = new Date(Date.now() - 3 * 3600 * 1000);
  const mes    = mesIdx >= 0 ? parseInt(args[mesIdx + 1], 10) - 1 : nowBRT.getUTCMonth();
  const ano    = anoIdx >= 0 ? parseInt(args[anoIdx + 1], 10)     : nowBRT.getUTCFullYear();

  const isMesAtual = (mes === nowBRT.getUTCMonth() && ano === nowBRT.getUTCFullYear());
  // Para o mês atual: vai até ontem. Para mês passado: vai até o último dia do mês.
  const ultimoDia = isMesAtual
    ? nowBRT.getUTCDate() - 1
    : new Date(ano, mes + 1, 0).getDate();

  const datas = [];
  for (let d = 1; d <= ultimoDia; d++) {
    const dt = new Date(ano, mes, d);
    if (dt.getDay() === 0) continue;
    datas.push(`${ano}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
  }
  return datas;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args  = process.argv.slice(2);
  const datas = getDatas(args);

  if (datas.length === 0) {
    console.log('⚠️  Nenhuma data para processar.');
    return;
  }

  const modo = args.includes('--semana') ? 'Revisão Semanal' : 'Retroativo Mês';
  console.log(`\n📋 ${modo} — planilha + Supabase`);
  console.log(`   ${datas.length} dias: ${datas[0]} → ${datas[datas.length - 1]}`);
  console.log(`   Estimativa: ~${Math.round(datas.length * 10)} min\n`);

  const auth   = await getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const ok = [], err = [];

  for (let i = 0; i < datas.length; i++) {
    const dateISO = datas[i];
    console.log(`\n${'─'.repeat(55)}`);
    console.log(`[${i + 1}/${datas.length}]  ${dateISO}`);
    console.log('─'.repeat(55));
    try {
      const result = await processDay(sheets, dateISO);
      if (result !== null) ok.push(dateISO);
      else err.push(dateISO);
    } catch (e) {
      console.error(`  ❌ Falhou: ${e.message}`);
      err.push(dateISO);
    }
  }

  console.log(`\n${'═'.repeat(55)}`);
  console.log(`✅ Concluído: ${ok.length} dias gravados`);
  if (err.length) console.log(`❌ Falhas (${err.length}): ${err.join(', ')}`);
  console.log('═'.repeat(55));
}

main().catch(e => { console.error('❌ Fatal:', e.message || e); process.exit(1); });
