/**
 * retroativo-vendas-supabase.js
 *
 * Lê todos os blocos já existentes na planilha "Vendas diárias" do mês atual
 * e sincroniza com a tabela vendas_diarias_oi no Supabase (NexusZ).
 *
 * Uso:
 *   node tools/retroativo-vendas-supabase.js          # mês atual
 *   node tools/retroativo-vendas-supabase.js 4 2026   # mês/ano específico
 */
'use strict';
require('dotenv').config();
const path         = require('path');
const { google }   = require('googleapis');
const { syncVendasOI } = require('./supabase-vendas-sync');

const SPREADSHEET_ID   = '1NFsBbu1MIG1Tl_XJc8VnhP8OVDupivbVxiYKpv8_mGw';
const SHEET_NAME       = 'Vendas diárias';
const BLOCK_SIZE       = 22;
const CREDENTIALS_PATH = path.join(__dirname, '..', 'credentials', 'google-sheets-key.json');

const STORE_KEYS = ['BR1','BR2','BR3','BR4','BR5','BR6','BR7','PEG1','PEG2'];
// Offsets dentro do bloco (0-indexed)
const OFF = {
  date:              3,
  faturamento:       5,
  lucroBruto:        6,
  carroPorta:        9,
  retiraPorta:       10,
  revisaoPorta:      11,
  carroAgendamento:  12,
  retiraAgendamento: 13,
  revisaoAgendamento:14,
  pneuVendidos:      21,
};

/** Serial Google Sheets → Date UTC */
function fromSerial(serial) {
  // serial = dias desde 30/12/1899
  return new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
}

async function getAuth() {
  const credentials = JSON.parse(require('fs').readFileSync(CREDENTIALS_PATH, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return auth.getClient();
}

async function main() {
  const args   = process.argv.slice(2);
  const now    = new Date();
  const mesArg = args[0] ? parseInt(args[0], 10) - 1 : now.getMonth();
  const anoArg = args[1] ? parseInt(args[1], 10)     : now.getFullYear();

  console.log(`📅 Retroativo: ${mesArg + 1}/${anoArg}`);
  console.log('🔐 Autenticando Sheets...');
  const auth   = await getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  // Lê bloco maior que o necessário para garantir pegar todos os blocos do mês
  const range = `'${SHEET_NAME}'!A1:P500`;
  const res   = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  const rows  = res.data.values || [];

  console.log(`📊 ${rows.length} linhas lidas da planilha`);

  // Itera sobre possíveis blocos: bloco n começa na linha n*(BLOCK_SIZE+1)
  const results = [];
  for (let blockIdx = 0; ; blockIdx++) {
    const blockStart = blockIdx * (BLOCK_SIZE + 1); // 0-indexed linha
    if (blockStart + BLOCK_SIZE > rows.length) break;

    // C na linha offset 3 do bloco = serial da data
    const dateRow = rows[blockStart + OFF.date] || [];
    const serial  = Number(dateRow[2]); // coluna C = índice 2
    if (!serial || isNaN(serial) || serial < 40000 || serial > 60000) continue;

    const date = fromSerial(serial);
    // Filtra apenas o mês/ano desejado
    if (date.getUTCMonth() !== mesArg || date.getUTCFullYear() !== anoArg) continue;

    const dateISO = `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`;
    console.log(`  📅 Bloco encontrado: ${dateISO} (linha ${blockStart + 1})`);

    // Extrai dados por loja (colunas G=6 a O=14)
    const lojaResults = {};
    for (let i = 0; i < STORE_KEYS.length; i++) {
      const colIdx = 6 + i; // G=6, H=7, ..., O=14
      const get    = (off) => {
        const row = rows[blockStart + off] || [];
        const v   = row[colIdx];
        return v === undefined || v === '' ? null : Number(String(v).replace(',', '.'));
      };

      const fat = get(OFF.faturamento);
      if (fat === null && get(OFF.pneuVendidos) === null) continue; // bloco vazio para essa loja

      lojaResults[STORE_KEYS[i]] = {
        faturamento:          fat,
        lucroBruto:           get(OFF.lucroBruto),
        carroPorta:           get(OFF.carroPorta),
        retiraPorta:          get(OFF.retiraPorta),
        revisaoPorta:         get(OFF.revisaoPorta),
        carroAgendamento:     get(OFF.carroAgendamento),
        retiraAgendamento:    get(OFF.retiraAgendamento),
        revisaoAgendamento:   get(OFF.revisaoAgendamento),
        pneuVendidos:         get(OFF.pneuVendidos),
      };
    }

    if (Object.keys(lojaResults).length === 0) {
      console.log(`    Bloco sem dados — pulando`);
      continue;
    }

    await syncVendasOI(dateISO, lojaResults);
    results.push(dateISO);
  }

  if (results.length === 0) {
    console.log('⚠️  Nenhum bloco encontrado para o período.');
  } else {
    console.log(`\n✅ Retroativo concluído: ${results.length} datas sincronizadas`);
    console.log('   Datas:', results.join(', '));
  }
}

main().catch(e => { console.error('❌', e.message || e); process.exit(1); });
