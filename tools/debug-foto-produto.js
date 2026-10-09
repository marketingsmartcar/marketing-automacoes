#!/usr/bin/env node
'use strict';
/**
 * debug-foto-produto.js v2
 * Investiga como acessar a foto real de um produto via link "Visualizar".
 */
require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');

const BASE_OI  = 'https://sistemaoficinainteligente.com.br';
const OI_EMAIL = process.env.OI_EMAIL;
const OI_SENHA  = process.env.OI_SENHA;

// Produto com btnFoto confirmado
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
  page.on('dialog', async d => { console.log('Dialog:', d.message().slice(0, 80)); try { await d.dismiss(); } catch (e) {} });

  // Login
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

  // Abre o produto direto na aba de fotos
  const url = `${BASE_OI}/wfProduto.aspx?EmpresaID=${encodeURIComponent(EMPRESA_ID)}&ProdutoID=${encodeURIComponent(PRODUTO_ID)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(1500);

  // Clica na aba Fotos e Documentos
  await page.evaluate(() => {
    const tab = document.getElementById('__tab_tab_tabDocumento');
    if (tab) tab.click();
  });
  await sleep(2000);

  // Salva HTML completo do painel de fotos
  const painelHtml = await page.evaluate(() =>
    document.getElementById('tab_tabDocumento')?.innerHTML || 'SEM PAINEL'
  );
  fs.mkdirSync('debug', { recursive: true });
  fs.writeFileSync('debug/foto-produto-html.html', painelHtml);
  console.log('HTML salvo:', painelHtml.length, 'chars');

  // Lista todos os links na grid
  const linksGrid = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[id*="ucProdutoDocumento_grd"] a'))
      .map(a => ({ id: a.id, text: a.innerText?.trim(), onclick: a.getAttribute('onclick') }))
  );
  console.log('\nLinks na grid:', JSON.stringify(linksGrid, null, 2));

  // Verifica linhas da grid de documentos
  const rowsGrid = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('#tab_tabDocumento_ucProdutoDocumento_grd tr')).slice(1);
    return rows.map(tr => {
      const tds = Array.from(tr.querySelectorAll('td')).map(td => td.innerText?.trim().slice(0, 80));
      const imgs = Array.from(tr.querySelectorAll('img')).map(i => ({ id: i.id, src: i.src?.slice(0, 100) }));
      return { tds, imgs };
    });
  });
  console.log('\nLinhas da grid:', JSON.stringify(rowsGrid, null, 2));

  // Clica em "Visualizar" do primeiro item — monitorando nova aba
  const linkVisId = '#tab_tabDocumento_ucProdutoDocumento_grd_ctl02_lkbVisualizar';
  const linkVis = await page.$(linkVisId);

  if (!linkVis) {
    console.log('\n⚠️  Link Visualizar não encontrado:', linkVisId);
  } else {
    console.log('\n→ Clicando em Visualizar...');

    let novaPage = null;
    const novaAbaPromise = new Promise(resolve => {
      browser.once('targetcreated', async t => {
        if (t.type() === 'page') resolve(await t.page());
        else resolve(null);
      });
    });

    await linkVis.click();

    // Espera 3s para nova aba ou resposta da página atual
    const result = await Promise.race([
      novaAbaPromise,
      sleep(3000).then(() => null),
    ]);

    if (result) {
      novaPage = result;
      await sleep(1000);
      const novaUrl = novaPage.url();
      console.log('Nova aba URL:', novaUrl);

      // Captura src da primeira imagem grande
      const imgInfo = await novaPage.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img')).filter(i => i.naturalWidth > 80 || i.src.startsWith('data:'));
        return imgs.map(i => ({ id: i.id, src: i.src?.slice(0, 200), w: i.naturalWidth, h: i.naturalHeight }));
      });
      console.log('Imagens na nova aba:', JSON.stringify(imgInfo, null, 2));

      // Salva o HTML da nova aba
      const htmlAba = await novaPage.content();
      fs.writeFileSync('debug/foto-nova-aba.html', htmlAba);
      console.log('HTML nova aba salvo (', htmlAba.length, 'chars)');
      await novaPage.close();
    } else {
      console.log('Sem nova aba — verificando mudança na página atual...');
      await sleep(1000);

      const preview = await page.evaluate(() => {
        const div = document.getElementById('previewFoto');
        const img = div?.querySelector('img');
        const allBigImgs = Array.from(document.querySelectorAll('img'))
          .filter(i => i.naturalWidth > 80 || i.src.startsWith('data:'))
          .map(i => ({ id: i.id, src: i.src?.slice(0, 200), w: i.naturalWidth, h: i.naturalHeight }));
        return {
          previewHtml: div?.innerHTML?.slice(0, 500),
          imgSrc: img?.src?.slice(0, 200),
          imgW: img?.naturalWidth,
          imgH: img?.naturalHeight,
          allBigImgs,
        };
      });
      console.log('Preview e imagens após Visualizar:', JSON.stringify(preview, null, 2));
    }
  }

  await browser.close();
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
