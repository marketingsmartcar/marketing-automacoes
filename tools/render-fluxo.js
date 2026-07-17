'use strict';
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const HTML = path.resolve(__dirname, '..', 'output', 'fluxos', 'fluxo-peg-atendimento.html');
const PNG  = HTML.replace('.html', '.png');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  await page.goto('file:///' + HTML.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });

  // Mede o tamanho real do conteúdo
  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  await page.setViewport({ width: 1000, height: bodyHeight, deviceScaleFactor: 2 });
  await page.goto('file:///' + HTML.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });

  await page.screenshot({ path: PNG, fullPage: true });
  await browser.close();

  console.log('✅ PNG gerado:', PNG);
})();
