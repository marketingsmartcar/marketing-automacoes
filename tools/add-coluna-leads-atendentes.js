'use strict';
require('dotenv').config();

async function main() {
  const url = process.env.NEXUSZ_SUPABASE_URL;
  const key = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Variáveis NEXUSZ_SUPABASE_URL / NEXUSZ_SUPABASE_SERVICE_ROLE_KEY não encontradas');

  // Verifica se a coluna já existe
  const check = await fetch(`${url}/rest/v1/leads_atendentes?select=novos_contatos&limit=1`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` },
  });
  if (check.ok) {
    console.log('✅ Coluna novos_contatos já existe — nada a fazer.');
    return;
  }

  // Usa o endpoint interno do PostgREST para executar SQL via pg_net ou similar
  // Alternativa: chama a API de migrations do Supabase Management
  const ref = url.replace('https://', '').split('.')[0];
  const mgmtRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({ query: 'ALTER TABLE leads_atendentes ADD COLUMN IF NOT EXISTS novos_contatos integer NOT NULL DEFAULT 0;' }),
  });
  const body = await mgmtRes.text();
  console.log('Management API:', mgmtRes.status, body);

  if (!mgmtRes.ok) {
    console.log('\n⚠️  Management API requer Personal Access Token (não service role).');
    console.log('Execute manualmente no Supabase SQL Editor:');
    console.log('ALTER TABLE leads_atendentes ADD COLUMN IF NOT EXISTS novos_contatos integer NOT NULL DEFAULT 0;');
  }
}

main().catch(e => { console.error('Erro:', e.message); process.exit(1); });
