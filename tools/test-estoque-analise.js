'use strict';
require('dotenv').config();
const https = require('https');
const { URLSearchParams } = require('url');

function httpReq(method, path, headers = {}, body = null) {
  return new Promise((resolve) => {
    const opts = {
      hostname: 'sistemaoficinainteligente.com.br', path, method,
      headers: Object.assign({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*',
        'Accept-Language': 'pt-BR,pt;q=0.9',
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

async function loginAndSwitch(empresa) {
  const r1 = await httpReq('GET', '/Entrar.aspx');
  const vs = gf(r1.body, '__VIEWSTATE'), vsgen = gf(r1.body, '__VIEWSTATEGENERATOR'), ev = gf(r1.body, '__EVENTVALIDATION');
  let ck = r1.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ') || '';
  const lb = new URLSearchParams({ '__VIEWSTATE': vs, '__VIEWSTATEGENERATOR': vsgen, '__EVENTVALIDATION': ev, 'Login1$UserName': process.env.OI_EMAIL, 'Login1$Password': process.env.OI_SENHA, 'Login1$btnEntrar': 'Entrar' }).toString();
  const r2 = await httpReq('POST', '/Entrar.aspx', { Cookie: ck, 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(lb), Referer: 'https://sistemaoficinainteligente.com.br/Entrar.aspx' }, lb);
  ck = r2.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ') || ck;
  const rP = await httpReq('GET', r2.headers['location'], { Cookie: ck });
  const ddl = rP.body.match(/id="ddlTrocarEmpresa"[\s\S]*?<\/select>/i)?.[0] || '';
  const emp = [...ddl.matchAll(/<option[^>]*value="([^"]+)">([^<]+)/gi)].map(m => ({ v: m[1], t: m[2].trim() })).find(e => e.t.toUpperCase().includes(empresa.toUpperCase()));
  if (!emp) throw new Error('Empresa ' + empresa + ' nao encontrada');
  const vs2 = gf(rP.body, '__VIEWSTATE'), vsgen2 = gf(rP.body, '__VIEWSTATEGENERATOR'), ev2 = gf(rP.body, '__EVENTVALIDATION');
  const fd = new URLSearchParams({ '__VIEWSTATE': vs2, '__VIEWSTATEGENERATOR': vsgen2, '__EVENTVALIDATION': ev2, 'ddlTrocarEmpresa': emp.v, 'ctl00$btnTrocarEmpresa': 'Trocar' }).toString();
  const rT = await httpReq('POST', '/wfPrincipal.aspx', { Cookie: ck, 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(fd), Referer: 'https://sistemaoficinainteligente.com.br/wfPrincipal.aspx' }, fd);
  if (rT.headers['location']) await httpReq('GET', rT.headers['location'], { Cookie: ck });
  return ck;
}

const GRUPOS_PNEU = ['PNEU IMPORTADO (CURVA A)', 'PNEU IMPORTADO (PROMOCIONAL)', 'PNEU IMPORTADO ALL TERRAIN', 'PNEU IMPORTADO CAMIONETE', 'PNEU IMPORTADO CARGA LEVE', 'PNEU IMPORTADO CARGA PESADA', 'PNEU IMPORTADO MOTO', 'PNEU IMPORTADO PASSEIO/SUV', 'PNEU IMPORTADO PERFIL BAIXO', 'PNEU IMPORTADO RUNFLAT', 'PNEU NACIONAL PASSEIO/SUV', 'PNEU NACIONAL MOTO', 'PNEU NACIONAL CAMIONETE', 'PNEU NACIONAL CARGA LEVE', 'PNEU NACIONAL ALL TERRAIN', 'PNEU NACIONAL PERFIL BAIXO', 'PNEU NACIONAL RUNFLAT', 'PNEU NACIONAL AGRICOLA', 'PNEU NACIONAL INDUSTRIAL', 'PNEU IMPORTADO AGRICOLA', 'PNEU IMPORTADO INDUSTRIAL'];

(async () => {
  const ck = await loginAndSwitch('BR01');
  console.log('Logado na BR01');

  const r0 = await httpReq('GET', '/wfEstoqueAnaliseDeEstoque.aspx', { Cookie: ck, Referer: 'https://sistemaoficinainteligente.com.br/wfPrincipal.aspx' });

  // Mapa: grupo → postback name
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

  console.log('Grupos encontrados:', Object.keys(gruposMap).length);
  const pneuGrupos = GRUPOS_PNEU.filter(g => gruposMap[g]);
  console.log('Grupos pneu mapeados:', pneuGrupos.length);
  pneuGrupos.forEach(g => console.log(' ', g, '->', gruposMap[g]));

  // Testa com PNEU IMPORTADO PASSEIO/SUV
  const testGrupo = pneuGrupos[0];
  if (!testGrupo) { console.log('Nenhum grupo de pneu encontrado!'); return; }

  const pb = gruposMap[testGrupo];
  console.log('\nTestando:', testGrupo, '|', pb);

  const fields = af(r0.body);
  fields['__EVENTTARGET'] = pb;
  fields['__EVENTARGUMENT'] = '';
  fields['ctl00$cph$rblEstoqueEmExcel'] = 'Com Estoque';

  const fb = new URLSearchParams(fields).toString();
  const r1 = await httpReq('POST', '/wfEstoqueAnaliseDeEstoque.aspx', {
    Cookie: ck, 'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(fb),
    Referer: 'https://sistemaoficinainteligente.com.br/wfEstoqueAnaliseDeEstoque.aspx',
  }, fb);

  console.log('POST:', r1.status, r1.headers['location'] || 'no-redirect');

  // Busca URL da janela no JavaScript da resposta
  const jsWindow = r1.body.match(/(?:window\.open|fncNovaAba)\s*\(\s*['"](wfEstoqueAnalise[^'"]+)['"]/i)?.[1] || '';
  const jsWindow2 = r1.body.match(/(?:window\.open|fncNovaAba|location)[^'"]+'(\/wf[^'"]+)'/i)?.[1] || '';
  const itemUrl2 = [...r1.body.matchAll(/wfEstoqueAnaliseDeEstoqueItem[^'"<\s]+/gi)].map(m=>m[0])[0] || '';
  console.log('JS window open:', jsWindow || jsWindow2 || itemUrl2 || 'não encontrado');
  console.log('Body preview:', r1.body.slice(0,500).replace(/\s+/g,' '));

  // Usa a URL extraída do JavaScript
  const itemUrlFromJs = r1.body.match(/(?:window\.open|fncNovaAba)\s*\(\s*'(wfEstoqueAnalise[^']+)'/i)?.[1] || '';
  const resolvedItemUrl = itemUrlFromJs ? '/' + itemUrlFromJs : r1.headers['location'];

  if (resolvedItemUrl) {
    const itemUrl = resolvedItemUrl;
    console.log('URL dos itens:', itemUrl);
    const r2 = await httpReq('GET', itemUrl, { Cookie: ck, Referer: 'https://sistemaoficinainteligente.com.br/wfEstoqueAnaliseDeEstoque.aspx' });
    console.log('Página de itens:', r2.status, 'len:', r2.body.length);

    // Extrai cabeçalho
    const headers = [...r2.body.matchAll(/<th[^>]*>([^<]+)<\/th>/gi)].map(m => m[1].trim());
    console.log('Colunas:', headers.slice(0, 12));

    // Extrai todas as linhas de dados (TR com link na primeira coluna)
    const allRows = [...r2.body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
    // Linha de dados: tem células com PNEU na descrição
    const dataRows = allRows.filter(r => {
      const text = r[1].replace(/<[^>]+>/g, ' ');
      return text.includes('PNEU') && text.match(/\d+,\d{2}/); // tem número no formato R$
    }).slice(0, 5);
    dataRows.forEach((r, i) => {
      const cells = [...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
        .map(c => c[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).trim())
        .filter(Boolean);
      console.log('Row', i, ':', cells.slice(0, 12));
    });
  }
})().catch(e => console.error('ERRO:', e.message));
