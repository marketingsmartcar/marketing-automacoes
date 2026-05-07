'use strict';
/**
 * tools/coletar-ads-supabase.js
 *
 * Coleta dados de todas as contas Meta Ads e Google Ads e salva
 * snapshots em ads_snapshots no Supabase (NexusZ).
 *
 * Uso:
 *   node tools/coletar-ads-supabase.js
 *   node tools/coletar-ads-supabase.js --meta
 *   node tools/coletar-ads-supabase.js --google
 */

require('dotenv').config();

const { monitorarTodas: metaTodas,    CONTAS_META    } = require('./monitor-meta-ads');
const { monitorarTodas: googleTodas,  CONTAS_GOOGLE  } = require('./monitor-google-ads');

const SUPABASE_URL = process.env.NEXUSZ_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY;

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

async function inserir(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/ads_snapshots`, {
    method:  'POST',
    headers,
    body:    JSON.stringify(rows),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase INSERT falhou (${res.status}): ${body}`);
  }
}

function contaKey(nome, plataforma) {
  return nome
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '') + '_' + plataforma;
}

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

  await inserir(rows);
  console.log(`  ✅ ${rows.length} conta(s) Meta salvas`);
  return rows;
}

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

  await inserir(rows);
  console.log(`  ✅ ${rows.length} conta(s) Google salvas`);
  return rows;
}

async function main() {
  const args    = process.argv.slice(2);
  const soMeta  = args.includes('--meta');
  const soGoogle = args.includes('--google');

  console.log(`\n📊 Coleta ADS → Supabase — ${new Date().toLocaleString('pt-BR')}\n`);

  try {
    if (!soGoogle) await coletarMeta();
    if (!soMeta)   await coletarGoogle();
    console.log('\n✅ Concluído');
  } catch (err) {
    console.error('❌', err.message);
    process.exit(1);
  }
}

main();
