'use strict';
/**
 * tools/retroativo-oi-jan-mai.js
 *
 * Roda o retroativo OI → Supabase de Janeiro a Maio 2026 em sequência.
 * Cada mês chama retroativo-oi-supabase.js via child_process para isolar memória.
 *
 * Uso:
 *   node tools/retroativo-oi-jan-mai.js
 */

const { execSync } = require('child_process');
const path = require('path');

// Retomar de onde parou: abril/22 → março → fevereiro → janeiro
const MESES = [
  { mes: 4, ano: 2026, diaInicio: 22 },
  { mes: 3, ano: 2026 },
  { mes: 2, ano: 2026 },
  { mes: 1, ano: 2026 },
];

const script = path.join(__dirname, 'retroativo-oi-supabase.js');

console.log('\n🗓️  Retroativo OI Jan→Mai 2026\n');
console.log(`⏱️  Estimativa total: ~5-8 horas (Chrome abre/fecha por mês)\n`);

for (const { mes, ano, diaInicio } of MESES) {
  console.log(`\n${'█'.repeat(60)}`);
  console.log(`▶  Iniciando mês ${mes}/${ano}`);
  console.log(`${'█'.repeat(60)}\n`);

  try {
    const diaArg = diaInicio && diaInicio > 1 ? ` ${diaInicio}` : '';
    execSync(`node "${script}" ${mes} ${ano}${diaArg}`, {
      stdio: 'inherit',
      timeout: 4 * 60 * 60 * 1000, // 4h por mês (limite de segurança)
    });
    console.log(`\n✅ Mês ${mes}/${ano} concluído\n`);
  } catch (err) {
    console.error(`\n❌ Erro no mês ${mes}/${ano}: ${err.message}`);
    console.error('   Continuando para o próximo mês...\n');
  }
}

console.log('\n✅ Retroativo completo Jan→Mai 2026\n');
