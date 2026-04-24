/**
 * tools/parse-tabela-precos.js
 *
 * Busca as abas "Carro-Pneu" e "Tabela Preço" da planilha do BR Pneus
 * e salva como arquivos JSON/MD em knowledge/.
 *
 * Uso: node tools/parse-tabela-precos.js
 */

'use strict';

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { google } = require('googleapis');

const SPREADSHEET_ID = '12Ta-tSRYF62g4K78rzLvms1P4N_R9LOnvOTwd6pi5BU';
const CREDENTIALS_PATH = path.join(__dirname, '..', 'credentials', 'google-sheets-key.json');
const KNOWLEDGE_DIR = path.join(__dirname, '..', 'knowledge');

async function getAuth() {
  const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return auth;
}

async function fetchRange(sheets, range) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  return res.data.values || [];
}

// ── CARRO-PNEU ────────────────────────────────────────────────────────────────

function parseCarroPneu(rows) {
  const result = {};
  let currentBrand = '';

  for (const row of rows) {
    if (!row || row.length === 0) continue;

    const col0 = String(row[0] || '').trim();
    if (!col0) continue;

    // Linha de cabeçalho (primeira linha: Aro 13, Aro 14 etc.)
    if (col0 === 'Modelo / Medida') continue;

    // Linha de marca (apenas col0 preenchida, demais vazias)
    const nonEmpty = row.filter(c => String(c || '').trim() !== '').length;
    if (nonEmpty === 1) {
      currentBrand = col0.toUpperCase();
      result[currentBrand] = result[currentBrand] || [];
      continue;
    }

    // Linha de dados
    const entry = {
      modelo: col0,
      aro13: String(row[1] || '').trim() || null,
      aro14: String(row[2] || '').trim() || null,
      aro15: String(row[3] || '').trim() || null,
      aro16: String(row[4] || '').trim() || null,
      aro17: String(row[5] || '').trim() || null,
      aro18: String(row[6] || '').trim() || null,
      aro19: String(row[7] || '').trim() || null,
      aro20: String(row[8] || '').trim() || null,
    };

    // Remove nulls para economizar espaço
    Object.keys(entry).forEach(k => {
      if (entry[k] === null || entry[k] === '') delete entry[k];
    });

    if (entry.modelo && currentBrand) {
      result[currentBrand].push(entry);
    }
  }

  return result;
}

// ── TABELA PREÇO ──────────────────────────────────────────────────────────────

function brl(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  if (isNaN(n) || n === 0) return null;
  return n;
}

function normalizeMedida(s) {
  return String(s || '').trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s*\.\s*/g, '.')
    .toUpperCase();
}

function parseTabelaPreco(rows) {
  /**
   * A planilha é muito larga (>100 colunas) com múltiplas seções lado a lado.
   * Estratégia: varrer cada linha em busca de padrões de medida de pneu
   * (ex: "175/70 r 14", "900-20", "750 R 16") junto com preços ao lado.
   *
   * Estrutura identificada (colunas base ~39-44):
   *   col+0: medida   col+1: ref   col+2: marca/modelo   col+3: Tab1   col+4: Tab2   col+5: Tab3
   *
   * A mesma estrutura ocorre em múltiplos "blocos" na mesma linha (colunas 39, 46, ...).
   * Buscamos qualquer posição na linha que contenha uma medida válida.
   */

  // Medida válida: deve ter separador entre componentes (/, -, R, r, x)
  // Exclui strings que são apenas dígitos (ref codes como "65010")
  const MEDIDA_RE = new RegExp(
    '^\\s*(' +
    '\\d{2,3}\\s*[\\/x]\\s*\\d{1,3}[\\s.]*[rR]\\s*\\d{2,3}(\\.\\d)?' + // 175/70R14, 215/75R17.5
    '|\\d{2,3}\\s*[\\/x]\\s*\\d{1,3}[\\s.]*-\\s*\\d{2,3}' + // 100/80-14 (moto)
    '|[6-9]\\d{2}\\s*-\\s*\\d{2}' + // 900-20, 750-16
    '|[6-9]\\d{2}\\s+[rR]\\s*\\d{2}' + // 900 R 20
    '|[6-9]\\d{2}[rR]\\d{2}' + // 900R20
    '|\\d{3,4}\\s*-\\s*\\d{2}' + // 1000-20, 650-10
    '|\\d{4}[rR]\\s*\\d{2}' + // 1000R20
    '|\\d{1,2}[\\/.]\\d{1,2}\\s*-\\s*\\d{2}' + // 12/4-24, 17.5-25
    '|\\d{1,2}\\s*\\.\\s*\\d{1,2}\\s*-\\s*\\d{2}' + // 14.9 - 24
    '|\\d{2,3}\\s*x\\s*\\d{1,4}[\\s.]*[rR]\\s*\\d{2}' + // 31x10.5R15
    ')\\s*$'
  );

  const entries = [];
  const seen = new Set();

  for (const row of rows) {
    if (!row || row.length < 3) continue;

    for (let i = 0; i < row.length - 2; i++) {
      const v = String(row[i] || '').trim();
      if (!v) continue;

      // Pula strings que são apenas dígitos (ref codes como "65010")
      if (/^\d+$/.test(v)) continue;

      if (MEDIDA_RE.test(v)) {
        const medida  = normalizeMedida(v);
        const ref     = String(row[i + 1] || '').trim();
        const modelo  = String(row[i + 2] || '').trim();
        const p1raw   = row[i + 3];
        const p2raw   = row[i + 4];
        const p3raw   = row[i + 5];

        const p1 = brl(p1raw);
        const p2 = brl(p2raw);
        const p3 = brl(p3raw);

        // Pula linhas sem nenhum preço
        if (p1 === null && p2 === null && p3 === null) continue;

        // Deduplica por medida+ref+modelo
        const key = `${medida}|${ref}|${modelo}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const entry = { medida, ref, modelo };
        if (p1 !== null) entry.tab1 = p1;
        if (p2 !== null) entry.tab2 = p2;
        if (p3 !== null) entry.tab3 = p3;

        entries.push(entry);
      }
    }
  }

  // Ordena por medida
  entries.sort((a, b) => a.medida.localeCompare(b.medida));

  return entries;
}

// ── DEFINIÇÕES DE TABELA ──────────────────────────────────────────────────────

const TABELA_DEFINICOES = {
  tab1: {
    nome: 'Tab 1',
    descricao: 'COMBO PROMOCIONAL — compra de 4+ pneus do mesmo grupo',
    pagamento: 'À Vista: Dinheiro / Pix / Cartão Débito',
    observacao: 'Melhor preço. Válido para qualquer grupo de pneu.',
  },
  tab2: {
    nome: 'Tab 2',
    descricao_pf: 'RETIRA ou FORA COMBO — Cliente Final (PF)',
    descricao_pj: 'RETIRA ou FORA COMBO — Cliente Revenda/CNPJ (Inclusive Promocional e Curva A)',
    pagamento_debito: 'À Vista: Dinheiro / Pix / Cartão Débito',
    pagamento_credito: 'Crédito à vista ou até 10x / Cartão Crédito',
    pagamento_boleto_pj: 'Boleto: 7, 15 ou 30 dias (direto)',
  },
  tab3: {
    nome: 'Tab 3',
    descricao_pf: 'RETIRA ou FORA COMBO — Todo grupo de pneu (PF)',
    descricao_pj: 'RETIRA ou FORA COMBO — Todo grupo de pneu (Revenda/CNPJ)',
    pagamento_pf: '6x a 10x / Cartão Crédito',
    pagamento_boleto_pj: 'Boleto: 15/30-20/40-30/60 dias',
  },
};

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔐 Autenticando com Google...');
  const auth = await getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  // ── Carro-Pneu ──────────────────────────────────────────────────────────────
  console.log('📊 Buscando aba Carro-Pneu...');
  const carroPneuRows = await fetchRange(sheets, "'Carro-Pneu'!A:I");
  const carroPneuData = parseCarroPneu(carroPneuRows);

  const marcas = Object.keys(carroPneuData);
  const totalModelos = marcas.reduce((s, m) => s + carroPneuData[m].length, 0);
  console.log(`   ${marcas.length} marcas, ${totalModelos} modelos encontrados`);

  fs.writeFileSync(
    path.join(KNOWLEDGE_DIR, 'tabela-carro-pneu.json'),
    JSON.stringify(carroPneuData, null, 2),
    'utf8'
  );
  console.log('   ✅ Salvo: knowledge/tabela-carro-pneu.json');

  // ── Tabela Preço ────────────────────────────────────────────────────────────
  console.log('📊 Buscando aba Tabela Preço...');
  // A planilha é muito larga — buscar colunas A até DZ (130 colunas)
  const tabelaRows = await fetchRange(sheets, "'Tabela Preço'!A:DZ");
  const tabelaEntries = parseTabelaPreco(tabelaRows);

  console.log(`   ${tabelaEntries.length} entradas de preço encontradas`);

  const output = {
    _tabelas: TABELA_DEFINICOES,
    _gerado: new Date().toISOString(),
    _fonte: `Planilha Google Sheets: ${SPREADSHEET_ID}`,
    entradas: tabelaEntries,
  };

  fs.writeFileSync(
    path.join(KNOWLEDGE_DIR, 'tabela-precos.json'),
    JSON.stringify(output, null, 2),
    'utf8'
  );
  console.log('   ✅ Salvo: knowledge/tabela-precos.json');

  // ── Resumo ───────────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────────');
  console.log('Carro-Pneu: ' + totalModelos + ' modelos de ' + marcas.length + ' marcas');
  console.log('Tabela Preço: ' + tabelaEntries.length + ' medidas com preço');
  console.log('─────────────────────────────────────────────');
  console.log('\nPrimeiras 10 entradas de preço:');
  tabelaEntries.slice(0, 10).forEach(e => {
    console.log(`  ${e.medida.padEnd(22)} | ${e.modelo.padEnd(30)} | Tab1: ${e.tab1 ?? '-'} | Tab2: ${e.tab2 ?? '-'} | Tab3: ${e.tab3 ?? '-'}`);
  });
}

main().catch(e => { console.error(e); process.exit(1); });
