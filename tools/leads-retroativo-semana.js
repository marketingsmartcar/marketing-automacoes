'use strict';
/**
 * Reprocessa os leads de toda a semana anterior (Seg–Sáb).
 * Roda no final de semana para corrigir dados que mudaram durante a semana.
 *
 * Uso:
 *   node tools/leads-retroativo-semana.js            # semana anterior automática
 *   node tools/leads-retroativo-semana.js 2026-05-19 # semana que contém essa data
 */
require('dotenv').config();

const { atualizarLinhaHoje } = require('./leads-hoje');

const DELAY_ENTRE_DIAS_MS = 5000; // 5s entre dias para não sobrecarregar a API

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Retorna as datas ISO (Seg–Sáb) da semana anterior ao dia passado
function datasSemanasAnterior(refISO) {
  const ref = refISO ? new Date(refISO + 'T12:00:00') : new Date();
  const diaSemana = ref.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb

  // Vai até o último Sábado concluído
  const diasAteSab = diaSemana === 0 ? 1 : (7 - diaSemana + 6) % 7 || 7;
  const sabado = new Date(ref);
  sabado.setDate(ref.getDate() - diasAteSab + (diaSemana === 6 ? 0 : 0));

  // Sábado desta semana = ref se hoje for sábado, senão último sábado passado
  let ult;
  if (diaSemana === 6) {
    ult = new Date(ref); // hoje é sábado
  } else if (diaSemana === 0) {
    ult = new Date(ref); ult.setDate(ref.getDate() - 1); // ontem foi sábado
  } else {
    // dias úteis: volta até o último sábado
    ult = new Date(ref); ult.setDate(ref.getDate() - diaSemana - 1);
  }

  // Segunda dessa semana = Sábado - 5 dias
  const seg = new Date(ult); seg.setDate(ult.getDate() - 5);

  const datas = [];
  for (let d = new Date(seg); d <= ult; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0) continue; // pula domingo
    datas.push(d.toLocaleDateString('sv-SE')); // YYYY-MM-DD
  }
  return datas;
}

async function main() {
  const refArg = process.argv[2] || null;
  const datas  = datasSemanasAnterior(refArg);

  console.log(`\n📅 Retroativo de semana — ${datas.length} dias`);
  console.log(`   Período: ${datas[0]} → ${datas[datas.length - 1]}`);
  console.log(`   Delay entre dias: ${DELAY_ENTRE_DIAS_MS / 1000}s\n`);

  let ok = 0, err = 0;

  for (const data of datas) {
    try {
      await atualizarLinhaHoje(data);
      ok++;
    } catch (e) {
      console.error(`  ❌ ${data}: ${e.message}`);
      err++;
    }
    if (data !== datas[datas.length - 1]) await sleep(DELAY_ENTRE_DIAS_MS);
  }

  console.log(`\n✅ Retroativo concluído — ${ok} OK, ${err} erros`);
  if (err > 0) process.exit(1);
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
