'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const http = require('http');
const fs   = require('fs');
const path = require('path');

const GRUPO_ID = process.env.WHATSAPP_GRUPO_AUTOMACAO_ID;

async function main() {
  console.log('📊 Consultando Meta Ads...');
  const { monitorarTodas: monitorarMeta }   = require('./monitor-meta-ads');
  const { monitorarTodas: monitorarGoogle } = require('./monitor-google-ads');
  const { gerarDashboardPng } = require('./gerar-dashboard');

  const [mR, gR] = await Promise.allSettled([monitorarMeta(), monitorarGoogle()]);
  const metaRes   = mR.status === 'fulfilled' ? mR.value.resultados   : [];
  const googleRes = gR.status === 'fulfilled' ? gR.value.resultados   : [];

  console.log(`Meta: ${metaRes.length} contas | Google: ${googleRes.length} contas`);

  console.log('🖼  Gerando dashboard PNG...');
  const pngPath = await gerarDashboardPng();
  console.log('✅ PNG:', pngPath);

  const pngBase64 = fs.readFileSync(pngPath).toString('base64');

  // Monta caption igual ao disparar()
  const now = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  const caption = `📊 *Ads — ${now}* (teste manual)`;

  console.log(`📤 Enviando para grupo ${GRUPO_ID} via API interna (porta 3099)...`);

  const body = JSON.stringify({
    chatId: GRUPO_ID,
    media:  { mimetype: 'image/png', data: pngBase64, filename: 'dashboard.png' },
    caption,
  });

  await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1', port: 3099, path: '/send-media', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const json = JSON.parse(data);
        if (json.ok) { console.log('✅ Enviado com sucesso!'); resolve(); }
        else { reject(new Error(json.erro || 'Erro desconhecido')); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
