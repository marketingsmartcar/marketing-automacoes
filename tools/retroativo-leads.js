'use strict';
/**
 * Lê todas as abas de mês da planilha de leads e sincroniza para Supabase.
 * Uso: node tools/retroativo-leads.js
 */
require('dotenv').config();

const { google } = require('googleapis');
const fs = require('fs');

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  || '1so_-C0e_awN9vlXVueViIjgijNEYks7DIwkBbUPd0vw';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const LOJAS_ORDEM = ['Araraquara','S. Carlos','Americana','Jaú','Ibitinga','Maringá','Peg ARQ','Peg SOR'];

const LOJA_KEYS = {
  'Araraquara': 'ARQ',
  'S. Carlos':  'SAO_CARLOS',
  'Americana':  'AMERICANA',
  'Jaú':        'JAU',
  'Ibitinga':   'IBITINGA',
  'Maringá':    'MARINGA',
  'Peg ARQ':    'PEG_ARQ',
  'Peg SOR':    'PEG_SOR',
};

function criarAuth() {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyPath) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY não definido no .env');
  let raw = fs.readFileSync(keyPath, 'utf8').replace(/^﻿/, '').trim();
  if (!raw.startsWith('{')) raw = Buffer.from(raw, 'base64').toString('utf8');
  const key = JSON.parse(raw);
  return new google.auth.GoogleAuth({ credentials: key, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
}

function ddmmToISO(ddmm, year) {
  const [dd, mm] = ddmm.split('/');
  return `${year}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
}

async function syncParaSupabase(rows) {
  const url = process.env.NEXUSZ_SUPABASE_URL;
  const key = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXUSZ_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('NEXUSZ_SUPABASE_URL / NEXUSZ_SUPABASE_SERVICE_ROLE_KEY não configurados');

  // Enviar em lotes de 100
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const res = await fetch(`${url}/rest/v1/leads_diarios?on_conflict=data,loja_key`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Supabase erro (${res.status}): ${body}`);
    }
    process.stdout.write(`  ✅ Lote ${i/100+1}: ${batch.length} linhas gravadas\n`);
  }
}

async function lerAba(sheets, nomeAba, ano) {
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${nomeAba}'!A:AC`,
  });
  const allRows = data.values || [];
  const ddmm = /^\d{2}\/\d{2}$/;
  const rows = [];

  const hojeISO = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

  for (const row of allRows) {
    const data_str = row[0] || '';
    if (!ddmm.test(data_str)) continue;
    const dataISO = ddmmToISO(data_str, ano);
    if (dataISO >= hojeISO) continue; // não sincroniza hoje (dados incompletos)

    LOJAS_ORDEM.forEach((loja, li) => {
      const c = 2 + li * 3;
      const tickets = parseInt(row[c] || '0', 10) || 0;
      const ativos  = parseInt(row[c+1] || '0', 10) || 0;
      const contatos= parseInt(row[c+2] || '0', 10) || 0;
      if (tickets === 0 && ativos === 0 && contatos === 0) return;
      rows.push({
        data: dataISO,
        loja_key: LOJA_KEYS[loja] ?? loja,
        loja_label: loja,
        tickets,
        ativos,
        novos_contatos: contatos,
      });
    });
  }
  return rows;
}

async function main() {
  const auth   = criarAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  // Listar abas existentes
  const { data: meta } = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: 'sheets.properties',
  });
  const abas = meta.sheets.map(s => s.properties.title);

  let totalRows = 0;

  // Processar meses de 2025 e 2026
  for (const ano of [2025, 2026]) {
    for (const mes of MESES) {
      const nomeAba = `${mes} ${ano}`;
      if (!abas.includes(nomeAba)) continue;
      process.stdout.write(`\n📋 Processando "${nomeAba}"... `);
      const rows = await lerAba(sheets, nomeAba, ano);
      if (rows.length === 0) { console.log('sem dados'); continue; }
      console.log(`${rows.length} linhas encontradas`);
      await syncParaSupabase(rows);
      totalRows += rows.length;
    }
  }

  console.log(`\n✅ Retroativo concluído — ${totalRows} registros sincronizados.`);
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
