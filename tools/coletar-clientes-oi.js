'use strict';
/**
 * tools/coletar-clientes-oi.js
 *
 * Extrai dados de clientes das OS do Oficina Inteligente e popula/atualiza
 * a tabela clientes_oi no Supabase (NexusZ).
 *
 * Uso:
 *   node tools/coletar-clientes-oi.js              # processa hoje
 *   node tools/coletar-clientes-oi.js --dias 90    # retroativo dos últimos 90 dias
 *   node tools/coletar-clientes-oi.js 2026-06-01   # data específica
 *
 * Extrai de cada OS: NomeDoCliente, Celular, CPFCNPJ, DataDeNascimento
 * Dedup: 'cpf:<digitos>' se CPF disponível, senão 'tel:<digitos>'
 * Upsert: ultima_compra = MAX(existente, nova) | primeira_compra = MIN(existente, nova)
 */

require('dotenv').config();
const https = require('https');

const BASE_OI    = 'https://www.oiapi.com.br/ws/v2/IntegracaoOficinaInteligente.asmx';
const SUPA_URL   = (process.env.NEXUSZ_SUPABASE_URL || '').trim();
const SUPA_KEY   = (process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY || '').trim();

// Lojas ativas jul/2026
const LOJAS = [
  { key: 'BR01_CENTRO',     loja: 'BR01', nome: 'Araraquara',  alt: true  },
  { key: 'BR03_AMERICANA',  loja: 'BR03', nome: 'Americana',   alt: true  },
  { key: 'BR04_SAO_CARLOS', loja: 'BR04', nome: 'São Carlos',  alt: false },
  { key: 'PEG1_ARARAQUARA', loja: 'PEG1', nome: 'Peg Arq',    alt: false },
];

const SLEEP = ms => new Promise(r => setTimeout(r, ms));

// ── Helpers ───────────────────────────────────────────────────────────────────

function getToken(loja) {
  const key = loja.alt ? `OI_TOKEN_ALT_${loja.key}` : `OI_TOKEN_${loja.key}`;
  return process.env[key] || null;
}

function soDigitos(str) {
  return (str || '').replace(/\D/g, '');
}

function parseDateOI(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s || s === '0001-01-01' || s === '01/01/0001') return null;

  // Formato brasileiro DD/MM/YYYY
  const m1 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;

  // Formato ISO YYYY-MM-DD (pode vir com horário T...)
  const m2 = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m2) return m2[1];

  return null;
}

function normalizarCelular(raw) {
  const digits = soDigitos(raw);
  if (digits.length < 8) return null;
  // Garante DDD + número
  if (digits.length >= 10) return digits.slice(0, 13); // max 13 dígitos (55 + 11 + numero)
  return digits;
}

function computarChave(cpf, celular) {
  const cpfDigits = soDigitos(cpf);
  if (cpfDigits.length === 11 || cpfDigits.length === 14) {
    return `cpf:${cpfDigits}`;
  }
  const telDigits = soDigitos(celular);
  if (telDigits.length >= 8) {
    return `tel:${telDigits}`;
  }
  return null; // não consegue deduplicar
}

// ── OI API ────────────────────────────────────────────────────────────────────

function formatDateOI(d) {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function apiGet(endpoint, params) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_OI}/${endpoint}?${new URLSearchParams(params)}`;
    https.get(url, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, data: null }); }
      });
    }).on('error', reject);
  });
}

async function buscarOSLoja(loja, dataOI) {
  const token = getToken(loja);
  if (!token) return null;

  try {
    const r = await apiGet('OrdemDeServicoJSON', { token, data: dataOI });
    if (r.status !== 200 || !Array.isArray(r.data)) return null;
    return r.data;
  } catch (err) {
    console.warn(`  ⚠️  ${loja.nome}: ${err.message}`);
    return null;
  }
}

// ── Extração de clientes das OS ───────────────────────────────────────────────

function extrairClientes(osList, lojaCode, dataISO) {
  const clientes = new Map(); // chave → row

  for (const os of osList) {
    const nome      = (os.NomeDoCliente || os.nomeDoCliente || '').trim();
    const celularRaw = os.Celular || os.celular || '';
    const cpfRaw    = os.CPFCNPJ  || os.cpfCnpj  || '';
    const nascRaw   = os.DataDeNascimento || os.dataDeNascimento || '';

    if (!nome) continue; // OS sem cliente identificado

    const chave = computarChave(cpfRaw, celularRaw);
    if (!chave) continue; // sem dedup possível

    const celular    = normalizarCelular(celularRaw);
    const cpf_cnpj   = soDigitos(cpfRaw) || null;
    const nascimento = parseDateOI(nascRaw);

    const existing = clientes.get(chave);
    if (!existing) {
      clientes.set(chave, {
        chave,
        cpf_cnpj:        cpf_cnpj || null,
        celular,
        nome,
        data_nascimento: nascimento,
        ultima_compra:   dataISO,
        primeira_compra: dataISO,
        ultima_loja:     lojaCode,
        atualizado_em:   new Date().toISOString(),
      });
    } else {
      // Manter o mais recente para ultima_compra
      if (dataISO > existing.ultima_compra) {
        existing.ultima_compra = dataISO;
        existing.ultima_loja   = lojaCode;
      }
      // Manter o mais antigo para primeira_compra
      if (dataISO < existing.primeira_compra) existing.primeira_compra = dataISO;
      // Atualizar campos em branco
      if (!existing.celular && celular) existing.celular = celular;
      if (!existing.cpf_cnpj && cpf_cnpj) existing.cpf_cnpj = cpf_cnpj;
      if (!existing.data_nascimento && nascimento) existing.data_nascimento = nascimento;
    }
  }

  return [...clientes.values()];
}

// ── Supabase ──────────────────────────────────────────────────────────────────

function supaRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPA_URL + path);
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        apikey:          SUPA_KEY,
        Authorization:   `Bearer ${SUPA_KEY}`,
        'Content-Type':  'application/json',
        Prefer:          'resolution=merge-duplicates,return=minimal',
      },
    };
    if (payload) opts.headers['Content-Length'] = Buffer.byteLength(payload);

    const req = https.request(opts, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function upsertClientes(rows) {
  if (!rows.length) return 0;

  // O upsert precisa de lógica especial para ultima_compra/primeira_compra
  // PostgREST não suporta "UPDATE only if newer" nativamente, então fazemos em lotes
  // e deixamos o merge-duplicates lidar com isso (substitui tudo pelo novo)
  // Para preservar a data mais antiga, precisamos pré-checar — estratégia simplificada:
  // merge-duplicates vai SUBSTITUIR — então já calculamos a data correta antes de inserir

  const BATCH = 100;
  let ok = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const r = await supaRequest('POST', '/rest/v1/clientes_oi?on_conflict=chave', batch);
    if (r.status < 300) {
      ok += batch.length;
    } else {
      console.warn(`  ⚠️  Supabase ${r.status}: ${r.body.slice(0, 200)}`);
    }
  }
  return ok;
}

// Para preservar ultima_compra MAX e primeira_compra MIN, busca os registros existentes
// e mescla antes de fazer upsert
async function upsertComMerge(novosClientes) {
  if (!novosClientes.length) return 0;

  // Busca registros existentes pelas chaves
  const chaves = novosClientes.map(c => c.chave);
  const chavesStr = chaves.map(c => `"${c}"`).join(',');

  let existentes = [];
  try {
    const r = await supaRequest(
      'GET',
      `/rest/v1/clientes_oi?chave=in.(${chavesStr})&select=chave,ultima_compra,primeira_compra`,
      null
    );
    if (r.status === 200) existentes = JSON.parse(r.body);
  } catch (e) {
    console.warn('  ⚠️  Não foi possível buscar registros existentes:', e.message);
  }

  const existMap = new Map(existentes.map(e => [e.chave, e]));

  // Mescla: ultima_compra = MAX, primeira_compra = MIN
  const merged = novosClientes.map(c => {
    const ex = existMap.get(c.chave);
    if (!ex) return c;
    return {
      ...c,
      ultima_compra:  c.ultima_compra  > (ex.ultima_compra  || '') ? c.ultima_compra  : ex.ultima_compra,
      primeira_compra: c.primeira_compra < (ex.primeira_compra || '9999') ? c.primeira_compra : ex.primeira_compra,
    };
  });

  return upsertClientes(merged);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args    = process.argv.slice(2);
  const diasArg = args.find(a => a.startsWith('--dias'));
  const diasNum = diasArg ? parseInt(diasArg.split('=')[1] || args[args.indexOf(diasArg) + 1] || '1') : 1;
  const dateArg = args.find(a => /^\d{4}-\d{2}-\d{2}$/.test(a));

  if (!SUPA_URL || !SUPA_KEY) {
    console.error('❌ NEXUSZ_SUPABASE_URL / NEXUSZ_SUPABASE_SERVICE_ROLE_KEY não configurados');
    process.exit(1);
  }

  // Gera lista de datas a processar
  const datas = [];
  if (dateArg) {
    datas.push(dateArg);
  } else {
    for (let d = diasNum - 1; d >= 0; d--) {
      const dt = new Date();
      dt.setDate(dt.getDate() - d);
      const iso = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
      datas.push(iso);
    }
  }

  console.log(`\n👤 Coleta Clientes OI — ${datas.length} dia(s) | ${datas[0]} → ${datas[datas.length-1]}`);
  console.log('='.repeat(60));

  let totalClientes = 0;
  let totalOS       = 0;

  for (const dataISO of datas) {
    const partes = dataISO.split('-');
    const dt     = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
    const dataOI = formatDateOI(dt);

    console.log(`\n📅 ${dataISO}`);

    const todosDia = new Map();

    for (const loja of LOJAS) {
      const osList = await buscarOSLoja(loja, dataOI);
      if (!osList) { console.log(`  ⚠️  ${loja.nome}: sem dados`); await SLEEP(500); continue; }

      const clientes = extrairClientes(osList, loja.loja, dataISO);
      console.log(`  📍 ${loja.nome}: ${osList.length} OS → ${clientes.length} clientes identificados`);
      totalOS += osList.length;

      for (const c of clientes) {
        const ex = todosDia.get(c.chave);
        if (!ex) {
          todosDia.set(c.chave, c);
        } else {
          if (c.ultima_compra > ex.ultima_compra) {
            ex.ultima_compra = c.ultima_compra;
            ex.ultima_loja   = c.ultima_loja;
          }
          if (c.primeira_compra < ex.primeira_compra) ex.primeira_compra = c.primeira_compra;
        }
      }

      await SLEEP(300);
    }

    if (todosDia.size > 0) {
      const salvos = await upsertComMerge([...todosDia.values()]);
      console.log(`  ✅ ${salvos} clientes upsertados`);
      totalClientes += todosDia.size;
    }

    // Aguarda entre datas para não sobrecarregar a OI
    if (datas.length > 1) await SLEEP(2000);
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Concluído: ${datas.length} dia(s) | ${totalOS} OS | ${totalClientes} clientes/dia processados`);
}

main().catch(e => {
  console.error('❌ Fatal:', e.message || e);
  process.exit(1);
});
