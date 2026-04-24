'use strict';

require('dotenv').config();

const fs   = require('fs');
const path = require('path');

const PASTA_SAIDA = path.join(__dirname, '..', 'output', 'relatorios');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function brl(v)  { return `R$${parseFloat(v||0).toFixed(0)}` }
function brlDec(v){ return `R$${parseFloat(v||0).toFixed(2).replace('.',',')}` }
function numBR(n){ return parseInt(n||0).toLocaleString('pt-BR'); }

function corSaldo(v) {
  if (v < 100) return '#ef4444';
  if (v < 200) return '#f97316';
  return '#22c55e';
}
function corCtrMeta(v) {
  const n = parseFloat(v||0);
  if (n < 0.5) return '#ef4444';
  if (n < 1.0) return '#f97316';
  return '#22c55e';
}
function corCtrGoogle(v) {
  const n = parseFloat(v||0);
  if (n < 2.0) return '#ef4444';
  if (n < 4.0) return '#f97316';
  return '#22c55e';
}
function corCpcGoogle(v) {
  const n = parseFloat(v||0);
  if (n > 10) return '#ef4444';
  if (n > 5)  return '#f97316';
  return '#22c55e';
}
function corSaldoGoogle(v) {
  if (v < 100) return '#ef4444';
  if (v < 200) return '#f97316';
  return '#22c55e';
}

// ─── Barras horizontais ───────────────────────────────────────────────────────

function barras(itens, maxVal, corDefault) {
  return itens.map(({ label, valor, corFn }) => {
    const pct   = maxVal > 0 ? Math.min((valor / maxVal) * 100, 100) : 0;
    const color = corFn ? corFn(valor) : corDefault;
    return `
      <div class="bar-row">
        <span class="bar-label">${label}</span>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct.toFixed(1)}%;background:${color}"></div>
        </div>
        <span class="bar-val" style="color:${color}">${valor % 1 === 0 ? valor : valor.toFixed(2)}</span>
      </div>`;
  }).join('');
}

// ─── HTML do dashboard ────────────────────────────────────────────────────────

function gerarHTML(metaResultados, googleResultados, geradoEm) {
  // ── Agregar Meta
  const metaContas  = (metaResultados||[]).filter(r => !r.erro && r.saldo !== '-1');
  const metaErros   = (metaResultados||[]).filter(r => r.erro);
  const metaGasto   = metaContas.reduce((s, r) => s + parseFloat(r.spend7d||0), 0);
  const metaSaldo   = metaContas.reduce((s, r) => s + parseFloat(r.saldo||0)/100, 0);
  const metaCrit    = metaContas.filter(r => parseFloat(r.saldo||0)/100 < 100).length;
  const metaAtenc   = metaContas.filter(r => { const v=parseFloat(r.saldo||0)/100; return v>=100&&v<200; }).length;
  const metaOk      = metaContas.length - metaCrit - metaAtenc;

  // ── Agregar Google
  const gContas     = (googleResultados||[]).filter(r => !r.erro);
  const gErros      = (googleResultados||[]).filter(r => r.erro);
  const gGasto      = gContas.reduce((s, r) => s + parseFloat(r.spend7d||0), 0);
  const gOrc        = gContas.reduce((s, r) => s + parseFloat(r.orcamentoTotal||0), 0);
  const gConv       = gContas.reduce((s, r) => s + parseFloat(r.conversions7d||0), 0);
  const gTemSaldo   = gContas.some(r => r.saldoDisponivel !== null && r.saldoDisponivel !== undefined);
  const gSaldoTotal = gContas.reduce((s, r) => s + parseFloat(r.saldoDisponivel||0), 0);
  const gCrit       = gContas.filter(r => gTemSaldo && parseFloat(r.saldoDisponivel||0) < 100).length;
  const gAtenc      = gContas.filter(r => gTemSaldo && parseFloat(r.saldoDisponivel||0) >= 100 && parseFloat(r.saldoDisponivel||0) < 200).length;

  // ── Barras Meta (saldo)
  const maxMetaSaldo = Math.max(...metaContas.map(r => parseFloat(r.saldo||0)/100), 1);
  const bMetaSaldo = barras(
    metaContas.map(r => ({
      label: r.nome.replace('BR PNEUS ','').replace('PEG PNEUS ','PEG '),
      valor: parseFloat((parseFloat(r.saldo||0)/100).toFixed(0)),
      corFn: corSaldo,
    })),
    maxMetaSaldo, '#22c55e'
  );

  // ── Barras Google (saldo disponível, com fallback para gasto 7d)
  const gBarItens = gContas.map(r => ({
    label: r.nome.replace('BR PNEUS ','').replace('PEG PNEUS ','PEG '),
    valor: parseFloat(gTemSaldo ? parseFloat(r.saldoDisponivel||0).toFixed(0) : parseFloat(r.spend7d||0).toFixed(0)),
    corFn: gTemSaldo ? corSaldoGoogle : undefined,
  }));
  const maxGBar = Math.max(...gBarItens.map(b => b.valor), 1);
  const bGGasto = barras(
    gBarItens.map(r => ({
      label: r.label,
      valor: r.valor,
      corFn: r.corFn,
    })),
    maxGBar, '#4285F4'
  );

  // ── Tabela Meta
  const tabelaMeta = metaContas.map(r => {
    const saldo = parseFloat(r.saldo||0)/100;
    const cor   = corSaldo(saldo);
    const sc    = corCtrMeta(parseFloat(r.ctr7d||0));
    const dias  = r.diasRestantes !== null ? `${r.diasRestantes}d` : '—';
    return `<tr>
      <td><span style="color:${cor}">●</span> ${r.nome.replace('BR PNEUS ','').replace('PEG PNEUS ','Peg ')}</td>
      <td style="color:${cor};font-weight:600">${brlDec(saldo)}</td>
      <td>${dias}</td>
      <td>${brlDec(r.spend7d)}</td>
      <td style="color:${sc}">${parseFloat(r.ctr7d||0).toFixed(2)}%</td>
      <td>${brlDec(r.cpc7d)}</td>
    </tr>`;
  }).join('') + metaErros.map(r =>
    `<tr><td colspan="6" style="color:#ef4444">❌ ${r.nome}: ${r.erro}</td></tr>`
  ).join('');

  // ── Tabela Google
  const tabelaGoogle = gContas.map(r => {
    const sc   = corCtrGoogle(parseFloat(r.ctr7d||0));
    const scp  = corCpcGoogle(parseFloat(r.cpc7d||0));
    const saldo = (r.saldoDisponivel !== null && r.saldoDisponivel !== undefined)
      ? parseFloat(r.saldoDisponivel) : null;
    const corS = saldo !== null ? corSaldoGoogle(saldo) : '#666';
    return `<tr>
      <td>● ${r.nome.replace('BR PNEUS ','').replace('PEG PNEUS ','Peg ')}</td>
      ${gTemSaldo ? `<td style="color:${corS};font-weight:600">${saldo !== null ? brlDec(saldo) : '—'}</td>` : ''}
      <td>${brlDec(r.spend7d)}</td>
      <td>${brlDec(r.orcamentoTotal)}/d</td>
      <td style="color:${sc}">${parseFloat(r.ctr7d||0).toFixed(2)}%</td>
      <td style="color:${scp}">${brlDec(r.cpc7d)}</td>
      <td>${parseFloat(r.conversions7d||0).toFixed(0)}</td>
    </tr>`;
  }).join('') + gErros.map(r =>
    `<tr><td colspan="${gTemSaldo ? 7 : 6}" style="color:#ef4444">❌ ${r.nome}: ${r.erro}</td></tr>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Dashboard Ads</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#111;color:#f0f0f0;padding:0;width:1456px}
  /* Header */
  .header{display:flex;justify-content:space-between;align-items:center;padding:16px 24px;background:#0d0d0d;border-bottom:2px solid #F5A623}
  .header h1{color:#F5A623;font-size:1.3rem}
  .header .sub{color:#555;font-size:.8rem}
  /* Dois painéis lado a lado */
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:0}
  /* Painel de plataforma */
  .platform{background:#161616;padding:18px 22px;border-bottom:1px solid #1e1e1e}
  .platform:first-child{border-right:1px solid #1e1e1e}
  .platform-title{font-size:.95rem;font-weight:700;letter-spacing:.04em;margin-bottom:14px;display:flex;align-items:center;gap:8px;padding-bottom:10px;border-bottom:1px solid #252525}
  .meta-title{color:#74a7ff}
  .google-title{color:#7dd47d}
  /* Métricas resumo */
  .metrics{display:flex;gap:0;margin-bottom:16px}
  .metric{background:#111;padding:10px 16px;flex:1;border-right:1px solid #1e1e1e}
  .metric:last-child{border-right:none}
  .metric .mlabel{font-size:.63rem;color:#666;text-transform:uppercase;letter-spacing:.05em}
  .metric .mval{font-size:1.25rem;font-weight:700;margin-top:3px}
  .red{color:#ef4444}.orange{color:#f97316}.green{color:#22c55e}.yellow{color:#F5A623}.blue{color:#4285F4}
  /* Gráfico */
  .chart-title{font-size:.7rem;color:#666;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;font-weight:600}
  .bar-row{display:flex;align-items:center;gap:8px;margin-bottom:7px}
  .bar-label{font-size:.68rem;color:#bbb;width:72px;text-align:right;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .bar-track{flex:1;background:#222;height:12px;overflow:hidden}
  .bar-fill{height:100%}
  .bar-val{font-size:.68rem;font-weight:600;width:42px;flex-shrink:0}
  /* Tabelas */
  .tables{display:grid;grid-template-columns:1fr 1fr;gap:0}
  .table-wrap{overflow:hidden}
  .table-wrap:first-child{border-right:1px solid #1e1e1e}
  .table-header{padding:11px 22px;font-size:.78rem;font-weight:700;letter-spacing:.03em}
  .meta-th{background:#0e1a2e;color:#74a7ff;border-top:1px solid #1877F2}
  .google-th{background:#0e1e0e;color:#7dd47d;border-top:1px solid #4285F4}
  table{width:100%;border-collapse:collapse;font-size:.76rem}
  thead{background:#131313}
  th{padding:8px 22px;text-align:left;font-size:.63rem;color:#555;text-transform:uppercase;letter-spacing:.03em}
  td{padding:7px 22px;border-top:1px solid #1a1a1a}
  tr:hover td{background:#141414}
</style>
</head>
<body>

<div class="header">
  <h1>📊 Dashboard Ads — BR Pneus &amp; Peg Pneus</h1>
  <span class="sub">Atualizado em ${geradoEm}</span>
</div>

<!-- Painéis lado a lado: Meta | Google -->
<div class="two-col">

  <!-- META -->
  <div class="platform">
    <div class="platform-title meta-title">📘 META ADS</div>
    <div class="metrics">
      <div class="metric">
        <div class="mlabel">Saldo total</div>
        <div class="mval ${metaSaldo < 200 ? 'orange' : 'green'}">${brlDec(metaSaldo)}</div>
      </div>
      <div class="metric">
        <div class="mlabel">Gasto 7d</div>
        <div class="mval yellow">${brl(metaGasto)}</div>
      </div>
      <div class="metric">
        <div class="mlabel">🔴 Crítico</div>
        <div class="mval ${metaCrit > 0 ? 'red' : 'green'}">${metaCrit}</div>
      </div>
      <div class="metric">
        <div class="mlabel">🟠 Atenção</div>
        <div class="mval ${metaAtenc > 0 ? 'orange' : 'green'}">${metaAtenc}</div>
      </div>
      <div class="metric">
        <div class="mlabel">🟢 OK</div>
        <div class="mval green">${metaOk}</div>
      </div>
    </div>
    <div class="chart-title">💰 Saldo por conta (R$)</div>
    ${bMetaSaldo}
  </div>

  <!-- GOOGLE -->
  <div class="platform">
    <div class="platform-title google-title">🔍 GOOGLE ADS</div>
    <div class="metrics">
      ${gTemSaldo ? `
      <div class="metric">
        <div class="mlabel">Saldo total</div>
        <div class="mval ${gSaldoTotal < 200 ? 'orange' : 'green'}">${brlDec(gSaldoTotal)}</div>
      </div>` : ''}
      <div class="metric">
        <div class="mlabel">Gasto 7d</div>
        <div class="mval yellow">${brl(gGasto)}</div>
      </div>
      <div class="metric">
        <div class="mlabel">Orçamento/dia</div>
        <div class="mval green">${brl(gOrc)}</div>
      </div>
      <div class="metric">
        <div class="mlabel">Conversões 7d</div>
        <div class="mval blue">${gConv.toFixed(0)}</div>
      </div>
      ${gTemSaldo ? `
      <div class="metric">
        <div class="mlabel">🔴 Crítico</div>
        <div class="mval ${gCrit > 0 ? 'red' : 'green'}">${gCrit}</div>
      </div>
      <div class="metric">
        <div class="mlabel">🟠 Atenção</div>
        <div class="mval ${gAtenc > 0 ? 'orange' : 'green'}">${gAtenc}</div>
      </div>` : `
      <div class="metric">
        <div class="mlabel">Contas OK</div>
        <div class="mval green">${gContas.length}</div>
      </div>`}
    </div>
    <div class="chart-title">${gTemSaldo ? '💰 Saldo disponível por conta (R$)' : '📈 Gasto 7d por conta (R$)'}</div>
    ${bGGasto}
  </div>

</div>

<!-- Tabelas lado a lado -->
<div class="tables">

  <div class="table-wrap">
    <div class="table-header meta-th">📘 Detalhes Meta por conta</div>
    <table>
      <thead><tr>
        <th>Conta</th><th>Saldo</th><th>Dur.</th>
        <th>Gasto 7d</th><th>CTR</th><th>CPC</th>
      </tr></thead>
      <tbody>${tabelaMeta}</tbody>
    </table>
  </div>

  <div class="table-wrap">
    <div class="table-header google-th">🔍 Detalhes Google por conta</div>
    <table>
      <thead><tr>
        <th>Conta</th>${gTemSaldo ? '<th>Saldo</th>' : ''}<th>Gasto 7d</th><th>Orç/dia</th>
        <th>CTR</th><th>CPC</th><th>Conv</th>
      </tr></thead>
      <tbody>${tabelaGoogle}</tbody>
    </table>
  </div>

</div>

</body>
</html>`;
}

// ─── Executar ─────────────────────────────────────────────────────────────────

async function gerarDashboard() {
  const { monitorarTodas: monitorarMeta }   = require('./monitor-meta-ads');
  const { monitorarTodas: monitorarGoogle } = require('./monitor-google-ads');

  console.log('📊 Consultando Meta + Google Ads...');
  const [metaResult, googleResult] = await Promise.allSettled([
    monitorarMeta(),
    monitorarGoogle(),
  ]);

  const metaResultados   = metaResult.status   === 'fulfilled' ? metaResult.value.resultados   : [];
  const googleResultados = googleResult.status === 'fulfilled' ? googleResult.value.resultados : [];

  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const html  = gerarHTML(metaResultados, googleResultados, agora);

  fs.mkdirSync(PASTA_SAIDA, { recursive: true });
  const arquivo = path.join(PASTA_SAIDA, 'dashboard.html');
  fs.writeFileSync(arquivo, html, 'utf8');
  console.log(`✅ HTML gerado: ${arquivo}`);
  return arquivo;
}

// ─── Exportar PNG via Puppeteer ───────────────────────────────────────────────

async function exportarPng(htmlPath) {
  const puppeteer = require('puppeteer');
  const { pathToFileURL } = require('url');

  const absPath = path.resolve(htmlPath);
  const pngPath = absPath.replace(/\.html$/i, '.png');
  const fileUrl = pathToFileURL(absPath).href;

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1456, height: 1, deviceScaleFactor: 1.5 });
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.screenshot({ path: pngPath, fullPage: true });
    return pngPath;
  } finally {
    await browser.close();
  }
}

async function gerarDashboardPng() {
  const htmlPath = await gerarDashboard();
  console.log('🖼️  Exportando PNG...');
  const pngPath = await exportarPng(htmlPath);
  console.log(`✅ PNG: ${pngPath}`);
  return pngPath;
}

module.exports = { gerarDashboard, gerarDashboardPng, gerarHTML };

if (require.main === module) {
  gerarDashboardPng().catch(err => console.error('Erro:', err.message));
}
