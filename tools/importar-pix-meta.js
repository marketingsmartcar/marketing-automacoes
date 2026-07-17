'use strict';
/**
 * tools/importar-pix-meta.js
 *
 * Importa PIX históricos do Meta Ads para o Supabase.
 * A Meta API bloqueia /transactions, então os dados devem
 * ser copiados manualmente do Meta Business Manager.
 *
 * Como usar:
 *   1. No Meta Business Manager → Configurações de Cobrança → Histórico de Cobranças
 *      (ou Saldo Pré-pago → Ver histórico)
 *   2. Copie as recargas PIX e preencha o array RECARGAS abaixo
 *   3. Execute: node tools/importar-pix-meta.js
 *   4. Para preview sem salvar: node tools/importar-pix-meta.js --dry-run
 *
 * Contas disponíveis:
 *   BR PNEUS MARINGÁ      → act_314207321290540   tipo: saldo
 *   BR PNEUS AMERICANA    → act_319423037203736   tipo: saldo
 *   BR PNEUS SÃO CARLOS   → act_678751073395713   tipo: fundos
 *   BR PNEUS ARARAQUARA   → act_291920152109217   tipo: fundos
 *   PEG PNEUS SOROCABA    → act_653846450374888   tipo: saldo
 *   PEG PNEUS ARARAQUARA  → act_3736536456594469  tipo: saldo
 */

require('dotenv').config();

// ── PREENCHA AQUI ─────────────────────────────────────────────────────────────
// Formato: { conta, data, valor }
// conta → nome exato (ver lista acima)
// data  → "YYYY-MM-DD"
// valor → número em reais (ex: 500 = R$500,00)

const RECARGAS = [
  // Exemplos (remova e substitua pelos valores reais):
  // { conta: 'BR PNEUS MARINGÁ',     data: '2026-01-10', valor: 500 },
  // { conta: 'BR PNEUS AMERICANA',   data: '2026-01-15', valor: 300 },
  // { conta: 'BR PNEUS SÃO CARLOS',  data: '2026-02-05', valor: 400 },
  // { conta: 'BR PNEUS ARARAQUARA',  data: '2026-02-08', valor: 600 },
  // { conta: 'PEG PNEUS SOROCABA',   data: '2026-03-01', valor: 200 },
  // { conta: 'PEG PNEUS ARARAQUARA', data: '2026-03-12', valor: 350 },
];

// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXUSZ_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ NEXUSZ_SUPABASE_URL / NEXUSZ_SUPABASE_SERVICE_ROLE_KEY não configurados');
  process.exit(1);
}

const CONTAS_META = {
  'BR PNEUS MARINGÁ':      { key: 'br_pneus_maringá_meta',      tipo: 'saldo' },
  'BR PNEUS AMERICANA':    { key: 'br_pneus_americana_meta',    tipo: 'saldo' },
  'BR PNEUS SÃO CARLOS':   { key: 'br_pneus_são_carlos_meta',   tipo: 'fundos' },
  'BR PNEUS ARARAQUARA':   { key: 'br_pneus_araraquara_meta',   tipo: 'fundos' },
  'PEG PNEUS SOROCABA':    { key: 'peg_pneus_sorocaba_meta',    tipo: 'saldo' },
  'PEG PNEUS ARARAQUARA':  { key: 'peg_pneus_araraquara_meta',  tipo: 'saldo' },
};

const sbHeaders = {
  apikey:         SUPABASE_KEY,
  Authorization:  `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log(`\n📥 Importação PIX Meta Ads${dryRun ? ' [DRY RUN — sem salvar]' : ''}`);
  console.log(`   ${RECARGAS.length} recarga(s) configuradas\n`);

  if (RECARGAS.length === 0) {
    console.log('⚠️  Nenhuma recarga configurada. Preencha o array RECARGAS neste arquivo.');
    console.log('\nComo encontrar no Meta Business Manager:');
    console.log('  → Acesse business.facebook.com');
    console.log('  → Configurações → Cobrança → Histórico de cobranças');
    console.log('  → Filtre por "Crédito adicionado" ou "Pix"');
    return;
  }

  // Buscar descrições já salvas (dedup)
  const existRes = await fetch(
    `${SUPABASE_URL}/rest/v1/ads_recargas?plataforma=eq.meta&select=descricao`,
    { headers: sbHeaders }
  );
  const existRows = existRes.ok ? await existRes.json().catch(() => []) : [];
  const jaExistem = new Set(existRows.map(r => r.descricao).filter(Boolean));

  const rows = [];
  const erros = [];

  for (const rec of RECARGAS) {
    const info = CONTAS_META[rec.conta];
    if (!info) {
      erros.push(`Conta desconhecida: "${rec.conta}"`);
      continue;
    }
    if (!rec.data || !/^\d{4}-\d{2}-\d{2}$/.test(rec.data)) {
      erros.push(`Data inválida para ${rec.conta}: "${rec.data}" (use YYYY-MM-DD)`);
      continue;
    }
    if (!rec.valor || rec.valor <= 0) {
      erros.push(`Valor inválido para ${rec.conta}: ${rec.valor}`);
      continue;
    }

    // ID único: manual_meta_{key}_{data}_{valor centavos}
    const descId = `manual_${info.key}_${rec.data}_${Math.round(rec.valor * 100)}`;

    if (jaExistem.has(descId)) {
      console.log(`  ⏭️  ${rec.conta} ${rec.data} R$${rec.valor} — já existe, pulando`);
      continue;
    }

    rows.push({
      conta_key:    info.key,
      conta_label:  rec.conta,
      plataforma:   'meta',
      data_recarga: `${rec.data}T12:00:00Z`,
      valor:        rec.valor,
      tipo_recarga: info.tipo,
      status:       'SUCCESS',
      descricao:    descId,
    });
  }

  if (erros.length > 0) {
    console.log('❌ Erros de validação:');
    erros.forEach(e => console.log(`   • ${e}`));
    if (rows.length === 0) process.exit(1);
    console.log('');
  }

  if (rows.length === 0) {
    console.log('ℹ️  Nenhuma recarga nova para inserir.');
    return;
  }

  console.log(`📋 Recargas a inserir (${rows.length}):\n`);
  for (const r of rows) {
    console.log(`  ✅ ${r.conta_label.padEnd(25)} ${r.data_recarga.slice(0,10)}  R$${r.valor.toFixed(2).padStart(10)}  [${r.tipo_recarga}]`);
  }

  if (dryRun) {
    console.log('\n🔸 Dry run — nenhum dado salvo. Remova --dry-run para salvar.');
    return;
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/ads_recargas`, {
    method:  'POST',
    headers: { ...sbHeaders, Prefer: 'return=minimal' },
    body:    JSON.stringify(rows),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`\n❌ Erro ao salvar (${res.status}): ${body}`);
    process.exit(1);
  }

  console.log(`\n✅ ${rows.length} recarga(s) Meta salvas no Supabase com sucesso!`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
