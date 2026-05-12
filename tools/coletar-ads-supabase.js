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
    tipo_recarga:   r.recarga   ?? null,
    saldo_reais:    r.saldo && r.saldo !== '-1' ? parseFloat(r.saldo) / 100 : null,
    saldo_display:  r.saldoDisplay  ?? null,
    spend_7d:       parseFloat(r.spend7d)       || null,
    spend_3d:       parseFloat(r.spend3d)       || null,
    impressions_7d: parseInt(r.impressions7d)   || null,
    clicks_7d:      parseInt(r.clicks7d)        || null,
    ctr_7d:         parseFloat(r.ctr7d)         || null,
    cpc_7d:         parseFloat(r.cpc7d)         || null,
    reach_7d:       parseInt(r.reach7d)         || null,
    leads_7d:       r.leads7d != null ? parseInt(r.leads7d) : null,
    gasto_diario:   parseFloat(r.gastoDiario)   || null,
    dias_restantes: r.diasRestantes ?? null,
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

// ── Recargas Meta (via balance+amount_spent delta, threshold ≥ R$25) ──────────
// A API /transactions é bloqueada. Usamos balance+amount_spent — inclui BASELINE
// no total acumulado e só registra depósitos com delta ≥ R$25 para filtrar ruído.

async function coletarRecargasMeta() {
  console.log('💳 Recargas Meta Ads — detectando via balance+amount_spent (Δ ≥ R$25)...');

  // Soma TODOS os registros (BASELINE + SUCCESS) para ter o zero-point correto
  const sumRes  = await fetch(
    `${SUPABASE_URL}/rest/v1/ads_recargas?plataforma=eq.meta&select=conta_key,valor`,
    { headers }
  );
  const sumRows  = sumRes.ok ? await sumRes.json().catch(() => []) : [];
  const storedByConta = new Map();
  for (const r of sumRows) {
    storedByConta.set(r.conta_key, (storedByConta.get(r.conta_key) || 0) + r.valor);
  }

  // Descricoes já salvas — dedup por hash do total (pix_{key}_{totalArredondado})
  const existRes  = await fetch(
    `${SUPABASE_URL}/rest/v1/ads_recargas?plataforma=eq.meta&select=descricao`,
    { headers }
  );
  const existRows = existRes.ok ? await existRes.json().catch(() => []) : [];
  const jaExistem = new Set(existRows.map(r => r.descricao).filter(Boolean));

  const novas = [];
  const agora  = new Date().toISOString();

  for (const conta of CONTAS_META) {
    if (!conta.id || !conta.token) continue;
    const cKey = contaKey(conta.nome, 'meta');

    try {
      const url  = new URL(`${GRAPH_BASE}/${conta.id}`);
      url.searchParams.set('fields', 'balance,amount_spent');
      url.searchParams.set('access_token', conta.token);
      const res  = await fetch(url.toString());
      const data = await res.json();

      if (data.error) {
        console.warn(`  ⚠️  ${conta.nome}: ${data.error.message}`);
        continue;
      }

      const bal             = parseInt(data.balance      || '0', 10);
      const spent           = parseInt(data.amount_spent || '0', 10);
      const totalVidaReais  = (bal + spent) / 100;
      const jaGuardado      = storedByConta.get(cKey) || 0;
      const primeiraVez     = jaGuardado === 0;
      const delta           = Math.round((totalVidaReais - jaGuardado) * 100) / 100;

      if (primeiraVez) {
        console.log(`  📌 ${conta.nome}: baseline inicial R$${totalVidaReais.toFixed(2)}`);
        novas.push({
          conta_key:    cKey,
          conta_label:  conta.nome,
          plataforma:   'meta',
          data_recarga: agora,
          valor:        totalVidaReais,
          tipo_recarga: conta.recarga,
          status:       'BASELINE',
          descricao:    `baseline_${agora.slice(0, 10)}`,
        });
        continue;
      }

      // Delta < R$25 → ruído (variação normal do gasto dos anúncios)
      if (delta < 25) {
        console.log(`  ✅ ${conta.nome}: sem recarga (Δ=R$${delta.toFixed(2)} < R$25)`);
        continue;
      }

      // Dedup por hash do total arredondado — evita duplicata se rodar duas vezes seguidas
      const descId = `pix_${cKey}_${Math.round(totalVidaReais * 10)}`;
      if (jaExistem.has(descId)) {
        console.log(`  ✅ ${conta.nome}: recarga R$${delta.toFixed(2)} já registrada`);
        continue;
      }

      console.log(`  🆕 ${conta.nome}: nova recarga R$${delta.toFixed(2)}`);
      novas.push({
        conta_key:    cKey,
        conta_label:  conta.nome,
        plataforma:   'meta',
        data_recarga: agora,
        valor:        delta,
        tipo_recarga: conta.recarga,
        status:       'SUCCESS',
        descricao:    descId,
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
  // account_budget_proposal reflete ajustes de campanha (não depósitos reais) — não rastreável via API padrão
  console.log('💳 Recargas Google Ads — não disponível via API (requer painel de faturamento)');
  return;

  // Buscar descrições já salvas para dedup
  const existRes  = await fetch(
    `${SUPABASE_URL}/rest/v1/ads_recargas?plataforma=eq.google&select=descricao&limit=10000`,
    { headers }
  );
  const existRows = existRes.ok ? await existRes.json().catch(() => []) : [];
  const jaExistem = new Set(existRows.map(r => r.descricao).filter(Boolean));

  // Só considera proposals criadas nos últimos 90 dias
  const corte = new Date();
  corte.setDate(corte.getDate() - 90);
  const corteStr = corte.toISOString().slice(0, 19).replace('T', ' '); // "YYYY-MM-DD HH:MM:SS"

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

      // Primeiro: calcular baseline = maior spending limit ANTES do corte de 90d
      let baseline   = 0;
      let novaConta  = 0;

      for (const row of proposals) {
        const p      = row.account_budget_proposal;
        if (!p) continue;
        const rawDt  = String(p.creationDateTime || p.creation_date_time || '');
        const micros = Number(p.proposedSpendingLimitMicros ?? p.proposed_spending_limit_micros ?? 0);
        if (rawDt < corteStr) {
          if (micros > baseline) baseline = micros;
        }
      }

      // Segundo: detectar aumentos dentro dos últimos 90 dias
      let prevMicros = baseline;

      for (const row of proposals) {
        const p      = row.account_budget_proposal;
        if (!p) continue;
        const rawDt  = String(p.creationDateTime || p.creation_date_time || '');
        if (rawDt < corteStr) continue; // ignora histórico

        const curMicros = Number(p.proposedSpendingLimitMicros ?? p.proposed_spending_limit_micros ?? 0);
        if (curMicros <= prevMicros) { prevMicros = Math.max(prevMicros, curMicros); continue; }

        const propId = p.id || p.resourceName || String(curMicros) + '_' + cKey + '_' + rawDt;
        const descId = `proposal_${propId}`;
        const delta  = Math.round((curMicros - prevMicros) / 10000) / 100; // micros → reais

        if (!jaExistem.has(descId) && delta >= 1) {
          const dt = rawDt.replace(' ', 'T');
          novas.push({
            conta_key:    cKey,
            conta_label:  conta.nome,
            plataforma:   'google',
            data_recarga: dt || new Date().toISOString(),
            valor:        delta,
            tipo_recarga: 'proposta',
            status:       'SUCCESS',
            descricao:    descId,
          });
          novaConta++;
        }

        prevMicros = curMicros;
      }

      console.log(`  ✅ ${conta.nome}: ${proposals.length} propostas → ${novaConta} nova(s) (últimos 90d)`);
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
