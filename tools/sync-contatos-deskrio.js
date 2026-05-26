'use strict';
/**
 * tools/sync-contatos-deskrio.js
 *
 * Sincroniza contatos da Deskrio (BR Pneus + Peg Pneus) para a tabela
 * deskrio_contatos no Supabase NexusZ, com cidade extraída dos tickets.
 *
 * Uso:
 *   node tools/sync-contatos-deskrio.js            # últimas 3 horas
 *   node tools/sync-contatos-deskrio.js --retroativo 2024-01-01  # desde data
 */
require('dotenv').config();

const SUPABASE_URL = process.env.NEXUSZ_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY;

const INSTANCIAS = [
  { empresa: 'BR', token: process.env.DESKRIO_API_TOKEN_BR, host: process.env.DESKRIO_INSTANCE_BR },
  { empresa: 'PEG', token: process.env.DESKRIO_API_TOKEN_PEG, host: process.env.DESKRIO_INSTANCE_PEG },
].filter(i => i.token && i.host);

// Limpa nome de inbox para cidade legível
function nomeCidade(inboxName) {
  if (!inboxName) return null;
  return inboxName
    .replace(/[^\w\sÀ-ɏ]/gu, '') // remove emojis
    .replace(/\s*[-–]\s*[Ii]nativo.*$/i, '')
    .replace(/Peg Pneus\s*[-–]?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim() || null;
}

// Formata número para +55 (DDD) 9XXXX-XXXX
function formatarNumero(numero) {
  if (!numero) return '';
  const d = numero.replace(/\D/g, '');
  if (!d.startsWith('55') || d.length < 12) return numero;
  const ddd  = d.slice(2, 4);
  const rest = d.slice(4);
  if (rest.length === 9) return `+55 (${ddd}) ${rest.slice(0,5)}-${rest.slice(5)}`;
  if (rest.length === 8) return `+55 (${ddd}) ${rest.slice(0,4)}-${rest.slice(4)}`;
  return `+55 (${ddd}) ${rest}`;
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

async function upsertSupabase(rows) {
  if (!rows.length) return;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/deskrio_contatos`, {
    method: 'POST',
    headers: {
      apikey:         SUPABASE_KEY,
      Authorization:  `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer:         'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Supabase ${res.status}: ${txt}`);
  }
}

async function syncInstancia({ empresa, token, host }, startDate, endDate) {
  const contactMap = {}; // deskrio_id -> {nome, numero, cidade, criado_em}
  let weekStart = startDate;
  let semanas = 0;

  while (weekStart <= endDate) {
    const weekEnd = addDias(weekStart, 6) > endDate ? endDate : addDias(weekStart, 6);
    let page = 1;
    while (true) {
      const tickets = await fetchTickets(host, token, weekStart, weekEnd, page);
      if (!Array.isArray(tickets) || tickets.length === 0) break;

      for (const t of tickets) {
        if (!t.contact || t.contact.isGroup) continue;
        const cid = t.contact.id;
        const existing = contactMap[cid];
        const novaData = t.contact.createdAt || t.createdAt;

        // Mantém o registro mais recente por contato para obter cidade atual
        if (!existing || t.createdAt > (existing._ticketDate || '')) {
          contactMap[cid] = {
            deskrio_id:      cid,
            empresa,
            nome:            t.contact.name || null,
            numero:          formatarNumero(t.contact.number),
            cidade:          nomeCidade(t.whatsapp?.name),
            criado_em:       novaData,
            sincronizado_em: new Date().toISOString(),
            _ticketDate:     t.createdAt,
          };
        }
      }

      if (tickets.length < 500) break;
      page++;
      await sleep(100);
    }

    semanas++;
    if (semanas % 5 === 0) {
      process.stderr.write(`  [${empresa}] Semana ${semanas} (${weekStart}) — ${Object.keys(contactMap).length} contatos\n`);
    }
    weekStart = addDias(weekEnd, 1);
    await sleep(150);
  }

  // Envia em lotes de 500
  const rows = Object.values(contactMap).map(r => { delete r._ticketDate; return r; });
  for (let i = 0; i < rows.length; i += 500) {
    await upsertSupabase(rows.slice(i, i + 500));
  }
  return rows.length;
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ NEXUSZ_SUPABASE_URL / NEXUSZ_SUPABASE_SERVICE_ROLE_KEY não configurados');
    process.exit(1);
  }

  const retroativoArg = process.argv.includes('--retroativo')
    ? process.argv[process.argv.indexOf('--retroativo') + 1]
    : null;

  const hoje = new Date().toISOString().slice(0, 10);

  let startDate, endDate;
  if (retroativoArg) {
    startDate = retroativoArg;
    endDate   = hoje;
    console.log(`📋 Retroativo: ${startDate} → ${endDate}`);
  } else {
    // Últimas 3 horas = hoje e ontem (garante sem furos)
    const ontem = addDias(hoje, -1);
    startDate = ontem;
    endDate   = hoje;
    console.log(`📋 Sync horário: ${startDate} → ${endDate}`);
  }

  let total = 0;
  for (const inst of INSTANCIAS) {
    console.log(`\n  🔄 ${inst.empresa}...`);
    try {
      const n = await syncInstancia(inst, startDate, endDate);
      console.log(`  ✅ ${inst.empresa}: ${n} contatos sincronizados`);
      total += n;
    } catch (e) {
      console.error(`  ❌ ${inst.empresa}: ${e.message}`);
    }
  }

  console.log(`\n✅ Total: ${total} contatos sincronizados`);
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
