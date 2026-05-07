'use strict';
// Sincroniza dados de colaboradores OI com Supabase
// Tabelas: oi_colaboradores_resumo, oi_colaboradores_grupos, oi_colaboradores_os

function parseDateBR(str) {
  // "01/05/2026" → "2026-05-01"
  const [d, m, y] = str.split('/');
  return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
}

function parseNum(str) {
  if (!str) return null;
  const n = parseFloat(str.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim());
  return isNaN(n) ? null : n;
}

function parseDateOI(str) {
  // "07/05/2026" → "2026-05-07"
  if (!str) return null;
  const m = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

async function syncColaboradoresOI(lojaKey, lojaLabel, startStr, endStr, colabs) {
  const url = process.env.NEXUSZ_SUPABASE_URL;
  const key = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXUSZ_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn('  ⚠️  Supabase não configurado — sync ignorado');
    return;
  }

  if (!colabs || !colabs.length) {
    console.warn(`  ⚠️  ${lojaKey}: sem colaboradores para sincronizar`);
    return;
  }

  const dataInicio = parseDateBR(startStr);
  const dataFim    = parseDateBR(endStr);

  const headers = {
    'apikey':        key,
    'Authorization': `Bearer ${key}`,
    'Content-Type':  'application/json',
    'Prefer':        'resolution=merge-duplicates',
  };

  // ── Resumo ────────────────────────────────────────────────────────────────
  const resumoRows = colabs.map(c => ({
    loja_key:    lojaKey,
    loja_label:  lojaLabel,
    data_inicio: dataInicio,
    data_fim:    dataFim,
    nome:        c.nome,
    nome_base:   c.nome_base,
    cargo:       c.cargo,
    unidade:     c.unidade,
    faturamento: c.faturamento,
    cmv:         c.cmv,
    lucro_bruto: c.lucro_bruto,
    itens:       c.itens,
    vl_produto:  c.vl_produto,
    pct_produto: c.pct_produto,
    vl_servico:  c.vl_servico,
    pct_servico: c.pct_servico,
  }));

  const r1 = await fetch(
    `${url}/rest/v1/oi_colaboradores_resumo?on_conflict=loja_key,data_inicio,data_fim,nome`,
    { method: 'POST', headers, body: JSON.stringify(resumoRows) }
  );
  if (!r1.ok) {
    const body = await r1.text().catch(() => '');
    throw new Error(`Supabase resumo falhou (${r1.status}): ${body}`);
  }
  console.log(`    ✅ Resumo: ${resumoRows.length} linha(s)`);

  // ── Grupos ────────────────────────────────────────────────────────────────
  const grupoRows = colabs.flatMap(c =>
    c.grupos.map(g => ({
      loja_key:         lojaKey,
      loja_label:       lojaLabel,
      data_inicio:      dataInicio,
      data_fim:         dataFim,
      nome_colaborador: c.nome,
      cargo:            c.cargo,
      grupo:            g.grupo,
      tipo:             g.tipo,
      faturamento:      parseNum(g.fat),
      cmv:              parseNum(g.cmv),
      lucro_bruto:      parseNum(g.lucro),
      itens:            parseInt(g.itens) || 0,
    }))
  );

  if (grupoRows.length) {
    const delRes = await fetch(
      `${url}/rest/v1/oi_colaboradores_grupos?loja_key=eq.${lojaKey}&data_inicio=eq.${dataInicio}&data_fim=eq.${dataFim}`,
      { method: 'DELETE', headers }
    );
    if (!delRes.ok) console.warn(`    ⚠️  Delete grupos: ${delRes.status}`);

    const r2 = await fetch(`${url}/rest/v1/oi_colaboradores_grupos`, {
      method: 'POST', headers, body: JSON.stringify(grupoRows),
    });
    if (!r2.ok) {
      const body = await r2.text().catch(() => '');
      throw new Error(`Supabase grupos falhou (${r2.status}): ${body}`);
    }
    console.log(`    ✅ Grupos: ${grupoRows.length} linha(s)`);
  }

  // ── Ordens de Serviço (vendedores) ───────────────────────────────────────
  const osRows = colabs.flatMap(c =>
    (c.os_list || []).map(os => ({
      loja_key:         lojaKey,
      loja_label:       lojaLabel,
      data_inicio:      dataInicio,
      data_fim:         dataFim,
      nome_colaborador: c.nome,
      cargo:            c.cargo,
      os_numero:        os.os_numero,
      os_data:          parseDateOI(os.os_data),
      cliente:          os.cliente || null,
      veiculo:          os.veiculo || null,
      placa:            os.placa   || null,
      tipo:             os.tipo    || null,
      pesquisa:         os.pesquisa || null,
      responsavel:      os.responsavel || null,
      vl_servico:       os.vl_servico  ?? null,
      vl_produto:       os.vl_produto  ?? null,
      vl_total:         os.vl_total    ?? null,
      items:            os.items && os.items.length ? os.items : [],
    }))
  );

  if (osRows.length) {
    // Apaga OS do mesmo período/loja antes de reinserir
    const delOS = await fetch(
      `${url}/rest/v1/oi_colaboradores_os?loja_key=eq.${lojaKey}&data_inicio=eq.${dataInicio}&data_fim=eq.${dataFim}`,
      { method: 'DELETE', headers }
    );
    if (!delOS.ok) console.warn(`    ⚠️  Delete OS: ${delOS.status}`);

    const r3 = await fetch(`${url}/rest/v1/oi_colaboradores_os`, {
      method: 'POST', headers, body: JSON.stringify(osRows),
    });
    if (!r3.ok) {
      const body = await r3.text().catch(() => '');
      throw new Error(`Supabase OS falhou (${r3.status}): ${body}`);
    }
    console.log(`    ✅ Ordens de Serviço: ${osRows.length} linha(s)`);
  }
}

module.exports = { syncColaboradoresOI };
