'use strict';
/**
 * tools/retroativo-recargas.js
 *
 * Retroativo de recargas para contas encerradas (Jaú e Ibitinga) e
 * reconstrução completa das recargas Google com IDs corretos.
 *
 * O que faz:
 *  - Google: insere TODAS as propostas de Jaú (Jan–Abr 2026)
 *            + recalcula qualquer conta que esteja faltando
 *  - Meta:   tenta /transactions para Jaú e Ibitinga (data real);
 *            se bloqueado, define BASELINE para cada conta
 *
 * Uso:
 *   node tools/retroativo-recargas.js
 *   node tools/retroativo-recargas.js --google   (só Google)
 *   node tools/retroativo-recargas.js --meta     (só Meta)
 */

require('dotenv').config();

const SUPABASE_URL = process.env.NEXUSZ_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY;
const GRAPH_BASE   = 'https://graph.facebook.com/v21.0';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ NEXUSZ_SUPABASE_URL / NEXUSZ_SUPABASE_SERVICE_ROLE_KEY não configurados');
  process.exit(1);
}

const TOKEN_BR = process.env.META_ACCESS_TOKEN_BR;

// ── Contas ────────────────────────────────────────────────────────────────────

// Todas as contas Google (incluindo encerradas)
const CONTAS_GOOGLE_ALL = [
  { nome: 'BR PNEUS AMERICANA',   id: process.env.GOOGLE_ACCOUNT_BR_AMERICANA,   cutoff: null },
  { nome: 'BR PNEUS ARARAQUARA',  id: process.env.GOOGLE_ACCOUNT_BR_ARARAQUARA,  cutoff: null },
  { nome: 'BR PNEUS MARINGÁ',     id: process.env.GOOGLE_ACCOUNT_BR_MARINGA,     cutoff: null },
  { nome: 'BR PNEUS SÃO CARLOS',  id: process.env.GOOGLE_ACCOUNT_BR_SAO_CARLOS,  cutoff: null },
  { nome: 'PEG PNEUS ARARAQUARA', id: process.env.GOOGLE_ACCOUNT_PEG_ARARAQUARA, cutoff: null },
  { nome: 'PEG PNEUS SOROCABA',   id: process.env.GOOGLE_ACCOUNT_PEG_SOROCABA,   cutoff: null },
  // Encerradas em mai/2026 — só inserir propostas ANTES de 2026-05-01
  { nome: 'BR PNEUS JAÚ',         id: process.env.GOOGLE_ACCOUNT_BR_JAU,         cutoff: '2026-05-01' },
];

// Contas Meta encerradas que nunca tiveram recargas registradas
const CONTAS_META_FECHADAS = [
  { nome: 'BR PNEUS JAÚ',      id: process.env.META_ACCOUNT_BR_JAU,      recarga: 'saldo', token: TOKEN_BR, cutoff: '2026-05-01' },
  { nome: 'BR PNEUS IBITINGA', id: process.env.META_ACCOUNT_BR_IBITINGA, recarga: 'saldo', token: TOKEN_BR, cutoff: '2026-05-01' },
];

// ── Supabase helpers ──────────────────────────────────────────────────────────

const sbHeaders = {
  apikey:         SUPABASE_KEY,
  Authorization:  `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer:         'return=minimal',
};

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: sbHeaders });
  if (!res.ok) throw new Error(`Supabase GET ${path} falhou (${res.status})`);
  return res.json();
}

async function sbInsert(tabela, rows) {
  if (!rows.length) return;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${tabela}`, {
    method:  'POST',
    headers: { ...sbHeaders, Prefer: 'return=minimal' },
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

// ── Google Ads ────────────────────────────────────────────────────────────────

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

async function retroativoGoogle() {
  console.log('\n💳 Google Ads — retroativo de propostas...');

  // Buscar descrições já salvas (dedup)
  const existRows = await sbGet('ads_recargas?plataforma=eq.google&select=descricao&limit=10000').catch(() => []);
  const jaExistem = new Set(existRows.map(r => r.descricao).filter(Boolean));

  const novas = [];

  for (const conta of CONTAS_GOOGLE_ALL) {
    if (!conta.id) { console.warn(`  ⚠️  ${conta.nome}: sem ID configurado`); continue; }
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

      let prevMicros = 0;
      let novaConta  = 0;
      let puladas    = 0;

      for (const row of proposals) {
        const p = row.account_budget_proposal;
        if (!p) continue;

        const curMicros = Number(
          p.proposedSpendingLimitMicros ?? p.proposed_spending_limit_micros ?? 0
        );
        if (curMicros <= prevMicros) { prevMicros = curMicros; continue; }

        const rawDt = p.creationDateTime || p.creation_date_time || '';
        const dt    = String(rawDt).replace(' ', 'T');
        const propId = p.id || p.resourceName || `${curMicros}_${cKey}`;
        const descId = `proposal_${propId}`;
        const delta  = Math.round((curMicros - prevMicros) / 10000) / 100;

        // Para contas encerradas: só inserir propostas antes do cutoff
        if (conta.cutoff && dt && dt >= conta.cutoff) {
          puladas++;
          prevMicros = curMicros;
          continue;
        }

        if (!jaExistem.has(descId) && delta >= 0.01) {
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
          jaExistem.add(descId); // evita dup dentro do loop
          novaConta++;
        }

        prevMicros = curMicros;
      }

      const aviso = conta.cutoff ? ` (${puladas} ignoradas pós-${conta.cutoff})` : '';
      console.log(`  ✅ ${conta.nome}: ${proposals.length} propostas → ${novaConta} nova(s)${aviso}`);
    } catch (err) {
      console.warn(`  ⚠️  ${conta.nome}: ${String(err.message || err).slice(0, 120)}`);
    }
  }

  if (novas.length === 0) {
    console.log('  ℹ️  Nenhuma nova recarga Google para inserir');
    return;
  }

  await sbInsert('ads_recargas', novas);
  console.log(`  ✅ ${novas.length} recarga(s) Google inserida(s)`);
}

// ── Meta Ads — contas encerradas ──────────────────────────────────────────────

async function tryTransactions(contaId, token) {
  // Tenta buscar transactions reais (histórico de pagamentos)
  const url = new URL(`${GRAPH_BASE}/${contaId}/transactions`);
  url.searchParams.set('access_token', token);
  url.searchParams.set('fields', 'id,created_time,amount,currency,status,type');
  url.searchParams.set('limit', '200');

  const res  = await fetch(url.toString());
  const json = await res.json().catch(() => null);
  if (!json) return null;
  if (json.error) {
    console.log(`    → /transactions bloqueado: ${json.error.message}`);
    return null;
  }
  return json.data || [];
}

async function retroativoMeta() {
  console.log('\n💳 Meta Ads — retroativo Jaú + Ibitinga...');

  if (!TOKEN_BR) {
    console.warn('  ⚠️  META_ACCESS_TOKEN_BR não configurado — pulando Meta');
    return;
  }

  // Buscar entradas já salvas para essas contas
  const existRows = await sbGet('ads_recargas?plataforma=eq.meta&select=conta_key,valor,descricao').catch(() => []);
  const jaExistem = new Set(existRows.map(r => r.descricao).filter(Boolean));

  // Soma já armazenada por conta (para baseline delta)
  const storedByConta = new Map();
  for (const r of existRows) {
    storedByConta.set(r.conta_key, (storedByConta.get(r.conta_key) || 0) + (r.valor || 0));
  }

  const novas = [];
  const agora  = new Date().toISOString();

  for (const conta of CONTAS_META_FECHADAS) {
    if (!conta.id || !conta.token) { console.warn(`  ⚠️  ${conta.nome}: sem ID/token`); continue; }
    const cKey = contaKey(conta.nome, 'meta');
    const idLimpo = conta.id.replace(/^act_/, '');

    console.log(`  🔄 ${conta.nome} (${conta.id})`);

    // 1. Tentar /transactions (dados reais com datas)
    const txs = await tryTransactions(idLimpo, conta.token);

    if (txs && txs.length > 0) {
      console.log(`    → ${txs.length} transação(ões) encontrada(s) via /transactions`);

      for (const tx of txs) {
        // Só tipo CHARGE = crédito adicionado
        if (tx.type !== 'CHARGE' && tx.type !== 'CREDIT') continue;
        const valor  = parseFloat(tx.amount || '0');
        if (valor <= 0) continue;

        const dt     = tx.created_time ? tx.created_time.slice(0, 10) : agora.slice(0, 10);
        // Respeitar cutoff: contas encerradas não devem ter PIX pós-mai/2026
        if (conta.cutoff && dt >= conta.cutoff) continue;

        const descId = `tx_${tx.id || dt + '_' + valor}`;
        if (jaExistem.has(descId)) continue;

        novas.push({
          conta_key:    cKey,
          conta_label:  conta.nome,
          plataforma:   'meta',
          data_recarga: dt + 'T12:00:00Z',
          valor,
          tipo_recarga: conta.recarga,
          status:       'SUCCESS',
          descricao:    descId,
        });
        jaExistem.add(descId);
      }
      console.log(`    → ${novas.filter(n => n.conta_key === cKey).length} nova(s) para inserir`);
      continue;
    }

    // 2. Fallback: balance + amount_spent delta (BASELINE)
    try {
      const url = new URL(`${GRAPH_BASE}/${idLimpo}`);
      url.searchParams.set('fields', 'balance,amount_spent');
      url.searchParams.set('access_token', conta.token);
      const res  = await fetch(url.toString());
      const data = await res.json();

      if (data.error) {
        console.warn(`    ⚠️  ${data.error.message}`);
        continue;
      }

      const bal            = parseInt(data.balance       || '0', 10);
      const spent          = parseInt(data.amount_spent  || '0', 10);
      const totalVidaReais = (bal + spent) / 100;
      const jaGuardado     = storedByConta.get(cKey) || 0;

      if (jaGuardado > 0) {
        console.log(`    → já tem BASELINE R$${jaGuardado.toFixed(2)} — sem ação`);
        continue;
      }

      console.log(`    → sem dados via /transactions; gravando BASELINE R$${totalVidaReais.toFixed(2)}`);
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
    } catch (err) {
      console.warn(`    ⚠️  ${err.message}`);
    }
  }

  if (novas.length === 0) {
    console.log('  ℹ️  Nenhuma nova recarga Meta para inserir');
    return;
  }

  const success = novas.filter(n => n.status === 'SUCCESS');
  const base    = novas.filter(n => n.status === 'BASELINE');

  await sbInsert('ads_recargas', novas);
  console.log(`  ✅ ${success.length} recarga(s) SUCCESS + ${base.length} BASELINE inserida(s)`);
  if (base.length > 0) {
    console.log('  ⚠️  BASELINE não aparecem no dashboard (filtradas). Para exibir,');
    console.log('      adicione os valores manualmente via painel Supabase como SUCCESS.');
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args     = process.argv.slice(2);
  const soGoogle = args.includes('--google');
  const soMeta   = args.includes('--meta');

  console.log(`\n📊 Retroativo de Recargas — ${new Date().toLocaleString('pt-BR')}\n`);
  console.log('Contas Google incluídas: 6 ativas + BR PNEUS JAÚ (Jan–Abr 2026)');
  console.log('Contas Meta incluídas: BR PNEUS JAÚ + BR PNEUS IBITINGA (encerradas)\n');

  try {
    if (!soMeta)   await retroativoGoogle();
    if (!soGoogle) await retroativoMeta();
    console.log('\n✅ Retroativo concluído');
  } catch (err) {
    console.error('❌', err.message);
    process.exit(1);
  }
}

main();
