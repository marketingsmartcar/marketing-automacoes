'use strict';
/**
 * tools/leads-hoje.js
 *
 * Atualiza a linha do dia atual na aba do mês (ex: "Abril 2026")
 * na planilha de leads, de hora em hora das 07h às 18h.
 *
 * Uso:
 *   node tools/leads-hoje.js          # inicia scheduler (07h–18h)
 *   node tools/leads-hoje.js --agora  # executa uma vez agora e sai
 */
require('dotenv').config();

const { google } = require('googleapis');
const fs         = require('fs');
const cron       = require('node-cron');
const { monitorarDeskrioRange, fetchAgentesInstancias } = require('./monitor-deskrio');
const { syncLeads, syncAtendentes, syncTickets, syncAgentes } = require('./supabase-leads-sync');

// ─── Config ───────────────────────────────────────────────────────────────────

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  || '1so_-C0e_awN9vlXVueViIjgijNEYks7DIwkBbUPd0vw';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const EXCLUIR_AGENTES = ['sem atendente', 'gerencia', 'administrador', 'deskrio'];

const LOJA_MAP = {
  'Araraquara 🛞':          'Araraquara',
  'São Carlos 🛞':          'S. Carlos',
  'Americana 🛞':           'Americana',
  'Maringa 🛞':             'Maringá',
  'Peg Pneus - Araraquara': 'Peg ARQ',
  'Peg Pneus - Sorocaba':   'Peg SOR',
};
const LOJAS_ORDEM = ['Araraquara', 'S. Carlos', 'Americana', 'Maringá', 'Peg ARQ', 'Peg SOR'];

const LOJA_KEYS_MAP = {
  'Araraquara': 'ARQ', 'S. Carlos': 'SAO_CARLOS', 'Americana': 'AMERICANA',
  'Maringá': 'MARINGA', 'Peg ARQ': 'PEG_ARQ', 'Peg SOR': 'PEG_SOR',
};

// Cores das lojas (pastéis) — mesmas do relatorio-mensal-sheets.js
const LOJA_COLORS_DAT = [
  { red:0.859, green:0.906, blue:0.996 },  // Araraquara — azul
  { red:0.859, green:0.976, blue:0.906 },  // S. Carlos  — verde
  { red:0.800, green:0.984, blue:0.945 },  // Americana  — teal
  { red:1.000, green:0.929, blue:0.843 },  // Maringá    — laranja claro
  { red:0.878, green:0.949, blue:0.996 },  // Peg ARQ    — céu
  { red:1.000, green:0.894, blue:0.902 },  // Peg SOR    — rosa
];

const COR_LARANJA = { red: 0.961, green: 0.651, blue: 0.137 };
const COR_PRETO   = { red: 0.102, green: 0.102, blue: 0.102 };
const COR_BRANCO  = { red: 1, green: 1, blue: 1 };

// ─── Auth ─────────────────────────────────────────────────────────────────────

function criarAuth() {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyPath) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY não definido no .env');
  let raw = fs.readFileSync(keyPath, 'utf8').replace(/^﻿/, '').trim();
  if (!raw.startsWith('{')) raw = Buffer.from(raw, 'base64').toString('utf8');
  const key = JSON.parse(raw);
  return new google.auth.GoogleAuth({ credentials: key, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
}

// ─── Data helpers ─────────────────────────────────────────────────────────────

function emBRT() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
}

function hojeDDMM() {
  const d = emBRT();
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
}

function hojeISO() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
}

function getNomeMesAtual() {
  const d = emBRT();
  return `${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

function calcTempoEspera(t) {
  if (t.waitTime != null && t.waitTime !== '') return parseInt(t.waitTime);
  if (t.createdAt && t.updatedAt) {
    const diff = Math.round((new Date(t.updatedAt) - new Date(t.createdAt)) / 1000);
    return Math.max(0, diff);
  }
  return null;
}

// ─── Processar dados do dia ───────────────────────────────────────────────────

function processarHoje(resultados, dataISO) {
  const hISO = dataISO || hojeISO();
  const diasPorLoja = {};
  // { [loja]: { [atendente]: { tickets, abertos, pendentes, fechados } } }
  const atendentesPorLoja = {};
  const ticketsList = [];

  resultados.forEach(emp => {
    const isPeg = emp.nome === 'Peg Pneus';

    (emp.ticketsRaw || []).forEach(t => {
      if ((t.createdAt || '').slice(0, 10) !== hISO) return;

      let s = (t.status || '').toLowerCase();
      const nomeAte = (t.user?.name || '').trim();
      const temAte  = !!nomeAte && !EXCLUIR_AGENTES.some(ex => nomeAte.toLowerCase().includes(ex));
      if (isPeg && s === 'pending' && temAte) s = 'open';

      const loja = LOJA_MAP[t.whatsapp?.name];
      if (!loja) return;

      if (!diasPorLoja[loja]) diasPorLoja[loja] = { tickets: 0, ativos: 0, contatos: new Set() };
      diasPorLoja[loja].tickets++;
      const cDia = (t.contact?.createdAt || '').slice(0, 10);
      if (cDia === hISO && t.contactId) diasPorLoja[loja].contatos.add(t.contactId);

      // Por atendente (só registra se tiver atendente real)
      if (temAte) {
        if (!atendentesPorLoja[loja]) atendentesPorLoja[loja] = {};
        if (!atendentesPorLoja[loja][nomeAte]) {
          atendentesPorLoja[loja][nomeAte] = { tickets: 0, abertos: 0, pendentes: 0, fechados: 0, novos_contatos: 0 };
        }
        const a = atendentesPorLoja[loja][nomeAte];
        a.tickets++;
        if (s === 'open')    a.abertos++;
        else if (s === 'pending') a.pendentes++;
        else if (s === 'closed')  a.fechados++;
        // Conta como lead (receptivo) se a origem não for ativo/outbound
        const orig = (t.origin || '').toLowerCase();
        if (!orig.includes('ativo') && orig !== 'active') a.novos_contatos++;
      }

      // Ticket individual para Supabase
      ticketsList.push({
        ticket_id:    String(t.id),
        data:         hISO,
        loja_key:     LOJA_KEYS_MAP[loja] ?? loja.toUpperCase().replace(/\s/g, '_'),
        loja_label:   loja,
        empresa:      emp.nome,
        atendente:    nomeAte || null,
        contato:      t.contact?.name  || null,
        numero:       t.contact?.number || null,
        status:       s,
        origem:       t.origin || null,
        criado_em:    t.createdAt  || null,
        fechado_em:   t.closedAt   || null,
        tempo_espera: calcTempoEspera(t),
      });
    });

    (emp.ativosRaw || []).forEach(t => {
      const orig = (t.origin || '').toLowerCase();
      if (!orig.includes('ativo') && orig !== 'active') return;
      if ((t.createdAt || '').slice(0, 10) !== hISO) return; // eslint-disable-line
      const loja = LOJA_MAP[t.whatsapp?.name];
      if (!loja) return;
      if (!diasPorLoja[loja]) diasPorLoja[loja] = { tickets: 0, ativos: 0, contatos: new Set() };
      diasPorLoja[loja].ativos = (diasPorLoja[loja].ativos || 0) + 1;
    });
  });

  for (const l of Object.keys(diasPorLoja)) {
    diasPorLoja[l].contatos = diasPorLoja[l].contatos.size;
  }

  return { diasPorLoja, atendentesPorLoja, ticketsList };
}

// ─── Formatação de uma linha de dados ────────────────────────────────────────

function fmtsLinha(sheetId, rowIdx) {
  const reqs = [];
  const NL = LOJAS_ORDEM.length; // 8

  // Colunas 0-1: branco, texto pequeno, centralizado
  reqs.push({ repeatCell: {
    range: { sheetId, startRowIndex: rowIdx, endRowIndex: rowIdx+1, startColumnIndex: 0, endColumnIndex: 2 },
    cell: { userEnteredFormat: {
      backgroundColor: COR_BRANCO,
      textFormat: { fontSize: 9, foregroundColor: COR_PRETO },
      horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE',
    }},
    fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
  }});

  // Colunas de cada loja (3 cols por loja)
  LOJAS_ORDEM.forEach((_, li) => {
    const c = 2 + li * 3;
    reqs.push({ repeatCell: {
      range: { sheetId, startRowIndex: rowIdx, endRowIndex: rowIdx+1, startColumnIndex: c, endColumnIndex: c+3 },
      cell: { userEnteredFormat: {
        backgroundColor: LOJA_COLORS_DAT[li],
        textFormat: { fontSize: 9, foregroundColor: COR_PRETO },
        horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE',
      }},
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
    }});
  });

  // 3 colunas de total: laranja, bold
  const cTot = 2 + NL * 3;
  reqs.push({ repeatCell: {
    range: { sheetId, startRowIndex: rowIdx, endRowIndex: rowIdx+1, startColumnIndex: cTot, endColumnIndex: cTot+3 },
    cell: { userEnteredFormat: {
      backgroundColor: COR_LARANJA,
      textFormat: { fontSize: 9, bold: true, foregroundColor: COR_PRETO },
      horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE',
    }},
    fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
  }});

  // Altura da linha
  reqs.push({ updateDimensionProperties: {
    range: { sheetId, dimension: 'ROWS', startIndex: rowIdx, endIndex: rowIdx+1 },
    properties: { pixelSize: 20 },
    fields: 'pixelSize',
  }});

  return reqs;
}

// ─── Helpers de data ─────────────────────────────────────────────────────────

function isoToDDMM(dataISO) {
  const [, m, d] = dataISO.split('-');
  return `${d}/${m}`;
}

function isoToNomeMes(dataISO) {
  const [y, m] = dataISO.split('-');
  return `${MESES[parseInt(m, 10) - 1]} ${y}`;
}

function isoToDiaNome(dataISO) {
  return ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][new Date(dataISO + 'T12:00:00').getDay()];
}

// ─── Orquestrador ─────────────────────────────────────────────────────────────

// dataAlvo: 'YYYY-MM-DD' (padrão: hoje em BRT)
async function atualizarLinhaHoje(dataAlvo) {
  const dataISO = dataAlvo || hojeISO();
  const hoje    = isoToDDMM(dataISO);
  const nomeMes = isoToNomeMes(dataISO);
  const agora   = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  console.log(`\n📊 [${agora}] Atualizando linha ${hoje} em "${nomeMes}"...`);

  // 1. Buscar dados do Deskrio para o dia alvo
  const resultados = await monitorarDeskrioRange(hoje, hoje);
  const { diasPorLoja, atendentesPorLoja, ticketsList } = processarHoje(resultados, dataISO);

  const totTk = LOJAS_ORDEM.reduce((s,l) => s + (diasPorLoja[l]?.tickets || 0), 0);
  const totAv = LOJAS_ORDEM.reduce((s,l) => s + (diasPorLoja[l]?.ativos  || 0), 0);
  const totNC = LOJAS_ORDEM.reduce((s,l) => s + (diasPorLoja[l]?.contatos|| 0), 0);
  console.log(`  → Tk:${totTk}  Ativ:${totAv}  NC:${totNC}`);

  // 2. Conectar ao Sheets
  const auth   = criarAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  // 3. Localizar sheetId da aba do mês
  const { data: meta } = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: 'sheets.properties',
  });
  const sheetMeta = meta.sheets.find(s => s.properties.title === nomeMes);
  if (!sheetMeta) {
    console.warn(`⚠️  Aba "${nomeMes}" não encontrada — execute relatorio-mensal-sheets.js primeiro.`);
    return;
  }
  const sheetId = sheetMeta.properties.sheetId;

  // 4. Ler coluna A para achar posições de hoje e TOTAL
  const { data: aColData } = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${nomeMes}'!A:A`,
  });
  let colA = (aColData.values || []).map(r => r[0] || '');

  let totalRowIdx = colA.findIndex(v => v === 'TOTAL');
  let todayRowIdx = colA.findIndex(v => v === hoje);

  if (totalRowIdx === -1) {
    console.warn('⚠️  Linha TOTAL não encontrada na aba — abortando.');
    return;
  }

  // 5. Se hoje ainda não tem linha, inserir antes do TOTAL
  if (todayRowIdx === -1) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [
        {
          insertRange: {
            range: { sheetId, startRowIndex: totalRowIdx, endRowIndex: totalRowIdx + 1 },
            shiftDimension: 'ROWS',
          },
        },
        ...fmtsLinha(sheetId, totalRowIdx),
      ]},
    });
    todayRowIdx  = totalRowIdx;
    totalRowIdx += 1; // TOTAL desceu uma linha
  }

  // 6. Montar valores da linha de hoje
  const dayName = isoToDiaNome(dataISO);
  const rowVals = [hoje, dayName];
  LOJAS_ORDEM.forEach(loja => {
    const ld = diasPorLoja[loja] || { tickets: 0, ativos: 0, contatos: 0 };
    rowVals.push(ld.tickets, ld.ativos, ld.contatos);
  });
  rowVals.push(totTk, totAv, totNC);

  // 7. Escrever linha de hoje
  const rowNum = todayRowIdx + 1; // 1-indexed
  // Pad com strings vazias para apagar colunas legadas (ex-Jaú/Ibitinga) além das 23 atuais
  const rowValsPadded = [...rowVals, '', '', '', '', '', '', ''];
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${nomeMes}'!A${rowNum}`,
    valueInputOption: 'RAW',
    requestBody: { values: [rowValsPadded] },
  });

  // 8. Recalcular e atualizar linha TOTAL
  const { data: allData } = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${nomeMes}'!A:AC`,
  });
  const allRows = allData.values || [];

  const ddmm = /^\d{2}\/\d{2}$/;
  const NUM_COLS = LOJAS_ORDEM.length * 3 + 3; // 6×3+3 = 21 colunas numéricas
  const totalCols = Array(NUM_COLS).fill(0);
  allRows.forEach(row => {
    if (!ddmm.test(row[0] || '')) return;
    for (let c = 2; c < 2 + NUM_COLS; c++) {
      const v = parseInt(row[c] || '0', 10);
      if (!isNaN(v)) totalCols[c - 2] += v;
    }
  });

  const totalRowNum = totalRowIdx + 1;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${nomeMes}'!A${totalRowNum}`,
    valueInputOption: 'RAW',
    requestBody: { values: [['TOTAL', '', ...totalCols, '', '', '', '', '', '', '']] },
  });

  console.log(`✅ Linha ${hoje} + TOTAL atualizados na aba "${nomeMes}" (linhas ${rowNum}/${totalRowNum}).`);

  // Sync para Supabase/NexusZ
  await syncLeads(dataISO, diasPorLoja).catch(e => console.warn('  ⚠️  Supabase leads_diarios sync:', e.message));
  await syncAtendentes(dataISO, atendentesPorLoja).catch(e => console.warn('  ⚠️  Supabase leads_atendentes sync:', e.message));
  await syncTickets(dataISO, ticketsList).catch(e => console.warn('  ⚠️  Supabase leads_tickets sync:', e.message));

  // Sync lista de agentes válidos (usuários Deskrio)
  const agentesInstancias = await fetchAgentesInstancias().catch(e => { console.warn('  ⚠️  fetchAgentesInstancias:', e.message); return {}; });
  await syncAgentes(agentesInstancias).catch(e => console.warn('  ⚠️  Supabase leads_agentes sync:', e.message));
}

// ─── Remover aba "Hoje" se existir (criada por versão anterior) ───────────────

async function removerAbaHojeSeExistir() {
  try {
    const auth   = criarAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const { data } = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID, fields: 'sheets.properties' });
    const aba = data.sheets.find(s => s.properties.title === '📅 Hoje');
    if (!aba) return;
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ deleteSheet: { sheetId: aba.properties.sheetId } }] },
    });
    console.log('🗑️  Aba "📅 Hoje" removida.');
  } catch { /* ignora */ }
}

// ─── Entrypoint ───────────────────────────────────────────────────────────────

const { execSync: _notifLeads } = require('child_process');
function notificarLeads(status, detalhe) {
  try {
    const args = `--nome "Leads Hoje" --status ${status} --silencioso${detalhe ? ` --detalhe "${detalhe}"` : ''}`;
    _notifLeads(`node "${path.join(__dirname, 'notificar-automacao.js')}" ${args}`, { stdio: 'inherit', timeout: 10000 });
  } catch {}
}

if (require.main === module) {
  const argDataIdx = process.argv.indexOf('--data');
  const argDataVal = argDataIdx !== -1 ? process.argv[argDataIdx + 1] : null;

  if (process.argv.includes('--agora') || argDataVal) {
    notificarLeads('inicio');
    atualizarLinhaHoje(argDataVal || null)
      .then(() => notificarLeads('fim'))
      .catch(e => { notificarLeads('erro', e.message.slice(0, 80)); console.error('❌ Fatal:', e.message); process.exit(1); });
  } else {
    removerAbaHojeSeExistir();

    console.log('🟢 Leads Hoje — Scheduler iniciado.');
    console.log('   Atualiza a linha do dia de hora em hora das 07h às 18h (Seg–Sáb).');

    // Executa imediatamente ao iniciar se estiver no horário
    const h = emBRT().getHours();
    if (h >= 7 && h <= 18) {
      notificarLeads('inicio');
      atualizarLinhaHoje()
        .then(() => notificarLeads('fim'))
        .catch(e => { notificarLeads('erro', e.message.slice(0, 80)); console.warn('⚠️  Primeira execução falhou:', e.message); });
    }

    // Cron: minuto 0, horas 7–18, segunda a sábado
    cron.schedule('0 7-18 * * 1-6', () => {
      notificarLeads('inicio');
      atualizarLinhaHoje()
        .then(() => notificarLeads('fim'))
        .catch(e => { notificarLeads('erro', e.message.slice(0, 80)); console.warn('⚠️  Atualização falhou:', e.message); });
    }, { timezone: 'America/Sao_Paulo' });
  }
}

module.exports = { atualizarLinhaHoje };
