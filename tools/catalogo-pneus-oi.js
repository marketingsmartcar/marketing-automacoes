'use strict';
/**
 * catalogo-pneus-oi.js
 *
 * Coleta todos os pneus em estoque do OI para cada loja e salva em
 * `pneus_em_estoque` no Supabase. Roda via cron a cada 5 minutos.
 * Também responde ao flag `refresh_requested` em `pneus_estoque_controle`
 * para atualizações manuais pelo botão no CRM.
 *
 * Não usa Puppeteer — 100% HTTP, roda no HostGator.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const https = require('https');
const { URLSearchParams } = require('url');

const OI_BASE  = 'sistemaoficinainteligente.com.br';
const OI_EMAIL = process.env.OI_EMAIL;
const OI_SENHA = process.env.OI_SENHA;

const SUPA_URL = process.env.NEXUSZ_SUPABASE_URL
  || process.env.SUPABASE_URL
  || 'https://ubiuershczqjnoczcupa.supabase.co';
const SUPA_KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_SERVICE_ROLE_KEY;

const LOJAS = [
  { key: 'BR01', ddlValue: '469'  },
  { key: 'BR03', ddlValue: '2202' },
  { key: 'BR04', ddlValue: '1524' },
  { key: 'PEG1', ddlValue: '3098' },
];

// ── HTTP helpers (igual ao coleta-estoque-negativo.js) ────────────────────────

function httpReq(method, path, headers = {}, body = null) {
  return new Promise((resolve) => {
    const opts = {
      hostname: OI_BASE,
      path,
      method,
      headers: Object.assign({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Accept-Encoding': 'identity',
      }, headers),
    };
    const req = https.request(opts, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks).toString('latin1'),
      }));
    });
    req.on('error', e => resolve({ status: 0, headers: {}, body: e.message }));
    if (body) req.write(body);
    req.end();
  });
}

function mergeCookies(existing, setCookieArr) {
  const jar = {};
  for (const p of existing.split(';').map(s => s.trim()).filter(Boolean)) {
    const eq = p.indexOf('='); if (eq > 0) jar[p.slice(0, eq)] = p.slice(eq + 1);
  }
  for (const raw of [].concat(setCookieArr || [])) {
    const kv = raw.split(';')[0].trim();
    const eq = kv.indexOf('='); if (eq > 0) jar[kv.slice(0, eq).trim()] = kv.slice(eq + 1);
  }
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
}

function gf(html, id) {
  return html.match(new RegExp(`id="${id}"[^>]*value="([^"]*)"`)) ?.[1] ??
    html.match(new RegExp(`name="${id}"[^>]*value="([^"]*)"`)) ?.[1] ?? '';
}

function cellText(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/\s+/g, ' ')
    .trim();
}

async function oiReq(method, path, cookie, body, referer) {
  const hdrs = { Cookie: cookie };
  if (body) hdrs['Content-Type'] = 'application/x-www-form-urlencoded';
  if (referer) hdrs['Referer'] = `https://${OI_BASE}${referer}`;
  const r = await httpReq(method, path, hdrs, body);
  const newCookie = mergeCookies(cookie, r.headers['set-cookie']);
  return { ...r, cookie: newCookie };
}

// ── OI: Login ─────────────────────────────────────────────────────────────────

async function login() {
  const r1 = await oiReq('GET', '/Entrar.aspx', '');
  const formBody = new URLSearchParams({
    '__VIEWSTATE':          gf(r1.body, '__VIEWSTATE'),
    '__VIEWSTATEGENERATOR': gf(r1.body, '__VIEWSTATEGENERATOR'),
    '__EVENTVALIDATION':    gf(r1.body, '__EVENTVALIDATION'),
    'Login1$UserName':      OI_EMAIL,
    'Login1$Password':      OI_SENHA,
    'Login1$btnEntrar':     'Entrar',
  }).toString();
  const r2 = await oiReq('POST', '/Entrar.aspx', r1.cookie, formBody, '/Entrar.aspx');
  let cookie = r2.cookie;
  if (r2.headers.location) {
    const r3 = await oiReq('GET', r2.headers.location, cookie);
    cookie = r3.cookie;
  }
  if (r2.status !== 302 && !r2.headers.location) throw new Error('Login falhou');
  return cookie;
}

// ── OI: Trocar empresa ────────────────────────────────────────────────────────

async function switchCompany(cookie, ddlValue) {
  const r1 = await oiReq('GET', '/wfPrincipal.aspx', cookie);
  cookie = r1.cookie;
  const formBody = new URLSearchParams({
    '__VIEWSTATE':              gf(r1.body, '__VIEWSTATE'),
    '__VIEWSTATEGENERATOR':     gf(r1.body, '__VIEWSTATEGENERATOR'),
    '__EVENTVALIDATION':        gf(r1.body, '__EVENTVALIDATION'),
    'ctl00$ddlTrocarEmpresa':   ddlValue,
    'ctl00$btnTrocarEmpresa':   'Trocar Empresa',
  }).toString();
  const r2 = await oiReq('POST', '/wfPrincipal.aspx', cookie, formBody, '/wfPrincipal.aspx');
  cookie = r2.cookie;
  if (r2.headers.location) {
    const r3 = await oiReq('GET', r2.headers.location, cookie);
    cookie = r3.cookie;
  }
  return cookie;
}

// ── OI: Extrair opções de grupo ───────────────────────────────────────────────

function extractGrupoOptions(html) {
  const match = html.match(/id="ctl00_cph_ddlGrupoDeProduto"[^>]*>([\s\S]*?)<\/select>/i);
  if (!match) return [];
  const opts = [];
  const re = /<option[^>]*value="([^"]*)"[^>]*>([^<]*)<\/option>/gi;
  let m;
  while ((m = re.exec(match[1])) !== null) {
    const text = m[2].trim();
    if (text.toUpperCase().startsWith('PNEU ') || text.toUpperCase() === 'PNEU') {
      opts.push({ value: m[1], text });
    }
  }
  return opts;
}

// ── OI: Extrair headers da tabela de resultados ───────────────────────────────

function extractTableHeaders(html) {
  // Pega o primeiro <tr> da tabela de resultados
  const tableMatch = html.match(/<table[^>]*id="[^"]*grdProduto[^"]*"[^>]*>([\s\S]*?)<\/table>/i)
    || html.match(/<table[^>]*class="[^"]*GridView[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return [];
  const headerRow = tableMatch[1].match(/<tr[^>]*class="[^"]*Header[^"]*"[^>]*>([\s\S]*?)<\/tr>/i);
  if (!headerRow) return [];
  const headers = [...headerRow[1].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)]
    .map(m => cellText(m[1]).toUpperCase().trim());
  return headers;
}

// ── OI: Parsear tabela de resultados ─────────────────────────────────────────

function parseResultTable(html, loja, grupo) {
  const items = [];

  // Extrai headers para mapear colunas
  const headers = extractTableHeaders(html);

  // Índices por conteúdo do header
  const iCodigo  = headers.findIndex(h => h.includes('CÓDIGO') || h.includes('CODIGO') || h.includes('CÓD'));
  const iDesc    = headers.findIndex(h => h.includes('DESCRIÇÃO') || h.includes('DESCRICAO') || h.includes('NOME'));
  const iMarca   = headers.findIndex(h => h.includes('MARCA'));
  const iEstoque = headers.findIndex(h => h.includes('ESTOQUE') || h.includes('QTD') || h.includes('SALDO'));
  const iPreco   = headers.findIndex(h => h.includes('VENDA') || h.includes('PREÇO') || h.includes('PRECO'));

  // Parse de linhas
  const rowRx = /<tr[^>]*class="(?:GridRow|RowStyle|RowStyleAlternate|DataRow)[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = rowRx.exec(html)) !== null) {
    const cells = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(c => cellText(c[1]));
    if (cells.length < 3) continue;

    // Extração defensiva — usa índice ou fallback por posição
    const codigo  = (iCodigo  >= 0 ? cells[iCodigo]  : cells[0])?.trim();
    const descricao = (iDesc  >= 0 ? cells[iDesc]    : cells[1])?.trim();
    const marca   = (iMarca   >= 0 ? cells[iMarca]   : '')?.trim();
    const estoqueStr = (iEstoque >= 0 ? cells[iEstoque] : cells[cells.length - 2])?.trim();
    const precoStr   = (iPreco   >= 0 ? cells[iPreco]   : cells[cells.length - 1])?.trim();

    const estoque = parseFloat((estoqueStr || '0').replace(/\./g, '').replace(',', '.')) || 0;
    const preco   = parseFloat((precoStr   || '0').replace(/[R$\s.]/g, '').replace(',', '.')) || null;

    if (!codigo || estoque <= 0) continue;

    items.push({ loja, codigo, descricao: descricao || codigo, grupo, marca, estoque, preco_venda: preco });
  }

  return items;
}

// ── OI: Buscar produtos por grupo ────────────────────────────────────────────

async function buscarPorGrupo(cookie, grupoValue, grupoText) {
  // GET da página de busca
  const rGet = await oiReq('GET', '/wfProdutoBusca.aspx', cookie, null, '/wfPrincipal.aspx');
  cookie = rGet.cookie;

  // Monta o form POST — sem filtro de descrição, filtra só por grupo e status Ativo
  // Busca "Em Estoque" via checkbox ou select — tentamos as duas variantes
  const formBody = new URLSearchParams({
    '__VIEWSTATE':                    gf(rGet.body, '__VIEWSTATE'),
    '__VIEWSTATEGENERATOR':           gf(rGet.body, '__VIEWSTATEGENERATOR'),
    '__EVENTVALIDATION':              gf(rGet.body, '__EVENTVALIDATION'),
    'ctl00$cph$txtDescricao':         '',
    'ctl00$cph$ddlPosicaoDescricao':  'Q',
    'ctl00$cph$ddlGrupoDeProduto':    grupoValue,
    'ctl00$cph$ddlStatusProduto':     '1',  // 1=Ativo; 0=Inativo; 2=Ambos (verificar se valor bate)
    'ctl00$cph$chkSomenteEstoque':    'on', // checkbox "Somente em estoque" (se existir)
    'ctl00$cph$btnBuscar':            'Buscar',
  });

  // Tenta nome alternativo do botão
  const btnMatch = rGet.body.match(/id="(ctl00[^"]*btnBuscar)"[^>]*/i);
  if (btnMatch) {
    formBody.delete('ctl00$cph$btnBuscar');
    formBody.set(btnMatch[1].replace(/_/g, '$'), 'Buscar');
  }

  const rPost = await oiReq('POST', '/wfProdutoBusca.aspx', cookie, formBody.toString(), '/wfProdutoBusca.aspx');
  cookie = rPost.cookie;

  // Segue redirect se houver
  let resultHtml = rPost.body;
  if (rPost.headers.location) {
    const rRed = await oiReq('GET', rPost.headers.location, cookie, null, '/wfProdutoBusca.aspx');
    cookie = rRed.cookie;
    resultHtml = rRed.body;
  }

  return { html: resultHtml, cookie };
}

// ── Supabase ──────────────────────────────────────────────────────────────────

async function supaGet(path) {
  return new Promise(resolve => {
    const url = new URL(path, SUPA_URL);
    const req = https.request({
      hostname: url.hostname, path: url.pathname + url.search, method: 'GET',
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(JSON.parse(Buffer.concat(chunks).toString())));
    });
    req.on('error', () => resolve(null));
    req.end();
  });
}

async function supaPost(path, body, prefer = '') {
  const data = JSON.stringify(body);
  return new Promise(resolve => {
    const url = new URL(path, SUPA_URL);
    const hdrs = {
      apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`,
      'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data),
    };
    if (prefer) hdrs['Prefer'] = prefer;
    const req = https.request({
      hostname: url.hostname, path: url.pathname + url.search, method: 'POST', headers: hdrs,
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        resolve({ status: res.statusCode, body: text });
      });
    });
    req.on('error', e => resolve({ status: 0, body: e.message }));
    req.write(data);
    req.end();
  });
}

async function supaPatch(path, body) {
  const data = JSON.stringify(body);
  return new Promise(resolve => {
    const url = new URL(path, SUPA_URL);
    const req = https.request({
      hostname: url.hostname, path: url.pathname + url.search, method: 'PATCH',
      headers: {
        apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`,
        'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data),
        Prefer: 'return=minimal',
      },
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode }));
    });
    req.on('error', e => resolve({ status: 0 }));
    req.write(data);
    req.end();
  });
}

async function upsertPneus(itens) {
  if (!itens.length) return;
  // Adiciona atualizado_em
  const rows = itens.map(i => ({ ...i, atualizado_em: new Date().toISOString() }));
  const r = await supaPost(
    '/rest/v1/pneus_em_estoque',
    rows,
    'resolution=merge-duplicates,return=minimal'
  );
  if (r.status >= 400) console.error(`  ❌ Upsert falhou (${r.status}):`, r.body.slice(0, 200));
}

async function deletarEstoqueZero(loja) {
  // Remove pneus que saíram do estoque desde a última coleta
  return new Promise(resolve => {
    const url = new URL(`/rest/v1/pneus_em_estoque?loja=eq.${loja}&estoque=lte.0`, SUPA_URL);
    const req = https.request({
      hostname: url.hostname, path: url.pathname + url.search, method: 'DELETE',
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, Prefer: 'return=minimal' },
    }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
    req.on('error', () => resolve(0));
    req.end();
  });
}

// ── Controle: flag refresh_requested ─────────────────────────────────────────

async function checkRefreshRequested() {
  const r = await supaGet('/rest/v1/pneus_estoque_controle?id=eq.1&select=refresh_requested,em_execucao');
  if (!Array.isArray(r) || !r.length) return false;
  return r[0].refresh_requested === true && r[0].em_execucao !== true;
}

async function setControle(fields) {
  await supaPatch('/rest/v1/pneus_estoque_controle?id=eq.1', fields);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!OI_EMAIL || !OI_SENHA) { console.error('OI_EMAIL e OI_SENHA obrigatórios'); process.exit(1); }
  if (!SUPA_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY obrigatório'); process.exit(1); }

  const agora = new Date();
  const min   = agora.getMinutes();

  // Roda se: minuto múltiplo de 5 OU refresh_requested
  const pedidoManual = await checkRefreshRequested();
  const rotina = (min % 5 === 0);

  if (!pedidoManual && !rotina) {
    process.exit(0); // cron dispara todo minuto; sai se não for hora
  }

  console.log(`\n⏱  [${agora.toLocaleString('pt-BR')}] Catálogo Pneus OI${pedidoManual ? ' (manual)' : ''}`);
  await setControle({ em_execucao: true, refresh_requested: false });

  try {
    let cookie = await login();
    console.log('✅ Login OI');

    for (const loja of LOJAS) {
      console.log(`\n🏪 Loja ${loja.key}`);
      try {
        cookie = await switchCompany(cookie, loja.ddlValue);

        // Pega grupos de pneus da página de busca
        const rPage = await oiReq('GET', '/wfProdutoBusca.aspx', cookie, null, '/wfPrincipal.aspx');
        cookie = rPage.cookie;
        const grupos = extractGrupoOptions(rPage.body);

        if (!grupos.length) {
          console.log(`  ⚠️  Nenhum grupo PNEU encontrado`);
          continue;
        }
        console.log(`  📦 ${grupos.length} grupos de pneus`);

        const todosItens = [];

        for (const g of grupos) {
          try {
            const { html, cookie: newCookie } = await buscarPorGrupo(cookie, g.value, g.text);
            cookie = newCookie;
            const itens = parseResultTable(html, loja.key, g.text);
            if (itens.length) {
              console.log(`    ✅ ${g.text}: ${itens.length} pneu(s)`);
              todosItens.push(...itens);
            }
          } catch (err) {
            console.error(`    ❌ ${g.text}:`, err.message);
          }
        }

        // Upsert em lote
        if (todosItens.length) {
          await upsertPneus(todosItens);
          console.log(`  💾 ${todosItens.length} pneu(s) salvos para ${loja.key}`);
        }

        // Remove pneus zerados
        await deletarEstoqueZero(loja.key);

      } catch (err) {
        console.error(`  ❌ Loja ${loja.key}:`, err.message);
      }
    }

    await setControle({ em_execucao: false, ultima_atualizacao: new Date().toISOString() });
    console.log('\n✅ Coleta finalizada.');

  } catch (err) {
    console.error('❌ Erro geral:', err.message);
    await setControle({ em_execucao: false });
    process.exit(1);
  }
}

main();
