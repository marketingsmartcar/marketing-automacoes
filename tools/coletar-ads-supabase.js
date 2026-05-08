'use strict';
/**
 * tools/coletar-ads-supabase.js
 *
 * Coleta dados de todas as contas Meta Ads e Google Ads e salva
 * snapshots em ads_snapshots e recargas em ads_recargas no Supabase (NexusZ).
 *
 * Uso:
 *   node tools/coletar-ads-supabase.js
 *   node tools/coletar-ads-supabase.js --meta
 *   node tools/coletar-ads-supabase.js --google
 *   node tools/coletar-ads-supabase.js --recargas   (só recargas Meta)
 */

require('dotenv').config();

const { monitorarTodas: metaTodas,    CONTAS_META    } = require('./monitor-meta-ads');
const { monitorarTodas: googleTodas,  CONTAS_GOOGLE  } = require('./monitor-google-ads');

const SUPABASE_URL = process.env.NEXUSZ_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY;
const GRAPH_BASE   = 'https://graph.facebook.com/v21.0';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ NEXUSZ_SUPABASE_URL / NEXUSZ_SUPABASE_SERVICE_ROLE_KEY não configurados');
  process.exit(1);
}

const headers = {
  apikey:          SUPABASE_KEY,
  Authorization:   `Bearer ${SUPABASE_KEY}`,
  'Content-Type':  'application/json',
  Prefer:          'return=minimal',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function inserir(tabela, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${tabela}`, {
    method:  'POST',
    headers,
    body:    JSON.stringify(rows),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase INSERT ${tabela} falhou (${res.status}): ${body}`);
  }
}

function contaKey(nome, plataforma) {
  return nome
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '') + '_' + plataforma;
}

async function fetchGraph(path, token, params = {}) {
  const url = new URL(`${GRAPH_BASE}/${path}`);
  url.searchParams.set('access_token', token);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Graph API ${path}: HTTP ${res.status}`);
  return res.json();
}

// ── Snapshots Meta ────────────────────────────────────────────────────────────

async function coletarMeta() {
  console.log('📱 Meta Ads — coletando...');
  const { resultados } = await metaTodas();
  const rows = resultados.map(r => ({
    conta_key:      contaKey(r.nome, 'meta'),
    conta_label:    r.nome,
    plataforma:     'meta',
    tipo_recarga:   r.recarga,
    saldo_reais:    r.saldo && r.saldo !== '-1' ? parseFloat(r.saldo) / 100 : null,
    saldo_display:  r.saldoDisplay,
    spend_7d:       parseFloat(r.spend7d) || null,
    spend_3d:       parseFloat(r.spend3d) || null,
    impressions_7d: parseInt(r.impressions7d) || null,
    clicks_7d:      parseInt(r.clicks7d) || null,
    ctr_7d:         parseFloat(r.ctr7d) || null,
    cpc_7d:         parseFloat(r.cpc7d) || null,
    reach_7d:       parseInt(r.reach7d) || null,
    gasto_diario:   parseFloat(r.gastoDiario) || null,
    dias_restantes: r.diasRestantes,
    status_conta:   r.status != null ? String(r.status) : null,
    erro:           r.erro || null,
  }));

  await inserir('ads_snapshots', rows);
  console.log(`  ✅ ${rows.length} conta(s) Meta salvas`);
  return rows;
}

// ── Snapshots Google ──────────────────────────────────────────────────────────

async function coletarGoogle() {
  console.log('🔍 Google Ads — coletando...');
  const { resultados } = await googleTodas();
  const rows = resultados.map(r => ({
    conta_key:      contaKey(r.nome, 'google'),
    conta_label:    r.nome,
    plataforma:     'google',
    spend_7d:       parseFloat(r.spend7d) || null,
    spend_3d:       parseFloat(r.spend3d) || null,
    impressions_7d: parseInt(r.impressions7d) || null,
    clicks_7d:      parseInt(r.clicks7d) || null,
    ctr_7d:         parseFloat(r.ctr7d) || null,
    cpc_7d:         parseFloat(r.cpc7d) || null,
    conversions_7d: parseFloat(r.conversions7d) || null,
    orcamento_total:r.orcamentoTotal ? parseFloat(r.orcamentoTotal) : null,
    saldo_reais:    r.saldoDisponivel ? parseFloat(r.saldoDisponivel) : null,
    erro:           r.erro || null,
  }));

  await inserir('ads_snapshots', rows);
  console.log(`  ✅ ${rows.length} conta(s) Google salvas`);
  return rows;
}

// ── Recargas Meta (via spend_cap / balance+amount_spent cumulativo) ───────────

async function coletarRecargasMeta() {
  console.log('💳 Recargas Meta Ads — detectando via spend_cap/balance...');

  // Soma já armazenada por conta para calcular delta
  const sumRes  = await fetch(
    `${SUPABASE_URL}/rest/v1/ads_recargas?plataforma=eq.meta&select=conta_key,valor`,
    { headers }
  );
  const sumRows = sumRes.ok ? await sumRes.json().catch(() => []) : [];
  const storedByConta = new Map();
  for (const r of sumRows) {
    storedByConta.set(r.conta_key, (storedByConta.get(r.conta_key) || 0) + r.valor);
  }

  const novas = [];

  for (const conta of CONTAS_META) {
    if (!conta.id || !conta.token) continue;
    const cKey = contaKey(conta.nome, 'meta');

    try {
      const id   = conta.id.replace('act_', '');
      const url  = new URL(`${GRAPH_BASE}/act_${id}`);
      url.searchParams.set('fields', 'spend_cap,balance,amount_spent');
      url.searchParams.set('access_token', conta.token);
      const res  = await fetch(url.toString());
      const data = await res.json();

      if (data.error) {
        console.warn(`  ⚠️  ${conta.nome}: ${data.error.message}`);
        continue;
      }

      let totalVidaReais;
      if (conta.recarga === 'fundos') {
        // spend_cap = total acumulado de fundos adicionados (em centavos)
        const cap = parseInt(data.spend_cap || '0', 10);
        if (cap <= 0) { console.log(`  ⚠️  ${conta.nome}: spend_cap=0 (possível cartão)`); continue; }
        totalVidaReais = cap / 100;
      } else {
        // saldo: balance (atual) + amount_spent (gasto acumulado) = total já depositado
        const bal   = parseInt(data.balance      || '0', 10);
        const spent = parseInt(data.amount_spent || '0', 10);
        const ef    = bal + spent;
        if (ef <= 0) { console.log(`  ⚠️  ${conta.nome}: effective balance = 0`); continue; }
        totalVidaReais = ef / 100;
      }

      const jaGuardado = storedByConta.get(cKey) || 0;
      const delta      = Math.round((totalVidaReais - jaGuardado) * 100) / 100;

      if (delta < 1) {
        console.log(`  ✅ ${conta.nome}: sem nova recarga (total R$${totalVidaReais.toFixed(2)}, guardado R$${jaGuardado.toFixed(2)})`);
        continue;
      }

      console.log(`  🆕 ${conta.nome}: nova recarga detectada R$${delta.toFixed(2)}`);
      novas.push({
        conta_key:   cKey,
        conta_label: conta.nome,
        plataforma:  'meta',
        data_recarga: new Date().toISOString(),
        valor:       delta,
        tipo_recarga: conta.recarga,
        status:      'SUCCESS',
        descricao:   `auto_${new Date().toISOString().slice(0, 10)}`,
      });
    } catch (err) {
      console.warn(`  ⚠️  ${conta.nome}: ${err.message}`);
    }
  }

  if (novas.length === 0) {
    console.log('  ℹ️  Sem novas recargas Meta');
    return;
  }

  const r = await fetch(`${SUPABASE_URL}/rest/v1/ads_recargas`, {
    method:  'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body:    JSON.stringify(novas),
  });
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    throw new Error(`Supabase INSERT ads_recargas Meta falhou (${r.status}): ${body}`);
  }
  console.log(`  ✅ ${novas.length} recarga(s) Meta registrada(s)`);
}

// ── Recargas Google (via account_budget_proposal deltas) ──────────────────────

function criarClienteGoogle(customerId) {
  const { GoogleAdsApi } = require('google-ads-api');
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

async function coletarRecargasGoogle() {
  console.log('💳 Recargas Google Ads — coletando account_budget_proposal...');

  // Buscar descrições já salvas para dedup (proposal_XXXXXXX)
  const existRes  = await fetch(
    `${SUPABASE_URL}/rest/v1/ads_recargas?plataforma=eq.google&select=descricao`,
    { headers }
  );
  const existRows = existRes.ok ? await existRes.json().catch(() => []) : [];
  const jaExistem = new Set(existRows.map(r => r.descricao).filter(Boolean));

  const novas = [];

  for (const conta of CONTAS_GOOGLE) {
    if (!conta.id) continue;
    const cKey = contaKey(conta.nome, 'google');

    try {
      const customer  = criarClienteGoogle(conta.id);
      const proposals = await customer.query(`
        SELECT
          account_budget_proposal.id,
          account_budget_proposal.proposed_spending_limit_micros,
          account_budget_proposal.creation_date_time,
          account_budget_proposal.status
        FROM account_budget_proposal
        ORDER BY account_budget_proposal.creation_date_time ASC
      `);

      // Delta cumulativo: cada aumento no spending limit = recarga
      let prevMicros = 0;
      let novaConta  = 0;

      for (const row of proposals) {
        const p = row.account_budget_proposal;
        if (!p) continue;
        const curMicros = Number(p.proposed_spending_limit_micros || 0);
        if (curMicros <= prevMicros) continue; // sem aumento, ignorar

        const descId = `proposal_${p.id}`;
        const delta  = Math.round((curMicros - prevMicros) / 10000) / 100; // micros → reais

        if (!jaExistem.has(descId) && delta >= 0.01) {
          // Normalizar data: "2026-05-02 14:32:00" → ISO
          const dt = String(p.creation_date_time || '').replace(' ', 'T');
          novas.push({
            conta_key:   cKey,
            conta_label: conta.nome,
            plataforma:  'google',
            data_recarga: dt || new Date().toISOString(),
            valor:       delta,
            tipo_recarga: null,
            status:      'SUCCESS',
            descricao:   descId,
          });
          novaConta++;
        }

        prevMicros = curMicros;
      }

      console.log(`  ✅ ${conta.nome}: ${proposals.length} propostas → ${novaConta} nova(s)`);
    } catch (err) {
      console.warn(`  ⚠️  ${conta.nome}: ${String(err.message || err).slice(0, 120)}`);
    }
  }

  if (novas.length === 0) {
    console.log('  ℹ️  Sem novas recargas Google');
    return;
  }

  const r = await fetch(`${SUPABASE_URL}/rest/v1/ads_recargas`, {
    method:  'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body:    JSON.stringify(novas),
  });
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    throw new Error(`Supabase INSERT ads_recargas Google falhou (${r.status}): ${body}`);
  }
  console.log(`  ✅ ${novas.length} recarga(s) Google salva(s)`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args       = process.argv.slice(2);
  const soMeta     = args.includes('--meta');
  const soGoogle   = args.includes('--google');
  const soRecargas = args.includes('--recargas');

  console.log(`\n📊 Coleta ADS → Supabase — ${new Date().toLocaleString('pt-BR')}\n`);

  try {
    if (soRecargas) {
      await coletarRecargasMeta();
      await coletarRecargasGoogle();
    } else {
      if (!soGoogle) { await coletarMeta();   await coletarRecargasMeta();   }
      if (!soMeta)   { await coletarGoogle(); await coletarRecargasGoogle(); }
    }
    console.log('\n✅ Concluído');
  } catch (err) {
    console.error('❌', err.message);
    process.exit(1);
  }
}

main();
