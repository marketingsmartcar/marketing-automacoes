'use strict';
/**
 * tools/renomear-abas-planilha.js
 *
 * Renomeia todas as abas de uma planilha para "NexusZ 1", "NexusZ 2", etc.
 *
 * Uso:
 *   node tools/renomear-abas-planilha.js <SPREADSHEET_ID> [prefixo]
 *
 * Exemplos:
 *   node tools/renomear-abas-planilha.js 1VezcgXjI4vw8zB8G6mLXqjdQ8PiH99DDNJBbmrnymhY
 *   node tools/renomear-abas-planilha.js 1VezcgXjI4vw8zB8G6mLXqjdQ8PiH99DDNJBbmrnymhY "Loja"
 */
require('dotenv').config();
const fs      = require('fs');
const path    = require('path');
const { google } = require('googleapis');

const SPREADSHEET_ID  = process.argv[2];
const PREFIXO         = process.argv[3] || 'NexusZ';
const COR_ARG         = (process.argv[4] || 'ciano').toLowerCase();
const CREDENTIALS_PATH = path.join(__dirname, '..', 'credentials', 'google-sheets-key.json');

const CORES = {
  ciano:    { rgbColor: { red: 0,     green: 0.898, blue: 0.898 } },
  vermelho: { rgbColor: { red: 0.918, green: 0.2,   blue: 0.2   } },
  azul:     { rgbColor: { red: 0.188, green: 0.424, blue: 0.773 } },
  verde:    { rgbColor: { red: 0.176, green: 0.624, blue: 0.239 } },
  amarelo:  { rgbColor: { red: 1,     green: 0.843, blue: 0     } },
  laranja:  { rgbColor: { red: 1,     green: 0.6,   blue: 0     } },
  roxo:     { rgbColor: { red: 0.576, green: 0.169, blue: 0.694 } },
};
const COR = CORES[COR_ARG] || CORES.ciano;

if (!SPREADSHEET_ID) {
  console.error('❌ Informe o ID da planilha como argumento.');
  console.error('   node tools/renomear-abas-planilha.js <SPREADSHEET_ID>');
  process.exit(1);
}

async function main() {
  const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const auth  = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // Busca todas as abas
  const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const abas = res.data.sheets;

  if (!abas || abas.length === 0) {
    console.log('Nenhuma aba encontrada.');
    return;
  }

  console.log(`\n📋 ${abas.length} aba(s) encontrada(s):\n`);
  abas.forEach((s, i) => {
    console.log(`  ${i + 1}. "${s.properties.title}" → "${PREFIXO} ${i + 1}"`);
  });

  // Renomeia uma por uma para pular protegidas
  let ok = 0, puladas = 0, contador = 1;

  console.log('\n🔄 Passo 1: nomes temporários (um a um)...');
  for (const s of abas) {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: [{ updateSheetProperties: { properties: { sheetId: s.properties.sheetId, title: `__tmp_${s.properties.sheetId}__` }, fields: 'title' } }] },
      });
      s._tmpOk = true;
    } catch {
      s._tmpOk = false;
      puladas++;
      console.log(`  ⚠️  Pulada (protegida): "${s.properties.title}"`);
    }
  }

  console.log('🔄 Passo 2: nomes finais + cor...');
  for (const s of abas) {
    if (!s._tmpOk) { contador++; continue; }
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: [{ updateSheetProperties: { properties: { sheetId: s.properties.sheetId, title: `${PREFIXO} ${contador}`, tabColorStyle: COR }, fields: 'title,tabColorStyle' } }] },
      });
      ok++;
    } catch (e) {
      console.log(`  ⚠️  Erro ao renomear aba ${contador}: ${e.message}`);
    }
    contador++;
  }

  console.log(`\n✅ ${ok} aba(s) renomeadas | ${puladas} pulada(s) por proteção`);
  console.log(`   ${PREFIXO} 1 … ${PREFIXO} ${ok}`);
}

main().catch(e => { console.error('❌', e.message || e); process.exit(1); });
