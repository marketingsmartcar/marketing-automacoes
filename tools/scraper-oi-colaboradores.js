'use strict';
/**
 * tools/scraper-oi-colaboradores.js
 *
 * Coleta dados de "Participação por Consultor" (Gestão Periódica + Mostrar O.S.=Sim)
 * para cada loja do OI, separando mecânicos de vendedores.
 *
 * Uso:
 *   node tools/scraper-oi-colaboradores.js --mes 5 --ano 2026
 *   node tools/scraper-oi-colaboradores.js --data-inicio 01/05/2026 --data-fim 31/05/2026
 */

require('dotenv').config();
const puppeteer = require('puppeteer');
const path      = require('path');
const fs        = require('fs');
const { syncColaboradoresOI } = require('./supabase-colaboradores-sync');

const BASE_URL      = 'https://sistemaoficinainteligente.com.br';
const LOGIN_URL     = `${BASE_URL}/Entrar.aspx?sair=1`;
const RELATORIO_URL = `${BASE_URL}/wfRelatorioOperacao.aspx`;
const SCREENSHOT_DIR = path.join(__dirname, '..', 'output', 'debug-oi');

const LOJAS = [
  { key: 'BR1',  value: '469',  label: 'BR01 CENTRO'     },
  { key: 'BR2',  value: '2201', label: 'BR02 VILA'        },
  { key: 'BR3',  value: '2202', label: 'BR03 AMERICANA'   },
  { key: 'BR4',  value: '1524', label: 'BR04 SAO CARLOS'  },
  { key: 'BR5',  value: '2203', label: 'BR05 MARINGA'     },
  { key: 'PEG1', value: '3098', label: 'PEG11 ARARAQUARA' },
  { key: 'PEG2', value: '3635', label: 'PEG12 SOROCABA'   },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parseBRL(str) {
  if (!str) return null;
  const n = parseFloat(
    str.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim()
  );
  return isNaN(n) ? null : n;
}

function ensureDebugDir() {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function saveDebug(page, nome) {
  ensureDebugDir();
  const base = path.join(SCREENSHOT_DIR, `${Date.now()}-colab-${nome}`);
  await page.screenshot({ path: `${base}.png`, fullPage: true }).catch(() => {});
  const txt = await page.evaluate(() => document.body.textContent).catch(() => '');
  fs.writeFileSync(`${base}.txt`, txt, 'utf8');
  console.log(`  📸 ${base}.png`);
}

// ── Login ─────────────────────────────────────────────────────────────────────

async function login(page) {
  console.log('🔐 Fazendo login...');
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });

  const realUrl = page.url();
  const title   = await page.title().catch(() => '?');
  console.log(`  🌐 URL: ${realUrl}  📄 Título: ${title}`);

  await page.waitForSelector('#Login1_UserName', { timeout: 30000 });
  await page.click('#Login1_UserName', { clickCount: 3 });
  await page.type('#Login1_UserName', process.env.OI_EMAIL, { delay: 30 });
  await page.click('#Login1_Password', { clickCount: 3 });
  await page.type('#Login1_Password', process.env.OI_SENHA, { delay: 30 });

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
    page.click('#Login1_btnEntrar'),
  ]);

  if (page.url().toLowerCase().includes('entrar'))
    throw new Error('Login falhou — verifique OI_EMAIL e OI_SENHA');

  console.log('  ✅ Logado:', page.url());
}

// ── Troca de loja ─────────────────────────────────────────────────────────────

async function trocarLoja(page, loja) {
  console.log(`\n🏪 ${loja.key} — ${loja.label}`);
  await page.goto(RELATORIO_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('#ddlTrocarEmpresa', { timeout: 10000 });
  await page.select('#ddlTrocarEmpresa', loja.value);
  await sleep(300);

  const nav = page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
  await page.evaluate(() => {
    const btn = document.querySelector('#ctl00_btnTrocarEmpresa');
    if (btn) btn.click();
  });
  await nav.catch(() => sleep(1000));
  await sleep(800);
}

// ── Coletarcolaboradores de uma loja ──────────────────────────────────────────

async function coletarColaboradoresLoja(page, startStr, endStr) {
  console.log(`  📊 Participação por Consultor (${startStr} → ${endStr})...`);

  await page.goto(RELATORIO_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('#ctl00_cph_txtDataInicial', { timeout: 10000 });

  // Preenche datas
  await page.evaluate((start, end) => {
    const setVal = (sel, v) => {
      const el = document.querySelector(sel);
      if (!el) return;
      el.value = v;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur',   { bubbles: true }));
    };
    setVal('#ctl00_cph_txtDataInicial', start);
    setVal('#ctl00_cph_txtDataFinal',   end);
  }, startStr, endStr);
  await sleep(300);

  // Clica "Gestão Periódica" (mesmo padrão do scraper existente que funciona)
  await page.waitForSelector('#ctl00_cph_btnGestaoPeriodica', { timeout: 5000 });
  try {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 45000 }),
      page.click('#ctl00_cph_btnGestaoPeriodica'),
    ]);
    console.log('    ✅ Relatório carregado');
  } catch (_) {
    await sleep(5000); // UpdatePanel — aguarda render
    console.log('    ✅ Relatório carregado (AJAX)');
  }
  await sleep(1000);

  // Extrai dados diretamente da tabela Participação (escopo limitado = rápido)
  const rows = await page.evaluate(() => {
    // Acha a tabela que tem "Nome*" + "Faturamento" + "Lucro Bruto" no cabeçalho
    const tables = document.querySelectorAll('table');
    let tbl = null;
    for (const t of tables) {
      const head = (t.rows[0] || t.rows[1] || { textContent: '' }).textContent;
      if (/nome/i.test(head) && /faturamento/i.test(head) && /lucro/i.test(head)) {
        tbl = t; break;
      }
    }
    if (!tbl) return [];

    const result = [];
    for (const row of tbl.rows) {
      if (row.cells.length < 8) continue;
      const nome = row.cells[0].textContent.trim();
      if (!nome || /^nome/i.test(nome) || nome === '') continue;
      // Linha de total: primeira célula sem letras ou só espaço
      if (!/[a-zA-ZÀ-ú]/.test(nome)) continue;

      // Pega link Grupo — o href do ASP.NET é "javascript:__doPostBack(...)"
      const links = row.querySelectorAll('a');
      const grupoA = Array.from(links).find(a => a.textContent.trim() === 'Grupo');

      result.push({
        nome,
        fat:     row.cells[1]?.textContent.trim() || '',
        cmv:     row.cells[2]?.textContent.trim() || '',
        lucro:   row.cells[3]?.textContent.trim() || '',
        itens:   row.cells[7]?.textContent.trim() || '',
        vlProd:  row.cells[8]?.textContent.trim() || '',
        pctProd: row.cells[9]?.textContent.trim() || '',
        vlServ:  row.cells[10]?.textContent.trim() || '',
        pctServ: row.cells[11]?.textContent.trim() || '',
        // .href devolve a URL completa incluindo "javascript:__doPostBack(...)"
        grupoHref: grupoA ? grupoA.href : '',
      });
    }
    return result;
  }).catch(() => []);

  if (!rows.length) {
    console.log('    ⚠️  Tabela Participação por Consultor não encontrada');
    await saveDebug(page, 'sem-participacao');
    return [];
  }
  console.log(`    ${rows.length} colaborador(es) encontrado(s)`);

  const resultado = [];

  for (const c of rows) {
    const matchParen = c.nome.match(/\((.+?)\)$/);
    const detalhes   = matchParen ? matchParen[1].trim().toUpperCase() : '';

    let cargo = 'OUTRO';
    if (/mec[aâ]nico/i.test(detalhes)) cargo = 'MECANICO';
    else if (/vend|consultor/i.test(detalhes)) cargo = 'VENDEDOR';
    else if (/estoque/i.test(detalhes)) cargo = 'ESTOQUE';
    else if (/gerente/i.test(detalhes)) cargo = 'GERENTE';

    const nomeBase = c.nome.replace(/\s*\(.*?\)\s*$/, '').trim();
    const unidade  = detalhes.replace(/mec[aâ]nico|vendedor|consultor.*?de.*?vendas|estoque|gerente/i, '').trim();

    const row = {
      nome:        c.nome,
      nome_base:   nomeBase,
      cargo,
      unidade,
      faturamento: parseBRL(c.fat),
      cmv:         parseBRL(c.cmv),
      lucro_bruto: parseBRL(c.lucro),
      itens:       parseInt(c.itens) || 0,
      vl_produto:  parseBRL(c.vlProd),
      pct_produto: parseInt(c.pctProd) || 0,
      vl_servico:  parseBRL(c.vlServ),
      pct_servico: parseInt(c.pctServ) || 0,
      grupos:      [],
    };

    // Para mecânicos E vendedores: coleta grupos via link PostBack
    if (c.grupoHref && (cargo === 'MECANICO' || cargo === 'VENDEDOR' || cargo === 'ESTOQUE')) {
      try {
        row.grupos = await coletarGrupos(page, c.grupoHref, c.nome);
        console.log(`    └─ ${nomeBase}: ${row.grupos.length} grupo(s)`);
      } catch (err) {
        console.log(`    └─ ${nomeBase}: ❌ grupos — ${err.message}`);
        await saveDebug(page, `grupo-${nomeBase.slice(0, 20).replace(/\s/g, '_')}`);
        // Volta para a lista principal após erro
        await page.goto(RELATORIO_URL, { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
        await page.click('#ctl00_cph_btnGestaoPeriodica').catch(() => {});
        await sleep(3000);
      }
    }

    resultado.push(row);
  }

  return resultado;
}

// ── Coleta grupos de um colaborador ──────────────────────────────────────────

async function coletarGrupos(page, grupoHref, nomeColab) {
  // grupoHref pode ser:
  //   "javascript:__doPostBack('ctl00$cph$...','Grupo')"   ← ASP.NET WebForms
  //   "https://..."  ← URL direta (raro)
  const jsMatch = grupoHref.match(/__doPostBack\('([^']+)','([^']*)'\)/);

  if (jsMatch) {
    const eventTarget   = jsMatch[1];
    const eventArgument = jsMatch[2];

    // Detecta nova aba antes de disparar o PostBack
    const newPagePromise = new Promise(resolve => {
      const handler = async target => {
        const np = await target.page().catch(() => null);
        page.browser().off('targetcreated', handler);
        resolve(np);
      };
      page.browser().on('targetcreated', handler);
      setTimeout(() => { page.browser().off('targetcreated', handler); resolve(null); }, 2000);
    });

    await page.evaluate((et, ea) => {
      if (typeof __doPostBack === 'function') {
        __doPostBack(et, ea);
      } else {
        const form = document.querySelector('form');
        if (!form) return;
        const etEl = document.querySelector('#__EVENTTARGET');
        const eaEl = document.querySelector('#__EVENTARGUMENT');
        if (etEl) etEl.value = et;
        if (eaEl) eaEl.value = ea;
        form.submit();
      }
    }, eventTarget, eventArgument);

    const newPage = await newPagePromise;
    if (newPage) {
      // Abriu em nova aba
      await newPage.waitForSelector('table', { timeout: 15000 });
      await sleep(500);
      const grupos = await extrairTabelaGrupos(newPage);
      await newPage.close().catch(() => {});
      return grupos;
    }

    // Postback na mesma página — aguarda UpdatePanel ou navegação
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 12000 });
    } catch (_) {
      await sleep(3000);
    }
    await sleep(500);
    const grupos = await extrairTabelaGrupos(page);

    // Volta ao relatório Gestão Periódica
    await page.goBack({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => sleep(2000));
    await sleep(800);
    return grupos;

  } else if (grupoHref.startsWith('http') || grupoHref.startsWith('/')) {
    const url = grupoHref.startsWith('/') ? `${BASE_URL}${grupoHref}` : grupoHref;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(500);
    const grupos = await extrairTabelaGrupos(page);
    await page.goBack({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => sleep(2000));
    await sleep(800);
    return grupos;
  }

  return [];
}

async function extrairTabelaGrupos(page) {
  return page.evaluate(() => {
    // Busca tabela "Por Grupo ou Regra"
    const allTables = Array.from(document.querySelectorAll('table'));
    let tbl = allTables.find(t =>
      t.textContent.includes('Grupo ou Regra') ||
      t.textContent.includes('Por Grupo') ||
      t.textContent.includes('Faturamento') && t.textContent.includes('Lucro Bruto') && t.rows.length > 2
    );
    if (!tbl) return [];

    const rows = Array.from(tbl.querySelectorAll('tr'));
    const result = [];

    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length < 4) continue;

      const grupo = cells[0].textContent.trim();
      if (!grupo || /grupo|regra|total/i.test(grupo) && cells.length < 6) continue;
      if (/^total/i.test(grupo)) continue;

      const tipo = cells[1]?.textContent.trim() || '';
      const fat  = cells[2]?.textContent.trim() || '';
      const cmv  = cells[3]?.textContent.trim() || '';
      const lucro = cells[4]?.textContent.trim() || '';
      const itens = cells[cells.length - 1]?.textContent.trim() || '';

      if (!fat.includes('R$') && !fat.match(/[\d,]/)) continue;

      result.push({ grupo, tipo, fat, cmv, lucro, itens });
    }

    return result;
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  // Parse --mes / --ano ou --data-inicio / --data-fim
  const getMesAno = () => {
    const mesIdx = args.indexOf('--mes');
    const anoIdx = args.indexOf('--ano');
    const mes = mesIdx >= 0 ? parseInt(args[mesIdx + 1]) : new Date().getMonth() + 1;
    const ano = anoIdx >= 0 ? parseInt(args[anoIdx + 1]) : new Date().getFullYear();
    const pad = n => String(n).padStart(2, '0');
    const diasMes = new Date(ano, mes, 0).getDate();
    return {
      start: `01/${pad(mes)}/${ano}`,
      end:   `${diasMes}/${pad(mes)}/${ano}`,
      mes, ano,
    };
  };

  const getDataIniciofim = () => {
    const diIdx = args.indexOf('--data-inicio');
    const dfIdx = args.indexOf('--data-fim');
    if (diIdx >= 0 && dfIdx >= 0) {
      return { start: args[diIdx + 1], end: args[dfIdx + 1] };
    }
    return null;
  };

  const range = getDataIniciofim() || getMesAno();
  console.log(`\n📅 OI Colaboradores: ${range.start} → ${range.end}\n`);

  if (!process.env.OI_EMAIL || !process.env.OI_SENHA)
    throw new Error('OI_EMAIL e OI_SENHA não definidos no .env');

  const browser = await puppeteer.launch({
    headless: 'new',
    protocolTimeout: 300000,
    args: [
      '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1366,768',
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  );
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins',   { get: () => [1, 2, 3] });
    Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en-US'] });
  });

  const resultadoGeral = {};
  let totalColabs = 0, totalGrupos = 0, falhas = [];

  try {
    await login(page);

    for (let i = 0; i < LOJAS.length; i++) {
      const loja = LOJAS[i];
      try {
        await trocarLoja(page, loja);
        const colabs = await coletarColaboradoresLoja(page, range.start, range.end);
        resultadoGeral[loja.key] = colabs;
        totalColabs += colabs.length;
        totalGrupos += colabs.reduce((s, c) => s + c.grupos.length, 0);
        console.log(`  ✅ ${loja.key}: ${colabs.length} colab(s), ${colabs.reduce((s, c) => s + c.grupos.length, 0)} grupo(s)`);

        await syncColaboradoresOI(loja.key, loja.label, range.start, range.end, colabs);

        if (i < LOJAS.length - 1) await sleep(3000);
      } catch (err) {
        console.error(`  ❌ ${loja.key} falhou:`, err.message);
        await saveDebug(page, `erro-${loja.key}`);
        falhas.push(loja.key);
        resultadoGeral[loja.key] = null;
      }
    }

    console.log(`\n✅ Concluído: ${totalColabs} colaboradores, ${totalGrupos} registros de grupos`);
    if (falhas.length) console.log(`❌ Falhas (${falhas.length}): ${falhas.join(', ')}`);

  } catch (err) {
    await saveDebug(page, 'erro-geral').catch(() => {});
    await browser.close();
    throw err;
  }

  await browser.close();
  return resultadoGeral;
}

main().catch(e => { console.error(e.message || e); process.exit(1); });
