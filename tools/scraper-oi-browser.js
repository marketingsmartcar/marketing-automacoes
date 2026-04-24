/**
 * tools/scraper-oi-browser.js
 *
 * Coleta dados do Oficina Inteligente via Puppeteer (navegador headless).
 * Faz login uma vez e alterna as lojas pelo seletor no canto superior direito.
 *
 * Uso:
 *   node tools/scraper-oi-browser.js --listar          # lista lojas disponíveis no dropdown
 *   node tools/scraper-oi-browser.js                   # coleta dados de hoje
 *   node tools/scraper-oi-browser.js 2026-04-22        # data específica
 *   node tools/scraper-oi-browser.js --sem-espera      # sem delay de 6min (teste, 1ª loja)
 */

'use strict';
require('dotenv').config();
const puppeteer = require('puppeteer');
const path      = require('path');
const fs        = require('fs');
const https     = require('https');
const pdfParse  = require('pdf-parse'); // v1.x — exporta função diretamente

const BASE_URL       = 'https://sistemaoficinainteligente.com.br';
const LOGIN_URL      = `${BASE_URL}/Entrar.aspx?sair=1`;
const RELATORIO_URL  = `${BASE_URL}/wfRelatorioOperacao.aspx`;
const DELAY_LOJAS_MS = 5 * 1000; // 5s entre lojas (só margem de segurança pós-navegação)
const SCREENSHOT_DIR = path.join(__dirname, '..', 'output', 'debug-oi');

// 22 grupos de produto que representam pneus vendidos no OI
const GRUPOS_PNEU = [
  'PNEU IMPORTADO (CURVA A)',
  'PNEU IMPORTADO (PROMOCIONAL)',
  'PNEU IMPORTADO AGRICOLA',
  'PNEU IMPORTADO ALL TERRAIN',
  'PNEU IMPORTADO CAMIONETE',
  'PNEU IMPORTADO CARGA LEVE',
  'PNEU IMPORTADO CARGA PESADA',
  'PNEU IMPORTADO INDUSTRIAL',
  'PNEU IMPORTADO MOTO',
  'PNEU IMPORTADO PASSEIO/SUV',
  'PNEU IMPORTADO PERFIL BAIXO',
  'PNEU IMPORTADO RUNFLAT',
  'PNEU NACIONAL AGRICOLA',
  'PNEU NACIONAL ALL TERRAIN',
  'PNEU NACIONAL CAMIONETE',
  'PNEU NACIONAL CARGA LEVE',
  'PNEU NACIONAL CARGA PESADA',
  'PNEU NACIONAL INDUSTRIAL',
  'PNEU NACIONAL MOTO',
  'PNEU NACIONAL PASSEIO/SUV',
  'PNEU NACIONAL PERFIL BAIXO',
  'PNEU NACIONAL RUNFLAT',
];

// Ordem deve bater com as colunas G→O da planilha (BR1…BR7, PEG1, PEG2)
// value = valor do <option> em #ddlTrocarEmpresa
const LOJAS = [
  { key: 'BR1',  value: '469',  label: 'BR01 CENTRO'     },
  { key: 'BR2',  value: '2201', label: 'BR02 VILA'        },
  { key: 'BR3',  value: '2202', label: 'BR03 AMERICANA'   },
  { key: 'BR4',  value: '1524', label: 'BR04 SAO CARLOS'  },
  { key: 'BR5',  value: '2203', label: 'BR05 MARINGA'     },
  { key: 'BR6',  value: '2155', label: 'BR06 JAU'         },
  { key: 'BR7',  value: '3333', label: 'BR08 IBITINGA'    },
  { key: 'PEG1', value: '3098', label: 'PEG11 ARARAQUARA' },
  { key: 'PEG2', value: '3635', label: 'PEG12 SOROCABA'   },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function formatDate(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}

function firstOfMonth(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `01/${m}/${date.getFullYear()}`;
}

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
  const base = path.join(SCREENSHOT_DIR, `${Date.now()}-${nome}`);
  await page.screenshot({ path: `${base}.png`, fullPage: true });
  const txt = await page.evaluate(() => document.body.innerText);
  fs.writeFileSync(`${base}.txt`, txt, 'utf8');
  console.log(`  📸 ${base}.png`);
  return txt;
}

// ── Login ─────────────────────────────────────────────────────────────────────

async function login(page) {
  console.log('🔐 Fazendo login...');
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('#Login1_UserName', { timeout: 15000 });

  await page.click('#Login1_UserName', { clickCount: 3 });
  await page.type('#Login1_UserName', process.env.OI_EMAIL, { delay: 30 });

  await page.click('#Login1_Password', { clickCount: 3 });
  await page.type('#Login1_Password', process.env.OI_SENHA, { delay: 30 });

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
    page.click('#Login1_btnEntrar'),
  ]);

  if (page.url().toLowerCase().includes('entrar')) {
    throw new Error('Login falhou — verifique OI_EMAIL e OI_SENHA no .env');
  }
  console.log('  ✅ Logado:', page.url());
}

// ── Listar lojas ──────────────────────────────────────────────────────────────

async function listarLojas(page) {
  await page.goto(RELATORIO_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('#ddlTrocarEmpresa', { timeout: 10000 });

  const opcoes = await page.evaluate(() => {
    const sel = document.querySelector('#ddlTrocarEmpresa');
    return sel
      ? Array.from(sel.options).map(o => ({ value: o.value, text: o.text.trim() }))
      : [];
  });

  console.log('\n🏪 Lojas disponíveis em #ddlTrocarEmpresa:');
  opcoes.forEach(o => console.log(`  value="${o.value}" → ${o.text}`));
}

// ── Troca de loja ─────────────────────────────────────────────────────────────

async function trocarLoja(page, loja) {
  console.log(`\n🏪 Trocando → ${loja.label} (value=${loja.value})`);
  await page.goto(RELATORIO_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('#ddlTrocarEmpresa', { timeout: 10000 });

  // Seleciona a loja no dropdown
  await page.select('#ddlTrocarEmpresa', loja.value);
  await sleep(300);

  // Clica no botão via JS (ignora visibilidade — pode estar oculto em alguns temas)
  const navPromise = page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
  await page.evaluate(() => {
    const btn = document.querySelector('#ctl00_btnTrocarEmpresa');
    if (btn) btn.click();
  });
  // Se não houve navegação (já era a loja atual), aguarda 1 s e segue
  await navPromise.catch(() => sleep(1000));

  await sleep(800);
  console.log('  ✅ Loja ativa:', page.url());
}

// ── Preenche datas no formulário de relatório ─────────────────────────────────

async function preencherDatas(page, startStr, endStr) {
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
}

// ── Parser: Gestão Periódica ──────────────────────────────────────────────────

function parseGestaoPeriodica(texto) {
  const lines = texto.split('\n');
  let faturamento = null;
  let lucroBruto  = null;
  const osMap     = {};

  let inFat = false, inOS = false, headerDone = false;

  for (const raw of lines) {
    const line = raw.trim();

    if (line === 'Faturamento por Área') {
      inFat = true; inOS = false; headerDone = false; continue;
    }
    if (line === 'Tipo de Ordem de Serviço') {
      inFat = false; inOS = true; headerDone = false; continue;
    }
    if (/^(Participação|Mapa de OS|Pesquisa de Mídia|Faturamento por Responsável)/.test(line)) {
      inFat = false; inOS = false;
    }

    if (!headerDone) { headerDone = true; continue; }

    const parts = raw.split('\t');

    // Total da seção Faturamento por Área: primeira coluna vazia
    if (inFat && parts[0].trim() === '' && parts.length >= 8) {
      const f = (parts[1] || '').trim();
      const l = (parts[7] || '').trim();
      if (/R\$/.test(f)) faturamento = parseBRL(f);
      if (/R\$/.test(l)) lucroBruto  = parseBRL(l);
    }

    // Linhas de dado da seção Tipo de OS
    if (inOS && parts[0].trim() && parts[0].trim() !== 'Tipo de OS') {
      const nome = parts[0].trim().toUpperCase();
      const qtd  = parseInt(parts[3], 10);
      if (!isNaN(qtd)) osMap[nome] = qtd;
    }
  }

  const getOS = (...kws) => {
    for (const [nome, qtd] of Object.entries(osMap)) {
      if (kws.every(k => nome.includes(k))) return qtd;
    }
    return null;
  };

  const sumOS = (kw) =>
    Object.entries(osMap)
      .filter(([n]) => n.includes(kw))
      .reduce((s, [, q]) => s + q, 0) || null;

  return {
    faturamento,
    lucroBruto,
    // Tenta tipos específicos; fallback para totais por canal
    carroPorta:         getOS('CARRO', 'PORTA')              ?? getOS('COMBO', 'PORTA')        ?? sumOS('PORTA'),
    retiraPorta:        getOS('RETIRA', 'PORTA'),
    revisaoPorta:       getOS('REVISAO', 'PORTA')            ?? getOS('REVISÃO', 'PORTA'),
    carroAgendamento:   getOS('CARRO', 'AGENDAMENTO')        ?? getOS('COMBO', 'AGENDAMENTO')  ?? sumOS('AGENDAMENTO'),
    retiraAgendamento:  getOS('RETIRA', 'AGENDAMENTO'),
    revisaoAgendamento: getOS('REVISAO', 'AGENDAMENTO')      ?? getOS('REVISÃO', 'AGENDAMENTO'),
    _osMap: osMap,
  };
}

async function coletarGestaoPeriodica(page, dataStr, startStr) {
  console.log('  📊 Gestão Periódica...');
  await page.goto(RELATORIO_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('#ctl00_cph_txtDataInicial', { timeout: 10000 });
  await preencherDatas(page, startStr || dataStr, dataStr);
  await page.waitForSelector('#ctl00_cph_btnGestaoPeriodica', { timeout: 5000 });

  try {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
      page.click('#ctl00_cph_btnGestaoPeriodica'),
    ]);
  } catch (_) {
    await sleep(4000); // fallback: UpdatePanel / postback lento
  }
  await sleep(1000);

  const texto = await page.evaluate(() => document.body.innerText);
  ensureDebugDir();
  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, `${Date.now()}-gestao.txt`), texto, 'utf8'
  );

  const result = parseGestaoPeriodica(texto);
  console.log(`    fat=${result.faturamento} lucro=${result.lucroBruto} os=${JSON.stringify(result._osMap)}`);
  return result;
}

// ── Parser: Pneus vendidos ────────────────────────────────────────────────────

function parsePneusVendidos(texto) {
  const lines = texto.split('\n');

  // Estratégia 1: linha "Total" no final do relatório (quantidade total do relatório)
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 40); i--) {
    const line = lines[i].trim();
    if (/total/i.test(line)) {
      // Primeiro número inteiro na linha é a quantidade total
      const m = line.match(/(\d[\d.]*)/);
      if (m) {
        const n = parseInt(m[1].replace(/\./g, ''), 10);
        if (n > 0) return n;
      }
    }
  }

  // Estratégia 2: soma das linhas por grupo (fallback)
  // Formato: <code><NOME PNEU...><qty><fat_integer><,><2decimais>...
  let total = 0;
  for (const raw of lines) {
    const line = raw.trim();
    const m = line.match(/^\d+(PNEU\s+[^\d]+)/);
    if (!m) continue;
    const afterName = line.slice(m[0].length);
    if (!afterName) continue;
    for (let len = 1; len <= 3 && len <= afterName.length; len++) {
      const rest = afterName.slice(len);
      if (/^[1-9][\d.]*,\d{2}/.test(rest) || /^0,\d{2}/.test(rest)) {
        const qty = parseInt(afterName.slice(0, len), 10);
        if (qty > 0) total += qty;
        break;
      }
    }
  }
  return total > 0 ? total : null;
}

// Baixa um buffer via HTTPS reaproveitando os cookies da sessão Puppeteer
function fetchBuffer(url, cookies) {
  return new Promise((resolve, reject) => {
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const req = https.get(url, { headers: { Cookie: cookieHeader } }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
  });
}

async function coletarPneusVendidos(page, dataStr, startStr) {
  console.log('  🛞  Pneus vendidos...');
  await page.goto(RELATORIO_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('#ctl00_cph_txtDataInicial', { timeout: 10000 });
  await preencherDatas(page, startStr || dataStr, dataStr);
  await sleep(300);

  // Helper: clica e aguarda rede idle (UpdatePanel AJAX)
  const clickAndIdle = async (sel, label) => {
    console.log(`    [${label}] Clicando ${sel}...`);
    await page.click(sel);
    try {
      await page.waitForNetworkIdle({ idleTime: 500, timeout: 8000 });
      console.log(`    [${label}] ✅ idle`);
    } catch (_) {
      console.log(`    [${label}] ⚠️ sem idle — sleep 2s`);
      await sleep(2000);
    }
    await sleep(300);
  };

  await clickAndIdle('#ctl00_cph_lkbSelecioneGrupoProduto', '1-trigger');

  // Aguarda os checkboxes aparecerem no DOM — cobre delay de renderização pós-AJAX
  const popupFrame = await (async () => {
    try {
      await page.waitForSelector('input[type="checkbox"]', { timeout: 8000 });
      await sleep(500); // estabilização extra após DOM update
      const n = await page.evaluate(() => document.querySelectorAll('input[type="checkbox"]').length);
      if (n > 0) { console.log(`    Checkboxes no frame principal: ${n}`); return page; }
    } catch (_) {}
    // Fallback: procura em iframes
    for (const frame of page.frames()) {
      try {
        await frame.waitForSelector('input[type="checkbox"]', { timeout: 2000 });
        const n = await frame.evaluate(() => document.querySelectorAll('input[type="checkbox"]').length);
        if (n > 0) { console.log(`    Checkboxes em iframe: ${frame.url()} (${n})`); return frame; }
      } catch (_) {}
    }
    console.log('    ⚠️ Nenhum checkbox encontrado em nenhum frame');
    return page;
  })();

  // Marca apenas os 22 grupos de pneu — desmarca todos os demais
  const selResult = await popupFrame.evaluate((grupos) => {
    const gruposSet = new Set(grupos.map(g => g.toUpperCase().trim()));
    const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
    let checked = 0;
    checkboxes.forEach(cb => {
      const labelEl = document.querySelector(`label[for="${cb.id}"]`);
      // Captura texto do label, nó adjacente ou elemento pai (tabelas sem <label>)
      const text = (
        labelEl?.textContent ||
        cb.nextSibling?.textContent ||
        cb.parentElement?.textContent ||
        ''
      ).trim().toUpperCase();
      const want = gruposSet.has(text);
      if (cb.checked !== want) {
        cb.checked = want;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (want) checked++;
    });
    return { checked, total: checkboxes.length };
  }, GRUPOS_PNEU);

  console.log(`    Grupos selecionados: ${selResult.checked}/${selResult.total}`);
  if (selResult.checked === 0) {
    await saveDebug(page, 'grupos-pneu-vazio');
    console.log('    ⚠️ Nenhum grupo marcado — debug salvo');
  }

  await clickAndIdle('#ctl00_cph_btnGPSalvarSelecao', '3-salvar');

  console.log('    [4] Gerando Vendas por Grupo (PDF)...');

  // Captura a nova aba que abre com o PDF
  const newTabPromise = new Promise(resolve => {
    page.browser().once('targetcreated', async target => {
      const np = await target.page().catch(() => null);
      resolve(np);
    });
    setTimeout(() => resolve(null), 20000);
  });

  await page.click('#ctl00_cph_btnVendasPorGrupoDetalhe');

  const newTab = await newTabPromise;
  if (!newTab) {
    console.log('    [4] ❌ Nova aba não abriu — retornando null');
    return null;
  }

  // Aguarda a URL do PDF carregar (sai do about:blank)
  let pdfUrl = newTab.url();
  for (let i = 0; i < 20 && (!pdfUrl || pdfUrl === 'about:blank'); i++) {
    await sleep(500);
    pdfUrl = newTab.url();
  }
  console.log(`    [4] URL PDF: ${pdfUrl}`);

  let qtd = null;
  try {
    const cookies = await page.cookies();
    const buffer  = await fetchBuffer(pdfUrl, cookies);
    ensureDebugDir();
    fs.writeFileSync(path.join(SCREENSHOT_DIR, `${Date.now()}-pneus.pdf`), buffer);

    const pdfData = await pdfParse(buffer, { max: 0 });
    const texto   = pdfData.text;
    fs.writeFileSync(path.join(SCREENSHOT_DIR, `${Date.now()}-pneus.txt`), texto, 'utf8');

    qtd = parsePneusVendidos(texto);
    console.log(`    Pneus vendidos: ${qtd}`);
  } catch (err) {
    console.log(`    [4] ❌ Erro ao parsear PDF: ${err.message}`);
  }

  await newTab.close().catch(() => {});
  return qtd;
}

// ── Coleta completa de uma loja ───────────────────────────────────────────────

async function coletarLoja(page, loja, dataStr, startStr) {
  const gestao = await coletarGestaoPeriodica(page, dataStr, startStr);
  const pneus  = await coletarPneusVendidos(page, dataStr, startStr);

  return {
    faturamento:          gestao?.faturamento          ?? null,
    lucroBruto:           gestao?.lucroBruto            ?? null,
    carroPorta:           gestao?.carroPorta            ?? null,
    retiraPorta:          gestao?.retiraPorta           ?? null,
    revisaoPorta:         gestao?.revisaoPorta          ?? null,
    carroAgendamento:     gestao?.carroAgendamento      ?? null,
    retiraAgendamento:    gestao?.retiraAgendamento     ?? null,
    revisaoAgendamento:   gestao?.revisaoAgendamento    ?? null,
    pneuVendidos:         pneus                         ?? null,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function getOIDataBrowser(dateArg, onStoreCollected) {
  const args      = process.argv.slice(2);
  const listar    = args.includes('--listar');
  const semEspera = args.includes('--sem-espera');
  const dateStr   = args.find(a => /^\d{4}-\d{2}-\d{2}$/.test(a));
  const date      = dateArg
    ? (typeof dateArg === 'string' ? new Date(dateArg + 'T12:00:00') : dateArg)
    : dateStr ? new Date(dateStr + 'T12:00:00') : new Date();
  const dataStr  = formatDate(date);
  const startStr = firstOfMonth(date); // 01/MM/YYYY → acumula do início do mês

  if (!process.env.OI_EMAIL || !process.env.OI_SENHA) {
    throw new Error('OI_EMAIL e OI_SENHA não definidos no .env');
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  try {
    await login(page);

    if (listar) {
      await listarLojas(page);
      await browser.close();
      return null;
    }

    const lojas = semEspera ? [LOJAS[0]] : LOJAS;
    console.log(`\n📅 Coletando ${startStr} → ${dataStr} — ${lojas.length} loja(s)${semEspera ? ' (sem espera)' : ''}...\n`);

    const resultado = {};

    for (let i = 0; i < lojas.length; i++) {
      const loja = lojas[i];
      console.log(`\n[${i + 1}/${lojas.length}] ${loja.key} — ${loja.label}`);

      try {
        await trocarLoja(page, loja);
        resultado[loja.key] = await coletarLoja(page, loja, dataStr, startStr);
        console.log(`  ✅ ${loja.key}:`, JSON.stringify(resultado[loja.key]));
        if (onStoreCollected) await onStoreCollected(loja.key, resultado[loja.key]);
      } catch (err) {
        console.error(`  ❌ ${loja.key} falhou:`, err.message);
        await saveDebug(page, `erro-${loja.key}`);
        resultado[loja.key] = null;
      }

      if (i < lojas.length - 1) {
        await sleep(DELAY_LOJAS_MS);
      }
    }

    await browser.close();
    return resultado;

  } catch (err) {
    await saveDebug(page, 'erro-geral').catch(() => {});
    await browser.close();
    throw err;
  }
}

if (require.main === module) {
  getOIDataBrowser()
    .then(dados => {
      if (dados) {
        console.log('\n📦 Resultado final:');
        console.log(JSON.stringify(dados, null, 2));
      }
    })
    .catch(e => { console.error(e.message || e); process.exit(1); });
}

module.exports = { getOIDataBrowser };
