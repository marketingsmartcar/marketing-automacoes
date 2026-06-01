'use strict';
/**
 * coletar-estoque-pneus.js
 *
 * Coleta estoque atual de pneus via HTTP no OI:
 *   Estoque → Análise de Estoque → Data: Atual + Com Estoque
 *   → clica em cada grupo de pneu → pega descrição, estoque, R$ Custo, R$ Venda
 *
 * Roda no GitHub Actions (HTTP puro — sem Puppeteer, sem bloqueio de IP).
 */

require('dotenv').config();
const https   = require('https');
const { URLSearchParams } = require('url');

const HOST       = 'sistemaoficinainteligente.com.br';
const NEXUSZ_URL = process.env.NEXUSZ_SUPABASE_URL;
const NEXUSZ_KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY;
const sleep      = ms => new Promise(r => setTimeout(r, ms));

const LOJAS = [
  { key: 'BR01', empresa: 'BR01' },
  { key: 'BR02', empresa: 'BR02' },
  { key: 'BR03', empresa: 'BR03' },
  { key: 'BR04', empresa: 'BR04' },
  { key: 'BR05', empresa: 'BR05' },
  { key: 'PEG1', empresa: 'Peg11' },
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

// ── HTTP ──────────────────────────────────────────────────────────────────────

function httpReq(method, path, headers = {}, body = null) {
  return new Promise((resolve) => {
    const opts = {
      hostname: HOST, path, method,
      headers: Object.assign({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Connection': 'keep-alive',
      }, headers),
    };
    const req = https.request(opts, res => {
      let b = ''; res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: b }));
    });
    req.on('error', e => resolve({ status: 0, headers: {}, body: e.message }));
    if (body) req.write(body);
    req.end();
  });
}

function gf(html, id) { return html.match(new RegExp('id="' + id + '" value="([^"]*)"'))?.[1] || ''; }

function af(html) {
  const f = {};
  for (const m of html.matchAll(/<input([^>]*)>/gi)) {
    const a = m[1];
    const name = a.match(/name="([^"]+)"/i)?.[1];
    const type = a.match(/type="([^"]+)"/i)?.[1]?.toLowerCase() || 'text';
    const value = a.match(/value="([^"]*)"/i)?.[1] || '';
    const checked = a.toLowerCase().includes('checked');
    if (!name || type === 'image') continue;
    if (type === 'submit' || type === 'button') continue;
    if (type === 'radio' || type === 'checkbox') { if (checked) f[name] = value; }
    else f[name] = value;
  }
  for (const m of html.matchAll(/<select[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/select>/gi)) {
    const s = m[2].match(/<option[^>]*selected[^>]*value="([^"]*)"/i)?.[1];
    const f2 = m[2].match(/<option[^>]*value="([^"]*)"/i)?.[1];
    f[m[1]] = s || f2 || '';
  }
  return f;
}

// ── Login + troca de empresa ───────────────────────────────────────────────────

async function loginAndSwitch(empresa) {
  const r1 = await httpReq('GET', '/Entrar.aspx');
  const vs = gf(r1.body, '__VIEWSTATE'), vsgen = gf(r1.body, '__VIEWSTATEGENERATOR'), ev = gf(r1.body, '__EVENTVALIDATION');
  let ck = r1.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ') || '';

  const lb = new URLSearchParams({ '__VIEWSTATE': vs, '__VIEWSTATEGENERATOR': vsgen, '__EVENTVALIDATION': ev, 'Login1$UserName': process.env.OI_EMAIL, 'Login1$Password': process.env.OI_SENHA, 'Login1$btnEntrar': 'Entrar' }).toString();
  const r2 = await httpReq('POST', '/Entrar.aspx', {
    Cookie: ck,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(lb),
    Referer: 'https://' + HOST + '/Entrar.aspx',
    Origin: 'https://' + HOST,
    'Cache-Control': 'max-age=0',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
  }, lb);
  const loginRedirect = r2.headers['location'] || '';
  console.log('  Login redirect:', loginRedirect);
  if (!loginRedirect.includes('Principal')) throw new Error('Login falhou — redirect: ' + loginRedirect + ' (status:' + r2.status + ')');
  ck = r2.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ') || ck;

  const rP = await httpReq('GET', r2.headers['location'], { Cookie: ck });
  const ddl = rP.body.match(/id="ddlTrocarEmpresa"[\s\S]*?<\/select>/i)?.[0] || '';
  const emp = [...ddl.matchAll(/<option[^>]*value="([^"]+)">([^<]+)/gi)].map(m => ({ v: m[1], t: m[2].trim() })).find(e => e.t.toUpperCase().includes(empresa.toUpperCase()));
  if (!emp) throw new Error('Empresa ' + empresa + ' não encontrada. Disponíveis: ' + [...ddl.matchAll(/<option[^>]*value="[^"]+"[^>]*>([^<]+)/gi)].map(m=>m[1].trim()).join(' | '));

  const vs2 = gf(rP.body, '__VIEWSTATE'), vsgen2 = gf(rP.body, '__VIEWSTATEGENERATOR'), ev2 = gf(rP.body, '__EVENTVALIDATION');
  const fd = new URLSearchParams({ '__VIEWSTATE': vs2, '__VIEWSTATEGENERATOR': vsgen2, '__EVENTVALIDATION': ev2, 'ddlTrocarEmpresa': emp.v, 'ctl00$btnTrocarEmpresa': 'Trocar' }).toString();
  const rT = await httpReq('POST', '/wfPrincipal.aspx', { Cookie: ck, 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(fd), Referer: 'https://' + HOST + '/wfPrincipal.aspx' }, fd);
  if (rT.headers['location']) await httpReq('GET', rT.headers['location'], { Cookie: ck });
  return ck;
}

// ── Análise de Estoque → itens por grupo ──────────────────────────────────────

async function coletarGruposLoja(ck, lojaKey) {
  // Carrega a página de Análise de Estoque
  const r0 = await httpReq('GET', '/wfEstoqueAnaliseDeEstoque.aspx', { Cookie: ck, Referer: 'https://' + HOST + '/wfPrincipal.aspx' });
  if (r0.status !== 200) throw new Error('Análise de Estoque retornou ' + r0.status);

  // Mapeia grupos → postback ID
  const gruposMap = {};
  const linkIds = [...r0.body.matchAll(/id="(ctl00_cph_grd_ctl\d+_lkbQuantidadeDeProduto)"/gi)].map(m => m[1]);
  for (const lid of linkIds) {
    const idx = r0.body.indexOf(lid);
    const rs = r0.body.lastIndexOf('<tr', idx);
    const re = r0.body.indexOf('</tr>', idx);
    if (rs > 0 && re > 0) {
      const row = r0.body.slice(rs, re);
      const nome = row.match(/<td[^>]*>([^<]{3,100})<\/td>/i)?.[1]?.replace(/&[^;]+;/g, ' ').trim() || '';
      if (nome) gruposMap[nome] = lid.replace('ctl00_cph_grd_', 'ctl00$cph$grd$').replace('_lkbQuantidadeDeProduto', '$lkbQuantidadeDeProduto');
    }
  }

  const pneuGrupos = GRUPOS_PNEU.filter(g => gruposMap[g]);
  console.log(`  Grupos de pneu encontrados: ${pneuGrupos.length}`);

  const resultados = [];

  for (const grupo of pneuGrupos) {
    const pb = gruposMap[grupo];

    // POST: clica no link de quantidade do grupo com "Com Estoque" e "Atual"
    const fields = af(r0.body);
    fields['__EVENTTARGET'] = pb;
    fields['__EVENTARGUMENT'] = '';
    fields['ctl00$cph$rblEstoqueEmExcel'] = 'Com Estoque'; // ← Com Estoque

    const fb = new URLSearchParams(fields).toString();
    const r1 = await httpReq('POST', '/wfEstoqueAnaliseDeEstoque.aspx', {
      Cookie: ck, 'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(fb),
      Referer: 'https://' + HOST + '/wfEstoqueAnaliseDeEstoque.aspx',
    }, fb);

    // Extrai URL da janela do JavaScript da resposta
    const itemUrlRel = r1.body.match(/(?:window\.open|fncNovaAba)\s*\(\s*'(wfEstoqueAnalise[^']+)'/i)?.[1] || '';
    if (!itemUrlRel) {
      console.log(`    ${grupo}: sem link de itens`);
      await sleep(300);
      continue;
    }

    // Acessa a página de itens do grupo
    const r2 = await httpReq('GET', '/' + itemUrlRel, { Cookie: ck, Referer: 'https://' + HOST + '/wfEstoqueAnaliseDeEstoque.aspx' });
    if (r2.status !== 200) {
      console.log(`    ${grupo}: página de itens retornou ${r2.status}`);
      await sleep(300);
      continue;
    }

    // Extrai as linhas de dados
    // Colunas: #, Código, Referência(s), Cod.Barra, Endereço, Descrição, Aplicação, Marca, Estoque, Consumo, Ideal, R$ Compra, R$ Custo, R$ Venda, Margem%
    const allRows = [...r2.body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
    const dataRows = allRows.filter(r => {
      const text = r[1].replace(/<[^>]+>/g, ' ');
      return text.includes('PNEU') && text.match(/\d+,\d{2}/);
    });

    let count = 0;
    for (const row of dataRows) {
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
        .map(c => c[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).trim())
        .filter(Boolean);

      if (cells.length < 8) continue;

      // Colunas: 0=#, 1=Código, 2=Ref, 3=Cod.Barra?, 4=Endereço?, 5=Descrição, 6=Aplicação, 7=Marca?, 8=Estoque, 9=Consumo, 10=Ideal, 11=R$Compra, 12=R$Custo, 13=R$Venda
      // A ordem pode variar — usa a descrição (começa com PNEU) para encontrar a coluna certa
      const descIdx = cells.findIndex(c => c.toUpperCase().startsWith('PNEU'));
      if (descIdx < 0) continue;

      const descricao = cells[descIdx];
      // Estoque está logo após Marca (ou Aplicação) — geralmente descIdx + 2 ou +3
      const estoqueIdx = descIdx + 2; // aproximação
      const custoIdx   = cells.length - 3; // R$ Custo = antepenúltima coluna antes de Margem
      const vendaIdx   = cells.length - 2; // R$ Venda = penúltima antes de Margem

      const estoqueStr = cells[estoqueIdx] || '0';
      const custoStr   = cells[custoIdx]   || '0';
      const vendaStr   = cells[vendaIdx]   || '0';

      const estoque = parseInt(estoqueStr.replace(/\D/g, '')) || 0;
      if (estoque <= 0) continue; // só com estoque

      const custo = parseFloat(custoStr.replace(/\./g, '').replace(',', '.')) || null;
      const venda = parseFloat(vendaStr.replace(/\./g, '').replace(',', '.')) || null;

      // Extrai medida da descrição
      const dimM = descricao.match(/(\d{2,3}[\s\/]\d{2,3}[\sRr\/-]\d{1,2}(?:\.\d)?)/);
      const medida = dimM ? dimM[1].replace(/\s+/g, '/').replace(/\//g, '/').trim() : null;

      resultados.push({
        loja: lojaKey, grupo, descricao, medida, estoque, custo, venda,
        atualizado: new Date().toISOString(),
      });
      count++;
    }

    console.log(`    ${grupo}: ${count} pneus`);
    await sleep(200);
  }

  return resultados;
}

// ── Supabase ──────────────────────────────────────────────────────────────────

function sbUpsert(rows) {
  return new Promise((res) => {
    const body = JSON.stringify(rows);
    const url  = new URL(NEXUSZ_URL + '/rest/v1/estoque_pneus');
    const req  = https.request({
      hostname: url.hostname, path: url.pathname, method: 'POST',
      headers: { apikey: NEXUSZ_KEY, Authorization: 'Bearer ' + NEXUSZ_KEY, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), Prefer: 'resolution=merge-duplicates,return=minimal' },
    }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res({ status: r.statusCode, body: d })); });
    req.on('error', () => res({ status: 0, body: '' }));
    req.write(body); req.end();
  });
}

function sbJob(jobId, campos) {
  if (!jobId) return Promise.resolve();
  return new Promise((res) => {
    const body = JSON.stringify(campos);
    const url  = new URL(NEXUSZ_URL + '/rest/v1/sync_jobs?id=eq.' + jobId);
    const req  = https.request({ hostname: url.hostname, path: url.pathname + url.search, method: 'PATCH', headers: { apikey: NEXUSZ_KEY, Authorization: 'Bearer ' + NEXUSZ_KEY, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), Prefer: 'return=minimal' } }, r => { r.on('data',()=>{}); r.on('end', () => res()); });
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

  console.log(`🚀 Estoque de pneus — ${lojas.length} loja(s) | Análise de Estoque HTTP`);
  await sbJob(jobId, { status: 'rodando', progresso: 0, mensagem: 'Iniciando...' });

  // Login único
  console.log('🔑 Login...');
  const ck = await loginAndSwitch('BR01');
  console.log('✅ Logado');

  let totalGravados = 0, totalErros = 0;

  for (let li = 0; li < lojas.length; li++) {
    const loja = lojas[li];
    console.log(`\n📦 ${loja.key} (${loja.empresa})`);
    await sbJob(jobId, { progresso: Math.round((li / lojas.length) * 95), mensagem: `Coletando ${loja.key}...` });

    try {
      // Troca empresa se não for a primeira
      if (li > 0) {
        const rP = await httpReq('GET', '/wfPrincipal.aspx', { Cookie: ck });
        const ddl = rP.body.match(/id="ddlTrocarEmpresa"[\s\S]*?<\/select>/i)?.[0] || '';
        const emp = [...ddl.matchAll(/<option[^>]*value="([^"]+)">([^<]+)/gi)].map(m => ({ v: m[1], t: m[2].trim() })).find(e => e.t.toUpperCase().includes(loja.empresa.toUpperCase()));
        if (emp) {
          const vs = gf(rP.body, '__VIEWSTATE'), vsgen = gf(rP.body, '__VIEWSTATEGENERATOR'), ev = gf(rP.body, '__EVENTVALIDATION');
          const fd = new URLSearchParams({ '__VIEWSTATE': vs, '__VIEWSTATEGENERATOR': vsgen, '__EVENTVALIDATION': ev, 'ddlTrocarEmpresa': emp.v, 'ctl00$btnTrocarEmpresa': 'Trocar' }).toString();
          const rT = await httpReq('POST', '/wfPrincipal.aspx', { Cookie: ck, 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(fd), Referer: 'https://' + HOST + '/wfPrincipal.aspx' }, fd);
          if (rT.headers['location']) await httpReq('GET', rT.headers['location'], { Cookie: ck });
        }
      }

      const rows = await coletarGruposLoja(ck, loja.key);
      console.log(`  Total: ${rows.length} pneus com estoque`);

      if (!inspecionar && rows.length > 0) {
        for (let i = 0; i < rows.length; i += 100) {
          const r = await sbUpsert(rows.slice(i, i + 100));
          if (r.status !== 201 && r.status !== 204) {
            console.error('  ❌ Supabase:', r.status, r.body?.slice(0, 100));
            totalErros++;
          } else {
            totalGravados += Math.min(100, rows.length - i);
          }
        }
        console.log(`  ✅ ${rows.length} gravados`);
      } else if (inspecionar) {
        console.log('  Preview:', JSON.stringify(rows.slice(0, 2), null, 2));
      }

      await sbJob(jobId, {
        status: 'rodando',
        progresso: Math.round(((li + 1) / lojas.length) * 95),
        mensagem: `✅ ${loja.key}: ${rows.length} pneus | Total: ${totalGravados}`,
        pneus_coletados: totalGravados,
      });

    } catch (e) {
      console.error(`  ❌ Erro ${loja.key}:`, e.message);
      totalErros++;
      await sbJob(jobId, { progresso: Math.round(((li + 1) / lojas.length) * 95), mensagem: `❌ Erro em ${loja.key}: ${e.message}` });
    }

    await sleep(500);
  }

  console.log(`\n✅ Concluído: ${totalGravados} registros | ${totalErros} erros`);
  await sbJob(jobId, { status: 'concluido', progresso: 100, mensagem: `${totalGravados} pneus de ${lojas.length} lojas`, pneus_coletados: totalGravados, concluido_em: new Date().toISOString() });
}

main().catch(e => { console.error('ERRO FATAL:', e.message); process.exit(1); });
