'use strict';
/**
 * Verifica se a API OrdemDeServicoJSON retorna executor por item
 * e lista todos os campos disponíveis nos itens.
 *
 * Uso: node tools/debug-oi-executor.js
 */
require('dotenv').config();
const https = require('https');

const BASE_URL = 'https://www.oiapi.com.br/ws/v2/IntegracaoOficinaInteligente.asmx';

const LOJAS = [
  { key: 'BR01', empresaId: 469,  tokenEnv: 'OI_TOKEN_ALT_BR01_CENTRO' },
];

function todayBRT() {
  return new Intl.DateTimeFormat('sv', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}
function formatDateOI(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function apiGet(endpoint, params) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}/${endpoint}?${new URLSearchParams(params)}`;
    https.get(url, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, data: null, raw: body.slice(0, 300) }); }
      });
    }).on('error', reject);
  });
}

(async () => {
  const loja = LOJAS[0];
  const token = process.env[loja.tokenEnv];
  if (!token) { console.error('Token não encontrado:', loja.tokenEnv); process.exit(1); }

  const data = formatDateOI(todayBRT());
  console.log(`Consultando OrdemDeServicoJSON — ${loja.key} — ${data}`);

  const r = await apiGet('OrdemDeServicoJSON', { token, data });
  if (!Array.isArray(r.data)) {
    console.error('Resposta inválida:', r.status, r.raw);
    process.exit(1);
  }

  const osLoja = r.data.filter(os => String(os.EmpresaID) === String(loja.empresaId));
  console.log(`\n${osLoja.length} OS encontradas para ${loja.key}\n`);

  // Mostra todos os campos do 1º item da 1ª OS com itens
  for (const os of osLoja) {
    const itens = os.Itens || [];
    if (!itens.length) continue;

    console.log(`=== OS ${os.OrdemDeServicoID} — ${itens.length} itens ===`);
    console.log('Campos disponíveis na OS:', Object.keys(os).join(', '));
    console.log('\nCampos disponíveis no 1º item:');
    const item = itens[0];
    for (const [k, v] of Object.entries(item)) {
      console.log(`  ${k}: ${JSON.stringify(v)}`);
    }

    // Verifica se algum item tem campo parecido com Executor
    const executorFields = Object.keys(item).filter(k =>
      /execut|responsavel|funcionario|tecnico|mecanico/i.test(k)
    );
    console.log('\nCampos relacionados a executor:', executorFields.length ? executorFields : 'NENHUM');

    // Mostra primeiro item de cada OS para ver padrão
    console.log('\nPrimeiros 3 itens:');
    itens.slice(0, 3).forEach((it, i) => {
      console.log(`  [${i}]`, JSON.stringify(it));
    });
    break;
  }
})();
