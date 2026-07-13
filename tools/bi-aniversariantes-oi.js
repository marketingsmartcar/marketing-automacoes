'use strict';
/**
 * tools/bi-aniversariantes-oi.js
 *
 * Acessa o BI CRM do Oficina Inteligente, aplica filtro de aniversariantes
 * do dia em cada loja ativa, baixa o Excel, extrai os clientes e envia
 * um relatório no grupo de automações do WhatsApp.
 *
 * Uso:
 *   node tools/bi-aniversariantes-oi.js            # aniversariantes de hoje
 *   node tools/bi-aniversariantes-oi.js --dia=13 --mes=7   # data específica
 */
require('dotenv').config();

const puppeteer = require('puppeteer');
const path      = require('path');
const fs        = require('fs');
const http      = require('http');
const https     = require('https');
const XLSX      = require('xlsx');

const BASE_URL   = 'https://sistemaoficinainteligente.com.br';
const LOGIN_URL  = `${BASE_URL}/Entrar.aspx?sair=1`;
const BI_URL     = `${BASE_URL}/wfCRMBI.aspx`;
const BOT_URL    = 'http://127.0.0.1:3099/send';
const GRUPO_ID   = process.env.WHATSAPP_GRUPO_AUTOMACAO_ID;
const DEBUG_DIR  = path.join(__dirname, '..', 'output', 'debug-bi');
const SLEEP      = ms => new Promise(r => setTimeout(r, ms));

// Lojas ativas jul/2026 — value = #ctl00_cph_ddlUsuarioEmpresa
const LOJAS = [
  { key: 'BR01', value: '469',  nome: 'BR Pneus Araraquara' },
  { key: 'BR03', value: '2202', nome: 'BR Pneus Americana'  },
  { key: 'BR04', value: '1524', nome: 'BR Pneus São Carlos' },
  { key: 'PEG1', value: '3098', nome: 'Peg Pneus Araraquara'},
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const dArg = args.find(a => a.startsWith('--dia='));
  const mArg = args.find(a => a.startsWith('--mes='));
  if (dArg && mArg) {
    return { dia: parseInt(dArg.split('=')[1]), mes: parseInt(mArg.split('=')[1]) };
  }
  const brt = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit' }).format(new Date());
  const [d, m] = brt.split('/');
  return { dia: parseInt(d), mes: parseInt(m) };
}

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

async function screenshot(page, nome) {
  ensureDir(DEBUG_DIR);
  const p = path.join(DEBUG_DIR, `${Date.now()}-${nome}.png`);
  await page.screenshot({ path: p, fullPage: false }).catch(() => {});
}

function fetchBuffer(url, cookies) {
  return new Promise((resolve, reject) => {
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const lib = url.startsWith('https') ? https : http;
    const get = (u, cb) => lib.get(u, { headers: { Cookie: cookieStr } }, cb).on('error', reject);
    get(url, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        return get(res.headers.location, resolve2 => {
          const chunks = [];
          resolve2.on('data', c => chunks.push(c));
          resolve2.on('end', () => resolve({ buffer: Buffer.concat(chunks), type: resolve2.headers['content-type'] || '' }));
        });
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), type: res.headers['content-type'] || '' }));
    });
  });
}

function enviarWA(mensagem) {
  return new Promise(resolve => {
    if (!GRUPO_ID) { console.log('⚠️  WHATSAPP_GRUPO_AUTOMACAO_ID não definido — pulando envio'); return resolve(false); }
    const body = JSON.stringify({ chatId: GRUPO_ID, message: mensagem });
    const req = http.request(BOT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => { res.resume(); console.log(`  ✅ WhatsApp HTTP ${res.statusCode}`); resolve(true); });
    req.on('error', e => { console.warn(`  ⚠️  Bot: ${e.message}`); resolve(false); });
    req.setTimeout(8000, () => { req.destroy(); resolve(false); });
    req.write(body); req.end();
  });
}

// ── Login ─────────────────────────────────────────────────────────────────────

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

// ── Coleta dados de uma loja ──────────────────────────────────────────────────

async function coletarLoja(page, loja, dia, mes) {
  console.log(`\n━━━ ${loja.nome} (${loja.key}) ━━━`);

  // Navega para o BI (fresh page por loja — evita bug de troca de loja no OI)
  await page.goto(BI_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await SLEEP(800);

  // Seleciona a loja no dropdown do BI
  const currentVal = await page.$eval('#ctl00_cph_ddlUsuarioEmpresa', el => el.value).catch(() => null);
  if (currentVal !== loja.value) {
    console.log(`  🔄 Trocando loja para ${loja.nome}...`);
    // AutoPostBack no ASP.NET dispara postback completo ao mudar o dropdown
    try {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }),
        page.select('#ctl00_cph_ddlUsuarioEmpresa', loja.value),
      ]);
    } catch (_) {
      await SLEEP(3000); // fallback AJAX
    }
    await SLEEP(1200);
  }

  // Garante "SOMENTE COM VENDA" marcado via click no elemento
  await page.$eval('#ctl00_cph_rblFiltraSoComVenda_1', el => { if (!el.checked) el.click(); }).catch(() => {});

  // Lê contagem
  const totalVenda = await page.$eval('#ctl00_cph_txtTotalClienteComVenda', el => el.value).catch(() => '?');
  console.log(`  👥 Clientes com venda: ${totalVenda}`);

  // Carrega a base (submit button — aguarda navegação de volta)
  console.log('  ⏳ Carregando base (aguardando até 3 min)...');
  const t0 = Date.now();
  try {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 180000 }),
      page.click('#btnBuscar'),
    ]);
  } catch (_) {
    await SLEEP(5000); // fallback se não houve navegação (UpdatePanel AJAX)
  }
  await SLEEP(1500);
  console.log(`  ✅ Base carregada em ${Math.round((Date.now()-t0)/1000)}s`);
  await screenshot(page, `${loja.key}-base-carregada`);

  // Verifica se seção de filtros apareceu
  const btnFiltroOk = await page.$('#ctl00_cph_btnAdicionarCampo').then(el => !!el).catch(() => false);
  if (!btnFiltroOk) {
    console.log('  ❌ Seção de filtros não apareceu');
    await screenshot(page, `${loja.key}-sem-filtro`);
    return [];
  }

  // Seleciona filtro "Dia/Mês do Aniversário" (value=20) e aguarda AJAX renderizar sub-campos
  await page.select('#ctl00_cph_ddlCRMFiltro', '20').catch(() => {});
  await SLEEP(2500); // AJAX do OI pode ser lento — aguarda renderização dos sub-campos

  // Aguarda campo txtDia aparecer
  await page.waitForSelector('#ctl00_cph_txtDia', { timeout: 15000 }).catch(() => {});

  // Seleciona "Dia/Mês Específico" (value=1) — usa evaluate para evitar detached node
  await page.evaluate(() => {
    const el = document.querySelector('#ctl00_cph_ddlDiaMes');
    if (el) { el.value = '1'; el.dispatchEvent(new Event('change', { bubbles: true })); }
  }).catch(() => {});
  await SLEEP(600);

  // Preenche dia e mês via click + type (necessário para ASP.NET reconhecer o input)
  await page.click('#ctl00_cph_txtDia', { clickCount: 3 }).catch(() => {});
  await page.type('#ctl00_cph_txtDia', String(dia)).catch(() => {});
  await page.click('#ctl00_cph_txtMes', { clickCount: 3 }).catch(() => {});
  await page.type('#ctl00_cph_txtMes', String(mes)).catch(() => {});
  await SLEEP(300);
  console.log(`  🎂 Filtro: dia=${dia}, mês=${mes}`);

  // Lê o total ANTES de incluir o filtro para detectar quando a página atualizar
  const totalAntes = await page.$eval(
    '[id*="TotalFiltrado"]',
    el => el.textContent.replace(/\D/g, '')
  ).catch(() => null);

  // Clica "Incluir Filtro no B.I." (pode ser navegação completa OU UpdatePanel AJAX)
  try {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
      page.click('#ctl00_cph_btnAdicionarCampo'),
    ]);
  } catch (_) {
    // UpdatePanel AJAX: aguarda o contador TotalFiltrado mudar (indica que o filtro foi aplicado)
    const limite = Date.now() + 60000; // até 60s para bases grandes
    while (Date.now() < limite) {
      await SLEEP(1500);
      const totalAgora = await page.$eval(
        '[id*="TotalFiltrado"]',
        el => el.textContent.replace(/\D/g, '')
      ).catch(() => null);
        // Considera aplicado quando o valor muda em relação ao que era antes do clique
      const mudou = totalAntes === null
        ? totalAgora !== null  // antes não existia → agora existe = aplicado
        : (totalAgora !== null && totalAgora !== totalAntes); // mudou de valor
      if (mudou) break;
    }
  }
  await SLEEP(1000);
  await screenshot(page, `${loja.key}-filtro-incluido`);

  // Lê o total filtrado para confirmar que o filtro foi aplicado
  const totalFiltrado = await page.$eval(
    '[id*="TotalFiltrado"]',
    el => el.textContent.replace(/\D/g, '')
  ).catch(async () => {
    const txt = await page.evaluate(() => document.body.innerText).catch(() => '');
    const m = txt.match(/(?:total\s+filtrado|filtrado)[:\s]+(\d+)/i);
    return m ? m[1] : null;
  });
  if (totalFiltrado !== null) {
    console.log(`  📊 Total filtrado: ${totalFiltrado}`);
    if (totalFiltrado === '0' || totalFiltrado === '') {
      console.log('  ℹ️  0 aniversariantes — pulando download');
      return [];
    }
    // Se o total filtrado igual ao total base, o filtro pode não ter sido aplicado
    if (totalFiltrado === totalVenda) {
      console.warn(`  ⚠️  Filtro pode não ter sido aplicado (total=${totalFiltrado} === base)`);
    }
  }

  // Baixa Excel
  console.log('  📥 Baixando Excel...');
  const t1 = Date.now();

  // Apaga qualquer CRMExcel.xls anterior para evitar confusão
  const excelPadrao = path.join(DEBUG_DIR, 'CRMExcel.xls');
  if (fs.existsSync(excelPadrao)) fs.unlinkSync(excelPadrao);

  // Re-inicializa CDP AGORA (após todas as navegações) para garantir download válido
  const cdp = await page.target().createCDPSession();
  ensureDir(DEBUG_DIR);
  await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: DEBUG_DIR });
  await SLEEP(300);

  // Auto-dismiss qualquer dialog que apareça (ex: "Nenhum resultado")
  page.once('dialog', async d => { await d.accept().catch(() => {}); });

  // Aguarda o botão estar visível antes de clicar
  await page.waitForSelector('#ctl00_cph_btnGerarExcel', { visible: true, timeout: 10000 }).catch(() => {});
  await SLEEP(500);
  // Usa evaluate para clicar — evita erro "not clickable" em elementos de ASP.NET
  await page.evaluate(() => {
    const btn = document.querySelector('#ctl00_cph_btnGerarExcel');
    if (btn) btn.click();
  }).catch(() => {});
  await SLEEP(1500);
  await screenshot(page, `${loja.key}-apos-gerar-excel`);

  // Poll: aguarda arquivo aparecer na pasta (o CDP salva como CRMExcel.xls)
  // 60 iterações para suportar bases grandes (BR01=15k, BR04=16k clientes)
  let excelPath = null;
  for (let i = 0; i < 60 && !excelPath; i++) {
    await SLEEP(1000);
    // CDP salva como "CRMExcel.xls" — aguarda o arquivo existir E estar completo (sem .crdownload)
    const crdownload = excelPadrao + '.crdownload';
    if (fs.existsSync(excelPadrao) && !fs.existsSync(crdownload)) {
      const mtime = fs.statSync(excelPadrao).mtimeMs;
      if (mtime >= t1 - 2000) {
        const dest = path.join(DEBUG_DIR, `aniv-${loja.key}-${t1}.xls`);
        fs.renameSync(excelPadrao, dest);
        excelPath = dest;
        console.log(`  💾 Excel salvo: ${path.basename(dest)}`);
      }
    }
  }

  if (!excelPath) {
    console.log('  ❌ Excel não obtido');
    await screenshot(page, `${loja.key}-sem-excel`);
    return [];
  }

  return parsearExcel(Buffer.from(fs.readFileSync(excelPath)), loja.nome);
}

// ── Parsear Excel ──────────────────────────────────────────────────────────────

function parsearExcel(buffer, lojaName) {
  let wb;
  try {
    wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  } catch (e) {
    console.log(`  ⚠️  Erro ao parsear Excel: ${e.message}`);
    return [];
  }

  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];

  // Converte para array de arrays (header:1 = primeira linha é cabeçalho)
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (rows.length < 2) return [];

  const header = rows[0].map(v => String(v).toLowerCase().replace(/[\s\n/]+/g, '_'));

  // Índices das colunas importantes
  const iNome = header.findIndex(h => h.includes('nome'));
  // Prefere "Telefone SMS" (coluna 10), depois qualquer telefone/celular
  const iTelSMS = header.findIndex(h => h.includes('sms'));
  const iTel1   = header.findIndex(h => h.includes('telefone') || h.includes('celular') || h.includes('fone'));
  const iTel    = iTelSMS >= 0 ? iTelSMS : iTel1;

  if (iNome < 0) {
    console.log('  ⚠️  Coluna "Nome" não encontrada no Excel');
    return [];
  }

  const clientes = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const nome = String(row[iNome] || '').trim();
    if (!nome || /^nome$/i.test(nome)) continue;
    const cel = iTel >= 0 ? String(row[iTel] || '').trim() : '';
    clientes.push({ nome, celular: cel, loja: lojaName });
  }

  console.log(`  👥 ${clientes.length} aniversariante(s) extraído(s)`);
  return clientes;
}

// ── Main ──────────────────────────────────────────────────────────────────────

function formatarCelular(cel) {
  const d = (cel || '').replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return cel;
}

async function main() {
  const { dia, mes } = parseArgs();
  const dStr = String(dia).padStart(2, '0');
  const mStr = String(mes).padStart(2, '0');
  const ano  = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', year: 'numeric' }).format(new Date());
  console.log(`\n🎂 BI Aniversariantes OI — ${dStr}/${mStr}/${ano}\n`);
  ensureDir(DEBUG_DIR);

  if (!process.env.OI_EMAIL || !process.env.OI_SENHA) {
    console.error('❌ OI_EMAIL e OI_SENHA são obrigatórios no .env'); process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    protocolTimeout: 120000,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
           '--disable-blink-features=AutomationControlled', '--window-size=1366,900'],
    defaultViewport: { width: 1366, height: 900 },
  });
  const page = await browser.newPage();
  await SLEEP(500); // aguarda a aba estar pronta antes de qualquer CDP call
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36');
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en-US'] });
  });

  const todos = []; // { nome, celular, loja }
  try {
    await login(page);
    for (const loja of LOJAS) {
      try {
        const clientes = await coletarLoja(page, loja, dia, mes);
        clientes.forEach(c => todos.push(c));
      } catch (e) {
        console.error(`  ❌ ${loja.key}: ${e.message}`);
        await screenshot(page, `erro-${loja.key}`);
      }
    }
  } finally {
    await browser.close();
  }

  // Dedup por nome+celular
  const visto = new Set();
  const unicos = todos.filter(c => {
    const k = `${c.nome.toLowerCase()}|${(c.celular || '').replace(/\D/g,'')}`;
    if (visto.has(k)) return false;
    visto.add(k);
    return true;
  });

  // Monta mensagem
  const linhas = [`🎂 *Aniversariantes — BI OI — ${dStr}/${mStr}/${ano}*\n`];
  if (unicos.length === 0) {
    linhas.push('Nenhum aniversariante encontrado no BI hoje.');
  } else {
    const porLoja = {};
    unicos.forEach(c => {
      if (!porLoja[c.loja]) porLoja[c.loja] = [];
      porLoja[c.loja].push(c);
    });
    for (const [lojaName, lista] of Object.entries(porLoja)) {
      linhas.push(`🏪 *${lojaName}* (${lista.length})`);
      lista.forEach(c => {
        const cel = formatarCelular(c.celular);
        linhas.push(`• ${c.nome}${cel ? ' | 📱 ' + cel : ''}`);
      });
      linhas.push('');
    }
    linhas.push(`_Total: ${unicos.length} aniversariante(s)_`);
  }
  linhas.push('_Fonte: BI CRM — Oficina Inteligente_');

  const mensagem = linhas.join('\n');
  console.log('\n─── RELATÓRIO ───');
  console.log(mensagem);
  console.log('────────────────\n');

  await enviarWA(mensagem);
}

main().catch(e => { console.error('\n❌ Fatal:', e.message); process.exit(1); });
