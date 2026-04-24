'use strict';

require('dotenv').config();

const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ─── Config ────────────────────────────────────────────────────────────────────

const EMPRESAS = [
  {
    nome:      'BR Pneus',
    token:     process.env.DESKRIO_API_TOKEN_BR,
    instancia: process.env.DESKRIO_INSTANCE_BR || 'brpneusapi.deskrio.com.br',
    filtroAgentes: null,
    ordemAgentes: [
      'rafaelly- são carlos',
      'rafaelly- americana',
      'rafaelly-maringa',
      'thais-maringa',
      'thais- araraquara',
      'luiz felipe - jáu',
      'luiz felipe  - ibitinga',
      'jessica - adm',
      'sem atendente',
    ],
  },
  {
    nome:      'Peg Pneus',
    token:     process.env.DESKRIO_API_TOKEN_PEG,
    instancia: process.env.DESKRIO_INSTANCE_PEG || 'brpneusapi.deskrio.com.br',
    filtroAgentes: null,
    ordemAgentes: null,
  },
].filter(e => e.token);

const PASTA_SAIDA = path.join(__dirname, '..', 'output', 'relatorios');

// ─── Períodos ─────────────────────────────────────────────────────────────────

const PERIODOS = {
  hoje:  { label: 'Hoje',      diasAtras: 0 },
  '7d':  { label: '7 dias',    diasAtras: 6 },
  '30d': { label: '30 dias',   diasAtras: 29 },
};

// ─── HTTP helper ───────────────────────────────────────────────────────────────

function get(instancia, token, endpoint) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: instancia,
      path: endpoint,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 300)}`));
          return;
        }
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(`Parse error: ${data.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ─── Data helpers ──────────────────────────────────────────────────────────────

function fmt(d) {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}
function hoje()       { return fmt(new Date()); }
function diasAtras(n) { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); }

// ─── Processar lista de tickets ───────────────────────────────────────────────

function processar(raw) {
  const arr = Array.isArray(raw) ? raw : (raw?.tickets || raw?.data || []);
  // 'groups' = ticket em grupo, contabilizado como aberto
  const r = { total: arr.length, open: 0, pending: 0, closed: 0, agentes: {} };
  arr.forEach(t => {
    const s = (t.status || '').toLowerCase();
    if      (s === 'open' || s === 'groups') r.open++;
    else if (s === 'pending')                r.pending++;
    else if (s === 'closed')                 r.closed++;
    const nome = t.user?.name || 'Sem atendente';
    if (!r.agentes[nome]) r.agentes[nome] = { total: 0, open: 0, pending: 0, closed: 0 };
    r.agentes[nome].total++;
    if (s === 'open' || s === 'pending' || s === 'closed') r.agentes[nome][s]++;
  });
  r.agentes = Object.entries(r.agentes)
    .map(([nome, v]) => ({ nome, ...v }))
    .sort((a, b) => b.total - a.total);
  return r;
}

// ─── Parsear data DD/MM ou DD/MM/AAAA → Date ──────────────────────────────────

function parsearData(str) {
  const partes = str.trim().split('/');
  const ano  = partes[2] ? parseInt(partes[2]) : new Date().getFullYear();
  const mes  = parseInt(partes[1]) - 1;
  const dia  = parseInt(partes[0]);
  const d = new Date(ano, mes, dia, 0, 0, 0, 0);
  if (isNaN(d.getTime())) throw new Error(`Data inválida: ${str}`);
  return d;
}

function dateToFmt(d) {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

// ─── Contar contatos no intervalo ────────────────────────────────────────────

function contarContatosRange(raw, dataInicio, dataFim) {
  const arr = Array.isArray(raw) ? raw : (raw?.contacts || raw?.data || []);
  const fim = new Date(dataFim); fim.setHours(23, 59, 59, 999);
  return arr.filter(c => {
    if (!c.createdAt) return false;
    const d = new Date(c.createdAt);
    return d >= dataInicio && d <= fim;
  }).length;
}

// ─── Consultar empresa para um intervalo de datas ────────────────────────────

// Quebra o intervalo em chunks de até 7 dias e agrega os tickets
async function buscarTicketsComChunks(instancia, token, dataInicio, dataFim, extraParams = '') {
  const CHUNK_DIAS = 7;
  const chunks = [];
  let cursor = new Date(dataInicio);

  while (cursor <= dataFim) {
    const fimChunk = new Date(cursor);
    fimChunk.setDate(fimChunk.getDate() + CHUNK_DIAS - 1);
    if (fimChunk > dataFim) fimChunk.setTime(dataFim.getTime());
    chunks.push({ inicio: new Date(cursor), fim: new Date(fimChunk) });
    cursor.setDate(cursor.getDate() + CHUNK_DIAS);
  }

  const resultados = await Promise.all(
    chunks.map(c => get(instancia, token, `/v1/api/tickets?startDate=${dateToFmt(c.inicio)}&endDate=${dateToFmt(c.fim)}${extraParams}`).catch(() => []))
  );

  return resultados.flatMap(r => Array.isArray(r) ? r : (r?.tickets || r?.data || []));
}

async function consultarEmpresa(empresa, dataInicio, dataFim, labelPeriodo) {
  const { nome, token, instancia, filtroAgentes, ordemAgentes } = empresa;

  const [ticketsArr, ativosArr, rContatos] = await Promise.all([
    buscarTicketsComChunks(instancia, token, dataInicio, dataFim),
    buscarTicketsComChunks(instancia, token, dataInicio, dataFim, '&origin=ativo'),
    get(instancia, token, `/v1/api/contacts`).catch(e => ({ _erro: e.message })),
  ]);

  const contatosRaw = rContatos?._erro ? null : rContatos;
  const ticketsRaw  = ticketsArr;

  let dados = ticketsArr.length >= 0 ? processar(ticketsArr) : null;

  if (dados) {
    if (filtroAgentes) {
      dados.agentes = dados.agentes.filter(a =>
        filtroAgentes.some(f => a.nome.toLowerCase().includes(f))
      );
    }
    if (ordemAgentes) {
      dados.agentes.sort((a, b) => {
        const ia = ordemAgentes.findIndex(o => a.nome.toLowerCase().includes(o));
        const ib = ordemAgentes.findIndex(o => b.nome.toLowerCase().includes(o));
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      });
    }
  }

  const contatosPeriodo = contatosRaw ? contarContatosRange(contatosRaw, dataInicio, dataFim) : 0;

  const verificacao = {
    totalBruto: ticketsArr.length,
    comStatus: ticketsArr.filter(t => t.status).length,
    semStatus: ticketsArr.filter(t => !t.status).length,
    statusUnicos: [...new Set(ticketsArr.map(t => t.status))],
  };

  return {
    nome,
    instancia,
    periodo: labelPeriodo,
    erro: null,
    dados,
    ticketsRaw,
    ativosRaw: ativosArr,
    contatosRaw: Array.isArray(contatosRaw) ? contatosRaw : (contatosRaw?.contacts || contatosRaw?.data || []),
    contatosHoje: contatosPeriodo,
    verificacao,
  };
}

// ─── Monitor principal ────────────────────────────────────────────────────────

function resolverIntervalo(periodo) {
  const cfg = PERIODOS[periodo] || PERIODOS.hoje;
  const fim   = new Date(); fim.setHours(23, 59, 59, 999);
  const inicio = new Date(); inicio.setDate(inicio.getDate() - cfg.diasAtras); inicio.setHours(0,0,0,0);
  const label = cfg.diasAtras === 0
    ? `Hoje (${dateToFmt(inicio)})`
    : `${cfg.label} (${dateToFmt(inicio)} - ${dateToFmt(fim)})`;
  return { inicio, fim, label };
}

async function monitorarDeskrio(periodo = 'hoje') {
  if (EMPRESAS.length === 0) throw new Error('Nenhum token Deskrio configurado no .env');
  const { inicio, fim, label } = resolverIntervalo(periodo);
  return Promise.all(EMPRESAS.map(e => consultarEmpresa(e, inicio, fim, label)));
}

async function monitorarDeskrioRange(inicioStr, fimStr) {
  if (EMPRESAS.length === 0) throw new Error('Nenhum token Deskrio configurado no .env');
  const inicio = parsearData(inicioStr);
  const fim    = parsearData(fimStr); fim.setHours(23, 59, 59, 999);
  const label  = `${inicioStr} → ${fimStr}`;
  return Promise.all(EMPRESAS.map(e => consultarEmpresa(e, inicio, fim, label)));
}

// ─── Formatar texto WhatsApp ───────────────────────────────────────────────────

function formatarResumo(resultados, labelOverride) {
  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const label = labelOverride || resultados[0]?.periodo || '';
  let out = `📥 *Deskrio — ${label}*\n_${agora}_\n`;

  for (const r of resultados) {
    out += `\n━━━━━━━━━━━━━━━━\n*${r.nome}*\n`;
    if (r.erro) { out += `❌ ${r.erro}\n`; continue; }
    const d = r.dados;
    if (!d) { out += `—\n`; continue; }

    out += `📊 Total: *${d.total}*  🟢 ${d.open}  🟡 ${d.pending}  ✅ ${d.closed}\n`;
    out += `➕ Contatos: *${r.contatosHoje}*\n`;

    if (d.agentes.length) {
      out += `\n*Atendentes:*\n`;
      d.agentes.forEach(a => { out += `  • ${a.nome}: *${a.total}*\n`; });
    }
  }
  return out.trim();
}

function formatarVerificacao(resultados) {
  let out = `🔍 *Verificação de dados Deskrio*\n`;
  for (const r of resultados) {
    out += `\n*${r.nome}* — ${r.periodo}\n`;
    if (r.erro) { out += `❌ ${r.erro}\n`; continue; }
    const v = r.verificacao;
    out += `  Tickets brutos: *${v.totalBruto}*\n`;
    out += `  Com status: *${v.comStatus}*  Sem status: *${v.semStatus}*\n`;
    out += `  Status encontrados: ${v.statusUnicos.map(s => `\`${s}\``).join(', ')}\n`;
    out += `  Contatos período: *${r.contatosHoje}*\n`;
  }
  return out.trim();
}

// ─── Gerar HTML Dashboard ─────────────────────────────────────────────────────

// Barras empilhadas por atendente: verde = atendendo, laranja = aguardando
function barrasAgentes(agentes, maxVal) {
  if (!agentes?.length) return '<p style="color:#444;font-size:.7rem;padding:4px">Sem dados</p>';
  return agentes.slice(0, 14).map(a => {
    const pctOpen    = maxVal > 0 ? Math.min((a.open    / maxVal) * 100, 100) : 0;
    const pctPending = maxVal > 0 ? Math.min((a.pending / maxVal) * 100, 100) : 0;
    const total      = a.open + a.pending + a.closed;
    return `<div class="bar-row">
        <span class="bar-label" title="${a.nome}">${a.nome}</span>
        <div class="bar-track">
          <div style="display:flex;height:100%">
            <div style="width:${pctOpen.toFixed(1)}%;background:#22c55e;border-radius:4px 0 0 4px;min-width:${a.open>0?2:0}px"></div>
            <div style="width:${pctPending.toFixed(1)}%;background:#f59e0b;min-width:${a.pending>0?2:0}px"></div>
          </div>
        </div>
        <span class="bar-val"><span style="color:#22c55e">${a.open}</span><span style="color:#666">/</span><span style="color:#f59e0b">${a.pending}</span><span style="color:#777;font-size:.6rem"> (${total})</span></span>
      </div>`;
  }).join('');
}

// Painel direito: gráfico de barras verticais Tickets × Contatos + status breakdown
function painelDireito(d, contatos) {
  const maxV  = Math.max(d.total, contatos, 1);
  const MAX_H = 110;
  const hT    = Math.round((d.total   / maxV) * MAX_H);
  const hC    = Math.round((contatos  / maxV) * MAX_H);
  const taxa  = d.total > 0 ? (contatos / d.total * 100).toFixed(0) : 0;

  const pOpen    = d.total > 0 ? (d.open    / d.total * 100).toFixed(1) : 0;
  const pPending = d.total > 0 ? (d.pending / d.total * 100).toFixed(1) : 0;
  const pClosed  = d.total > 0 ? (d.closed  / d.total * 100).toFixed(1) : 0;

  return `
    <div class="right-panel">

      <div class="rcard">
        <div class="ct-title">📊 Tickets × Contatos Novos</div>
        <div class="vbar-chart">
          <div class="vbar-col">
            <div class="vbar-num yellow">${d.total}</div>
            <div class="vbar-spacer" style="height:${MAX_H - hT}px"></div>
            <div class="vbar-bar" style="height:${hT}px;background:linear-gradient(to top,#F5A623,#fbbf24)"></div>
            <div class="vbar-lbl">Tickets</div>
          </div>
          <div class="vbar-divider"></div>
          <div class="vbar-col">
            <div class="vbar-num green">${contatos}</div>
            <div class="vbar-spacer" style="height:${MAX_H - hC}px"></div>
            <div class="vbar-bar" style="height:${hC}px;background:linear-gradient(to top,#16a34a,#22c55e)"></div>
            <div class="vbar-lbl">Contatos</div>
          </div>
        </div>
        <div class="taxa-row">
          <div class="taxa-box">
            <div class="taxa-label">Taxa Captação</div>
            <div class="taxa-val">${taxa}<span style="font-size:.8rem">%</span></div>
            <div class="taxa-sub">contatos / tickets</div>
          </div>
        </div>
      </div>

      <div class="rcard">
        <div class="ct-title">⚡ Status dos Tickets</div>
        <div class="status-bar-wrap">
          <div style="display:flex;height:22px;border-radius:6px;overflow:hidden;width:100%">
            <div style="width:${pOpen}%;background:#22c55e"></div>
            <div style="width:${pPending}%;background:#f59e0b"></div>
            <div style="width:${pClosed}%;background:#3b82f6"></div>
          </div>
        </div>
        <div class="status-legend">
          <div class="sl-item">
            <div class="sl-dot" style="background:#22c55e"></div>
            <div class="sl-val green">${d.open}</div>
            <div class="sl-pct">${pOpen}%</div>
            <div class="sl-lbl">Atendendo</div>
          </div>
          <div class="sl-item">
            <div class="sl-dot" style="background:#f59e0b"></div>
            <div class="sl-val orange">${d.pending}</div>
            <div class="sl-pct">${pPending}%</div>
            <div class="sl-lbl">Aguardando</div>
          </div>
          <div class="sl-item">
            <div class="sl-dot" style="background:#3b82f6"></div>
            <div class="sl-val blue">${d.closed}</div>
            <div class="sl-pct">${pClosed}%</div>
            <div class="sl-lbl">Fechados</div>
          </div>
        </div>
      </div>

    </div>`;
}

function secaoEmpresa(r) {
  if (r.erro) return `
    <div class="col">
      <div class="empresa-header"><span class="empresa-nome">${r.nome}</span></div>
      <div style="color:#ef4444;font-size:.85rem;padding:10px">${r.erro}</div>
    </div>`;

  const d     = r.dados || { total:0, open:0, pending:0, closed:0, agentes:[] };
  const half  = Math.ceil(d.agentes.length / 2);
  const maxAg = Math.max(...d.agentes.map(a => a.total), 1);

  return `
    <div class="col">
      <div class="empresa-header">
        <span class="empresa-nome">${r.nome}</span>
        <span class="empresa-periodo">${r.periodo}</span>
      </div>

      <div class="body-row">

        <!-- KPIs -->
        <div class="left-panel">
          <div class="kpi-item">
            <div class="kpi-label">Total Tickets</div>
            <div class="kpi-value yellow">${d.total}</div>
          </div>
          <div class="kpi-item">
            <div class="kpi-label">🟢 Atendendo</div>
            <div class="kpi-value green">${d.open}</div>
          </div>
          <div class="kpi-item">
            <div class="kpi-label">🟡 Aguardando</div>
            <div class="kpi-value orange">${d.pending}</div>
          </div>
          <div class="kpi-item">
            <div class="kpi-label">✅ Fechados</div>
            <div class="kpi-value blue">${d.closed}</div>
          </div>
          <div class="kpi-item kpi-accent">
            <div class="kpi-label">➕ Contatos Novos</div>
            <div class="kpi-value cyan">${r.contatosHoje}</div>
          </div>
        </div>

        <!-- Atendentes -->
        <div class="center-panel">
          <div class="ct-title">👤 Atendentes &nbsp;<span style="color:#22c55e;font-size:.68rem">■ atendendo</span> &nbsp;<span style="color:#f59e0b;font-size:.68rem">■ aguardando</span></div>
          ${d.agentes.length <= 3
            ? `<div class="ag-col" style="flex:1">
                <div class="bars-wrap" style="justify-content:flex-start;gap:18px;padding-top:8px">${barrasAgentes(d.agentes, maxAg)}</div>
               </div>`
            : `<div class="ag-grid">
                <div class="ag-col"><div class="bars-wrap">${barrasAgentes(d.agentes.slice(0, half), maxAg)}</div></div>
                <div class="ag-col"><div class="bars-wrap">${barrasAgentes(d.agentes.slice(half), maxAg)}</div></div>
               </div>`
          }
        </div>

        <!-- Gráficos direita -->
        ${painelDireito(d, r.contatosHoje)}

      </div>
    </div>`;
}

function gerarHTML(resultados, geradoEm, periodo) {
  const cfg = PERIODOS[periodo] || PERIODOS.hoje;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Dashboard Deskrio — ${cfg.label}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#0d0d0d;color:#f0f0f0;width:1920px;height:1080px;overflow:hidden;display:flex;flex-direction:column;padding:16px 28px 12px}
  /* Header */
  .header{display:flex;align-items:baseline;gap:16px;margin-bottom:12px;flex-shrink:0}
  h1{color:#F5A623;font-size:1.5rem;font-weight:800}
  .sub{color:#888;font-size:.82rem}
  /* Stack de empresas */
  .stack{display:flex;flex-direction:column;gap:10px;flex:1;min-height:0}
  /* Card empresa */
  .col{background:#161616;border-radius:14px;padding:12px 18px 14px;flex:1;min-height:0;display:flex;flex-direction:column}
  .empresa-header{display:flex;align-items:baseline;gap:10px;margin-bottom:10px;flex-shrink:0;border-bottom:1px solid #222;padding-bottom:8px}
  .empresa-nome{color:#F5A623;font-size:1.15rem;font-weight:700}
  .empresa-periodo{font-size:.72rem;color:#888;background:#1d1d1d;padding:3px 10px;border-radius:4px;border:1px solid #333}
  /* Body row (3 painéis) */
  .body-row{display:flex;gap:12px;flex:1;min-height:0}
  /* Painel esquerdo: KPIs */
  .left-panel{width:210px;flex-shrink:0;display:flex;flex-direction:column;gap:6px}
  .kpi-item{background:#1c1c1c;border-radius:8px;padding:8px 14px;flex:1;border-left:3px solid #2a2a2a}
  .kpi-accent{border-left-color:#06b6d4 !important}
  .kpi-label{font-size:.65rem;color:#888;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap}
  .kpi-value{font-size:2.4rem;font-weight:800;line-height:1.1;margin-top:2px}
  .yellow{color:#F5A623}.green{color:#22c55e}.orange{color:#f97316}.blue{color:#3b82f6}.cyan{color:#06b6d4}
  /* Painel central: Atendentes */
  .center-panel{flex:1;display:flex;flex-direction:column;min-width:0}
  .ct-title{font-size:.72rem;color:#999;text-transform:uppercase;letter-spacing:.07em;font-weight:700;margin-bottom:8px;flex-shrink:0}
  .ag-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;flex:1;min-height:0}
  .ag-col{background:#1c1c1c;border-radius:8px;padding:10px 12px;display:flex;flex-direction:column;min-height:0}
  .bars-wrap{flex:1;overflow:hidden;display:flex;flex-direction:column;justify-content:space-evenly}
  .bar-row{display:flex;align-items:center;gap:7px}
  .bar-label{font-size:.72rem;color:#ccc;width:155px;text-align:right;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .bar-track{flex:1;background:#2e2e2e;border-radius:5px;height:16px;overflow:hidden}
  .bar-val{font-size:.7rem;font-weight:700;width:72px;flex-shrink:0;white-space:nowrap}
  /* Painel direito: gráficos */
  .right-panel{width:260px;flex-shrink:0;display:flex;flex-direction:column;gap:10px}
  .rcard{background:#1c1c1c;border-radius:10px;padding:12px 14px;display:flex;flex-direction:column}
  /* Gráfico vertical Tickets x Contatos */
  .vbar-chart{display:flex;align-items:flex-end;justify-content:center;gap:0;padding:6px 0 8px;flex:1;height:140px}
  .vbar-col{display:flex;flex-direction:column;align-items:center;gap:3px;flex:1}
  .vbar-spacer{width:100%}
  .vbar-bar{width:52px;border-radius:5px 5px 0 0}
  .vbar-num{font-size:1.2rem;font-weight:800;line-height:1}
  .vbar-lbl{font-size:.65rem;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-top:4px}
  .vbar-divider{width:1px;background:#2a2a2a;align-self:stretch;margin:0 6px}
  .taxa-row{margin-top:6px}
  .taxa-box{background:#151515;border-radius:6px;padding:7px 10px;text-align:center}
  .taxa-label{font-size:.65rem;color:#888;text-transform:uppercase;letter-spacing:.06em}
  .taxa-val{font-size:1.7rem;font-weight:800;color:#a78bfa;line-height:1.1}
  .taxa-sub{font-size:.6rem;color:#666;margin-top:2px}
  /* Status breakdown */
  .status-bar-wrap{margin:8px 0 10px}
  .status-legend{display:flex;justify-content:space-around}
  .sl-item{display:flex;flex-direction:column;align-items:center;gap:2px}
  .sl-dot{width:8px;height:8px;border-radius:50%}
  .sl-val{font-size:1rem;font-weight:800;line-height:1}
  .sl-pct{font-size:.65rem;color:#888;font-weight:600}
  .sl-lbl{font-size:.6rem;color:#777;text-transform:uppercase}
</style>
</head>
<body>
<div class="header">
  <h1>📥 Dashboard Deskrio</h1>
  <span class="sub">Atualizado em ${geradoEm}</span>
</div>
<div class="stack">
  ${resultados.map(r => secaoEmpresa(r)).join('\n')}
</div>
</body>
</html>`;
}

// ─── Exportar PNG ─────────────────────────────────────────────────────────────

async function exportarPng(htmlPath) {
  const puppeteer = require('puppeteer');
  const { pathToFileURL } = require('url');
  const absPath = path.resolve(htmlPath);
  const pngPath = absPath.replace(/\.html$/i, '.png');
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(absPath).href, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.screenshot({ path: pngPath, fullPage: false });
    return pngPath;
  } finally {
    await browser.close();
  }
}

// ─── Gerar dashboard HTML + PNG ──────────────────────────────────────────────

async function gerarPng(resultados, slug) {
  const agora    = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  fs.mkdirSync(PASTA_SAIDA, { recursive: true });
  const htmlPath = path.join(PASTA_SAIDA, `deskrio-${slug}.html`);
  fs.writeFileSync(htmlPath, gerarHTML(resultados, agora, slug), 'utf8');
  return exportarPng(htmlPath);
}

async function gerarDeskrioDashboardPng(periodo = 'hoje') {
  const resultados = await monitorarDeskrio(periodo);
  const slug       = periodo.replace(/\W/g, '');
  const pngPath    = await gerarPng(resultados, slug);
  return { pngPath, resultados };
}

async function gerarDeskrioDashboardPngRange(inicioStr, fimStr) {
  const resultados = await monitorarDeskrioRange(inicioStr, fimStr);
  const slug       = `custom-${inicioStr.replace(/\//g,'-')}-${fimStr.replace(/\//g,'-')}`;
  const pngPath    = await gerarPng(resultados, slug);
  return { pngPath, resultados };
}

// ─── Ranking de atendentes ────────────────────────────────────────────────────

async function gerarRanking(periodo = 'semana') {
  if (EMPRESAS.length === 0) throw new Error('Nenhum token Deskrio configurado no .env');

  const agora = new Date();
  let inicio, fim, label;

  if (periodo === 'semana') {
    const dow = agora.getDay();
    const diasDesdeSegunda = dow === 0 ? 6 : dow - 1;
    inicio = new Date(agora); inicio.setDate(agora.getDate() - diasDesdeSegunda); inicio.setHours(0,0,0,0);
    fim    = new Date(agora); fim.setHours(23,59,59,999);
    label  = `Semana (${dateToFmt(inicio)} - ${dateToFmt(fim)})`;
  } else if (periodo === '7d') {
    inicio = new Date(agora); inicio.setDate(agora.getDate() - 6); inicio.setHours(0,0,0,0);
    fim    = new Date(agora); fim.setHours(23,59,59,999);
    label  = `7 dias (${dateToFmt(inicio)} - ${dateToFmt(fim)})`;
  } else {
    inicio = new Date(agora); inicio.setHours(0,0,0,0);
    fim    = new Date(agora); fim.setHours(23,59,59,999);
    label  = `Hoje (${dateToFmt(inicio)})`;
  }

  // Nomes que nunca entram no ranking
  const EXCLUIR = ['sem atendente', 'gerencia', 'administrador', 'deskrio'];

  return Promise.all(EMPRESAS.map(async empresa => {
    const { nome, token, instancia, filtroAgentes, ordemAgentes } = empresa;
    const ticketsArr = await buscarTicketsComChunks(instancia, token, inicio, fim).catch(() => []);

    const mapa = {};
    ticketsArr.forEach(t => {
      const ag = t.user?.name || 'Sem atendente';
      if (!mapa[ag]) mapa[ag] = { total:0, open:0, pending:0, closed:0 };
      mapa[ag].total++;
      const s = (t.status || '').toLowerCase();
      if      (s === 'open' || s === 'groups') mapa[ag].open++;
      else if (s === 'pending')                mapa[ag].pending++;
      else if (s === 'closed')                 mapa[ag].closed++;
    });

    let agentes = Object.entries(mapa).map(([n, v]) => ({ nome: n, ...v }));

    // Remove entradas sem atendente, gerência, admin
    agentes = agentes.filter(a => !EXCLUIR.some(ex => a.nome.toLowerCase().includes(ex)));

    // Para BR Pneus: mantém só quem está na lista ordenada (consultores conhecidos)
    if (ordemAgentes) {
      agentes = agentes.filter(a =>
        ordemAgentes.some(o => o !== 'sem atendente' && a.nome.toLowerCase().includes(o))
      );
    }

    // Para Peg Pneus: filtro por nome de consultor
    if (filtroAgentes) {
      agentes = agentes.filter(a => filtroAgentes.some(f => a.nome.toLowerCase().includes(f)));
    }

    agentes.sort((a, b) => b.open - a.open || b.total - a.total);

    return { nome, label, agentes, totalTickets: ticketsArr.length };
  }));
}

function formatarRanking(resultados) {
  const medalhas = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
  const agora    = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour:'2-digit', minute:'2-digit' });
  const label    = resultados[0]?.label || '';
  let out = `🏆 *Ranking de Atendentes*\n📅 _${label}_ · 🕐 _${agora}_\n`;

  for (const r of resultados) {
    out += `\n┌─ *${r.nome}* ${'─'.repeat(Math.max(0, 20 - r.nome.length))}┐\n`;
    if (!r.agentes.length) { out += `│ _(sem dados)_\n└${'─'.repeat(22)}┘\n`; continue; }
    r.agentes.forEach((a, i) => {
      const m    = medalhas[i] || `${i + 1}.`;
      const nome = nomeAbreviado(a.nome);
      out += `│ ${m} *${nome}*\n`;
      out += `│   🟢 *${a.open}* atend.   🟡 ${a.pending} aguard.   ✅ ${a.closed} fechados\n`;
    });
    out += `└${'─'.repeat(22)}┘\n`;
  }
  return out.trim();
}

// ─── Ranking Dashboard HTML ──────────────────────────────────────────────────

function corPosicao(i) {
  if (i === 0) return { bg: 'linear-gradient(135deg,#b8860b,#ffd700,#b8860b)', border: '#ffd700', text: '#fff8dc', badge: '#ffd700' };
  if (i === 1) return { bg: 'linear-gradient(135deg,#5a5a5a,#c0c0c0,#5a5a5a)', border: '#c0c0c0', text: '#f0f0f0', badge: '#c0c0c0' };
  if (i === 2) return { bg: 'linear-gradient(135deg,#6b3a1f,#cd7f32,#6b3a1f)', border: '#cd7f32', text: '#faebd7', badge: '#cd7f32' };
  return { bg: '#1c1c1c', border: '#2e2e2e', text: '#e0e0e0', badge: '#444' };
}

function nomeAbreviado(nome) {
  return nome
    .replace(/consultora\s*/i, '')
    .replace(/\s*-\s*peg pneus/i, '')
    .replace(/\s*-\s*peg$/i, '')
    .trim()
    .split(' ').slice(0, 3).join(' ');
}

function medalha(i) {
  return ['🥇','🥈','🥉','4','5','6','7','8','9','10'][i] || String(i + 1);
}

function secaoRanking(empresa) {
  const { nome: nomeEmpresa, label, agentes } = empresa;
  if (!agentes.length) return `<div class="secao"><div class="secao-header"><span class="secao-nome">${nomeEmpresa}</span></div><p style="color:#555;padding:20px">Sem dados</p></div>`;

  const maxOpen    = Math.max(...agentes.map(a => a.open),    1);
  const maxClosed  = Math.max(...agentes.map(a => a.closed),  1);
  const campao     = agentes[0];
  const cor0       = corPosicao(0);

  const campaoHTML = `
    <div class="champ-card" style="background:${cor0.bg};border-color:${cor0.border}">
      <div class="champ-left">
        <div class="champ-trophy">🏆</div>
        <div class="champ-score">${campao.open}</div>
        <div class="champ-unit">atendendo</div>
      </div>
      <div class="champ-right">
        <div class="champ-nome">${nomeAbreviado(campao.nome)}</div>
        <div class="champ-stats">
          <span class="badge-aguard">🟡 ${campao.pending} aguardando</span>
          <span class="badge-closed">✅ ${campao.closed} fechados</span>
          <span class="badge-total">📋 ${campao.total} total</span>
        </div>
      </div>
    </div>`;

  const listaHTML = agentes.slice(1).map((a, idx) => {
    const i   = idx + 1;
    const cor = corPosicao(i);
    const pctO = maxOpen   > 0 ? (a.open   / maxOpen   * 100).toFixed(1) : 0;
    const pctC = maxClosed > 0 ? (a.closed / maxClosed * 100).toFixed(1) : 0;
    return `
      <div class="rank-row" style="border-left:4px solid ${cor.border}">
        <div class="rank-medal" style="background:${cor.badge};color:${i < 3 ? '#111':'#ccc'}">${medalha(i)}</div>
        <div class="rank-info">
          <div class="rank-nome">${nomeAbreviado(a.nome)}</div>
          <div class="rank-bars">
            <div class="bar-wrap"><div class="bar-fill bar-green" style="width:${pctO}%"></div></div>
            <div class="bar-wrap"><div class="bar-fill bar-blue"  style="width:${pctC}%"></div></div>
          </div>
        </div>
        <div class="rank-nums">
          <span class="num-closed">${a.open}</span>
          <span class="num-sub">🟡 ${a.pending} · ✅ ${a.closed}</span>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="secao">
      <div class="secao-header">
        <span class="secao-nome">${nomeEmpresa}</span>
        <span class="secao-period">${label}</span>
      </div>
      ${campaoHTML}
      <div class="rank-list">${listaHTML}</div>
    </div>`;
}

function gerarRankingHTML(resultados, geradoEm) {
  const label = resultados[0]?.label || '';
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#0d0d0d;color:#f0f0f0;width:1080px;min-height:1920px;display:flex;flex-direction:column;padding:48px 40px 40px}

  .header{display:flex;align-items:center;gap:14px;margin-bottom:40px;padding-bottom:24px;border-bottom:2px solid #1e1e1e}
  .header-title{font-size:2.2rem;font-weight:900;color:#F5A623;letter-spacing:-0.5px}
  .header-label{font-size:1rem;color:#666;background:#161616;padding:6px 16px;border-radius:6px;border:1px solid #2a2a2a}
  .header-time{font-size:.85rem;color:#444;margin-left:auto}

  .secoes{display:flex;flex-direction:column;gap:36px;flex:1}

  .secao{background:#111;border-radius:18px;padding:28px 30px;display:flex;flex-direction:column;gap:18px}
  .secao-header{display:flex;align-items:baseline;gap:12px}
  .secao-nome{font-size:1.4rem;font-weight:900;color:#F5A623}
  .secao-period{font-size:.8rem;color:#555;background:#1a1a1a;padding:3px 10px;border-radius:5px;border:1px solid #2a2a2a}

  /* Campeão */
  .champ-card{border-radius:14px;border:2px solid;padding:20px 24px;display:flex;align-items:center;gap:24px}
  .champ-left{text-align:center;flex-shrink:0;min-width:90px}
  .champ-trophy{font-size:2.8rem;line-height:1}
  .champ-score{font-size:3.6rem;font-weight:900;line-height:1;color:#fff;margin-top:4px}
  .champ-unit{font-size:.9rem;color:rgba(255,255,255,.55);margin-top:2px}
  .champ-right{flex:1}
  .champ-nome{font-size:1.6rem;font-weight:800;color:#fff;margin-bottom:12px}
  .champ-stats{display:flex;flex-wrap:wrap;gap:10px}
  .badge-atend,.badge-aguard,.badge-total{font-size:.88rem;padding:5px 12px;border-radius:20px;font-weight:600}
  .badge-aguard{background:rgba(234,179,8,.15);color:#fde68a;border:1px solid rgba(234,179,8,.3)}
  .badge-closed{background:rgba(34,197,94,.15);color:#86efac;border:1px solid rgba(34,197,94,.3)}
  .badge-total{background:rgba(148,163,184,.1);color:#94a3b8;border:1px solid rgba(148,163,184,.2)}

  /* Lista */
  .rank-list{display:flex;flex-direction:column;gap:10px}
  .rank-row{display:flex;align-items:center;gap:14px;background:#161616;border-radius:10px;padding:14px 16px;border-left:4px solid #333}
  .rank-medal{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.9rem;font-weight:900;flex-shrink:0}
  .rank-info{flex:1;min-width:0}
  .rank-nome{font-size:1.05rem;font-weight:700;color:#e5e5e5;margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .rank-bars{display:flex;flex-direction:column;gap:5px}
  .bar-wrap{height:8px;background:#252525;border-radius:4px;overflow:hidden}
  .bar-fill{height:100%;border-radius:4px;transition:width .3s}
  .bar-green{background:linear-gradient(90deg,#22c55e,#16a34a)}
  .bar-blue{background:linear-gradient(90deg,#60a5fa,#3b82f6);opacity:.75}
  .rank-nums{text-align:right;flex-shrink:0;min-width:90px}
  .num-closed{display:block;font-size:1.5rem;font-weight:900;color:#22c55e;line-height:1}
  .num-sub{font-size:.75rem;color:#555;white-space:nowrap;margin-top:3px;display:block}

  .legend{display:flex;gap:20px;padding:10px 0 0;flex-shrink:0}
  .legend-item{display:flex;align-items:center;gap:6px;font-size:.78rem;color:#555}
  .legend-dot{width:10px;height:10px;border-radius:2px}
</style>
</head>
<body>
<div class="header">
  <span class="header-title">🏆 Ranking de Atendentes</span>
  <span class="header-label">${label}</span>
  <span class="header-time">Atualizado em ${geradoEm}</span>
</div>
<div class="secoes">
  ${resultados.map(r => secaoRanking(r)).join('\n')}
</div>
<div class="legend">
  <div class="legend-item"><div class="legend-dot" style="background:#22c55e"></div>Barra verde = em atendimento</div>
  <div class="legend-item"><div class="legend-dot" style="background:#60a5fa"></div>Barra azul = fechados</div>
</div>
</body>
</html>`;
}

async function exportarPngVertical(htmlPath) {
  const puppeteer = require('puppeteer');
  const { pathToFileURL } = require('url');
  const absPath = path.resolve(htmlPath);
  const pngPath = absPath.replace(/\.html$/i, '.png');
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(absPath).href, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.screenshot({ path: pngPath, fullPage: true });
    return pngPath;
  } finally {
    await browser.close();
  }
}

async function gerarRankingDashboardPng(periodo = 'semana') {
  const resultados = await gerarRanking(periodo);
  const agora      = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const slug       = `ranking-${periodo.replace(/\W/g, '')}`;

  fs.mkdirSync(PASTA_SAIDA, { recursive: true });
  const htmlPath = path.join(PASTA_SAIDA, `${slug}.html`);
  fs.writeFileSync(htmlPath, gerarRankingHTML(resultados, agora), 'utf8');

  const pngPath = await exportarPngVertical(htmlPath);
  return { pngPath, resultados };
}

// ─── CLI standalone ────────────────────────────────────────────────────────────

if (require.main === module) {
  const periodo = process.argv[2] || 'hoje';
  monitorarDeskrio(periodo)
    .then(r => console.log(formatarResumo(r)))
    .catch(err => console.error('❌ Erro:', err.message));
}

module.exports = { monitorarDeskrio, monitorarDeskrioRange, formatarResumo, formatarVerificacao, gerarDeskrioDashboardPng, gerarDeskrioDashboardPngRange, gerarRanking, formatarRanking, gerarRankingDashboardPng };
