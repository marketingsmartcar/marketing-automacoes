'use strict';
const http = require('http');
const fs   = require('fs');
const path = require('path');

const BOT_URL  = 'http://127.0.0.1:3099';
const GRUPO_ID = '120363429155837879@g.us';
const DEBUG_BI = path.resolve(__dirname, '../output/debug-bi');

const ARQUIVOS = [
  { file: 'BR1 Aniversariantes 19-09.xlsx', caption: '🎂 BR01 - Aniversariantes 19/09' },
  { file: 'BR1 3 Meses 19-09.xlsx',        caption: '🔄 BR01 - Reativação 3 Meses'    },
  { file: 'BR1 6 Meses 19-09.xlsx',        caption: '🔄 BR01 - Reativação 6 Meses'    },
  { file: 'BR1 9 Meses 19-09.xlsx',        caption: '🔄 BR01 - Reativação 9 Meses'    },
  { file: 'BR1 1 Ano 19-09.xlsx',          caption: '🔄 BR01 - Reativação 1 Ano'      },
  { file: 'BR3 Aniversariantes 19-09.xlsx', caption: '🎂 BR03 - Aniversariantes 19/09' },
  { file: 'BR3 3 Meses 19-09.xlsx',        caption: '🔄 BR03 - Reativação 3 Meses'    },
  { file: 'BR3 6 Meses 19-09.xlsx',        caption: '🔄 BR03 - Reativação 6 Meses'    },
  { file: 'BR3 9 Meses 19-09.xlsx',        caption: '🔄 BR03 - Reativação 9 Meses'    },
  { file: 'BR3 1 Ano 19-09.xlsx',          caption: '🔄 BR03 - Reativação 1 Ano'      },
  { file: 'BR4 Aniversariantes 19-09.xlsx', caption: '🎂 BR04 - Aniversariantes 19/09' },
  { file: 'BR4 3 Meses 19-09.xlsx',        caption: '🔄 BR04 - Reativação 3 Meses'    },
  { file: 'BR4 6 Meses 19-09.xlsx',        caption: '🔄 BR04 - Reativação 6 Meses'    },
  { file: 'BR4 9 Meses 19-09.xlsx',        caption: '🔄 BR04 - Reativação 9 Meses'    },
  { file: 'BR4 1 Ano 19-09.xlsx',          caption: '🔄 BR04 - Reativação 1 Ano'      },
  { file: 'PEG Aniversariantes 19-09.xlsx', caption: '🎂 PEG01 - Aniversariantes 19/09' },
  { file: 'PEG 3 Meses 19-09.xlsx',        caption: '🔄 PEG01 - Reativação 3 Meses'   },
  { file: 'PEG 6 Meses 19-09.xlsx',        caption: '🔄 PEG01 - Reativação 6 Meses'   },
  { file: 'PEG 9 Meses 19-09.xlsx',        caption: '🔄 PEG01 - Reativação 9 Meses'   },
  { file: 'PEG 1 Ano 19-09.xlsx',          caption: '🔄 PEG01 - Reativação 1 Ano'     },
];

const SLEEP = ms => new Promise(r => setTimeout(r, ms));

function botOnline() {
  return new Promise(resolve => {
    const req = http.get(`${BOT_URL}/status`, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve(JSON.parse(body).ok === true); }
        catch { resolve(false); }
      });
    });
    req.on('error', () => resolve(false));
    req.setTimeout(5000, () => { req.destroy(); resolve(false); });
  });
}

function enviarArquivo(filePath, nomeWA, caption) {
  return new Promise(resolve => {
    const data = fs.readFileSync(filePath).toString('base64');
    const body = JSON.stringify({
      chatId: GRUPO_ID,
      media: {
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        data,
        filename: nomeWA,
      },
      caption,
    });
    const req = http.request(`${BOT_URL}/send-media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let rb = '';
      res.on('data', d => rb += d);
      res.on('end', () => {
        try {
          const r = JSON.parse(rb);
          if (r.ok) resolve(true);
          else { console.log(`  ❌ Erro do bot: ${r.erro || JSON.stringify(r)}`); resolve(false); }
        } catch { resolve(res.statusCode < 400); }
      });
    });
    req.on('error', e => { console.log(`  ❌ Rede: ${e.message}`); resolve(false); });
    req.setTimeout(90000, () => { req.destroy(); resolve(false); });
    req.write(body);
    req.end();
  });
}

async function aguardarBot(maxTentativas = 20) {
  for (let i = 1; i <= maxTentativas; i++) {
    const online = await botOnline();
    if (online) return true;
    console.log(`  ⏳ Bot não pronto (${i}/${maxTentativas}) — aguardando 15s...`);
    await SLEEP(15000);
  }
  return false;
}

async function main() {
  console.log('\n📤 Reenvio BI Reativação OI — 19/09/2026\n');

  const online = await aguardarBot();
  if (!online) {
    console.log('❌ Bot não ficou online após 5 minutos. Abortando.');
    process.exit(1);
  }
  console.log('✅ Bot online\n');

  let enviados = 0;
  let falhas = 0;

  for (const { file, caption } of ARQUIVOS) {
    const filePath = path.join(DEBUG_BI, file);
    if (!fs.existsSync(filePath)) {
      console.log(`  ⏭️  Não existe em disco: ${file}`);
      continue;
    }

    console.log(`  📎 Enviando: ${file}`);
    let ok = false;
    for (let t = 1; t <= 3; t++) {
      ok = await enviarArquivo(filePath, file, caption);
      if (ok) break;
      if (t < 3) {
        console.log(`     🔁 Retry ${t+1}/3 em 10s...`);
        await SLEEP(10000);
      }
    }

    if (ok) {
      console.log(`  ✅ Enviado: ${file}`);
      enviados++;
      await SLEEP(3000); // pausa entre envios
    } else {
      console.log(`  ❌ Falhou: ${file}`);
      falhas++;
    }
  }

  console.log(`\n📊 Resultado: ${enviados} enviados, ${falhas} falhas\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
