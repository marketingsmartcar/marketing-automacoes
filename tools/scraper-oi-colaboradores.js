'use strict';
/**
 * tools/scraper-oi-colaboradores.js
 *
 * Coleta dados de "Participação por Consultor" (Gestão Periódica)
 * para cada loja do OI, separando mecânicos de vendedores.
 * Para vendedores: também habilita "Mostrar O.S." e coleta cada O.S. com itens.
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

// ── Coleta colaboradores de uma loja ─────────────────────────────────────────

async function coletarColaboradoresLoja(page, startStr, endStr) {
  console.log(`  📊 Participação por Consultor (${startStr} → ${endStr})...`);

  await page.goto(RELATORIO_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('#ctl00_cph_txtDataInicial', { timeout: 10000 });

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

  await page.waitForSelector('#ctl00_cph_btnGestaoPeriodica', { timeout: 5000 });
  try {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 45000 }),
      page.click('#ctl00_cph_btnGestaoPeriodica'),
    ]);
  } catch (_) {
    await sleep(5000);
  }
  await sleep(1000);

  const rows = await page.evaluate(() => {
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
      if (!/[a-zA-ZÀ-ú]/.test(nome)) continue;

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

    let cargo = 'VENDEDOR'; // padrão: quem aparece no relatório sem cargo explícito é consultor/vendedor
    if (/mec[aâ]nico/i.test(detalhes)) cargo = 'MECANICO';
    else if (/vend|consultor/i.test(detalhes)) cargo = 'VENDEDOR';
    else if (/estoque/i.test(detalhes)) cargo = 'ESTOQUE';
    else if (/gerente/i.test(detalhes)) cargo = 'GERENTE';
    // Linhas de grupo (ex: "3 GUILHERME / ADRIANO PEG ARARAQUARA") → montadores
    else if (/^\d+\s+\w.+\//.test(c.nome)) cargo = 'MECANICO';

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
      os_list:     [],
    };

    if (c.grupoHref && (cargo === 'MECANICO' || cargo === 'VENDEDOR' || cargo === 'ESTOQUE')) {
      try {
        const { grupos, os_list } = await coletarGrupoEOS(page, c.grupoHref, c.nome, cargo);
        row.grupos  = grupos;
        row.os_list = os_list;
        console.log(`    └─ ${nomeBase}: ${row.grupos.length} grupo(s), ${row.os_list.length} OS`);
      } catch (err) {
        console.log(`    └─ ${nomeBase}: ❌ grupos/OS — ${err.message}`);
        await saveDebug(page, `grupo-${nomeBase.slice(0, 20).replace(/\s/g, '_')}`);
        await page.goto(RELATORIO_URL, { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
        await page.click('#ctl00_cph_btnGestaoPeriodica').catch(() => {});
        await sleep(3000);
      }
    }

    resultado.push(row);
  }

  return resultado;
}

// ── Navega para a página do grupo via PostBack ────────────────────────────────

async function navegarParaGrupo(page, grupoHref) {
  const jsMatch = grupoHref.match(/__doPostBack\('([^']+)','([^']*)'\)/);

  if (jsMatch) {
    const [, et, ea] = jsMatch;

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
    }, et, ea);

    const newPage = await newPagePromise;
    return { page: newPage || page, isNewTab: !!newPage };
  }

  if (grupoHref.startsWith('http') || grupoHref.startsWith('/')) {
    const url = grupoHref.startsWith('/') ? `${BASE_URL}${grupoHref}` : grupoHref;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    return { page, isNewTab: false };
  }

  return null;
}

// ── Coleta grupos + OS de um colaborador ─────────────────────────────────────

async function coletarGrupoEOS(page, grupoHref, nomeColab, cargo) {
  const nav = await navegarParaGrupo(page, grupoHref);
  if (!nav) return { grupos: [], os_list: [] };

  const targetPage = nav.page;

  try {
    await targetPage.waitForNavigation({ waitUntil: 'networkidle2', timeout: 12000 });
  } catch (_) {
    await sleep(3000);
  }
  await sleep(500);

  // Extrai grupos (sempre)
  const grupos = await extrairTabelaGrupos(targetPage);

  // Para vendedores: habilita "Mostrar O.S." e extrai OS com itens
  let os_list = [];
  if (cargo === 'VENDEDOR') {
    os_list = await coletarOSVendedor(targetPage, nomeColab);
  }

  if (nav.isNewTab) {
    await targetPage.close().catch(() => {});
  } else {
    await page.goBack({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => sleep(2000));
    await sleep(800);
  }

  return { grupos, os_list };
}

// ── Extrai tabela "Por Grupo" ─────────────────────────────────────────────────

async function extrairTabelaGrupos(page) {
  return page.evaluate(() => {
    const allTables = Array.from(document.querySelectorAll('table'));

    // Prioridade 1: tabela com cabeçalho explícito "Grupo ou Regra" ou "Por Grupo"
    let tbl = allTables.find(t => {
      const head = (t.rows[0] || t.rows[1] || { textContent: '' }).textContent;
      return /grupo\s*(ou\s*regra)?/i.test(head) && /faturamento/i.test(head);
    });

    // Prioridade 2: tabela onde a 1ª coluna do cabeçalho contém "grupo" (não "responsável" / "nome")
    if (!tbl) {
      tbl = allTables.find(t => {
        const firstCell = (t.rows[0]?.cells[0] || t.rows[1]?.cells[0] || { textContent: '' }).textContent.trim();
        return /grupo/i.test(firstCell) && !/respons|nome/i.test(firstCell);
      });
    }

    if (!tbl) return [];

    const rows = Array.from(tbl.querySelectorAll('tr'));
    const result = [];

    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length < 4) continue;
      const grupo = cells[0].textContent.trim();
      if (!grupo) continue;
      // Ignora cabeçalhos e totais
      if (/^(grupo|regra|total)/i.test(grupo)) continue;
      // Ignora linhas de lixo / cabeçalhos / nomes de pessoas
      if (grupo.length > 100) continue;              // blob de cabeçalho completo da tabela
      if (/R\$/.test(grupo)) continue;               // linhas estatísticas com valores monetários
      if (/\(\s*(mec[aâ]nico|vendedor|consultor|estoque|gerente|operador)/i.test(grupo)) continue;
      if (/exclu[ií]do|desistência|desistencia/i.test(grupo)) continue;

      const tipo  = cells[1]?.textContent.trim() || '';
      const fat   = cells[2]?.textContent.trim() || '';
      const cmv   = cells[3]?.textContent.trim() || '';
      const lucro = cells[4]?.textContent.trim() || '';
      const itens = cells[cells.length - 1]?.textContent.trim() || '';

      if (!fat.includes('R$') && !fat.match(/[\d,]/)) continue;
      result.push({ grupo, tipo, fat, cmv, lucro, itens });
    }
    return result;
  });
}

// ── Coleta O.S. para vendedor (extrai diretamente da tabela, sem navegar por OS) ──

async function coletarOSVendedor(page, nomeColab) {
  await page.setDefaultTimeout(120000);

  // Configura listener de navegação ANTES de habilitar Mostrar OS
  // — AutoPostBack do dropdown dispara logo após page.evaluate() retornar
  const navPromise = page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 })
    .catch(() => null);

  const enabled = await habilitarMostrarOS(page);
  if (!enabled) {
    return []; // sem dropdown → sem OS
  }

  console.log(`      🔍 "Mostrar O.S." habilitado para ${nomeColab.split('(')[0].trim()}`);

  // Tenta também clicar no botão de filtro (caso não tenha AutoPostBack)
  await submitFiltro(page);

  // Aguarda navegação completar (AutoPostBack ou submit — o que vier primeiro)
  await navPromise;
  await sleep(2000); // pequeno buffer pós-rendering

  const os_list = [];
  const vistos  = new Set();
  let pagina    = 1;

  while (true) {
    const rows = await extrairTabelaOS(page);
    for (const row of rows) {
      if (vistos.has(row.os_numero)) continue;
      vistos.add(row.os_numero);
      os_list.push(row);
    }

    const { temProxima, totalPaginas } = await infoPaginacao(page);
    if (pagina === 1 && totalPaginas > 1) {
      console.log(`      📋 ${totalPaginas} página(s) de OS`);
    }
    if (!temProxima) break;

    console.log(`      ➡️  Página ${pagina + 1}/${totalPaginas}...`);
    await clicarProximaPagina(page);
    pagina++;
    await sleep(2000);
  }

  if (os_list.length) {
    console.log(`      📋 ${os_list.length} O.S. em ${pagina} página(s)`);
  } else {
    console.log(`      ⚠️  Nenhuma O.S. encontrada`);
  }
  return os_list;
}

// ── Verifica paginação de OS ──────────────────────────────────────────────────

async function infoPaginacao(page) {
  return page.evaluate(() => {
    const body = document.body.textContent || '';
    // "Página 1 de 4"
    const m = body.match(/P[aá]gina\s+(\d+)\s+de\s+(\d+)/i);
    const paginaAtual  = m ? parseInt(m[1]) : 1;
    const totalPaginas = m ? parseInt(m[2]) : 1;

    // Verifica se o link "Próxima" existe e está ativo
    const links = Array.from(document.querySelectorAll('a'));
    const proxLink = links.find(a => /pr[oó]xima|next|>>/i.test(a.textContent.trim()));
    const temProxima = !!proxLink && paginaAtual < totalPaginas;

    return { paginaAtual, totalPaginas, temProxima };
  });
}

// ── Clica no link "Próxima" da lista de OS ───────────────────────────────────

async function clicarProximaPagina(page) {
  const clicou = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    const proxLink = links.find(a => /pr[oó]xima|next|>>/i.test(a.textContent.trim()));
    if (!proxLink) return false;

    const href = proxLink.href || '';
    if (href.startsWith('javascript:')) {
      // PostBack
      const m = href.match(/__doPostBack\('([^']+)','([^']*)'\)/);
      if (m) {
        if (typeof __doPostBack === 'function') __doPostBack(m[1], m[2]);
        else {
          const etEl = document.querySelector('#__EVENTTARGET');
          const eaEl = document.querySelector('#__EVENTARGUMENT');
          if (etEl) etEl.value = m[1];
          if (eaEl) eaEl.value = m[2];
          document.querySelector('form')?.submit();
        }
        return true;
      }
    }
    proxLink.click();
    return true;
  });

  if (clicou) {
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    } catch (_) {
      await sleep(2000);
    }
  }
}

// ── Habilita "Mostrar O.S." na página ────────────────────────────────────────

async function habilitarMostrarOS(page) {
  return page.evaluate(() => {
    // Tentativas por seletor direto
    const seletores = [
      'select[id*="MostrarOS"]',
      'select[id*="mostrarOS"]',
      'select[id*="mostrar_os"]',
      'select[id*="ddlMostrarOS"]',
      'select[id*="ExibirOS"]',
      'select[name*="MostrarOS"]',
      'input[type="checkbox"][id*="MostrarOS"]',
      'input[type="checkbox"][id*="chkMostrarOS"]',
    ];

    for (const sel of seletores) {
      const el = document.querySelector(sel);
      if (!el) continue;
      if (el.tagName === 'SELECT') {
        for (const opt of el.options) {
          if (/^(sim|s|1|yes|true)$/i.test(opt.value) || /^(sim|yes)$/i.test(opt.text.trim())) {
            if (el.value !== opt.value) {
              el.value = opt.value;
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }
            return true;
          }
        }
      } else if (el.type === 'checkbox') {
        if (!el.checked) {
          el.checked = true;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return true;
      }
    }

    // Busca por texto ao redor
    for (const sel of document.querySelectorAll('select')) {
      const contexto = [
        sel.closest('td, div, span')?.previousElementSibling?.textContent || '',
        document.querySelector(`label[for="${sel.id}"]`)?.textContent || '',
        sel.closest('tr')?.cells[0]?.textContent || '',
      ].join(' ').toLowerCase();

      if (/mostrar\s*(o\.?s\.?|ordens?)/.test(contexto)) {
        for (const opt of sel.options) {
          if (/sim|yes|1/i.test(opt.text) || /^(s|1)$/i.test(opt.value)) {
            sel.value = opt.value;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        }
      }
    }

    return false;
  });
}

// ── Submete o formulário de filtro da página do grupo ────────────────────────

async function submitFiltro(page) {
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll(
      'input[type="submit"], button[type="submit"], input[type="button"], button'
    ));
    const btn = btns.find(b =>
      /filtrar|buscar|gerar|aplicar|atualizar|pesquisar/i.test(b.value || b.textContent)
    );
    if (btn) { btn.click(); return true; }
    return false;
  });

  if (clicked) {
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    } catch (_) {
      await sleep(3000);
    }
  }
  return clicked;
}

// ── Extrai O.S. diretamente da tabela (sem navegar a cada OS) ────────────────

async function extrairTabelaOS(page) {
  return page.evaluate(() => {
    const parseNum = (str) => {
      if (!str) return null;
      const clean = String(str).replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim();
      const n = parseFloat(clean);
      return isNaN(n) ? null : n;
    };

    // Localiza a tabela dentro do content placeholder (evita menus de navegação)
    const container = document.querySelector('#ctl00_cph, #ContentPlaceHolder1, .content-area') || document.body;
    let osTbl = null;
    for (const t of container.querySelectorAll('table')) {
      // Amostra as primeiras 4 linhas de dados para detectar se tem OS
      const sample = Array.from(t.rows).slice(1, 5);
      const hasOS = sample.some(row =>
        Array.from(row.querySelectorAll('a')).some(a => /^\d{4,6}$/.test(a.textContent.trim()))
      );
      if (hasOS) { osTbl = t; break; }
    }
    if (!osTbl) return [];

    const result = [];
    for (const row of osTbl.rows) {
      const osLink = Array.from(row.querySelectorAll('a')).find(a => /^\d{4,6}$/.test(a.textContent.trim()));
      if (!osLink) continue;

      const cells = Array.from(row.querySelectorAll('td')).map(c => c.textContent.trim());
      const osNum = osLink.textContent.trim();

      // Data: célula com padrão DD/MM/AAAA
      const osData = cells.find(c => /\d{2}\/\d{2}\/\d{4}/.test(c))?.match(/\d{2}\/\d{2}\/\d{4}/)?.[0] || '';

      // Células monetárias (últimas 3: serviço, produto, total)
      const moneyIdxs = [];
      cells.forEach((c, i) => {
        if (/R\$/.test(c) || /^\d{1,3}(\.\d{3})*,\d{2}$/.test(c)) moneyIdxs.push(i);
      });

      // Cliente: primeiro texto longo sem ser data, número ou moeda
      const cliente = cells.find(c =>
        c.length > 3 &&
        !/\d{2}\/\d{2}\/\d{4}/.test(c) &&
        !/^\d{1,6}$/.test(c) &&
        !/R\$/.test(c) &&
        !/^[\d.,]+$/.test(c)
      ) || '';

      result.push({
        os_numero:   osNum,
        os_data:     osData,
        cliente:     cliente.slice(0, 100),
        tipo:        '',
        responsavel: '',
        veiculo:     '',
        placa:       '',
        pesquisa:    '',
        vl_servico:  moneyIdxs.length >= 3 ? parseNum(cells[moneyIdxs[moneyIdxs.length - 3]]) : null,
        vl_produto:  moneyIdxs.length >= 2 ? parseNum(cells[moneyIdxs[moneyIdxs.length - 2]]) : null,
        vl_total:    moneyIdxs.length >= 1 ? parseNum(cells[moneyIdxs[moneyIdxs.length - 1]]) : null,
        items:       [],
      });
    }
    return result;
  }).catch(() => []);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

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
  let totalColabs = 0, totalGrupos = 0, totalOS = 0, falhas = [];

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
        totalOS     += colabs.reduce((s, c) => s + c.os_list.length, 0);
        console.log(`  ✅ ${loja.key}: ${colabs.length} colab(s), ${colabs.reduce((s, c) => s + c.grupos.length, 0)} grupos, ${colabs.reduce((s, c) => s + c.os_list.length, 0)} OS`);

        await syncColaboradoresOI(loja.key, loja.label, range.start, range.end, colabs);

        if (i < LOJAS.length - 1) await sleep(3000);
      } catch (err) {
        console.error(`  ❌ ${loja.key} falhou:`, err.message);
        await saveDebug(page, `erro-${loja.key}`);
        falhas.push(loja.key);
        resultadoGeral[loja.key] = null;
      }
    }

    console.log(`\n✅ Concluído: ${totalColabs} colaboradores, ${totalGrupos} grupos, ${totalOS} ordens de serviço`);
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
