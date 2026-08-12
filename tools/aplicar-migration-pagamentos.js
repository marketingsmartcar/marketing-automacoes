#!/usr/bin/env node
// Aplica a migration que adiciona a coluna pagamentos JSONB em os_vendas.
// Requer: SUPABASE_ACCESS_TOKEN e NEXUSZ_SUPABASE_URL no .env (ou como env vars).
//
// Uso:
//   SUPABASE_ACCESS_TOKEN=seu_token node tools/aplicar-migration-pagamentos.js
//
// Ou: cole o SQL abaixo direto no Supabase SQL Editor.
//
// SQL (equivalente):
//   ALTER TABLE public.os_vendas
//     ADD COLUMN IF NOT EXISTS pagamentos JSONB DEFAULT NULL;
//   COMMENT ON COLUMN public.os_vendas.pagamentos IS
//     'Array [{forma, parcelas, valor}]. Coletado via Puppeteer (Gestão Periódica).';

require('dotenv').config();

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SUPABASE_URL = process.env.NEXUSZ_SUPABASE_URL;

const SQL = `
ALTER TABLE public.os_vendas
  ADD COLUMN IF NOT EXISTS pagamentos JSONB DEFAULT NULL;
COMMENT ON COLUMN public.os_vendas.pagamentos IS
  'Array [{forma, parcelas, valor}]. Coletado via Puppeteer (Gestão Periódica).';
`.trim();

async function main() {
  if (!ACCESS_TOKEN) {
    console.error('\n❌ SUPABASE_ACCESS_TOKEN não definido.');
    console.error('\nOpção 1 — Rode com o token:');
    console.error('  SUPABASE_ACCESS_TOKEN=sbp_xxx node tools/aplicar-migration-pagamentos.js');
    console.error('\nOpção 2 — Cole no Supabase SQL Editor:');
    console.error('\n' + SQL + '\n');
    process.exit(1);
  }

  // Extrai o project ref da URL (ex: ubiuershczqjnoczcupa)
  const ref = SUPABASE_URL?.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
  if (!ref) {
    console.error('❌ NEXUSZ_SUPABASE_URL não encontrado ou formato inválido');
    process.exit(1);
  }

  console.log(`\n🔄 Aplicando migration em ${ref}...`);

  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: SQL }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error('❌ Erro:', body?.message || res.status);
    console.error('\nCole este SQL manualmente no Supabase SQL Editor:\n');
    console.error(SQL + '\n');
    process.exit(1);
  }

  console.log('✅ Migration aplicada com sucesso!\n');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
