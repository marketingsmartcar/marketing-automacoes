'use strict';
/**
 * coletar-estoque-pneus.js
 *
 * Coleta estoque atual de pneus via API OI (ProdutoXML) — sem web scraping.
 * Funciona em qualquer servidor, inclusive GitHub Actions (ubuntu-latest).
 * Não depende de IP brasileiro nem do PC local.
 *
 * Uso:
 *   node tools/coletar-estoque-pneus.js            # todas as lojas
 *   node tools/coletar-estoque-pneus.js BR01        # loja específica
 *   node tools/coletar-estoque-pneus.js --inspecionar
 */

require('dotenv').config();
const https = require('https');
const { URLSearchParams } = require('url');

const BASE_URL    = 'https://www.oiapi.com.br/ws/v2/IntegracaoOficinaInteligente.asmx';
const NEXUSZ_URL  = process.env.NEXUSZ_SUPABASE_URL;
const NEXUSZ_KEY  = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY;
const sleep       = ms => new Promise(r => setTimeout(r, ms));

const LOJAS = [
  { key: 'BR01', tokenVar: 'OI_TOKEN_ALT_BR01_CENTRO' },
  { key: 'BR03', tokenVar: 'OI_TOKEN_ALT_BR03_AMERICANA' },
  { key: 'BR04', tokenVar: 'OI_TOKEN_BR04_SAO_CARLOS' },
  { key: 'PEG1', tokenVar: 'OI_TOKEN_PEG1_ARARAQUARA' },
];

// Grupos a excluir explicitamente (não são pneus novos em estoque)
const GRUPOS_EXCLUIR = new Set(['PNEU USADO', 'PNEUS NÃO VEIO', 'PNEUS NAO VEIO']);

// ── API OI ────────────────────────────────────────────────────────────────────

function apiPost(endpoint, params) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(params).toString();
    const url  = new URL(`${BASE_URL}/${endpoint}`);
    const req  = https.request({
      hostname: url.hostname, path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Extrai valor de uma tag XML simples (texto entre <Tag>...</Tag>)
function xmlTag(xml, tag) {
  return xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))?.[1]?.trim() ?? '';
}

function parseXmlProducts(xml) {
  const items = xml.match(/<IntegracaoOficinaInteligente_Produto_v2>[\s\S]*?<\/IntegracaoOficinaInteligente_Produto_v2>/g) ?? [];
  return items.map(item => ({
    descricao: xmlTag(item, 'DescricaoDoProduto'),
    grupo:     xmlTag(item, 'DescricaoDoGrupo'),
    estoque:   parseInt(xmlTag(item, 'Estoque') || '0', 10) || 0,
    custo:     parseFloat(xmlTag(item, 'PrecoDeCusto') || '0') || null,
    preco:     parseFloat(xmlTag(item, 'PrecoDeVenda') || '0') || null,
  }));
}

// Extrai medida da descrição (ex: "PNEU 185 65 15 GOODYEAR..." → "185/65R15")
function extrairMedida(desc) {
  const stripped = desc.replace(/^PNEU\s+/i, '');
  // 3 números com espaço: "185 65 15" ou "185 65 R15"
  const m3 = stripped.match(/^(\d{2,3})\s+(\d{2,3})\s+[Rr]?(\d{1,2}(?:\.\d)?)\b/);
  if (m3) {
    const isMoto = parseInt(m3[1], 10) <= 130;
    return isMoto ? `${m3[1]}/${m3[2]}-${m3[3]}` : `${m3[1]}/${m3[2]}R${m3[3]}`;
  }
  // Com barra: "185/65R15" ou "185/65-15"
  const m2 = stripped.match(/^(\d{2,3})\/(\d{2,3})\s*[Rr\-](\d{1,2}(?:\.\d)?)/);
  if (m2) {
    const isMoto = parseInt(m2[1], 10) <= 130;
    return isMoto ? `${m2[1]}/${m2[2]}-${m2[3]}` : `${m2[1]}/${m2[2]}R${m2[3]}`;
  }
  return null;
}

// Extrai marca (primeira palavra após as dimensões na descrição)
function extrairMarca(desc) {
  const m = desc.match(/^PNEU\s+\d[\d\s\/Rr\-\.]+\s+([A-Z][A-Z0-9\-\.]+)/i);
  return m ? m[1].toUpperCase() : null;
}

// ── Coleta via API ────────────────────────────────────────────────────────────

async function coletarLoja(lojaKey, tokenVar) {
  const token = process.env[tokenVar];
  if (!token) throw new Error(`Token não encontrado: ${tokenVar}`);

  console.log(`  🔑 Chamando ProdutoXML...`);
  const { status, body } = await apiPost('ProdutoXML', { token, produtoID: '', somenteAtivo: '1' });

  if (status !== 200) throw new Error(`API retornou HTTP ${status}: ${body.slice(0, 200)}`);
  if (!body.includes('<IntegracaoOficinaInteligente_Produto_v2>')) {
    throw new Error(`Resposta inesperada: ${body.slice(0, 200)}`);
  }

  const produtos = parseXmlProducts(body);
  const agora    = new Date().toISOString();

  // Filtra apenas pneus com estoque > 0
  // Critério: descrição começa com "PNEU " E grupo não está na lista de exclusão
  const rows = [];
  const gruposVistos = new Set();

  for (const p of produtos) {
    const grupoUpper = p.grupo.toUpperCase().trim();
    const descUpper  = p.descricao.toUpperCase().trim();
    const isPneu = descUpper.startsWith('PNEU ') && !GRUPOS_EXCLUIR.has(grupoUpper);
    if (!isPneu) continue;

    gruposVistos.add(p.grupo);

    if (p.estoque <= 0) continue; // só produtos com estoque

    rows.push({
      loja:      lojaKey,
      descricao: p.descricao,
      grupo:     p.grupo,
      medida:    extrairMedida(p.descricao),
      marca:     extrairMarca(p.descricao),
      estoque:   p.estoque,
      custo:     p.custo || null,
      preco:     p.preco || null,
      atualizado: agora,
    });
  }

  console.log(`  Grupos detectados: ${[...gruposVistos].join(' | ') || '(nenhum)'}`);
  return rows;
}

// ── Supabase ──────────────────────────────────────────────────────────────────

function sbQueryLoja(lojaKey) {
  return new Promise(res => {
    const url = new URL(NEXUSZ_URL + '/rest/v1/estoque_pneus?loja=eq.' + lojaKey + '&select=descricao,estoque&limit=10000');
    const req = https.request({
      hostname: url.hostname, path: url.pathname + url.search, method: 'GET',
      headers: { apikey: NEXUSZ_KEY, Authorization: 'Bearer ' + NEXUSZ_KEY },
    }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(r.statusCode === 200 ? JSON.parse(d) : [])); });
    req.on('error', () => res([]));
    req.end();
  });
}

function sbUpsert(rows) {
  return new Promise(res => {
    const body = JSON.stringify(rows);
    const url  = new URL(NEXUSZ_URL + '/rest/v1/estoque_pneus?on_conflict=loja,descricao');
    const req  = https.request({
      hostname: url.hostname, path: url.pathname + url.search, method: 'POST',
      headers: { apikey: NEXUSZ_KEY, Authorization: 'Bearer ' + NEXUSZ_KEY, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), Prefer: 'resolution=merge-duplicates,return=minimal' },
    }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res({ status: r.statusCode, body: d })); });
    req.on('error', () => res({ status: 0, body: '' }));
    req.write(body); req.end();
  });
}

function sbZeroEstoque(lojaKey, descricao) {
  return new Promise(res => {
    const body = JSON.stringify({ estoque: 0 });
    const path = '/rest/v1/estoque_pneus?loja=eq.' + lojaKey + '&descricao=eq.' + encodeURIComponent(descricao);
    const url  = new URL(NEXUSZ_URL + path);
    const req  = https.request({
      hostname: url.hostname, path: url.pathname + url.search, method: 'PATCH',
      headers: { apikey: NEXUSZ_KEY, Authorization: 'Bearer ' + NEXUSZ_KEY, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), Prefer: 'return=minimal' },
    }, r => { r.on('data', () => {}); r.on('end', () => res({ status: r.statusCode })); });
    req.on('error', () => res({ status: 0 }));
    req.write(body); req.end();
  });
}

function sbJob(jobId, campos) {
  if (!jobId) return Promise.resolve();
  return new Promise(res => {
    const body = JSON.stringify(campos);
    const url  = new URL(NEXUSZ_URL + '/rest/v1/sync_jobs?id=eq.' + jobId);
    const req  = https.request({
      hostname: url.hostname, path: url.pathname + url.search, method: 'PATCH',
      headers: { apikey: NEXUSZ_KEY, Authorization: 'Bearer ' + NEXUSZ_KEY, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), Prefer: 'return=minimal' },
    }, r => { r.on('data', () => {}); r.on('end', () => res()); });
    req.on('error', () => res());
    req.write(body); req.end();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args        = process.argv.slice(2);
  const lojaFiltro  = args.find(a => !a.startsWith('--'));
  const inspecionar = args.includes('--inspecionar');
  const jobId       = args.find(a => a.startsWith('--job-id='))?.split('=')[1];

  const lojas = lojaFiltro ? LOJAS.filter(l => l.key === lojaFiltro.toUpperCase()) : LOJAS;
  if (!lojas.length) { console.error('Loja não encontrada:', lojaFiltro); process.exit(1); }

  console.log(`🚀 Estoque de pneus — ${lojas.length} loja(s) | API OI (ProdutoXML)`);
  await sbJob(jobId, { status: 'rodando', progresso: 0, mensagem: 'Iniciando...' });

  let totalGravados = 0, totalErros = 0;

  for (let li = 0; li < lojas.length; li++) {
    const loja = lojas[li];
    console.log(`\n📦 ${loja.key}`);
    await sbJob(jobId, { progresso: Math.round((li / lojas.length) * 95), mensagem: `Coletando ${loja.key}...` });

    try {
      const rows = await coletarLoja(loja.key, loja.tokenVar);
      console.log(`  Total: ${rows.length} pneus com estoque`);

      if (inspecionar) {
        console.log('  Preview:', JSON.stringify(rows.slice(0, 3), null, 2));
      } else if (rows.length > 0) {
        // Busca estado atual do Supabase para detectar produtos que zeraram
        const anterior = await sbQueryLoja(loja.key);
        const novosSet = new Set(rows.map(r => r.descricao.toUpperCase()));

        // Upsert em lotes de 100
        let lojaErros = 0;
        for (let i = 0; i < rows.length; i += 100) {
          const r = await sbUpsert(rows.slice(i, i + 100));
          if (r.status !== 201 && r.status !== 200) {
            console.error('  ❌ Supabase:', r.status, r.body?.slice(0, 100));
            lojaErros++;
          } else {
            totalGravados += Math.min(100, rows.length - i);
          }
        }

        // Zero-out: produtos que estavam com estoque > 0 mas não apareceram na API
        const vendidos = anterior.filter(a => a.estoque > 0 && !novosSet.has(a.descricao.toUpperCase()));
        if (vendidos.length > 0) {
          console.log(`  ⤵  ${vendidos.length} produto(s) zerado(s) (esgotados/não encontrados)`);
          for (const v of vendidos) await sbZeroEstoque(loja.key, v.descricao);
        }

        if (lojaErros) totalErros += lojaErros;
        console.log(`  ✅ ${rows.length} gravados`);
      }

      await sbJob(jobId, {
        status: 'rodando',
        progresso: Math.round(((li + 1) / lojas.length) * 95),
        mensagem:  `✅ ${loja.key}: ${rows.length} pneus | Total: ${totalGravados}`,
        pneus_coletados: totalGravados,
      });

    } catch (e) {
      console.error(`  ❌ Erro ${loja.key}:`, e.message);
      totalErros++;
      await sbJob(jobId, { progresso: Math.round(((li + 1) / lojas.length) * 95), mensagem: `❌ Erro em ${loja.key}: ${e.message}` });
    }

    await sleep(1000);
  }

  console.log(`\n✅ Concluído: ${totalGravados} registros | ${totalErros} erros`);
  await sbJob(jobId, {
    status: 'concluido', progresso: 100,
    mensagem: `${totalGravados} pneus de ${lojas.length} lojas`,
    pneus_coletados: totalGravados,
    concluido_em: new Date().toISOString(),
  });
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
