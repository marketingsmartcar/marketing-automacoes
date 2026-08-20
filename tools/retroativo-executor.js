'use strict';
/**
 * retroativo-executor.js
 * Chama a edge function para cada data com executor nulo.
 */
require('dotenv').config();

const SUPABASE_URL = process.env.NEXUSZ_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY;
const EDGE_URL     = `${SUPABASE_URL}/functions/v1/coleta-gestao-periodica`;

const DATAS = [
  '2026-08-12',
  '2026-08-13',
  '2026-08-14',
  '2026-08-17',
  '2026-08-18',
  '2026-08-19',
  '2026-08-20',
];

async function main() {
  console.log(`📋 ${DATAS.length} datas para processar\n`);

  for (const data of DATAS) {
    process.stdout.write(`▶ ${data} — chamando edge function... `);
    try {
      const r = await fetch(EDGE_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ de: data }),
      });
      const res = await r.json().catch(() => ({ ok: false }));
      if (res.ok) {
        const osProcessadas = Object.values(res.summary || {}).reduce((s, v) => s + (v.detalhe || 0), 0);
        const erros = Object.values(res.summary || {}).flatMap(v => v.errors || []);
        process.stdout.write(`✅ ${osProcessadas} OS processadas`);
        if (erros.length) process.stdout.write(` (${erros.length} erros: ${erros.slice(0,2).join('; ')})`);
        process.stdout.write('\n');
      } else {
        process.stdout.write(`❌ ${res.error || JSON.stringify(res).slice(0,100)}\n`);
      }
    } catch (e) {
      process.stdout.write(`❌ ${String(e).slice(0, 80)}\n`);
    }

    // 5s entre chamadas — a edge function demora por conta do scraping
    if (data !== DATAS[DATAS.length - 1]) {
      process.stdout.write('  aguardando 5s...\n');
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  console.log('\n✅ Retroativo concluído!');
}

main().catch(e => { console.error(e); process.exit(1); });
