'use strict';
/**
 * Retroativo: busca tickets e atendentes no Deskrio dia a dia (Jan/2026 → ontem)
 * e sincroniza com as tabelas leads_tickets e leads_atendentes no Supabase.
 *
 * Uso:
 *   node tools/retroativo-tickets-atendentes.js
 *   node tools/retroativo-tickets-atendentes.js 2026-03-01   # a partir de uma data
 */
require('dotenv').config();

const { monitorarDeskrioRange } = require('./monitor-deskrio');
const { syncAtendentes, syncTickets } = require('./supabase-leads-sync');

// ─── Config (espelho de leads-hoje.js) ────────────────────────────────────────

const LOJA_MAP = {
  'Araraquara 🛞':          'Araraquara',
  'São Carlos 🛞':          'S. Carlos',
  'Americana 🛞':           'Americana',
  'Maringa 🛞':             'Maringá',
  'Peg Pneus - Araraquara': 'Peg ARQ',
  'Peg Pneus - Sorocaba':   'Peg SOR',
};

const LOJA_KEYS_MAP = {
  'Araraquara': 'ARQ', 'S. Carlos': 'SAO_CARLOS', 'Americana': 'AMERICANA',
  'Maringá': 'MARINGA', 'Peg ARQ': 'PEG_ARQ', 'Peg SOR': 'PEG_SOR',
};

const EXCLUIR_AGENTES = ['sem atendente', 'gerencia', 'administrador', 'deskrio'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoParaDDMM(iso) {
  const [, mm, dd] = iso.split('-');
  return `${dd}/${mm}/${iso.slice(0, 4)}`;
}

function addDias(iso, n) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function ontemISO() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ─── Processar resultados do Deskrio para um dia específico ──────────────────

function processarDia(resultados, dataISO) {
  const atendentesPorLoja = {};
  const ticketsList = [];

  for (const emp of resultados) {
    const isPeg = emp.nome === 'Peg Pneus';

    for (const t of (emp.ticketsRaw || [])) {
      if ((t.createdAt || '').slice(0, 10) !== dataISO) continue;

      let s = (t.status || '').toLowerCase();
      const nomeAte = (t.user?.name || '').trim();
      const temAte  = !!nomeAte && !EXCLUIR_AGENTES.some(ex => nomeAte.toLowerCase().includes(ex));
      if (isPeg && s === 'pending' && temAte) s = 'open';

      const loja = LOJA_MAP[t.whatsapp?.name];
      if (!loja) continue;

      // Atendentes
      if (temAte) {
        if (!atendentesPorLoja[loja]) atendentesPorLoja[loja] = {};
        if (!atendentesPorLoja[loja][nomeAte])
          atendentesPorLoja[loja][nomeAte] = { tickets: 0, abertos: 0, pendentes: 0, fechados: 0 };
        const a = atendentesPorLoja[loja][nomeAte];
        a.tickets++;
        if (s === 'open')         a.abertos++;
        else if (s === 'pending') a.pendentes++;
        else if (s === 'closed')  a.fechados++;
      }

      // Ticket individual
      ticketsList.push({
        ticket_id:    String(t.id),
        data:         dataISO,
        loja_key:     LOJA_KEYS_MAP[loja] ?? loja.toUpperCase().replace(/\s/g, '_'),
        loja_label:   loja,
        empresa:      emp.nome,
        atendente:    nomeAte || null,
        contato:      t.contact?.name   || null,
        numero:       t.contact?.number || null,
        status:       s,
        origem:       t.origin || null,
        criado_em:    t.createdAt  || null,
        fechado_em:   t.closedAt   || null,
        tempo_espera: typeof t.waitTime === 'number' ? t.waitTime : null,
      });
    }
  }

  return { atendentesPorLoja, ticketsList };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const argData = process.argv[2]; // ex: 2026-03-01
  const inicio  = argData || '2026-01-01';
  const fim     = ontemISO();

  console.log(`\n🔄 Retroativo tickets+atendentes: ${inicio} → ${fim}`);
  console.log('   (busca em chunks de 7 dias na API do Deskrio)\n');

  const CHUNK = 7;
  let cursor  = inicio;
  let totalTk = 0;
  let totalAt = 0;

  while (cursor <= fim) {
    const fimChunk = addDias(cursor, CHUNK - 1) > fim ? fim : addDias(cursor, CHUNK - 1);
    const iniStr   = isoParaDDMM(cursor);
    const fimStr   = isoParaDDMM(fimChunk);

    process.stdout.write(`📅 ${iniStr} → ${fimStr}  buscando Deskrio... `);

    let resultados;
    try {
      resultados = await monitorarDeskrioRange(iniStr, fimStr);
      console.log('OK');
    } catch (e) {
      console.log(`ERRO: ${e.message}`);
      cursor = addDias(fimChunk, 1);
      continue;
    }

    // Processar cada dia do chunk
    let d = cursor;
    while (d <= fimChunk) {
      const { atendentesPorLoja, ticketsList } = processarDia(resultados, d);

      const nTk = ticketsList.length;
      const nAt = Object.values(atendentesPorLoja).reduce((s, l) => s + Object.keys(l).length, 0);

      if (nTk > 0 || nAt > 0) {
        await syncAtendentes(d, atendentesPorLoja).catch(e => console.warn(`  ⚠️  atendentes ${d}:`, e.message));
        await syncTickets(d, ticketsList).catch(e => console.warn(`  ⚠️  tickets ${d}:`, e.message));
        console.log(`  ✅ ${d}: ${nTk} tickets  ${nAt} atendentes`);
        totalTk += nTk;
        totalAt += nAt;
      } else {
        console.log(`  —  ${d}: sem dados`);
      }

      d = addDias(d, 1);
    }

    cursor = addDias(fimChunk, 1);

    // Pausa entre chunks para não sobrecarregar a API
    await new Promise(r => setTimeout(r, 800));
  }

  console.log(`\n✅ Retroativo concluído — ${totalTk} tickets · ${totalAt} registros de atendentes gravados.`);
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
