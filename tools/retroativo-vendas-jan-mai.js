'use strict';
/**
 * retroativo-vendas-jan-mai.js
 *
 * Lê a planilha "Vendas diárias" e sincroniza Janeiro–Maio 2026 com o Supabase.
 * Muito mais rápido que o scraper OI (lê planilha em vez de abrir browser).
 *
 * Uso:
 *   node tools/retroativo-vendas-jan-mai.js
 */
require('dotenv').config();
const path         = require('path');
const { google }   = require('googleapis');
const { syncVendasOI } = require('./supabase-vendas-sync');

const SPREADSHEET_ID   = '1NFsBbu1MIG1Tl_XJc8VnhP8OVDupivbVxiYKpv8_mGw';
const SHEET_NAME       = 'Vendas diárias';
const BLOCK_SIZE       = 22;
const CREDENTIALS_PATH = path.join(__dirname, '..', 'credentials', 'google-sheets-key.json');

const STORE_KEYS = ['BR1','BR2','BR3','BR4','BR5','BR6','BR7','PEG1','PEG2'];
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

function fromSerial(serial) {
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
  const MESES_ALVO = [
    { mes: 1, ano: 2026 },
    { mes: 2, ano: 2026 },
    { mes: 3, ano: 2026 },
    { mes: 4, ano: 2026 },
    { mes: 5, ano: 2026 },
  ];

  console.log('\n📅 Retroativo Vendas OI Jan–Mai 2026 (via planilha → Supabase)');
  console.log('🔐 Autenticando Sheets...');
  const auth   = await getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  // Lê até 3000 linhas (~13 meses de histórico)
  const range = `'${SHEET_NAME}'!A1:P3000`;
  const res   = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  const rows = res.data.values || [];
  console.log(`📊 ${rows.length} linhas lidas da planilha\n`);

  const totais = { ok: 0, pulados: 0, total: 0 };

  for (const { mes, ano } of MESES_ALVO) {
    console.log(`${'='.repeat(60)}`);
    console.log(`📅 ${mes}/${ano}`);
    console.log('='.repeat(60));

    let okMes = 0;
    for (let blockIdx = 0; ; blockIdx++) {
      const blockStart = blockIdx * (BLOCK_SIZE + 1);
      if (blockStart + BLOCK_SIZE > rows.length) break;

      const dateRow = rows[blockStart + OFF.date] || [];
      const serial  = Number(dateRow[2]);
      if (!serial || isNaN(serial) || serial < 40000 || serial > 60000) continue;

      const date = fromSerial(serial);
      if (date.getUTCMonth() !== mes - 1 || date.getUTCFullYear() !== ano) continue;

      const dateISO = `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`;
      console.log(`  📅 ${dateISO} (linha ${blockStart + 1})`);

      const lojaResults = {};
      for (let i = 0; i < STORE_KEYS.length; i++) {
        const colIdx = 6 + i;
        const get = (off) => {
          const row = rows[blockStart + off] || [];
          const v   = row[colIdx];
          return v === undefined || v === '' ? null : Number(String(v).replace(',', '.'));
        };

        const fat = get(OFF.faturamento);
        if (fat === null && get(OFF.pneuVendidos) === null) continue;

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
        console.log(`    ⚠️  Bloco sem dados — pulado`);
        totais.pulados++;
        continue;
      }

      await syncVendasOI(dateISO, lojaResults);
      okMes++;
      totais.ok++;
      totais.total++;
    }

    if (okMes === 0) {
      console.log(`  ⚠️  Nenhum bloco encontrado para ${mes}/${ano}`);
    } else {
      console.log(`  ✅ ${okMes} dias sincronizados para ${mes}/${ano}\n`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Retroativo concluído: ${totais.ok} dias sincronizados`);
  if (totais.pulados) console.log(`⚠️  ${totais.pulados} blocos sem dados (pulados)`);
}

main().catch(e => { console.error('❌', e.message || e); process.exit(1); });
