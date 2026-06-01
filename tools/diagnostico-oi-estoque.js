'use strict';
/**
 * Diagnóstico: faz login no OI, navega para Estoque > Produtos
 * e salva um screenshot + o HTML da página para análise.
 * node tools/diagnostico-oi-estoque.js
 */
require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://sistemaoficinainteligente.com.br';
const LOGIN_URL = `${BASE_URL}/Entrar.aspx?sair=1`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const browser = await puppeteer.launch({
    headless: false, // VISÍVEL para diagnóstico
    args: ['--start-maximized'],
    defaultViewport: null,
  });
  const page = await browser.newPage();

  try {
    // Login
    console.log('1. Fazendo login...');
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForSelector('#Login1_UserName', { timeout: 30000 });
    await page.type('#Login1_UserName', process.env.OI_EMAIL, { delay: 30 });
    await page.type('#Login1_Password', process.env.OI_SENHA, { delay: 30 });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
      page.click('#Login1_btnEntrar'),
    ]);
    console.log('   Login OK:', page.url());

    // Espera 2s para estabilizar
    await sleep(2000);

    // Tenta navegar para possíveis URLs de produto
    const urlsParaTestar = [
      `${BASE_URL}/wfPesquisaProduto.aspx`,
      `${BASE_URL}/wfCadastroProduto.aspx`,
      `${BASE_URL}/wfProduto.aspx`,
      `${BASE_URL}/wfEstoqueProduto.aspx`,
    ];

    for (const url of urlsParaTestar) {
      console.log(`\n2. Tentando: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 }).catch(e => console.log('   Erro:', e.message));
      const title = await page.title();
      const currentUrl = page.url();
      console.log(`   Título: ${title} | URL: ${currentUrl}`);

      if (!currentUrl.includes('Entrar')) {
        // Salva screenshot
        const name = url.split('/').pop().replace('.aspx', '');
        await page.screenshot({ path: `output/debug-${name}.png`, fullPage: true });
        const html = await page.content();
        fs.writeFileSync(`output/debug-${name}.html`, html.slice(0, 50000));
        console.log(`   ✅ Screenshot salvo: output/debug-${name}.png`);

        // Lista todos os elementos de formulário
        const forms = await page.evaluate(() => {
          const selects = Array.from(document.querySelectorAll('select')).map(s => ({
            id: s.id, name: s.name, optCount: s.options.length,
            opts: Array.from(s.options).slice(0,5).map(o => o.text.trim())
          }));
          const inputs = Array.from(document.querySelectorAll('input')).map(i => ({
            id: i.id, name: i.name, type: i.type, value: i.value
          }));
          const buttons = Array.from(document.querySelectorAll('input[type=button],input[type=submit],button')).map(b => ({
            id: b.id, value: b.value || b.innerText
          }));
          return { selects, inputs: inputs.slice(0,20), buttons };
        });
        console.log('   Selects:', JSON.stringify(forms.selects.slice(0,5)));
        console.log('   Buttons:', JSON.stringify(forms.buttons.slice(0,5)));
        break;
      }
    }

    console.log('\n✅ Diagnóstico concluído. Analise os screenshots em output/');
    console.log('   Pressione Ctrl+C para fechar o navegador.');
    await sleep(30000); // Mantém aberto 30s para inspeção manual
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error('ERRO:', e); process.exit(1); });
