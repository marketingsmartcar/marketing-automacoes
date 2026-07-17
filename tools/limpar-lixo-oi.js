'use strict';
/**
 * tools/limpar-lixo-oi.js
 * Apaga linhas sem dados financeiros de oi_colaboradores_resumo.
 * Critério: faturamento IS NULL E lucro_bruto IS NULL E itens = 0
 * (itens de menu do OI, linhas de navegação, etc.)
 * Uso: node tools/limpar-lixo-oi.js
 */
require('dotenv').config();

const BASE = process.env.NEXUSZ_SUPABASE_URL;
const KEY  = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXUSZ_SUPABASE_ANON_KEY;

if (!BASE || !KEY) { console.error('NEXUSZ_SUPABASE_URL / KEY não configurados'); process.exit(1); }

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function main() {
  // 1. Conta quantas linhas serão apagadas
  const countRes = await fetch(
    `${BASE}/rest/v1/oi_colaboradores_resumo?faturamento=is.null&lucro_bruto=is.null&itens=eq.0&select=id`,
    { headers: { ...headers, Prefer: 'count=exact' } }
  );
  const total = countRes.headers.get('content-range')?.split('/')[1] ?? '?';
  console.log(`🔍 ${total} linha(s) sem dados financeiros encontrada(s)`);

  if (total === '0') { console.log('✅ Nada a apagar'); return; }

  // 2. Apaga
  const delRes = await fetch(
    `${BASE}/rest/v1/oi_colaboradores_resumo?faturamento=is.null&lucro_bruto=is.null&itens=eq.0`,
    { method: 'DELETE', headers }
  );

  if (!delRes.ok) {
    const body = await delRes.text().catch(() => '');
    throw new Error(`DELETE falhou (${delRes.status}): ${body}`);
  }

  console.log(`✅ ${total} linha(s) apagada(s) com sucesso`);
}

main().catch(err => { console.error(err); process.exit(1); });
