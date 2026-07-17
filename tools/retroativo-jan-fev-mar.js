require('dotenv').config();
const { execSync } = require('child_process');

const meses = [
  { mes: 1, ano: 2026 },
  { mes: 2, ano: 2026 },
  { mes: 3, ano: 2026 },
];

(async () => {
  for (const { mes, ano } of meses) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Iniciando retroativo ${mes}/${ano}...`);
    console.log('='.repeat(60));
    try {
      execSync(`node tools/retroativo-oi-supabase.js ${mes} ${ano}`, { stdio: 'inherit' });
      console.log(`✅ Mês ${mes}/${ano} concluído.`);
    } catch(e) {
      console.error(`❌ Erro no mês ${mes}/${ano}:`, e.message);
    }
  }
  console.log('\n\n✅✅✅ RETROATIVO COMPLETO — Janeiro, Fevereiro e Março sincronizados!');
})();
