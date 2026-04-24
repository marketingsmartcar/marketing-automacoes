'use strict';
// Sincroniza dados do OI com a tabela vendas_diarias_oi no Supabase (NexusZ)

const LOJAS_LABELS = {
  BR1: 'BR01 CENTRO', BR2: 'BR02 VILA', BR3: 'BR03 AMERICANA',
  BR4: 'BR04 SAO CARLOS', BR5: 'BR05 MARINGA', BR6: 'BR06 JAU',
  BR7: 'BR08 IBITINGA', PEG1: 'PEG11 ARARAQUARA', PEG2: 'PEG12 SOROCABA',
};

async function syncVendasOI(date, lojaResults) {
  const url  = process.env.NEXUSZ_SUPABASE_URL;
  const key  = process.env.NEXUSZ_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn('  ⚠️  NEXUSZ_SUPABASE_URL / NEXUSZ_SUPABASE_ANON_KEY não configurados — sync ignorado');
    return;
  }

  const dataISO = typeof date === 'string'
    ? date
    : `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

  const rows = Object.entries(lojaResults)
    .filter(([, v]) => v !== null)
    .map(([key, v]) => ({
      data:                  dataISO,
      loja_key:              key,
      loja_label:            LOJAS_LABELS[key] ?? key,
      faturamento:           v.faturamento     ?? null,
      lucro_bruto:           v.lucroBruto      ?? null,
      carro_porta:           v.carroPorta      ?? null,
      retira_porta:          v.retiraPorta     ?? null,
      revisao_porta:         v.revisaoPorta    ?? null,
      carro_agendamento:     v.carroAgendamento    ?? null,
      retira_agendamento:    v.retiraAgendamento   ?? null,
      revisao_agendamento:   v.revisaoAgendamento  ?? null,
      pneu_vendidos:         v.pneuVendidos    ?? null,
    }));

  if (!rows.length) { console.warn('  ⚠️  Nenhuma loja com dados — sync ignorado'); return; }

  const res = await fetch(`${url}/rest/v1/vendas_diarias_oi`, {
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
    throw new Error(`Supabase sync falhou (${res.status}): ${body}`);
  }

  console.log(`  ✅ Supabase sync — ${rows.length} lojas gravadas para ${dataISO}`);
}

module.exports = { syncVendasOI };
