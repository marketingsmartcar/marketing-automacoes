'use strict';
/**
 * tools/testar-meta-billing.js
 *
 * Testa vários endpoints da Meta Ads API para encontrar
 * histórico de pagamentos/PIX de uma conta.
 *
 * Uso:
 *   node tools/testar-meta-billing.js
 */
require('dotenv').config();

const GRAPH_BASE = 'https://graph.facebook.com/v21.0';
const TOKEN      = process.env.META_ACCESS_TOKEN_BR;

// Testar com a primeira conta ativa (Maringá)
const CONTA_ID   = process.env.META_ACCOUNT_BR_MARINGA?.replace(/^act_/, '');
const CONTA_NOME = 'BR PNEUS MARINGÁ';

if (!TOKEN || !CONTA_ID) {
  console.error('❌ META_ACCESS_TOKEN_BR ou META_ACCOUNT_BR_MARINGA não configurados');
  process.exit(1);
}

async function get(path, params = {}) {
  const url = new URL(`${GRAPH_BASE}/${path}`);
  url.searchParams.set('access_token', TOKEN);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res  = await fetch(url.toString());
  return res.json().catch(() => ({ _httpStatus: res.status }));
}

async function testar(nome, path, params = {}) {
  console.log(`\n🔎 ${nome}`);
  console.log(`   GET /${path}`);
  try {
    const data = await get(path, params);
    if (data.error) {
      console.log(`   ❌ Erro: ${data.error.message}`);
    } else if (Array.isArray(data.data)) {
      console.log(`   ✅ ${data.data.length} registro(s)`);
      if (data.data.length > 0) {
        console.log(`   Primeiro:`, JSON.stringify(data.data[0], null, 2).slice(0, 400));
      }
    } else {
      const keys = Object.keys(data).filter(k => k !== 'paging');
      console.log(`   ✅ Campos: ${keys.join(', ')}`);
      console.log(`   Dados:`, JSON.stringify(data, null, 2).slice(0, 500));
    }
  } catch (err) {
    console.log(`   ❌ Exceção: ${err.message}`);
  }
}

async function main() {
  console.log(`\n📊 Teste de endpoints Meta Billing — ${CONTA_NOME} (act_${CONTA_ID})`);
  console.log(`Token: ...${TOKEN.slice(-10)}\n`);

  const id = CONTA_ID;

  await testar('1. Saldo + gasto atual',        `act_${id}`, { fields: 'balance,amount_spent,currency' });
  await testar('2. /transactions',               `act_${id}/transactions`, { limit: '5' });
  await testar('3. /adspaymentcycle',            `act_${id}/adspaymentcycle`);
  await testar('4. /billing_invoices',           `act_${id}/billing_invoices`, { limit: '5' });
  await testar('5. /funding_source_details',     `act_${id}/funding_source_details`);
  await testar('6. /adaccounts com campos extra',`act_${id}`, {
    fields: 'balance,amount_spent,spend_cap,currency,funding_source_details,payment_account_id',
  });
  await testar('7. /billing_summary (business)', `act_${id}`, {
    fields: 'billing_summary',
  });
  await testar('8. /transactions com after',     `act_${id}/transactions`, {
    limit: '5',
    after: '',
    fields: 'id,created_time,amount,currency,status,type,description',
  });
  await testar('9. /prepay_order',               `act_${id}/prepay_order`, { limit: '5' });
  await testar('10. /charges',                   `act_${id}/charges`, {
    limit: '5',
    fields: 'id,created_time,amount,currency,status',
  });

  console.log('\n✅ Teste concluído');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
