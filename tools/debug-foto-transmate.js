#!/usr/bin/env node
'use strict';
require('dotenv').config();
const puppeteer = require('puppeteer');

const BASE_OI  = 'https://sistemaoficinainteligente.com.br';
const OI_EMAIL = process.env.OI_EMAIL;
const OI_SENHA  = process.env.OI_SENHA;

// PNEU 195 60 15 TRANSMATE TRANSERENUS ECO 88V — tem btnFoto mas "Sem foto"
const EMPRESA_ID = '+aaJISeGfbQ=';
const PRODUTO_ID = '4jwQ7g99DwKk6eGkkaXl4A==';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-blink-features=AutomationControlled'],
    defaultViewport: { width: 1280, height: 900 },
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
  await page.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });

  await page.goto(`${BASE_OI}/Entrar.aspx?sair=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(2000);
  await page.type('#Login1_UserName', OI_EMAIL, { delay: 40 });
  await page.type('#Login1_Password', OI_SENHA, { delay: 40 });
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
    page.click('#Login1_btnEntrar'),
  ]);
  await sleep(2000);

  const url = `${BASE_OI}/wfProduto.aspx?EmpresaID=${encodeURIComponent(EMPRESA_ID)}&ProdutoID=${encodeURIComponent(PRODUTO_ID)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(800);

  await page.evaluate(() => {
    const tab = document.getElementById('__tab_tab_tabDocumento');
    if (tab) tab.click();
  });
  await sleep(1500);

  // Todos os links na aba de fotos
  const links = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[id*="ucProdutoDocumento_grd"] a'))
      .map(a => ({ id: a.id, text: a.innerText?.trim(), onclick: a.getAttribute('onclick') }))
  );
  console.log('Links na grid:', JSON.stringify(links, null, 2));

  // Linhas da grid com tds
  const rows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('#tab_tabDocumento_ucProdutoDocumento_grd tr')).slice(1)
      .map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.innerText?.trim().slice(0, 100)));
  });
  console.log('Linhas:', JSON.stringify(rows, null, 2));

  await browser.close();
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
