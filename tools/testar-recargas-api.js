'use strict';
/**
 * testar-recargas-api.js — descobre endpoints de histórico de pagamento
 *
 * Meta: tenta billing_account, payment_transactions, etc.
 * Google: tenta payments GAQL e account_budget_proposal
 */

require('dotenv').config();

const { GoogleAdsApi } = require('google-ads-api');
const GRAPH = 'https://graph.facebook.com/v21.0';

// ── Meta helpers ──────────────────────────────────────────────────────────────

async function g(path, token, params = {}) {
  const url = new URL(`${GRAPH}/${path}`);
  url.searchParams.set('access_token', token);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  }
  const res = await fetch(url.toString());
  return res.json();
}

// ── Google helper ─────────────────────────────────────────────────────────────

function criarCliente(customerId) {
  const api = new GoogleAdsApi({
    client_id:       process.env.GOOGLE_ADS_CLIENT_ID,
    client_secret:   process.env.GOOGLE_ADS_CLIENT_SECRET,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
  });
  return api.Customer({
    customer_id:       String(customerId).replace(/-/g, ''),
    login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
    refresh_token:     process.env.GOOGLE_ADS_REFRESH_TOKEN,
  });
}

async function gaql(customerId, query) {
  try {
    const c = criarCliente(customerId);
    const rows = await c.query(query);
    return { ok: true, rows };
  } catch (err) {
    return { ok: false, err: err.message || JSON.stringify(err).slice(0, 300) };
  }
}

// ── Testes Meta ───────────────────────────────────────────────────────────────

async function testarMeta() {
  const TOKEN_BR  = process.env.META_ACCESS_TOKEN_BR;
  const TOKEN_PEG = process.env.META_ACCESS_TOKEN_PEG;

  // Usar Peg Araraquara (prepaid/fundos) como cobaia
  const PEG_ID  = process.env.META_ACCOUNT_PEG_ARARAQUARA;
  const BR_ID   = process.env.META_ACCOUNT_BR_SAO_CARLOS;

  console.log('\n══════════════ META ══════════════');
  console.log(`Conta cobaia: PEG_ARQ = ${PEG_ID}`);

  const testes = [
    // 1. billing_account do ad account
    { label: 'billing_account fields', path: `act_${PEG_ID?.replace('act_','')}`, params: { fields: 'billing_account,billing_account_id' }, token: TOKEN_PEG },
    // 2. transactions (conhecidamente bloqueado — confirmar erro)
    { label: 'transactions (baseline)', path: `act_${PEG_ID?.replace('act_','')}`, params: { fields: 'transactions' }, token: TOKEN_PEG },
    // 3. business_manager billing history via act
    { label: 'all_payment_methods', path: `act_${PEG_ID?.replace('act_','')}`, params: { fields: 'all_payment_methods' }, token: TOKEN_PEG },
    // 4. spending_limit e informações de prepaid
    { label: 'spend_cap + prepaid_card_balance', path: `act_${PEG_ID?.replace('act_','')}`, params: { fields: 'spend_cap,prepaid_card_balance,balance,currency,account_status,funding_source,funding_source_details' }, token: TOKEN_PEG },
    // 5. adspaymentcycle
    { label: 'adspaymentcycle', path: `act_${PEG_ID?.replace('act_','')}`, params: { fields: 'adspaymentcycle' }, token: TOKEN_PEG },
    // 6. creditcard / payment_account_id
    { label: 'payment_account_id', path: `act_${PEG_ID?.replace('act_','')}`, params: { fields: 'payment_account_id' }, token: TOKEN_PEG },
    // 7. business manager user transactions
    { label: 'me/payment.subscriptions', path: 'me/payment.subscriptions', params: { token: TOKEN_PEG }, token: TOKEN_PEG },
    // 8. BR São Carlos (fundos também) como segunda amostra
    { label: 'BR_SC all_payment_methods', path: `act_${BR_ID?.replace('act_','')}`, params: { fields: 'all_payment_methods,billing_account' }, token: TOKEN_BR },
  ];

  for (const t of testes) {
    const res = await g(t.path, t.token, t.params);
    const preview = JSON.stringify(res).slice(0, 200);
    const ok = !res.error;
    console.log(`\n[${ok ? '✅' : '❌'}] ${t.label}`);
    console.log(`   ${preview}`);
  }

  // Depois de buscar billing_account_id, tentar payment_methods e transactions nele
  const acctInfo = await g(`act_${PEG_ID?.replace('act_','')}`, TOKEN_PEG, { fields: 'billing_account_id' });
  const baId = acctInfo.billing_account_id;
  if (baId) {
    console.log(`\n→ billing_account_id encontrado: ${baId}`);

    const ba1 = await g(baId, TOKEN_PEG, { fields: 'payment_methods,currency,name,balance' });
    console.log(`\n[billing_account] ${JSON.stringify(ba1).slice(0, 300)}`);

    const ba2 = await g(`${baId}/payment_transactions`, TOKEN_PEG, { limit: 10 });
    console.log(`\n[billing_account/payment_transactions] ${JSON.stringify(ba2).slice(0, 300)}`);

    const ba3 = await g(`${baId}/transactions`, TOKEN_PEG, { limit: 10 });
    console.log(`\n[billing_account/transactions] ${JSON.stringify(ba3).slice(0, 300)}`);
  } else {
    console.log('\n⚠️  billing_account_id não retornado — campos possivelmente indisponíveis');
  }
}

// ── Testes Google ─────────────────────────────────────────────────────────────

async function testarGoogle() {
  const PEG_SOR_ID = process.env.GOOGLE_ACCOUNT_PEG_SOROCABA;

  console.log('\n══════════════ GOOGLE ══════════════');
  console.log(`Conta cobaia: PEG_SOR = ${PEG_SOR_ID}`);

  // 1. payments GAQL
  console.log('\n[1] SELECT payments...');
  const r1 = await gaql(PEG_SOR_ID, `
    SELECT
      payments.payment_amount_micros,
      payments.payment_date_time,
      payments.payment_type
    FROM payments
    LIMIT 20
  `);
  if (r1.ok) {
    console.log(`✅ ${r1.rows.length} linhas`);
    if (r1.rows.length > 0) console.log(JSON.stringify(r1.rows[0], null, 2));
  } else {
    console.log(`❌ ${r1.err?.slice(0, 300)}`);
  }

  // 2. account_budget_proposal (cada proposta = uma adição de fundos)
  console.log('\n[2] SELECT account_budget_proposal...');
  const r2 = await gaql(PEG_SOR_ID, `
    SELECT
      account_budget_proposal.id,
      account_budget_proposal.proposed_spending_limit_micros,
      account_budget_proposal.approved_spending_limit_micros,
      account_budget_proposal.creation_date_time,
      account_budget_proposal.start_date_time,
      account_budget_proposal.proposal_type,
      account_budget_proposal.status
    FROM account_budget_proposal
    ORDER BY account_budget_proposal.creation_date_time DESC
    LIMIT 20
  `);
  if (r2.ok) {
    console.log(`✅ ${r2.rows.length} linhas`);
    r2.rows.forEach(row => console.log(JSON.stringify(row?.account_budget_proposal)));
  } else {
    console.log(`❌ ${r2.err?.slice(0, 300)}`);
  }

  // 3. invoice
  console.log('\n[3] SELECT invoice...');
  const r3 = await gaql(PEG_SOR_ID, `
    SELECT
      invoice.id,
      invoice.type,
      invoice.billing_setup,
      invoice.issue_date,
      invoice.due_date,
      invoice.currency_code,
      invoice.subtotal_amount_micros
    FROM invoice
    WHERE invoice.issue_date >= '2026-01-01'
    LIMIT 20
  `);
  if (r3.ok) {
    console.log(`✅ ${r3.rows.length} linhas`);
    if (r3.rows.length > 0) console.log(JSON.stringify(r3.rows[0], null, 2));
  } else {
    console.log(`❌ ${r3.err?.slice(0, 300)}`);
  }

  // 4. account_budget com created_date_time (cada aprovação pode = recarga)
  console.log('\n[4] SELECT account_budget with dates...');
  const r4 = await gaql(PEG_SOR_ID, `
    SELECT
      account_budget.id,
      account_budget.status,
      account_budget.approved_spending_limit_micros,
      account_budget.adjusted_spending_limit_micros,
      account_budget.amount_served_micros,
      account_budget.start_date_time,
      account_budget.end_date_time,
      account_budget.approved_start_date_time
    FROM account_budget
    ORDER BY account_budget.id DESC
    LIMIT 20
  `);
  if (r4.ok) {
    console.log(`✅ ${r4.rows.length} linhas`);
    r4.rows.forEach(row => console.log(JSON.stringify(row?.account_budget)));
  } else {
    console.log(`❌ ${r4.err?.slice(0, 300)}`);
  }

  // 5. Testar BR Araraquara também
  const BR_ARQ_ID = process.env.GOOGLE_ACCOUNT_BR_ARARAQUARA;
  if (BR_ARQ_ID) {
    console.log('\n[5] payments BR_ARQ...');
    const r5 = await gaql(BR_ARQ_ID, `
      SELECT payments.payment_amount_micros, payments.payment_date_time, payments.payment_type
      FROM payments LIMIT 10
    `);
    if (r5.ok) {
      console.log(`✅ ${r5.rows.length} linhas BR_ARQ`);
      if (r5.rows.length > 0) console.log(JSON.stringify(r5.rows[0], null, 2));
    } else {
      console.log(`❌ BR_ARQ: ${r5.err?.slice(0, 200)}`);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  await testarMeta();
  await testarGoogle();
  console.log('\n✅ Testes concluídos\n');
}

main().catch(e => { console.error('FATAL:', e.message || e); process.exit(1); });
