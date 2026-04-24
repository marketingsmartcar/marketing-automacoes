'use strict';
/**
 * retroativo-jan-abr.js
 *
 * Coleta dados DIÁRIOS (não acumulados) do OI para cada dia de
 * Janeiro, Fevereiro, Março e Abril/2026 e sincroniza no Supabase.
 *
 * Cada linha no banco representa SOMENTE aquele dia — não o mês inteiro.
 */
require('dotenv').config();
const { getOIDataBrowser } = require('./scraper-oi-browser');
const { syncVendasOI }     = require('./supabase-vendas-sync');

const MESES = [
  { mes: 1, ano: 2026 },
  { mes: 2, ano: 2026 },
  { mes: 3, ano: 2026 },
  { mes: 4, ano: 2026 },
];

function buildDatas(mes, ano) {
  const hoje      = new Date();
  const mesIdx    = mes - 1;
  const ultimoDia = (mesIdx === hoje.getMonth() && ano === hoje.getFullYear())
    ? hoje.getDate()
    : new Date(ano, mesIdx + 1, 0).getDate();

  const datas = [];
  for (let d = 1; d <= ultimoDia; d++) {
    const dt = new Date(ano, mesIdx, d);
    if (dt.getDay() === 0) continue; // pula domingo
    datas.push(`${ano}-${String(mes).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
  }
  return datas;
}

async function main() {
  let totalOk  = 0;
  let totalErr = 0;

  for (const { mes, ano } of MESES) {
    const datas = buildDatas(mes, ano);
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📅 ${mes}/${ano} — ${datas.length} dias  (${datas[0]} → ${datas[datas.length-1]})`);
    console.log('='.repeat(60));

    for (let i = 0; i < datas.length; i++) {
      const dateISO = datas[i];
      console.log(`\n[${i+1}/${datas.length}] ${dateISO}`);
      try {
        const oiData = await getOIDataBrowser(dateISO, null);
        if (!oiData || Object.keys(oiData).length === 0) {
          console.warn(`  ⚠️  Sem dados para ${dateISO} — pulando`);
          totalErr++;
          continue;
        }
        await syncVendasOI(dateISO, oiData);
        totalOk++;
      } catch (e) {
        console.error(`  ❌ Falhou ${dateISO}:`, e.message);
        totalErr++;
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Concluído: ${totalOk} dias sincronizados`);
  if (totalErr) console.log(`❌ Falhas: ${totalErr} dias`);
  console.log('Janeiro, Fevereiro, Março e Abril sincronizados com dados DIÁRIOS.');
}

main().catch(e => { console.error('❌ Fatal:', e.message || e); process.exit(1); });
