'use strict';

require('dotenv').config();

const { GoogleAdsApi } = require('google-ads-api');

// ─── Configuração das contas ───────────────────────────────────────────────────

const CONTAS_GOOGLE = [
  { nome: 'BR PNEUS AMERICANA',   id: process.env.GOOGLE_ACCOUNT_BR_AMERICANA },
  { nome: 'BR PNEUS ARARAQUARA',  id: process.env.GOOGLE_ACCOUNT_BR_ARARAQUARA },
  { nome: 'BR PNEUS SÃO CARLOS',  id: process.env.GOOGLE_ACCOUNT_BR_SAO_CARLOS },
  { nome: 'PEG PNEUS ARARAQUARA', id: process.env.GOOGLE_ACCOUNT_PEG_ARARAQUARA },
].filter(c => c.id);

// ─── Thresholds ────────────────────────────────────────────────────────────────
const ALERTA_CTR_LARANJA  = 2.0;
const ALERTA_CTR_VERMELHO = 1.0;
const ALERTA_CPC_LARANJA  = 5.0;
const ALERTA_CPC_VERMELHO = 10.0;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function pct(valor) {
  return parseFloat(valor || 0).toFixed(2) + '%';
}

function dataN(diasAtras) {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function sinalCtr(ctr) {
  const v = parseFloat(ctr || 0);
  if (v < ALERTA_CTR_VERMELHO) return '🔴';
  if (v < ALERTA_CTR_LARANJA)  return '🟠';
  return '🟢';
}

function sinalCpc(cpc) {
  const v = parseFloat(cpc || 0);
  if (v > ALERTA_CPC_VERMELHO) return '🔴';
  if (v > ALERTA_CPC_LARANJA)  return '🟠';
  return '🟢';
}

function formatarId(id) {
  return String(id).replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
}

// ─── SDK client ────────────────────────────────────────────────────────────────

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

// ─── Monitor por conta ─────────────────────────────────────────────────────────

async function monitorarContaGoogle(conta) {
  try {
    const customer = criarCliente(conta.id);
    const hoje         = dataN(0);
    const seteDiasAtras = dataN(7);
    const tresDiasAtras = dataN(3);

    // Insights dos últimos 7 dias e últimos 3 dias (paralelo)
    const [insightsRows, insights3dRows] = await Promise.all([
      customer.query(`
        SELECT
          metrics.cost_micros,
          metrics.impressions,
          metrics.clicks,
          metrics.ctr,
          metrics.average_cpc,
          metrics.conversions,
          customer.descriptive_name
        FROM customer
        WHERE segments.date BETWEEN '${seteDiasAtras}' AND '${hoje}'
      `),
      customer.query(`
        SELECT
          metrics.cost_micros
        FROM customer
        WHERE segments.date BETWEEN '${tresDiasAtras}' AND '${hoje}'
      `),
    ]);

    // Orçamento total das campanhas ativas
    const budgetRows = await customer.query(`
      SELECT
        campaign_budget.amount_micros,
        campaign.status,
        campaign.name
      FROM campaign_budget
      WHERE campaign.status = 'ENABLED'
    `).catch(() => []);

    // Saldo disponível (account_budget — prepaid balance)
    const balanceRows = await customer.query(`
      SELECT
        account_budget.adjusted_spending_limit_micros,
        account_budget.amount_served_micros,
        account_budget.status
      FROM account_budget
      WHERE account_budget.status = 'APPROVED'
    `).catch(() => []);

    // Agregar métricas 7 dias
    let spend7d = 0, impressions7d = 0, clicks7d = 0, conversions7d = 0;
    for (const row of insightsRows) {
      const m = row.metrics || {};
      spend7d       += (m.cost_micros      || 0) / 1_000_000;
      impressions7d += parseInt(m.impressions || 0);
      clicks7d      += parseInt(m.clicks     || 0);
      conversions7d += parseFloat(m.conversions || 0);
    }

    // Agregar métricas 3 dias
    let spend3d = 0;
    for (const row of insights3dRows) {
      spend3d += ((row.metrics || {}).cost_micros || 0) / 1_000_000;
    }

    const ctr7d = impressions7d > 0 ? (clicks7d / impressions7d) * 100 : 0;
    const cpc7d = clicks7d      > 0 ? spend7d / clicks7d               : 0;

    let orcamentoTotal = 0;
    for (const row of budgetRows) {
      orcamentoTotal += ((row.campaign_budget || {}).amount_micros || 0) / 1_000_000;
    }

    // Calcular saldo disponível (ignora valor "ilimitado" = int64 max)
    const UNLIMITED = 9_000_000_000_000_000_000;
    let saldoDisponivel = null;
    for (const row of balanceRows) {
      const ab     = row.account_budget || {};
      const limit  = parseFloat(ab.adjusted_spending_limit_micros || 0);
      const served = parseFloat(ab.amount_served_micros || 0);
      if (limit > 0 && limit < UNLIMITED) {
        saldoDisponivel = (saldoDisponivel || 0) + (limit - served) / 1_000_000;
      }
    }

    return {
      nome: conta.nome,
      id:   conta.id,
      spend3d:          spend3d.toFixed(2),
      spend7d:          spend7d.toFixed(2),
      impressions7d,
      clicks7d,
      ctr7d:            ctr7d.toFixed(2),
      cpc7d:            cpc7d.toFixed(2),
      conversions7d:    conversions7d.toFixed(1),
      orcamentoTotal:   orcamentoTotal.toFixed(2),
      saldoDisponivel:  saldoDisponivel !== null ? saldoDisponivel.toFixed(2) : null,
      erro: null,
    };
  } catch (err) {
    // O SDK pode lançar objeto, string ou Error — normalizar tudo
    let msg;
    try {
      if (typeof err === 'object' && err !== null) {
        // Tentar extrair do formato de erros do SDK google-ads-api
        const erros = err.errors || (err.response && err.response.errors);
        if (Array.isArray(erros) && erros.length > 0) {
          const e    = erros[0];
          const code = Object.values(e.error_code || {})[0] || 'ERRO';
          msg = `${code}: ${e.message || JSON.stringify(e)}`;
        } else if (err.message) {
          msg = err.message;
          // Tentar parsear se for JSON stringificado
          try {
            const parsed = JSON.parse(msg);
            if (parsed.errors && parsed.errors[0]) {
              const e    = parsed.errors[0];
              const code = Object.values(e.error_code || {})[0] || 'ERRO';
              msg = `${code}: ${e.message}`;
            }
          } catch (_) { /* usa msg original */ }
        } else {
          msg = JSON.stringify(err);
        }
      } else {
        msg = String(err);
      }
    } catch (_) {
      msg = 'Erro desconhecido';
    }

    return { nome: conta.nome, id: conta.id, erro: msg };
  }
}

// ─── Relatório ─────────────────────────────────────────────────────────────────

function imprimirRelatorio(resultados) {
  const linha = '─'.repeat(70);
  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  console.log('\n' + '═'.repeat(70));
  console.log('  📊  GOOGLE ADS — MONITORAMENTO BR PNEUS & PEG PNEUS');
  console.log(`  🕐  ${agora}`);
  console.log('═'.repeat(70));

  const comErro  = [];
  const alertaCpc = [];

  for (const r of resultados) {
    console.log(`\n${linha}`);
    if (r.erro) {
      console.log(`  ❌  ${r.nome}`);
      console.log(`      ID: ${formatarId(r.id)}`);
      console.log(`      ERRO: ${r.erro}`);
      comErro.push(r);
      continue;
    }

    const sc  = sinalCtr(r.ctr7d);
    const scp = sinalCpc(r.cpc7d);

    console.log(`  🟢  ${r.nome}`);
    console.log(`      ID: ${formatarId(r.id)}`);
    console.log(`      Gasto (7 dias):    R$ ${r.spend7d}`);
    console.log(`      Orçamento diário:  R$ ${r.orcamentoTotal} (total campanhas ativas)`);
    console.log(`      Impressões (7d):   ${r.impressions7d.toLocaleString('pt-BR')}`);
    console.log(`      Cliques (7d):      ${r.clicks7d.toLocaleString('pt-BR')}`);
    console.log(`      CTR (7d):          ${sc} ${pct(r.ctr7d)}`);
    console.log(`      CPC médio (7d):    ${scp} R$ ${r.cpc7d}`);
    console.log(`      Conversões (7d):   ${r.conversions7d}`);

    if (parseFloat(r.cpc7d) > ALERTA_CPC_LARANJA) alertaCpc.push(r);
  }

  console.log('\n' + '═'.repeat(70));
  console.log('  ⚡  ALERTAS DE PERFORMANCE');
  console.log('═'.repeat(70));

  if (alertaCpc.length === 0 && comErro.length === 0) {
    console.log('\n  ✅  Todas as contas dentro dos parâmetros normais.\n');
  } else {
    for (const r of alertaCpc) {
      const nivel = parseFloat(r.cpc7d) > ALERTA_CPC_VERMELHO ? '🔴 CPC ALTO' : '🟠 CPC ELEVADO';
      console.log(`\n  ${nivel}  ${r.nome}  →  CPC: R$ ${r.cpc7d}`);
    }
    if (alertaCpc.length > 0) console.log('');
  }

  if (comErro.length > 0) {
    console.log('═'.repeat(70));
    console.log('  ❌  CONTAS COM ERRO DE ACESSO');
    console.log('═'.repeat(70));
    for (const r of comErro) {
      console.log(`\n  • ${r.nome} (${formatarId(r.id)})`);
      console.log(`    ${r.erro}`);
    }

    // Verificar se é erro de Developer Token
    const temTokenErro = comErro.some(r => r.erro && r.erro.includes('DEVELOPER_TOKEN_NOT_APPROVED'));
    if (temTokenErro) {
      console.log('\n' + '═'.repeat(70));
      console.log('  ⚠️   AÇÃO NECESSÁRIA: Developer Token em modo TEST');
      console.log('═'.repeat(70));
      console.log('\n  O token só funciona com contas de teste do Google.');
      console.log('  Para acessar contas reais, solicite Basic Access:');
      console.log('\n  1. Acesse o Google Ads com a conta gerenciadora');
      console.log('  2. Ferramentas → Configurações → Central da API');
      console.log('  3. Clique em "Aplicar para acesso básico"');
      console.log('  4. Preencha o formulário (aprovação em ~1-3 dias úteis)');
      console.log('\n  Link direto: https://ads.google.com/aw/apicenter\n');
    }
    console.log('');
  }

  console.log('═'.repeat(70));
  console.log('  🔗  https://ads.google.com/  |  Painel Google Ads');
  console.log('═'.repeat(70) + '\n');

  return { alertaCpc, comErro };
}

// ─── Entry point ───────────────────────────────────────────────────────────────

async function monitorarTodas() {
  const { GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_REFRESH_TOKEN } = process.env;

  if (!GOOGLE_ADS_DEVELOPER_TOKEN || !GOOGLE_ADS_CLIENT_ID || !GOOGLE_ADS_REFRESH_TOKEN) {
    console.error('\n❌  Credenciais Google Ads não configuradas no .env');
    console.error('   Siga o guia em docs/setup-ads-apis.md para configurar.\n');
    process.exit(1);
  }

  console.log('⏳  Consultando Google Ads API...');

  const resultados = await Promise.all(
    CONTAS_GOOGLE.map((c) => monitorarContaGoogle(c))
  );

  const { alertaCpc, comErro } = imprimirRelatorio(resultados);
  return { resultados, alertaCpc, comErro };
}

module.exports = { monitorarTodas, CONTAS_GOOGLE };

if (require.main === module) {
  monitorarTodas().catch((err) => {
    console.error('Erro fatal:', err.message);
    process.exit(1);
  });
}
