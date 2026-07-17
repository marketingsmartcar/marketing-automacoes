'use strict';
/**
 * tools/scraper-meta-pix.js
 *
 * Raspa o histórico de PIX de todas as contas Meta Ads
 * via Meta Business Suite e salva em ads_recargas no Supabase.
 *
 * Uso:
 *   node tools/scraper-meta-pix.js
 *   node tools/scraper-meta-pix.js --dry-run   (preview sem salvar)
 *   node tools/scraper-meta-pix.js --reset-session  (apaga sessão salva)
 */

require('dotenv').config();

const puppeteer  = require('puppeteer');
const fs         = require('fs');
const path       = require('path');

const SUPABASE_URL = process.env.NEXUSZ_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY;
const FB_EMAIL     = process.env.META_FB_EMAIL;
const FB_PASSWORD  = process.env.META_FB_PASSWORD;

const SESSION_FILE = path.join(__dirname, '..', '.meta-session.json');
const HEADLESS     = process.env.META_HEADLESS === 'true'; // false por padrão (Facebook bloqueia headless)

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Supabase não configurado'); process.exit(1);
}
if (!FB_EMAIL || !FB_PASSWORD) {
  console.error('❌ META_FB_EMAIL / META_FB_PASSWORD não configurados'); process.exit(1);
}

// Mapeamento conta_label → ad account ID (sem "act_")
const CONTAS = [
  { label: 'BR PNEUS AMERICANA',   id: process.env.META_ACCOUNT_BR_AMERICANA?.replace(/^act_/, ''),   tipo: 'saldo'  },
  { label: 'BR PNEUS SÃO CARLOS',  id: process.env.META_ACCOUNT_BR_SAO_CARLOS?.replace(/^act_/, ''),  tipo: 'fundos' },
  { label: 'BR PNEUS ARARAQUARA',  id: process.env.META_ACCOUNT_BR_ARARAQUARA?.replace(/^act_/, ''),  tipo: 'fundos' },
  { label: 'PEG PNEUS ARARAQUARA', id: process.env.META_ACCOUNT_PEG_ARARAQUARA?.replace(/^act_/, ''), tipo: 'saldo'  },
].filter(c => c.id);

const sbHeaders = {
  apikey:         SUPABASE_KEY,
  Authorization:  `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

function contaKey(label) {
  return label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_meta';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Sessão ────────────────────────────────────────────────────────────────────

async function salvarSessao(page) {
  const cookies = await page.cookies();
  const storage = await page.evaluate(() => ({
    local:   { ...localStorage },
    session: { ...sessionStorage },
  }));
  fs.writeFileSync(SESSION_FILE, JSON.stringify({ cookies, storage }, null, 2));
  console.log('  💾 Sessão salva');
}

async function carregarSessao(page) {
  if (!fs.existsSync(SESSION_FILE)) return false;
  try {
    const { cookies, storage } = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    await page.setCookie(...cookies);
    await page.evaluate(({ local, session }) => {
      for (const [k, v] of Object.entries(local))   localStorage.setItem(k, v);
      for (const [k, v] of Object.entries(session)) sessionStorage.setItem(k, v);
    }, storage);
    return true;
  } catch { return false; }
}

// ── Login ─────────────────────────────────────────────────────────────────────

async function fazerLogin(page) {
  console.log('  🔐 Fazendo login no Facebook...');

  // Configurar user-agent realista para evitar detecção
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  );

  await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(2000);

  // Tentar múltiplos seletores para email
  const emailSel = ['#email', 'input[name="email"]', 'input[type="email"]', 'input[autocomplete="email"]'];
  let emailFound = false;
  for (const sel of emailSel) {
    try {
      await page.waitForSelector(sel, { timeout: 5000 });
      await page.click(sel);
      await page.type(sel, FB_EMAIL, { delay: 80 });
      emailFound = true;
      console.log(`  ✅ Campo email encontrado: ${sel}`);
      break;
    } catch (_) {}
  }

  if (!emailFound) {
    // Tirar screenshot para debug
    await page.screenshot({ path: path.join(__dirname, '..', 'debug-login.png'), fullPage: true });
    console.log('  📸 Screenshot salvo: debug-login.png');
    console.log('  ⚠️  Campo email não encontrado. O navegador está aberto — faça login manualmente e pressione Enter...');
    await new Promise(r => process.stdin.once('data', r));
    await salvarSessao(page);
    return;
  }

  // Senha
  const passSel = ['#pass', 'input[name="pass"]', 'input[type="password"]'];
  for (const sel of passSel) {
    try {
      await page.waitForSelector(sel, { timeout: 3000 });
      await page.click(sel);
      await page.type(sel, FB_PASSWORD, { delay: 80 });
      break;
    } catch (_) {}
  }

  // Submit
  await page.keyboard.press('Enter');
  await sleep(5000);

  // Verificar resultado
  const url = page.url();
  if (url.includes('login') || url.includes('checkpoint') || url.includes('two_step')) {
    console.log('  ⚠️  Verificação necessária (2FA ou checkpoint). Complete no navegador...');
    console.log('  ⏳ Aguardando até 2 minutos... pressione Enter quando terminar');
    await Promise.race([
      new Promise(r => process.stdin.once('data', r)),
      sleep(120000),
    ]);
  }

  await salvarSessao(page);
  console.log('  ✅ Login realizado');
}

// ── Scraping de pagamentos ────────────────────────────────────────────────────

async function rasparPagamentos(page, conta) {
  // URL da atividade de pagamento por conta no Business Manager
  const url = `https://business.facebook.com/billing/payment_activity/?act=${conta.id}&business_id=all`;

  console.log(`\n  🔄 ${conta.label}`);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(3000);

  // Tentar extrair via API interna que o Business Suite usa
  const pixData = await page.evaluate(async (accountId) => {
    // Tenta interceptar dados já carregados na página
    const textos = [];

    // Buscar linhas da tabela de pagamentos
    const rows = document.querySelectorAll('table tbody tr, [role="row"]');
    for (const row of rows) {
      const cells = row.querySelectorAll('td, [role="cell"]');
      if (cells.length >= 2) {
        const texto = Array.from(cells).map(c => c.innerText.trim()).join(' | ');
        if (texto) textos.push(texto);
      }
    }
    return textos;
  }, conta.id);

  if (pixData.length === 0) {
    // Tentar via GraphQL interno do Meta (intercept)
    await page.goto(`https://business.facebook.com/ads/manager/billing/?act=${conta.id}`, {
      waitUntil: 'networkidle2', timeout: 30000,
    });
    await sleep(4000);

    // Clicar em "Atividade de pagamentos" se visível
    const btnTextos = await page.evaluate(() => {
      const links = [...document.querySelectorAll('a, button')];
      return links.map(l => l.innerText?.trim()).filter(t => t && t.length < 50);
    });
    console.log(`    Botões encontrados:`, btnTextos.slice(0, 10).join(', '));
  }

  return pixData;
}

// Abordagem alternativa: interceptar chamadas de rede do Meta
async function rasparViaNetwork(browser, conta) {
  const page = await browser.newPage();
  const pagamentos = [];

  // Interceptar respostas da API interna do Meta
  page.on('response', async (res) => {
    const url = res.url();
    if (
      (url.includes('payment_activity') || url.includes('billing') || url.includes('transaction')) &&
      res.headers()['content-type']?.includes('json')
    ) {
      try {
        const json = await res.json();
        console.log(`    📡 API: ${url.slice(0, 80)}`);
        if (json.data) console.log(`    → ${JSON.stringify(json.data).slice(0, 200)}`);
      } catch (_) {}
    }
  });

  const url = `https://business.facebook.com/billing/payment_activity/?act=${conta.id}`;
  console.log(`  🌐 Abrindo: ${url.slice(0, 80)}`);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(5000);

    // Screenshot para debug
    const shotPath = path.join(__dirname, '..', `debug-meta-${conta.id}.png`);
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log(`    📸 Screenshot: ${path.basename(shotPath)}`);

    // Tentar extrair dados da tabela
    const linhas = await page.evaluate(() => {
      const result = [];

      // Meta Business Suite usa divs com role="row"
      const rows = document.querySelectorAll('[role="row"], table tr');
      for (const row of rows) {
        const text = row.innerText?.trim().replace(/\n+/g, ' | ');
        if (text && text.length > 5 && text.length < 300) result.push(text);
      }

      // Fallback: pegar todo texto relevante
      if (result.length === 0) {
        const divs = document.querySelectorAll('[class*="payment"], [class*="billing"], [class*="transaction"]');
        for (const d of divs) {
          const t = d.innerText?.trim();
          if (t && t.length > 5) result.push(t.slice(0, 200));
        }
      }

      return result;
    });

    console.log(`    📋 ${linhas.length} linha(s) encontrada(s):`);
    linhas.slice(0, 10).forEach((l, i) => console.log(`    [${i}] ${l}`));

    pagamentos.push(...linhas);
  } catch (err) {
    console.warn(`    ⚠️  Erro: ${err.message}`);
  }

  await page.close();
  return pagamentos;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const dryRun      = process.argv.includes('--dry-run');
  const resetSess   = process.argv.includes('--reset-session');

  if (resetSess && fs.existsSync(SESSION_FILE)) {
    fs.unlinkSync(SESSION_FILE);
    console.log('🗑️  Sessão apagada');
  }

  console.log(`\n💳 Scraper Meta PIX — ${new Date().toLocaleString('pt-BR')}`);
  console.log(`   ${CONTAS.length} conta(s) | headless: ${HEADLESS} | dry-run: ${dryRun}\n`);

  const browser = await puppeteer.launch({
    headless: HEADLESS,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--lang=pt-BR,pt',
      '--disable-blink-features=AutomationControlled',
    ],
    defaultViewport: { width: 1280, height: 900 },
    ignoreDefaultArgs: ['--enable-automation'],
  });

  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'pt-BR,pt;q=0.9' });

    // Sessão ou login
    const temSessao = await carregarSessao(page);
    if (temSessao) {
      console.log('  ♻️  Sessão carregada do cache');
      await page.goto('https://business.facebook.com', { waitUntil: 'networkidle2' });
      await sleep(2000);
      const logado = !page.url().includes('login');
      if (!logado) {
        console.log('  ⚠️  Sessão expirada — fazendo login novamente');
        await fazerLogin(page);
      } else {
        console.log('  ✅ Sessão válida');
      }
    } else {
      await fazerLogin(page);
    }

    // Raspar cada conta
    const todasLinhas = [];
    for (const conta of CONTAS) {
      const linhas = await rasparViaNetwork(browser, conta);
      todasLinhas.push({ conta, linhas });
    }

    console.log('\n\n📊 RESUMO DOS DADOS COLETADOS:');
    console.log('='.repeat(60));
    for (const { conta, linhas } of todasLinhas) {
      console.log(`\n${conta.label}:`);
      if (linhas.length === 0) {
        console.log('  (sem dados detectados)');
      } else {
        linhas.forEach(l => console.log(`  • ${l}`));
      }
    }

    console.log('\n\n💡 PRÓXIMOS PASSOS:');
    console.log('  Se os dados apareceram corretamente acima, vou implementar');
    console.log('  o parser para extrair data+valor e salvar no Supabase.');
    console.log('\n  Se apareceu apenas estrutura vazia, execute com:');
    console.log('  META_HEADLESS=false node tools/scraper-meta-pix.js');
    console.log('  para ver o navegador e identificar o seletor correto.');

  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error('❌', e.message || e); process.exit(1); });
