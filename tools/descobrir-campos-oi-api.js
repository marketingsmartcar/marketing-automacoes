'use strict';
/**
 * descobrir-campos-oi-api.js
 *
 * Faz uma chamada à API OrdemDeServicoJSON e exibe TODOS os campos
 * disponíveis no objeto OS e em cada item — para saber o que está
 * disponível para substituir o scraper Puppeteer por coleta via API.
 *
 * Uso:
 *   node tools/descobrir-campos-oi-api.js
 */

require('dotenv').config();
const https = require('https');

const BASE_URL = 'https://www.oiapi.com.br/ws/v2/IntegracaoOficinaInteligente.asmx';

// Usa BR01 CENTRO (alt token) como loja de teste
const TOKEN_KEY = 'OI_TOKEN_ALT_BR01_CENTRO';

function apiGet(endpoint, params) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}/${endpoint}?${new URLSearchParams(params)}`;
    https.get(url, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body), raw: body }); }
        catch { resolve({ status: res.statusCode, data: null, raw: body.slice(0, 500) }); }
      });
    }).on('error', reject);
  });
}

function formatDateOI(d) {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

async function main() {
  const token = process.env[TOKEN_KEY];
  if (!token) {
    console.error(`❌ Variável ${TOKEN_KEY} não encontrada no .env`);
    process.exit(1);
  }

  // Busca ontem BRT
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const dataOI = formatDateOI(d);

  console.log(`📡 Chamando OrdemDeServicoJSON para BR01 — data: ${dataOI}\n`);

  const r = await apiGet('OrdemDeServicoJSON', { token, data: dataOI });

  if (r.status !== 200 || !Array.isArray(r.data)) {
    console.error(`❌ Erro HTTP ${r.status}`);
    console.error(r.raw);
    process.exit(1);
  }

  const osList = r.data;
  console.log(`✅ Total de OS retornadas: ${osList.length}\n`);

  if (!osList.length) {
    console.log('⚠️  Nenhuma OS para ontem. Tente passar uma data com movimento:');
    console.log('   node tools/descobrir-campos-oi-api.js 2026-08-01');
    return;
  }

  // Exibe todos os campos do PRIMEIRO objeto OS
  const primeiraOS = osList[0];
  console.log('═══════════════════════════════════════════════════════');
  console.log('📋 CAMPOS DO OBJETO OS (primeiro da lista):');
  console.log('═══════════════════════════════════════════════════════');
  for (const [key, val] of Object.entries(primeiraOS)) {
    if (key === 'Itens') continue;
    console.log(`  ${key.padEnd(35)} = ${JSON.stringify(val)}`);
  }

  // Exibe campos de um item se existir
  const itens = primeiraOS.Itens || primeiraOS.itens || [];
  if (itens.length) {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📦 CAMPOS DE UM ITEM (primeiro item da primeira OS):');
    console.log('═══════════════════════════════════════════════════════');
    for (const [key, val] of Object.entries(itens[0])) {
      console.log(`  ${key.padEnd(35)} = ${JSON.stringify(val)}`);
    }
    console.log(`\n  Total de itens na OS: ${itens.length}`);
  }

  // Resumo de quantas OS têm cada campo preenchido (não null/vazio)
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`📊 COBERTURA DOS CAMPOS (${osList.length} OS):`)
  console.log('═══════════════════════════════════════════════════════');
  const campoCount = {};
  for (const os of osList) {
    for (const [key, val] of Object.entries(os)) {
      if (key === 'Itens') continue;
      if (val !== null && val !== '' && val !== undefined) {
        campoCount[key] = (campoCount[key] || 0) + 1;
      }
    }
  }
  for (const [key, count] of Object.entries(campoCount).sort((a, b) => b[1] - a[1])) {
    const pct = ((count / osList.length) * 100).toFixed(0);
    console.log(`  ${key.padEnd(35)} ${String(count).padStart(4)}/${osList.length}  (${pct}%)`);
  }

  // Mostra as primeiras 3 OS completas (sem Itens) para análise
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📄 PRIMEIRAS 3 OS (JSON sem Itens):');
  console.log('═══════════════════════════════════════════════════════');
  for (const os of osList.slice(0, 3)) {
    const { Itens, ...rest } = os;
    console.log(JSON.stringify(rest, null, 2));
    console.log('---');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
