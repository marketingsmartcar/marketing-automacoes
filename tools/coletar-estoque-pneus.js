'use strict';
/**
 * coletar-estoque-pneus.js
 *
 * Coleta estoque atual de pneus via Puppeteer (OI web) + API ProdutoJSON (custo).
 * Grava/atualiza na tabela estoque_pneus do Supabase.
 *
 * Uso:
 *   node tools/coletar-estoque-pneus.js              # todas as lojas
 *   node tools/coletar-estoque-pneus.js BR01          # só BR01
 *   node tools/coletar-estoque-pneus.js --inspecionar # mostra sem gravar
 */

require('dotenv').config();
const puppeteer = require('puppeteer');
const https     = require('https');

const BASE_OI    = 'https://sistemaoficinainteligente.com.br';
const LOGIN_URL  = `${BASE_OI}/Entrar.aspx?sair=1`;
const PROD_URL   = `${BASE_OI}/wfProduto.aspx`;
const API_URL    = 'https://www.oiapi.com.br/ws/v2/IntegracaoOficinaInteligente.asmx';

const NEXUSZ_URL = process.env.NEXUSZ_SUPABASE_URL;
const NEXUSZ_KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY;

const LOJAS = [
  { key: 'BR01', nome: 'BR Pneus Araraquara Centro', empresa: 'BR01 Centro',   tokenKey: 'OI_TOKEN_ALT_BR01_CENTRO' },
  { key: 'BR02', nome: 'BR Pneus Araraquara Vila',   empresa: 'BR02 Vila',      tokenKey: 'OI_TOKEN_BR02_VILA' },
  { key: 'BR03', nome: 'BR Pneus Americana',         empresa: 'BR03 Americana', tokenKey: 'OI_TOKEN_ALT_BR03_AMERICANA' },
  { key: 'BR04', nome: 'BR Pneus São Carlos',        empresa: 'BR04 São Carlos',tokenKey: 'OI_TOKEN_BR04_SAO_CARLOS' },
  { key: 'BR05', nome: 'BR Pneus Maringá',           empresa: 'BR05 Maringá',   tokenKey: 'OI_TOKEN_BR05_MARINGA' },
  { key: 'PEG1', nome: 'Peg Pneus Araraquara',       empresa: 'PEG1 Araraquara',tokenKey: 'OI_TOKEN_PEG1_ARARAQUARA' },
  { key: 'SOR1', nome: 'Peg Pneus Sorocaba',         empresa: 'SOR1 Sorocaba',  tokenKey: 'OI_TOKEN_PEG2_SOROCABA' },
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

// ── API OI — ProdutoJSON ──────────────────────────────────────────────────────

function apiProduto(token, produtoID) {
  return new Promise((resolve) => {
    const url = `${API_URL}/ProdutoJSON?${new URLSearchParams({ token, produtoID, somenteAtivo: '1' })}`;
    https.get(url, res => {
      let b = ''; res.on('data', c => b += c);
      res.on('end', () => {
        try {
          const arr = JSON.parse(b);
          resolve(arr && arr.length > 0 ? arr[0] : null);
        } catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

// ── Supabase ──────────────────────────────────────────────────────────────────

function supabaseUpsert(rows) {
  return new Promise((res, rej) => {
    const body = JSON.stringify(rows);
    const url  = new URL(NEXUSZ_URL + '/rest/v1/estoque_pneus');
    const req  = https.request({
      hostname: url.hostname, path: url.pathname, method: 'POST',
      headers: {
        apikey: NEXUSZ_KEY, Authorization: `Bearer ${NEXUSZ_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        Prefer: 'resolution=merge-duplicates,return=minimal',
      }
    }, r => {
      let d = ''; r.on('data', c => d += c);
      r.on('end', () => res({ status: r.statusCode, body: d }));
    });
    req.on('error', rej);
    req.write(body); req.end();
  });
}

// ── Puppeteer — coleta por loja ───────────────────────────────────────────────

async function coletarLoja(page, loja, grupos, inspecionar) {
  const token = process.env[loja.tokenKey];
  const resultados = [];
  let totalProdutos = 0;

  console.log(`\n📦 ${loja.nome}`);

  for (const grupo of grupos) {
    // Monta URL de busca direto (evita navegar pelo menu)
    const params = new URLSearchParams({
      filtroGrupo: grupo,
      filtroEstoque: 'S',   // Com estoque
      filtroProdServ: 'P',  // Só produtos
      filtroStatus: 'A',    // Ativos
    });

    await page.goto(`${PROD_URL}?${params}`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Extrai tabela de resultados
    const itens = await page.evaluate(() => {
      const rows = document.querySelectorAll('table.gridPesquisa tr:not(.gridPesquisaCabecalho)');
      return Array.from(rows).map(tr => {
        const cells = tr.querySelectorAll('td');
        if (cells.length < 7) return null;
        const codigo   = cells[0]?.innerText?.trim();
        const descricao = cells[2]?.innerText?.trim();
        const estoque  = parseInt(cells[6]?.innerText?.trim()) || 0;
        const venda    = parseFloat(cells[5]?.innerText?.replace('R$','').replace(',','.').trim()) || 0;
        return codigo && descricao ? { codigo, descricao, estoque, venda } : null;
      }).filter(Boolean);
    });

    if (itens.length === 0) continue;

    console.log(`  ${grupo}: ${itens.length} produto(s)`);
    totalProdutos += itens.length;

    // Para cada produto, pega custo via API (sem salvar o código)
    for (const item of itens) {
      let custo = null;
      if (token && item.codigo) {
        const prod = await apiProduto(token, item.codigo);
        if (prod) custo = prod.PrecoDeCusto ?? null;
      }

      // Extrai medida e marca da descrição
      let medida = null, marca = null;
      const dimMatch = item.descricao.match(/(\d{2,3}[\s\/]\d{2,3}[\sRr\/-]\d{1,2}(?:\.\d)?)/);
      if (dimMatch) {
        medida = dimMatch[1].replace(/\s+/g, '/').replace(/\//g, '/').trim();
        // Marca: palavra após a dimensão
        const afterDim = item.descricao.slice(dimMatch.index + dimMatch[0].length).trim();
        marca = afterDim.split(/\s+/)[0] || null;
      }

      resultados.push({
        loja:       loja.key,
        grupo,
        descricao:  item.descricao,
        medida,
        marca,
        estoque:    item.estoque,
        custo,
        venda:      item.venda || null,
        atualizado: new Date().toISOString(),
      });
    }

    await new Promise(r => setTimeout(r, 300)); // pausa entre grupos
  }

  console.log(`  Total: ${totalProdutos} produtos com estoque`);
  return resultados;
}

// ── Login ─────────────────────────────────────────────────────────────────────

async function login(page) {
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.type('#txtLogin', process.env.OI_EMAIL);
  await page.type('#txtSenha', process.env.OI_SENHA);
  await Promise.all([
    page.waitForNavigation({ timeout: 30000 }),
    page.click('#btnEntrar'),
  ]);
}

async function trocarLoja(page, nomeLoja) {
  // Seleciona a empresa pelo seletor de empresa no canto superior direito
  await page.waitForSelector('#ddlEmpresa', { timeout: 10000 });
  const options = await page.$$eval('#ddlEmpresa option', opts =>
    opts.map(o => ({ value: o.value, text: o.innerText.trim() }))
  );
  const opt = options.find(o => o.text.includes(nomeLoja) || o.value === nomeLoja);
  if (!opt) {
    console.warn(`  ⚠️  Empresa "${nomeLoja}" não encontrada. Disponíveis:`, options.map(o=>o.text).join(', '));
    return false;
  }
  await page.select('#ddlEmpresa', opt.value);
  await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
  return true;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args          = process.argv.slice(2);
  const inspecionar   = args.includes('--inspecionar');
  const lojaFiltro    = args.find(a => !a.startsWith('--'));
  const jobId         = args.find(a => a.startsWith('--job-id='))?.split('=')[1];

  const lojasFiltradas = lojaFiltro
    ? LOJAS.filter(l => l.key === lojaFiltro.toUpperCase())
    : LOJAS;

  if (lojasFiltradas.length === 0) {
    console.error('Loja não encontrada:', lojaFiltro);
    process.exit(1);
  }

  console.log(`🚀 Coletando estoque de pneus — ${lojasFiltradas.length} loja(s)`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    // Login
    console.log('🔑 Fazendo login no OI...');
    await login(page);
    console.log('✅ Login OK');

    let totalGravados = 0, totalErros = 0;

    for (const loja of lojasFiltradas) {
      try {
        const ok = await trocarLoja(page, loja.empresa);
        if (!ok) { totalErros++; continue; }

        const rows = await coletarLoja(page, loja, GRUPOS_PNEU, inspecionar);

        if (inspecionar) {
          console.log('\n📋 Preview:', JSON.stringify(rows.slice(0,3), null, 2));
          continue;
        }

        if (rows.length > 0) {
          // Grava em lotes de 100
          for (let i = 0; i < rows.length; i += 100) {
            const batch = rows.slice(i, i + 100);
            const r = await supabaseUpsert(batch);
            if (r.status !== 201 && r.status !== 204) {
              console.error(`  ❌ Erro ao gravar lote ${i}-${i+100}:`, r.status, r.body?.slice(0,100));
              totalErros++;
            } else {
              totalGravados += batch.length;
            }
          }
          console.log(`  ✅ ${rows.length} produtos gravados`);
        }
      } catch (e) {
        console.error(`  ❌ Erro na loja ${loja.key}:`, e.message);
        totalErros++;
      }

      // Pausa entre lojas para não sobrecarregar o OI
      if (loja !== lojasFiltradas[lojasFiltradas.length - 1]) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    console.log(`\n✅ Concluído: ${totalGravados} produtos gravados | ${totalErros} erros`);

    // Atualiza job no Supabase se tiver jobId
    if (jobId) {
      const b = JSON.stringify({ status: 'concluido', progresso: 100, mensagem: `${totalGravados} produtos`, concluido_em: new Date().toISOString() });
      const url = new URL(NEXUSZ_URL + `/rest/v1/sync_jobs?id=eq.${jobId}`);
      const req = https.request({ hostname: url.hostname, path: url.pathname+url.search, method: 'PATCH',
        headers: { apikey: NEXUSZ_KEY, Authorization: `Bearer ${NEXUSZ_KEY}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b), Prefer: 'return=minimal' }
      }, ()=>{});
      req.write(b); req.end();
    }

  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error('ERRO FATAL:', e); process.exit(1); });
