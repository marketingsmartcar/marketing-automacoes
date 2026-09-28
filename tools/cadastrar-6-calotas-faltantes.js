#!/usr/bin/env node
/**
 * cadastrar-6-calotas-faltantes.js
 * Cadastra os 6 itens excluídos/faltantes com os códigos corretos na Peg Pneus (OI).
 * Índices NF: 13, 41, 73, 90, 118, 130
 */
require('dotenv').config();
const puppeteer = require('puppeteer');
const fs        = require('fs');
const path      = require('path');
const os        = require('os');
const https     = require('https');

const OI_URL   = 'https://sistemaoficinainteligente.com.br';
const PEG_VAL  = '3098';
const OI_EMAIL = process.env.OI_EMAIL;
const OI_SENHA = process.env.OI_SENHA;

// Itens faltantes confirmados pelo scan de fotos
const ITENS = [
  { i: 73,  cod_chg: '0909802', ref: '226CBPTAU', descricao: 'CALOTA ARO 14 UNO ATTRAC 15'   },
  { i: 90,  cod_chg: '1051449', ref: '213CPTAU',  descricao: 'CALOTA ARO 13 GRAND SIENA 14'  },
];

// Log de progresso
const LOG_FILE = path.join('output', 'cadastro-6-faltantes-log.txt');
function log(msg) {
  const linha = `[${new Date().toISOString().slice(11,19)}] ${msg}`;
  console.log(linha);
  fs.appendFileSync(LOG_FILE, linha + '\n');
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── CHG: HTTP request ────────────────────────────────────────────────────────
function httpGetCHGJson(cookies, termoBusca) {
  return new Promise((resolve, reject) => {
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const params = new URLSearchParams({ format: 'raw', view: 'GetListaProd', skip: '0', desc: termoBusca, marca: '', linha: '' }).toString();
    const options = {
      hostname: 'loja.chg.com.br',
      path: `/portal-do-cliente?${params}`,
      method: 'GET',
      rejectUnauthorized: false,
      headers: {
        Cookie: cookieStr,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json, */*',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: 'https://loja.chg.com.br/portal-do-cliente?view=Produtos',
      },
    };
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('CHG timeout')); });
    req.end();
  });
}

// ─── CHG: valida cookies + busca produto ────────────────────────────────────
function tipoCubo(texto) {
  const t = texto.toUpperCase();
  if (t.includes('CUBO PADRAO') || t.includes('CUBO PADRÃO')) return 'CUBO PADRAO';
  if (t.includes('CUBO BAIXO'))  return 'CUBO BAIXO';
  if (t.includes('CUBO ALTO'))   return 'CUBO ALTO';
  if (/\bCB\b/.test(t)) return 'CUBO BAIXO';
  if (/\bCA\b/.test(t)) return 'CUBO ALTO';
  if (/\bCP\b/.test(t)) return 'CUBO PADRAO';
  return 'CUBO PADRAO';
}

function parsearCHG(linha, dadosNF) {
  const aroM   = linha.match(/ARO\s+(\d+)/i);
  const modeloM = linha.match(/MODELO\s+([A-Z ]+?)(?:\s+\d{2}\/\d{2}|\s+\d{4}\b|\s+\d{2}\b|\s+APLICACAO|\s+CUBO|$)/i);
  const anoM   = linha.match(/(\d{2}\/\d{2})/) || linha.match(/MODELO\s+[A-Z ]+?\s+(\d{4})\b/i) || linha.match(/MODELO\s+[A-Z ]+?\s+(\d{2})\b/i);
  const aplicM = linha.match(/APLICACAO\s+(LINHA\s+.+?)(?:\s+PRATA|\s+CUBO|\s+FIXACAO|$)/i);
  const gridM  = linha.match(/GRID\s+([\w]+)/i);

  let aro    = aroM ? aroM[1].trim() : (dadosNF?.aro ? String(dadosNF.aro) : null);
  let modelo = modeloM ? modeloM[1].trim() : null;

  // Fallback modelo da descrição NF
  if (!modelo && dadosNF?.descricao) {
    const mNF = dadosNF.descricao.match(/CALOTA\s+ARO\s+\d+\s+(.+?)(?:\s+\d{2}\/\d{2}|\s+\d{4}|\s+\d{2}$|$)/i);
    if (mNF) modelo = mNF[1].trim().toUpperCase();
  }
  if (!modelo) modelo = dadosNF?.descricao?.replace(/CALOTA\s+ARO\s+\d+\s*/i, '').trim() || 'MODELO';
  if (!aro) throw new Error(`ARO não encontrado: "${linha.substring(0, 80)}"`);

  const ano        = anoM  ? anoM[1].trim() : '';
  const aplicacao  = aplicM ? aplicM[1].trim() : '';
  const linhaM     = aplicacao.match(/LINHA\s+([A-Z]+)/i);
  const linhaMarca = linhaM ? linhaM[1].trim() : aplicacao;
  const cubo       = tipoCubo(linha);
  const grid       = gridM ? gridM[1].trim() : null;

  const descricao = ano
    ? `CALOTA MODELO ORIGINAL ${modelo} (${ano}) ARO ${aro} ${cubo} LINHA ${linhaMarca}`
    : `CALOTA MODELO ORIGINAL ${modelo} ARO ${aro} ${cubo} LINHA ${linhaMarca}`;

  return { aro, modelo, ano, cubo, linhaMarca, aplicacao, descricao, grid };
}

async function buscarCHG(cookies, codCHG, refFallback, dadosNF) {
  for (const termo of [codCHG, refFallback].filter(Boolean)) {
    const data = await httpGetCHGJson(cookies, termo);
    if (!Array.isArray(data) || data.length === 0 || data[0].produto === 'STOP') continue;
    const prod = data[0];
    const linhaTitle = prod.descricao || '';
    if (!linhaTitle.toUpperCase().includes('CALOTA')) continue;

    let fotoArquivo = null;
    if (prod.imagem && prod.imagem.startsWith('data:image')) {
      const m = prod.imagem.match(/^data:image\/\w+;base64,(.+)$/s);
      if (m && m[1].length > 100) {
        const buf = Buffer.from(m[1], 'base64');
        fotoArquivo = path.join(os.tmpdir(), `calota_${codCHG}.jpg`);
        fs.writeFileSync(fotoArquivo, buf);
      }
    }
    return { linha: linhaTitle, fotoArquivo };
  }
  return null;
}

// ─── OI: trocar para Peg Pneus ───────────────────────────────────────────────
async function trocarParaPeg(page) {
  await page.goto(`${OI_URL}/wfCRMBI.aspx`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1000));
  const atual = await page.$eval('#ctl00_cph_ddlUsuarioEmpresa', e => e.value).catch(() => null);
  if (atual !== PEG_VAL) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {}),
      page.select('#ctl00_cph_ddlUsuarioEmpresa', PEG_VAL),
    ]);
    await new Promise(r => setTimeout(r, 1500));
  }
}

// ─── OI: login ────────────────────────────────────────────────────────────────
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
  if (page.url().includes('Entrar')) throw new Error('Login OI falhou');
}

// ─── OI: abre formulário novo produto (nova aba) ──────────────────────────────
async function abrirNovoProduto(browser, page) {
  await page.goto(`${OI_URL}/wfProdutoBusca.aspx`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForSelector('#ctl00_cph_btnNovo', { timeout: 15000 });
  await sleep(500);

  const novaPag = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Nova aba não abriu em 15s')), 15000);
    const handler = async (target) => {
      try {
        const pg = await target.page().catch(() => null);
        if (pg && pg !== page) {
          browser.off('targetcreated', handler);
          clearTimeout(timer);
          resolve(pg);
        } else {
          browser.once('targetcreated', handler);
        }
      } catch (e) { browser.off('targetcreated', handler); clearTimeout(timer); reject(e); }
    };
    browser.once('targetcreated', handler);
    page.click('#ctl00_cph_btnNovo').catch(e => { browser.off('targetcreated', handler); clearTimeout(timer); reject(e); });
  });

  await novaPag.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  await novaPag.setDefaultTimeout(45000);
  await novaPag.setDefaultNavigationTimeout(25000);
  await sleep(2000);
  return novaPag;
}

// ─── OI: verifica duplicata (sessão já deve estar na Peg Pneus) ──────────────
async function produtoJaExiste(page, codigo) {
  // NÃO chama trocarParaPeg — a sessão já está na Peg Pneus (garantida no MAIN)
  await page.goto(`${OI_URL}/wfProdutoBusca.aspx`, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await sleep(800);
  try {
    await page.click('#ctl00_cph_txtProdutoID', { clickCount: 3 });
    await page.type('#ctl00_cph_txtProdutoID', codigo, { delay: 30 });
    // OI usa UpdatePanel — clicar o botão de busca em vez de Enter
    const btnBuscar = await page.$('#ctl00_cph_btnBuscar').catch(() => null)
                   || await page.$('input[type="submit"][value*="Buscar"]').catch(() => null)
                   || await page.$('input[type="button"][value*="Buscar"]').catch(() => null);
    if (btnBuscar) {
      await btnBuscar.click();
    } else {
      await page.keyboard.press('Enter');
    }
    // UpdatePanel: aguardar o resultado renderizar (sem navegação)
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => {});
    await sleep(2500);
    const txt = await page.evaluate(() => document.body.textContent || '');
    return txt.includes(codigo);
  } catch { return false; }
}

// ─── OI: preenche e salva formulário ─────────────────────────────────────────
async function preencherFormulario(novaPag, dados) {
  // Handler de dialog ANTES de qualquer ação — OI usa alert() para validação
  let dialogMsg = null;
  const dialogHandler = async (dialog) => {
    dialogMsg = dialog.message();
    log(`  ⚠️  Dialog JS: ${dialogMsg}`);
    await dialog.accept();
  };
  novaPag.on('dialog', dialogHandler);

  try {
    // 1) Empresa → Peg Pneus
    const empOpts = await novaPag.$$eval('#ddlUsuarioEmpresa option', o => o.map(x => ({ v: x.value, t: x.text.trim() })));
    const peg = empOpts.find(o => o.t.toLowerCase().includes('peg'));
    if (peg) { await novaPag.select('#ddlUsuarioEmpresa', peg.v); await sleep(1500); }

    // 2) Grupo → CALOTA RODA (ESTOQUE)
    const gOpts = await novaPag.$$eval('#ddlGrupoDeProduto option', o => o.map(x => ({ v: x.value, t: x.text.trim() })));
    const grp = gOpts.find(o => o.t.toUpperCase().includes('CALOTA RODA (ESTOQUE)'))
             || gOpts.find(o => o.t.toUpperCase().includes('CALOTA RODA'))
             || gOpts.find(o => o.t.toUpperCase().includes('CALOTA'));
    if (grp) { await novaPag.select('#ddlGrupoDeProduto', grp.v); await sleep(1500); }

    // 3) Unidade → UN
    const uOpts = await novaPag.$$eval('#tab_tapProduto_ddlUnidade option', o => o.map(x => ({ v: x.value, t: x.text.trim() }))).catch(() => []);
    const un = uOpts.find(o => o.t === 'UN' || o.v === 'UN');
    if (un) { await novaPag.select('#tab_tapProduto_ddlUnidade', un.v); await sleep(500); }

    // 4) Ideal → 4
    const ideal = await novaPag.$('#tab_tapProduto_txtIdeal').catch(() => null);
    if (ideal) { await novaPag.click('#tab_tapProduto_txtIdeal', { clickCount: 3 }); await novaPag.type('#tab_tapProduto_txtIdeal', '4', { delay: 20 }); }

    // 5) Campos de texto — depois dos dropdowns para não serem apagados pelo UpdatePanel
    await novaPag.click('#txtProdutoID', { clickCount: 3 });
    await novaPag.type('#txtProdutoID', dados.codigo, { delay: 30 });
    await novaPag.click('#txtDescricaoDoProduto', { clickCount: 3 });
    await novaPag.type('#txtDescricaoDoProduto', dados.descricao, { delay: 15 });
    await novaPag.click('#txtAplicacaoDoProduto', { clickCount: 3 });
    await novaPag.type('#txtAplicacaoDoProduto', dados.aplicacao, { delay: 15 });
    await novaPag.click('#txtReferencia', { clickCount: 3 });
    await novaPag.type('#txtReferencia', dados.referencia, { delay: 30 });
    // Preço de venda e custo (0 para cadastro sem preço definido)
    await novaPag.click('#txtPrecoDeVenda', { clickCount: 3 });
    await novaPag.type('#txtPrecoDeVenda', '0', { delay: 20 });
    const custoEl = await novaPag.$('#txtPrecoDeCusto').catch(() => null);
    if (custoEl) { await novaPag.click('#txtPrecoDeCusto', { clickCount: 3 }); await novaPag.type('#txtPrecoDeCusto', '0', { delay: 20 }); }

    // Log estado dos campos antes de salvar
    const estado = await novaPag.evaluate(() => ({
      codigo:    document.querySelector('#txtProdutoID')?.value,
      descricao: document.querySelector('#txtDescricaoDoProduto')?.value?.substring(0, 30),
      grupo:     document.querySelector('#ddlGrupoDeProduto')?.value,
      empresa:   document.querySelector('#ddlUsuarioEmpresa')?.value,
      unidade:   document.querySelector('#tab_tapProduto_ddlUnidade')?.value,
      venda:     document.querySelector('#txtPrecoDeVenda')?.value,
      custo:     document.querySelector('#txtPrecoDeCusto')?.value,
    })).catch(() => ({}));
    log(`  Form: emp=${estado.empresa} grp=${estado.grupo} un=${estado.unidade} cod=${estado.codigo} desc=${estado.descricao}`);

    // 6) Salvar — dialog handler já está registrado acima
    let navOk = false;
    await Promise.race([
      novaPag.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 18000 })
        .then(() => { navOk = true; })
        .catch(() => {}),
      novaPag.click('#btnSalvar').then(() => sleep(10000)),
    ]).catch(() => {});

    const urlPosSave = novaPag.url();
    log(`  Navegação após save: ${navOk} | Dialog: ${dialogMsg || 'nenhum'} | URL: ${urlPosSave.substring(0, 80)}`);
    await sleep(2000);
    return { navOk, urlPosSave };

  } finally {
    novaPag.off('dialog', dialogHandler);
  }
}

// ─── OI: upload foto ─────────────────────────────────────────────────────────
async function uploadFoto(novaPag, fotoArquivo) {
  if (!fotoArquivo || !fs.existsSync(fotoArquivo)) return false;
  try {
    await novaPag.click('#__tab_tab_tabDocumento');
    await sleep(2000);
    const fi = await novaPag.$('#tab_tabDocumento_ucProdutoDocumento_flp');
    if (!fi) return false;
    await fi.uploadFile(fotoArquivo);
    await sleep(800);
    const btn = await novaPag.$('#btnSalvarDocumento');
    if (!btn) return false;
    await Promise.all([
      novaPag.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
      btn.click(),
    ]);
    await sleep(2000);
    return true;
  } catch (e) {
    log(`    ⚠️  Foto falhou: ${e.message}`);
    return false;
  }
}

// ─── Abre novo formulário para o próximo produto ──────────────────────────────
async function proximoFormulario(browser, page, novaPag) {
  try {
    const btnNovo = await novaPag.$('#btnNovo').catch(() => null);
    if (btnNovo) {
      const onclick = await novaPag.$eval('#btnNovo', el => el.getAttribute('onclick') || '').catch(() => '');
      if (onclick.includes('fncNovaAba')) {
        const nova = await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Nova aba não abriu em 15s')), 15000);
          const handler = async (target) => {
            const pg = await target.page().catch(() => null);
            if (pg && pg !== page) {
              browser.off('targetcreated', handler);
              clearTimeout(timer);
              resolve(pg);
            } else browser.once('targetcreated', handler);
          };
          browser.once('targetcreated', handler);
          btnNovo.click().catch(e => { browser.off('targetcreated', handler); clearTimeout(timer); reject(e); });
        });
        await nova.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
        await nova.setDefaultTimeout(45000).catch(() => {});
        await sleep(1500);
        await novaPag.close().catch(() => {});
        return nova;
      } else {
        await Promise.race([novaPag.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}), btnNovo.click()]);
        await sleep(1500);
        return novaPag;
      }
    }
  } catch {}
  await novaPag.close().catch(() => {});
  return await abrirNovoProduto(browser, page);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
(async () => {
  fs.writeFileSync(LOG_FILE, `=== Cadastro 6 calotas faltantes — ${new Date().toISOString()} ===\n`);
  log(`Itens a cadastrar: ${ITENS.length}`);

  const cookiesFile = path.join('output', 'chg-cookies.json');
  if (!fs.existsSync(cookiesFile)) { log('❌ Cookies CHG ausentes'); process.exit(1); }
  const cookies = JSON.parse(fs.readFileSync(cookiesFile, 'utf8'));

  // Valida CHG
  log('🔐 Validando cookies CHG...');
  const testeChg = await httpGetCHGJson(cookies, 'CALOTA').catch(e => { log(`❌ CHG erro: ${e.message}`); process.exit(1); });
  if (!Array.isArray(testeChg)) { log('❌ Cookies CHG inválidos'); process.exit(1); }
  log('✅ CHG pronto');

  let browser = await puppeteer.launch({ headless: false, defaultViewport: null, protocolTimeout: 90000, args: ['--start-maximized', '--no-sandbox'] });
  let page    = await browser.newPage();
  page.setDefaultTimeout(45000);
  page.setDefaultNavigationTimeout(30000);

  log('\n🔐 Login OI...');
  await loginOI(page);
  await trocarParaPeg(page);
  log('✅ OI pronto — Peg Pneus\n');

  let ok = 0, falha = 0;

  async function restartBrowser() {
    await browser.close().catch(() => {});
    browser = await puppeteer.launch({ headless: false, defaultViewport: null, protocolTimeout: 90000, args: ['--start-maximized', '--no-sandbox'] });
    page = await browser.newPage();
    page.setDefaultTimeout(45000);
    page.setDefaultNavigationTimeout(30000);
    await loginOI(page);
    await trocarParaPeg(page);
    log('  ✅ Browser reiniciado — Peg Pneus');
  }

  for (const item of ITENS) {
    const codigo = `CAL${item.ref}`;
    log(`\n──── [${item.i}] ${item.descricao} → ${codigo} ────`);

    let sucesso = false;
    for (let tentativa = 1; tentativa <= 3 && !sucesso; tentativa++) {
      if (tentativa > 1) { log(`  🔄 Tentativa ${tentativa}/3`); await sleep(3000); }
      try {
        // Busca CHG
        const resultado = await buscarCHG(cookies, item.cod_chg, item.ref, item);
        if (!resultado) { log(`  ❌ Não encontrado no CHG`); break; }
        log(`  CHG: ${resultado.linha.substring(0, 80)}`);

        // Parse — sempre usa o código da NF, nunca o grid do CHG
        const chg = parsearCHG(resultado.linha, item);
        const codigoFinal = codigo;
        log(`  → Código: ${codigoFinal} | ${chg.descricao.substring(0, 60)}`);

        // Garante sessão Peg Pneus e verifica duplicata
        await trocarParaPeg(page).catch(() => {});
        const jaExiste = await produtoJaExiste(page, codigoFinal);
        if (jaExiste) {
          log(`  ⏭️  Já existe na OI`);
          ok++;
          sucesso = true;
          break;
        }

        // Abre formulário novo do zero a cada item
        const novaPag = await abrirNovoProduto(browser, page);

        // Cadastra
        const saveResult = await preencherFormulario(novaPag, {
          codigo: codigoFinal,
          descricao: chg.descricao,
          aplicacao: chg.aplicacao || `LINHA ${chg.linhaMarca}`,
          referencia: item.cod_chg,
        });

        // Verifica pelo código lido diretamente da aba do produto (mais confiável que busca)
        let salvoOK = false;
        if (saveResult.navOk && saveResult.urlPosSave.includes('wfProduto.aspx')) {
          try {
            const codNaPagina = await novaPag.$eval('#txtProdutoID', e => e.value).catch(() => null);
            log(`  Código na página pós-save: ${codNaPagina}`);
            salvoOK = codNaPagina === codigoFinal;
          } catch {}
        }
        // Fallback: busca na Peg Pneus
        if (!salvoOK) {
          await trocarParaPeg(page).catch(() => {});
          salvoOK = await produtoJaExiste(page, codigoFinal);
        }
        if (!salvoOK) throw new Error('Save silencioso — produto não encontrado na Peg Pneus após salvar');
        log(`  ✅ Salvo e verificado`);

        const fotoOk = await uploadFoto(novaPag, resultado.fotoArquivo);
        log(`  📸 Foto: ${fotoOk ? '✅' : '⚠️ sem foto'}`);

        // Fecha a aba do produto — próximo item abre uma nova
        await novaPag.close().catch(() => {});
        await sleep(1000);

        ok++;
        sucesso = true;

      } catch (err) {
        log(`  ⚠️  Erro (t${tentativa}): ${err.message.substring(0, 120)}`);
        const eCDP = err.message.includes('callFunctionOn') ||
                     err.message.includes('Session closed')  ||
                     err.message.includes('Protocol error')  ||
                     err.message.includes('detached Frame')  ||
                     err.message.includes('Connection closed');
        if (eCDP && tentativa < 3) {
          log('  🔄 CDP/frame corrompido — reiniciando browser...');
          try {
            await restartBrowser();
          } catch (e2) {
            log('  ❌ Restart falhou: ' + e2.message.substring(0, 80));
            falha++;
            sucesso = true;
          }
        }
      }
    }
    if (!sucesso) { log(`  ❌ Falha definitiva`); falha++; }
  }

  log(`\n═══ CONCLUÍDO — ${ok} cadastrados, ${falha} falha(s) ═══`);
  await sleep(4000);
  await browser.close();
})();
