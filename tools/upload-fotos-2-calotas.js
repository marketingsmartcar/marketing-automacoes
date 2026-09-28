#!/usr/bin/env node
/**
 * upload-fotos-2-calotas.js
 * Faz upload das fotos apenas para CAL226CBPTAU e CAL213CPTAU.
 */
require('dotenv').config();
const puppeteer = require('puppeteer');
const fs        = require('fs');
const path      = require('path');
const os        = require('os');
const https     = require('https');

const OI_URL  = 'https://sistemaoficinainteligente.com.br';
const PEG_VAL = '3098';
const OI_EMAIL = process.env.OI_EMAIL;
const OI_SENHA = process.env.OI_SENHA;

const ITENS = [
  { codigo: 'CAL226CBPTAU', cod_chg: '0909802' },
  { codigo: 'CAL213CPTAU',  cod_chg: '1051449' },
];

function log(msg) { console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`); }
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function httpGetCHGJson(cookies, termo) {
  return new Promise((resolve, reject) => {
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const params = new URLSearchParams({ format: 'raw', view: 'GetListaProd', skip: '0', desc: termo, marca: '', linha: '' }).toString();
    const options = {
      hostname: 'loja.chg.com.br',
      path: `/portal-do-cliente?${params}`,
      rejectUnauthorized: false,
      headers: { Cookie: cookieStr, 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', Referer: 'https://loja.chg.com.br/portal-do-cliente?view=Produtos' },
    };
    const req = https.request(options, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('CHG timeout')); });
    req.end();
  });
}

async function buscarFotoCHG(cookies, codCHG) {
  const data = await httpGetCHGJson(cookies, codCHG).catch(() => null);
  if (!Array.isArray(data) || !data[0] || data[0].produto === 'STOP') return null;
  const prod = data[0];
  if (!prod.imagem || !prod.imagem.startsWith('data:image')) return null;
  const m = prod.imagem.match(/^data:image\/\w+;base64,(.+)$/s);
  if (!m || m[1].length < 100) return null;
  const buf = Buffer.from(m[1], 'base64');
  const f = path.join(os.tmpdir(), `calota_upload_${codCHG}.jpg`);
  fs.writeFileSync(f, buf);
  return f;
}

async function loginOI(page) {
  await page.goto(`${OI_URL}/Entrar.aspx?sair=1`, { waitUntil: 'domcontentloaded', timeout: 40000 });
  await page.waitForSelector('#Login1_UserName', { timeout: 15000 });
  await page.click('#Login1_UserName', { clickCount: 3 });
  await page.type('#Login1_UserName', OI_EMAIL, { delay: 30 });
  await page.click('#Login1_Password', { clickCount: 3 });
  await page.type('#Login1_Password', OI_SENHA, { delay: 30 });
  await page.click('#Login1_btnEntrar');
  await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(2000);
}

async function trocarParaPeg(page) {
  await page.goto(`${OI_URL}/wfCRMBI.aspx`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(800);
  const atual = await page.$eval('#ctl00_cph_ddlUsuarioEmpresa', e => e.value).catch(() => null);
  if (atual !== PEG_VAL) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {}),
      page.select('#ctl00_cph_ddlUsuarioEmpresa', PEG_VAL),
    ]);
    await sleep(1500);
  }
}

(async () => {
  const cookies = JSON.parse(fs.readFileSync(path.join('output', 'chg-cookies.json'), 'utf8'));

  // ProtocolTimeout maior para upload não travar
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    protocolTimeout: 180000,
    args: ['--start-maximized', '--no-sandbox'],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(30000);

  log('🔐 Login OI...');
  await loginOI(page);
  await trocarParaPeg(page);
  log('✅ OI — Peg Pneus\n');

  for (const item of ITENS) {
    log(`── ${item.codigo} ──`);

    // Busca foto no CHG
    const fotoArquivo = await buscarFotoCHG(cookies, item.cod_chg);
    if (!fotoArquivo) { log('  ❌ Foto não encontrada no CHG'); continue; }
    log('  ✅ Foto CHG obtida');

    // Busca produto na OI
    await page.goto(`${OI_URL}/wfProdutoBusca.aspx`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(400);
    await page.click('#ctl00_cph_txtProdutoID', { clickCount: 3 });
    await page.type('#ctl00_cph_txtProdutoID', item.codigo, { delay: 20 });
    await page.evaluate(() => __doPostBack('ctl00$cph$btnBuscar', ''));
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
    await sleep(800);

    // Extrai URL do link do produto (evita abrir nova aba)
    const linkInfo = await page.evaluate((cod) => {
      const link = Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim() === cod);
      if (!link) return null;
      return { href: link.href, onclick: link.getAttribute('onclick') || '' };
    }, item.codigo);

    if (!linkInfo) {
      log(`  ❌ Produto não encontrado na OI (sem link)`);
      continue;
    }
    log(`  ✅ Produto encontrado na OI`);

    // Navega diretamente para a página de edição
    let editUrl = linkInfo.href;
    // Se o href é javascript: ou vazio, tenta extrair do onclick
    if (!editUrl || editUrl.includes('javascript:') || editUrl === 'about:blank') {
      // tenta usar o link de busca com parâmetro direto
      const onclickM = linkInfo.onclick.match(/wfProduto\.aspx[^'"]+/i);
      if (onclickM) editUrl = `${OI_URL}/${onclickM[0]}`;
    }

    if (!editUrl || editUrl.includes('javascript:')) {
      // Fallback: clica e usa a página atual (mesmo tab)
      await page.evaluate((cod) => {
        const link = Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim() === cod);
        if (link) link.click();
      }, item.codigo);
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      await sleep(2000);

      // Clica aba Fotos
      await page.click('#__tab_tab_tabDocumento').catch(() => {});
      await sleep(3000);

      const fi2 = await page.$('#tab_tabDocumento_ucProdutoDocumento_flp');
      if (!fi2) { log('  ❌ Input não encontrado (fallback)'); continue; }
      await fi2.uploadFile(fotoArquivo);
      await sleep(1500);
      const btn2 = await page.$('#btnSalvarDocumento');
      if (!btn2) { log('  ❌ Botão salvar não encontrado (fallback)'); continue; }
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
        btn2.click(),
      ]);
      await sleep(3000);
      log('  📸 Foto cadastrada ✅ (fallback)');
      continue;
    }

    await page.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    page.setDefaultTimeout(60000);
    await sleep(2000);

    // Clica aba Fotos
    await page.click('#__tab_tab_tabDocumento').catch(() => {});
    await sleep(3000);

    // Upload
    const fi = await page.$('#tab_tabDocumento_ucProdutoDocumento_flp');
    if (!fi) { log('  ❌ Input de arquivo não encontrado'); continue; }

    await fi.uploadFile(fotoArquivo);
    await sleep(1500);

    const btn = await page.$('#btnSalvarDocumento');
    if (!btn) { log('  ❌ Botão salvar não encontrado'); continue; }

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
      btn.click(),
    ]);
    await sleep(3000);

    log('  📸 Foto cadastrada ✅');
    await sleep(1000);
  }

  log('\n✅ Concluído');
  await sleep(3000);
  await browser.close();
})();
