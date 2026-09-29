/**
 * verificar-corrigir-entrada-nf.js
 * 1. Varre todas as 130 linhas e identifica as que NÃO estão vinculadas a produto
 * 2. Re-processa apenas as não vinculadas (busca CAL+ref → Abrir → preenche R$Venda)
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

/**
 * Verifica quais itens NÃO estão vinculados (dropdown ainda em "Cadastrar/Importar").
 * Retorna array de índices (1-based) dos itens não vinculados.
 */
async function diagnosticar(page, total) {
  log(`Diagnosticando ${total} itens...`);
  const naoVinculados = await page.evaluate((total) => {
    const resultado = [];
    for (let i = 1; i <= total; i++) {
      const rowId = `ctl${String(i + 1).padStart(2, '0')}`;
      // O dropdown de ação tem id como: tabProduto_tapProduto_grdXMLItem_ctlXX_ddlAcao
      // Ou pode ser identificado pela presença de "Buscar" na linha E ausência de produto vinculado
      // Checar pelo campo ProdutoID (código do produto interno) — se vazio, não vinculado
      const prodId = document.getElementById(`tabProduto_tapProduto_grdXMLItem_${rowId}_txtProdutoID`);
      const prodNome = document.getElementById(`tabProduto_tapProduto_grdXMLItem_${rowId}_txtProdutoDescricao`);

      // Alternativa: checar dropdown de ação
      // Tentativa 1: campo txtProdutoID vazio = não vinculado
      const idVazio = !prodId || !prodId.value || prodId.value.trim() === '';
      const nomeVazio = !prodNome || !prodNome.value || prodNome.value.trim() === '';

      if (idVazio && nomeVazio) {
        resultado.push(i);
      }
    }
    return resultado;
  }, total);
  return naoVinculados;
}

/**
 * Diagnóstico alternativo: lê o HTML completo da grid e procura por linhas
 * que ainda mostram "Cadastrar" no dropdown de ação.
 */
async function diagnosticarPorDropdown(page, total) {
  log(`Diagnóstico via dropdown de ação (${total} itens)...`);
  const naoVinculados = await page.evaluate((total) => {
    const resultado = [];
    for (let i = 1; i <= total; i++) {
      const rowId = `ctl${String(i + 1).padStart(2, '0')}`;

      // Procurar qualquer select nessa linha que tenha "Cadastrar" como opção selecionada
      // O seletor da linha no grid
      const linhaEl = document.querySelector(
        `#tabProduto_tapProduto_grdXMLItem_${rowId}_lkbBuscarProduto`
      );
      if (!linhaEl) continue;

      const tr = linhaEl.closest('tr');
      if (!tr) continue;

      // Verificar se algum select da linha tem valor/texto indicando "não vinculado"
      const selects = Array.from(tr.querySelectorAll('select'));
      const temCadastrar = selects.some(sel => {
        const opt = sel.options[sel.selectedIndex];
        const txt = opt ? opt.text.toLowerCase() : '';
        return txt.includes('cadastrar') || txt.includes('importar') || sel.value === '0' || sel.value === '';
      });

      // Também checar se o campo de código do produto (qualquer input com valor numérico grande)
      // está preenchido — se tiver, é porque o produto foi vinculado
      const inputs = Array.from(tr.querySelectorAll('input[type="text"], input:not([type])'));
      const temProdVinculado = inputs.some(inp => {
        // Campos de produto têm valores como código numérico longo ou nome de produto
        return inp.id && inp.id.includes('Produto') && inp.value && inp.value.trim() !== '' && inp.value !== '0';
      });

      if (temCadastrar && !temProdVinculado) {
        resultado.push(i);
      }
    }
    return resultado;
  }, total);
  return naoVinculados;
}

async function processarItem(page, itemNum, rowId, chgCode, custo, erros) {
  const refBusca = 'CAL' + chgCode;
  const venda = calcVenda(custo);
  log(`[${String(itemNum).padStart(3,'0')}/130] ${refBusca} | custo R$${custo} → venda R$${venda}`);

  try {
    // 1. Ativar Buscar do item
    await page.evaluate((row) => {
      __doPostBack(`tabProduto$tapProduto$grdXMLItem$${row}$lkbBuscarProduto`, '');
    }, rowId);
    await page.waitForNetworkIdle({ idleTime: 800, timeout: 15000 }).catch(() => {});
    await sleep(500);

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
    await page.waitForNetworkIdle({ idleTime: 800, timeout: 15000 }).catch(() => {});
    await sleep(500);

    // 5. Checar resultado
    const qtd = await page.evaluate(() => {
      const txt = document.getElementById('tabProduto_tapBusca_ucProdutoBusca_pnlResultado')?.innerText || '';
      const m = txt.match(/Resultado:\s*(\d+)/i);
      return m ? parseInt(m[1]) : -1;
    });
    log(`  Resultados: ${qtd}`);

    if (qtd === 0) {
      log(`  ⚠️ 0 resultados — tentando sem grupo...`);
      await page.evaluate((ref) => {
        const el = document.getElementById('tabProduto_tapBusca_ucProdutoBusca_txtReferencia');
        if (el) { el.value = ref; el.dispatchEvent(new Event('change', { bubbles: true })); }
        const sel = document.getElementById('tabProduto_tapBusca_ucProdutoBusca_ddlGrupoDeProduto');
        if (sel) { sel.value = '0'; sel.dispatchEvent(new Event('change', { bubbles: true })); }
      }, refBusca);
      await page.evaluate(() => { __doPostBack('tabProduto$tapBusca$ucProdutoBusca$btnBuscarProdutoUC', ''); });
      await page.waitForNetworkIdle({ idleTime: 800, timeout: 15000 }).catch(() => {});
      await sleep(500);

      const qtd2 = await page.evaluate(() => {
        const txt = document.getElementById('tabProduto_tapBusca_ucProdutoBusca_pnlResultado')?.innerText || '';
        const m = txt.match(/Resultado:\s*(\d+)/i);
        return m ? parseInt(m[1]) : 0;
      });

      if (qtd2 === 0) {
        log(`  ❌ Produto ${refBusca} não encontrado mesmo sem grupo`);
        erros.push({ item: itemNum, ref: refBusca, erro: 'não encontrado no OI' });
        return false;
      }
    }

    // 6. Clicar Abrir e aguardar
    const abrirOk = await page.evaluate(() => {
      const painel = document.getElementById('tabProduto_tapBusca_ucProdutoBusca_pnlResultado');
      const abrir = Array.from(painel?.querySelectorAll('a') || []).find(a => a.textContent.trim() === 'Abrir');
      if (abrir) { abrir.click(); return true; }
      return false;
    });
    if (!abrirOk) {
      log(`  ❌ Botão Abrir não encontrado`);
      erros.push({ item: itemNum, ref: refBusca, erro: 'Abrir não encontrado' });
      return false;
    }
    await page.waitForNetworkIdle({ idleTime: 1000, timeout: 15000 }).catch(() => {});
    await sleep(600);

    // 7. Verificar se vinculou (checar se há produto na linha)
    const vinculou = await page.evaluate((row) => {
      const prodDesc = document.getElementById(`tabProduto_tapProduto_grdXMLItem_${row}_txtProdutoDescricao`);
      const prodId = document.getElementById(`tabProduto_tapProduto_grdXMLItem_${row}_txtProdutoID`);
      return !!(prodDesc?.value || prodId?.value);
    }, rowId);
    log(`  Vinculou: ${vinculou}`);

    // 8. Preencher R$ Venda
    await page.evaluate((row, val) => {
      const campo = document.getElementById(`tabProduto_tapProduto_grdXMLItem_${row}_txtPrecoDeVenda`);
      if (campo) {
        campo.value = val;
        campo.dispatchEvent(new Event('change', { bubbles: true }));
        campo.dispatchEvent(new Event('blur', { bubbles: true }));
      }
    }, rowId, venda);

    log(`  ✅ OK (venda R$${venda})`);
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

  const nfData = JSON.parse(fs.readFileSync(NF_JSON, 'utf8'));
  const produtos = nfData.produtos; // 130 itens

  // Ler custos
  const custos = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a')).filter(a => a.textContent.trim() === 'Buscar');
    const c = {};
    links.forEach((link, idx) => {
      const tr = link.closest('tr');
      if (!tr) return;
      const cells = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
      const custo = cells.find(c => /^\d+,\d{4}$/.test(c));
      c[idx + 1] = custo || '0';
    });
    return c;
  });
  log(`Custos lidos: ${Object.keys(custos).length} itens`);

  // Diagnóstico: quais itens não estão vinculados?
  let naoVinculados = await diagnosticarPorDropdown(page, produtos.length);

  if (naoVinculados.length === 0) {
    // Tentar método alternativo
    naoVinculados = await diagnosticar(page, produtos.length);
  }

  log(`\n=== DIAGNÓSTICO ===`);
  log(`Itens não vinculados (${naoVinculados.length}): ${naoVinculados.join(', ')}`);

  if (naoVinculados.length === 0) {
    log('✅ Todos os itens parecem vinculados!');
    log('Se ainda houver itens com problema, tente inspecionar manualmente no browser.');
    browser.disconnect();
    return;
  }

  log(`\n=== REPROCESSANDO ${naoVinculados.length} ITENS ===`);
  const erros = [];
  let ok = 0;

  for (const itemNum of naoVinculados) {
    const prod = produtos[itemNum - 1];
    const rowId = `ctl${String(itemNum + 1).padStart(2, '0')}`;
    const custo = custos[itemNum] || '0';
    const sucesso = await processarItem(page, itemNum, rowId, prod.ref, custo, erros);
    if (sucesso) ok++;
    await sleep(300);
  }

  log(`\n=== CONCLUÍDO ===`);
  log(`✅ Sucesso: ${ok} | ❌ Erros: ${erros.length}`);
  if (erros.length > 0) {
    erros.forEach(e => log(`  Item ${e.item} (${e.ref}): ${e.erro}`));
    fs.writeFileSync('output/erros-entrada-nf-correcao.json', JSON.stringify(erros, null, 2));
  }

  browser.disconnect();
  log('Node encerrou — browser continua aberto');
})();
