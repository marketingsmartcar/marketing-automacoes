/**
 * entrada-nf-calotas-todos.js
 * Processa TODOS os itens da NF 1.392.378 (CHG — 130 calotas) na Peg Pneus.
 * Para cada item: busca CAL+ref no grupo CALOTA RODA (ESTOQUE) → Abrir → preenche R$ Venda.
 *
 * Regra de preço: custo < R$15 → venda R$35 | custo ≥ R$15 → venda R$45
 * NUNCA fecha o browser — sempre browser.disconnect()
 */
require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');

const WS_FILE = 'C:/Users/Nick/AppData/Local/Temp/oi-browser-ws.txt';
const NF_JSON = 'knowledge/nf-calotas-chg-1392378.json';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function log(msg) { console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`); }
function calcVenda(custoStr) {
  const n = parseFloat((custoStr || '0').replace(',', '.'));
  return n < 15 ? '35,00' : '45,00';
}

async function lerCustosDOM(page) {
  // Lê custo unitário (R$ com 4 decimais) de cada linha da grid
  return await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a')).filter(a => a.textContent.trim() === 'Buscar');
    const custos = {};
    links.forEach((link, idx) => {
      const tr = link.closest('tr');
      if (!tr) return;
      const cells = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
      const custo = cells.find(c => /^\d+,\d{4}$/.test(c));
      custos[idx + 1] = custo || '0'; // item começa em 1
    });
    return custos;
  });
}

async function processarItem(page, itemNum, rowId, chgCode, custo, erros) {
  const refBusca = 'CAL' + chgCode;
  const venda = calcVenda(custo);
  log(`[${String(itemNum).padStart(3,'0')}/130] ${refBusca} | custo R$${custo} → venda R$${venda}`);

  try {
    // 1. Ativar Buscar do item (muda para aba Busca de Produtos)
    await page.evaluate((row) => {
      __doPostBack(`tabProduto$tapProduto$grdXMLItem$${row}$lkbBuscarProduto`, '');
    }, rowId);
    await page.waitForNetworkIdle({ idleTime: 800, timeout: 12000 }).catch(() => {});
    await sleep(400);

    // 2. Preencher Referência
    await page.evaluate((ref) => {
      const el = document.getElementById('tabProduto_tapBusca_ucProdutoBusca_txtReferencia');
      if (el) { el.value = ref; el.dispatchEvent(new Event('change', { bubbles: true })); }
    }, refBusca);

    // 3. Selecionar grupo CALOTA RODA (ESTOQUE)
    await page.evaluate(() => {
      const sel = document.getElementById('tabProduto_tapBusca_ucProdutoBusca_ddlGrupoDeProduto');
      const opts = Array.from(sel?.options || []);
      const opt = opts.find(o => o.text.trim() === 'CALOTA RODA (ESTOQUE)') || opts.find(o => o.text.includes('CALOTA RODA'));
      if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event('change', { bubbles: true })); }
    });

    // 4. Buscar
    await page.evaluate(() => { __doPostBack('tabProduto$tapBusca$ucProdutoBusca$btnBuscarProdutoUC', ''); });
    await page.waitForNetworkIdle({ idleTime: 800, timeout: 12000 }).catch(() => {});
    await sleep(400);

    // 5. Checar resultado
    const qtd = await page.evaluate(() => {
      const txt = document.getElementById('tabProduto_tapBusca_ucProdutoBusca_pnlResultado')?.innerText || '';
      const m = txt.match(/Resultado:\s*(\d+)/);
      return m ? parseInt(m[1]) : 0;
    });

    if (qtd === 0) {
      log(`  ⚠️  0 resultados — tentando sem grupo...`);
      // Retry sem grupo
      await page.evaluate((ref) => {
        const el = document.getElementById('tabProduto_tapBusca_ucProdutoBusca_txtReferencia');
        if (el) { el.value = ref; el.dispatchEvent(new Event('change', { bubbles: true })); }
        const sel = document.getElementById('tabProduto_tapBusca_ucProdutoBusca_ddlGrupoDeProduto');
        if (sel) { sel.value = '0'; sel.dispatchEvent(new Event('change', { bubbles: true })); }
      }, refBusca);
      await page.evaluate(() => { __doPostBack('tabProduto$tapBusca$ucProdutoBusca$btnBuscarProdutoUC', ''); });
      await page.waitForNetworkIdle({ idleTime: 800, timeout: 12000 }).catch(() => {});
      await sleep(400);

      const qtd2 = await page.evaluate(() => {
        const txt = document.getElementById('tabProduto_tapBusca_ucProdutoBusca_pnlResultado')?.innerText || '';
        const m = txt.match(/Resultado:\s*(\d+)/);
        return m ? parseInt(m[1]) : 0;
      });

      if (qtd2 === 0) {
        log(`  ❌ Produto ${refBusca} não encontrado mesmo sem grupo — pulando`);
        erros.push({ item: itemNum, ref: refBusca, erro: 'não encontrado' });
        return false;
      }
    }

    // 6. Clicar Abrir (primeiro resultado)
    const abrirOk = await page.evaluate(() => {
      const painel = document.getElementById('tabProduto_tapBusca_ucProdutoBusca_pnlResultado');
      const abrir = Array.from(painel?.querySelectorAll('a') || []).find(a => a.textContent.trim() === 'Abrir');
      if (abrir) { abrir.click(); return true; }
      return false;
    });
    if (!abrirOk) {
      log(`  ❌ Abrir não encontrado`);
      erros.push({ item: itemNum, ref: refBusca, erro: 'Abrir não encontrado' });
      return false;
    }
    await page.waitForNetworkIdle({ idleTime: 800, timeout: 12000 }).catch(() => {});
    await sleep(400);

    // 7. Preencher R$ Venda
    await page.evaluate((row, val) => {
      const campo = document.getElementById(`tabProduto_tapProduto_grdXMLItem_${row}_txtPrecoDeVenda`);
      if (campo) {
        campo.value = val;
        campo.dispatchEvent(new Event('change', { bubbles: true }));
        campo.dispatchEvent(new Event('blur', { bubbles: true }));
      }
    }, rowId, venda);

    log(`  ✅ OK`);
    return true;

  } catch (err) {
    log(`  ❌ Erro: ${err.message}`);
    erros.push({ item: itemNum, ref: refBusca, erro: err.message });
    return false;
  }
}

(async () => {
  const wsEndpoint = fs.readFileSync(WS_FILE, 'utf8').trim();
  const browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint, defaultViewport: null });

  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('EntradaImportacao') || p.url().includes('wfEntrada'))
    || pages[pages.length - 1];
  log(`Aba: ${page.url()}`);

  // Ler JSON da NF
  const nfData = JSON.parse(fs.readFileSync(NF_JSON, 'utf8'));
  const produtos = nfData.produtos; // 130 itens
  log(`Total de itens na NF: ${produtos.length}`);

  // Ler custos da grid DOM
  log('Lendo custos da grid...');
  const custos = await lerCustosDOM(page);
  log(`Custos lidos: ${Object.keys(custos).length} itens`);

  const erros = [];
  let ok = 0;

  // Processar itens 3 a 130 (1 e 2 já feitos)
  const INICIO = 3; // pular 1 e 2 já feitos
  // ctl02=item1, ctl03=item2, ctl04=item3, ... ctl131=item130
  for (let i = INICIO; i <= produtos.length; i++) {
    const prod = produtos[i - 1]; // JSON indexado em 0
    const rowId = `ctl${String(i + 1).padStart(2, '0')}`; // ctl04 para item 3
    const custo = custos[i] || '0';
    const sucesso = await processarItem(page, i, rowId, prod.ref, custo, erros);
    if (sucesso) ok++;
    // Pequena pausa entre itens para não sobrecarregar
    await sleep(200);
  }

  log(`\n=== CONCLUÍDO ===`);
  log(`✅ Sucesso: ${ok} | ❌ Erros: ${erros.length}`);
  if (erros.length > 0) {
    log('Itens com erro:');
    erros.forEach(e => log(`  Item ${e.item} (${e.ref}): ${e.erro}`));
    fs.writeFileSync('output/erros-entrada-nf-calotas.json', JSON.stringify(erros, null, 2));
    log('Erros salvos em output/erros-entrada-nf-calotas.json');
  }

  browser.disconnect();
  log('Node encerrou — browser continua aberto');
})();
