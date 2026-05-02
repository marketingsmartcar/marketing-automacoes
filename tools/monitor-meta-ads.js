'use strict';

require('dotenv').config();

// ─── Configuração das contas ───────────────────────────────────────────────────

// Token BR Pneus acessa as 6 contas BR; token Peg Pneus acessa as 2 contas Peg
const TOKEN_BR  = process.env.META_ACCESS_TOKEN_BR;
const TOKEN_PEG = process.env.META_ACCESS_TOKEN_PEG;

const CONTAS_META = [
  { nome: 'BR PNEUS MARINGÁ',     id: process.env.META_ACCOUNT_BR_MARINGA,     recarga: 'saldo',  token: TOKEN_BR },
  { nome: 'BR PNEUS AMERICANA',   id: process.env.META_ACCOUNT_BR_AMERICANA,   recarga: 'saldo',  token: TOKEN_BR },
  { nome: 'BR PNEUS SÃO CARLOS',  id: process.env.META_ACCOUNT_BR_SAO_CARLOS,  recarga: 'fundos', token: TOKEN_BR },
  { nome: 'BR PNEUS ARARAQUARA',  id: process.env.META_ACCOUNT_BR_ARARAQUARA,  recarga: 'fundos', token: TOKEN_BR },
  { nome: 'PEG PNEUS SOROCABA',   id: process.env.META_ACCOUNT_PEG_SOROCABA,   recarga: 'fundos', token: TOKEN_PEG },
  { nome: 'PEG PNEUS ARARAQUARA', id: process.env.META_ACCOUNT_PEG_ARARAQUARA, recarga: 'saldo',  token: TOKEN_PEG },
];

const GRAPH_BASE = 'https://graph.facebook.com/v21.0';

// ─── Thresholds ────────────────────────────────────────────────────────────────
const ALERTA_SALDO_LARANJA  = 200;
const ALERTA_SALDO_VERMELHO = 100;
const ALERTA_CTR_AMARELO = 1.0;
const ALERTA_CTR_VERMELHO = 0.5;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function brl(centavos) {
  const valor = parseFloat(centavos || 0) / 100;
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function pct(valor) {
  return parseFloat(valor || 0).toFixed(2) + '%';
}

function dataN(diasAtras) {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return d.toISOString().slice(0, 10);
}

function sinalSaldo(valor) {
  const v = parseFloat(valor || 0) / 100;
  if (v < ALERTA_SALDO_VERMELHO) return '🔴';
  if (v < ALERTA_SALDO_LARANJA)  return '🟠';
  return '🟢';
}

function sinalCtr(ctr) {
  const v = parseFloat(ctr || 0);
  if (v < ALERTA_CTR_VERMELHO) return '🔴';
  if (v < ALERTA_CTR_AMARELO)  return '🟡';
  return '🟢';
}

function instrucaoRecarga(conta) {
  if (conta.recarga === 'fundos') {
    return 'Pix nos FUNDOS → Gerenciador → Faturamento → Métodos de Pagamento → Pix → Pagar Fatura';
  }
  return 'Pix no SALDO → Gerenciador → Faturamento → Saldo Pré-pago → Adicionar Fundos → Pix';
}

// ─── API calls ─────────────────────────────────────────────────────────────────

async function fetchGraph(path, token, params = {}) {
  if (!token) throw new Error('Token Meta não configurado no .env (META_ACCESS_TOKEN_BR ou META_ACCESS_TOKEN_PEG)');

  const url = new URL(`${GRAPH_BASE}/${path}`);
  url.searchParams.set('access_token', token);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString());
  const data = await res.json();

  if (data.error) {
    throw new Error(`Meta API Error [${data.error.code}]: ${data.error.message}`);
  }
  return data;
}

async function buscarSaldoConta(accountId, token) {
  const id = accountId.replace('act_', '');
  const data = await fetchGraph(`act_${id}`, token, {
    fields: 'name,account_status,balance,currency,spend_cap,amount_spent,funding_source_details',
  });
  return data;
}

async function buscarInsightsConta(accountId, token, dias = 7) {
  const id = accountId.replace('act_', '');
  const hoje = dataN(0);
  const inicioJanela = dataN(dias);

  const data = await fetchGraph(`act_${id}/insights`, token, {
    fields: 'spend,impressions,clicks,ctr,cpc,reach',
    time_range: JSON.stringify({ since: inicioJanela, until: hoje }),
    level: 'account',
  });

  if (data.data && data.data.length > 0) return data.data[0];
  return { spend: '0', impressions: '0', clicks: '0', ctr: '0', cpc: '0', reach: '0' };
}

// ─── Monitor principal ─────────────────────────────────────────────────────────

async function monitorarContaMeta(conta) {
  try {
    const [saldoData, insights, insights3d] = await Promise.all([
      buscarSaldoConta(conta.id, conta.token),
      buscarInsightsConta(conta.id, conta.token, 7),
      buscarInsightsConta(conta.id, conta.token, 3),
    ]);

    // funding_source_details.display_string é o valor exibido no Ads Manager.
    // Formato: "Saldo disponível (R$78,91 BRL)" ou "Fundos disponíveis (R$0,00 BRL)"
    const fsd = saldoData.funding_source_details;
    let saldoDisplay = null;
    let saldoCentavos = saldoData.balance || '0';

    if (fsd && fsd.display_string) {
      // Extrair valor numérico de strings como "Saldo disponível (R$78,91 BRL)"
      const match = fsd.display_string.match(/R\$\s*([\d.,]+)/i);
      if (match) {
        const numStr = match[1].replace(/\./g, '').replace(',', '.');
        const num = parseFloat(numStr);
        if (!isNaN(num)) {
          saldoCentavos = String(Math.round(num * 100));
          saldoDisplay = 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        }
      } else {
        // Sem valor monetário: conta com cartão de crédito como fonte principal
        // (ex: "Elo *4308"). A carteira de Fundos não é exposta pela API nesse caso.
        saldoDisplay = '💳 ' + fsd.display_string + ' (pagamento por cartão)';
        saldoCentavos = '-1'; // Sentinela: conta cartão — não gerar alerta de saldo baixo
      }
    }

    const ctr = parseFloat(insights.ctr || 0);
    const spend7d = parseFloat(insights.spend || 0);
    const spend3d = parseFloat(insights3d.spend || 0);

    // Estimativa de duração: usa média dos últimos 3 dias (mais precisa)
    const gastoDiario3d = spend3d / 3;
    const gastoDiario7d = spend7d / 7;
    const gastoDiario   = gastoDiario3d > 0 ? gastoDiario3d : gastoDiario7d; // fallback 7d se 3d = 0
    const saldoReais = saldoCentavos === '-1' ? null : parseFloat(saldoCentavos) / 100;
    let diasRestantes = null;
    if (saldoReais !== null && gastoDiario > 0) {
      diasRestantes = Math.floor(saldoReais / gastoDiario);
    }

    return {
      nome: conta.nome,
      id: conta.id,
      recarga: conta.recarga,
      status: saldoData.account_status,
      saldo: saldoCentavos,
      saldoDisplay,                      // valor exato do Meta Ads Manager quando disponível
      gastoDiario: gastoDiario.toFixed(2),
      diasRestantes,
      spend3d: spend3d.toFixed(2),
      spend7d: spend7d.toFixed(2),
      impressions7d: insights.impressions || '0',
      clicks7d: insights.clicks || '0',
      ctr7d: ctr.toFixed(2),
      cpc7d: parseFloat(insights.cpc || 0).toFixed(2),
      reach7d: insights.reach || '0',
      erro: null,
    };
  } catch (err) {
    return {
      nome: conta.nome,
      id: conta.id,
      recarga: conta.recarga,
      erro: err.message,
    };
  }
}

function statusContaLabel(status) {
  const map = { 1: 'Ativa', 2: 'Desabilitada', 3: 'Não confirmada', 7: 'Pendente', 9: 'Em análise' };
  return map[status] || `Status ${status}`;
}

// ─── Relatório ─────────────────────────────────────────────────────────────────

function imprimirRelatorio(resultados) {
  const linha = '─'.repeat(70);
  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  console.log('\n' + '═'.repeat(70));
  console.log('  📊  META ADS — MONITORAMENTO BR PNEUS & PEG PNEUS');
  console.log(`  🕐  ${agora}`);
  console.log('═'.repeat(70));

  const comErro = [];
  const alertaRecarga = [];
  const alertaStatus = []; // contas em análise / suspensas

  for (const r of resultados) {
    console.log(`\n${linha}`);
    if (r.erro) {
      console.log(`  ❌  ${r.nome}`);
      console.log(`      ID: ${r.id}`);
      console.log(`      ERRO: ${r.erro}`);
      comErro.push(r);
      continue;
    }

    const contaCartao = r.saldo === '-1'; // cartão de crédito como fonte principal
    if (contaCartao) continue; // ocultar contas cartão do relatório principal

    const ss = sinalSaldo(r.saldo);
    const sc = sinalCtr(r.ctr7d);
    const saldoBrl = r.saldoDisplay || brl(r.saldo);
    const tipoSaldo = r.recarga === 'fundos' ? 'Fundos' : 'Saldo';
    const statusLabel = statusContaLabel(r.status);

    // Estimativa de duração
    let duracaoStr = '';
    if (contaCartao) {
      duracaoStr = '(cartão — sem limite de saldo)';
    } else if (r.diasRestantes === null || parseFloat(r.gastoDiario) === 0) {
      duracaoStr = '(sem gasto recente)';
    } else if (r.diasRestantes === 0) {
      duracaoStr = '⚠️  menos de 1 dia';
    } else {
      duracaoStr = `~${r.diasRestantes} dia${r.diasRestantes !== 1 ? 's' : ''}`;
    }

    console.log(`  ${ss}  ${r.nome}`);
    console.log(`      ID: ${r.id}  |  Status: ${statusLabel}  |  Tipo: ${tipoSaldo}`);
    console.log(`      Pagamento:      ${saldoBrl}  →  Dura ${duracaoStr}`);
    console.log(`      Gasto diário:   R$ ${r.gastoDiario}/dia  (média 7d)`);
    console.log(`      Gasto (7 dias): R$ ${r.spend7d}`);
    console.log(`      Alcance (7d):   ${parseInt(r.reach7d).toLocaleString('pt-BR')} pessoas`);
    console.log(`      Impressões (7d):${parseInt(r.impressions7d).toLocaleString('pt-BR')}`);
    console.log(`      Cliques (7d):   ${parseInt(r.clicks7d).toLocaleString('pt-BR')}`);
    console.log(`      CTR (7d):       ${sc} ${pct(r.ctr7d)}    CPC: R$ ${r.cpc7d}`);

    // Alerta de status anormal (Em análise, Desabilitada, etc.)
    if (r.status !== 1) {
      alertaStatus.push(r);
    }

    // Alerta de saldo baixo
    const saldoNum = parseFloat(r.saldo || 0) / 100;
    if (saldoNum < ALERTA_SALDO_LARANJA) {
      alertaRecarga.push(r);
    }
  }

  // ── Resumo de alertas ──────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(70));
  console.log('  ⚡  ALERTAS DE RECARGA');
  console.log('═'.repeat(70));

  if (alertaRecarga.length === 0) {
    console.log('\n  ✅  Todas as contas com saldo adequado.\n');
  } else {
    for (const r of alertaRecarga) {
      const saldoNum = parseFloat(r.saldo || 0) / 100;
      const nivel = saldoNum < ALERTA_SALDO_VERMELHO ? '🔴 URGENTE' : '🟠 ATENÇÃO';
      console.log(`\n  ${nivel}  ${r.nome}`);
      console.log(`    Saldo: ${brl(r.saldo)}`);
      console.log(`    Como recarregar: ${instrucaoRecarga(r)}`);
    }
    console.log('');
  }

  // ── Alertas de status ─────────────────────────────────────────────────────
  if (alertaStatus.length > 0) {
    console.log('\n' + '═'.repeat(70));
    console.log('  ⚠️   CONTAS COM STATUS ANORMAL');
    console.log('═'.repeat(70));
    for (const r of alertaStatus) {
      const statusLabel = statusContaLabel(r.status);
      console.log(`\n  🔴  ${r.nome}  |  Status: ${statusLabel}`);
      if (r.status === 9) {
        console.log('    Causa provável: saldo devedor ou revisão de política do Meta.');
        console.log('    Ação: Acesse o Gerenciador → Faturamento → verifique faturas em aberto.');
        console.log('    Link: https://www.facebook.com/ads/manager/billing/');
      } else if (r.status === 2) {
        console.log('    Conta desabilitada pelo Meta. Contate o suporte.');
      }
    }
    console.log('');
  }

  if (comErro.length > 0) {
    console.log('═'.repeat(70));
    console.log('  ❌  CONTAS COM ERRO DE ACESSO');
    console.log('═'.repeat(70));
    for (const r of comErro) {
      console.log(`\n  • ${r.nome} (${r.id})`);
      console.log(`    ${r.erro}`);
    }
    console.log('');
  }

  console.log('═'.repeat(70));
  console.log('  🔗  https://business.facebook.com/  |  Gerenciador de Anúncios');
  console.log('═'.repeat(70) + '\n');

  return { alertaRecarga, alertaStatus, comErro };
}

// ─── Entry point ───────────────────────────────────────────────────────────────

async function monitorarTodas() {
  if (!TOKEN_BR && !TOKEN_PEG) {
    console.error('\n❌  Tokens Meta Ads não configurados no .env');
    console.error('   Configure META_ACCESS_TOKEN_BR e/ou META_ACCESS_TOKEN_PEG.');
    console.error('   Siga o guia em docs/setup-ads-apis.md para obter os tokens.\n');
    process.exit(1);
  }
  if (!TOKEN_BR) console.warn('⚠️  META_ACCESS_TOKEN_BR ausente — contas BR Pneus serão ignoradas.');
  if (!TOKEN_PEG) console.warn('⚠️  META_ACCESS_TOKEN_PEG ausente — contas Peg Pneus serão ignoradas.');

  console.log('⏳  Consultando Meta Ads API...');

  const resultados = await Promise.all(
    CONTAS_META.map((c) => monitorarContaMeta(c))
  );

  const { alertaRecarga, alertaStatus, comErro } = imprimirRelatorio(resultados);

  return { resultados, alertaRecarga, alertaStatus, comErro };
}

module.exports = { monitorarTodas, CONTAS_META };

if (require.main === module) {
  monitorarTodas().catch((err) => {
    console.error('Erro fatal:', err.message);
    process.exit(1);
  });
}
