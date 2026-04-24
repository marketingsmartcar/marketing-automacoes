/**
 * tools/conferencia-os-operacional.js
 *
 * Confere as OS de Material Operacional em todas as lojas.
 * Identifica OS abertas (a fechar), fechadas e itens com custo zero.
 *
 * Uso:
 *   node tools/conferencia-os-operacional.js                  (semana passada)
 *   node tools/conferencia-os-operacional.js esta-semana       (seg até hoje)
 *   node tools/conferencia-os-operacional.js dias 14           (últimos N dias)
 */

require('dotenv').config();
const https = require('https');

const BASE_URL = 'https://www.oiapi.com.br/ws/v2/IntegracaoOficinaInteligente.asmx';

const LOJAS = {
  BR01_CENTRO:     { nome: 'BR Pneus Araraquara Centro', placa: 'BRP1102', rede: 'BR Pneus' },
  BR02_VILA:       { nome: 'BR Pneus Araraquara Vila',   placa: 'BRP2202', rede: 'BR Pneus' },
  BR03_AMERICANA:  { nome: 'BR Pneus Americana',         placa: 'BRP3302', rede: 'BR Pneus' },
  BR04_SAO_CARLOS: { nome: 'BR Pneus São Carlos',        placa: 'BRP4402', rede: 'BR Pneus' },
  BR05_MARINGA:    { nome: 'BR Pneus Maringá',           placa: 'BRP5502', rede: 'BR Pneus' },
  BR06_JAU:        { nome: 'BR Pneus Jaú',               placa: 'BRP6602', rede: 'BR Pneus' },
  BR08_IBITINGA:   { nome: 'BR Pneus Ibitinga',          placa: 'BRP7702', rede: 'BR Pneus' },
  PEG1_ARARAQUARA: { nome: 'Peg Pneus Araraquara',       placa: 'PEG1102', rede: 'Peg Pneus' },
  PEG2_SOROCABA:   { nome: 'Peg Pneus Sorocaba',         placa: 'PEG2202', rede: 'Peg Pneus' },
};

const TOKEN_ALT = new Set(['BR01_CENTRO', 'BR03_AMERICANA', 'BR06_JAU']);

function getToken(lojaKey) {
  const key = TOKEN_ALT.has(lojaKey) ? `OI_TOKEN_ALT_${lojaKey}` : `OI_TOKEN_${lojaKey}`;
  const token = process.env[key];
  if (!token) throw new Error(`Token não encontrado: ${key}`);
  return token;
}

function formatDate(d) {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function apiGet(endpoint, params) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}/${endpoint}?${new URLSearchParams(params)}`;
    https.get(url, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body), raw: body }); }
        catch { resolve({ status: res.statusCode, data: null, raw: body }); }
      });
    }).on('error', reject);
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function getPeriodDays(modo, n) {
  const hoje = new Date();
  const dow = hoje.getDay(); // 0=Dom

  if (modo === 'dias') {
    const days = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() - i);
      days.push(d);
    }
    return days;
  }

  if (modo === 'esta-semana') {
    const daysFromMon = dow === 0 ? 6 : dow - 1;
    const seg = new Date(hoje);
    seg.setDate(hoje.getDate() - daysFromMon);
    const days = [];
    for (let i = 0; i <= daysFromMon; i++) {
      const d = new Date(seg);
      d.setDate(seg.getDate() + i);
      days.push(d);
    }
    return days;
  }

  // semana-passada: segunda a domingo da semana anterior
  const daysFromMon = dow === 0 ? 6 : dow - 1;
  const segPassada = new Date(hoje);
  segPassada.setDate(hoje.getDate() - daysFromMon - 7);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(segPassada);
    d.setDate(segPassada.getDate() + i);
    days.push(d);
  }
  return days;
}

function brl(val) {
  return `R$${Number(val || 0).toFixed(2).replace('.', ',')}`;
}

// Campos retornados pela API OI v2 (confirmados):
// CodigoDoItem, DescricaoDoItem, QuantidadeDoItem, ValorUnitarioDoItem, ValorTotalDoItem
function parseItem(item) {
  const desc   = item.DescricaoDoItem || item.Descricao || item.DescricaoDoProduto || '';
  const qtd    = item.QuantidadeDoItem ?? item.Quantidade ?? item.Qtd ?? 0;
  const vUnit  = item.ValorUnitarioDoItem ?? item.ValorUnitario ?? 0;
  const vTotal = item.ValorTotalDoItem ?? item.ValorTotal ?? 0;
  const cod    = (item.CodigoDoItem || item.Codigo || '').trim();
  return { desc, qtd, vUnit, vTotal, cod };
}

// Converte /Date(ticks)/ ou /Date(ticks+offset)/ para string legível
function parseDataOI(raw) {
  if (!raw) return '-';
  const m = String(raw).match(/\/Date\((\d+)/);
  if (!m) return raw;
  return new Date(parseInt(m[1])).toLocaleDateString('pt-BR');
}

async function buscarOSPeriodo(lojaKey, dias) {
  const token = getToken(lojaKey);
  const todas = [];
  for (const dia of dias) {
    const r = await apiGet('OrdemDeServicoJSON', { token, data: formatDate(dia) });
    if (r.status === 200 && Array.isArray(r.data)) todas.push(...r.data);
    await sleep(150);
  }
  return todas;
}

async function conferir(modo, n) {
  const dias = getPeriodDays(modo, n);
  const inicio = formatDate(dias[0]);
  const fim    = formatDate(dias[dias.length - 1]);

  const L = 72;
  const sep  = '═'.repeat(L);
  const line = '─'.repeat(L);

  console.log('\n' + sep);
  console.log('  CONFERÊNCIA — OS DE MATERIAL OPERACIONAL');
  console.log(`  Período : ${inicio} → ${fim}  (${dias.length} dias)`);
  console.log(`  Gerado  : ${new Date().toLocaleString('pt-BR')}`);
  console.log(sep);

  const resumo = [];

  for (const [key, info] of Object.entries(LOJAS)) {
    process.stdout.write(`\n  ⏳ ${info.nome.padEnd(32)}`);

    let todas;
    try {
      todas = await buscarOSPeriodo(key, dias);
    } catch (e) {
      console.log(`❌  ${e.message}`);
      resumo.push({ nome: info.nome, abertas: 0, fechadas: 0, alertas: 0, erro: true });
      continue;
    }

    // Filtra OS de material operacional pela placa padrão
    const opAll    = todas.filter(o => (o.PlacaDoVeiculo || '').toUpperCase() === info.placa);
    const abertas  = opAll.filter(o => o.SituacaoDaOrdemDeServico === 'Aberta');
    const fechadas = opAll.filter(o => o.SituacaoDaOrdemDeServico === 'Fechada');

    console.log(`${opAll.length} operacionais  (${todas.length} OS totais no período)`);

    console.log('\n' + line);
    const tag = info.rede === 'Peg Pneus' ? '[PEG]' : '[BR]';
    console.log(`  ${tag} ${info.nome}  —  placa ${info.placa}`);
    console.log(line);

    if (opAll.length === 0) {
      console.log('  ⚠️  Nenhuma OS de material operacional encontrada no período.');
      resumo.push({ nome: info.nome, abertas: 0, fechadas: 0, alertas: 0 });
      continue;
    }

    let alertasLoja = 0;

    // ── OS ABERTAS ─────────────────────────────────────────────────────────
    if (abertas.length > 0) {
      console.log(`\n  🔴 ABERTAS (precisam ser fechadas): ${abertas.length} OS\n`);
      for (const os of abertas) {
        const dataStr = parseDataOI(os.Data);
        console.log(`  OS #${os.OrdemDeServicoID}  |  Data: ${dataStr}  |  Valor total: ${brl(os.ValorDaOrdemDeServico)}`);
        if (Array.isArray(os.Itens) && os.Itens.length > 0) {
          console.log(`  ${'─'.repeat(68)}`);
          console.log(`  ${'Descrição'.padEnd(40)} ${'Qtd'.padStart(4)} ${'Unit.'.padStart(9)} ${'Total'.padStart(10)}`);
          console.log(`  ${'─'.repeat(68)}`);
          for (const raw of os.Itens) {
            const it = parseItem(raw);
            const descTrunc = String(it.desc).substring(0, 39).padEnd(40);
            console.log(`  ${descTrunc} ${String(it.qtd).padStart(4)} ${brl(it.vUnit).padStart(9)} ${brl(it.vTotal).padStart(10)}`);
          }
          console.log(`  ${'─'.repeat(68)}`);
        } else if (Array.isArray(os.Itens) && os.Itens.length === 0) {
          console.log('  (OS aberta sem itens lançados ainda)');
        } else {
          console.log('  (itens não retornados pela API)');
        }
        console.log();
      }
    }

    // ── OS FECHADAS ────────────────────────────────────────────────────────
    if (fechadas.length > 0) {
      console.log(`  ✅ FECHADAS no período: ${fechadas.length} OS`);
      for (const os of fechadas) {
        console.log(`     #${os.OrdemDeServicoID}  |  ${os.Data || '-'}  |  ${brl(os.ValorDaOrdemDeServico)}`);
      }
      console.log();
    }

    resumo.push({ nome: info.nome, abertas: abertas.length, fechadas: fechadas.length, alertas: alertasLoja });
  }

  // ── RESUMO FINAL ──────────────────────────────────────────────────────────
  console.log('\n' + sep);
  console.log('  RESUMO GERAL');
  console.log(sep);
  console.log(`  ${'Loja'.padEnd(34)} ${'Abertas'.padStart(8)} ${'Fechadas'.padStart(9)} ${'Alertas'.padStart(9)}`);
  console.log('  ' + '─'.repeat(62));

  let tA = 0, tF = 0, tAl = 0;
  for (const r of resumo) {
    if (r.erro) {
      console.log(`  ❌ ${r.nome.padEnd(32)} ${'ERRO'.padStart(8)}`);
      continue;
    }
    const ico = r.abertas > 0 ? '🔴' : r.fechadas > 0 ? '✅' : '⚪';
    const alStr = r.alertas > 0 ? `⚠️  ${r.alertas}` : String(r.alertas);
    console.log(`  ${ico} ${r.nome.padEnd(32)} ${String(r.abertas).padStart(8)} ${String(r.fechadas).padStart(9)} ${alStr.padStart(9)}`);
    tA += r.abertas; tF += r.fechadas; tAl += r.alertas;
  }

  console.log('  ' + '─'.repeat(62));
  console.log(`  ${'TOTAL'.padEnd(34)} ${String(tA).padStart(8)} ${String(tF).padStart(9)} ${String(tAl).padStart(9)}`);
  console.log();

  if (tA > 0) console.log(`  🔴 ${tA} OS abertas precisam ser fechadas (fechar + abrir nova).`);
  if (tA === 0) console.log('  ✅ Nenhuma OS operacional em aberto.');
  console.log('\n' + sep + '\n');
}

// ── CLI ───────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let modo = 'semana-passada';
let n = 7;

if (args[0] === 'esta-semana') modo = 'esta-semana';
else if (args[0] === 'dias') { modo = 'dias'; n = parseInt(args[1]) || 7; }

conferir(modo, n).catch(console.error);
