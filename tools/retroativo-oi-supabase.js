/**
 * retroativo-oi-supabase.js
 *
 * Roda o scraper do OI para cada dia do mês e sincroniza com Supabase.
 * NÃO escreve na planilha — só coleta do OI e grava no Supabase.
 *
 * Uso:
 *   node tools/retroativo-oi-supabase.js          # mês atual, do dia 1 até hoje
 *   node tools/retroativo-oi-supabase.js 4 2026   # mês/ano específico (completo)
 */
'use strict';
require('dotenv').config();
const { getOIDataBrowser } = require('./scraper-oi-browser');
const { syncVendasOI }     = require('./supabase-vendas-sync');

const DELAY_ENTRE_DIAS_MS = 60 * 1000; // 60s para GC liberar memória do Chrome
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const args   = process.argv.slice(2);
  const now    = new Date();
  const mesArg = args[0] ? parseInt(args[0], 10) - 1 : now.getMonth();
  const anoArg = args[1] ? parseInt(args[1], 10)     : now.getFullYear();

  // Gera lista de dias do mês (1 até hoje ou último dia, se mês passado)
  const hoje      = new Date();
  const ultimoDia = (mesArg === hoje.getMonth() && anoArg === hoje.getFullYear())
    ? hoje.getDate()
    : new Date(anoArg, mesArg + 1, 0).getDate();

  // Monta array de datas (pula Domingos — OI não tem movimento)
  const diaInicio = args[2] ? parseInt(args[2], 10) : 1;
  const datas = [];
  for (let d = diaInicio; d <= ultimoDia; d++) {
    const dt = new Date(anoArg, mesArg, d);
    if (dt.getDay() === 0) continue; // domingo
    const iso = `${anoArg}-${String(mesArg + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    datas.push(iso);
  }

  console.log(`\n📅 Retroativo OI → Supabase`);
  console.log(`   Mês: ${mesArg + 1}/${anoArg}  |  ${datas.length} dias a coletar`);
  console.log(`   Datas: ${datas[0]} → ${datas[datas.length - 1]}`);
  console.log(`   Estimativa: ~${Math.round(datas.length * 10)} min\n`);

  const ok  = [];
  const err = [];

  for (let i = 0; i < datas.length; i++) {
    const dateISO = datas[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[${i + 1}/${datas.length}] ${dateISO}`);
    console.log('='.repeat(60));

    try {
      const oiData = await getOIDataBrowser(dateISO, null);
      if (!oiData || Object.keys(oiData).length === 0) {
        console.warn(`  ⚠️  Sem dados OI para ${dateISO} — pulando`);
        err.push(dateISO);
        continue;
      }
      await syncVendasOI(dateISO, oiData);
      ok.push(dateISO);
    } catch (e) {
      console.error(`  ❌ Falhou para ${dateISO}:`, e.message);
      err.push(dateISO);
    }

    // Aguarda 60s entre dias para o GC liberar memória do Chromium
    if (i < datas.length - 1) {
      const proxima = new Date(Date.now() + DELAY_ENTRE_DIAS_MS);
      console.log(`  ⏳ Aguardando 60s... próximo às ${proxima.toLocaleTimeString('pt-BR')}`);
      await sleep(DELAY_ENTRE_DIAS_MS);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Concluído: ${ok.length} datas sincronizadas`);
  if (err.length) console.log(`❌ Falhas:    ${err.length} datas — ${err.join(', ')}`);
  console.log(`   OK: ${ok.join(', ')}`);
}

main().catch(e => { console.error('❌ Fatal:', e.message || e); process.exit(1); });
