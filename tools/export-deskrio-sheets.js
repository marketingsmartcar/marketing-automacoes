'use strict';

require('dotenv').config();

const path    = require('path');
const fs      = require('fs');
const ExcelJS = require('exceljs');
const { monitorarDeskrioRange } = require('./monitor-deskrio');

// ─── Cores da marca ────────────────────────────────────────────────────────────
const COR = {
  laranja:    'FFFFF5A623',
  preto:      'FF1A1A1A',
  branco:     'FFFFFFFF',
  verde:      'FF22C55E',
  amarelo:    'FFF59E0B',
  azul:       'FF3B82F6',
  cinzaClaro: 'FFF5F5F5',
  cinzaMed:   'FFE5E7EB',
  cinzaEsc:   'FF6B7280',
  verdeClaro: 'FFD1FAE5',
  amareloClaro:'FFFEF9C3',
  azulClaro:  'FFDBEAFE',
  vermelhoClaro:'FFFEE2E2',
  roxoClaro:  'FFEDE9FE',
};

function fill(hex)  { return { type: 'pattern', pattern: 'solid', fgColor: { argb: hex } }; }
function font(bold, size, color) { return { bold: !!bold, size: size || 11, color: { argb: color || COR.preto }, name: 'Calibri' }; }
function border() {
  const s = { style: 'thin', color: { argb: 'FFD1D5DB' } };
  return { top: s, left: s, bottom: s, right: s };
}
function alignC() { return { vertical: 'middle', horizontal: 'center' }; }
function alignL() { return { vertical: 'middle', horizontal: 'left' }; }
function alignR() { return { vertical: 'middle', horizontal: 'right' }; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function headerRow(ws, cols) {
  const row = ws.addRow(cols.map(c => c.header));
  row.height = 28;
  row.eachCell((cell, i) => {
    cell.fill      = fill(COR.preto);
    cell.font      = font(true, 11, COR.branco);
    cell.alignment = cols[i - 1]?.align || alignC();
    cell.border    = border();
  });
}

function dataRow(ws, values, fills, aligns) {
  const row = ws.addRow(values);
  row.height = 22;
  row.eachCell((cell, i) => {
    if (fills?.[i - 1])  cell.fill      = fill(fills[i - 1]);
    cell.font      = font(false, 10);
    cell.alignment = aligns?.[i - 1] || alignC();
    cell.border    = border();
  });
  return row;
}

function pct(v, total) {
  if (!total) return '—';
  return `${(v / total * 100).toFixed(1)}%`;
}

// ─── Aba Resumo ───────────────────────────────────────────────────────────────

function abaResumo(wb, resultados, periodo) {
  const ws = wb.addWorksheet('📊 Resumo');
  ws.properties.tabColor = { argb: COR.laranja.slice(2) };

  // Título
  ws.mergeCells('A1:H1');
  const titulo = ws.getCell('A1');
  titulo.value     = `Relatório Deskrio — ${periodo}`;
  titulo.font      = font(true, 16, COR.branco);
  titulo.fill      = fill(COR.preto);
  titulo.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 36;

  // Subtítulo
  ws.mergeCells('A2:H2');
  const sub = ws.getCell('A2');
  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  sub.value     = `Gerado em ${agora}`;
  sub.font      = font(false, 10, COR.cinzaEsc);
  sub.fill      = fill('FFF9FAFB');
  sub.alignment = alignC();
  ws.getRow(2).height = 18;

  ws.addRow([]);

  // Tabela por empresa
  const cols = [
    { header: 'Empresa',        align: alignL() },
    { header: 'Total Tickets',  align: alignC() },
    { header: '🟢 Atendimento', align: alignC() },
    { header: '% Atendimento',  align: alignC() },
    { header: '🟡 Aguardando',  align: alignC() },
    { header: '✅ Fechados',    align: alignC() },
    { header: '% Fechamento',   align: alignC() },
    { header: '➕ Novos Contatos', align: alignC() },
  ];
  ws.getRow(4).height = 28;
  headerRow(ws, cols);

  let totalAll = 0, openAll = 0, pendAll = 0, closedAll = 0, contatosAll = 0;

  resultados.forEach((r, idx) => {
    const d = r.dados || { total: 0, open: 0, pending: 0, closed: 0 };
    totalAll   += d.total;
    openAll    += d.open;
    pendAll    += d.pending;
    closedAll  += d.closed;
    contatosAll += r.contatosHoje || 0;

    const rowFill = idx % 2 === 0 ? COR.branco : COR.cinzaClaro;
    dataRow(ws,
      [r.nome, d.total, d.open, pct(d.open, d.total), d.pending, d.closed, pct(d.closed, d.total), r.contatosHoje || 0],
      [rowFill, rowFill, 'FFD1FAE5', 'FFD1FAE5', 'FFFEF9C3', 'FFDBEAFE', 'FFDBEAFE', 'FFEDE9FE'],
      [alignL(), alignC(), alignC(), alignC(), alignC(), alignC(), alignC(), alignC()]
    );
  });

  // Linha total
  const totRow = ws.addRow(['TOTAL', totalAll, openAll, pct(openAll, totalAll), pendAll, closedAll, pct(closedAll, totalAll), contatosAll]);
  totRow.height = 24;
  totRow.eachCell((cell, i) => {
    cell.fill      = fill(COR.laranja);
    cell.font      = font(true, 11, COR.preto);
    cell.alignment = i === 1 ? alignL() : alignC();
    cell.border    = border();
  });

  // Larguras das colunas
  ws.getColumn(1).width = 22;
  [2,3,4,5,6,7,8].forEach(i => { ws.getColumn(i).width = 16; });

  return ws;
}

// ─── Aba por Empresa ──────────────────────────────────────────────────────────

function abaEmpresa(wb, resultado) {
  const ws = wb.addWorksheet(`👥 ${resultado.nome}`);
  ws.properties.tabColor = { argb: 'FF3B82F6' };

  const d = resultado.dados;
  if (!d || !d.agentes?.length) {
    ws.addRow(['Sem dados para este período']);
    return;
  }

  // Título
  ws.mergeCells('A1:G1');
  const t = ws.getCell('A1');
  t.value     = `${resultado.nome} — ${resultado.periodo}`;
  t.font      = font(true, 14, COR.branco);
  t.fill      = fill(COR.preto);
  t.alignment = alignC();
  ws.getRow(1).height = 32;

  // KPIs rápidos
  const kpis = [
    ['Total Tickets', d.total, COR.preto, COR.branco],
    ['Em Atendimento', d.open, 'FF166534', 'FFD1FAE5'],
    ['Aguardando', d.pending, 'FF92400E', 'FFFEF9C3'],
    ['Fechados', d.closed, '1D4ED8', 'FFDBEAFE'],
    ['Novos Contatos', resultado.contatosHoje || 0, '5B21B6', 'FFEDE9FE'],
  ];
  ws.addRow([]);
  const kpiRow = ws.addRow(kpis.map(k => k[0]));
  kpiRow.height = 20;
  kpiRow.eachCell((cell, i) => {
    cell.fill      = fill(kpis[i-1][3]);
    cell.font      = font(true, 9, `FF${kpis[i-1][2]}`);
    cell.alignment = alignC();
    cell.border    = border();
  });
  const valRow = ws.addRow(kpis.map(k => k[1]));
  valRow.height = 28;
  valRow.eachCell((cell, i) => {
    cell.fill      = fill(kpis[i-1][3]);
    cell.font      = font(true, 16, `FF${kpis[i-1][2]}`);
    cell.alignment = alignC();
    cell.border    = border();
  });

  ws.addRow([]);

  // Tabela de agentes
  const cols = [
    { header: 'Consultor/a',     align: alignL() },
    { header: 'Total',           align: alignC() },
    { header: '🟢 Atend.',       align: alignC() },
    { header: '% Atend.',        align: alignC() },
    { header: '🟡 Aguard.',      align: alignC() },
    { header: '✅ Fechados',     align: alignC() },
    { header: '% Fechamento',    align: alignC() },
  ];
  headerRow(ws, cols);

  const maxFechados = Math.max(...d.agentes.map(a => a.closed), 1);

  d.agentes.forEach((a, idx) => {
    const pctFech = pct(a.closed, a.total);
    const pctAten = pct(a.open, a.total);
    const rowFill = idx % 2 === 0 ? COR.branco : COR.cinzaClaro;

    const r = dataRow(ws,
      [a.nome, a.total, a.open, pctAten, a.pending, a.closed, pctFech],
      [rowFill, rowFill, 'FFD1FAE5', 'FFD1FAE5', 'FFFEF9C3', 'FFDBEAFE', 'FFDBEAFE'],
      [alignL(), alignC(), alignC(), alignC(), alignC(), alignC(), alignC()]
    );

    // Destaca o melhor em fechamento
    if (a.closed === maxFechados) {
      r.getCell(6).fill = fill(COR.verde);
      r.getCell(6).font = font(true, 10, COR.branco);
    }
  });

  // Larguras
  ws.getColumn(1).width = 28;
  [2,3,4,5,6,7].forEach(i => { ws.getColumn(i).width = 14; });

  // Freeze header area
  ws.views = [{ state: 'frozen', ySplit: 6 }];
}

// ─── Helpers de formatação ────────────────────────────────────────────────────

function fmtDataHora(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function fmtSegundos(s) {
  if (!s || isNaN(s)) return '—';
  const n = parseInt(s);
  if (n < 60)   return `${n}s`;
  if (n < 3600) return `${Math.floor(n/60)}min`;
  return `${Math.floor(n/3600)}h ${Math.floor((n%3600)/60)}min`;
}

function statusLabel(s) {
  if (!s) return '—';
  const map = { open: '🟢 Atendimento', pending: '🟡 Aguardando', closed: '✅ Fechado', groups: '👥 Grupo' };
  return map[s.toLowerCase()] || s;
}

function statusFill(s) {
  if (!s) return COR.branco;
  const map = { open: 'FFD1FAE5', pending: 'FFFEF9C3', closed: 'FFDBEAFE', groups: 'FFEDE9FE' };
  return map[s.toLowerCase()] || COR.branco;
}

// ─── Aba Atendimentos por Atendente ──────────────────────────────────────────

function abaAtendimentosPorAtendente(wb, resultados) {
  const ws = wb.addWorksheet('👤 Por Atendente');
  ws.properties.tabColor = { argb: 'FFF59E0B' };

  // Título
  ws.mergeCells('A1:H1');
  const t = ws.getCell('A1');
  t.value     = 'Atendimentos por Atendente — Detalhamento Individual';
  t.font      = font(true, 13, COR.branco);
  t.fill      = fill(COR.preto);
  t.alignment = alignC();
  ws.getRow(1).height = 28;
  ws.addRow([]);

  const cols = [
    { header: 'Empresa',          align: alignL() },
    { header: 'Atendente',        align: alignL() },
    { header: 'Total Atend.',     align: alignC() },
    { header: '🟢 Em Atend.',     align: alignC() },
    { header: '🟡 Aguardando',    align: alignC() },
    { header: '✅ Fechados',      align: alignC() },
    { header: '% Fechamento',     align: alignC() },
    { header: 'Tempo Médio Esp.', align: alignC() },
  ];
  headerRow(ws, cols);

  let linhaAtual = 4;

  resultados.forEach(r => {
    const tickets = r.ticketsRaw || [];
    if (!tickets.length) return;

    // Agrupa por atendente com todos os campos disponíveis
    const mapa = {};
    tickets.forEach(t => {
      const ag = t.user?.name || 'Sem atendente';
      if (!mapa[ag]) mapa[ag] = { tickets: [], open: 0, pending: 0, closed: 0, waitTimes: [] };
      mapa[ag].tickets.push(t);
      const s = (t.status || '').toLowerCase();
      if (s === 'open' || s === 'groups') mapa[ag].open++;
      else if (s === 'pending')           mapa[ag].pending++;
      else if (s === 'closed')            mapa[ag].closed++;
      if (t.waitTime) mapa[ag].waitTimes.push(parseInt(t.waitTime));
    });

    // Ordena por total decrescente
    const agentes = Object.entries(mapa)
      .map(([nome, v]) => ({ nome, total: v.tickets.length, ...v }))
      .sort((a, b) => b.open - a.open || b.total - a.total);

    agentes.forEach((a, idx) => {
      const rowFill = idx % 2 === 0 ? COR.branco : COR.cinzaClaro;
      const avgWait = a.waitTimes.length ? Math.round(a.waitTimes.reduce((s, x) => s + x, 0) / a.waitTimes.length) : null;
      const row = ws.addRow([
        r.nome,
        a.nome,
        a.total,
        a.open,
        a.pending,
        a.closed,
        pct(a.closed, a.total),
        avgWait ? fmtSegundos(avgWait) : '—',
      ]);
      row.height = 22;
      row.eachCell((cell, i) => {
        const fills = [rowFill, rowFill, rowFill, 'FFD1FAE5', 'FFFEF9C3', 'FFDBEAFE', 'FFDBEAFE', rowFill];
        cell.fill      = fill(fills[i - 1] || rowFill);
        cell.font      = font(i <= 2, 10);
        cell.alignment = i <= 2 ? alignL() : alignC();
        cell.border    = border();
      });
      linhaAtual++;
    });

    // Subtotal da empresa
    const totOpen    = agentes.reduce((s, a) => s + a.open,    0);
    const totPending = agentes.reduce((s, a) => s + a.pending, 0);
    const totClosed  = agentes.reduce((s, a) => s + a.closed,  0);
    const totTotal   = agentes.reduce((s, a) => s + a.total,   0);
    const subRow = ws.addRow([r.nome + ' — TOTAL', '', totTotal, totOpen, totPending, totClosed, pct(totClosed, totTotal), '']);
    subRow.height = 22;
    subRow.eachCell(cell => {
      cell.fill   = fill(COR.laranja);
      cell.font   = font(true, 10, COR.preto);
      cell.border = border();
      cell.alignment = alignC();
    });
    subRow.getCell(1).alignment = alignL();
    linhaAtual++;

    ws.addRow([]);
    linhaAtual++;
  });

  ws.getColumn(1).width = 16;
  ws.getColumn(2).width = 28;
  [3,4,5,6,7,8].forEach(i => { ws.getColumn(i).width = 15; });
  ws.views = [{ state: 'frozen', ySplit: 3 }];
}

// ─── Aba Tickets Individuais ──────────────────────────────────────────────────

function abaTicketsIndividuais(wb, resultados) {
  const ws = wb.addWorksheet('📋 Todos os Tickets');
  ws.properties.tabColor = { argb: 'FF6B7280' };

  ws.mergeCells('A1:J1');
  const t = ws.getCell('A1');
  t.value     = 'Todos os Atendimentos — Registro Individual';
  t.font      = font(true, 13, COR.branco);
  t.fill      = fill(COR.preto);
  t.alignment = alignC();
  ws.getRow(1).height = 28;
  ws.addRow([]);

  const cols = [
    { header: 'ID',            align: alignC() },
    { header: 'Empresa',       align: alignL() },
    { header: 'Atendente',     align: alignL() },
    { header: 'Contato',       align: alignL() },
    { header: 'Número',        align: alignC() },
    { header: 'Status',        align: alignC() },
    { header: 'Origem',        align: alignC() },
    { header: 'Criado em',     align: alignC() },
    { header: 'Fechado em',    align: alignC() },
    { header: 'T. Espera',     align: alignC() },
  ];
  headerRow(ws, cols);

  let rowIdx = 0;
  resultados.forEach(r => {
    (r.ticketsRaw || []).forEach(t => {
      const rowFill = rowIdx % 2 === 0 ? COR.branco : COR.cinzaClaro;
      const sf      = statusFill(t.status);
      const row = ws.addRow([
        t.id,
        r.nome,
        t.user?.name || '—',
        t.contact?.name || '—',
        t.contact?.number || '—',
        statusLabel(t.status),
        t.origin || '—',
        fmtDataHora(t.createdAt),
        fmtDataHora(t.closedAt),
        fmtSegundos(t.waitTime),
      ]);
      row.height = 20;
      row.eachCell((cell, i) => {
        cell.fill      = fill(i === 6 ? sf : rowFill);
        cell.font      = font(false, 9);
        cell.alignment = [1,6,7,8,9,10].includes(i) ? alignC() : alignL();
        cell.border    = border();
      });
      rowIdx++;
    });
  });

  [1,4,5,6,7,8,9,10].forEach((i, idx) => { ws.getColumn(i).width = [8,24,20,14,16,12,20,20,12][idx] || 14; });
  ws.getColumn(2).width = 14;
  ws.getColumn(3).width = 26;
  ws.views = [{ state: 'frozen', ySplit: 3 }];
}

// ─── Gerar planilha ───────────────────────────────────────────────────────────

async function gerarPlanilhaDeskrio(inicioStr, fimStr) {
  console.log(`📊 Buscando dados ${inicioStr} → ${fimStr}...`);
  const resultados = await monitorarDeskrioRange(inicioStr, fimStr);
  const periodo    = `${inicioStr} → ${fimStr}`;

  const wb = new ExcelJS.Workbook();
  wb.creator  = 'BR Pneus & Oficina — Sistema de Marketing';
  wb.created  = new Date();
  wb.modified = new Date();

  abaResumo(wb, resultados, periodo);
  abaAtendimentosPorAtendente(wb, resultados);
  resultados.forEach(r => abaEmpresa(wb, r));
  abaTicketsIndividuais(wb, resultados);

  const pasta    = path.join(__dirname, '..', 'output', 'relatorios');
  const slug     = `deskrio-${inicioStr.replace(/\//g,'-')}_${fimStr.replace(/\//g,'-')}`;
  const xlsxPath = path.join(pasta, `${slug}.xlsx`);

  fs.mkdirSync(pasta, { recursive: true });
  await wb.xlsx.writeFile(xlsxPath);

  console.log(`✅ Planilha gerada: ${xlsxPath}`);
  return xlsxPath;
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

if (require.main === module) {
  const [,, inicio, fim] = process.argv;
  if (!inicio || !fim) {
    console.error('Uso: node export-deskrio-sheets.js DD/MM DD/MM');
    process.exit(1);
  }
  gerarPlanilhaDeskrio(inicio, fim).catch(e => { console.error('❌', e.message); process.exit(1); });
}

module.exports = { gerarPlanilhaDeskrio };
