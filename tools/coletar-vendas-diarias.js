'use strict';
/**
 * tools/coletar-vendas-diarias.js
 *
 * Coleta dados do dia anterior no OI e sincroniza no Supabase (NexusZ).
 * Não escreve na planilha e não envia WhatsApp.
 *
 * Uso:
 *   node tools/coletar-vendas-diarias.js             # ontem (padrão)
 *   node tools/coletar-vendas-diarias.js 2026-04-24  # data específica
 */
require('dotenv').config();

const { getOIDataBrowser } = require('./scraper-oi-browser');
const { syncVendasOI }     = require('./supabase-vendas-sync');

async function main() {
  const arg = process.argv[2];
  let today = arg
    ? new Date(arg + 'T12:00:00')
    : (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d; })();

  // Se cair num domingo (0), usa o sábado anterior
  if (today.getDay() === 0) {
    console.log(`⏭️  Domingo detectado — usando sábado anterior.`);
    today.setDate(today.getDate() - 1);
  }

  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  const dateStr = `${dd}/${mm}/${yyyy}`;

  console.log(`\n📅 Coletando OI — ${dateStr}\n`);

  const oiData = await getOIDataBrowser(today, null);

  if (!oiData || Object.keys(oiData).length === 0) {
    console.warn('⚠️  Sem dados retornados pelo OI — abortando.');
    process.exit(1);
  }

  console.log('☁️  Sincronizando Supabase (NexusZ)...');
  await syncVendasOI(today, oiData);

  console.log(`\n✅ Concluído — ${dateStr} gravado no NexusZ.`);
}

main().catch(e => { console.error('❌ Fatal:', e.message || e); process.exit(1); });
