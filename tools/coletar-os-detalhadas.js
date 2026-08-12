#!/usr/bin/env node
// Coleta OS detalhadas do OI (Vendas > Relatório de Vendas > Gestão Periódica com OS: Sim)
// e salva em Supabase (tabelas os_vendas + os_itens).
//
// Uso:
//   node tools/coletar-os-detalhadas.js              # ontem
//   node tools/coletar-os-detalhadas.js --date 2026-08-03
//   node tools/coletar-os-detalhadas.js --date 2026-08-01 --ate 2026-08-03  # intervalo

require('dotenv').config();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs   = require('fs');

// ── Configuração ──────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXUSZ_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXUSZ_SUPABASE_ANON_KEY;

const LOJAS = [
  { key: 'BR01', label: 'BR Pneus Araraquara',  ddlValue: '469'  },
  { key: 'BR03', label: 'BR Pneus Americana',   ddlValue: '2202' },
  { key: 'BR04', label: 'BR Pneus São Carlos',  ddlValue: '1524' },
  { key: 'PEG1', label: 'Peg Pneus Araraquara', ddlValue: '3098' },
];

const RELATORIO_URL = 'https://sistemaoficinainteligente.com.br/wfRelatorioOperacao.aspx';
const DEBUG_DIR = path.join(__dirname, '..', 'debug', 'os-detalhadas');

// ── Argumentos ────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  let de = null, ate = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--date' || args[i] === '--de') de = args[++i];
    if (args[i] === '--ate') ate = args[++i];
  }
  if (!de) {
    // Default: ontem
    const d = new Date();
    d.setDate(d.getDate() - 1);
    de = d.toISOString().slice(0, 10);
  }
  if (!ate) ate = de;
  return { de, ate };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parseBRL(str) {
  if (!str) return 0;
  const s = str.toString().replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function isoToDisplay(iso) {
  // '2026-08-03' → '03/08/2026'
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function displayToISO(display) {
  // '03/08/2026' → '2026-08-03'
  if (!display) return null;
  const [d, m, y] = display.split('/');
  return `${y}-${m}-${d}`;
}

function ensureDebugDir() {
  try { fs.mkdirSync(DEBUG_DIR, { recursive: true }); } catch {}
}

// ── Puppeteer helpers ─────────────────────────────────────────────────────────

async function login(page) {
  console.log('  🔐 Login...');
  await page.goto('https://sistemaoficinainteligente.com.br/Entrar.aspx?sair=1', {
    waitUntil: 'networkidle2', timeout: 45000,
  });
  await page.waitForSelector('#Login1_UserName', { timeout: 20000 });
  await page.type('#Login1_UserName', process.env.OI_EMAIL, { delay: 20 });
  await page.type('#Login1_Password', process.env.OI_SENHA, { delay: 20 });
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }),
    page.click('#Login1_btnEntrar'),
  ]);
  console.log('  ✅ Logado');
}

async function trocarLoja(page, ddlValue) {
  // Navega ao relatório primeiro (garante que o seletor de loja esteja no DOM)
  await page.goto(RELATORIO_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('#ddlTrocarEmpresa', { timeout: 10000 });
  await page.select('#ddlTrocarEmpresa', ddlValue);
  await sleep(300);

  // Clica via JS (ignora visibilidade — botão pode estar oculto em alguns temas)
  const navPromise = page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
  await page.evaluate(() => {
    const btn = document.querySelector('#ctl00_btnTrocarEmpresa');
    if (btn) btn.click();
  });
  // Se já era a loja atual, a navegação não acontece
  await navPromise.catch(() => sleep(1000));
  await sleep(800);
}

// ── Parser de OS ──────────────────────────────────────────────────────────────

function parseOSCards(texto, lojaKey) {
  const result = [];

  // Divide o texto em blocos por OS (cada card começa com "Ordem de Serviço N.º:")
  const rawBlocks = texto.split(/\n(?=Ordem de Servi[çc]o N[.º°]*:?\s*\d)/);

  for (const block of rawBlocks) {
    // Verifica se é realmente um card de OS
    const osNumMatch = block.match(/O\.?S\.?\s*N[.º°]*:?\s*(\d+)/i);
    if (!osNumMatch) continue;

    const osNum = parseInt(osNumMatch[1], 10);
    if (!osNum) continue;

    const dataMatch       = block.match(/Data:\s*(\d{2}\/\d{2}\/\d{4})/);
    const clienteMatch    = block.match(/Cliente:\s*(.+?)(?:\t|$)/m);
    const tipoMatch       = block.match(/Tipo:\s*(.+?)(?:\t|$)/m);
    const veiculoMatch    = block.match(/Ve[íi]culo:\s*(.+?)(?:\t|$)/m);
    const placaMatch      = block.match(/Placa:\s*(.+?)(?:\t|$)/m);
    const hodometroMatch  = block.match(/Hod[ôo]metro:\s*(\d+)/);
    const anoMatch        = block.match(/Ano:\s*(\d{4})/);
    const responsavelMatch= block.match(/Respons[áa]vel:\s*(.+?)(?:\t|Pesquisa|$)/m);
    const pesquisaMatch   = block.match(/Pesquisa:\s*(.+?)(?:\t|$)/m);
    const obsLines        = block.match(/Observa[çc][õo]es:\s*([\s\S]*?)(?=\n\nProdutos)/m);
    const horaInicioMatch = block.match(/(?:Hora\s+de\s+)?(?:Abertura|In[íi]cio):\s*(\d{2}:\d{2})/i);
    const horaFimMatch    = block.match(/(?:Hora\s+de\s+)?(?:Fechamento|Fim):\s*(\d{2}:\d{2})/i);

    // Totais
    const totalOSMatch    = block.match(/TOTAL\s+O\.S\.\s+R\$\s+([\d.,]+)\s+LB:\s*([\d.,]+)%/i);
    const servicosMatch   = block.match(/SERVI[ÇC]OS\s+R\$\s+([\d.,]+)/i);
    const produtosMatch   = block.match(/PRODUTOS\s+R\$\s+([\d.,]+)/i);

    // Itens
    const itens = [];
    const prodStart = block.indexOf('Produtos e Serviços');
    const pagStart  = block.indexOf('Pagamentos da OS');
    if (prodStart !== -1) {
      const itemsSection = block.slice(
        prodStart + 'Produtos e Serviços'.length,
        pagStart !== -1 ? pagStart : undefined,
      );
      for (const line of itemsSection.split('\n')) {
        const parts = line.split('\t');
        if (parts.length < 5) continue;
        const codigo = parts[0].trim();
        if (!codigo || codigo === 'Código' || codigo === 'TOTAL' || codigo === '') continue;
        const descricao = parts[1]?.trim() || '';
        if (!descricao) continue;

        itens.push({
          loja_key:       lojaKey,
          data_os:        displayToISO(dataMatch?.[1]),
          codigo,
          descricao,
          grupo:          parts[2]?.trim() || null,
          quantidade:     parseBRL(parts[3]),
          valor_total:    parseBRL(parts[4]),
          desconto_total: parseBRL(parts[5]),
          tabela_total:   parseBRL(parts[6]),
          custo_total:    parseBRL(parts[7]),
          executor:       parts[8]?.trim() || null,
        });
      }
    }

    // Pagamentos — colunas: Parcela | Vencimento | Forma de Pagamento | $ Parcela
    // Agrupa por forma: conta parcelas e soma valor total
    const pagamentos = [];
    if (pagStart !== -1) {
      const pagSection = block.slice(pagStart + 'Pagamentos da OS'.length);
      const totalIdx   = pagSection.search(/^\s*Total\b/m);
      const pagLines   = (totalIdx !== -1 ? pagSection.slice(0, totalIdx) : pagSection).split('\n');
      const byForma    = new Map();

      for (const line of pagLines) {
        const parts = line.split('\t');
        if (parts.length < 4) continue;
        const numParcela = parts[0].trim();
        const forma      = parts[2].trim();
        const valorStr   = parts[3].trim();

        // Só linhas de dados: parcela numérica, forma presente, não TOTAL PAGO
        if (!/^\d+$/.test(numParcela) || !forma || forma === 'Forma de Pagamento' || forma === 'TOTAL PAGO') continue;

        const valor = parseBRL(valorStr);
        if (!byForma.has(forma)) byForma.set(forma, { parcelas: 0, valor: 0 });
        const entry = byForma.get(forma);
        entry.parcelas++;
        entry.valor = Math.round((entry.valor + valor) * 100) / 100;
      }

      for (const [forma, data] of byForma) {
        pagamentos.push({ forma, parcelas: data.parcelas, valor: data.valor });
      }
    }

    const dataOS = displayToISO(dataMatch?.[1]);
    if (!dataOS) continue;

    result.push({
      loja_key:       lojaKey,
      os_numero:      osNum,
      data_os:        dataOS,
      hora_inicio:    horaInicioMatch?.[1] || null,
      hora_fim:       horaFimMatch?.[1] || null,
      cliente:        clienteMatch?.[1]?.trim() || null,
      tipo:           tipoMatch?.[1]?.trim() || null,
      veiculo:        veiculoMatch?.[1]?.trim() || null,
      placa:          placaMatch?.[1]?.trim() || null,
      hodometro:      hodometroMatch ? parseInt(hodometroMatch[1]) : null,
      ano:            anoMatch ? parseInt(anoMatch[1]) : null,
      responsavel:    responsavelMatch?.[1]?.trim() || null,
      pesquisa:       pesquisaMatch?.[1]?.trim() || null,
      observacoes:    obsLines?.[1]?.trim() || null,
      total_servicos: servicosMatch  ? parseBRL(servicosMatch[1]) : 0,
      total_produtos: produtosMatch  ? parseBRL(produtosMatch[1]) : 0,
      total_os:       totalOSMatch   ? parseBRL(totalOSMatch[1]) : 0,
      lucro_bruto_pct:totalOSMatch   ? parseFloat(totalOSMatch[2].replace(',', '.')) : null,
      pagamentos:     pagamentos.length > 0 ? pagamentos : null,
      itens,
    });
  }

  return result;
}

// ── Coleta de uma loja ────────────────────────────────────────────────────────

async function coletarLoja(page, loja, deDisplay, ateDisplay) {
  console.log(`\n  ━━━ ${loja.label} (${loja.key}) ━━━`);

  await page.goto(RELATORIO_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('#ctl00_cph_txtDataInicial', { timeout: 10000 });

  // Preenche datas
  await page.evaluate((de, ate) => {
    document.querySelector('#ctl00_cph_txtDataInicial').value = de;
    document.querySelector('#ctl00_cph_txtDataFinal').value   = ate;
  }, deDisplay, ateDisplay);

  // OS: Sim
  await page.select('#ctl00_cph_ddlMostrarOS', 'True');

  // Clica Gestão Periódica
  try {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
      page.click('#ctl00_cph_btnGestaoPeriodica'),
    ]);
  } catch {
    await sleep(4000);
  }
  await sleep(1000);

  let todasOS = [];
  let pagina = 1;

  while (true) {
    const texto = await page.evaluate(() => document.body.innerText);

    ensureDebugDir();
    fs.writeFileSync(
      path.join(DEBUG_DIR, `${loja.key}-p${pagina}-${Date.now()}.txt`),
      texto, 'utf8',
    );

    const osNaPage = parseOSCards(texto, loja.key);
    console.log(`    📄 Pág. ${pagina}: ${osNaPage.length} OS`);
    todasOS = todasOS.concat(osNaPage);

    // Verifica paginação (botão "Próximo")
    const temProximo = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('input[type=submit], a, button'));
      return btns.some(b =>
        /pr[oó]ximo|next/i.test((b.textContent || b.value || '').trim())
      );
    });
    if (!temProximo) break;

    const proximoSel = 'input[value*="róximo"], input[value*="roximo"], a[href*="Proximo"], button[title*="róximo"]';
    try {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }),
        page.click(proximoSel),
      ]);
    } catch {
      await sleep(3000);
    }
    pagina++;
    if (pagina > 50) break; // safety
  }

  console.log(`    ✅ Total: ${todasOS.length} OS coletadas`);
  return todasOS;
}

// ── Upsert Supabase ───────────────────────────────────────────────────────────

async function salvarNoSupabase(supabase, osCards) {
  if (!osCards.length) return;

  let inseridos = 0, atualizados = 0, erros = 0;
  let colunaPagamentosOk = true; // assume que a coluna existe; detecta se der erro

  for (const os of osCards) {
    const { itens, ...osData } = os;

    // Se a coluna pagamentos ainda não existir no DB, remove o campo para não falhar
    if (!colunaPagamentosOk) delete osData.pagamentos;

    // Upsert OS principal
    let { data: osRow, error: osErr } = await supabase
      .from('os_vendas')
      .upsert(osData, { onConflict: 'loja_key,os_numero', ignoreDuplicates: false })
      .select('id')
      .single();

    // Se erro for "column does not exist", retry sem pagamentos
    if (osErr && osErr.message?.includes('pagamentos')) {
      colunaPagamentosOk = false;
      console.warn('    ⚠️  Coluna pagamentos ausente — rode a migration 20260812120000_os_vendas_pagamentos.sql');
      delete osData.pagamentos;
      ({ data: osRow, error: osErr } = await supabase
        .from('os_vendas')
        .upsert(osData, { onConflict: 'loja_key,os_numero', ignoreDuplicates: false })
        .select('id')
        .single());
    }

    if (osErr) {
      console.error(`    ❌ OS ${os.os_numero}: ${osErr.message}`);
      erros++;
      continue;
    }

    const osId = osRow.id;

    // Remove itens antigos e reinserere (mais simples que upsert por código)
    if (itens.length > 0) {
      await supabase.from('os_itens').delete().eq('os_vendas_id', osId);
      const itensComId = itens.map(item => ({ ...item, os_vendas_id: osId }));
      const { error: itensErr } = await supabase.from('os_itens').insert(itensComId);
      if (itensErr) console.error(`    ⚠️  Itens OS ${os.os_numero}: ${itensErr.message}`);
    }

    inseridos++;
  }

  console.log(`    💾 Supabase: ${inseridos} OS salvas, ${erros} erros`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { de, ate } = parseArgs();
  const deDisplay  = isoToDisplay(de);
  const ateDisplay = isoToDisplay(ate);

  console.log(`\n🔄 Coleta OS Detalhadas — ${de} a ${ate}\n`);

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ NEXUSZ_SUPABASE_URL e NEXUSZ_SUPABASE_SERVICE_ROLE_KEY são obrigatórios no .env');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const socks5 = process.env.PUPPETEER_SOCKS5;
  const proxyArgs = socks5 ? [`--proxy-server=socks5://${socks5}`] : [];
  if (socks5) console.log(`🔒 Puppeteer via Tor SOCKS5 (${socks5})`);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      ...proxyArgs,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1366,768',
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8' });
  page.setDefaultTimeout(30000);

  try {
    await login(page);

    for (const loja of LOJAS) {
      // Troca para a loja
      await trocarLoja(page, loja.ddlValue);

      const osCards = await coletarLoja(page, loja, deDisplay, ateDisplay);
      await salvarNoSupabase(supabase, osCards);
    }

    console.log('\n✅ Coleta concluída!\n');
  } catch (err) {
    // Screenshot de debug antes de fechar
    try {
      ensureDebugDir();
      const ss = path.join(DEBUG_DIR, `error-${Date.now()}.png`);
      await page.screenshot({ path: ss, fullPage: true });
      console.error(`📸 Screenshot salvo: ${ss}`);
      const html = await page.content();
      fs.writeFileSync(ss.replace('.png', '.html'), html, 'utf8');
    } catch {}
    throw err;
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
