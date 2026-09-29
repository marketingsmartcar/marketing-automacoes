#!/usr/bin/env node
/**
 * baixar-fotos-pneus-oi.js
 * Baixa as fotos de todos os pneus com estoque da Peg Pneus no OI.
 * Salva em: output/fotos-pneus/<CODIGO> - <DESCRICAO>/foto.jpg
 */
require('dotenv').config();
const puppeteer = require('puppeteer');
const fs        = require('fs');
const path      = require('path');
const https     = require('https');
const http      = require('http');

const OI_URL   = 'https://sistemaoficinainteligente.com.br';
const PEG_VAL  = '3098';
const PASTA    = path.join('output', 'fotos-pneus');

fs.mkdirSync(PASTA, { recursive: true });

const LOG_FILE = path.join('output', 'baixar-fotos-pneus.txt');
fs.writeFileSync(LOG_FILE, `=== Baixar fotos pneus OI — ${new Date().toISOString()} ===\n`);

function log(msg) {
  const linha = `[${new Date().toISOString().slice(11,19)}] ${msg}`;
  console.log(linha);
  fs.appendFileSync(LOG_FILE, linha + '\n');
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Nome de pasta seguro (sem caracteres inválidos no Windows)
function nomePasta(codigo, descricao) {
  const desc = (descricao || '').replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 80);
  return `${codigo} - ${desc}`;
}

// Download de imagem por URL para arquivo
function downloadImagem(url, destino) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const req = proto.get(url, { rejectUnauthorized: false }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadImagem(res.headers.location, destino).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        fs.writeFileSync(destino, Buffer.concat(chunks));
        resolve();
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout download')); });
  });
}

// Extrai src da foto do produto na aba Documentos
async function extrairFotoProduto(editPag) {
  await editPag.click('#__tab_tab_tabDocumento').catch(() => {});
  await sleep(2500);

  const resultado = await editPag.evaluate(() => {
    // Procura imagens na aba de documentos
    const imgs = Array.from(document.querySelectorAll(
      '#tab_tabDocumento img, #updatePanelDocumentos img, [id*="tabDocumento"] img, [id*="Documento"] img'
    ));
    for (const img of imgs) {
      const src = img.src || '';
      // Ignora ícones genéricos (upload, pdf, etc)
      if (!src || src.includes('Upload') || src.includes('icon') || src.includes('btn') || src.length < 20) continue;
      if (src.includes('data:image')) return { tipo: 'base64', src };
      if (src.match(/\.(jpg|jpeg|png|gif|webp)/i)) return { tipo: 'url', src };
      if (src.includes('/Handler') || src.includes('/Image') || src.includes('/Foto') || src.includes('/Imagem')) return { tipo: 'url', src };
      // Qualquer img com src que não seja ícone
      if (src.startsWith('http') && src.length > 50) return { tipo: 'url', src };
    }

    // Tenta links de download
    const links = Array.from(document.querySelectorAll('[id*="tabDocumento"] a, [id*="Documento"] a'));
    for (const a of links) {
      const href = a.href || '';
      if (href.match(/\.(jpg|jpeg|png|gif|webp)/i) || href.includes('/Foto') || href.includes('/Image')) {
        return { tipo: 'url', src: href };
      }
    }
    return null;
  });

  return resultado;
}

async function loginOI(page) {
  await page.goto(`${OI_URL}/Entrar.aspx?sair=1`, { waitUntil: 'domcontentloaded', timeout: 40000 });
  await page.waitForSelector('#Login1_UserName', { timeout: 15000 });
  await page.click('#Login1_UserName', { clickCount: 3 });
  await page.type('#Login1_UserName', process.env.OI_EMAIL, { delay: 30 });
  await page.click('#Login1_Password', { clickCount: 3 });
  await page.type('#Login1_Password', process.env.OI_SENHA, { delay: 30 });
  await page.click('#Login1_btnEntrar');
  await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(2000);
  if (page.url().includes('Entrar')) throw new Error('Login OI falhou');
}

async function trocarParaPeg(page) {
  await page.goto(`${OI_URL}/wfCRMBI.aspx`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(1000);

  // Encontra qualquer dropdown de empresa na página
  const seletores = [
    '#ctl00_cph_ddlUsuarioEmpresa',
    '#ctl00_ddlUsuarioEmpresa',
    'select[id*="ddlUsuarioEmpresa"]',
    'select[id*="Empresa"]',
  ];
  let sel = null;
  for (const s of seletores) {
    sel = await page.$(s).catch(() => null);
    if (sel) { log(`  Dropdown empresa: ${s}`); break; }
  }

  if (!sel) {
    // Tenta via URL com parâmetro de empresa
    log('  ⚠️  Dropdown não encontrado, tentando via URL...');
    await page.goto(`${OI_URL}/wfPrincipal.aspx?EmpresaID=HTbIBdHsfyM=`, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await sleep(1000);
    return;
  }

  const atual = await page.$eval(seletores.find(s => sel) || seletores[0], e => e.value).catch(() => null);
  log(`  Empresa atual no dropdown: ${atual}`);

  if (atual !== PEG_VAL) {
    // Seleciona e dispara postback explicitamente
    await page.evaluate((sel, val) => {
      const el = document.querySelector(sel);
      if (el) {
        el.value = val;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, seletores[0], PEG_VAL);
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await sleep(2000);
  }

  // Confirma empresa após troca
  const confirma = await page.evaluate(() => {
    const el = document.querySelector('select[id*="ddlUsuarioEmpresa"], select[id*="Empresa"]');
    return el ? el.options[el.selectedIndex]?.text : document.body.innerText.substring(0, 200);
  }).catch(() => '?');
  log(`  Empresa após troca: ${confirma}`);
}

// Coleta TODAS as páginas de resultado da busca
async function coletarTodosProdutos(page) {
  const todos = [];
  let pagina = 1;

  while (true) {
    log(`  Coletando página ${pagina}...`);

    const produtos = await page.evaluate(() => {
      const linhas = Array.from(document.querySelectorAll('table tr'));
      const resultado = [];
      for (const tr of linhas) {
        const cells = Array.from(tr.querySelectorAll('td'));
        if (cells.length < 3) continue;
        // Primeiro td deve ter um link de produto
        const link = cells[0]?.querySelector('a');
        if (!link) continue;
        const href    = link.href || '';
        const onclick = link.getAttribute('onclick') || '';
        // Link deve ser de produto (wfProduto) ou ter onclick com fncAbreAba/fncNovaAba
        if (!href.includes('wfProduto') && !onclick.includes('wfProduto') && !onclick.includes('fncAbreAba') && !onclick.includes('fncNovaAba')) continue;
        const codigo   = cells[0]?.textContent?.trim() || '';
        const descricao = cells[2]?.textContent?.trim() || '';
        if (!codigo || codigo.length < 2) continue;
        resultado.push({ url: href || null, onclick, codigo, descricao });
      }
      return resultado;
    });

    todos.push(...produtos);
    log(`  Página ${pagina}: ${produtos.length} produtos (total: ${todos.length})`);

    // Verifica se tem próxima página
    const proximaPag = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const prox = links.find(a => a.textContent.trim() === '>' || a.textContent.includes('Próxima') || a.title === 'Próxima');
      return prox ? prox.href : null;
    });

    if (!proximaPag || produtos.length === 0) break;

    await page.goto(proximaPag, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await sleep(1500);
    pagina++;
  }

  return todos;
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    protocolTimeout: 120000,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(45000);
  page.setDefaultNavigationTimeout(30000);

  log('🔐 Login OI...');
  await loginOI(page);
  await trocarParaPeg(page);
  log('✅ OI — Peg Pneus\n');

  // ── Busca pneus com estoque ──────────────────────────────────────────────────
  log('🔍 Buscando pneus com estoque...');
  await page.goto(`${OI_URL}/wfProdutoBusca.aspx`, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await sleep(1000);

  // Verifica empresa ativa
  const empresaAtiva = await page.evaluate(() => {
    const el = document.querySelector('[id*="ddlUsuarioEmpresa"]') || document.querySelector('.empresaAtiva') || document.querySelector('span[id*="empresa"]');
    return el ? el.textContent.trim() : document.title;
  }).catch(() => '?');
  log(`  Empresa ativa: ${empresaAtiva}`);

  // Preenche "pneu" no campo Descrição
  await page.click('#ctl00_cph_txtDescricao', { clickCount: 3 });
  await page.type('#ctl00_cph_txtDescricao', 'pneu', { delay: 20 });

  // Seleciona "Com estoque" (radio com value 'E' ou label contendo o texto)
  await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('label'));
    const lbl = labels.find(l => l.textContent.trim() === 'Com estoque');
    if (lbl) { const inp = document.getElementById(lbl.getAttribute('for')); if (inp) inp.click(); return; }
    const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
    const r = radios.find(r => r.value === 'E');
    if (r) r.click();
  });
  await sleep(300);

  // Clica Buscar via __doPostBack (UpdatePanel — não gera navegação)
  await page.evaluate(() => __doPostBack('ctl00$cph$btnBuscar', '')).catch(() => {
    // fallback: clique direto
    const btn = document.querySelector('#ctl00_cph_btnBuscar');
    if (btn) btn.click();
  });
  await sleep(4000); // aguarda UpdatePanel renderizar

  const totalTxt = await page.evaluate(() => document.body.innerText).catch(() => '');
  const matchTotal = totalTxt.match(/Resultado:\s*(\d+)\s*registro/i);
  log(`Página de resultados carregada — ${matchTotal ? matchTotal[0] : 'sem contagem visível'}`);

  // Coleta todos os produtos de todas as páginas
  const produtos = await coletarTodosProdutos(page);
  log(`\n📦 Total de produtos encontrados: ${produtos.length}`);

  if (produtos.length === 0) {
    log('❌ Nenhum produto encontrado. Encerrando.');
    await browser.close();
    return;
  }

  // ── Baixa foto de cada produto ───────────────────────────────────────────────
  let comFoto = 0, semFoto = 0, erro = 0;

  for (let i = 0; i < produtos.length; i++) {
    const p = produtos[i];
    log(`\n[${i+1}/${produtos.length}] ${p.codigo} — ${p.descricao.substring(0, 50)}`);

    // Pasta de destino
    const pasta = path.join(PASTA, nomePasta(p.codigo, p.descricao));
    fs.mkdirSync(pasta, { recursive: true });

    // Verifica se já baixou
    const arquivosExistentes = fs.readdirSync(pasta).filter(f => f.match(/\.(jpg|jpeg|png|gif|webp)$/i));
    if (arquivosExistentes.length > 0) {
      log(`  ⏭️  Já tem foto (${arquivosExistentes[0]})`);
      comFoto++;
      continue;
    }

    // Navega diretamente para o produto (mesma aba — mais confiável em headless)
    let editPag = page;
    try {
      let urlProduto = p.url;
      // Se href é javascript: ou vazio, extrai do onclick
      if (!urlProduto || urlProduto.includes('javascript:') || urlProduto === 'about:blank') {
        const m = p.onclick.match(/wfProduto\.aspx[^'"]+/i);
        if (m) urlProduto = `${OI_URL}/${m[0]}`;
      }
      if (!urlProduto || urlProduto.includes('javascript:')) throw new Error('URL do produto não encontrada');

      await page.goto(urlProduto, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await sleep(1500);

      // Extrai foto
      const foto = await extrairFotoProduto(editPag);

      if (!foto) {
        log(`  📷 Sem foto cadastrada`);
        semFoto++;
      } else if (foto.tipo === 'base64') {
        // base64 → salva direto
        const m = foto.src.match(/^data:image\/(\w+);base64,(.+)$/s);
        if (m) {
          const ext  = m[1] === 'jpeg' ? 'jpg' : m[1];
          const dest = path.join(pasta, `foto.${ext}`);
          fs.writeFileSync(dest, Buffer.from(m[2], 'base64'));
          log(`  ✅ Foto salva (base64) → ${dest}`);
          comFoto++;
        }
      } else {
        // URL → download
        const urlFoto = foto.src.startsWith('http') ? foto.src : `${OI_URL}${foto.src.startsWith('/') ? '' : '/'}${foto.src}`;
        const ext  = (urlFoto.match(/\.(jpg|jpeg|png|gif|webp)/i) || ['', 'jpg'])[1].toLowerCase();
        const dest = path.join(pasta, `foto.${ext === 'jpeg' ? 'jpg' : ext}`);
        await downloadImagem(urlFoto, dest);
        log(`  ✅ Foto salva → ${dest}`);
        comFoto++;
      }

    } catch (err) {
      log(`  ❌ Erro: ${err.message.substring(0, 100)}`);
      erro++;
      // Volta para a busca para continuar
      await page.goto(`${OI_URL}/wfProdutoBusca.aspx`, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    }

    await sleep(500);
  }

  log(`\n═══ CONCLUÍDO ═══`);
  log(`✅ Com foto: ${comFoto} | 📷 Sem foto: ${semFoto} | ❌ Erros: ${erro}`);
  log(`📁 Fotos salvas em: ${path.resolve(PASTA)}`);

  await sleep(3000);
  await browser.close();
})();
