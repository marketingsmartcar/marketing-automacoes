'use strict';
/**
 * Popula leads_agentes com usuários conhecidos de cada instância Deskrio.
 * Tenta descobrir via API; se falhar, usa lista manual.
 *
 * Uso: node tools/seed-leads-agentes.js
 */
require('dotenv').config();

const https = require('https');

// ─── Config ──────────────────────────────────────────────────────────────────

const EMPRESAS = [
  {
    nome:      'BR Pneus',
    token:     process.env.DESKRIO_API_TOKEN_BR,
    instancia: process.env.DESKRIO_INSTANCE_BR || 'brpneusapi.deskrio.com.br',
    // Nomes exatamente como aparecem nos tickets (campo atendente)
    usuariosConhecidos: [
      { nome: 'rafaelly- são carlos', email: null },
      { nome: 'rafaelly- americana',  email: null },
      { nome: 'rafaelly-maringa',     email: null },
      { nome: 'thais-maringa',        email: null },
      { nome: 'thais- araraquara',    email: null },
      { nome: 'jessica - adm',        email: null },
    ],
  },
  {
    nome:      'Peg Pneus',
    token:     process.env.DESKRIO_API_TOKEN_PEG,
    instancia: process.env.DESKRIO_INSTANCE_PEG || 'brpneusapi.deskrio.com.br',
    // Nomes da screenshot do Deskrio (IDs: #67, #59, #63, #69)
    usuariosConhecidos: [
      { nome: 'Alexandre', email: 'gerente.sorocaba@gmail.com',  agent_id: '67' },
      { nome: 'Consultora', email: 'alana@gmail.com',            agent_id: '59' },
      { nome: 'Fabio',      email: 'gerente.araraquara@gmail.com', agent_id: '63' },
      { nome: 'Isabelli',   email: 'isabelli@gmail.com',         agent_id: '69' },
    ],
  },
].filter(e => e.token);

// ─── HTTP helper ─────────────────────────────────────────────────────────────

function get(instancia, token, endpoint) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: instancia,
      path: endpoint,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) { reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 300)}`)); return; }
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(`Parse error: ${data.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ─── Tentar descobrir usuários via API ────────────────────────────────────────

const ENDPOINTS_CANDIDATOS = [
  '/v1/api/agents',
  '/v1/api/users',
  '/v1/api/account/agents',
  '/v1/api/account/users',
  '/v1/api/account/members',
  '/v1/api/team_members',
  '/v1/api/members',
  '/v1/api/profile',
];

async function descobrirViaAPI(empresa) {
  for (const ep of ENDPOINTS_CANDIDATOS) {
    try {
      const raw = await get(empresa.instancia, empresa.token, ep);
      const arr = Array.isArray(raw) ? raw : (raw?.agents || raw?.users || raw?.members || raw?.data || (raw?.id ? [raw] : []));
      if (arr.length > 0) {
        const agentes = arr.map(a => ({
          nome:     (a.name || a.nome || a.full_name || '').trim(),
          agent_id: String(a.id ?? a.agent_id ?? ''),
          email:    a.email ?? null,
          ativo:    a.active ?? a.ativo ?? a.enabled ?? true,
        })).filter(a => a.nome);
        if (agentes.length > 0) {
          console.log(`  ✅ ${empresa.nome}: encontrado em ${ep} — ${agentes.length} usuário(s)`);
          agentes.forEach(a => console.log(`     • ${a.nome} (${a.email || 'sem email'})`));
          return agentes;
        }
      }
    } catch (e) {
      // silencioso — só loga se quiser debug
    }
  }
  return null;
}

// ─── Supabase upsert ─────────────────────────────────────────────────────────

async function upsertAgentes(rows) {
  const url = process.env.NEXUSZ_SUPABASE_URL;
  const key = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('NEXUSZ_SUPABASE_URL / NEXUSZ_SUPABASE_SERVICE_ROLE_KEY não configurados');

  const res = await fetch(`${url}/rest/v1/leads_agentes?on_conflict=instancia,nome`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase leads_agentes falhou (${res.status}): ${body}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔍 Populando leads_agentes...\n');

  const agora = new Date().toISOString();
  let totalRows = 0;

  for (const empresa of EMPRESAS) {
    console.log(`📋 ${empresa.nome} (${empresa.instancia})`);

    // Tenta via API primeiro
    let agentes = await descobrirViaAPI(empresa);

    // Fallback: lista manual
    if (!agentes) {
      console.log(`  ℹ️  API não respondeu — usando lista manual (${empresa.usuariosConhecidos.length} usuários)`);
      agentes = empresa.usuariosConhecidos.map(u => ({ ...u, ativo: true }));
    }

    const rows = agentes.map(ag => ({
      instancia:     empresa.instancia,
      nome:          ag.nome,
      agent_id:      ag.agent_id  ?? null,
      email:         ag.email     ?? null,
      ativo:         ag.ativo     ?? true,
      atualizado_em: agora,
    }));

    try {
      await upsertAgentes(rows);
      console.log(`  ✅ ${rows.length} agente(s) gravado(s) no Supabase`);
      rows.forEach(r => console.log(`     • ${r.nome} (ativo: ${r.ativo})`));
      totalRows += rows.length;
    } catch (e) {
      console.error(`  ❌ Erro Supabase: ${e.message}`);
    }

    console.log('');
  }

  console.log(`\n✅ Total: ${totalRows} agente(s) em leads_agentes`);
  console.log('   O filtro de atendentes no NexusZ agora mostrará apenas esses usuários.');
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
