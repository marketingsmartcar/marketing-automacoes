/**
 * Oficina Inteligente — cliente de API v2
 * Documentação: Manual de Integração via WebServices v2.1
 * Base URL: https://www.oiapi.com.br/ws/v2/IntegracaoOficinaInteligente.asmx/
 *
 * Uso: node tools/oficina-inteligente.js [comando] [loja] [data]
 *
 * Exemplos:
 *   node tools/oficina-inteligente.js testar todas
 *   node tools/oficina-inteligente.js os BR01_CENTRO 22/04/2026
 *   node tools/oficina-inteligente.js os BR01_CENTRO hoje
 *   node tools/oficina-inteligente.js produtos BR01_CENTRO
 *   node tools/oficina-inteligente.js os-periodo BR01_CENTRO 7    (últimos 7 dias)
 */

require('dotenv').config();
const https = require('https');

const BASE_URL = 'https://www.oiapi.com.br/ws/v2/IntegracaoOficinaInteligente.asmx';

const LOJAS = {
  BR01_CENTRO:      'BR Pneus Araraquara (Centro)',
  BR02_VILA:        'BR Pneus Araraquara (Vila)',
  BR03_AMERICANA:   'BR Pneus Americana',
  BR04_SAO_CARLOS:  'BR Pneus São Carlos',
  BR05_MARINGA:     'BR Pneus Maringá',
  PEG1_ARARAQUARA:  'Peg Pneus Araraquara',
  PEG2_SOROCABA:    'Peg Pneus Sorocaba',
};

// BR01 e BR03 só funcionam com o Token Alternativo
const TOKEN_ALT = new Set(['BR01_CENTRO', 'BR03_AMERICANA']);

function getToken(lojaKey) {
  const key = TOKEN_ALT.has(lojaKey) ? `OI_TOKEN_ALT_${lojaKey}` : `OI_TOKEN_${lojaKey}`;
  const token = process.env[key];
  if (!token) throw new Error(`Token não encontrado: ${key} — verifique o .env`);
  return token;
}

// Data no formato dd/MM/yyyy exigido pela API
function formatDate(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function parseDataArg(arg) {
  if (!arg || arg === 'hoje') return formatDate(new Date());
  return arg; // assume já está em dd/MM/yyyy
}

function apiGet(endpoint, params) {
  return new Promise((resolve, reject) => {
    const qs = new URLSearchParams(params).toString();
    const url = `${BASE_URL}/${endpoint}?${qs}`;
    https.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body), raw: body });
        } catch {
          resolve({ status: res.statusCode, data: null, raw: body });
        }
      });
    }).on('error', reject);
  });
}

// ── Ordens de Serviço ────────────────────────────────────────────────────────

async function buscarOS(lojaKey, data) {
  const token = getToken(lojaKey);
  const dataStr = parseDataArg(data);
  console.log(`\n[${LOJAS[lojaKey]}] OS do dia ${dataStr}`);
  const r = await apiGet('OrdemDeServicoJSON', { token, data: dataStr });
  if (r.status === 200 && Array.isArray(r.data)) {
    console.log(`✅ ${r.data.length} OS encontradas`);
    r.data.forEach(os => {
      console.log(`  #${os.OrdemDeServicoID} | ${os.SituacaoDaOrdemDeServico.padEnd(7)} | R$${os.ValorDaOrdemDeServico.toFixed(2).padStart(9)} | ${(os.NomeDoCliente || '-').substring(0,30)} | ${os.ModeloDoVeiculo || '-'} ${os.PlacaDoVeiculo || ''}`);
    });
  } else {
    console.log(`❌ HTTP ${r.status}:`, r.raw.substring(0, 200));
  }
  return r.data;
}

async function buscarOSPeriodo(lojaKey, dias = 7) {
  const resultados = [];
  const hoje = new Date();
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    const dataStr = formatDate(d);
    const token = getToken(lojaKey);
    const r = await apiGet('OrdemDeServicoJSON', { token, data: dataStr });
    if (r.status === 200 && Array.isArray(r.data) && r.data.length > 0) {
      resultados.push(...r.data);
      process.stdout.write(`${dataStr}: ${r.data.length} OS  `);
    } else {
      process.stdout.write(`${dataStr}: 0    `);
    }
    // Respeita o limite de 5 min entre chamadas em looping
    if (i > 0) await new Promise(r => setTimeout(r, 200));
  }
  console.log(`\n\nTotal: ${resultados.length} OS em ${dias} dias`);
  return resultados;
}

// ── Produtos ─────────────────────────────────────────────────────────────────

async function buscarProdutos(lojaKey, produtoID = '', somenteAtivo = '1') {
  const token = getToken(lojaKey);
  console.log(`\n[${LOJAS[lojaKey]}] Produtos (ativo=${somenteAtivo}${produtoID ? `, id=${produtoID}` : ''})`);
  const r = await apiGet('ProdutoJSON', { token, produtoID, somenteAtivo });
  if (r.status === 200 && Array.isArray(r.data)) {
    console.log(`✅ ${r.data.length} produto(s)`);
    r.data.slice(0, 20).forEach(p => {
      console.log(`  ${String(p.ProdutoID).trim().padEnd(12)} | ${p.DescricaoDoProduto.substring(0,35).padEnd(35)} | R$${Number(p.PrecoDeVenda).toFixed(2).padStart(9)} | Estoque: ${p.Estoque}`);
    });
    if (r.data.length > 20) console.log(`  ... e mais ${r.data.length - 20} produtos`);
  } else {
    console.log(`❌ HTTP ${r.status}:`, r.raw.substring(0, 200));
  }
  return r.data;
}

// ── Teste de conexão ─────────────────────────────────────────────────────────

async function testar(lojaKey) {
  const token = getToken(lojaKey);
  const hoje = formatDate(new Date());
  process.stdout.write(`${(LOJAS[lojaKey] || lojaKey).padEnd(35)} ... `);
  const r = await apiGet('OrdemDeServicoJSON', { token, data: hoje });
  if (r.status === 200 && Array.isArray(r.data)) {
    console.log(`✅ OK — ${r.data.length} OS hoje`);
  } else if (r.status === 200) {
    console.log(`⚠️  HTTP 200 mas resposta inesperada: ${r.raw.substring(0, 80)}`);
  } else {
    console.log(`❌ HTTP ${r.status}: ${r.raw.substring(0, 80)}`);
  }
}

async function testarTodas() {
  console.log('\n=== Testando conexão com todas as lojas ===\n');
  for (const lojaKey of Object.keys(LOJAS)) {
    const token = process.env[`OI_TOKEN_${lojaKey}`];
    if (!token) { console.log(`⚠️  ${(LOJAS[lojaKey]).padEnd(35)} ... sem token no .env`); continue; }
    await testar(lojaKey);
    await new Promise(r => setTimeout(r, 300));
  }
}

// ── Relatório resumido ───────────────────────────────────────────────────────

async function relatorio(lojaKey, dias = 30) {
  console.log(`\n=== Relatório ${LOJAS[lojaKey]} — últimos ${dias} dias ===\n`);
  const oss = await buscarOSPeriodo(lojaKey, dias);
  if (!oss.length) { console.log('Nenhuma OS encontrada.'); return; }

  const fechadas = oss.filter(o => o.SituacaoDaOrdemDeServico === 'Fechada');
  const abertas  = oss.filter(o => o.SituacaoDaOrdemDeServico === 'Aberta');
  const faturamento = fechadas.reduce((s, o) => s + Number(o.ValorDaOrdemDeServico), 0);
  const ticket = faturamento / (fechadas.length || 1);

  // Clientes únicos (por CPF ou nome)
  const clientes = new Set(oss.map(o => o.CPFCNPJ || o.NomeDoCliente));

  console.log(`\nOS Fechadas:    ${fechadas.length}`);
  console.log(`OS Abertas:     ${abertas.length}`);
  console.log(`Faturamento:    R$ ${faturamento.toFixed(2)}`);
  console.log(`Ticket Médio:   R$ ${ticket.toFixed(2)}`);
  console.log(`Clientes únicos: ${clientes.size}`);

  // Top 5 modelos
  const modelos = {};
  oss.forEach(o => { if (o.ModeloDoVeiculo) modelos[o.ModeloDoVeiculo] = (modelos[o.ModeloDoVeiculo] || 0) + 1; });
  const top = Object.entries(modelos).sort((a,b) => b[1]-a[1]).slice(0, 5);
  if (top.length) {
    console.log('\nTop veículos:');
    top.forEach(([m, n]) => console.log(`  ${m.padEnd(20)} ${n}x`));
  }
}

// ── CLI ──────────────────────────────────────────────────────────────────────
const [,, cmd, loja, extra] = process.argv;

(async () => {
  switch (cmd) {
    case 'testar':
      if (!loja || loja === 'todas') await testarTodas();
      else await testar(loja);
      break;
    case 'os':
      if (!loja) { console.error('Informe a loja.'); process.exit(1); }
      await buscarOS(loja, extra);
      break;
    case 'os-periodo':
      if (!loja) { console.error('Informe a loja.'); process.exit(1); }
      await buscarOSPeriodo(loja, parseInt(extra) || 7);
      break;
    case 'produtos':
      if (!loja) { console.error('Informe a loja.'); process.exit(1); }
      await buscarProdutos(loja);
      break;
    case 'relatorio':
      if (!loja) { console.error('Informe a loja.'); process.exit(1); }
      await relatorio(loja, parseInt(extra) || 30);
      break;
    default:
      console.log(`
Oficina Inteligente — Integração API v2
Base: https://www.oiapi.com.br/ws/v2/IntegracaoOficinaInteligente.asmx/

Comandos:
  testar [loja|todas]             — testa conexão com todas as lojas
  os <loja> [dd/MM/yyyy|hoje]     — OS de um dia específico
  os-periodo <loja> [dias]        — OS dos últimos N dias (padrão: 7)
  produtos <loja>                 — lista produtos ativos da loja
  relatorio <loja> [dias]         — resumo executivo (padrão: 30 dias)

Lojas disponíveis:
${Object.keys(LOJAS).map(k => `  ${k.padEnd(20)} — ${LOJAS[k]}`).join('\n')}

Exemplos:
  node tools/oficina-inteligente.js testar todas
  node tools/oficina-inteligente.js os BR01_CENTRO hoje
  node tools/oficina-inteligente.js os-periodo BR03_AMERICANA 7
  node tools/oficina-inteligente.js relatorio BR01_CENTRO 30
`);
  }
})();
