'use strict';

require('dotenv').config();

const axios              = require('axios');
const { GoogleAdsApi }  = require('google-ads-api');

// ─── Contas ────────────────────────────────────────────────────────────────────

const TOKEN_BR  = process.env.META_ACCESS_TOKEN_BR;
const TOKEN_PEG = process.env.META_ACCESS_TOKEN_PEG;
const GRAPH_BASE = 'https://graph.facebook.com/v21.0';

const CONTAS_META = [
  { nome: 'BR PNEUS MARINGÁ',     id: process.env.META_ACCOUNT_BR_MARINGA,     token: TOKEN_BR },
  { nome: 'BR PNEUS AMERICANA',   id: process.env.META_ACCOUNT_BR_AMERICANA,   token: TOKEN_BR },
  { nome: 'BR PNEUS SÃO CARLOS',  id: process.env.META_ACCOUNT_BR_SAO_CARLOS,  token: TOKEN_BR },
  { nome: 'BR PNEUS ARARAQUARA',  id: process.env.META_ACCOUNT_BR_ARARAQUARA,  token: TOKEN_BR },
  { nome: 'PEG PNEUS SOROCABA',   id: process.env.META_ACCOUNT_PEG_SOROCABA,   token: TOKEN_PEG },
  { nome: 'PEG PNEUS ARARAQUARA', id: process.env.META_ACCOUNT_PEG_ARARAQUARA, token: TOKEN_PEG },
].filter(c => c.id && c.token);

const CONTAS_GOOGLE = [
  { nome: 'BR PNEUS AMERICANA',   id: process.env.GOOGLE_ACCOUNT_BR_AMERICANA },
  { nome: 'BR PNEUS ARARAQUARA',  id: process.env.GOOGLE_ACCOUNT_BR_ARARAQUARA },
  { nome: 'BR PNEUS MARINGÁ',     id: process.env.GOOGLE_ACCOUNT_BR_MARINGA },
  { nome: 'BR PNEUS SÃO CARLOS',  id: process.env.GOOGLE_ACCOUNT_BR_SAO_CARLOS },
  { nome: 'PEG PNEUS ARARAQUARA', id: process.env.GOOGLE_ACCOUNT_PEG_ARARAQUARA },
  { nome: 'PEG PNEUS SOROCABA',   id: process.env.GOOGLE_ACCOUNT_PEG_SOROCABA },
].filter(c => c.id);

// ─── Helpers ───────────────────────────────────────────────────────────────────

function dataN(diasAtras) {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return d.toISOString().slice(0, 10);
}

function ddmm(isoDate) {
  const [, m, d] = isoDate.split('-');
  return `${d}/${m}`;
}

function variacaoStr(atual, anterior) {
  if (anterior === 0) return atual > 0 ? '_(novo)_' : '';
  const pct = ((atual - anterior) / anterior) * 100;
  const sinal = pct >= 0 ? '▲' : '▼';
  return `${sinal} ${Math.abs(pct).toFixed(0)}%`;
}

// ─── Meta Ads — spend por período ─────────────────────────────────────────────

async function spendMetaConta(accountId, token, desde, ate) {
  try {
    const id  = accountId.replace('act_', '');
    const url = new URL(`${GRAPH_BASE}/act_${id}/insights`);
    url.searchParams.set('access_token', token);
    url.searchParams.set('fields', 'spend');
    url.searchParams.set('time_range', JSON.stringify({ since: desde, until: ate }));
    url.searchParams.set('level', 'account');

    const { data } = await axios.get(url.toString());
    if (data.error) return 0;
    return parseFloat(data.data?.[0]?.spend || 0);
  } catch {
    return 0;
  }
}

// ─── Google Ads — spend por período ───────────────────────────────────────────

function criarClienteGoogle(customerId) {
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

async function spendGoogleConta(customerId, desde, ate) {
  try {
    const customer = criarClienteGoogle(customerId);
    const rows = await customer.query(`
      SELECT metrics.cost_micros
      FROM customer
      WHERE segments.date BETWEEN '${desde}' AND '${ate}'
    `);
    return rows.reduce((s, r) => s + ((r.metrics?.cost_micros || 0) / 1_000_000), 0);
  } catch {
    return 0;
  }
}

// ─── Gerar relatório ───────────────────────────────────────────────────────────

async function gerarRelatorioSemanal() {
  // Semana atual: D-7 até D-1 (7 dias completos)
  // Semana anterior: D-14 até D-8
  const semAtualFim    = dataN(1);
  const semAtualInicio = dataN(7);
  const semAntFim      = dataN(8);
  const semAntInicio   = dataN(14);

  console.log(`📅 Relatório semanal: ${ddmm(semAtualInicio)}–${ddmm(semAtualFim)} vs ${ddmm(semAntInicio)}–${ddmm(semAntFim)}`);

  // Meta — buscar as duas semanas em paralelo
  const metaAtual = await Promise.all(
    CONTAS_META.map(c => spendMetaConta(c.id, c.token, semAtualInicio, semAtualFim).then(v => ({ nome: c.nome, valor: v })))
  );
  const metaAnterior = await Promise.all(
    CONTAS_META.map(c => spendMetaConta(c.id, c.token, semAntInicio, semAntFim).then(v => ({ nome: c.nome, valor: v })))
  );

  // Google — buscar as duas semanas em paralelo
  const googleAtual = await Promise.all(
    CONTAS_GOOGLE.map(c => spendGoogleConta(c.id, semAtualInicio, semAtualFim).then(v => ({ nome: c.nome, valor: v })))
  );
  const googleAnterior = await Promise.all(
    CONTAS_GOOGLE.map(c => spendGoogleConta(c.id, semAntInicio, semAntFim).then(v => ({ nome: c.nome, valor: v })))
  );

  const totalMetaAtual    = metaAtual.reduce((s, r) => s + r.valor, 0);
  const totalMetaAnterior = metaAnterior.reduce((s, r) => s + r.valor, 0);
  const totalGoogleAtual    = googleAtual.reduce((s, r) => s + r.valor, 0);
  const totalGoogleAnterior = googleAnterior.reduce((s, r) => s + r.valor, 0);

  return {
    semanas: {
      atual:    { inicio: semAtualInicio, fim: semAtualFim },
      anterior: { inicio: semAntInicio,  fim: semAntFim },
    },
    meta: {
      atual:    metaAtual,
      anterior: metaAnterior,
      totalAtual:    totalMetaAtual,
      totalAnterior: totalMetaAnterior,
    },
    google: {
      atual:    googleAtual,
      anterior: googleAnterior,
      totalAtual:    totalGoogleAtual,
      totalAnterior: totalGoogleAnterior,
    },
    totalAtual:    totalMetaAtual + totalGoogleAtual,
    totalAnterior: totalMetaAnterior + totalGoogleAnterior,
  };
}

// ─── Formatar mensagem WhatsApp ────────────────────────────────────────────────

function formatarRelatorioSemanal(r) {
  const { semanas, meta, google } = r;
  const s = semanas;

  function linhasConta(atual, anterior) {
    return atual.map((a, i) => {
      const ant  = anterior[i]?.valor || 0;
      const nome = a.nome.replace('BR PNEUS ', '').replace('PEG PNEUS ', 'Peg ');
      const v    = variacaoStr(a.valor, ant);
      return `  • ${nome}: R$${a.valor.toFixed(0)} ${v ? `_(${v})_` : ''}`.trimEnd();
    }).join('\n');
  }

  const varMeta   = variacaoStr(meta.totalAtual,   meta.totalAnterior);
  const varGoogle = variacaoStr(google.totalAtual, google.totalAnterior);
  const varTotal  = variacaoStr(r.totalAtual,      r.totalAnterior);

  let msg =
    `📅 *Relatório Semanal de Ads*\n` +
    `_${ddmm(s.atual.inicio)}–${ddmm(s.atual.fim)} vs ${ddmm(s.anterior.inicio)}–${ddmm(s.anterior.fim)}_\n`;

  msg += `\n🟦 *Meta Ads*\n`;
  msg += `Esta semana: *R$${meta.totalAtual.toFixed(0)}* _(${varMeta})_\n`;
  msg += `Sem. anterior: R$${meta.totalAnterior.toFixed(0)}\n`;
  msg += linhasConta(meta.atual, meta.anterior);

  msg += `\n\n🟦 *Google Ads*\n`;
  msg += `Esta semana: *R$${google.totalAtual.toFixed(0)}* _(${varGoogle})_\n`;
  msg += `Sem. anterior: R$${google.totalAnterior.toFixed(0)}\n`;
  msg += linhasConta(google.atual, google.anterior);

  msg += `\n\n💰 *Total geral: R$${r.totalAtual.toFixed(0)}* _(${varTotal})_`;

  return msg.trim();
}

// ─── Entry point ───────────────────────────────────────────────────────────────

module.exports = { gerarRelatorioSemanal, formatarRelatorioSemanal };

if (require.main === module) {
  gerarRelatorioSemanal()
    .then(r => console.log('\n' + formatarRelatorioSemanal(r)))
    .catch(err => { console.error('Erro:', err.message); process.exit(1); });
}
