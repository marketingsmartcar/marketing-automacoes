'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const cron  = require('node-cron');
const { getVideoDurationInSeconds } = require('get-video-duration');
const { getProximosVideos, registrarPostagem, restituirVideo } = require('./video-queue');
const { postarInstagramStory, postarFacebookStory } = require('./story-poster');

const LOCK_FILE = path.join(__dirname, '..', '..', '.stories-running.lock');

// ─── Envia mensagem via bot WhatsApp (API interna porta 3099) ─────────────────
function enviarWhatsApp(mensagem) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ chatId: process.env.WHATSAPP_GRUPO_AUTOMACAO_ID, message: mensagem });
    const req = http.request({ hostname: '127.0.0.1', port: 3099, path: '/send', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      res.on('data', () => {});
      res.on('end', () => resolve());
    });
    req.on('error', (e) => {
      console.warn('⚠️  WhatsApp indisponível para notificação:', e.message);
      resolve();
    });
    req.write(body);
    req.end();
  });
}

// ─── Configuração das contas ──────────────────────────────────────────────────
// Preencha os IDs abaixo após rodar: node tools/stories/setup-stories.js

const CONTAS = [
  {
    key:        'br',
    nome:       'BR Pneus',
    instagram: {
      igUserId:  process.env.META_IG_ID_BR,
      pageToken: process.env.META_PAGE_TOKEN_BR,
    },
    facebook: {
      pageId:    process.env.META_PAGE_ID_BR,
      pageToken: process.env.META_PAGE_TOKEN_BR,
    },
  },
  {
    key:        'peg_araraquara',
    nome:       'Peg Pneus Araraquara',
    instagram: {
      igUserId:  process.env.META_IG_ID_PEG_ARQ,
      pageToken: process.env.META_PAGE_TOKEN_PEG_ARQ,
    },
    facebook: {
      pageId:    process.env.META_PAGE_ID_PEG_ARQ,
      pageToken: process.env.META_PAGE_TOKEN_PEG_ARQ,
    },
  },
  {
    key:          'peg_sorocaba',
    nome:         'Peg Pneus Sorocaba',
    videosPorDia: 1,
    instagram:    null,
    facebook: {
      pageId:    process.env.META_PAGE_ID_PEG_SOR,
      pageToken: process.env.META_PAGE_TOKEN_PEG_SOR,
    },
  },
];

const VIDEOS_POR_DIA = 3;
const MAX_SEG_POOL   = 60; // pool único: vídeos até 60s
const LIMIAR_FB_ONLY = 30; // ≤30s → apenas Facebook; >30s → IG + FB

// ─── Função principal de publicação ──────────────────────────────────────────
async function publicarStoriesDoDia() {
  // Impede execuções concorrentes — usa escrita atômica (flag 'wx') para evitar race condition
  try {
    fs.writeFileSync(LOCK_FILE, new Date().toISOString(), { flag: 'wx' });
  } catch (err) {
    if (err.code === 'EEXIST') {
      const ageMin = (Date.now() - fs.statSync(LOCK_FILE).mtimeMs) / 60000;
      if (ageMin < 30) {
        console.log(`⚠️  Já existe uma execução em andamento (lock há ${Math.round(ageMin)}min) — abortando.`);
        return;
      }
      // Lock velho (>30 min) — processo travou, remover e tentar novamente
      fs.unlinkSync(LOCK_FILE);
      fs.writeFileSync(LOCK_FILE, new Date().toISOString(), { flag: 'wx' });
    } else {
      throw err;
    }
  }

  const hora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  console.log(`\n🎬 [${hora}] Iniciando publicação de stories...`);

  const resumo = [];

  for (const conta of CONTAS) {
    console.log(`\n📂 ${conta.nome}`);
    const linhas = [`*${conta.nome}*`];

    const temIG = !!(conta.instagram?.igUserId && conta.instagram?.pageToken);
    const temFB = !!(conta.facebook?.pageId && conta.facebook?.pageToken);
    const meta  = conta.videosPorDia ?? VIDEOS_POR_DIA;

    let igPostados = 0;
    let fbPostados = 0;
    let igAuthFalhou = false;
    let fbAuthFalhou = false;
    let tentativasSemSucesso = 0;
    const MAX_TENTATIVAS = (conta.videosPorDia ?? VIDEOS_POR_DIA) * 4;

    while (
      (temIG && igPostados < meta && !igAuthFalhou) ||
      (temFB && fbPostados < meta && !fbAuthFalhou)
    ) {
      if (++tentativasSemSucesso > MAX_TENTATIVAS) {
        console.log(`  ⚠️  Muitas tentativas sem sucesso — abortando conta.`);
        break;
      }

      const [video] = await getProximosVideos(conta.key, 1, MAX_SEG_POOL);
      if (!video) {
        console.log(`  ⚠️  Sem mais vídeos elegíveis`);
        break;
      }

      let duracao = MAX_SEG_POOL;
      try {
        duracao = await getVideoDurationInSeconds(video);
      } catch {
        // não conseguiu ler duração — assume máximo para não bloquear
      }

      const soFacebook = duracao <= LIMIAR_FB_ONLY;
      const nomeArq    = require('path').basename(video);
      console.log(`  🎞  ${nomeArq} (${Math.round(duracao)}s) → ${soFacebook ? 'FB apenas' : 'IG + FB'}`);

      // Se nenhuma plataforma usaria este vídeo, devolve à fila e encerra
      const igUsaria = temIG && !soFacebook && igPostados < meta && !igAuthFalhou;
      const fbUsaria = temFB && fbPostados < meta && !fbAuthFalhou;
      if (!igUsaria && !fbUsaria) {
        restituirVideo(conta.key, MAX_SEG_POOL, video);
        console.log(`  ↩️  Vídeo devolvido à fila (nenhuma plataforma precisa dele agora).`);
        break;
      }

      let algoPostado = false;

      // ── Instagram (apenas vídeos >30s)
      if (igUsaria) {
        try {
          await postarInstagramStory(conta.instagram.igUserId, conta.instagram.pageToken, video);
          igPostados++;
          algoPostado = true;
        } catch (err) {
          const isAuth = err.message?.includes('190') || err.message?.includes('expired') || err.message?.includes('OAuthException');
          if (isAuth) { igAuthFalhou = true; console.error(`  ❌ [IG] Token expirado — pulando IG para esta conta.`); }
          else console.error(`  ❌ [IG] ${err.message} — pulando vídeo no IG...`);
        }
      }

      // ── Facebook
      if (fbUsaria) {
        try {
          await postarFacebookStory(conta.facebook.pageId, conta.facebook.pageToken, video);
          fbPostados++;
          algoPostado = true;
        } catch (err) {
          const isAuth = err.message?.includes('190') || err.message?.includes('expired') || err.message?.includes('OAuthException');
          if (isAuth) { fbAuthFalhou = true; console.error(`  ❌ [FB] Token expirado — pulando FB para esta conta.`); }
          else console.error(`  ❌ [FB] ${err.message} — pulando vídeo no FB...`);
        }
      }

      if (algoPostado) {
        registrarPostagem(video);
        tentativasSemSucesso = 0;
      }
    }

    if (igAuthFalhou || fbAuthFalhou) {
      const plats = [igAuthFalhou && 'IG', fbAuthFalhou && 'FB'].filter(Boolean).join(' e ');
      linhas.push(`  ⚠️ Token expirado (${plats}) — rode: node tools/renovar-tokens-paginas.js`);
    }

    if (igPostados > 0) linhas.push(`  📸 Instagram: ${igPostados} storie(s)`);
    if (fbPostados > 0) linhas.push(`  📘 Facebook: ${fbPostados} storie(s)`);
    if (linhas.length > 1) resumo.push(linhas.join('\n'));
  }

  console.log(`\n✅ Stories do dia concluídos.`);

  // ── Notificação WhatsApp
  if (resumo.length > 0 && process.env.WHATSAPP_GRUPO_AUTOMACAO_ID) {
    const dataHoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const msg = `🎬 *Stories publicados — ${dataHoje}*\n\n${resumo.join('\n\n')}`;
    await enviarWhatsApp(msg);
    console.log('📲 Notificação enviada ao grupo.');
  }

  // Remove lock ao finalizar
  if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
}

// ─── Cron: todo dia às 8h ─────────────────────────────────────────────────────
if (require.main === module) {
  // Verificar se todas as variáveis de ambiente estão preenchidas
  const varsFaltando = [
    'META_PAGE_TOKEN_BR', 'META_PAGE_ID_BR', 'META_IG_ID_BR',
    'META_PAGE_TOKEN_PEG_ARQ', 'META_PAGE_ID_PEG_ARQ', 'META_IG_ID_PEG_ARQ',
    'META_PAGE_TOKEN_PEG_SOR', 'META_PAGE_ID_PEG_SOR',
  ].filter(v => !process.env[v]);

  if (varsFaltando.length > 0) {
    console.error('❌ Variáveis de ambiente faltando no .env:');
    varsFaltando.forEach(v => console.error(`   - ${v}`));
    console.error('\nRode primeiro: node tools/stories/setup-stories.js');
    process.exit(1);
  }

  console.log('🟢 Story Scheduler iniciado. Agendado para 08:00 todos os dias.');

  // Agenda diário às 8h (horário de São Paulo)
  cron.schedule('0 8 * * *', publicarStoriesDoDia, {
    timezone: 'America/Sao_Paulo',
  });

  // Permite rodar manualmente: node story-scheduler.js --agora
  if (process.argv.includes('--agora')) {
    publicarStoriesDoDia();
  }
}

module.exports = { publicarStoriesDoDia };
