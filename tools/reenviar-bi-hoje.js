'use strict';
/**
 * Reenvia os arquivos BI já gerados hoje para o grupo comercial.
 * Usa o estado salvo para saber o que já foi enviado e pula.
 * Aguarda o bot estar online antes de enviar.
 *
 * Uso: node tools/reenviar-bi-hoje.js
 */
require('dotenv').config();

const fs   = require('fs');
const http = require('http');
const path = require('path');

const BOT_URL  = 'http://127.0.0.1:3099';
const GRUPO_ID = '120363429155837879@g.us'; // COMERCIAL AGENDAMENTO
const DEBUG_DIR = path.join(__dirname, '..', 'output', 'debug-bi');

const brt = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric'
}).format(new Date());
const [dia, mes, ano] = brt.split('/');
const HOJE_LABEL = `${dia}-${mes}`; // ex: 08-08
const ESTADO_PATH = path.join(DEBUG_DIR, `estado-${ano}-${mes}-${dia}.json`);

function carregarEstado() {
  try { return JSON.parse(fs.readFileSync(ESTADO_PATH, 'utf8')); } catch { return {}; }
}

function post(endpoint, payload) {
  return new Promise((resolve) => {
    const body = JSON.stringify(payload);
    const req = http.request(`${BOT_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve({ ok: false }); }
      });
    });
    req.on('error', () => resolve({ ok: false }));
    req.write(body);
    req.end();
  });
}

function botOnline() {
  // Testa enviando texto vazio — se o bot responder (mesmo com erro de validação),
  // significa que está rodando e conectado. Erro de conexão = offline.
  return new Promise(resolve => {
    const body = JSON.stringify({ chatId: 'test', message: '' });
    const req = http.request(`${BOT_URL}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => { res.resume(); resolve(res.statusCode < 502); });
    req.on('error', () => resolve(false));
    req.write(body);
    req.end();
  });
}

async function aguardarBot(maxSeg = 300) {
  console.log('⏳ Aguardando bot ficar online...');
  const inicio = Date.now();
  while ((Date.now() - inicio) / 1000 < maxSeg) {
    const ok = await botOnline();
    if (ok) { console.log('✅ Bot online!\n'); return true; }
    process.stdout.write('.');
    await new Promise(r => setTimeout(r, 5000));
  }
  console.log('\n❌ Bot não ficou online em', maxSeg, 'segundos');
  return false;
}

async function enviarArquivo(filePath, nomeWA, caption) {
  const data = fs.readFileSync(filePath).toString('base64');
  const mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  for (let t = 1; t <= 3; t++) {
    const r = await post('/send-media', { chatId: GRUPO_ID, media: { mimetype, data, filename: nomeWA }, caption });
    if (r.ok) return true;
    if (t < 3) {
      console.log(`    ⏳ Tentativa ${t}/3 falhou, aguardando 20s...`);
      await new Promise(r => setTimeout(r, 20000));
    }
  }
  return false;
}

(async () => {
  console.log(`\n📤 Reenvio BI Comercial — ${HOJE_LABEL}`);

  const online = await aguardarBot();
  if (!online) process.exit(1);

  const estado = carregarEstado();

  // Mapeamento: arquivo em disco → { chaveEstado, caption }
  const LOJAS = [
    { sigla: 'BR1', key: 'BR01' },
    { sigla: 'BR3', key: 'BR03' },
    { sigla: 'BR4', key: 'BR04' },
    { sigla: 'PEG1', key: 'PEG1' },
  ];
  const PERIODOS = [
    { id: 'aniv', label: 'Aniversariantes' },
    { id: '3m',   label: '3 Meses' },
    { id: '6m',   label: '6 Meses' },
    { id: '9m',   label: '9 Meses' },
    { id: '1ano', label: '1 Ano' },
  ];

  let enviados = 0, pulados = 0, ausentes = 0, erros = 0;

  for (const loja of LOJAS) {
    for (const periodo of PERIODOS) {
      const chave = `${loja.key}_${periodo.id}`;

      if (estado[chave]) {
        console.log(`  ✅ ${loja.sigla} ${periodo.label} — já enviado, pulando`);
        pulados++;
        continue;
      }

      const nomeBase = `${loja.sigla} ${periodo.label} ${HOJE_LABEL}`;
      const filePath = path.join(DEBUG_DIR, `${nomeBase}.xlsx`);

      if (!fs.existsSync(filePath)) {
        console.log(`  ⚠️  ${nomeBase}.xlsx — não encontrado no disco`);
        ausentes++;
        continue;
      }

      const emoji = periodo.id === 'aniv' ? '🎂' : '🔄';
      const caption = `${emoji} ${loja.sigla} - ${periodo.label}`;
      console.log(`  📤 Enviando: ${nomeBase}.xlsx`);
      const ok = await enviarArquivo(filePath, `${nomeBase}.xlsx`, caption);
      if (ok) {
        estado[chave] = new Date().toISOString();
        fs.writeFileSync(ESTADO_PATH, JSON.stringify(estado, null, 2));
        console.log(`  ✅ Enviado`);
        enviados++;
      } else {
        console.log(`  ❌ Falhou após 3 tentativas`);
        erros++;
      }

      await new Promise(r => setTimeout(r, 3000)); // pausa entre envios
    }
  }

  console.log('\n' + '═'.repeat(50));
  console.log(`✅ Reenvio concluído!`);
  console.log(`   Enviados:  ${enviados}`);
  console.log(`   Já enviados (pulados): ${pulados}`);
  console.log(`   Ausentes no disco: ${ausentes}`);
  console.log(`   Erros: ${erros}`);
})();
