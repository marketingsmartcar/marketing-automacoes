'use strict';
/**
 * tools/export-contatos-deskrio.js
 *
 * Exporta TODOS os contatos da Deskrio (BR + PEG) para:
 *   1. Supabase (tabela deskrio_contatos)
 *   2. Excel (output/contatos-deskrio-YYYY-MM-DD.xlsx)
 *
 * Uso:
 *   node tools/export-contatos-deskrio.js
 */
require('dotenv').config();
const fs   = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.NEXUSZ_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY;

const INSTANCIAS = [
  { empresa: 'BR', token: process.env.DESKRIO_API_TOKEN_BR, host: process.env.DESKRIO_INSTANCE_BR },
  { empresa: 'PEG', token: process.env.DESKRIO_API_TOKEN_PEG, host: process.env.DESKRIO_INSTANCE_PEG },
].filter(i => i.token && i.host);

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

function fetchContatos(host, token, page) {
  return new Promise((resolve) => {
    const https = require('https');
    const path2 = `/v1/api/contacts?limit=500&page=${page}`;
    https.get({ hostname: host, path: path2, headers: { 'Authorization': `Bearer ${token}` } }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(d);
          // Log estrutura da resposta na primeira página para debug
          if (page === 1) {
            const keys = Array.isArray(parsed) ? ['array'] : Object.keys(parsed).slice(0, 5);
            process.stderr.write(`  [DEBUG] Estrutura resposta: ${JSON.stringify(keys)}\n`);
            if (!Array.isArray(parsed)) {
              const sample = parsed?.contacts?.[0] || parsed?.data?.[0] || parsed?.payload?.[0];
              if (sample) process.stderr.write(`  [DEBUG] Campos do contato: ${JSON.stringify(Object.keys(sample))}\n`);
            }
          }
          resolve(parsed);
        } catch { resolve([]); }
      });
    }).on('error', (err) => { process.stderr.write(`  [ERRO HTTPS] ${err.message}\n`); resolve([]); });
  });
}

async function upsertSupabase(rows, tentativa = 1) {
  if (!rows.length) return;
  try {
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
  } catch (e) {
    if (tentativa < 3) {
      await sleep(2000 * tentativa);
      return upsertSupabase(rows, tentativa + 1);
    }
    throw e;
  }
}

async function syncInstancia({ empresa, token, host }) {
  const todos = [];
  let page = 1;
  while (true) {
    const data = await fetchContatos(host, token, page);
    const lista = Array.isArray(data)
      ? data
      : (data?.contacts || data?.data || data?.payload || data?.result || []);
    if (!lista.length) break;

    for (const c of lista) {
      if (c.isGroup) continue;
      todos.push({
        deskrio_id:      c.id,
        empresa,
        nome:            c.name || null,
        numero:          formatarNumero(c.phoneNumber || c.number || ''),
        cidade:          null, // preenchida depois pelo retroativo de cidades
        criado_em:       c.createdAt || null,
        sincronizado_em: new Date().toISOString(),
      });
    }

    process.stderr.write(`  [${empresa}] Página ${page} — ${todos.length} contatos\n`);
    // Se a API retornou mais do que o limite solicitado, não há paginação real — sair
    if (lista.length < 500 || lista.length > 500) break;
    page++;
    await sleep(100);
  }

  // Upsert em lotes de 500
  for (let i = 0; i < todos.length; i += 500) {
    await upsertSupabase(todos.slice(i, i + 500));
  }
  return todos;
}

function gerarExcel(brRows, pegRows) {
  // CSV simples — compatível com Excel sem dependência externa
  const hoje = new Date().toISOString().slice(0, 10);
  const outDir = path.join(__dirname, '../output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const arquivo = path.join(outDir, `contatos-deskrio-${hoje}.csv`);
  const linhas = ['Empresa,Data,Nome,Número,Cidade'];

  for (const r of brRows) {
    const data = r.criado_em ? r.criado_em.slice(0,10) : '';
    linhas.push(`BR,"${data}","${(r.nome||'').replace(/"/g,'""')}","${r.numero}","${r.cidade||''}"`);
  }
  for (const r of pegRows) {
    const data = r.criado_em ? r.criado_em.slice(0,10) : '';
    linhas.push(`PEG,"${data}","${(r.nome||'').replace(/"/g,'""')}","${r.numero}","${r.cidade||''}"`);
  }

  fs.writeFileSync(arquivo, '﻿' + linhas.join('\n'), 'utf8'); // BOM para Excel abrir UTF-8
  return arquivo;
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ NEXUSZ_SUPABASE_URL / NEXUSZ_SUPABASE_SERVICE_ROLE_KEY não configurados');
    process.exit(1);
  }

  const todosInstancias = {};
  for (const inst of INSTANCIAS) {
    console.log(`\n  🔄 ${inst.empresa} — buscando contatos...`);
    try {
      const rows = await syncInstancia(inst);
      todosInstancias[inst.empresa] = rows;
      console.log(`  ✅ ${inst.empresa}: ${rows.length} contatos exportados para Supabase`);
    } catch (e) {
      console.error(`  ❌ ${inst.empresa}: ${e.message}`);
      todosInstancias[inst.empresa] = [];
    }
  }

  const brRows  = todosInstancias['BR']  || [];
  const pegRows = todosInstancias['PEG'] || [];
  const arquivo = gerarExcel(brRows, pegRows);

  const total = brRows.length + pegRows.length;
  console.log(`\n✅ Total: ${total} contatos`);
  console.log(`   BR: ${brRows.length} | PEG: ${pegRows.length}`);
  console.log(`📄 Arquivo: ${arquivo}`);
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
