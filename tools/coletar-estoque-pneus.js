'use strict';
/**
 * coletar-estoque-pneus.js
 *
 * Coleta estoque de pneus via Puppeteer no OI:
 *   Estoque → Produtos e Serviços → "Com estoque" + grupo → descrição + qtd + custo
 *
 * Roda no GitHub Actions (não no PC do usuário).
 *
 * Uso:
 *   node tools/coletar-estoque-pneus.js              # todas as lojas
 *   node tools/coletar-estoque-pneus.js BR01          # só BR01
 */

require('dotenv').config();
const puppeteer      = require('puppeteer-extra');
const StealthPlugin  = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const https          = require('https');

const BASE_URL  = 'https://sistemaoficinainteligente.com.br';
const LOGIN_URL = `${BASE_URL}/Entrar.aspx?sair=1`;
const NAV_URL   = `${BASE_URL}/wfRelatorioOperacao.aspx`; // usado para trocar empresa

const NEXUSZ_URL = process.env.NEXUSZ_SUPABASE_URL;
const NEXUSZ_KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY;

const sleep = ms => new Promise(r => setTimeout(r, ms));

const LOJAS = [
  { key: 'BR01', nome: 'BR Pneus Araraquara Centro', tokenKey: 'OI_TOKEN_ALT_BR01_CENTRO' },
  { key: 'BR02', nome: 'BR Pneus Araraquara Vila',   tokenKey: 'OI_TOKEN_BR02_VILA'       },
  { key: 'BR03', nome: 'BR Pneus Americana',         tokenKey: 'OI_TOKEN_ALT_BR03_AMERICANA' },
  { key: 'BR04', nome: 'BR Pneus São Carlos',        tokenKey: 'OI_TOKEN_BR04_SAO_CARLOS' },
  { key: 'BR05', nome: 'BR Pneus Maringá',           tokenKey: 'OI_TOKEN_BR05_MARINGA'    },
  { key: 'PEG1', nome: 'Peg Pneus Araraquara',       tokenKey: 'OI_TOKEN_PEG1_ARARAQUARA' },
  // SOR1 removida a pedido — não coleta estoque de Peg Sorocaba
];

const GRUPOS_PNEU = [
  'PNEU IMPORTADO (CURVA A)',    'PNEU IMPORTADO (PROMOCIONAL)',
  'PNEU IMPORTADO ALL TERRAIN',  'PNEU IMPORTADO CAMIONETE',
  'PNEU IMPORTADO CARGA LEVE',   'PNEU IMPORTADO CARGA PESADA',
  'PNEU IMPORTADO MOTO',         'PNEU IMPORTADO PASSEIO/SUV',
  'PNEU IMPORTADO PERFIL BAIXO', 'PNEU IMPORTADO RUNFLAT',
  'PNEU NACIONAL PASSEIO/SUV',   'PNEU NACIONAL MOTO',
  'PNEU NACIONAL CAMIONETE',     'PNEU NACIONAL CARGA LEVE',
  'PNEU NACIONAL ALL TERRAIN',   'PNEU NACIONAL PERFIL BAIXO',
  'PNEU NACIONAL RUNFLAT',       'PNEU NACIONAL AGRICOLA',
  'PNEU NACIONAL INDUSTRIAL',    'PNEU IMPORTADO AGRICOLA',
  'PNEU IMPORTADO INDUSTRIAL',
];

// ── Login ─────────────────────────────────────────────────────────────────────

async function login(page) {
  console.log('🔑 Login...');
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2000); // aguarda JS carregar

  // Diagnóstico
  const url   = page.url();
  const title = await page.title().catch(() => '?');
  console.log(`  URL: ${url} | Título: ${title}`);

  // Tenta múltiplos seletores possíveis de login
  const seletores = ['#Login1_UserName', 'input[name*="UserName"]', 'input[type="text"]', '#ctl00_UserName'];
  let selUsuario = null;
  for (const sel of seletores) {
    const el = await page.$(sel);
    if (el) { selUsuario = sel; break; }
  }
  if (!selUsuario) {
    const html = await page.content();
    // Extrai só o texto visível para diagnóstico
    const texto = await page.evaluate(() => document.body?.innerText?.slice(0, 500) || '');
    console.error('  ❌ Seletor de login não encontrado.');
    console.error('  Texto da página:', texto.replace(/\s+/g, ' '));
    throw new Error('Seletor de login não encontrado — IP bloqueado?');
  }
  console.log(`  Usando seletor: ${selUsuario}`);

  const selSenha = selUsuario.replace('UserName','Password').replace('text','password');
  await page.click(selUsuario, { clickCount: 3 });
  await page.type(selUsuario, process.env.OI_EMAIL, { delay: 20 });

  const senhaEl = await page.$(selSenha) || await page.$('input[type="password"]');
  if (senhaEl) {
    await senhaEl.click({ clickCount: 3 });
    await senhaEl.type(process.env.OI_SENHA, { delay: 20 });
  }

  const btnLogin = await page.$('#Login1_btnEntrar') || await page.$('input[type="submit"]') || await page.$('button[type="submit"]');
  if (!btnLogin) throw new Error('Botão de login não encontrado');

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
    btnLogin.click(),
  ]);

  if (page.url().toLowerCase().includes('entrar')) throw new Error('Login falhou — credenciais incorretas ou bloqueio');
  console.log('✅ Logado em:', page.url());
}

// ── Troca de loja ─────────────────────────────────────────────────────────────

async function trocarLoja(page, loja) {
  await page.goto(NAV_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('#ddlTrocarEmpresa', { timeout: 10000 });

  const options = await page.evaluate(() => {
    const sel = document.querySelector('#ddlTrocarEmpresa');
    return sel ? Array.from(sel.options).map(o => ({ v: o.value, t: o.text.trim() })) : [];
  });

  const opt = options.find(o =>
    o.t.toUpperCase().includes(loja.key) ||
    o.t.includes(loja.nome.split(' ')[2] || loja.nome)
  );

  if (!opt) {
    console.warn(`  ⚠️  Loja "${loja.key}" não encontrada. Opções: ${options.map(o=>o.t).join(' | ')}`);
    return false;
  }

  await page.select('#ddlTrocarEmpresa', opt.v);
  await sleep(300);
  const nav = page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
  await page.evaluate(() => document.querySelector('#ctl00_btnTrocarEmpresa')?.click());
  await nav.catch(() => sleep(1000));
  await sleep(500);
  return true;
}

// ── Navega para Estoque > Produtos e Serviços ─────────────────────────────────

async function navegarParaProdutos(page) {
  // Tenta URL direta primeiro
  const urls = [
    `${BASE_URL}/wfProduto.aspx`,
    `${BASE_URL}/wfPesquisaProduto.aspx`,
    `${BASE_URL}/wfCadastroProduto.aspx`,
  ];

  for (const url of urls) {
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
      const currentUrl = page.url();
      if (!currentUrl.includes('Entrar') && !currentUrl.includes('Principal')) {
        console.log(`  📂 Página de produtos: ${currentUrl}`);
        return true;
      }
    } catch {}
  }

  // Fallback: clica no menu do OI
  await page.goto(NAV_URL, { waitUntil: 'networkidle2', timeout: 20000 });
  await page.evaluate(() => {
    // Procura link "Estoque" no menu
    const links = Array.from(document.querySelectorAll('a'));
    const estoque = links.find(l => l.text.trim().toLowerCase() === 'estoque');
    if (estoque) estoque.click();
  });
  await sleep(1000);
  await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    const prod = links.find(l => l.text.includes('Produto'));
    if (prod) prod.click();
  });
  await sleep(2000);
  return !page.url().includes('Principal');
}

// ── Coleta produtos de um grupo ───────────────────────────────────────────────

async function coletarGrupo(page, lojaKey, grupo) {
  // Seleciona o grupo e marca "Com estoque"
  const encontrado = await page.evaluate((g) => {
    // Seleciona grupo
    const selGrupo = document.querySelector('select[id*="Grupo"], select[name*="Grupo"]');
    if (selGrupo) {
      const opt = Array.from(selGrupo.options).find(o => o.text.trim() === g);
      if (opt) selGrupo.value = opt.value;
      else return false;
    }

    // Marca "Com estoque"
    const radios = document.querySelectorAll('input[type="radio"]');
    let marcou = false;
    for (const r of radios) {
      const label = r.nextSibling?.textContent || r.closest('label')?.textContent || '';
      if (label.toLowerCase().includes('com estoque') || r.value === 'S') {
        r.click(); marcou = true; break;
      }
    }

    // Filtra só Produtos (não serviços)
    const radProd = Array.from(radios).find(r => r.value === 'P' || r.nextSibling?.textContent?.includes('Produto'));
    if (radProd) radProd.click();

    return true;
  }, grupo);

  if (!encontrado) return [];

  // Clica em Buscar
  await page.evaluate(() => {
    const btn = document.querySelector('input[value*="Buscar"], input[id*="Buscar"], input[id*="btnPesquisa"]');
    if (btn) btn.click();
  });
  await sleep(2000);

  // Extrai lista de produtos (descrição + código + estoque + venda)
  const produtos = await page.evaluate(() => {
    const rows = document.querySelectorAll('table tr');
    const result = [];
    for (const tr of rows) {
      const cells = Array.from(tr.querySelectorAll('td'));
      if (cells.length < 5) continue;

      // Ignora linhas de cabeçalho
      const texts = cells.map(c => c.innerText?.trim() || '');
      if (texts[0] === 'Código' || texts[0] === '') continue;

      const codigo    = texts[0];
      const descricao = texts[2] || texts[1]; // coluna Descrição
      const estoqueCol = texts.find((t, i) => i > 3 && /^\d+$/.test(t));
      const estoque   = parseInt(estoqueCol || '0') || 0;
      const vendaText = texts.find(t => t.includes('R$'));
      const venda     = vendaText
        ? parseFloat(vendaText.replace('R$','').replace(/\./g,'').replace(',','.').trim()) : null;

      if (codigo && descricao && estoque > 0) {
        result.push({ codigo, descricao, estoque, venda });
      }
    }
    return result;
  });

  return produtos;
}

// ── Pega custo via API ProdutoJSON ────────────────────────────────────────────

function apiProduto(token, produtoID) {
  return new Promise((resolve) => {
    const url = `https://www.oiapi.com.br/ws/v2/IntegracaoOficinaInteligente.asmx/ProdutoJSON?${new URLSearchParams({ token, produtoID, somenteAtivo: '1' })}`;
    https.get(url, res => {
      let b = ''; res.on('data', c => b += c);
      res.on('end', () => {
        try { const arr = JSON.parse(b); resolve(arr?.[0] ?? null); }
        catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

// ── Supabase ──────────────────────────────────────────────────────────────────

function sbReq(method, path, body) {
  return new Promise((res) => {
    const url = new URL(NEXUSZ_URL + path);
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: url.hostname, path: url.pathname + url.search, method,
      headers: {
        apikey: NEXUSZ_KEY, Authorization: `Bearer ${NEXUSZ_KEY}`,
        'Content-Type': 'application/json', Prefer: 'return=minimal',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      }
    }, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res({status:r.statusCode,body:d})); });
    req.on('error', () => res({status:0,body:''}));
    if (data) req.write(data);
    req.end();
  });
}

function atualizarJob(jobId, campos) {
  if (!jobId) return Promise.resolve();
  return sbReq('PATCH', `/rest/v1/sync_jobs?id=eq.${jobId}`, campos);
}

function supabaseUpsert(rows) {
  return new Promise((res, rej) => {
    const body = JSON.stringify(rows);
    const url  = new URL(NEXUSZ_URL + '/rest/v1/estoque_pneus');
    const req  = https.request({
      hostname: url.hostname, path: url.pathname, method: 'POST',
      headers: {
        apikey: NEXUSZ_KEY, Authorization: `Bearer ${NEXUSZ_KEY}`,
        'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body),
        Prefer: 'resolution=merge-duplicates,return=minimal',
      }
    }, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res({status:r.statusCode,body:d})); });
    req.on('error', rej);
    req.write(body); req.end();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args       = process.argv.slice(2);
  const lojaFiltro = args.find(a => !a.startsWith('--'));
  const jobId      = args.find(a => a.startsWith('--job-id='))?.split('=')[1];

  const lojas = lojaFiltro
    ? LOJAS.filter(l => l.key === lojaFiltro.toUpperCase())
    : LOJAS;

  if (!lojas.length) { console.error('Loja não encontrada:', lojaFiltro); process.exit(1); }

  console.log(`🚀 Estoque de pneus — ${lojas.length} loja(s)`);

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  // User-Agent de Chrome real para evitar bloqueio por bot detection
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8' });

  let totalGravados = 0, totalErros = 0;
  const total = lojas.length;

  // Marca job como rodando
  await atualizarJob(jobId, { status: 'rodando', progresso: 0, mensagem: 'Iniciando coleta...' });

  try {
    await login(page);

    for (let li = 0; li < lojas.length; li++) {
      const loja = lojas[li];
      const progInicio = Math.round((li / total) * 95);
      console.log(`\n📦 ${loja.nome}`);
      await atualizarJob(jobId, {
        progresso: progInicio,
        mensagem: `Coletando ${loja.nome}...`,
      });

      const token = process.env[loja.tokenKey];

      try {
        const ok = await trocarLoja(page, loja);
        if (!ok) { totalErros++; continue; }

        const navOk = await navegarParaProdutos(page);
        if (!navOk) {
          console.warn(`  ⚠️  Não conseguiu navegar para produtos`);
          totalErros++; continue;
        }

        const prodPageUrl = page.url();
        const todasLinhas = [];

        for (const grupo of GRUPOS_PNEU) {
          if (page.url() !== prodPageUrl) {
            await page.goto(prodPageUrl, { waitUntil: 'networkidle2', timeout: 20000 });
          }

          const prods = await coletarGrupo(page, loja.key, grupo);
          if (prods.length === 0) continue;

          console.log(`  ${grupo}: ${prods.length} produto(s)`);

          for (const prod of prods) {
            let custo = null;
            if (token && prod.codigo) {
              const apiData = await apiProduto(token, prod.codigo);
              if (apiData) custo = apiData.PrecoDeCusto ?? null;
              await sleep(100);
            }
            todasLinhas.push({
              loja:      loja.key,
              grupo,
              descricao: prod.descricao,
              estoque:   prod.estoque,
              custo,
              venda:     prod.venda,
              atualizado: new Date().toISOString(),
            });
          }
        }

        console.log(`  Total: ${todasLinhas.length} pneus com estoque`);

        // Grava em lotes de 100
        for (let i = 0; i < todasLinhas.length; i += 100) {
          const batch = todasLinhas.slice(i, i + 100);
          const r = await supabaseUpsert(batch);
          if (r.status !== 201 && r.status !== 204) {
            console.error(`  ❌ Erro ao gravar:`, r.status, r.body?.slice(0, 100));
            totalErros++;
          } else {
            totalGravados += batch.length;
          }
        }

        console.log(`  ✅ ${todasLinhas.length} produtos gravados`);

        // Atualiza progresso após esta loja concluir
        await atualizarJob(jobId, {
          status: 'rodando',
          progresso: Math.round(((li + 1) / total) * 95),
          mensagem: `✅ ${loja.nome}: ${todasLinhas.length} pneus | Total: ${totalGravados}`,
          pneus_coletados: totalGravados,
        });

      } catch (e) {
        console.error(`  ❌ Erro na loja ${loja.key}:`, e.message);
        totalErros++;
        await atualizarJob(jobId, {
          progresso: Math.round(((li + 1) / total) * 95),
          mensagem: `❌ Erro em ${loja.nome}: ${e.message}`,
        });
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\n✅ Concluído: ${totalGravados} registros | ${totalErros} erros`);

  await atualizarJob(jobId, {
    status: 'concluido',
    progresso: 100,
    mensagem: `Concluído: ${totalGravados} pneus de ${total} lojas`,
    pneus_coletados: totalGravados,
    concluido_em: new Date().toISOString(),
  });
}

main().catch(e => { console.error('ERRO FATAL:', e); process.exit(1); });
