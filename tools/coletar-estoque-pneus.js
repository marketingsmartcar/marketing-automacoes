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
  // BR02 encerrada (jun/2026)
  { key: 'BR03', empresa: 'BR03' },
  { key: 'BR04', empresa: 'BR04' },
  // BR05 encerrada (jun/2026)
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

// Mescla novos Set-Cookie no cookie string existente (preserva todas as chaves)
function mergeCookies(existing, setCookieArr) {
  if (!setCookieArr || !setCookieArr.length) return existing;
  const map = {};
  for (const pair of existing.split('; ')) {
    const eq = pair.indexOf('=');
    if (eq > 0) map[pair.slice(0, eq).trim()] = pair.slice(eq + 1);
  }
  for (const raw of setCookieArr) {
    const pair = raw.split(';')[0].trim();
    const eq = pair.indexOf('=');
    if (eq > 0) map[pair.slice(0, eq).trim()] = pair.slice(eq + 1);
  }
  return Object.entries(map).map(([k, v]) => `${k}=${v}`).join('; ');
}

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
  }, lb);
  const loginRedirect = r2.headers['location'] || '';
  console.log('  Login redirect:', loginRedirect);
  if (!loginRedirect.includes('Principal')) throw new Error('Login falhou — redirect: ' + loginRedirect + ' (status:' + r2.status + ')');
  ck = mergeCookies(ck, r2.headers['set-cookie']);

  const rP = await httpReq('GET', r2.headers['location'], { Cookie: ck });
  ck = mergeCookies(ck, rP.headers['set-cookie']);

  const ddl = rP.body.match(/id="ddlTrocarEmpresa"[\s\S]*?<\/select>/i)?.[0] || '';
  const emp = [...ddl.matchAll(/<option[^>]*value="([^"]+)">([^<]+)/gi)].map(m => ({ v: m[1], t: m[2].trim() })).find(e => e.t.toUpperCase().includes(empresa.toUpperCase()));
  if (!emp) throw new Error('Empresa ' + empresa + ' não encontrada. Disponíveis: ' + [...ddl.matchAll(/<option[^>]*value="[^"]+"[^>]*>([^<]+)/gi)].map(m=>m[1].trim()).join(' | '));

  // Verifica se já está na empresa certa (selected option)
  const selectedEmp = ddl.match(/<option[^>]*selected[^>]*>([^<]+)<\/option>/i)?.[1]?.trim() || '';
  if (selectedEmp.toUpperCase().includes(empresa.toUpperCase())) {
    console.log('  Já na empresa:', selectedEmp);
    return ck;
  }

  const principalUrl = r2.headers['location'];
  const fields2 = af(rP.body);
  fields2['ctl00$ddlTrocarEmpresa'] = emp.v; // sobrescreve com empresa-alvo
  fields2['ctl00$btnTrocarEmpresa'] = 'Trocar';
  const fd = new URLSearchParams(fields2).toString();
  const rT = await httpReq('POST', principalUrl, {
    Cookie: ck, 'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(fd),
    Referer: 'https://' + HOST + principalUrl,
  }, fd);
  ck = mergeCookies(ck, rT.headers['set-cookie']);

  if (rT.headers['location']) {
    const rF = await httpReq('GET', rT.headers['location'], { Cookie: ck, Referer: 'https://' + HOST + principalUrl });
    ck = mergeCookies(ck, rF.headers['set-cookie']);

    // Verifica empresa após o switch
    const ddl2 = rF.body.match(/id="ddlTrocarEmpresa"[\s\S]*?<\/select>/i)?.[0] || '';
    const afterSwitch = ddl2.match(/<option[^>]*selected[^>]*>([^<]+)<\/option>/i)?.[1]?.trim() || '?';
    console.log('  Empresa após switch:', afterSwitch);
    if (!afterSwitch.toUpperCase().includes(empresa.toUpperCase())) {
      throw new Error('Switch falhou — empresa atual: ' + afterSwitch + ' (esperado: ' + empresa + ')');
    }
  }

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
      // Extrai TODOS os textos das <td> da linha
      const tds = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
        .map(m => m[1].replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim());
      // Prioridade 1: td que seja exatamente um grupo conhecido
      // Prioridade 2: td que comece com "PNEU " com pelo menos 10 chars
      const nome = tds.find(t => GRUPOS_PNEU.includes(t))
                || tds.find(t => t.length >= 10 && t.toUpperCase().startsWith('PNEU '))
                || '';
      if (nome) gruposMap[nome] = lid.replace('ctl00_cph_grd_', 'ctl00$cph$grd$').replace('_lkbQuantidadeDeProduto', '$lkbQuantidadeDeProduto');
    }
  }

  // Coleta TODOS os grupos que começam com "PNEU" encontrados na OI — não limita à lista hardcoded.
  // Isso garante que grupos novos ou grupos fora da lista (ex: PNEU USADO) sejam capturados.
  const pneuGrupos = Object.keys(gruposMap).filter(g => g.toUpperCase().startsWith('PNEU '));
  console.log(`  Todos os grupos no OI (${lojaKey}):`, Object.keys(gruposMap).join(' | '));
  console.log(`  Grupos coletados: ${pneuGrupos.join(' | ') || '(nenhum)'}`);

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

    // Extrai cabeçalhos para localizar colunas Estoque, R$Custo, R$Venda
    // Colunas fixas: #, Código, Referência(s), Cod.Barra, Endereço, Descrição, Aplicação, Marca, Estoque, Consumo, Ideal, R$Compra, R$Custo, R$Venda, Margem%
    const thHeaders = [...r2.body.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)]
      .map(m => m[1].replace(/<[^>]+>/g, '').trim().toLowerCase());
    const hEstoque = thHeaders.findIndex(h => h === 'estoque' || h === 'qtd' || h === 'quantidade');
    const hCusto   = thHeaders.findIndex(h => h.includes('custo') && h.includes('r$'));
    const hVenda   = thHeaders.findIndex(h => h.includes('venda') && h.includes('r$'));

    const allRows = [...r2.body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
    const dataRows = allRows.filter(r => {
      const text = r[1].replace(/<[^>]+>/g, ' ');
      return text.includes('PNEU') && text.match(/\d+,\d{2}/);
    });

    let count = 0;
    for (const row of dataRows) {
      // Mantém células sem filter(Boolean) para preservar índices alinhados com cabeçalhos
      const rawCells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
        .map(c => c[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).trim());

      if (rawCells.length < 8) continue;

      const descIdx = rawCells.findIndex(c => c.toUpperCase().startsWith('PNEU'));
      if (descIdx < 0) continue;

      const descricao = rawCells[descIdx];

      // Prioriza índice pelo cabeçalho; fallback por posição relativa à descrição
      let estoqueStr, custoStr, vendaStr;
      if (hEstoque >= 0 && hEstoque < rawCells.length) {
        estoqueStr = rawCells[hEstoque] || '0';
        custoStr   = hCusto >= 0 ? rawCells[hCusto] || '0'  : rawCells[rawCells.length - 3] || '0';
        vendaStr   = hVenda >= 0 ? rawCells[hVenda] || '0'  : rawCells[rawCells.length - 2] || '0';
      } else {
        // Fallback: acha a primeira célula após a descrição que seja inteiro pequeno (qty, não barcode)
        estoqueStr = '0';
        for (let i = descIdx + 1; i < Math.min(descIdx + 5, rawCells.length); i++) {
          const v = parseInt(rawCells[i].replace(/\D/g, ''), 10);
          if (!isNaN(v) && rawCells[i].replace(/\D/g, '').length <= 6) { estoqueStr = rawCells[i]; break; }
        }
        custoStr = rawCells[rawCells.length - 3] || '0';
        vendaStr = rawCells[rawCells.length - 2] || '0';
      }

      const estoque = parseInt(estoqueStr.replace(/\D/g, ''), 10) || 0;
      if (estoque <= 0) continue; // só com estoque

      const custo = parseFloat(custoStr.replace(/\./g, '').replace(',', '.')) || null;
      const venda = parseFloat(vendaStr.replace(/\./g, '').replace(',', '.')) || null;

      // Extrai medida da descrição
      // Formatos: carro/SUV "185 65 15" | "185/65R15" | moto "250 17" | "90 90 21"
      const stripped = descricao.replace(/^PNEU\s+/i, '');
      const dimM =
        stripped.match(/^(\d{2,3}[\s\/]\d{2,3}[\sRr\/-]\d{1,2}(?:\.\d)?)/) || // 3 números (carro)
        stripped.match(/^(\d{2,3}[\s\/]\d{1,2})(?=\s[A-Z])/);                  // 2 números (moto)
      const medida = dimM ? dimM[1].replace(/\s+/g, '/').trim() : null;

      resultados.push({
        loja: lojaKey, grupo, descricao, medida, estoque, custo, venda,
        atualizado: new Date().toISOString(),
      });
      count++;
    }

    console.log(`    ${grupo}: ${count} pneus`);
    // Debug extra para PROMO — lista todos os produtos coletados nesse grupo
    if (grupo.includes('PROMOCIONAL') && count > 0) {
      const promoItens = resultados.filter(r => r.grupo === grupo && r.loja === lojaKey);
      console.log(`      [PROMO DEBUG] ${lojaKey}:`, promoItens.map(r => `${r.medida} ${r.descricao.replace('PNEU ','').slice(0,30)}`).join(' | '));
    }
    await sleep(200);
  }

  return resultados;
}

// ── Supabase ──────────────────────────────────────────────────────────────────

function sbQueryLoja(lojaKey) {
  return new Promise((res) => {
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

function sbZeroEstoque(lojaKey, descricao) {
  return new Promise((res) => {
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

  let totalGravados = 0, totalErros = 0;

  for (let li = 0; li < lojas.length; li++) {
    const loja = lojas[li];
    console.log(`\n📦 ${loja.key} (${loja.empresa})`);
    await sbJob(jobId, { progresso: Math.round((li / lojas.length) * 95), mensagem: `Coletando ${loja.key}...` });

    try {
      // Login separado por loja — garante que a sessão está na empresa correta
      console.log(`  🔑 Login ${loja.key}...`);
      const ck = await loginAndSwitch(loja.empresa);

      const rows = await coletarGruposLoja(ck, loja.key);
      console.log(`  Total: ${rows.length} pneus com estoque`);

      if (!inspecionar && rows.length > 0) {
        // Busca registros atuais para detectar produtos que zeraram estoque
        const anterior = await sbQueryLoja(loja.key);
        const novosSet = new Set(rows.map(r => r.descricao.toUpperCase()));

        // Upsert: insere novos e atualiza existentes (grupo preservado pelo OI)
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

        // Zero-out: produtos que estavam no estoque mas não aparecem mais (vendidos)
        const vendidos = anterior.filter(a => a.estoque > 0 && !novosSet.has(a.descricao.toUpperCase()));
        if (vendidos.length > 0) {
          console.log(`  ⤵  ${vendidos.length} produto(s) zerado(s) (vendidos/esgotados)`);
          for (const v of vendidos) {
            await sbZeroEstoque(loja.key, v.descricao);
          }
        }

        if (lojaErros) totalErros += lojaErros;
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
