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
  const resultados = await metaTodas();
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
  const resultados = await googleTodas();
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

// ── Recargas Meta ─────────────────────────────────────────────────────────────

async function buscarTransacoesMeta(conta) {
  const id = conta.id.replace('act_', '');
  try {
    const data = await fetchGraph(`act_${id}/transactions`, conta.token, {
      fields: 'id,time,amount,type,status',
      limit: 100,
    });
    return (data.data || []).map(t => ({
      conta_key:    contaKey(conta.nome, 'meta'),
      conta_label:  conta.nome,
      plataforma:   'meta',
      // Meta retorna `time` como Unix timestamp em segundos
      data_recarga: new Date(t.time * 1000).toISOString(),
      valor:        Math.abs(parseFloat(t.amount || 0)),
      tipo_recarga: conta.recarga ?? null,
      status:       t.status || null,
      descricao:    t.type || null,
    })).filter(r => r.valor > 0); // ignora estornos/zerados
  } catch (err) {
    console.warn(`  ⚠️ Transações ${conta.nome}: ${err.message}`);
    return [];
  }
}

async function coletarRecargas() {
  console.log('💳 Recargas Meta Ads — coletando transações...');
  const todasTransacoes = await Promise.all(CONTAS_META.map(buscarTransacoesMeta));
  const rows = todasTransacoes.flat();

  if (rows.length === 0) {
    console.log('  ℹ️ Nenhuma transação encontrada');
    return;
  }

  // Upsert: se o mesmo registro já existe (mesma conta_key + data_recarga + valor), não duplica
  const upsertHeaders = {
    ...headers,
    Prefer: 'resolution=ignore-duplicates,return=minimal',
  };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/ads_recargas`, {
    method:  'POST',
    headers: upsertHeaders,
    body:    JSON.stringify(rows),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase UPSERT ads_recargas falhou (${res.status}): ${body}`);
  }
  console.log(`  ✅ ${rows.length} transação(ões) Meta salvas`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args      = process.argv.slice(2);
  const soMeta    = args.includes('--meta');
  const soGoogle  = args.includes('--google');
  const soRecargas = args.includes('--recargas');

  console.log(`\n📊 Coleta ADS → Supabase — ${new Date().toLocaleString('pt-BR')}\n`);

  try {
    if (soRecargas) {
      await coletarRecargas();
    } else {
      if (!soGoogle) await coletarMeta();
      if (!soMeta)   await coletarGoogle();
      if (!soGoogle) await coletarRecargas(); // recargas junto com Meta
    }
    console.log('\n✅ Concluído');
  } catch (err) {
    console.error('❌', err.message);
    process.exit(1);
  }
}

main();
