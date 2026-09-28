#!/usr/bin/env node
// Debug: testa o save de produto na OI — captura URL e conteúdo antes/depois
require('dotenv').config();
const puppeteer = require('puppeteer');

const OI_URL  = 'https://sistemaoficinainteligente.com.br';
const PEG_VAL = '3098';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    protocolTimeout: 180000,
    args: ['--start-maximized'],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);

  // Login
  await page.goto(`${OI_URL}/Entrar.aspx?sair=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#Login1_UserName');
  await page.click('#Login1_UserName', { clickCount: 3 });
  await page.type('#Login1_UserName', process.env.OI_EMAIL, { delay: 30 });
  await page.click('#Login1_Password', { clickCount: 3 });
  await page.type('#Login1_Password', process.env.OI_SENHA, { delay: 30 });
  await page.click('#Login1_btnEntrar');
  await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await sleep(2000);
  console.log('Login OK — URL:', page.url());

  // Troca para Peg Pneus
  await page.goto(`${OI_URL}/wfCRMBI.aspx`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(800);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {}),
    page.select('#ctl00_cph_ddlUsuarioEmpresa', PEG_VAL),
  ]);
  await sleep(1500);
  console.log('Peg Pneus selecionada');

  // Abre busca de produtos
  await page.goto(`${OI_URL}/wfProdutoBusca.aspx`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForSelector('#ctl00_cph_btnNovo', { timeout: 15000 });
  console.log('Página de busca OK');

  // Abre formulário novo produto (nova aba)
  let novaPag = null;
  novaPag = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Nova aba não abriu')), 15000);
    const handler = async (target) => {
      const pg = await target.page().catch(() => null);
      if (pg && pg !== page) { browser.off('targetcreated', handler); clearTimeout(timer); resolve(pg); }
      else browser.once('targetcreated', handler);
    };
    browser.once('targetcreated', handler);
    page.click('#ctl00_cph_btnNovo').catch(e => { browser.off('targetcreated', handler); clearTimeout(timer); reject(e); });
  });
  await novaPag.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  novaPag.setDefaultTimeout(60000);
  await sleep(2000);
  console.log('Formulário aberto — URL:', novaPag.url());

  // Log empresas disponíveis no formulário
  const empOpts = await novaPag.$$eval('#ddlUsuarioEmpresa option', o => o.map(x => ({ v: x.value, t: x.text.trim() }))).catch(() => []);
  console.log('Empresas no form:', JSON.stringify(empOpts));

  // Seleciona Peg Pneus no form
  const peg = empOpts.find(o => o.t.toLowerCase().includes('peg'));
  if (peg) {
    await novaPag.select('#ddlUsuarioEmpresa', peg.v);
    await sleep(1000);
    const empAtual = await novaPag.$eval('#ddlUsuarioEmpresa', e => e.value).catch(() => 'N/A');
    console.log(`Empresa selecionada no form: ${empAtual} (esperado: ${peg.v})`);
  } else {
    console.log('⚠️ Empresa Peg não encontrada no form');
  }

  // Preenche código de teste (CAL226CBPTAU)
  const CODIGO = 'CAL226CBPTAU';
  await novaPag.click('#txtProdutoID', { clickCount: 3 });
  await novaPag.type('#txtProdutoID', CODIGO, { delay: 30 });
  await novaPag.click('#txtDescricaoDoProduto', { clickCount: 3 });
  await novaPag.type('#txtDescricaoDoProduto', 'CALOTA MODELO ORIGINAL UNO ATTRACTIVE (15/16) ARO 14 CUBO BAIXO LINHA FIAT', { delay: 15 });

  // Grupo
  const gOpts = await novaPag.$$eval('#ddlGrupoDeProduto option', o => o.map(x => ({ v: x.value, t: x.text.trim() }))).catch(() => []);
  const grp = gOpts.find(o => o.t.toUpperCase().includes('CALOTA RODA (ESTOQUE)'))
           || gOpts.find(o => o.t.toUpperCase().includes('CALOTA RODA'))
           || gOpts.find(o => o.t.toUpperCase().includes('CALOTA'));
  if (grp) {
    await novaPag.select('#ddlGrupoDeProduto', grp.v);
    await sleep(800);
    console.log(`Grupo selecionado: ${grp.t} (${grp.v})`);
  } else {
    console.log('⚠️ Grupo CALOTA não encontrado. Grupos disponíveis:', gOpts.slice(0,5).map(g => g.t).join(', '));
  }

  // Referência
  await novaPag.click('#txtReferencia', { clickCount: 3 });
  await novaPag.type('#txtReferencia', CODIGO, { delay: 20 });

  const urlAntes = novaPag.url();
  console.log(`\nURL antes do save: ${urlAntes}`);
  console.log('Clicando #btnSalvar...');

  // Intercepta requests durante save
  const requests = [];
  const reqHandler = (req) => requests.push({ method: req.method(), url: req.url() });
  novaPag.on('request', reqHandler);

  // Clica salvar e espera tanto por navegação quanto por networkidle
  let navOcorreu = false;
  await Promise.race([
    novaPag.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 })
      .then(() => { navOcorreu = true; }),
    novaPag.click('#btnSalvar').then(() => sleep(8000)),
  ]).catch(() => {});

  novaPag.off('request', reqHandler);
  await sleep(2000);

  const urlDepois = novaPag.url();
  console.log(`Navegação ocorreu: ${navOcorreu}`);
  console.log(`URL depois do save: ${urlDepois}`);
  console.log(`Requests durante save: ${requests.length}`);
  requests.slice(0, 10).forEach(r => console.log(`  ${r.method} ${r.url.substring(0, 100)}`));

  // Lista todos os botões do formulário
  const botoes = await novaPag.evaluate(() =>
    Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a.btn'))
      .map(b => ({ id: b.id, name: b.name, type: b.type, text: b.textContent.trim().substring(0, 40), onclick: (b.getAttribute('onclick') || '').substring(0, 80) }))
      .filter(b => b.text.length > 0)
  );
  console.log('\nBotões no form:', JSON.stringify(botoes, null, 2));

  // Verifica HTML do #btnSalvar
  const btnHtml = await novaPag.evaluate(() => {
    const el = document.querySelector('#btnSalvar');
    return el ? el.outerHTML : 'NÃO ENCONTRADO';
  });
  console.log('\n#btnSalvar HTML:', btnHtml);

  // Tenta __doPostBack diretamente
  console.log('\nTestando __doPostBack("btnSalvar","")...');
  const requestsDoPostBack = [];
  novaPag.on('request', r => requestsDoPostBack.push(r.url().substring(0, 100)));
  await novaPag.evaluate(() => {
    if (typeof __doPostBack === 'function') __doPostBack('btnSalvar', '');
  });
  await sleep(5000);
  novaPag.off('request', () => {});
  console.log(`Requests após __doPostBack: ${requestsDoPostBack.length}`);
  requestsDoPostBack.slice(0, 5).forEach(u => console.log('  ', u));

  const urlFinal = novaPag.url();
  console.log('URL final:', urlFinal);

  await sleep(5000);
  await browser.close();
})();
