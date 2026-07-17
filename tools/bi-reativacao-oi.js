'use strict';
/**
 * tools/bi-reativacao-oi.js
 *
 * Gera e envia no WhatsApp os seguintes relatórios Excel para cada loja:
 *   1. Aniversariantes do dia
 *   2. Clientes cuja última venda foi há ~3 meses
 *   3. Clientes cuja última venda foi há ~6 meses
 *   4. Clientes cuja última venda foi há ~9 meses
 *   5. Clientes cuja última venda foi há ~1 ano
 *
 * Uso:
 *   node tools/bi-reativacao-oi.js                       # todas as lojas
 *   node tools/bi-reativacao-oi.js --loja=BR01           # só BR01
 *   node tools/bi-reativacao-oi.js --loja=BR01 --dia=14 --mes=7
 */
require('dotenv').config();

const puppeteer = require('puppeteer');
const path      = require('path');
const fs        = require('fs');
const http      = require('http');
const XLSX      = require('xlsx');
const ExcelJS   = require('exceljs');

const BASE_URL  = 'https://sistemaoficinainteligente.com.br';
const LOGIN_URL = `${BASE_URL}/Entrar.aspx?sair=1`;
const BI_URL    = `${BASE_URL}/wfCRMBI.aspx`;
const BOT_URL   = 'http://127.0.0.1:3099';
const GRUPO_ID  = '5516996337606-1627903605@g.us'; // ☎️ Comercial
const DEBUG_DIR = path.join(__dirname, '..', 'output', 'debug-bi');
const SLEEP     = ms => new Promise(r => setTimeout(r, ms));

// ── Estado diário (deduplicação) ───────────────────────────────────────────────
// Garante que nada é reenviado se o script rodar duas vezes no mesmo dia
const _dataBRT = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const ESTADO_FILE = path.join(DEBUG_DIR, `estado-${_dataBRT}.json`);

function carregarEstado() {
  try { if (fs.existsSync(ESTADO_FILE)) return JSON.parse(fs.readFileSync(ESTADO_FILE, 'utf8')); } catch {}
  return {};
}
function jaEnviado(estado, chave) { return !!estado[chave]; }
function marcarEnviado(estado, chave) {
  estado[chave] = new Date().toISOString();
  ensureDir(path.dirname(ESTADO_FILE));
  fs.writeFileSync(ESTADO_FILE, JSON.stringify(estado, null, 2));
}

const LOJAS_CONFIG = [
  { key: 'BR01', value: '469',  nome: 'BR Pneus Araraquara', sigla: 'BR1' },
  { key: 'BR03', value: '2202', nome: 'BR Pneus Americana',  sigla: 'BR3' },
  { key: 'BR04', value: '1524', nome: 'BR Pneus São Carlos', sigla: 'BR4' },
  { key: 'PEG1', value: '3098', nome: 'Peg Pneus Araraquara',sigla: 'PEG1'},
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const dArg = args.find(a => a.startsWith('--dia='));
  const mArg = args.find(a => a.startsWith('--mes='));
  const lArg = args.find(a => a.startsWith('--loja='));
  const brt = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit' }).format(new Date());
  const [d, m] = brt.split('/');
  return {
    dia:  dArg ? parseInt(dArg.split('=')[1]) : parseInt(d),
    mes:  mArg ? parseInt(mArg.split('=')[1]) : parseInt(m),
    loja: lArg ? lArg.split('=')[1].toUpperCase() : null,
  };
}

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

async function screenshot(page, nome) {
  ensureDir(DEBUG_DIR);
  await page.screenshot({ path: path.join(DEBUG_DIR, `${Date.now()}-${nome}.png`), fullPage: false }).catch(() => {});
}

function formatDate(d) {
  return String(d.getDate()).padStart(2,'0') + '/'
       + String(d.getMonth()+1).padStart(2,'0') + '/'
       + d.getFullYear();
}

function addMeses(date, meses) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + meses);
  return d;
}

function calcularPeriodos(hoje) {
  const brt = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric' }).format(hoje);
  const [dd, mm, yyyy] = brt.split('/');
  const base = new Date(parseInt(yyyy), parseInt(mm)-1, parseInt(dd));

  // De = Até = data exata N meses atrás (ex: hoje 14/07/2026 → 1 ano = 14/07/2025)
  return [
    { id: '3m',   label: '3 Meses', meses: -3  },
    { id: '6m',   label: '6 Meses', meses: -6  },
    { id: '9m',   label: '9 Meses', meses: -9  },
    { id: '1ano', label: '1 Ano',   meses: -12 },
  ].map(p => {
    const data = addMeses(base, p.meses);
    const dateStr = formatDate(data);
    return { ...p, de: dateStr, ate: dateStr };
  });
}

// ── API WhatsApp ───────────────────────────────────────────────────────────────

function enviarTextoWA(mensagem) {
  return new Promise(resolve => {
    if (!GRUPO_ID) { console.log('  ⚠️  WHATSAPP_GRUPO_AUTOMACAO_ID não definido'); return resolve(false); }
    const body = JSON.stringify({ chatId: GRUPO_ID, message: mensagem });
    const req = http.request(`${BOT_URL}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => { res.resume(); console.log(`  ✅ WA texto HTTP ${res.statusCode}`); resolve(true); });
    req.on('error', e => { console.warn(`  ⚠️  Bot: ${e.message}`); resolve(false); });
    req.setTimeout(10000, () => { req.destroy(); resolve(false); });
    req.write(body); req.end();
  });
}

function _tentarEnviarArquivoWA(filePath, nomeWA, caption) {
  return new Promise(resolve => {
    if (!GRUPO_ID) { console.log('  ⚠️  WHATSAPP_GRUPO_AUTOMACAO_ID não definido'); return resolve(false); }
    const data = fs.readFileSync(filePath).toString('base64');
    const body = JSON.stringify({
      chatId: GRUPO_ID,
      media: { mimetype: nomeWA.endsWith('.xlsx')
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/vnd.ms-excel', data, filename: nomeWA },
      caption: caption || '',
    });
    const req = http.request(`${BOT_URL}/send-media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => { res.resume(); resolve(res.statusCode < 400); });
    req.on('error', () => resolve(false));
    req.setTimeout(60000, () => { req.destroy(); resolve(false); });
    req.write(body); req.end();
  });
}

async function enviarArquivoWA(filePath, nomeWA, caption) {
  for (let t = 1; t <= 3; t++) {
    const ok = await _tentarEnviarArquivoWA(filePath, nomeWA, caption);
    if (ok) { console.log(`  ✅ WA enviado: ${nomeWA}`); return true; }
    if (t < 3) {
      console.log(`  ⏳ Bot offline, aguardando 25s (tentativa ${t}/3)...`);
      await SLEEP(25000);
    }
  }
  console.log(`  ❌ Falhou após 3 tentativas — xlsx salvo para reenvio posterior`);
  return false;
}

// ── Login ──────────────────────────────────────────────────────────────────────

async function login(page) {
  console.log('🔐 Login...');
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('#Login1_UserName', { timeout: 30000 });
  await page.click('#Login1_UserName', { clickCount: 3 });
  await page.type('#Login1_UserName', process.env.OI_EMAIL, { delay: 30 });
  await page.click('#Login1_Password', { clickCount: 3 });
  await page.type('#Login1_Password', process.env.OI_SENHA, { delay: 30 });
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
    page.click('#Login1_btnEntrar'),
  ]);
  if (page.url().toLowerCase().includes('entrar')) throw new Error('Login falhou');
  console.log('  ✅ Logado');
}

// ── Carregar base de uma loja ──────────────────────────────────────────────────

async function carregarBase(page, loja) {
  // Navega direto ao BI — fresh load limpa o ViewState/filtros anteriores
  await page.goto(BI_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await SLEEP(800);

  const currentVal = await page.$eval('#ctl00_cph_ddlUsuarioEmpresa', el => el.value).catch(() => null);
  if (currentVal !== loja.value) {
    try {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }),
        page.select('#ctl00_cph_ddlUsuarioEmpresa', loja.value),
      ]);
    } catch (_) { await SLEEP(3000); }
    await SLEEP(1200);
  }

  await page.$eval('#ctl00_cph_rblFiltraSoComVenda_1', el => { if (!el.checked) el.click(); }).catch(() => {});
  const totalVenda = await page.$eval('#ctl00_cph_txtTotalClienteComVenda', el => el.value).catch(() => '?');
  console.log(`  👥 Base: ${totalVenda} clientes com venda`);

  console.log('  ⏳ Carregando base...');
  const t0 = Date.now();
  try {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 180000 }),
      page.click('#btnBuscar'),
    ]);
  } catch (_) { await SLEEP(5000); }
  await SLEEP(1500);
  console.log(`  ✅ Base carregada em ${Math.round((Date.now()-t0)/1000)}s`);
  return totalVenda;
}

// ── Baixar Excel com um filtro ─────────────────────────────────────────────────

async function baixarComFiltro(page, loja, filtroFn, labelLog) {
  // Verifica se seção de filtros apareceu
  const btnOk = await page.$('#ctl00_cph_btnAdicionarCampo').then(el => !!el).catch(() => false);
  if (!btnOk) { console.log('  ❌ Seção de filtros não apareceu'); return null; }

  await filtroFn(page);

  // Inclui o filtro
  const totalAntes = await page.$eval('[id*="TotalFiltrado"]', el => el.textContent.replace(/\D/g,'')).catch(() => null);
  try {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
      page.click('#ctl00_cph_btnAdicionarCampo'),
    ]);
  } catch (_) {
    const limite = Date.now() + 60000;
    while (Date.now() < limite) {
      await SLEEP(1500);
      const agora = await page.$eval('[id*="TotalFiltrado"]', el => el.textContent.replace(/\D/g,'')).catch(() => null);
      const mudou = totalAntes === null ? agora !== null : (agora !== null && agora !== totalAntes);
      if (mudou) break;
    }
  }
  await SLEEP(1000);

  const totalFiltrado = await page.$eval('[id*="TotalFiltrado"]', el => el.textContent.replace(/\D/g,'')).catch(() => null);
  console.log(`  📊 ${labelLog}: ${totalFiltrado ?? '?'} clientes`);
  if (totalFiltrado === null || totalFiltrado === '0' || totalFiltrado === '') {
    console.log('  ℹ️  0 ou indefinido — pulando download');
    return null;
  }
  // Se TotalFiltrado == base (filtro não aplicou), pula para evitar enviar base inteira
  if (totalAntes !== null && totalFiltrado === totalAntes) {
    console.log(`  ⚠️  Filtro não aplicou (TotalFiltrado permaneceu ${totalAntes}) — pulando`);
    return null;
  }

  // Download Excel
  const excelPadrao = path.join(DEBUG_DIR, 'CRMExcel.xls');
  if (fs.existsSync(excelPadrao)) fs.unlinkSync(excelPadrao);
  const cdp = await page.target().createCDPSession();
  ensureDir(DEBUG_DIR);
  await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: DEBUG_DIR });
  await SLEEP(300);
  page.once('dialog', async d => { await d.accept().catch(() => {}); });
  await page.waitForSelector('#ctl00_cph_btnGerarExcel', { visible: true, timeout: 10000 }).catch(() => {});
  await SLEEP(500);
  await page.evaluate(() => {
    const btn = document.querySelector('#ctl00_cph_btnGerarExcel');
    if (btn) btn.click();
  }).catch(() => {});

  const t1 = Date.now();
  let excelPath = null;
  for (let i = 0; i < 60 && !excelPath; i++) {
    await SLEEP(1000);
    const crdownload = excelPadrao + '.crdownload';
    if (fs.existsSync(excelPadrao) && !fs.existsSync(crdownload)) {
      if (fs.statSync(excelPadrao).mtimeMs >= t1 - 2000) {
        excelPath = excelPadrao;
      }
    }
  }
  return excelPath || null;
}

// ── Filtros específicos ────────────────────────────────────────────────────────

function filtroAniversario(dia, mes) {
  return async page => {
    await page.select('#ctl00_cph_ddlCRMFiltro', '20').catch(() => {});
    await SLEEP(2500);
    await page.waitForSelector('#ctl00_cph_txtDia', { timeout: 15000 }).catch(() => {});
    await page.evaluate(() => {
      const el = document.querySelector('#ctl00_cph_ddlDiaMes');
      if (el) { el.value = '1'; el.dispatchEvent(new Event('change', { bubbles: true })); }
    }).catch(() => {});
    await SLEEP(600);
    await page.click('#ctl00_cph_txtDia', { clickCount: 3 }).catch(() => {});
    await page.type('#ctl00_cph_txtDia', String(dia)).catch(() => {});
    await page.click('#ctl00_cph_txtMes', { clickCount: 3 }).catch(() => {});
    await page.type('#ctl00_cph_txtMes', String(mes)).catch(() => {});
    await SLEEP(300);
  };
}

function filtroUltimaVenda(de, ate) {
  return async page => {
    // 1. Seleciona "Data da última venda"
    await page.select('#ctl00_cph_ddlCRMFiltro', '7').catch(() => {});
    await SLEEP(3000);

    // 2. Seta ddlData = '1' (Período) separado, depois aguarda AJAX revelar txtDe/txtAte
    await page.evaluate(() => {
      const el = document.querySelector('#ctl00_cph_ddlData');
      if (el) { el.value = '1'; el.dispatchEvent(new Event('change', { bubbles: true })); }
    }).catch(() => {});
    await SLEEP(1500);

    // 3. Aguarda os campos de data aparecerem
    await page.waitForSelector('#ctl00_cph_txtDe', { visible: true, timeout: 10000 }).catch(() => {});
    await SLEEP(300);

    // 4. Preenche as datas via click+clear+type (mais fiel ao comportamento humano)
    for (const [sel, val] of [['#ctl00_cph_txtDe', de], ['#ctl00_cph_txtAte', ate]]) {
      await page.click(sel, { clickCount: 3 }).catch(() => {});
      await page.keyboard.press('Backspace').catch(() => {});
      await page.type(sel, val, { delay: 50 }).catch(() => {});
    }
    await SLEEP(500);

    // 5. Confirma valores via evaluate (garante que chegou certo)
    const vals = await page.evaluate((de, ate) => {
      const d = document.querySelector('#ctl00_cph_txtDe');
      const a = document.querySelector('#ctl00_cph_txtAte');
      return { de: d ? d.value : null, ate: a ? a.value : null };
    }, de, ate).catch(() => ({ de: null, ate: null }));
    console.log(`  📅 txtDe="${vals.de}" txtAte="${vals.ate}"`);
  };
}

// ── Parsear Excel ─────────────────────────────────────────────────────────────

function parsearExcel(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return 0;
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  return Math.max(0, rows.length - 1);
}

// Converte .xls bruto → .xlsx formatado usando ExcelJS
async function formatarExcel(xlsPath, xlsxPath) {
  // cellDates:true → datas viram objetos Date (preserva o valor original do OI)
  const wb = XLSX.read(fs.readFileSync(xlsPath), { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return;
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (!rows.length) return;

  const wbEx = new ExcelJS.Workbook();
  const sheet = wbEx.addWorksheet('Clientes', { views: [{ state: 'frozen', ySplit: 1 }] });

  const header = rows[0];

  // Larguras por tipo de coluna (heurística pelo nome)
  const widths = header.map(h => {
    const s = String(h).toLowerCase();
    if (s.includes('nome'))       return 32;
    if (s.includes('email') || s.includes('e-mail')) return 30;
    if (s.includes('endereço') || s.includes('endereco')) return 36;
    if (s.includes('complemento')) return 20;
    if (s.includes('telefone') || s.includes('celular') || s.includes('sms')) return 16;
    if (s.includes('data'))       return 14;
    if (s.includes('código') || s.includes('codigo')) return 12;
    if (s.includes('sexo') || s.includes('física') || s.includes('juridica')) return 10;
    return 14;
  });

  sheet.columns = widths.map((w, i) => ({ key: String(i), width: w }));

  // Linha de cabeçalho
  const headerRow = sheet.addRow(header);
  headerRow.height = 22;
  headerRow.eachCell(cell => {
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A1A' } };
    cell.font   = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Calibri' };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
    cell.border = {
      top:    { style: 'thin', color: { argb: 'FF444444' } },
      bottom: { style: 'thin', color: { argb: 'FF444444' } },
      left:   { style: 'thin', color: { argb: 'FF444444' } },
      right:  { style: 'thin', color: { argb: 'FF444444' } },
    };
  });

  const iCodigo = header.findIndex(h => String(h).toLowerCase().includes('digo'));

  // Linhas de dados
  rows.slice(1).forEach((rowData, rowIdx) => {
    const dataRow = sheet.addRow(rowData.map((v, ci) => {
      // Código: forçar inteiro (sem notação científica)
      if (ci === iCodigo && v !== '') return typeof v === 'number' ? Math.round(v) : String(v);
      return v; // Date objects passam direto → ExcelJS preserva como data
    }));
    dataRow.height = 18;
    const bgColor = rowIdx % 2 === 0 ? 'FFFAFAFA' : 'FFF0F0F0';
    dataRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
      if (colNum === iCodigo + 1) {
        cell.numFmt = '0';          // Código sem decimais/científico
      } else if (cell.value instanceof Date) {
        cell.numFmt = 'dd/mm/yyyy'; // datas no formato brasileiro
      }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cell.font = { size: 9, name: 'Calibri' };
      cell.alignment = { vertical: 'middle', wrapText: false };
      cell.border = {
        top:    { style: 'hair', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'hair', color: { argb: 'FFCCCCCC' } },
        left:   { style: 'hair', color: { argb: 'FFCCCCCC' } },
        right:  { style: 'hair', color: { argb: 'FFCCCCCC' } },
      };
    });
  });

  await wbEx.xlsx.writeFile(xlsxPath);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { dia, mes, loja: lojaFiltro } = parseArgs();
  const hoje = new Date();
  const periodos = calcularPeriodos(hoje);

  const dStr = String(dia).padStart(2,'0');
  const mStr = String(mes).padStart(2,'0');
  const anoStr = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', year: 'numeric' }).format(hoje);
  const dataLabel = `${dStr}/${mStr}`;

  console.log(`\n🎂 BI Reativação OI — ${dStr}/${mStr}/${anoStr}\n`);
  ensureDir(DEBUG_DIR);

  if (!process.env.OI_EMAIL || !process.env.OI_SENHA) {
    console.error('❌ OI_EMAIL e OI_SENHA são obrigatórios no .env'); process.exit(1);
  }

  const lojas = lojaFiltro
    ? LOJAS_CONFIG.filter(l => l.key === lojaFiltro)
    : LOJAS_CONFIG;

  if (!lojas.length) { console.error('❌ Loja não encontrada:', lojaFiltro); process.exit(1); }

  const browser = await puppeteer.launch({
    headless: 'new',
    protocolTimeout: 120000,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage',
           '--disable-blink-features=AutomationControlled','--window-size=1366,900'],
    defaultViewport: { width: 1366, height: 900 },
  });
  const page = await browser.newPage();
  await SLEEP(500);
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36');
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const estado = carregarEstado();

  try {
    await login(page);

    for (const loja of lojas) {
      console.log(`\n━━━ ${loja.nome} (${loja.key}) ━━━`);

      // Monta a lista de tarefas: aniversariantes + períodos de reativação
      const tarefas = [
        {
          id:       'aniv',
          label:    `${loja.sigla} Aniversariantes ${dataLabel}`,
          labelLog: `Aniversariantes ${dataLabel}`,
          filtro:   filtroAniversario(dia, mes),
          caption:  `🎂 ${loja.sigla} - Aniversariantes ${dataLabel}`,
        },
        ...periodos.map(p => ({
          id:       p.id,
          label:    `${loja.sigla} ${p.label} ${String(dia).padStart(2,'0')}-${String(mes).padStart(2,'0')}`,
          labelLog: `Última venda ${p.label} (${p.de} a ${p.ate})`,
          filtro:   filtroUltimaVenda(p.de, p.ate),
          caption:  `🔄 ${loja.sigla} - ${p.label}`,
        })),
      ];

      for (const tarefa of tarefas) {
        const chaveDedup = `${loja.key}_${tarefa.id}`;

        // ── Deduplicação: já enviado hoje? ────────────────────────────────────
        if (jaEnviado(estado, chaveDedup)) {
          console.log(`\n  ✅ ${tarefa.labelLog} — já enviado hoje, pulando`);
          continue;
        }

        console.log(`\n  📋 ${tarefa.labelLog}`);

        const nomeBase = tarefa.label.replace(/\//g, '-');
        const destXls  = path.join(DEBUG_DIR, `${nomeBase}.xls`);
        const destXlsx = path.join(DEBUG_DIR, `${nomeBase}.xlsx`);

        // ── Tenta até 3 vezes em caso de falha ────────────────────────────
        let enviado = false;
        for (let tentativa = 1; tentativa <= 3 && !enviado; tentativa++) {
          if (tentativa > 1) {
            console.log(`  🔁 Retry ${tentativa}/3 — aguardando 30s...`);
            await SLEEP(30000);
            // Apaga xlsx anterior para forçar novo download
            if (fs.existsSync(destXlsx)) fs.unlinkSync(destXlsx);
            if (fs.existsSync(destXls))  fs.unlinkSync(destXls);
          }

          // ── Se o xlsx já está no disco (ex: bot caiu), reenvia sem baixar ──
          if (!fs.existsSync(destXlsx)) {
            await carregarBase(page, loja);
            const excelPath = await baixarComFiltro(page, loja, tarefa.filtro, tarefa.labelLog);
            if (!excelPath) {
              console.log(`  ⚠️  Filtro falhou na tentativa ${tentativa}`);
              continue;
            }

            if (fs.existsSync(destXls)) fs.unlinkSync(destXls);
            fs.renameSync(excelPath, destXls);

            const linhas = parsearExcel(fs.readFileSync(destXls));
            console.log(`  💾 Salvo: ${path.basename(destXls)} (${linhas} clientes)`);

            await formatarExcel(destXls, destXlsx);
            console.log(`  ✨ Formatado: ${path.basename(destXlsx)}`);
          } else {
            console.log(`  📂 xlsx já em disco — reenviando`);
          }

          const nomeWA = `${tarefa.label}.xlsx`;
          const ok = await enviarArquivoWA(destXlsx, nomeWA, tarefa.caption);
          if (ok) {
            marcarEnviado(estado, chaveDedup);
            enviado = true;
          }
        }

        if (!enviado) console.log(`  ❌ ${tarefa.labelLog} — falhou após 3 tentativas`);
        await SLEEP(2000);
      }
    }
  } finally {
    await browser.close();
  }

  console.log('\n✅ Concluído!');
}

main().catch(e => { console.error('\n❌ Fatal:', e.message); process.exit(1); });
