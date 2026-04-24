/**
 * Inspeciona todos os campos retornados pela API OI em uma OS real.
 * Foca em: TipoDeAtendimento, Agendamento, TipoDeOS, e campos de custo.
 */
'use strict';
require('dotenv').config();
const https = require('https');

const BASE = 'https://www.oiapi.com.br/ws/v2/IntegracaoOficinaInteligente.asmx';

function apiGet(endpoint, params) {
  return new Promise((resolve, reject) => {
    const url = `${BASE}/${endpoint}?${new URLSearchParams(params)}`;
    https.get(url, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { resolve(null); }
      });
    }).on('error', reject);
  });
}

function formatDate(d) {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

async function main() {
  // BR01 Centro usa token alternativo
  const token = process.env.OI_TOKEN_ALT_BR01_CENTRO;
  if (!token) { console.error('Token não encontrado'); process.exit(1); }

  // Busca hoje
  const hoje = formatDate(new Date());
  console.log(`Buscando OS de ${hoje} na BR01 Centro...`);

  const os = await apiGet('OrdemDeServicoJSON', { token, data: hoje });

  if (!Array.isArray(os) || os.length === 0) {
    // Tenta ontem
    const ontem = new Date(); ontem.setDate(ontem.getDate() - 1);
    console.log(`Sem OS hoje, tentando ${formatDate(ontem)}...`);
    const os2 = await apiGet('OrdemDeServicoJSON', { token, data: formatDate(ontem) });
    if (!Array.isArray(os2) || os2.length === 0) {
      console.log('Sem OS encontradas.'); return;
    }
    inspect(os2);
  } else {
    inspect(os);
  }
}

function inspect(osList) {
  // Pega uma OS fechada real (não material operacional)
  const real = osList.find(o =>
    o.SituacaoDaOrdemDeServico === 'Fechada' &&
    !['BRP1102','BRP2202','BRP3302','BRP4402','BRP5502','BRP6602','BRP7702'].includes((o.PlacaDoVeiculo||'').toUpperCase())
  ) || osList[0];

  console.log('\n═══════════════════════════════════════════');
  console.log('TODOS OS CAMPOS DE UMA OS:');
  console.log('═══════════════════════════════════════════');

  // Campos de nível raiz (sem Itens)
  const campos = Object.entries(real).filter(([k]) => k !== 'Itens');
  campos.forEach(([k, v]) => {
    console.log(`  ${k.padEnd(35)} = ${JSON.stringify(v)}`);
  });

  // Campos de um item (se houver)
  if (Array.isArray(real.Itens) && real.Itens.length > 0) {
    console.log('\n── CAMPOS DE UM ITEM ───────────────────────');
    Object.entries(real.Itens[0]).forEach(([k, v]) => {
      console.log(`  ${k.padEnd(35)} = ${JSON.stringify(v)}`);
    });
  }

  console.log('\n── CAMPOS RELEVANTES PARA O RELATÓRIO ─────');
  const relevantes = [
    'TipoDeAtendimento','TipoDeOS','TipoDaOS','Agendamento','AgendamentoID',
    'Agendado','Modalidade','FormaDeEntrada','OrigemDaOS','TipoDeVenda',
    'ClienteTipo','TipoCliente','GrupoDeProduto',
    'ValorDaOrdemDeServico','ValorDeCusto','CustoTotal','LucroBruto',
    'Desconto','ValorDesconto'
  ];
  relevantes.forEach(k => {
    if (k in real) console.log(`  ✅ ${k} = ${JSON.stringify(real[k])}`);
    else console.log(`  ❌ ${k} — não encontrado`);
  });

  console.log(`\nTotal de OS na resposta: ${osList.length}`);
  console.log(`OS usada para inspeção: #${real.OrdemDeServicoID} (${real.SituacaoDaOrdemDeServico})`);
}

main().catch(console.error);
