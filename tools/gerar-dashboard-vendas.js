'use strict';

const puppeteer = require('puppeteer');
const path      = require('path');
const fs        = require('fs');
const http      = require('http');

const PASTA_SAIDA = path.join(__dirname, '..', 'output', 'relatorios');

const LOJAS_LABEL = {
  BR1:  'BR01 Centro',
  BR2:  'BR02 Vila',
  BR3:  'BR03 Americana',
  BR4:  'BR04 S. Carlos',
  BR5:  'BR05 Maringá',
  BR6:  'BR06 Jaú',
  BR7:  'BR08 Ibitinga',
  PEG1: 'Peg Araraquara',
  PEG2: 'Peg Sorocaba',
};
const STORE_KEYS = ['BR1','BR2','BR3','BR4','BR5','BR6','BR7','PEG1','PEG2'];

function brl(v)  { return `R$ ${parseFloat(v||0).toLocaleString('pt-BR', { minimumFractionDigits:0, maximumFractionDigits:0 })}`; }
function brlK(v) {
  const n = parseFloat(v || 0);
  if (n >= 1000) return `R$ ${(n/1000).toFixed(1).replace('.',',')}k`;
  return brl(n);
}
function pct(l, f) {
  if (!f || !l) return '-';
  return ((parseFloat(l)/parseFloat(f))*100).toFixed(1).replace('.',',') + '%';
}
function totOS(d) {
  if (!d) return 0;
  return (d.carroPorta||0)+(d.retiraPorta||0)+(d.revisaoPorta||0)
       + (d.carroAgendamento||0)+(d.retiraAgendamento||0)+(d.revisaoAgendamento||0);
}
function cor(markup) {
  const v = parseFloat(markup)||0;
  if (v >= 40) return '#22c55e';
  if (v >= 25) return '#f97316';
  return '#ef4444';
}

function gerarHTML(oiData, periodoStr, geradoEm) {
  const keys = STORE_KEYS;

  // ── Totais da rede
  let totalFat=0, totalLB=0, totalPneus=0;
  let totalCP=0, totalRP=0, totalRevP=0, totalCA=0, totalRA=0, totalRevA=0;
  for (const k of keys) {
    const d = oiData[k]; if (!d) continue;
    totalFat   += d.faturamento        || 0;
    totalLB    += d.lucroBruto         || 0;
    totalPneus += d.pneuVendidos       || 0;
    totalCP    += d.carroPorta         || 0;
    totalRP    += d.retiraPorta        || 0;
    totalRevP  += d.revisaoPorta       || 0;
    totalCA    += d.carroAgendamento   || 0;
    totalRA    += d.retiraAgendamento  || 0;
    totalRevA  += d.revisaoAgendamento || 0;
  }
  const totalOS  = totalCP+totalRP+totalRevP+totalCA+totalRA+totalRevA;
  const totalMKn = totalFat > 0 ? (totalLB/totalFat)*100 : 0;

  // ── Helpers por loja
  const fv  = (k, field) => oiData[k]?.[field] ?? null;
  const osK = k => (fv(k,'carroPorta')||0)+(fv(k,'retiraPorta')||0)+(fv(k,'revisaoPorta')||0)
                 + (fv(k,'carroAgendamento')||0)+(fv(k,'retiraAgendamento')||0)+(fv(k,'revisaoAgendamento')||0);
  const mkK = k => { const d=oiData[k]; return d?.faturamento>0 ? (d.lucroBruto/d.faturamento)*100 : null; };

  // ── Renderizadores de célula
  const $K  = v => v == null ? '-' : brlK(v);
  const $N  = v => (v == null || v === 0) ? '-' : String(v);
  const $R0 = v => v == null ? '-' : `R$ ${Math.round(v).toLocaleString('pt-BR')}`;
  const $MK = v => v == null
    ? `<span style="color:#475569">-</span>`
    : `<span style="color:${cor(v)};font-weight:700">${v.toFixed(1).replace('.',',')}%</span>`;

  // ── Construtor de linhas
  function row(label, vals, cls='') {
    const cells = vals.map((v,i) => {
      const isTotal = i === vals.length - 1;
      return `<td class="${isTotal?'td-tot':''}">${v}</td>`;
    }).join('');
    return `<tr class="${cls}"><td class="td-lbl">${label}</td>${cells}</tr>`;
  }
  const sep = () => `<tr class="tr-sep"><td colspan="12"></td></tr>`;

  // ── Dados por linha
  const rowFat   = row('Faturamento',    [...keys.map(k=>$K(fv(k,'faturamento'))),      `<strong>${brlK(totalFat)}</strong>`],  'r-money');
  const rowLB    = row('Lucro Bruto',    [...keys.map(k=>$K(fv(k,'lucroBruto'))),        `<strong>${brlK(totalLB)}</strong>`],   'r-money');
  const rowMK    = row('Mark-up',        [...keys.map(k=>$MK(mkK(k))),                   $MK(totalMKn)],                         'r-pct');
  const rowCP    = row('Carro Porta',    [...keys.map(k=>$N(fv(k,'carroPorta'))),         $N(totalCP)]);
  const rowRP    = row('Retira Porta',   [...keys.map(k=>$N(fv(k,'retiraPorta'))),        $N(totalRP)]);
  const rowRevP  = row('Revisão Porta',  [...keys.map(k=>$N(fv(k,'revisaoPorta'))),       $N(totalRevP)]);
  const rowCA    = row('Carro Agend.',   [...keys.map(k=>$N(fv(k,'carroAgendamento'))),   $N(totalCA)]);
  const rowRA    = row('Retira Agend.',  [...keys.map(k=>$N(fv(k,'retiraAgendamento'))),  $N(totalRA)]);
  const rowRevA  = row('Revisão Agend.', [...keys.map(k=>$N(fv(k,'revisaoAgendamento'))), $N(totalRevA)]);
  const rowTOS   = row('Total OS',       [...keys.map(k=>{ const o=osK(k); return o>0?String(o):'-'; }),
                                           `<strong>${totalOS||'-'}</strong>`], 'r-total');
  const rowMxF   = row('Média/Faturamento', [...keys.map(k=>{ const o=osK(k); return $R0(o>0?((fv(k,'faturamento')||0)/o):null); }),
                                              $R0(totalOS>0?totalFat/totalOS:null)], 'r-avg');
  const rowMxLB  = row('Média/L.Bruto',    [...keys.map(k=>{ const o=osK(k); return $R0(o>0?((fv(k,'lucroBruto')||0)/o):null); }),
                                              $R0(totalOS>0?totalLB/totalOS:null)], 'r-avg');
  const rowPneus = row('Pneus Vendidos', [...keys.map(k=>$N(fv(k,'pneuVendidos'))),      `<strong>${totalPneus||'-'}</strong>`], 'r-pneus');

  const colHeaders = ['BR01','BR02','BR03','BR04','BR05','BR06','BR07','Peg ARQ','Peg SOR','TOTAL']
    .map((l,i) => `<th${i===9?' class="th-tot"':''}>${l}</th>`).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:1920px; height:1080px; }
  body {
    background:#111827;
    font-family:'Segoe UI',Arial,sans-serif;
    color:#f1f5f9;
    overflow:hidden;
  }
  .wrap { padding:22px 36px 14px; display:flex; flex-direction:column; height:100%; }

  /* ── Header ── */
  .header { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
  .titulo { font-size:42px; font-weight:700; color:#f97316; letter-spacing:.4px; }
  .subtitulo { font-size:20px; color:#94a3b8; margin-top:4px; }
  .header-right { text-align:right; }
  .periodo { font-size:38px; font-weight:600; color:#f1f5f9; }
  .gerado { font-size:16px; color:#64748b; margin-top:4px; }

  /* ── KPI cards ── */
  .kpis { display:flex; gap:14px; margin-bottom:14px; }
  .kpi { flex:1; background:#1e293b; border-radius:12px; padding:18px 14px; text-align:center; border-top:4px solid #f97316; }
  .kpi.verde { border-top-color:#22c55e; }
  .kpi.azul  { border-top-color:#3b82f6; }
  .kpi.am    { border-top-color:#eab308; }
  .kpi-val { font-size:50px; font-weight:800; line-height:1.1; }
  .kpi-lbl { font-size:16px; color:#94a3b8; margin-top:6px; text-transform:uppercase; letter-spacing:.4px; }

  /* ── Tabela ── */
  .table-wrap { flex:1; overflow:hidden; }
  table { width:100%; height:100%; border-collapse:collapse; }

  thead th {
    background:#1e293b;
    padding:10px 12px;
    font-size:19px;
    font-weight:700;
    color:#94a3b8;
    text-transform:uppercase;
    letter-spacing:.3px;
    text-align:right;
    border-bottom:3px solid #f97316;
    white-space:nowrap;
  }
  thead th:first-child { text-align:left; width:210px; }
  th.th-tot { color:#f97316; }

  td {
    padding:0 12px;
    text-align:right;
    border-bottom:1px solid #1e293b;
    font-size:22px;
    white-space:nowrap;
  }
  td.td-lbl {
    text-align:left;
    color:#94a3b8;
    font-size:20px;
    font-weight:500;
    width:210px;
  }
  td.td-tot { font-weight:700; color:#f97316; }

  tr.r-money td           { color:#f1f5f9; }
  tr.r-money td.td-lbl    { color:#f1f5f9; font-weight:600; font-size:22px; }
  tr.r-money td.td-tot    { color:#f97316; }
  tr.r-pct   td.td-lbl    { color:#f1f5f9; font-weight:600; font-size:22px; }
  tr.r-total td            { background:#1e293b; border-top:1px solid #334155; font-weight:700; }
  tr.r-total td.td-lbl    { color:#f1f5f9; font-size:22px; }
  tr.r-total td.td-tot    { color:#f97316; }
  tr.r-avg   td            { color:#64748b; font-size:20px; }
  tr.r-avg   td.td-lbl    { font-size:18px; }
  tr.r-pneus td            { color:#3b82f6; }
  tr.r-pneus td.td-lbl    { color:#3b82f6; font-weight:600; font-size:22px; }
  tr.r-pneus td.td-tot    { color:#3b82f6; }

  tr.tr-sep td { border:none; background:#0f172a; padding:0; }

  /* ── Footer ── */
  .footer { text-align:center; color:#475569; font-size:15px; margin-top:10px; }
</style>
</head>
<body>
<div class="wrap">

  <div class="header">
    <div>
      <div class="titulo">VENDAS ACUMULADAS</div>
      <div class="subtitulo">BR Pneus &amp; Oficina + Peg Pneus</div>
    </div>
    <div class="header-right">
      <div class="periodo">${periodoStr}</div>
      <div class="gerado">Gerado ${geradoEm}</div>
    </div>
  </div>

  <div class="kpis">
    <div class="kpi">
      <div class="kpi-val">${brlK(totalFat)}</div>
      <div class="kpi-lbl">Faturamento</div>
    </div>
    <div class="kpi verde">
      <div class="kpi-val">${brlK(totalLB)}</div>
      <div class="kpi-lbl">Lucro Bruto</div>
    </div>
    <div class="kpi am">
      <div class="kpi-val" style="color:${cor(totalMKn)}">${totalMKn.toFixed(1).replace('.',',')}%</div>
      <div class="kpi-lbl">Mark-up Médio</div>
    </div>
    <div class="kpi azul">
      <div class="kpi-val">${totalOS}</div>
      <div class="kpi-lbl">Total OS</div>
    </div>
    <div class="kpi">
      <div class="kpi-val">${totalPneus}</div>
      <div class="kpi-lbl">Pneus</div>
    </div>
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr><th></th>${colHeaders}</tr>
      </thead>
      <tbody>
        ${rowFat}
        ${rowLB}
        ${rowMK}
        ${sep()}
        ${rowCP}
        ${rowRP}
        ${rowRevP}
        ${rowCA}
        ${rowRA}
        ${rowRevA}
        ${sep()}
        ${rowTOS}
        ${sep()}
        ${rowMxF}
        ${rowMxLB}
        ${sep()}
        ${rowPneus}
      </tbody>
    </table>
  </div>

  <div class="footer">Dados coletados automaticamente do Oficina Inteligente — ${geradoEm}</div>
</div>
</body>
</html>`;
}

async function gerarDashboardVendasPng(oiData, dateStr) {
  if (!fs.existsSync(PASTA_SAIDA)) fs.mkdirSync(PASTA_SAIDA, { recursive: true });

  const now      = new Date();
  const geradoEm = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const [dd, mm, yyyy] = dateStr.split('/');
  const html     = gerarHTML(oiData, `01/${mm} – ${dd}/${mm}/${yyyy}`, geradoEm);

  const htmlPath = path.join(PASTA_SAIDA, `dashboard-vendas-${dateStr.replace(/\//g,'-')}.html`);
  const pngPath  = htmlPath.replace('.html', '.png');
  fs.writeFileSync(htmlPath, html, 'utf8');

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page    = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle2' });
  await page.screenshot({ path: pngPath, fullPage: false });
  await browser.close();

  console.log(`  📸 Dashboard: ${pngPath}`);
  return pngPath;
}

function enviarWhatsApp(pngPath, caption, grupoId) {
  return new Promise(resolve => {
    const data   = fs.readFileSync(pngPath).toString('base64');
    const body   = JSON.stringify({
      chatId: grupoId,
      media:  { mimetype: 'image/png', data, filename: path.basename(pngPath) },
      caption,
    });
    const req = http.request(
      { hostname: '127.0.0.1', port: 3099, path: '/send-media', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      res => { res.resume(); resolve(res.statusCode === 200); }
    );
    req.on('error', () => resolve(false));
    req.write(body);
    req.end();
  });
}

async function notificarVendasDiarias(oiData, dateStr) {
  console.log('\n📊 Gerando dashboard de vendas...');
  let pngPath;
  try {
    pngPath = await gerarDashboardVendasPng(oiData, dateStr);
  } catch (err) {
    console.warn('  ⚠️ Falha ao gerar dashboard:', err.message);
    return;
  }

  const grupoId = process.env.WHATSAPP_GRUPO_AUTOMACAO_ID;
  if (!grupoId) { console.warn('  ⚠️ WHATSAPP_GRUPO_AUTOMACAO_ID não definido'); return; }

  const [d, m, y] = dateStr.split('/');
  const caption = `📊 *Vendas Acumuladas — 01/${m}/${y} até ${d}/${m}/${y}*\nPlanilha atualizada automaticamente.`;

  console.log('  📤 Enviando para grupo automações...');
  const ok = await enviarWhatsApp(pngPath, caption, grupoId);
  console.log(ok ? '  ✅ Enviado!' : '  ❌ Falha no envio (bot offline?)');
}

module.exports = { gerarDashboardVendasPng, notificarVendasDiarias };
