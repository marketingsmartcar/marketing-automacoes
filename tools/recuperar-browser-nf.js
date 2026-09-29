#!/usr/bin/env node
/**
 * recuperar-browser-nf.js
 * Lança NOVO browser, faz login na Peg Pneus, navega até a NF 1392378
 * e carrega os 130 itens. Rodar ANTES de nova-entrada-nf-calotas.js.
 *
 * Uso: node tools/recuperar-browser-nf.js
 */
require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const WS_FILE = 'C:/Users/Nick/AppData/Local/Temp/oi-browser-ws.txt';
const NF_URL  = 'https://sistemaoficinainteligente.com.br/wfEntradaImportacaoXML.aspx' +
                '?EmpresaID=rH%2FMzp13KwA%3D&EntradaID=HTbIBdHsfyM%3D' +
                '&ChaveNFe=trEyo%2BrXNPIAuZAX2cmYyiUYfnWw7a0K%2B20Sr%2BEpZ7sPo1SmtCM63aacuMkHWuO7';

(async () => {
  // Tentar conectar ao browser existente primeiro
  let browser;
  if (fs.existsSync(WS_FILE)) {
    const ws = fs.readFileSync(WS_FILE, 'utf8').trim();
    try {
      browser = await puppeteer.connect({ browserWSEndpoint: ws, defaultViewport: null, protocolTimeout: 10000 });
      console.log('✅ Conectado ao browser existente');
    } catch {
      console.log('⚠️  Browser anterior travado — lançando novo...');
      browser = null;
    }
  }

  if (!browser) {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--remote-debugging-port=9222', '--start-maximized', '--no-sandbox']
    });
    fs.writeFileSync(WS_FILE, browser.wsEndpoint());
    console.log('✅ Novo browser aberto');

    // Login
    const page = (await browser.pages())[0];
    page.setDefaultTimeout(30000);
    await page.goto('https://sistemaoficinainteligente.com.br/Entrar.aspx?sair=1', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#Login1_UserName');
    await page.click('#Login1_UserName', { clickCount: 3 });
    await page.type('#Login1_UserName', process.env.OI_EMAIL, { delay: 20 });
    await page.click('#Login1_Password', { clickCount: 3 });
    await page.type('#Login1_Password', process.env.OI_SENHA, { delay: 20 });
    await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('#Login1_LoginButton')]);
    console.log('✅ Login feito');

    // Trocar para Peg Pneus (3098)
    await page.evaluate(() => {
      const sel = document.getElementById('ddlTrocarEmpresa');
      if (sel) { sel.value = '3098'; sel.dispatchEvent(new Event('change', { bubbles: true })); }
    });
    await page.waitForNetworkIdle({ idleTime: 800, timeout: 10000 }).catch(() => {});
    console.log('✅ Peg Pneus ativo');
  }

  // Abrir aba da NF
  const pages = await browser.pages();
  let nfPage = pages.find(p => p.url().includes('wfEntradaImportacaoXML'));
  if (!nfPage) {
    nfPage = await browser.newPage();
  }
  nfPage.setDefaultTimeout(30000);

  console.log('Abrindo NF 1392378...');
  await nfPage.goto(NF_URL, { waitUntil: 'domcontentloaded' });
  await sleep(2000);

  // Garantir Peg Pneus selecionada
  await nfPage.evaluate(() => {
    const sel = document.getElementById('ddlUsuarioEmpresa');
    if (sel && sel.value !== '3098') { sel.value = '3098'; sel.dispatchEvent(new Event('change', { bubbles: true })); }
  });

  // Aceitar checkboxes se existirem
  await nfPage.evaluate(() => {
    document.querySelectorAll('input[type=checkbox]').forEach(c => { if (!c.checked) c.click(); });
  });
  await sleep(300);

  // Carregar NF pela chave de acesso
  console.log('Carregando NF via chave de acesso...');
  await nfPage.click('#btnCarregarPorID');
  await nfPage.waitForNetworkIdle({ idleTime: 1000, timeout: 30000 }).catch(() => {});
  await sleep(1000);

  // Verificar itens
  const nItens = await nfPage.evaluate(() =>
    document.querySelectorAll('a[id*="lkbBuscarProduto"]').length
  );
  console.log(`Itens carregados: ${nItens}`);

  if (nItens === 130) {
    console.log('\n✅ NF pronta! Agora rode:');
    console.log('   node tools/nova-entrada-nf-calotas.js');
  } else {
    console.log(`⚠️  Esperado 130, encontrado ${nItens}. Verifique a aba no browser.`);
  }

  browser.disconnect();
  console.log('\nBrowser continua aberto. Não feche!');
})().catch(e => console.error('ERRO:', e.message));
