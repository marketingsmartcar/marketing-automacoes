'use strict';
/**
 * tools/aniversariantes-crm.js
 *
 * Consulta a tabela clientes_oi no Supabase e envia relatório diário via WhatsApp:
 * - Aniversariantes do dia (com celular cadastrado)
 * - Clientes que completam 3, 6, 9 e 12 meses sem comprar (janela ±7 dias)
 *
 * Usa UazAPI free (cloud) para envio — sem dependência de PC ou bot local.
 *
 * Variáveis de ambiente necessárias:
 *   NEXUSZ_SUPABASE_URL / NEXUSZ_SUPABASE_SERVICE_ROLE_KEY
 *   UAZAPI_TOKEN              (token da instância UazAPI)
 *   UAZAPI_INSTANCE           (nome da instância, ex: peg-araraquara)
 *   WHATSAPP_GRUPO_CRM_ID     (ex: 120363427073578887@g.us)
 *
 * Uso: node tools/aniversariantes-crm.js
 */

require('dotenv').config();
const https = require('https');

const SUPA_URL      = (process.env.NEXUSZ_SUPABASE_URL || '').trim();
const SUPA_KEY      = (process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY || '').trim();
const UAZAPI_URL    = 'https://free.uazapi.com';
const UAZAPI_INST   = (process.env.UAZAPI_INSTANCE || 'peg-araraquara').trim();
const UAZAPI_TOKEN  = (process.env.UAZAPI_TOKEN || '').trim();
const GRUPO_ID      = (process.env.WHATSAPP_GRUPO_CRM_ID || process.env.WHATSAPP_GRUPO_ADS_ID || '').trim();

// Janela de dias em torno de cada marco de reativação (3/6/9/12 meses)
const JANELA_DIAS = 7;

// Marcos de reativação em dias
const MARCOS = [
  { label: '1 ANO SEM COMPRAR', dias: 365 },
  { label: '9 MESES SEM COMPRAR', dias: 270 },
  { label: '6 MESES SEM COMPRAR', dias: 180 },
  { label: '3 MESES SEM COMPRAR', dias: 90 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function hoje() {
  return new Intl.DateTimeFormat('sv', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function dataMenosDias(dias) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

function formatarData(iso) {
  if (!iso) return '?';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function formatarCelular(cel) {
  if (!cel) return '';
  const d = cel.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return cel;
}

// ── Supabase ──────────────────────────────────────────────────────────────────

function supaGet(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPA_URL + path);
    const opts = {
      hostname: url.hostname,
      path:     url.pathname + url.search,
      method:   'GET',
      headers: {
        apikey:        SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(opts, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`Supabase ${res.statusCode}: ${b.slice(0,200)}`));
        try { resolve(JSON.parse(b)); }
        catch { resolve([]); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function buscarAniversariantes() {
  const dataAtual = hoje();
  const [y, m, d] = dataAtual.split('-');
  const mes = parseInt(m, 10);
  const dia = parseInt(d, 10);

  return supaGet(
    `/rest/v1/clientes_oi` +
    `?data_nascimento=not.is.null` +
    `&celular=not.is.null` +
    `&select=nome,celular,data_nascimento,ultima_loja` +
    `&order=nome.asc` +
    `&limit=100`
  ).then(rows => rows.filter(r => {
    if (!r.data_nascimento) return false;
    const [, rm, rd] = r.data_nascimento.split('-');
    return parseInt(rm, 10) === mes && parseInt(rd, 10) === dia;
  }));
}

async function buscarReativacao(diasAlvo) {
  const de  = dataMenosDias(diasAlvo + JANELA_DIAS);
  const ate = dataMenosDias(diasAlvo - JANELA_DIAS);

  return supaGet(
    `/rest/v1/clientes_oi` +
    `?ultima_compra=gte.${de}&ultima_compra=lte.${ate}` +
    `&celular=not.is.null` +
    `&select=nome,celular,ultima_compra,ultima_loja` +
    `&order=ultima_compra.asc` +
    `&limit=100`
  );
}

// ── WhatsApp via UazAPI (cloud, sem PC) ───────────────────────────────────────

function enviarWA(chatId, mensagem) {
  return new Promise((resolve) => {
    if (!UAZAPI_TOKEN || !chatId) {
      console.log('  ⚠️  UAZAPI_TOKEN ou WHATSAPP_GRUPO_CRM_ID não configurados — mensagem não enviada');
      console.log('\n--- PRÉVIA DA MENSAGEM ---');
      console.log(mensagem);
      console.log('--- FIM ---\n');
      return resolve(false);
    }

    const body = JSON.stringify({ chatid: chatId, text: mensagem });
    const url  = new URL(`${UAZAPI_URL}/message/sendText/${UAZAPI_INST}`);
    url.searchParams.set('token', UAZAPI_TOKEN);

    const opts = {
      hostname: url.hostname,
      path:     url.pathname + url.search,
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(opts, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        if (res.statusCode < 300) {
          console.log(`  ✅ WhatsApp enviado (HTTP ${res.statusCode})`);
          resolve(true);
        } else {
          console.warn(`  ⚠️  WhatsApp ${res.statusCode}: ${b.slice(0,100)}`);
          resolve(false);
        }
      });
    });

    req.on('error', err => {
      console.warn(`  ⚠️  WhatsApp erro de rede: ${err.message}`);
      resolve(false);
    });

    req.setTimeout(15000, () => { req.destroy(); resolve(false); });
    req.write(body);
    req.end();
  });
}

// ── Formatar mensagem ─────────────────────────────────────────────────────────

function formatarMensagem(dataHoje, aniversariantes, reativacoes) {
  const [y, m, d] = dataHoje.split('-');
  const linhas = [`🗓️ *CRM do Dia — ${d}/${m}/${y}*\n`];

  // Aniversariantes
  linhas.push(`🎂 *ANIVERSARIANTES* (${aniversariantes.length} cliente${aniversariantes.length !== 1 ? 's' : ''})`);
  if (aniversariantes.length === 0) {
    linhas.push('  Nenhum aniversariante hoje.');
  } else {
    for (const c of aniversariantes) {
      const cel = formatarCelular(c.celular);
      linhas.push(`  • ${c.nome} | ${cel} | ${c.ultima_loja || '?'}`);
    }
  }

  linhas.push('');

  // Reativação por marco
  for (const { label, dados } of reativacoes) {
    linhas.push(`⏰ *COMPLETAM ${label}* (${dados.length} cliente${dados.length !== 1 ? 's' : ''})`);
    if (dados.length === 0) {
      linhas.push('  Nenhum.');
    } else {
      for (const c of dados) {
        const cel = formatarCelular(c.celular);
        linhas.push(`  • ${c.nome} | ${cel} | últ: ${formatarData(c.ultima_compra)} | ${c.ultima_loja || '?'}`);
      }
    }
    linhas.push('');
  }

  linhas.push('_Gerado automaticamente — GitHub Actions_');
  return linhas.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPA_URL || !SUPA_KEY) {
    console.error('❌ NEXUSZ_SUPABASE_URL / NEXUSZ_SUPABASE_SERVICE_ROLE_KEY não configurados');
    process.exit(1);
  }

  const dataHoje = hoje();
  console.log(`\n🎂 CRM Diário — ${dataHoje}\n`);

  // Busca em paralelo
  const [aniversariantes, ...reativacoesDados] = await Promise.all([
    buscarAniversariantes(),
    ...MARCOS.map(m => buscarReativacao(m.dias)),
  ]);

  const reativacoes = MARCOS.map((m, i) => ({ label: m.label, dados: reativacoesDados[i] }));

  console.log(`  🎂 Aniversariantes: ${aniversariantes.length}`);
  for (const m of reativacoes) {
    console.log(`  ⏰ ${m.label}: ${m.dados.length}`);
  }

  const temAlgo = aniversariantes.length > 0 || reativacoes.some(r => r.dados.length > 0);
  if (!temAlgo) {
    console.log('\n  ℹ️  Nenhum evento CRM hoje — mensagem não enviada');
    return;
  }

  const mensagem = formatarMensagem(dataHoje, aniversariantes, reativacoes);
  await enviarWA(GRUPO_ID, mensagem);

  console.log('\n✅ CRM diário concluído');
}

main().catch(e => {
  console.error('❌', e.message || e);
  process.exit(1);
});
