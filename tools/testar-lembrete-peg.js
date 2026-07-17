'use strict';
/**
 * Teste pontual: envia o lembrete de recarga dos chips da Peg Pneus agora.
 * Uso: node tools/testar-lembrete-peg.js
 */
require('dotenv').config();

const { Client, LocalAuth } = require('whatsapp-web.js');

const GRUPO_ALERTAS_ID = process.env.WHATSAPP_GRUPO_AUTOMACAO_ID || '';

const FINANCEIRO_ID = '5516997465826@c.us'; // Financeiro SmartCar: (16) 99746-5826

const MENSAGEM =
  '🔔 *Lembrete mensal — Chips Peg Pneus*\n\n' +
  'Recarregar os chips da Peg Pneus:\n\n' +
  '📱 (16) 3187-0163\n' +
  '📱 (16) 99623-7396\n' +
  '📱 (16) 98172-3275';

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
  puppeteer: { headless: true, args: ['--no-sandbox'] },
});

client.on('ready', async () => {
  console.log('✅ Conectado. Enviando lembrete...');
  const destinos = GRUPO_ALERTAS_ID ? [GRUPO_ALERTAS_ID, FINANCEIRO_ID] : [FINANCEIRO_ID];

  for (const id of destinos) {
    try {
      await client.sendMessage(id, MENSAGEM);
      console.log(`  ✅ Enviado → ${id}`);
    } catch (err) {
      console.error(`  ❌ Falha → ${id}:`, err.message);
    }
  }

  console.log('✅ Lembrete enviado. Aguardando entrega...');
  await new Promise(r => setTimeout(r, 4000));
  await client.destroy();
  process.exit(0);
});

client.on('auth_failure', () => { console.error('❌ Falha de autenticação'); process.exit(1); });

console.log('🔄 Conectando ao WhatsApp (usando sessão salva)...');
client.initialize();
