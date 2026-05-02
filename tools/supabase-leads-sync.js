'use strict';
/**
 * Sincroniza dados de leads do Deskrio para o Supabase (NexusZ).
 * Tabelas: leads_diarios (por loja) e leads_atendentes (por atendente)
 */

const LOJA_KEYS = {
  'Araraquara': 'ARQ',
  'S. Carlos':  'SAO_CARLOS',
  'Americana':  'AMERICANA',
  'Maringá':    'MARINGA',
  'Peg ARQ':    'PEG_ARQ',
  'Peg SOR':    'PEG_SOR',
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

  const rows = Object.entries(diasPorLoja).map(([lojaLabel, dados]) => ({
    data:           dataISO,
    loja_key:       LOJA_KEYS[lojaLabel] ?? lojaLabel.toUpperCase().replace(/\s/g, '_'),
    loja_label:     lojaLabel,
    tickets:        dados.tickets       ?? 0,
    ativos:         dados.ativos        ?? 0,
    novos_contatos: dados.contatos      ?? 0,
  }));

  if (!rows.length) { console.warn('  ⚠️  Nenhuma loja com dados — sync leads_diarios ignorado'); return; }
  await upsert(cfg.url, cfg.key, 'leads_diarios', 'data,loja_key', rows);
  console.log(`  ✅ leads_diarios — ${rows.length} lojas gravadas para ${dataISO}`);
}

// Sincroniza por atendente → leads_atendentes
// atendentesPorLoja: { [lojaLabel]: { [atendente]: { tickets, abertos, pendentes, fechados } } }
async function syncAtendentes(dataISO, atendentesPorLoja) {
  let cfg;
  try { cfg = getSupabaseConfig(); } catch (e) { console.warn('  ⚠️ ', e.message, '— sync atendentes ignorado'); return; }

  const rows = [];
  for (const [lojaLabel, atendentes] of Object.entries(atendentesPorLoja)) {
    for (const [atendente, d] of Object.entries(atendentes)) {
      rows.push({
        data:      dataISO,
        loja_key:  LOJA_KEYS[lojaLabel] ?? lojaLabel.toUpperCase().replace(/\s/g, '_'),
        loja_label: lojaLabel,
        atendente,
        tickets:   d.tickets  ?? 0,
        abertos:   d.abertos  ?? 0,
        pendentes: d.pendentes ?? 0,
        fechados:  d.fechados  ?? 0,
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

module.exports = { syncLeads, syncAtendentes };
