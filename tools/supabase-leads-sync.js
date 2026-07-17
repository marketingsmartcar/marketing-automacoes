'use strict';
/**
 * Sincroniza dados de leads do Deskrio para o Supabase (NexusZ).
 * Tabelas: leads_diarios (por loja) e leads_atendentes (por atendente)
 */

const LOJA_KEYS = {
  'Araraquara': 'ARQ',
  'S. Carlos':  'SAO_CARLOS',
  'Americana':  'AMERICANA',
  'Peg ARQ':    'PEG_ARQ',
};

function getSupabaseConfig() {
  const url = process.env.NEXUSZ_SUPABASE_URL;
  const key = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXUSZ_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('NEXUSZ_SUPABASE_URL / NEXUSZ_SUPABASE_SERVICE_ROLE_KEY não configurados');
  return { url, key };
}

async function upsert(url, key, tabela, conflito, rows) {
  const res = await fetch(`${url}/rest/v1/${tabela}?on_conflict=${conflito}`, {
    method:  'POST',
    headers: {
      'apikey':        key,
      'Authorization': `Bearer ${key}`,
      'Content-Type':  'application/json',
      'Prefer':        'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase ${tabela} sync falhou (${res.status}): ${body}`);
  }
}

// Sincroniza totais por loja → leads_diarios
async function syncLeads(dataISO, diasPorLoja) {
  let cfg;
  try { cfg = getSupabaseConfig(); } catch (e) { console.warn('  ⚠️ ', e.message, '— sync ignorado'); return; }

  const coletadoEm = new Date().toISOString();
  const rows = Object.entries(diasPorLoja).map(([lojaLabel, dados]) => ({
    data:           dataISO,
    loja_key:       LOJA_KEYS[lojaLabel] ?? lojaLabel.toUpperCase().replace(/\s/g, '_'),
    loja_label:     lojaLabel,
    tickets:        dados.tickets       ?? 0,
    ativos:         dados.ativos        ?? 0,
    novos_contatos: dados.contatos      ?? 0,
    coletado_em:    coletadoEm,
  }));

  if (!rows.length) { console.warn('  ⚠️  Nenhuma loja com dados — sync leads_diarios ignorado'); return; }
  await upsert(cfg.url, cfg.key, 'leads_diarios', 'data,loja_key', rows);
  console.log(`  ✅ leads_diarios — ${rows.length} lojas gravadas para ${dataISO}`);
}

// Sincroniza por atendente → leads_atendentes
// atendentesPorLoja: { [lojaLabel]: { [atendente]: { tickets, abertos, pendentes, fechados, novos_contatos } } }
async function syncAtendentes(dataISO, atendentesPorLoja) {
  let cfg;
  try { cfg = getSupabaseConfig(); } catch (e) { console.warn('  ⚠️ ', e.message, '— sync atendentes ignorado'); return; }

  const rows = [];
  for (const [lojaLabel, atendentes] of Object.entries(atendentesPorLoja)) {
    for (const [atendente, d] of Object.entries(atendentes)) {
      rows.push({
        data:           dataISO,
        loja_key:       LOJA_KEYS[lojaLabel] ?? lojaLabel.toUpperCase().replace(/\s/g, '_'),
        loja_label:     lojaLabel,
        atendente,
        tickets:        d.tickets        ?? 0,
        abertos:        d.abertos        ?? 0,
        pendentes:      d.pendentes      ?? 0,
        fechados:       d.fechados       ?? 0,
        novos_contatos: d.novos_contatos ?? 0,
      });
    }
  }

  if (!rows.length) { console.warn('  ⚠️  Nenhum atendente com dados — sync leads_atendentes ignorado'); return; }

  // Enviar em lotes de 100
  for (let i = 0; i < rows.length; i += 100) {
    await upsert(cfg.url, cfg.key, 'leads_atendentes', 'data,loja_key,atendente', rows.slice(i, i + 100));
  }
  console.log(`  ✅ leads_atendentes — ${rows.length} registros gravados para ${dataISO}`);
}

// Sincroniza tickets individuais → leads_tickets
async function syncTickets(dataISO, ticketsList) {
  let cfg;
  try { cfg = getSupabaseConfig(); } catch (e) { console.warn('  ⚠️ ', e.message, '— sync tickets ignorado'); return; }
  if (!ticketsList.length) { console.warn('  ⚠️  Nenhum ticket — sync leads_tickets ignorado'); return; }
  for (let i = 0; i < ticketsList.length; i += 100) {
    await upsert(cfg.url, cfg.key, 'leads_tickets', 'ticket_id', ticketsList.slice(i, i + 100));
  }
  console.log(`  ✅ leads_tickets — ${ticketsList.length} tickets gravados para ${dataISO}`);
}

// Sincroniza agentes Deskrio → leads_agentes
// agentesPorInstancia: { [instancia]: [{ nome, agent_id?, email? }] }
async function syncAgentes(agentesPorInstancia) {
  let cfg;
  try { cfg = getSupabaseConfig(); } catch (e) { console.warn('  ⚠️ ', e.message, '— sync agentes ignorado'); return; }

  const agora = new Date().toISOString();
  const rows = [];
  for (const [instancia, agentes] of Object.entries(agentesPorInstancia)) {
    for (const ag of agentes) {
      rows.push({
        instancia,
        nome:          ag.nome,
        agent_id:      ag.agent_id  ?? null,
        email:         ag.email     ?? null,
        ativo:         ag.ativo     ?? true,
        atualizado_em: agora,
      });
    }
  }

  if (!rows.length) { console.warn('  ⚠️  Nenhum agente — sync leads_agentes ignorado'); return; }
  for (let i = 0; i < rows.length; i += 100) {
    await upsert(cfg.url, cfg.key, 'leads_agentes', 'instancia,nome', rows.slice(i, i + 100));
  }
  console.log(`  ✅ leads_agentes — ${rows.length} agentes gravados`);
}

module.exports = { syncLeads, syncAtendentes, syncTickets, syncAgentes };
