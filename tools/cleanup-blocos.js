'use strict';
/**
 * Pós-coleta do dia 22/04:
 * 1. Reaplica formatação correta (bordas cinza + borda grossa no Faturamento) no bloco 22/04
 * 2. Deleta o bloco do dia 23/04 (linhas 24–45, índices 23–44)
 */
require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { google } = require('googleapis');

const SPREADSHEET_ID   = '1NFsBbu1MIG1Tl_XJc8VnhP8OVDupivbVxiYKpv8_mGw';
const SHEET_ID         = 1220160954;
const BLOCK_SIZE       = 22;
const CREDENTIALS_PATH = path.join(__dirname, '..', 'credentials', 'google-sheets-key.json');

async function getSheets() {
  const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const auth  = new google.auth.GoogleAuth({ credentials: creds, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  return google.sheets({ version: 'v4', auth });
}

async function main() {
  const sheets = await getSheets();

  // ── 1. Reaplica bordas corretas no bloco 22/04 (linha 47 = índice 46)
  const blockStart = 46; // 0-indexed (linha 47)
  const grayColor  = { red: 0.8, green: 0.8, blue: 0.8 };
  const thinGray   = { style: 'SOLID',       color: grayColor };
  const thickGray  = { style: 'SOLID_THICK', color: grayColor };

  const headerRange = { sheetId: SHEET_ID, startRowIndex: blockStart, endRowIndex: blockStart + 5, startColumnIndex: 6, endColumnIndex: 16 };
  const fatTopRange = { sheetId: SHEET_ID, startRowIndex: blockStart + 5, endRowIndex: blockStart + 6, startColumnIndex: 6, endColumnIndex: 16 };

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        { unmergeCells: { range: headerRange } },
        { repeatCell: { range: headerRange, cell: { userEnteredFormat: { backgroundColor: { red:1, green:1, blue:1 } } }, fields: 'userEnteredFormat.backgroundColor' } },
        { updateBorders: { range: headerRange, top: thinGray, bottom: thinGray, left: thinGray, right: thinGray, innerHorizontal: thinGray, innerVertical: thinGray } },
        { updateBorders: { range: fatTopRange, top: thickGray } },
      ],
    },
  });
  console.log('✅ Bordas do bloco 22/04 corrigidas');

  // ── 2. Deleta o bloco do dia 23/04 (índices 23–44, linhas 24–45)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: { sheetId: SHEET_ID, dimension: 'ROWS', startIndex: 23, endIndex: 45 },
        },
      }],
    },
  });
  console.log('✅ Bloco 23/04 deletado (linhas 24–45)');
  console.log('Planilha ajustada. Bloco 22/04 agora em linhas 25–46');
}

main().catch(e => { console.error(e.message || e); process.exit(1); });
