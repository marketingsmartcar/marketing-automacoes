#!/usr/bin/env node
/**
 * nova-entrada-nf-calotas.js
 * Versão corrigida da entrada NF calotas CHG 1392378.
 *
 * DIFERENÇA CRÍTICA vs entrada anterior:
 *   - Lê o código CHG diretamente da grade da NF (coluna Descrição), NÃO do JSON
 *   - Busca no OI por CÓDIGO EXATO (= "CAL" + ref extraído da nota), sem fallback ambíguo
 *   - Sem duplicatas possíveis: 1 item NF → 1 produto OI garantido
 *
 * PRÉ-REQUISITO:
 *   - Usuário inativou a entrada anterior
 *   - NF 1392378 está aberta na tela wfEntradaImportacaoXML.aspx com todos os itens visíveis
 *
 * Uso: node tools/nova-entrada-nf-calotas.js
 */
require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');

const OI_URL  = 'https://sistemaoficinainteligente.com.br';
const WS_FILE = 'C:/Users/Nick/AppData/Local/Temp/oi-browser-ws.txt';

const LOG_FILE = 'output/nova-entrada-nf.txt';
function log(msg) {
  const linha = `[${new Date().toISOString().slice(11,19)}] ${msg}`;
  console.log(linha);
  fs.appendFileSync(LOG_FILE, linha + '\n');
}
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Extrai o código CHG do último token da descrição da nota
// Ex: "CALOTA ARO 13 CELTA 12/15 ... 042CBPTAU" → "042CBPTAU"
function extrairRefDaDescricao(desc) {
  if (!desc) return null;
  const tokens = desc.trim().split(/\s+/);
  const ultimo = tokens[tokens.length - 1];
  // Padrão de ref CHG: sequência de dígitos + letras (ex: 042CBPTAU, 003CBPTAU, 030CPPTAU)
  if (/^\d{3}[A-Z]{2,}/.test(ultimo)) return ultimo.toUpperCase();
  // Algumas refs podem ter formato diferente — retornar o último token mesmo assim
  return ultimo.toUpperCase();
}

// Calcula R$ Venda: custo < 15 → 35,00 | custo >= 15 → 45,00
function calcularVenda(custoStr) {
  const custo = parseFloat(custoStr.replace(',', '.'));
  if (isNaN(custo)) return null;
  return custo < 15 ? '35,00' : '45,00';
}

(async () => {
  fs.writeFileSync(LOG_FILE, `=== Nova entrada NF calotas — ${new Date().toISOString()} ===\n`);

  // Conectar ao browser persistente
  let browser;
  const wsEndpoint = fs.existsSync(WS_FILE) ? fs.readFileSync(WS_FILE, 'utf8').trim() : '';
  try {
    browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint, defaultViewport: null });
    log('✅ Conectado ao browser existente');
  } catch (e) {
    log('⚠️  Browser não encontrado — abra o browser manualmente e acesse o OI');
    process.exit(1);
  }

  // Pegar a aba da NF entry (deve estar aberta)
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('wfEntradaImportacaoXML'));
  if (!page) {
    log('❌ Aba da NF não encontrada. Abra wfEntradaImportacaoXML.aspx e rode novamente.');
    browser.disconnect();
    process.exit(1);
  }
  log(`✅ Aba da NF encontrada: ${page.url()}`);
  page.setDefaultTimeout(45000);
  page.setDefaultNavigationTimeout(30000);

  await sleep(1000);

  // ─── Ler TODOS os itens da grade ──────────────────────────────────────────────
  log('\n📋 Lendo itens da NF...');
  const itens = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[id*="lkbBuscarProduto"]'));
    return links.map((link) => {
      const tr = link.closest('tr');
      const tds = Array.from(tr.querySelectorAll(':scope > td'));
      // Número da sequência: primeiro TD
      const seq = tds[0]?.textContent.trim();
      // Descrição na Nota: span lblDescricaoDoProduto
      const spanDesc = tr.querySelector('span[id*="lblDescricaoDoProduto"]');
      const desc = spanDesc ? spanDesc.textContent.trim() : '';
      // Custo unitário: segundo TD com 4 casas decimais (o primeiro é quantidade)
      let custo = null;
      let found4dec = 0;
      for (let i = 3; i < tds.length; i++) {
        const txt = tds[i].textContent.trim();
        if (/^\d{1,6},\d{4}$/.test(txt)) {
          found4dec++;
          if (found4dec === 2) { custo = txt; break; } // pular qtd, pegar custo
        }
      }
      // rowId: extrair de "...grdXMLItem_ctl02_lkbBuscarProduto" → "ctl02"
      const m = link.id.match(/grdXMLItem_(ctl\d+)_lkbBuscarProduto/);
      const rowId = m ? m[1] : '';
      return { seq, desc, custo, rowId };
    });
  });

  if (itens.length === 0) {
    log('❌ Nenhum item encontrado na grade. Verifique se a NF está aberta e os itens carregados.');
    browser.disconnect();
    process.exit(1);
  }

  log(`✅ ${itens.length} itens lidos da NF`);

  // Mostrar primeiros 3 para diagnóstico
  itens.slice(0, 3).forEach(i => log(`  Seq ${i.seq}: desc="${i.desc?.slice(0,60)}" custo="${i.custo}" rowId="${i.rowId}"`));

  // ─── Processar cada item ───────────────────────────────────────────────────────
  let ok = 0, erros = [];

  for (let idx = 0; idx < itens.length; idx++) {
    const item = itens[idx];
    const itemNum = parseInt(item.seq || String(idx + 1), 10);
    const rowId = item.rowId || `ctl${(itemNum + 1).toString().padStart(2, '0')}`;

    const ref = extrairRefDaDescricao(item.desc);
    if (!ref) {
      log(`[${idx+1}/${itens.length}] ❌ Seq ${itemNum} — não consegui extrair ref de: "${item.desc}"`);
      erros.push({ itemNum, desc: item.desc, erro: 'sem_ref' });
      continue;
    }

    const codigoOI = `CAL${ref}`;
    const venda = calcularVenda(item.custo || '0');
    log(`[${idx+1}/${itens.length}] 🔗 Seq ${itemNum} | ${codigoOI} | custo ${item.custo} → R$Venda ${venda}`);

    try {
      // 1. Ativar aba Busca para este item
      await page.evaluate((rid) => {
        __doPostBack(`tabProduto$tapProduto$grdXMLItem$${rid}$lkbBuscarProduto`, '');
      }, rowId);
      await page.waitForNetworkIdle({ idleTime: 800, timeout: 15000 }).catch(() => {});
      await sleep(300);

      // 2. Limpar e preencher referência = código OI exato
      await page.evaluate((codigo) => {
        const inp = document.getElementById('tabProduto_tapBusca_ucProdutoBusca_txtReferencia');
        if (inp) {
          inp.value = codigo;
          inp.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, codigoOI);

      // 3. Selecionar grupo CALOTA RODA (ESTOQUE) = value 218
      await page.evaluate(() => {
        const grp = document.getElementById('tabProduto_tapBusca_ucProdutoBusca_ddlGrupoDeProduto');
        if (grp) {
          const opt = Array.from(grp.options).find(o => o.text.trim() === 'CALOTA RODA (ESTOQUE)');
          if (opt) { grp.value = opt.value; grp.dispatchEvent(new Event('change', { bubbles: true })); }
        }
      });
      await sleep(200);

      // 4. Clicar Buscar
      await page.evaluate(() => {
        __doPostBack('tabProduto$tapBusca$ucProdutoBusca$btnBuscarProdutoUC', '');
      });
      await page.waitForNetworkIdle({ idleTime: 800, timeout: 15000 }).catch(() => {});
      await sleep(300);

      // 5. Verificar quantos resultados
      const nResultados = await page.evaluate(() => {
        const painel = document.getElementById('tabProduto_tapBusca_ucProdutoBusca_pnlResultado');
        if (!painel) return 0;
        // Contar tanto links Abrir quanto verificar pelo texto do resultado
        const txt = painel.innerText || '';
        const m = txt.match(/Resultado:\s*(\d+)/);
        if (m) return parseInt(m[1]);
        return painel.querySelectorAll('a').filter ?
          Array.from(painel.querySelectorAll('a')).filter(a => a.textContent.trim() === 'Abrir').length :
          painel.querySelectorAll('a[id*="lkbAbrir"]').length;
      });

      if (nResultados === 0) {
        // Tentar sem grupo como fallback
        await page.evaluate(() => {
          const grp = document.getElementById('tabProduto_tapBusca_ucProdutoBusca_ddlGrupoDeProduto');
          if (grp) { grp.value = ''; grp.dispatchEvent(new Event('change', { bubbles: true })); }
        });
        await sleep(200);
        await page.evaluate(() => {
          __doPostBack('tabProduto$tapBusca$ucProdutoBusca$btnBuscarProdutoUC', '');
        });
        await page.waitForNetworkIdle({ idleTime: 800, timeout: 15000 }).catch(() => {});
        await sleep(300);

        const nFallback = await page.evaluate(() => {
          const painel = document.getElementById('tabProduto_tapBusca_ucProdutoBusca_pnlResultado');
          if (!painel) return 0;
          const txt = painel.innerText || '';
          const m = txt.match(/Resultado:\s*(\d+)/);
          if (m) return parseInt(m[1]);
          return Array.from(painel.querySelectorAll('a')).filter(a => a.textContent.trim() === 'Abrir').length;
        });

        if (nFallback === 0) {
          log(`  ⚠️  ZERO resultados para ${codigoOI} (nem sem grupo)`);
          erros.push({ itemNum, ref, codigoOI, erro: 'nao_encontrado' });
          continue;
        }

        if (nFallback > 1) {
          log(`  ⚠️  ${nFallback} resultados sem grupo para ${codigoOI} — pulando para não vincular errado`);
          erros.push({ itemNum, ref, codigoOI, erro: `multiplos_sem_grupo_${nFallback}` });
          continue;
        }
      } else if (nResultados > 1) {
        log(`  ⚠️  ${nResultados} resultados para ${codigoOI} — pulando para não vincular errado`);
        erros.push({ itemNum, ref, codigoOI, erro: `multiplos_${nResultados}` });
        continue;
      }

      // 6. Verificar que o resultado é exatamente o produto certo (código bate)
      const codigoEncontrado = await page.evaluate(() => {
        const painel = document.getElementById('tabProduto_tapBusca_ucProdutoBusca_pnlResultado');
        if (!painel) return null;
        const tds = painel.querySelectorAll('td');
        return tds[0]?.textContent.trim() || null; // primeiro TD = código do produto
      });

      if (codigoEncontrado && codigoEncontrado !== codigoOI) {
        log(`  ⚠️  Produto encontrado é "${codigoEncontrado}", esperado "${codigoOI}" — pulando`);
        erros.push({ itemNum, ref, codigoOI, erro: `produto_errado_${codigoEncontrado}` });
        continue;
      }

      // 7. Clicar Abrir
      await page.evaluate(() => {
        const painel = document.getElementById('tabProduto_tapBusca_ucProdutoBusca_pnlResultado');
        if (!painel) return;
        const btnAbrir = Array.from(painel.querySelectorAll('a')).find(a => a.textContent.trim() === 'Abrir')
                      || painel.querySelector('a[id*="lkbAbrir"]');
        if (btnAbrir) btnAbrir.click();
      });
      await page.waitForNetworkIdle({ idleTime: 800, timeout: 15000 }).catch(() => {});
      await sleep(300);

      // 8. Preencher R$ Venda
      if (venda) {
        await page.evaluate((rid, val) => {
          const inp = document.getElementById(`tabProduto_tapProduto_grdXMLItem_${rid}_txtPrecoDeVenda`);
          if (inp) {
            inp.value = val;
            inp.dispatchEvent(new Event('change', { bubbles: true }));
            inp.dispatchEvent(new Event('blur', { bubbles: true }));
          }
        }, rowId, venda);
        await sleep(300);
      }

      ok++;
      log(`  ✅ Vinculado: ${codigoOI} → R$${venda}`);

    } catch (err) {
      log(`  ❌ Erro no item ${itemNum}: ${err.message.slice(0, 120)}`);
      erros.push({ itemNum, ref, codigoOI, erro: err.message.slice(0, 120) });
    }

    await sleep(200);
  }

  log(`\n═══ CONCLUÍDO ═══`);
  log(`   Vinculados com sucesso: ${ok}/${itens.length}`);
  log(`   Erros/pulados:          ${erros.length}`);

  if (erros.length > 0) {
    log(`\n⚠️  Itens que precisam de atenção manual:`);
    erros.forEach(e => log(`   Seq ${e.itemNum} | ${e.codigoOI || '-'} | motivo: ${e.erro}`));
    fs.writeFileSync('output/nova-entrada-erros.json', JSON.stringify(erros, null, 2));
  }

  browser.disconnect();
  log('\nNode encerrado — browser continua aberto');
  log('Se tudo ok → clique em "Efetuar a Entrada da Nota Fiscal"');
})();
