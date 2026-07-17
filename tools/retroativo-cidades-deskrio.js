'use strict';
/**
 * tools/retroativo-cidades-deskrio.js
 *
 * Lê os tickets da Deskrio para descobrir a cidade de cada contato
 * (campo whatsapp.name dos tickets) e atualiza deskrio_contatos no Supabase.
 *
 * Uso:
 *   node tools/retroativo-cidades-deskrio.js                      # 2024-01-01 até hoje
 *   node tools/retroativo-cidades-deskrio.js --desde 2025-01-01   # desde data específica
 */
require('dotenv').config();

const SUPABASE_URL = process.env.NEXUSZ_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY;

const INSTANCIAS = [
  { empresa: 'BR',  token: process.env.DESKRIO_API_TOKEN_BR,  host: process.env.DESKRIO_INSTANCE_BR  },
  { empresa: 'PEG', token: process.env.DESKRIO_API_TOKEN_PEG, host: process.env.DESKRIO_INSTANCE_PEG },
].filter(i => i.token && i.host);

function nomeCidade(inboxName) {
  if (!inboxName) return null;
  return inboxName
    .replace(/[^\w\sÀ-ɏ]/gu, '')
    .replace(/\s*[-–]\s*[Ii]nativo.*$/i, '')
    .replace(/Peg Pneus\s*[-–]?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim() || null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function addDias(dateStr, dias) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

function fetchTickets(host, token, startDate, endDate, page) {
  return new Promise((resolve) => {
    const https = require('https');
    const path = `/v1/api/tickets?limit=500&page=${page}&startDate=${startDate}&endDate=${endDate}`;
    https.get({ hostname: host, path, headers: { 'Authorization': `Bearer ${token}` } }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve([]); } });
    }).on('error', () => resolve([]));
  });
}

async function atualizarCidade(deskrio_id, empresa, cidade) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/deskrio_contatos?deskrio_id=eq.${deskrio_id}&empresa=eq.${empresa}`,
    {
      method: 'PATCH',
      headers: {
        apikey:         SUPABASE_KEY,
        Authorization:  `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer:         'return=minimal',
      },
      body: JSON.stringify({ cidade }),
    }
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Supabase ${res.status}: ${txt}`);
  }
}

async function batchAtualizar(updates) {
  // Agrupa por cidade para reduzir chamadas: PATCH em lote via upsert
  const res = await fetch(`${SUPABASE_URL}/rest/v1/deskrio_contatos`, {
    method: 'POST',
    headers: {
      apikey:         SUPABASE_KEY,
      Authorization:  `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer:         'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Supabase ${res.status}: ${txt}`);
  }
}

async function processarInstancia({ empresa, token, host }, startDate, endDate) {
  // contactId -> { cidade, ticketDate }
  const cidadeMap = {};
  let weekStart = startDate;
  let semanas = 0;
  let totalTickets = 0;

  while (weekStart <= endDate) {
    const weekEnd = addDias(weekStart, 6) > endDate ? endDate : addDias(weekStart, 6);
    let page = 1;
    while (true) {
      const tickets = await fetchTickets(host, token, weekStart, weekEnd, page);
      if (!Array.isArray(tickets) || tickets.length === 0) break;
      totalTickets += tickets.length;

      for (const t of tickets) {
        if (!t.contact || t.contact.isGroup) continue;
        const cidade = nomeCidade(t.whatsapp?.name);
        if (!cidade) continue;
        const cid = t.contact.id;
        // Mantém cidade do ticket mais recente
        if (!cidadeMap[cid] || t.createdAt > (cidadeMap[cid].date || '')) {
          cidadeMap[cid] = { cidade, date: t.createdAt };
        }
      }

      if (tickets.length < 500) break;
      page++;
      await sleep(100);
    }

    semanas++;
    if (semanas % 10 === 0) {
      process.stderr.write(`  [${empresa}] Semana ${semanas} (${weekStart}) — ${Object.keys(cidadeMap).length} contatos com cidade\n`);
    }
    weekStart = addDias(weekEnd, 1);
    await sleep(150);
  }

  // Envia updates em lotes de 500
  const updates = Object.entries(cidadeMap).map(([id, v]) => ({
    deskrio_id: Number(id),
    empresa,
    cidade: v.cidade,
  }));

  for (let i = 0; i < updates.length; i += 500) {
    await batchAtualizar(updates.slice(i, i + 500));
  }

  return { contatos: updates.length, tickets: totalTickets, semanas };
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ NEXUSZ_SUPABASE_URL / NEXUSZ_SUPABASE_SERVICE_ROLE_KEY não configurados');
    process.exit(1);
  }

  const desdeArg = process.argv.includes('--desde')
    ? process.argv[process.argv.indexOf('--desde') + 1]
    : '2024-01-01';

  const hoje = new Date().toISOString().slice(0, 10);
  console.log(`📋 Retroativo de cidades: ${desdeArg} → ${hoje}`);

  for (const inst of INSTANCIAS) {
    console.log(`\n  🔄 ${inst.empresa}...`);
    try {
      const r = await processarInstancia(inst, desdeArg, hoje);
      console.log(`  ✅ ${inst.empresa}: ${r.contatos} contatos com cidade (${r.tickets} tickets em ${r.semanas} semanas)`);
    } catch (e) {
      console.error(`  ❌ ${inst.empresa}: ${e.message}`);
    }
  }

  console.log('\n✅ Retroativo de cidades concluído');
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
