'use strict';

require('dotenv').config();

const { google }  = require('googleapis');
const { monitorarDeskrioRange } = require('./monitor-deskrio');

// ─── Config ────────────────────────────────────────────────────────────────────

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '1so_-C0e_awN9vlXVueViIjgijNEYks7DIwkBbUPd0vw';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const EXCLUIR_AGENTES = ['sem atendente','gerencia','administrador','deskrio'];

const LOJA_MAP = {
  'Araraquara 🛞':          'Araraquara',
  'São Carlos 🛞':          'S. Carlos',
  'Americana 🛞':           'Americana',
  'Maringa 🛞':             'Maringá',
  'Peg Pneus - Araraquara': 'Peg ARQ',
  'Peg Pneus - Sorocaba':   'Peg SOR',
};
const LOJAS_ORDEM = ['Araraquara', 'S. Carlos', 'Americana', 'Maringá', 'Peg ARQ', 'Peg SOR'];

function extrairLoja(whatsappName) { return LOJA_MAP[whatsappName] || null; }

// ─── Auth ─────────────────────────────────────────────────────────────────────

function criarAuth() {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyPath) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY não encontrado no .env.\nDefina o caminho para o arquivo JSON da service account.');
  const key = JSON.parse(require('fs').readFileSync(keyPath, 'utf8'));
  return new google.auth.GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

// ─── Helpers de cor (hex → { red, green, blue }) ──────────────────────────────

function hexRgb(hex) {
  const h = hex.replace('#','');
  return { red: parseInt(h.slice(0,2),16)/255, green: parseInt(h.slice(2,4),16)/255, blue: parseInt(h.slice(4,6),16)/255 };
}

const C = {
  preto:        hexRgb('#1a1a1a'), cinzaEsc:    hexRgb('#374151'),
  cinzaMed:     hexRgb('#9ca3af'), cinzaClaro:  hexRgb('#f3f4f6'),
  branco:       hexRgb('#ffffff'),
  laranja:      hexRgb('#F5A623'), laranjaClaro:hexRgb('#FEF3C7'),
  verde:        hexRgb('#16a34a'), verdeClaro:  hexRgb('#d1fae5'),
  amarelo:      hexRgb('#f59e0b'), amareloClaro:hexRgb('#fef3c7'),
  azul:         hexRgb('#2563eb'), azulClaro:   hexRgb('#dbeafe'),
  roxo:         hexRgb('#7c3aed'), roxoClaro:   hexRgb('#ede9fe'),
  teal:         hexRgb('#0f766e'), tealClaro:   hexRgb('#ccfbf1'),
};

// ─── Requests de formatação ───────────────────────────────────────────────────

function cellFmt({ sheetId, row, col, rowSpan=1, colSpan=1, bg, fgColor, bold, italic, size, hAlign='LEFT', vAlign='MIDDLE', borders, wrap }) {
  const fmt = {};
  if (bg)     fmt.backgroundColor = bg;
  if (fgColor || bold !== undefined || italic !== undefined || size) {
    fmt.textFormat = {};
    if (fgColor)           fmt.textFormat.foregroundColor = fgColor;
    if (bold !== undefined) fmt.textFormat.bold   = bold;
    if (italic)             fmt.textFormat.italic = italic;
    if (size)               fmt.textFormat.fontSize = size;
  }
  if (hAlign) fmt.horizontalAlignment = hAlign;
  if (vAlign) fmt.verticalAlignment   = vAlign;
  if (wrap)   fmt.wrapStrategy = 'WRAP';
  if (borders) fmt.borders = borders;

  return {
    repeatCell: {
      range: { sheetId, startRowIndex: row, endRowIndex: row+rowSpan, startColumnIndex: col, endColumnIndex: col+colSpan },
      cell: { userEnteredFormat: fmt },
      fields: 'userEnteredFormat(' + [
        bg?'backgroundColor':'',
        (fgColor||bold!==undefined||italic||size)?'textFormat':'',
        hAlign?'horizontalAlignment':'',
        vAlign?'verticalAlignment':'',
        wrap?'wrapStrategy':'',
        borders?'borders':'',
      ].filter(Boolean).join(',') + ')',
    },
  };
}

function mergeCells(sheetId, r1, c1, r2, c2) {
  return { mergeCells: { range:{ sheetId, startRowIndex:r1, endRowIndex:r2, startColumnIndex:c1, endColumnIndex:c2 }, mergeType:'MERGE_ALL' } };
}

function rowHeight(sheetId, startIndex, endIndex, heightPx) {
  return { updateDimensionProperties: { range:{ sheetId, dimension:'ROWS', startIndex, endIndex }, properties:{ pixelSize: heightPx }, fields:'pixelSize' } };
}

function colWidth(sheetId, startIndex, endIndex, widthPx) {
  return { updateDimensionProperties: { range:{ sheetId, dimension:'COLUMNS', startIndex, endIndex }, properties:{ pixelSize: widthPx }, fields:'pixelSize' } };
}

function brdAll(color=C.cinzaClaro) {
  const s = { style:'SOLID', color };
  return { top:s, bottom:s, left:s, right:s };
}

function brdBottom(color, width=1) {
  return { bottom:{ style:'SOLID', width, color } };
}

// ─── Helpers de dados ─────────────────────────────────────────────────────────

const pct = (v,t) => t ? `${(v/t*100).toFixed(1)}%` : '—';

function fmtDataHora(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { timeZone:'America/Sao_Paulo', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function fmtDia(iso) { const [,m,d]=iso.split('-'); return `${d}/${m}`; }
function nomeDia(iso) { return ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][new Date(iso+'T12:00:00Z').getUTCDay()]; }

function fmtEspera(s) {
  if (!s) return '—';
  const n = parseInt(s);
  if (n < 60)   return `${n}s`;
  if (n < 3600) return `${Math.floor(n/60)}min`;
  return `${Math.floor(n/3600)}h ${Math.floor((n%3600)/60)}min`;
}

function statusLabel(s) {
  const map = { open:'Em Atendimento', pending:'Aguardando', closed:'Fechado', groups:'Grupo' };
  return map[(s||'').toLowerCase()] || s || '—';
}

// ─── Processar dados ──────────────────────────────────────────────────────────

function processarDados(resultados, dataInicio, dataFim) {
  const diasMap = {};
  const diasPorLoja = {}; // { 'Araraquara': { 'YYYY-MM-DD': { tickets:0, contatos: Set<id> } } }
  const agentesMap = {};
  const origemPorEmpresa = {}; // { 'BR Pneus': { receptivo:0, ativo:0, contatosUnicos:0 }, ... }

  // Limites em string YYYY-MM-DD para evitar bug de fuso horário no dia 1 do mês
  const inicioISO = dataInicio ? `${dataInicio.getFullYear()}-${String(dataInicio.getMonth()+1).padStart(2,'0')}-${String(dataInicio.getDate()).padStart(2,'0')}` : null;
  const fimISO    = dataFim    ? `${dataFim.getFullYear()}-${String(dataFim.getMonth()+1).padStart(2,'0')}-${String(dataFim.getDate()).padStart(2,'0')}` : null;

  resultados.forEach(emp => {
    if (!origemPorEmpresa[emp.nome]) origemPorEmpresa[emp.nome] = { receptivo:0, ativo:0, contatosUnicos:0 };

    // Contatos únicos derivados dos próprios tickets
    const contatosUnicosSet = new Set();
    const isPeg = emp.nome === 'Peg Pneus';
    const tickets = emp.ticketsRaw || [];

    tickets.forEach(t => {
      const dia = (t.createdAt||'').slice(0,10); if (!dia) return;
      if (!diasMap[dia]) diasMap[dia] = { total:0, open:0, pending:0, closed:0, contatos:0 };
      diasMap[dia].total++;

      // Agrupa por loja via whatsapp.name
      const loja = extrairLoja(t.whatsapp?.name);
      if (loja) {
        if (!diasPorLoja[loja]) diasPorLoja[loja] = {};
        if (!diasPorLoja[loja][dia]) diasPorLoja[loja][dia] = { tickets:0, ativos:0, contatos: new Set() };
        diasPorLoja[loja][dia].tickets++;
        // Novo contato = contact.createdAt no mesmo dia do ticket
        const cDia = (t.contact?.createdAt||'').slice(0,10);
        if (cDia === dia && t.contactId) diasPorLoja[loja][dia].contatos.add(t.contactId);
      }

      let s = (t.status||'').toLowerCase();
      // Peg Pneus: se ticket está pending mas tem atendente atribuído,
      // o atendente já respondeu — conta como atendendo, não aguardando
      const temAtendente = !!(t.user?.name) && !EXCLUIR_AGENTES.some(ex => (t.user.name||'').toLowerCase().includes(ex));
      if (isPeg && s === 'pending' && temAtendente) s = 'open';

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

      // Contagem receptivos (ativos contados via ativosRaw abaixo)
      const orig = (t.origin||'').toLowerCase();
      if (!orig.includes('ativo') && orig !== 'active') origemPorEmpresa[emp.nome].receptivo++;

      // Contato único: usa id ou número como chave
      const cId = t.contact?.id || t.contact?.number;
      if (cId) contatosUnicosSet.add(String(cId));
    });

    origemPorEmpresa[emp.nome].contatosUnicos = contatosUnicosSet.size;

    // Ativos por loja/dia — filtra client-side pelo campo origin
    (emp.ativosRaw || []).forEach(t => {
      const orig = (t.origin||'').toLowerCase();
      if (!orig.includes('ativo') && orig !== 'active') return;
      const dia = (t.createdAt||'').slice(0,10); if (!dia) return;
      if (inicioISO && dia < inicioISO) return;
      if (fimISO    && dia > fimISO)    return;
      const loja = extrairLoja(t.whatsapp?.name);
      if (loja) {
        if (!diasPorLoja[loja]) diasPorLoja[loja] = {};
        if (!diasPorLoja[loja][dia]) diasPorLoja[loja][dia] = { tickets:0, ativos:0, contatos: new Set() };
        diasPorLoja[loja][dia].ativos++;
        origemPorEmpresa[emp.nome].ativo++;
      }
    });

    // Contatos por dia (para evolução diária) — filtrar pelo intervalo do mês
    (emp.contatosRaw || []).forEach(c => {
      const dia = (c.createdAt||'').slice(0,10); if (!dia) return;
      if (inicioISO && dia < inicioISO) return;
      if (fimISO    && dia > fimISO)    return;
      if (!diasMap[dia]) diasMap[dia] = { total:0, open:0, pending:0, closed:0, contatos:0 };
      diasMap[dia].contatos++;
    });
  });

  // Converte Sets de contactId em contagens
  for (const loja of Object.keys(diasPorLoja)) {
    for (const dia of Object.keys(diasPorLoja[loja])) {
      const d = diasPorLoja[loja][dia];
      diasPorLoja[loja][dia] = { tickets: d.tickets, ativos: d.ativos, contatos: d.contatos.size };
    }
  }

  const dias    = Object.entries(diasMap).sort(([a],[b])=>a.localeCompare(b)).map(([dia,v])=>({dia,...v}));
  const agentes = Object.values(agentesMap)
    .filter(a => !EXCLUIR_AGENTES.some(ex=>a.nome.toLowerCase().includes(ex)))
    .sort((a,b)=>b.open-a.open||b.total-a.total);
  const totais = Object.values(diasMap).reduce((acc,d) => ({
    total:   acc.total   + d.total,
    open:    acc.open    + d.open,
    pending: acc.pending + d.pending,
    closed:  acc.closed  + d.closed,
    contatos:acc.contatos+ d.contatos,
  }), { total:0, open:0, pending:0, closed:0, contatos:0 });

  return { dias, agentes, totais, origemPorEmpresa, diasPorLoja };
}

// ─── Gerenciar abas ───────────────────────────────────────────────────────────

async function garantirAba(sheets, nome, tabColor, linhas = 5000) {
  const { data } = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID, fields:'sheets.properties' });
  const existe = data.sheets.find(s => s.properties.title === nome);
  if (existe) {
    // Expande grid se necessário
    const props = existe.properties;
    if ((props.gridProperties?.rowCount || 0) < linhas) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: [{ updateSheetProperties: {
          properties: { sheetId: props.sheetId, gridProperties: { rowCount: linhas, columnCount: 35 } },
          fields: 'gridProperties.rowCount,gridProperties.columnCount',
        }}]},
      });
    }
    return props.sheetId;
  }

  const res = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests: [{ addSheet: { properties: {
      title: nome,
      tabColor: tabColor || C.laranja,
      gridProperties: { rowCount: linhas, columnCount: 35 },
    }}}]},
  });
  return res.data.replies[0].addSheet.properties.sheetId;
}

async function limparAba(sheets, sheetId, nome) {
  await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: `'${nome}'` });
  // Remove merges e zera toda formatação (evita cores antigas persistindo entre execuções)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests: [
      { unmergeCells: { range: { sheetId, startRowIndex:0, endRowIndex:2000, startColumnIndex:0, endColumnIndex:35 } } },
      { repeatCell: {
        range: { sheetId, startRowIndex:0, endRowIndex:500, startColumnIndex:0, endColumnIndex:35 },
        cell: { userEnteredFormat: {
          backgroundColor: { red:1, green:1, blue:1 },
          textFormat: { bold:false, foregroundColor:{ red:0.1, green:0.1, blue:0.1 } },
        }},
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      }},
    ]},
  }).catch(()=>{});
}

// ─── Construir aba RESUMO DO MÊS ─────────────────────────────────────────────

async function atualizarAbaResumo(sheets, sheetId, nomeMes, dados, geradoEm, resultados, mesIdx, ano) {
  const { agentes, totais, origemPorEmpresa, diasPorLoja } = dados;
  const hojeISO = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const dias = dados.dias.filter(d => {
    const [y, m] = d.dia.split('-').map(Number);
    return y === ano && m === mesIdx + 1 && d.dia <= hojeISO;
  });
  const values = [];
  const fmts   = [];

  // Largura total da tabela de lojas (Data + Dia + 8×3 + 3 totais = 29)
  const NL_KPI = 8;
  const TC = 2 + NL_KPI * 3 + 3;

  // addRow: push linha e retorna índice 0-based garantido (sem contador manual)
  const addRow = (cells, h) => {
    const i = values.length;
    values.push(cells);
    if (h) fmts.push(rowHeight(sheetId, i, i+1, h));
    return i;
  };

  // ── Título (largura total TC)
  { const i = addRow([`📅 ${nomeMes}`, ...Array(TC-1).fill('')], 55);
    fmts.push(mergeCells(sheetId, i, 0, i+1, TC));
    fmts.push(cellFmt({ sheetId, row:i, col:0, rowSpan:1, colSpan:TC,
      bg:C.preto, fgColor:C.branco, bold:true, size:26, hAlign:'LEFT' })); }

  { const i = addRow([`Atualizado em ${geradoEm}  ·  ${totais.total.toLocaleString('pt-BR')} tickets  ·  ${totais.contatos.toLocaleString('pt-BR')} novos contatos`, ...Array(TC-1).fill('')], 24);
    fmts.push(mergeCells(sheetId, i, 0, i+1, TC));
    fmts.push(cellFmt({ sheetId, row:i, col:0, rowSpan:1, colSpan:TC,
      bg:C.cinzaEsc, fgColor:C.cinzaMed, italic:true, size:10, hAlign:'LEFT' })); }

  addRow([...Array(TC).fill('')], 10);

  // ── KPI Cards — 4 cards cada empresa, distribuídos em TC colunas
  const brRes  = resultados.find(x=>x.nome==='BR Pneus')  || {};
  const pegRes = resultados.find(x=>x.nome==='Peg Pneus') || {};
  const brD    = brRes.dados  || {};
  const pegD   = pegRes.dados || {};
  const brOrig  = origemPorEmpresa['BR Pneus']  || { receptivo:0, ativo:0, contatosUnicos:0 };
  const pegOrig = origemPorEmpresa['Peg Pneus'] || { receptivo:0, ativo:0, contatosUnicos:0 };

  const C_BR  = hexRgb('#1B2A4A');
  const C_PEG = hexRgb('#3b0764');

  // Divide TC em 4 faixas iguais para os cards
  const NC    = 4;
  const base  = Math.floor(TC / NC);          // 7
  const extra = TC - base * NC;               // resto vai pro último card
  const kpiCols  = Array.from({length: NC}, (_, i) => i * base);
  const kpiSpans = Array.from({length: NC}, (_, i) => i === NC-1 ? base + extra : base);

  const renderKpiBlock = (kpis, headerLabel, headerBg) => {
    // Header: título da empresa
    const i0 = addRow([headerLabel, ...Array(TC-1).fill('')], 34);
    fmts.push(mergeCells(sheetId, i0, 0, i0+1, TC));
    fmts.push(cellFmt({ sheetId, row:i0, col:0, rowSpan:1, colSpan:TC,
      bg:headerBg, fgColor:C.branco, bold:true, size:13, hAlign:'LEFT' }));

    // Linha de labels
    const rowL = Array(TC).fill('');
    kpis.forEach((k, idx) => { rowL[kpiCols[idx]] = k.l; });
    const iL = addRow(rowL, 28);

    // Linha de valores (números grandes)
    const rowV = Array(TC).fill('');
    kpis.forEach((k, idx) => { rowV[kpiCols[idx]] = String(k.v); });
    const iV = addRow(rowV, 70);

    kpis.forEach((k, idx) => {
      const c  = kpiCols[idx];
      const sp = kpiSpans[idx];
      fmts.push(mergeCells(sheetId, iL, c, iL+1, c+sp));
      fmts.push(mergeCells(sheetId, iV, c, iV+1, c+sp));
      fmts.push(cellFmt({ sheetId, row:iL, col:c, rowSpan:1, colSpan:sp,
        bg:k.bg, fgColor:k.tx, bold:true, size:10, hAlign:'CENTER', vAlign:'BOTTOM' }));
      fmts.push(cellFmt({ sheetId, row:iV, col:c, rowSpan:1, colSpan:sp,
        bg:k.bg, fgColor:k.tx, bold:true, size:38, hAlign:'CENTER', vAlign:'MIDDLE' }));
    });
  };

  renderKpiBlock([
    { l:'📋 Total Tickets',   v: (brD.total||0).toLocaleString('pt-BR'),              bg:C.cinzaEsc,        tx:C.branco },
    { l:'📥 Receptivos',      v: (brOrig.receptivo||0).toLocaleString('pt-BR'),       bg:hexRgb('#1e4d8c'), tx:C.branco },
    { l:'📤 Ativos',          v: (brOrig.ativo||0).toLocaleString('pt-BR'),           bg:hexRgb('#155724'), tx:C.branco },
    { l:'➕ Novos Contatos',  v: (brOrig.contatosUnicos||0).toLocaleString('pt-BR'),  bg:C.teal,            tx:C.branco },
  ], '🔵  BR PNEUS', C_BR);

  addRow([...Array(TC).fill('')], 10);

  renderKpiBlock([
    { l:'📋 Total Tickets',   v: (pegD.total||0).toLocaleString('pt-BR'),             bg:C.cinzaEsc,        tx:C.branco },
    { l:'📥 Receptivos',      v: (pegOrig.receptivo||0).toLocaleString('pt-BR'),      bg:hexRgb('#1e4d8c'), tx:C.branco },
    { l:'📤 Ativos',          v: (pegOrig.ativo||0).toLocaleString('pt-BR'),          bg:hexRgb('#155724'), tx:C.branco },
    { l:'➕ Novos Contatos',  v: (pegOrig.contatosUnicos||0).toLocaleString('pt-BR'), bg:C.teal,            tx:C.branco },
  ], '🟣  PEG PNEUS', C_PEG);

  addRow([...Array(TC).fill('')], 14);

  // ── Tickets, Ativos e Novos Contatos por Loja — Por Dia
  { const NL = LOJAS_ORDEM.length;       // 8 lojas
    // TC já definido acima (mesmo valor: 2 + NL*3 + 3)
    // [cor do cabeçalho (escura), cor dos dados (pastel)] — uniforme nas 3 sub-colunas
    const LOJA_COLORS = [
      { hdr: hexRgb('#1e3a5f'), dat: hexRgb('#dbeafe') },  // Araraquara — azul
      { hdr: hexRgb('#14532d'), dat: hexRgb('#dcfce7') },  // S. Carlos  — verde
      { hdr: hexRgb('#134e4a'), dat: hexRgb('#ccfbf1') },  // Americana  — teal
      { hdr: hexRgb('#7c2d12'), dat: hexRgb('#ffedd5') },  // Maringá    — laranja
      { hdr: hexRgb('#075985'), dat: hexRgb('#e0f2fe') },  // Peg ARQ    — céu
      { hdr: hexRgb('#881337'), dat: hexRgb('#ffe4e6') },  // Peg SOR    — rosa
    ];

    { const i = addRow(['📊 TICKETS, ATIVOS E NOVOS CONTATOS POR LOJA — POR DIA', ...Array(TC-1).fill('')], 30);
      fmts.push(mergeCells(sheetId, i, 0, i+1, TC));
      fmts.push(cellFmt({ sheetId, row:i, col:0, rowSpan:1, colSpan:TC,
        bg:C.laranja, fgColor:C.preto, bold:true, size:12, hAlign:'LEFT' })); }

    // Linha 1: nome de cada loja (abrange 3 cols: Tk + Ativ + NC)
    let startRowTabela, endRowTabela;
    { const row1 = ['', '', ...LOJAS_ORDEM.flatMap(l => [l, '', '']), 'Total', '', ''];
      const i = addRow(row1, 22);
      startRowTabela = i;
      fmts.push(cellFmt({ sheetId, row:i, col:0, rowSpan:1, colSpan:2,
        bg:C.preto, fgColor:C.branco, bold:true, size:9, hAlign:'CENTER' }));
      LOJAS_ORDEM.forEach((lj, li) => {
        const c = 2 + li * 3;
        fmts.push(mergeCells(sheetId, i, c, i+1, c+3));
        fmts.push(cellFmt({ sheetId, row:i, col:c, rowSpan:1, colSpan:3,
          bg:LOJA_COLORS[li].hdr, fgColor:C.branco, bold:true, size:9, hAlign:'CENTER' }));
      });
      fmts.push(mergeCells(sheetId, i, 2+NL*3, i+1, 2+NL*3+3));
      fmts.push(cellFmt({ sheetId, row:i, col:2+NL*3, rowSpan:1, colSpan:3,
        bg:C.laranja, fgColor:C.preto, bold:true, size:9, hAlign:'CENTER' }));
    }

    // Linha 2: Tk | Ativ | NC por loja
    { const row2 = ['Data', 'Dia', ...LOJAS_ORDEM.flatMap(() => ['Tk', 'Ativ', 'NC']), 'Tk', 'Ativ', 'NC'];
      const i = addRow(row2, 20);
      fmts.push(cellFmt({ sheetId, row:i, col:0, rowSpan:1, colSpan:2,
        bg:C.preto, fgColor:C.branco, bold:true, size:9, hAlign:'CENTER' }));
      LOJAS_ORDEM.forEach((_, li) => {
        const c = 2 + li * 3;
        [0,1,2].forEach(off => fmts.push(cellFmt({ sheetId, row:i, col:c+off,
          bg:LOJA_COLORS[li].dat, fgColor:C.preto, bold:true, size:9, hAlign:'CENTER' })));
      });
      [0,1,2].forEach(off => fmts.push(cellFmt({ sheetId, row:i, col:2+NL*3+off,
        bg:C.laranja, fgColor:C.preto, bold:true, size:9, hAlign:'CENTER' })));
    }

    // Totalizadores
    const totTk = {}; const totAv = {}; const totNC = {};
    LOJAS_ORDEM.forEach(l => { totTk[l] = 0; totAv[l] = 0; totNC[l] = 0; });

    dias.forEach((d, idx) => {
      const bg = idx % 2 === 0 ? C.branco : C.cinzaClaro;
      let rowTk = 0, rowAv = 0, rowNC = 0;
      const vals = LOJAS_ORDEM.flatMap(l => {
        const ld = diasPorLoja?.[l]?.[d.dia] || { tickets:0, ativos:0, contatos:0 };
        totTk[l] += ld.tickets; totAv[l] += ld.ativos; totNC[l] += ld.contatos;
        rowTk += ld.tickets;    rowAv += ld.ativos;     rowNC += ld.contatos;
        return [ld.tickets, ld.ativos, ld.contatos];
      });
      const i = addRow([fmtDia(d.dia), nomeDia(d.dia), ...vals, rowTk, rowAv, rowNC], 20);
      fmts.push(cellFmt({ sheetId, row:i, col:0, bg, size:9, hAlign:'CENTER' }));
      fmts.push(cellFmt({ sheetId, row:i, col:1, bg, size:9, hAlign:'CENTER' }));
      LOJAS_ORDEM.forEach((_, li) => {
        const c = 2 + li * 3;
        [0,1,2].forEach(off => fmts.push(cellFmt({ sheetId, row:i, col:c+off,
          bg:LOJA_COLORS[li].dat, size:9, hAlign:'CENTER' })));
      });
      [0,1,2].forEach(off => fmts.push(cellFmt({ sheetId, row:i, col:2+NL*3+off,
        bg:C.laranja, fgColor:C.preto, bold:true, size:9, hAlign:'CENTER' })));
    });

    // Linha de total
    { const totVals = LOJAS_ORDEM.flatMap(l => [totTk[l], totAv[l], totNC[l]]);
      const i = addRow(['TOTAL', '', ...totVals,
        LOJAS_ORDEM.reduce((s,l)=>s+totTk[l],0),
        LOJAS_ORDEM.reduce((s,l)=>s+totAv[l],0),
        LOJAS_ORDEM.reduce((s,l)=>s+totNC[l],0)], 22);
      fmts.push(cellFmt({ sheetId, row:i, col:0, rowSpan:1, colSpan:TC,
        bg:C.laranja, fgColor:C.preto, bold:true, size:10, hAlign:'CENTER' }));
      endRowTabela = i + 1;
    }

    // Bordas de separação entre lojas
    const bordaSep  = { style: 'SOLID_MEDIUM', color: hexRgb('#374151') };
    const colsSep   = [2, ...LOJAS_ORDEM.map((_, li) => 2 + li * 3), 2 + NL * 3];
    // 1) Limpar borda esquerda em toda a altura (garante cells vazias sem borda explícita)
    colsSep.forEach(c => {
      fmts.push({
        repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 500, startColumnIndex: c, endColumnIndex: c + 1 },
          cell: { userEnteredFormat: { borders: { left: { style: 'NONE' } } } },
          fields: 'userEnteredFormat(borders.left)',
        },
      });
    });
    // 2) Aplicar SOLID_MEDIUM só dentro do range da tabela
    colsSep.forEach(c => {
      fmts.push({
        repeatCell: {
          range: { sheetId, startRowIndex: startRowTabela, endRowIndex: endRowTabela, startColumnIndex: c, endColumnIndex: c + 1 },
          cell: { userEnteredFormat: { borders: { left: bordaSep } } },
          fields: 'userEnteredFormat(borders.left)',
        },
      });
    });
  }

  // ── Escrever valores
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${nomeMes}'!A1`,
    valueInputOption: 'RAW',
    requestBody: { values },
  });

  // ── Larguras: col 0 (nome/data), col 1 (dia), cols 2+ (métricas)
  fmts.push(colWidth(sheetId, 0, 1, 150));
  fmts.push(colWidth(sheetId, 1, 2,  40));
  fmts.push(colWidth(sheetId, 2, 32, 50));

  fmts.push({ updateSheetProperties: {
    properties: { sheetId, gridProperties: { rowCount: values.length + 3 } },
    fields: 'gridProperties.rowCount',
  }});

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests: fmts },
  });

  // Remove gráficos existentes (se houver de execuções anteriores)
  await removerGraficos(sheets, sheetId, nomeMes);
}

// Usa values.length como âncora — índices de formatação sempre corretos sem offset manual
function escreverSecaoEmpresa(values, fmts, sheetId, resultado, titulo) {
  if (!resultado) return;
  const d = resultado.dados || {};

  const addRow = (cells, h) => {
    const i = values.length;
    values.push(cells);
    if (h) fmts.push(rowHeight(sheetId, i, i+1, h));
    return i;
  };

  { const i = addRow([`🏢 ${titulo.toUpperCase()}`], 30);
    fmts.push(cellFmt({ sheetId, row:i, col:0, rowSpan:1, colSpan:8,
      bg:C.cinzaEsc, fgColor:C.branco, bold:true, size:12, hAlign:'LEFT' })); }

  const kpis2 = [
    { l:'Total',      v: d.total||0,   bg:C.cinzaEsc, tx:C.branco },
    { l:'🟢 Atend.',  v: d.open||0,    bg:C.verde,    tx:C.branco },
    { l:'🟡 Aguard.', v: d.pending||0, bg:C.amarelo,  tx:C.preto  },
    { l:'✅ Fech.',   v: d.closed||0,  bg:C.azul,     tx:C.branco },
  ];
  { // Layout: Total=colA(1col), Atend=cols B-C(2col), Aguard=cols D-E(2col), Fech=cols F-G(2col), H=vazio
    const cols   = [0,  1,  3,  5];  // startCol de cada card
    const spans  = [1,  2,  2,  2];  // largura em colunas
    const rowL = Array(8).fill('');
    const rowV = Array(8).fill('');
    kpis2.forEach((k, idx) => { rowL[cols[idx]] = k.l; rowV[cols[idx]] = String(k.v); });
    const iL = addRow(rowL, 22);
    const iV = addRow(rowV, 36);
    kpis2.forEach((k, idx) => {
      const c  = cols[idx];
      const sp = spans[idx];
      if (sp > 1) {
        fmts.push(mergeCells(sheetId, iL, c, iL+1, c+sp));
        fmts.push(mergeCells(sheetId, iV, c, iV+1, c+sp));
      }
      fmts.push(cellFmt({ sheetId, row:iL, col:c, rowSpan:1, colSpan:sp, bg:k.bg, fgColor:k.tx, bold:true, size:9,  hAlign:'CENTER', vAlign:'MIDDLE' }));
      fmts.push(cellFmt({ sheetId, row:iV, col:c, rowSpan:1, colSpan:sp, bg:k.bg, fgColor:k.tx, bold:true, size:18, hAlign:'CENTER', vAlign:'MIDDLE' }));
    }); }

  const hdrs = ['Atendente','Total','🟢 Atend.','% At.','🟡 Aguard.','% Aguard.','✅ Fech.'];
  { const i = addRow(hdrs, 26);
    fmts.push(cellFmt({ sheetId, row:i, col:0, rowSpan:1, colSpan:hdrs.length,
      bg:C.preto, fgColor:C.branco, bold:true, size:10, hAlign:'CENTER' })); }

  const filtrados = (d.agentes||[]).filter(a => !EXCLUIR_AGENTES.some(ex=>a.nome.toLowerCase().includes(ex)));
  filtrados.forEach((a, idx) => {
    const bg = idx % 2 === 0 ? C.branco : C.cinzaClaro;
    const i = addRow([a.nome, a.total, a.open, pct(a.open,a.total),
                      a.pending, pct(a.pending,a.total), a.closed], 20);
    fmts.push(cellFmt({ sheetId, row:i, col:0, bg, size:10, hAlign:'LEFT' }));
    [[1,bg],[2,C.verdeClaro],[3,C.verdeClaro],[4,C.amareloClaro],[5,C.amareloClaro],[6,C.azulClaro]].forEach(([c,f]) =>
      fmts.push(cellFmt({ sheetId, row:i, col:c, bg:f, size:10, hAlign:'CENTER' })));
  });
}

// ─── Remover gráficos existentes ─────────────────────────────────────────────

async function removerGraficos(sheets, sheetId, nomeMes) {
  const { data } = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetInfo = data.sheets.find(s=>s.properties.title===nomeMes);
  if (!sheetInfo) return;
  const existingCharts = sheetInfo.charts || [];
  if (!existingCharts.length) return;
  const deleteReqs = existingCharts.map(c=>({ deleteEmbeddedObject:{ objectId: c.chartId } }));
  await sheets.spreadsheets.batchUpdate({ spreadsheetId: SPREADSHEET_ID, requestBody:{ requests: deleteReqs } });
}

// ─── Construir aba de tickets ─────────────────────────────────────────────────

async function atualizarAbaTickets(sheets, sheetId, nomeAba, resultados) {
  const totalRows = resultados.reduce((s,r)=>s+(r.ticketsRaw||[]).length,0);

  // ── 1. Valores ────────────────────────────────────────────────────────────────
  const values = [['ID','Empresa','Atendente','Contato','Número','Status','Origem','Criado em','Fechado em','T. Espera']];
  resultados.forEach(emp => {
    (emp.ticketsRaw||[]).forEach(t => {
      values.push([
        t.id, emp.nome,
        t.user?.name || '—',
        t.contact?.name || '—',
        t.contact?.number || '—',
        statusLabel(t.status),
        t.origin || '—',
        fmtDataHora(t.createdAt),
        fmtDataHora(t.closedAt),
        fmtEspera(t.waitTime),
      ]);
    });
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${nomeAba}'!A1`,
    valueInputOption: 'RAW',
    requestBody: { values },
  });

  // ── 2. Formatação em blocos (sem per-cell) ────────────────────────────────────
  const endRow = totalRows + 1;
  const reqs = [];

  // Fonte padrão de todas as células de dados
  reqs.push({ repeatCell: {
    range: { sheetId, startRowIndex:1, endRowIndex:endRow, startColumnIndex:0, endColumnIndex:10 },
    cell: { userEnteredFormat: {
      textFormat: { fontSize:9, bold:false, foregroundColor:C.preto },
      verticalAlignment:'MIDDLE', wrapStrategy:'CLIP',
      borders: { top:brdThin(), bottom:brdThin(), left:brdThin(), right:brdThin() },
    }},
    fields: 'userEnteredFormat(textFormat,verticalAlignment,wrapStrategy,borders)',
  }});

  // Linhas pares — fundo branco (cols 0-4 e 6-9)
  reqs.push({ repeatCell: {
    range: { sheetId, startRowIndex:1, endRowIndex:endRow, startColumnIndex:0, endColumnIndex:5 },
    cell: { userEnteredFormat: { backgroundColor: C.branco, horizontalAlignment:'LEFT' } },
    fields: 'userEnteredFormat(backgroundColor,horizontalAlignment)',
  }});
  reqs.push({ repeatCell: {
    range: { sheetId, startRowIndex:1, endRowIndex:endRow, startColumnIndex:6, endColumnIndex:10 },
    cell: { userEnteredFormat: { backgroundColor: C.branco, horizontalAlignment:'CENTER' } },
    fields: 'userEnteredFormat(backgroundColor,horizontalAlignment)',
  }});

  // Header — linha 0
  reqs.push({ repeatCell: {
    range: { sheetId, startRowIndex:0, endRowIndex:1, startColumnIndex:0, endColumnIndex:10 },
    cell: { userEnteredFormat: {
      backgroundColor: C.preto,
      textFormat: { fontSize:10, bold:true, foregroundColor:C.branco },
      horizontalAlignment:'CENTER', verticalAlignment:'MIDDLE',
      borders: { top:brdThin(C.preto), bottom:brdThin(C.preto), left:brdThin(C.preto), right:brdThin(C.preto) },
    }},
    fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,borders)',
  }});

  // Status column centralizado
  reqs.push({ repeatCell: {
    range: { sheetId, startRowIndex:1, endRowIndex:endRow, startColumnIndex:5, endColumnIndex:6 },
    cell: { userEnteredFormat: { horizontalAlignment:'CENTER', textFormat:{ bold:true, fontSize:9 } } },
    fields: 'userEnteredFormat(horizontalAlignment,textFormat)',
  }});

  // Formatação condicional de status (eficiente — sem per-row)
  const condFmt = [
    { text:'Em Atendimento', bg: C.verdeClaro,   fg: C.verde   },
    { text:'Aguardando',     bg: C.amareloClaro, fg: C.amarelo },
    { text:'Fechado',        bg: C.azulClaro,    fg: C.azul    },
    { text:'Grupo',          bg: C.roxoClaro,    fg: C.roxo    },
  ];
  condFmt.forEach(({ text, bg, fg }, idx) => {
    reqs.push({ addConditionalFormatRule: {
      rule: {
        ranges: [{ sheetId, startRowIndex:1, endRowIndex:endRow, startColumnIndex:5, endColumnIndex:6 }],
        booleanRule: {
          condition: { type:'TEXT_EQ', values:[{ userEnteredValue: text }] },
          format: { backgroundColor: bg, textFormat:{ foregroundColor: fg, bold:true } },
        },
      },
      index: idx,
    }});
  });

  // Larguras
  reqs.push(colWidth(sheetId, 0, 1,  70));  // ID
  reqs.push(colWidth(sheetId, 1, 2, 110));  // Empresa
  reqs.push(colWidth(sheetId, 2, 3, 200));  // Atendente
  reqs.push(colWidth(sheetId, 3, 4, 180));  // Contato
  reqs.push(colWidth(sheetId, 4, 5, 130));  // Número
  reqs.push(colWidth(sheetId, 5, 6, 140));  // Status
  reqs.push(colWidth(sheetId, 6, 7, 110));  // Origem
  reqs.push(colWidth(sheetId, 7, 8, 150));  // Criado em
  reqs.push(colWidth(sheetId, 8, 9, 150));  // Fechado em
  reqs.push(colWidth(sheetId, 9,10,  90));  // T. Espera
  reqs.push(rowHeight(sheetId, 0, 1, 32));
  reqs.push(rowHeight(sheetId, 1, endRow, 20));

  // Freeze + filtro
  reqs.push({ updateSheetProperties: { properties:{ sheetId, gridProperties:{ frozenRowCount:1 } }, fields:'gridProperties.frozenRowCount' } });
  reqs.push({ setBasicFilter: { filter: { range:{ sheetId, startRowIndex:0, endRowIndex:endRow, startColumnIndex:0, endColumnIndex:10 } } } });

  await sheets.spreadsheets.batchUpdate({ spreadsheetId: SPREADSHEET_ID, requestBody:{ requests: reqs } });
}

// helper border fino
function brdThin(color = hexRgb('#d1d5db')) { return { style:'SOLID', color }; }

// ─── Orquestrador principal ────────────────────────────────────────────────────

async function atualizarRelatorioMensal(mesIdx, anoNum) {
  const auth    = criarAuth();
  const sheets  = google.sheets({ version:'v4', auth });

  const mesIdx0 = mesIdx ?? new Date().getMonth();
  const ano     = anoNum ?? new Date().getFullYear();
  const nomeMes = `${MESES[mesIdx0]} ${ano}`;
  const inicioDate = new Date(ano, mesIdx0, 1);
  const hoje = new Date(); hoje.setHours(23,59,59,999);
  const fimDate = new Date(Math.min(hoje.getTime(), new Date(ano, mesIdx0+1, 0, 23,59,59,999).getTime()));
  const fmt = d => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
  const inicioStr = fmt(inicioDate);
  const fimStr    = fmt(fimDate);

  console.log(`📊 Buscando ${nomeMes} (${inicioStr} → ${fimStr})...`);
  const resultados = await monitorarDeskrioRange(inicioStr, fimStr);
  const dados      = processarDados(resultados, inicioDate, fimDate);
  const geradoEm   = new Date().toLocaleString('pt-BR', { timeZone:'America/Sao_Paulo' });

  console.log(`  📝 Atualizando aba "${nomeMes}"...`);
  const sheetIdResumo = await garantirAba(sheets, nomeMes, C.laranja);
  await limparAba(sheets, sheetIdResumo, nomeMes);
  await atualizarAbaResumo(sheets, sheetIdResumo, nomeMes, dados, geradoEm, resultados, mesIdx0, ano);

  const nomeTkts = `${MESES[mesIdx0]} ${ano} — Tickets`;
  const totalTickets = resultados.reduce((s,r)=>s+(r.ticketsRaw||[]).length,0);
  console.log(`  📋 Atualizando aba "${nomeTkts}" (${totalTickets} tickets)...`);
  const sheetIdTickets = await garantirAba(sheets, nomeTkts, C.cinzaEsc, totalTickets + 200);
  await limparAba(sheets, sheetIdTickets, nomeTkts);
  await atualizarAbaTickets(sheets, sheetIdTickets, nomeTkts, resultados);

  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`;
  console.log(`✅ Planilha atualizada → ${url}`);
  return url;
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

if (require.main === module) {
  const [,, mesArg, anoArg] = process.argv;
  const mesIdx = mesArg ? parseInt(mesArg)-1 : new Date().getMonth();
  const ano    = anoArg ? parseInt(anoArg)   : new Date().getFullYear();
  atualizarRelatorioMensal(mesIdx, ano).catch(e => { console.error('❌', e.message); process.exit(1); });
}

module.exports = { atualizarRelatorioMensal };
