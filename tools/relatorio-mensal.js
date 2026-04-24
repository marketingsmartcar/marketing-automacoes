'use strict';

require('dotenv').config();

const path    = require('path');
const fs      = require('fs');
const ExcelJS = require('exceljs');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const { monitorarDeskrioRange } = require('./monitor-deskrio');

// ─── Constantes ───────────────────────────────────────────────────────────────

const PASTA   = path.join(__dirname, '..', 'output', 'relatorios');
const ARQUIVO = path.join(PASTA, 'deskrio-mensal.xlsx');

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const COR = {
  laranja: 'FFFFF5A623', laranjaEsc: 'FFD4891A',
  preto:   'FF1A1A1A',   cinzaEsc:   'FF6B7280',
  branco:  'FFFFFFFF',   cinzaClaro: 'FFF9FAFB', cinzaMed: 'FFF3F4F6',
  verde:   'FF16A34A',   verdeClaro: 'FFD1FAE5',
  amarelo: 'FFF59E0B',   amareloClaro:'FFFEF3C7',
  azul:    'FF2563EB',   azulClaro:  'FFDBEAFE',
  roxo:    'FF7C3AED',   roxoClaro:  'FFEDE9FE',
};

// ─── Helpers de estilo ────────────────────────────────────────────────────────

const fill = hex => ({ type:'pattern', pattern:'solid', fgColor:{ argb: hex } });
const fnt  = (bold, size, color, italic) => ({ bold:!!bold, size:size||11, italic:!!italic, color:{ argb:color||COR.preto }, name:'Calibri' });
const brd  = (c='FFD1D5DB') => { const s={style:'thin',color:{argb:c}}; return {top:s,left:s,bottom:s,right:s}; };
const aC   = () => ({ vertical:'middle', horizontal:'center' });
const aL   = () => ({ vertical:'middle', horizontal:'left' });

function hdrRow(ws, cols) {
  const row = ws.addRow(cols.map(c=>c.h));
  row.height = 26;
  row.eachCell((cell,i) => {
    cell.fill = fill(COR.preto); cell.font = fnt(true, 10, COR.branco);
    cell.alignment = cols[i-1]?.a || aC(); cell.border = brd('FF374151');
  });
}

function dRow(ws, vals, fills, aligns) {
  const row = ws.addRow(vals);
  row.height = 20;
  row.eachCell((cell,i) => {
    if (fills?.[i-1]) cell.fill = fill(fills[i-1]);
    cell.font = fnt(false, 10); cell.alignment = aligns?.[i-1] || aC(); cell.border = brd();
  });
  return row;
}

function totRow(ws, vals, aligns) {
  const row = ws.addRow(vals);
  row.height = 22;
  row.eachCell((cell,i) => {
    cell.fill = fill(COR.laranja); cell.font = fnt(true, 10);
    cell.alignment = aligns?.[i-1] || aC(); cell.border = brd('FFCA8A04');
  });
  return row;
}

const pct = (v, t) => t ? `${(v/t*100).toFixed(1)}%` : '—';

function fmtDia(iso) { const [,m,d]=iso.split('-'); return `${d}/${m}`; }
function nomeDia(iso) { return ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][new Date(iso+'T12:00:00Z').getUTCDay()]; }

// ─── Gerar gráfico como Buffer PNG ────────────────────────────────────────────

async function gerarGraficoLinha(dias) {
  const canvas = new ChartJSNodeCanvas({ width:900, height:320, backgroundColour:'#ffffff' });
  const labels = dias.map(d => fmtDia(d.dia));
  const config = {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label:'Total',           data: dias.map(d=>d.total),   borderColor:'#374151', backgroundColor:'rgba(55,65,81,.08)',   tension:.3, pointRadius:3, fill:true },
        { label:'Em Atendimento',  data: dias.map(d=>d.open),    borderColor:'#16A34A', backgroundColor:'rgba(22,163,74,.1)',   tension:.3, pointRadius:3, fill:false },
        { label:'Fechados',        data: dias.map(d=>d.closed),  borderColor:'#2563EB', backgroundColor:'rgba(37,99,235,.1)',   tension:.3, pointRadius:3, fill:false },
        { label:'Aguardando',      data: dias.map(d=>d.pending), borderColor:'#F59E0B', backgroundColor:'rgba(245,158,11,.1)',  tension:.3, pointRadius:3, fill:false },
      ],
    },
    options: {
      plugins: { legend:{ position:'bottom', labels:{ font:{ size:11 } } }, title:{ display:true, text:'Evolução Diária de Tickets', font:{ size:14, weight:'bold' } } },
      scales: {
        x: { grid:{ color:'#F3F4F6' }, ticks:{ font:{ size:10 } } },
        y: { grid:{ color:'#F3F4F6' }, ticks:{ font:{ size:10 } }, beginAtZero:true },
      },
    },
  };
  return canvas.renderToBuffer(config);
}

async function gerarGraficoBarras(agentes) {
  const top = agentes.slice(0, 15);
  const canvas = new ChartJSNodeCanvas({ width:900, height:380, backgroundColour:'#ffffff' });
  const labels = top.map(a => a.nome.replace(/\s*-\s*(BR Pneus|Peg Pneus).*$/i,'').trim());
  const config = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label:'Em Atendimento', data: top.map(a=>a.open),   backgroundColor:'rgba(22,163,74,.8)',  borderColor:'#16A34A', borderWidth:1 },
        { label:'Aguardando',     data: top.map(a=>a.pending),backgroundColor:'rgba(245,158,11,.8)', borderColor:'#F59E0B', borderWidth:1 },
        { label:'Fechados',       data: top.map(a=>a.closed), backgroundColor:'rgba(37,99,235,.8)',  borderColor:'#2563EB', borderWidth:1 },
      ],
    },
    options: {
      plugins: { legend:{ position:'bottom' }, title:{ display:true, text:'Tickets por Atendente', font:{ size:14, weight:'bold' } } },
      scales: {
        x: { stacked:false, grid:{ display:false }, ticks:{ font:{ size:9 }, maxRotation:45 } },
        y: { grid:{ color:'#F3F4F6' }, beginAtZero:true },
      },
    },
  };
  return canvas.renderToBuffer(config);
}

async function gerarGraficoPizza(totais) {
  const canvas = new ChartJSNodeCanvas({ width:420, height:320, backgroundColour:'#ffffff' });
  const config = {
    type: 'doughnut',
    data: {
      labels: ['Em Atendimento','Aguardando','Fechados'],
      datasets:[{ data:[totais.open, totais.pending, totais.closed], backgroundColor:['#16A34A','#F59E0B','#2563EB'], hoverOffset:6 }],
    },
    options: {
      plugins: { legend:{ position:'bottom' }, title:{ display:true, text:'Distribuição de Status', font:{ size:13, weight:'bold' } } },
      cutout:'55%',
    },
  };
  return canvas.renderToBuffer(config);
}

// ─── Processar dados brutos ────────────────────────────────────────────────────

function processarMes(resultados) {
  const diasMap = {};
  const agentesMap = {};

  resultados.forEach(emp => {
    (emp.ticketsRaw || []).forEach(t => {
      const dia = (t.createdAt||'').slice(0,10); if (!dia) return;
      if (!diasMap[dia]) diasMap[dia] = { total:0, open:0, pending:0, closed:0 };
      diasMap[dia].total++;
      const s = (t.status||'').toLowerCase();
      if (s==='open'||s==='groups') diasMap[dia].open++;
      else if (s==='pending')       diasMap[dia].pending++;
      else if (s==='closed')        diasMap[dia].closed++;

      const ag  = t.user?.name || 'Sem atendente';
      const key = `${ag}|||${emp.nome}`;
      if (!agentesMap[key]) agentesMap[key] = { nome:ag, empresa:emp.nome, total:0, open:0, pending:0, closed:0 };
      agentesMap[key].total++;
      if (s==='open'||s==='groups') agentesMap[key].open++;
      else if (s==='pending')       agentesMap[key].pending++;
      else if (s==='closed')        agentesMap[key].closed++;
    });
  });

  const EXCLUIR = ['sem atendente','gerencia','administrador','deskrio'];
  const dias    = Object.entries(diasMap).sort(([a],[b])=>a.localeCompare(b)).map(([dia,v])=>({dia,...v}));
  const agentes = Object.values(agentesMap)
                    .filter(a=>!EXCLUIR.some(ex=>a.nome.toLowerCase().includes(ex)))
                    .sort((a,b)=>b.open-a.open||b.total-a.total);
  const totais  = resultados.reduce((acc,r)=>({
    total:   acc.total   +(r.dados?.total   ||0),
    open:    acc.open    +(r.dados?.open    ||0),
    pending: acc.pending +(r.dados?.pending ||0),
    closed:  acc.closed  +(r.dados?.closed  ||0),
    contatos:acc.contatos+(r.contatosHoje   ||0),
  }), { total:0, open:0, pending:0, closed:0, contatos:0 });

  return { dias, agentes, totais, resultados };
}

// ─── Construir aba do mês ──────────────────────────────────────────────────────

async function construirAbaMes(wb, nomeMes, dados, geradoEm) {
  const { dias, agentes, totais, resultados } = dados;
  const ws = wb.addWorksheet(nomeMes, { properties:{ tabColor:{ argb:'F5A623' } } });
  ws.views = [{ showGridLines: false }];

  // ── Cabeçalho ─────────────────────────────────────────────────────────────────
  ws.mergeCells('A1:M1');
  const tc = ws.getCell('A1');
  tc.value='📅  '+nomeMes; tc.font=fnt(true,24,COR.branco); tc.fill=fill(COR.preto); tc.alignment=aL(); ws.getRow(1).height=48;

  ws.mergeCells('A2:M2');
  const sc=ws.getCell('A2');
  sc.value=`Atualizado em ${geradoEm}  ·  ${totais.total.toLocaleString('pt-BR')} tickets no período`;
  sc.font=fnt(false,10,'FF9CA3AF',true); sc.fill=fill('FF111827'); sc.alignment=aL(); ws.getRow(2).height=18;

  ws.addRow([]); ws.getRow(3).height=8;

  // ── KPI Cards ─────────────────────────────────────────────────────────────────
  const kpis=[
    {l:'Total Tickets',     v:totais.total,                     bg:'FF374151', tx:COR.branco},
    {l:'🟢 Em Atendimento', v:totais.open,                      bg:'FF166534', tx:COR.verdeClaro},
    {l:'🟡 Aguardando',     v:totais.pending,                   bg:'FF92400E', tx:COR.amareloClaro},
    {l:'✅ Fechados',       v:totais.closed,                    bg:'FF1D4ED8', tx:COR.azulClaro},
    {l:'% Fechamento',      v:pct(totais.closed,totais.total),  bg:'FF5B21B6', tx:COR.roxoClaro},
    {l:'➕ Novos Contatos', v:totais.contatos,                  bg:'FF0F766E', tx:'FFB2F5E6'},
  ];
  const lbRow=ws.addRow(kpis.map(k=>k.l)); lbRow.height=18;
  lbRow.eachCell((c,i)=>{ if(kpis[i-1]){c.fill=fill(kpis[i-1].bg);c.font=fnt(true,8,kpis[i-1].tx);c.alignment=aC();c.border=brd(kpis[i-1].bg);} });
  const vlRow=ws.addRow(kpis.map(k=>k.v)); vlRow.height=34;
  vlRow.eachCell((c,i)=>{ if(kpis[i-1]){c.fill=fill(kpis[i-1].bg);c.font=fnt(true,20,kpis[i-1].tx);c.alignment=aC();c.border=brd(kpis[i-1].bg);} });
  ws.addRow([]); ws.getRow(6).height=10;

  // ── Seção: Evolução Diária ────────────────────────────────────────────────────
  ws.mergeCells('A7:F7');
  const et=ws.getCell('A7'); et.value='📈  Evolução Diária';
  et.font=fnt(true,12); et.fill=fill(COR.laranja); et.alignment=aL(); ws.getRow(7).height=24;

  hdrRow(ws,[
    {h:'Data',a:aC()},{h:'Dia',a:aC()},{h:'Total',a:aC()},
    {h:'🟢 Atend.',a:aC()},{h:'🟡 Aguard.',a:aC()},{h:'✅ Fech.',a:aC()},
  ]);
  const evolStart = 9;
  dias.forEach((d,idx)=>{
    const rf=idx%2===0?COR.branco:COR.cinzaMed;
    dRow(ws,[fmtDia(d.dia),nomeDia(d.dia),d.total,d.open,d.pending,d.closed],
      [rf,rf,rf,COR.verdeClaro,COR.amareloClaro,COR.azulClaro],[aC(),aC(),aC(),aC(),aC(),aC()]);
  });
  const evolEnd = evolStart + dias.length - 1;
  totRow(ws,['TOTAL','', dias.reduce((s,d)=>s+d.total,0), dias.reduce((s,d)=>s+d.open,0), dias.reduce((s,d)=>s+d.pending,0), dias.reduce((s,d)=>s+d.closed,0)]);

  ws.addRow([]); ws.getRow(evolEnd+3).height=10;

  // ── Seção: Atendimentos por Atendente ─────────────────────────────────────────
  const agStart = evolEnd + 4;
  const agTitCell = ws.getCell(`A${agStart}`);
  ws.mergeCells(`A${agStart}:H${agStart}`);
  agTitCell.value='👤  Atendimentos por Atendente'; agTitCell.font=fnt(true,12);
  agTitCell.fill=fill(COR.laranja); agTitCell.alignment=aL(); ws.getRow(agStart).height=24;

  hdrRow(ws,[
    {h:'Atendente',a:aL()},{h:'Empresa',a:aL()},{h:'Total',a:aC()},
    {h:'🟢 Atend.',a:aC()},{h:'% At.',a:aC()},{h:'🟡 Aguard.',a:aC()},
    {h:'✅ Fech.',a:aC()},{h:'% Fech.',a:aC()},
  ]);
  const agDataStart = agStart + 2;
  agentes.forEach((a,idx)=>{
    const rf=idx%2===0?COR.branco:COR.cinzaMed;
    dRow(ws,[a.nome,a.empresa,a.total,a.open,pct(a.open,a.total),a.pending,a.closed,pct(a.closed,a.total)],
      [rf,rf,rf,COR.verdeClaro,COR.verdeClaro,COR.amareloClaro,COR.azulClaro,COR.azulClaro],
      [aL(),aL(),aC(),aC(),aC(),aC(),aC(),aC()]);
  });
  // Subtotais por empresa
  ws.addRow([]);
  resultados.forEach(r=>{
    const d=r.dados||{};
    totRow(ws,[`${r.nome} — TOTAL`,r.nome,d.total||0,d.open||0,pct(d.open,d.total),d.pending||0,d.closed||0,pct(d.closed,d.total)],
      [aL(),aL(),aC(),aC(),aC(),aC(),aC(),aC()]);
  });

  // ── Gráficos embutidos ────────────────────────────────────────────────────────
  console.log('  🎨 Gerando gráficos...');
  const [imgLinha, imgBarras, imgPizza] = await Promise.all([
    gerarGraficoLinha(dias),
    gerarGraficoBarras(agentes),
    gerarGraficoPizza(totais),
  ]);

  const addImg = (buf, col, row, w, h) => {
    const imgId = wb.addImage({ buffer: buf, extension:'png' });
    ws.addImage(imgId, { tl:{ col, row }, ext:{ width:w, height:h } });
  };

  // Gráfico de linha — ao lado da tabela diária (col H em diante)
  addImg(imgLinha,  7, 6,  900, 320);
  // Gráfico de pizza — ao lado dos KPIs
  addImg(imgPizza,  7, 3,  420, 200);
  // Gráfico de barras — ao lado da tabela de atendentes
  addImg(imgBarras, 8, agStart - 1, 900, 380);

  // ── Larguras ──────────────────────────────────────────────────────────────────
  ws.getColumn(1).width=28; ws.getColumn(2).width=16;
  [3,4,5,6,7,8].forEach(i=>{ ws.getColumn(i).width=13; });
  [9,10,11,12,13].forEach(i=>{ ws.getColumn(i).width=3; });
}

// ─── Atualizar planilha ────────────────────────────────────────────────────────

async function atualizarRelatorioMensal(mesIdx, anoNum) {
  const mesIdx0 = mesIdx ?? new Date().getMonth();
  const ano     = anoNum ?? new Date().getFullYear();
  const nomeMes = MESES[mesIdx0];

  const inicioDate = new Date(ano, mesIdx0, 1);
  const hoje = new Date(); hoje.setHours(23,59,59,999);
  const fimDate = new Date(Math.min(hoje.getTime(), new Date(ano, mesIdx0+1, 0, 23,59,59,999).getTime()));

  const fmt = d => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
  const inicioStr = fmt(inicioDate);
  const fimStr    = fmt(fimDate);

  console.log(`📊 Buscando ${nomeMes}/${ano} (${inicioStr} → ${fimStr})...`);
  const resultados = await monitorarDeskrioRange(inicioStr, fimStr);
  const dados      = processarMes(resultados);
  const geradoEm   = new Date().toLocaleString('pt-BR', { timeZone:'America/Sao_Paulo' });

  fs.mkdirSync(PASTA, { recursive:true });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'BR Pneus & Oficina'; wb.modified = new Date();

  // Carrega arquivo existente e copia as abas dos outros meses
  if (fs.existsSync(ARQUIVO)) {
    try {
      const wbOld = new ExcelJS.Workbook();
      await wbOld.xlsx.readFile(ARQUIVO);
      for (const wsOld of wbOld.worksheets) {
        if (wsOld.name !== nomeMes) {
          // Copia aba antiga intacta para o novo workbook
          const wsNew = wb.addWorksheet(wsOld.name, { properties: wsOld.properties });
          wsOld.eachRow({ includeEmpty:true }, (row, rn) => {
            const newRow = wsNew.getRow(rn);
            newRow.height = row.height;
            row.eachCell({ includeEmpty:true }, (cell, cn) => {
              const newCell = newRow.getCell(cn);
              newCell.value      = cell.value;
              newCell.style      = JSON.parse(JSON.stringify(cell.style));
            });
            newRow.commit();
          });
          wsNew.columns = wsOld.columns.map(c=>({ width: c.width }));
        }
      }
    } catch { /* arquivo corrompido — recria */ }
  }

  await construirAbaMes(wb, nomeMes, dados, geradoEm);

  // Ordena abas: meses em ordem cronológica
  const ordem = MESES.filter(m => wb.getWorksheet(m));
  ordem.forEach((nome, i) => {
    const ws = wb.getWorksheet(nome);
    if (ws) ws.orderNo = i;
  });

  await wb.xlsx.writeFile(ARQUIVO);
  console.log(`✅ ${nomeMes}/${ano} → ${ARQUIVO}`);
  return ARQUIVO;
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

if (require.main === module) {
  const [,, mesArg, anoArg] = process.argv;
  const mesIdx = mesArg ? parseInt(mesArg) - 1 : new Date().getMonth();
  const ano    = anoArg ? parseInt(anoArg)     : new Date().getFullYear();
  atualizarRelatorioMensal(mesIdx, ano).catch(e => { console.error('❌', e.message); process.exit(1); });
}

module.exports = { atualizarRelatorioMensal };
