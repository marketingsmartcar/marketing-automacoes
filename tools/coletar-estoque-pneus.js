'use strict';
/**
 * coletar-estoque-pneus.js
 *
 * Coleta estoque atual de pneus via API OI (sem Puppeteer).
 * Estratégia:
 *   1. Busca OS dos últimos N dias para descobrir códigos de pneus vendidos
 *   2. Para cada código, chama ProdutoJSON → estoque + custo + venda
 *   3. Grava na tabela estoque_pneus do Supabase (sem o código)
 *
 * Uso:
 *   node tools/coletar-estoque-pneus.js              # todas as lojas, 90 dias
 *   node tools/coletar-estoque-pneus.js BR01          # só BR01
 *   node tools/coletar-estoque-pneus.js --dias=30     # últimos 30 dias
 */

require('dotenv').config();
const https = require('https');

const API_URL    = 'https://www.oiapi.com.br/ws/v2/IntegracaoOficinaInteligente.asmx';
const NEXUSZ_URL = process.env.NEXUSZ_SUPABASE_URL;
const NEXUSZ_KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY;

const LOJAS = [
  { key: 'BR01', nome: 'BR Pneus Araraquara Centro', tokenKey: 'OI_TOKEN_ALT_BR01_CENTRO' },
  { key: 'BR02', nome: 'BR Pneus Araraquara Vila',   tokenKey: 'OI_TOKEN_BR02_VILA'       },
  { key: 'BR03', nome: 'BR Pneus Americana',         tokenKey: 'OI_TOKEN_ALT_BR03_AMERICANA' },
  { key: 'BR04', nome: 'BR Pneus São Carlos',        tokenKey: 'OI_TOKEN_BR04_SAO_CARLOS' },
  { key: 'BR05', nome: 'BR Pneus Maringá',           tokenKey: 'OI_TOKEN_BR05_MARINGA'    },
  { key: 'PEG1', nome: 'Peg Pneus Araraquara',       tokenKey: 'OI_TOKEN_PEG1_ARARAQUARA' },
  { key: 'SOR1', nome: 'Peg Pneus Sorocaba',         tokenKey: 'OI_TOKEN_PEG2_SOROCABA'   },
];

// ── API OI ────────────────────────────────────────────────────────────────────

function apiGet(endpoint, params) {
  return new Promise((resolve) => {
    const url = `${API_URL}/${endpoint}?${new URLSearchParams(params)}`;
    https.get(url, res => {
      let b = ''; res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve(JSON.parse(b)); }
        catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

function formatDateOI(d) {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Descobre códigos de pneus via OS ──────────────────────────────────────────

async function descobrirCodigos(token, diasAtras) {
  const codigos = new Set();
  const hoje = new Date();

  console.log(`    Buscando OS dos últimos ${diasAtras} dias...`);
  let erros = 0;

  for (let i = 1; i <= diasAtras; i++) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    if (d.getDay() === 0) continue; // pula domingos

    const os = await apiGet('OrdemDeServicoJSON', { token, data: formatDateOI(d) });
    if (!Array.isArray(os)) { erros++; if (erros > 5) break; continue; }

    for (const ordem of os) {
      if (!Array.isArray(ordem.Itens)) continue;
      for (const item of ordem.Itens) {
        const codigo = (item.CodigoDoItem || '').trim();
        if (codigo && codigo.toUpperCase().startsWith('PNEU') === false && codigo.length > 3) {
          // Inclui todos os itens (filtramos pelo grupo depois)
          codigos.add(codigo);
        }
      }
    }

    if (i % 30 === 0) console.log(`    ... ${i}/${diasAtras} dias (${codigos.size} códigos até agora)`);
    await sleep(50); // pequena pausa para não sobrecarregar API
  }

  console.log(`    Total: ${codigos.size} códigos descobertos`);
  return [...codigos];
}

// ── Coleta estoque por código ──────────────────────────────────────────────────

async function coletarEstoquePorCodigos(token, lojaKey, codigos) {
  const resultados = [];
  let processados = 0;

  for (const codigo of codigos) {
    const prod = await apiGet('ProdutoJSON', { token, produtoID: codigo, somenteAtivo: '1' });

    if (Array.isArray(prod) && prod.length > 0) {
      const p = prod[0];
      const grupo = p.DescricaoDoGrupo || '';

      // Só pneus
      if (!grupo.toUpperCase().startsWith('PNEU')) continue;

      // Só com estoque
      if ((p.Estoque || 0) <= 0) continue;

      // Extrai medida e marca da descrição
      const desc = (p.DescricaoDoProduto || '').trim();
      let medida = null, marca = null;
      const dimMatch = desc.match(/(\d{2,3}[\s\/]\d{2,3}[\sRr\/-]\d{1,2}(?:\.\d)?)/);
      if (dimMatch) {
        medida = dimMatch[1].replace(/\s+/g, ' ').trim();
        const afterDim = desc.slice(dimMatch.index + dimMatch[0].length).trim();
        marca = afterDim.split(/\s+/)[0] || null;
      }

      resultados.push({
        loja:      lojaKey,
        grupo,
        descricao: desc,
        medida,
        marca,
        estoque:   p.Estoque || 0,
        custo:     p.PrecoDeCusto ?? null,
        venda:     p.PrecoDeVenda ?? null,
        atualizado: new Date().toISOString(),
      });
    }

    processados++;
    if (processados % 50 === 0) {
      console.log(`    ... ${processados}/${codigos.length} produtos processados (${resultados.length} pneus com estoque)`);
    }
    await sleep(30); // pausa entre chamadas de API
  }

  return resultados;
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

// Zera estoque de pneus que não aparecem mais (estoque = 0 no OI)
function supabaseZerarEstoque(lojaKey) {
  return new Promise((res, rej) => {
    // Atualiza timestamp de produtos não atualizados nas últimas 2h para estoque=0
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const url = new URL(NEXUSZ_URL + `/rest/v1/estoque_pneus?loja=eq.${lojaKey}&atualizado=lt.${cutoff}&estoque=gt.0`);
    const body = JSON.stringify({ estoque: 0, atualizado: new Date().toISOString() });
    const req = https.request({
      hostname: url.hostname, path: url.pathname + url.search, method: 'PATCH',
      headers: {
        apikey: NEXUSZ_KEY, Authorization: `Bearer ${NEXUSZ_KEY}`,
        'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body),
        Prefer: 'return=minimal',
      }
    }, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res({status:r.statusCode})); });
    req.on('error', rej);
    req.write(body); req.end();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args       = process.argv.slice(2);
  const lojaFiltro = args.find(a => !a.startsWith('--'));
  const diasArg    = parseInt(args.find(a => a.startsWith('--dias='))?.split('=')[1] || '90');
  const jobId      = args.find(a => a.startsWith('--job-id='))?.split('=')[1];

  const lojas = lojaFiltro
    ? LOJAS.filter(l => l.key === lojaFiltro.toUpperCase())
    : LOJAS;

  if (!lojas.length) { console.error('Loja não encontrada:', lojaFiltro); process.exit(1); }

  console.log(`🚀 Coleta de estoque — ${lojas.length} loja(s) | últimos ${diasArg} dias`);

  let totalGravados = 0, totalErros = 0;

  for (const loja of lojas) {
    const token = process.env[loja.tokenKey];
    if (!token) { console.warn(`⚠️  Token não encontrado para ${loja.key}`); totalErros++; continue; }

    console.log(`\n📦 ${loja.nome}`);
    try {
      // 1. Descobre todos os códigos de produtos vendidos
      const codigos = await descobrirCodigos(token, diasArg);

      // 2. Para cada código, pega estoque atual
      console.log(`    Coletando estoque de ${codigos.length} produtos...`);
      const rows = await coletarEstoquePorCodigos(token, loja.key, codigos);
      console.log(`    ${rows.length} pneus com estoque > 0`);

      if (rows.length === 0) continue;

      // 3. Grava no Supabase em lotes
      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);
        const r = await supabaseUpsert(batch);
        if (r.status !== 201 && r.status !== 204) {
          console.error(`  ❌ Erro ao gravar:`, r.status, r.body?.slice(0, 100));
          totalErros++;
        } else {
          totalGravados += batch.length;
        }
      }

      // 4. Zera produtos que não foram atualizados (saíram do estoque)
      await supabaseZerarEstoque(loja.key);

      console.log(`  ✅ ${rows.length} produtos gravados`);
    } catch (e) {
      console.error(`  ❌ Erro na loja ${loja.key}:`, e.message);
      totalErros++;
    }
  }

  console.log(`\n✅ Concluído: ${totalGravados} registros | ${totalErros} erros`);

  // Atualiza job
  if (jobId) {
    const b = JSON.stringify({ status:'concluido', progresso:100, mensagem:`${totalGravados} pneus`, concluido_em: new Date().toISOString() });
    const url = new URL(NEXUSZ_URL + `/rest/v1/sync_jobs?id=eq.${jobId}`);
    const req = https.request({ hostname:url.hostname, path:url.pathname+url.search, method:'PATCH',
      headers:{ apikey:NEXUSZ_KEY, Authorization:`Bearer ${NEXUSZ_KEY}`, 'Content-Type':'application/json', 'Content-Length':Buffer.byteLength(b), Prefer:'return=minimal' }
    }, ()=>{});
    req.write(b); req.end();
  }
}

main().catch(e => { console.error('ERRO FATAL:', e); process.exit(1); });
