'use strict';
/**
 * retroativo-jan-abr.js
 *
 * Coleta dados DIÁRIOS do OI (Jan→Mai/2026) e sincroniza no Supabase.
 * Ordem: do dia mais recente ao mais antigo (Maio → Janeiro).
 * Delay de 2 min entre dias para não sobrecarregar o OI.
 */
require('dotenv').config();
const { getOIDataBrowser } = require('./scraper-oi-browser');
const { syncVendasOI }     = require('./supabase-vendas-sync');

const DELAY_ENTRE_DIAS_MS = 2 * 60 * 1000; // 2 minutos

const MESES = [
  { mes: 5, ano: 2026 },
  { mes: 4, ano: 2026 },
  { mes: 3, ano: 2026 },
  { mes: 2, ano: 2026 },
  { mes: 1, ano: 2026 },
];

function buildDatas(mes, ano) {
  const hoje   = new Date();
  const mesIdx = mes - 1;
  const ultimoDia = (mesIdx === hoje.getMonth() && ano === hoje.getFullYear())
    ? hoje.getDate()
    : new Date(ano, mesIdx + 1, 0).getDate();

  const datas = [];
  for (let d = ultimoDia; d >= 1; d--) { // ordem inversa: do último ao primeiro
    const dt = new Date(ano, mesIdx, d);
    if (dt.getDay() === 0) continue; // pula domingo
    datas.push(`${ano}-${String(mes).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
  }
  return datas;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  let totalOk  = 0;
  let totalErr = 0;
  let totalDias = 0;

  // Conta total de dias
  for (const { mes, ano } of MESES) totalDias += buildDatas(mes, ano).length;
  console.log(`\n📅 Retroativo Jan–Mai 2026 (ordem: recente → antigo)`);
  console.log(`   Total: ${totalDias} dias | Delay: 2 min entre dias`);
  console.log(`   Estimativa: ~${Math.round(totalDias * 14 / 60)} horas\n`);

  let diaAtual = 0;

  for (const { mes, ano } of MESES) {
    const datas = buildDatas(mes, ano);
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📅 ${mes}/${ano} — ${datas.length} dias (${datas[datas.length-1]} → ${datas[0]})`);
    console.log('='.repeat(60));

    for (let i = 0; i < datas.length; i++) {
      diaAtual++;
      const dateISO = datas[i];
      const inicio  = new Date().toLocaleTimeString('pt-BR');
      console.log(`\n[${diaAtual}/${totalDias}] ${dateISO}  (${inicio})`);

      try {
        const oiData = await getOIDataBrowser(dateISO, null);
        if (!oiData || Object.keys(oiData).length === 0) {
          console.warn(`  ⚠️  Sem dados para ${dateISO} — pulando`);
          totalErr++;
        } else {
          await syncVendasOI(dateISO, oiData);
          totalOk++;
        }
      } catch (e) {
        console.error(`  ❌ Falhou ${dateISO}:`, e.message);
        totalErr++;
      }

      // Delay de 5 min entre dias (exceto no último)
      if (diaAtual < totalDias) {
        const proxima = new Date(Date.now() + DELAY_ENTRE_DIAS_MS);
        console.log(`  ⏳ Aguardando 5 min... próxima coleta às ${proxima.toLocaleTimeString('pt-BR')}`);
        await sleep(DELAY_ENTRE_DIAS_MS);
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Concluído: ${totalOk} dias sincronizados`);
  if (totalErr) console.log(`❌ Falhas: ${totalErr} dias`);
  console.log('Maio, Abril, Março, Fevereiro e Janeiro sincronizados com dados DIÁRIOS.');
}

main().catch(e => { console.error('❌ Fatal:', e.message || e); process.exit(1); });
