#!/usr/bin/env node
'use strict';
/**
 * debug-foto-download.js
 * Testa o fluxo completo: login → produto → aba fotos → download da imagem
 */
require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');

const BASE_OI  = 'https://sistemaoficinainteligente.com.br';
const OI_EMAIL = process.env.OI_EMAIL;
const OI_SENHA  = process.env.OI_SENHA;

const EMPRESA_ID = '+aaJISeGfbQ=';
const PRODUTO_ID = '/MBYP2i3453rq/4UXdftbQ=='; // PNEU 195 65 15 COMPASAL BLAZER 91H

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
  console.log('Login:', page.url());

  // Abre produto
  const url = `${BASE_OI}/wfProduto.aspx?EmpresaID=${encodeURIComponent(EMPRESA_ID)}&ProdutoID=${encodeURIComponent(PRODUTO_ID)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(800);

  // Clica aba fotos
  await page.evaluate(() => {
    const tab = document.getElementById('__tab_tab_tabDocumento');
    if (tab) tab.click();
  });
  await sleep(1500);

  // Extrai URLs
  const urlsFoto = await page.evaluate((base) => {
    const links = Array.from(document.querySelectorAll('[id*="lkbVisualizar"]'));
    return links.map(a => {
      const onclick = a.getAttribute('onclick') || '';
      const match = onclick.match(/fncNovaAba\('([^']+)'\)/);
      if (!match) return null;
      const caminho = match[1];
      if (!/\.(png|jpg|jpeg|gif|webp)$/i.test(caminho)) return null;
      return base + caminho;
    }).filter(Boolean);
  }, BASE_OI);

  console.log('\nURLs de foto encontradas:', urlsFoto);

  if (!urlsFoto.length) {
    console.log('❌ Nenhuma URL de foto encontrada');
    await browser.close();
    return;
  }

  // Baixa a primeira imagem
  const imgUrl = urlsFoto[0];
  console.log('\n→ Baixando:', imgUrl);
  const bytes = await page.evaluate(async (u) => {
    try {
      const res = await fetch(u, { credentials: 'include' });
      if (!res.ok) { console.log('HTTP', res.status); return null; }
      const buf = await res.arrayBuffer();
      return [...new Uint8Array(buf)];
    } catch (e) { return null; }
  }, imgUrl);

  if (!bytes) {
    console.log('❌ Download falhou (null)');
  } else {
    const buffer = Buffer.from(bytes);
    console.log(`✅ Imagem baixada: ${buffer.length} bytes`);
    fs.mkdirSync('debug', { recursive: true });
    fs.writeFileSync('debug/foto-teste.png', buffer);
    console.log('Salva em debug/foto-teste.png');
  }

  await browser.close();
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
