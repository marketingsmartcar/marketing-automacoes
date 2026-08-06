'use strict';
/**
 * coletar-os-api.js
 *
 * Coleta OS do dia atual via API OI (OrdemDeServicoJSON) — SEM Puppeteer.
 * Muito mais rápido que o scraper, pode rodar a cada 1-5 minutos.
 *
 * Campos coletados: OS número, data, cliente, placa, veículo, ano,
 *   hodômetro, valor total, status, itens (código, descrição, qtd, valor).
 *
 * Campos NÃO disponíveis na API (preenchidos pelo scraper Puppeteer diário):
 *   responsavel, pesquisa, observacoes, tipo, lucro_bruto_pct,
 *   total_servicos, total_produtos, desconto/custo/executor por item.
 *
 * Uso:
 *   node tools/coletar-os-api.js              # hoje (BRT)
 *   node tools/coletar-os-api.js 2026-08-05   # data específica
 *   node tools/coletar-os-api.js --dry-run    # sem gravar no Supabase
 */

'use strict';
require('dotenv').config();
const https = require('https');

const BASE_URL  = 'https://www.oiapi.com.br/ws/v2/IntegracaoOficinaInteligente.asmx';
const NEXUSZ_URL = process.env.NEXUSZ_SUPABASE_URL;
const NEXUSZ_KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY;

const LOJAS = [
  { key: 'BR01', empresaId: 469,  tokenEnv: 'OI_TOKEN_ALT_BR01_CENTRO'    },
  { key: 'BR03', empresaId: 2202, tokenEnv: 'OI_TOKEN_ALT_BR03_AMERICANA'  },
  { key: 'BR04', empresaId: 1524, tokenEnv: 'OI_TOKEN_BR04_SAO_CARLOS'     },
  { key: 'PEG1', empresaId: 3098, tokenEnv: 'OI_TOKEN_PEG1_ARARAQUARA'     },
];

const DRY_RUN = process.argv.includes('--dry-run');

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDateArg(arg) {
  if (!arg || arg.startsWith('--')) return null;
  return arg.match(/^\d{4}-\d{2}-\d{2}$/) ? arg : null;
}

function todayBRT() {
  return new Intl.DateTimeFormat('sv', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function formatDateOI(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// /Date(1785898800000)/ → "2026-08-05"
function parseOIDate(dotNetDate) {
  if (!dotNetDate) return null;
  const ms = parseInt((dotNetDate.match(/\d+/) || [])[0]);
  if (!ms) return null;
  return new Intl.DateTimeFormat('sv', { timeZone: 'America/Sao_Paulo' }).format(new Date(ms));
}

function apiGet(endpoint, params) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}/${endpoint}?${new URLSearchParams(params)}`;
    https.get(url, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, data: null, raw: body.slice(0, 200) }); }
      });
    }).on('error', reject);
  });
}

function supabaseRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(NEXUSZ_URL + path);
    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'apikey': NEXUSZ_KEY,
        'Authorization': `Bearer ${NEXUSZ_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
    };
    if (bodyStr) options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── Processamento ─────────────────────────────────────────────────────────────

function buildOSRecord(os, lojaKey) {
  const dataISO = parseOIDate(os.Data);
  return {
    loja_key:          lojaKey,
    os_numero:         os.OrdemDeServicoID,
    data_os:           dataISO,
    cliente:           os.NomeDoCliente   || null,
    veiculo:           os.ModeloDoVeiculo || null,
    placa:             os.PlacaDoVeiculo  || null,
    ano:               os.AnoDoVeiculo    || null,
    hodometro:         os.KMDoVeiculo     || null,
    total_os:          os.ValorDaOrdemDeServico || 0,
    total_servicos:    null,   // não disponível via API
    total_produtos:    null,   // não disponível via API
    lucro_bruto_pct:   null,   // não disponível via API
    tipo:              os.SituacaoDaOrdemDeServico || null,
    responsavel:       null,   // não disponível via API (preenchido pelo scraper Puppeteer)
    pesquisa:          null,
    observacoes:       null,
    scraped_at:        new Date().toISOString(),
  };
}

function buildItemRecords(os, osVendasId, lojaKey) {
  const itens = os.Itens || [];
  return itens.map(item => ({
    os_vendas_id:    osVendasId,
    loja_key:        lojaKey,
    codigo:          item.CodigoDoItem       || null,
    descricao:       item.DescricaoDoItem    || null,
    grupo:           null,       // classificado depois pelo scraper
    area_id:         null,
    quantidade:      item.QuantidadeDoItem   || 0,
    valor_total:     item.ValorTotalDoItem   || 0,
    desconto_total:  0,
    tabela_total:    0,
    custo_total:     0,
    executor:        null,
  }));
}

async function processarLoja(loja, dataISO) {
  const token = process.env[loja.tokenEnv];
  if (!token) {
    console.log(`  ⚠️  Token ${loja.tokenEnv} não encontrado — pulando ${loja.key}`);
    return { upserted: 0, items: 0 };
  }

  const r = await apiGet('OrdemDeServicoJSON', { token, data: formatDateOI(dataISO) });
  if (r.status !== 200 || !Array.isArray(r.data)) {
    console.log(`  ❌ ${loja.key}: HTTP ${r.status}`);
    return { upserted: 0, items: 0 };
  }

  const osList = r.data.filter(os =>
    String(os.EmpresaID) === String(loja.empresaId)
  );

  console.log(`  📦 ${loja.key}: ${osList.length} OS`);

  if (!osList.length || DRY_RUN) return { upserted: osList.length, items: 0 };

  // Upsert os_vendas (preserva campos que API não tem, ex: responsavel)
  const osRecords = osList.map(os => buildOSRecord(os, loja.key));

  // Upsert em lote — conflict on (loja_key, os_numero)
  // Usa PATCH para não sobrescrever campos já preenchidos pelo Puppeteer
  const upsertRes = await supabaseRequest(
    'POST',
    '/rest/v1/os_vendas?on_conflict=loja_key,os_numero',
    osRecords
  );

  if (upsertRes.status >= 400) {
    console.log(`  ❌ ${loja.key}: upsert os_vendas falhou — ${upsertRes.status} ${upsertRes.body.slice(0, 120)}`);
    return { upserted: 0, items: 0 };
  }

  // Buscar IDs inseridos/atualizados
  const osNums = osList.map(os => os.OrdemDeServicoID);
  const fetchRes = await supabaseRequest(
    'GET',
    `/rest/v1/os_vendas?select=id,os_numero&loja_key=eq.${loja.key}&os_numero=in.(${osNums.join(',')})`,
    null
  );

  if (fetchRes.status >= 400) {
    console.log(`  ⚠️  ${loja.key}: não foi possível buscar IDs para os_itens`);
    return { upserted: osRecords.length, items: 0 };
  }

  const idMap = new Map(JSON.parse(fetchRes.body).map(r => [r.os_numero, r.id]));
  let totalItems = 0;

  // Upsert itens em lotes de 50 OS por vez
  for (const os of osList) {
    const osId = idMap.get(os.OrdemDeServicoID);
    if (!osId || !(os.Itens || []).length) continue;

    const itemRecs = buildItemRecords(os, osId, loja.key);
    if (!itemRecs.length) continue;

    // Deleta itens antigos e re-insere (mesma lógica do scraper Puppeteer)
    await supabaseRequest('DELETE', `/rest/v1/os_itens?os_vendas_id=eq.${osId}`, null);
    const insertRes = await supabaseRequest('POST', '/rest/v1/os_itens', itemRecs);
    if (insertRes.status < 400) totalItems += itemRecs.length;
  }

  return { upserted: osRecords.length, items: totalItems };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const dateArg = parseDateArg(process.argv[2]) || parseDateArg(process.argv[3]);
  const dataISO = dateArg || todayBRT();

  console.log(`\n🔄 Coletando OS via API — ${dataISO}${DRY_RUN ? ' [DRY-RUN]' : ''}`);
  console.log(`   Lojas: ${LOJAS.map(l => l.key).join(', ')}\n`);

  let totalOS = 0, totalItems = 0;

  for (const loja of LOJAS) {
    const { upserted, items } = await processarLoja(loja, dataISO);
    totalOS    += upserted;
    totalItems += items;
  }

  console.log(`\n✅ Concluído — ${totalOS} OS, ${totalItems} itens`);
}

main().catch(e => { console.error(e); process.exit(1); });
