'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const http   = require('http');
const fs     = require('fs');
const axios  = require('axios');
const { getVideoDurationInSeconds } = require('get-video-duration');
const { getProximosVideos, registrarPostagem, restituirVideo } = require('./video-queue');
const { postarInstagramStory, postarFacebookStory } = require('./story-poster');

const BASE_GRAPH  = 'https://graph.facebook.com/v19.0';
const MAX_SEG_POOL = 60;
const LIMIAR_FB_ONLY = 30;

// ─── Config do que falta postar ──────────────────────────────────────────────
// Ajuste se a situação mudar
const IG_FALTANDO = 2;  // BR Pneus IG: precisa de 2 a mais
const FB_FALTANDO = 1;  // BR Pneus FB: precisa de 1 a mais

const TOKEN = process.env.META_PAGE_TOKEN_BR;
const IG_ID = process.env.META_IG_ID_BR;
const PAGE_ID = process.env.META_PAGE_ID_BR;

const DELAY_RETRY_MS = 20 * 60 * 1000; // 20 min entre tentativas
const MAX_TENTATIVAS = 9;               // até ~3h no total

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Resolver page access token ───────────────────────────────────────────────
const _tokenCache = {};
async function resolverPageToken(pageId, token) {
  const key = `${pageId}:${token.slice(-8)}`;
  if (_tokenCache[key]) return _tokenCache[key];
  try {
    const { data } = await axios.get(`${BASE_GRAPH}/${pageId}`, {
      params: { fields: 'access_token', access_token: token },
    });
    if (data.access_token) { _tokenCache[key] = data.access_token; return data.access_token; }
  } catch {}
  return token;
}

// ─── Contar stories IG ativos ─────────────────────────────────────────────────
async function contarStoriesIG() {
  try {
    const { data } = await axios.get(`${BASE_GRAPH}/${IG_ID}/stories`, {
      params: { access_token: TOKEN },
    });
    return (data.data || []).length;
  } catch { return 0; }
}

// ─── WhatsApp ─────────────────────────────────────────────────────────────────
function enviarWhatsApp(mensagem) {
  return new Promise(resolve => {
    const body = JSON.stringify({ chatId: process.env.WHATSAPP_GRUPO_AUTOMACAO_ID, message: mensagem });
    const req = http.request(
      { hostname: '127.0.0.1', port: 3099, path: '/send', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      res => { res.on('data', () => {}); res.on('end', resolve); }
    );
    req.on('error', () => resolve());
    req.write(body); req.end();
  });
}

// ─── Tentativa de postagem ────────────────────────────────────────────────────
async function tentarPostar(igRestante, fbRestante) {
  let igPostados = 0;
  let fbPostados = 0;
  let rateLimit  = false;
  const MAX_POOL = (igRestante + fbRestante) * 5;

  const pageToken = await resolverPageToken(PAGE_ID, TOKEN);

  for (let i = 0; i < MAX_POOL && (igPostados < igRestante || fbPostados < fbRestante); i++) {
    const [video] = await getProximosVideos('br', 1, MAX_SEG_POOL);
    if (!video) { console.log('  ⚠️  Sem mais vídeos elegíveis.'); break; }

    let duracao = MAX_SEG_POOL;
    try { duracao = await getVideoDurationInSeconds(video); } catch {}

    const soFacebook = duracao <= LIMIAR_FB_ONLY;
    const nomeArq    = require('path').basename(video);
    console.log(`  🎞  ${nomeArq} (${Math.round(duracao)}s) → ${soFacebook ? 'FB apenas' : 'IG + FB'}`);

    const igUsaria = !soFacebook && igPostados < igRestante;
    const fbUsaria = fbPostados < fbRestante;

    if (!igUsaria && !fbUsaria) {
      restituirVideo('br', MAX_SEG_POOL, video);
      continue;
    }

    let algoPostado = false;

    if (igUsaria) {
      try {
        await postarInstagramStory(IG_ID, TOKEN, video);
        igPostados++;
        algoPostado = true;
        console.log(`  ✅ [IG] ${igPostados}/${igRestante}`);
      } catch (err) {
        const is403 = err.message?.includes('403') || err.response?.status === 403;
        if (is403) { rateLimit = true; console.log(`  ⏱  [IG] Rate limit (403).`); }
        else console.warn(`  ❌ [IG] ${err.message}`);
      }
    }

    if (fbUsaria) {
      try {
        await postarFacebookStory(PAGE_ID, pageToken, video);
        fbPostados++;
        algoPostado = true;
        console.log(`  ✅ [FB] ${fbPostados}/${fbRestante}`);
      } catch (err) {
        const is403 = err.message?.includes('403') || err.response?.status === 403;
        if (is403) { rateLimit = true; console.log(`  ⏱  [FB] Rate limit (403).`); }
        else console.warn(`  ❌ [FB] ${err.message}`);
      }
    }

    if (algoPostado) registrarPostagem(video);
    if (rateLimit) break;
  }

  return { igPostados, fbPostados, rateLimit };
}

// ─── Main com retry ───────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  COMPLETAR STORIES BR PNEUS (com retry)');
  console.log('═══════════════════════════════════════════════');

  // Verificar contagem IG atual antes de começar
  const igAtual = await contarStoriesIG();
  console.log(`📊 IG atual: ${igAtual} stories`);

  let igRestante = Math.max(0, 3 - igAtual);
  let fbRestante = FB_FALTANDO;

  console.log(`🎯 Faltando: ${igRestante} IG + ${fbRestante} FB`);

  if (igRestante === 0 && fbRestante === 0) {
    console.log('✅ Já temos 3 IG e 3 FB — nada a fazer.');
    await enviarWhatsApp('✅ *BR Pneus — stories completos!*\n3 IG + 3 FB publicados.');
    return;
  }

  let igTotal = 0;
  let fbTotal = 0;

  for (let t = 1; t <= MAX_TENTATIVAS; t++) {
    const hora = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    console.log(`\n🔄 Tentativa ${t}/${MAX_TENTATIVAS} — ${hora}`);

    const { igPostados, fbPostados, rateLimit } = await tentarPostar(
      igRestante - igTotal,
      fbRestante - fbTotal,
    );

    igTotal += igPostados;
    fbTotal += fbPostados;

    console.log(`  📈 Progresso: ${igTotal}/${igRestante} IG, ${fbTotal}/${fbRestante} FB`);

    if (igTotal >= igRestante && fbTotal >= fbRestante) {
      console.log('\n✅ Todos os stories postados!');
      const igFinal = await contarStoriesIG();
      await enviarWhatsApp(
        `✅ *BR Pneus — stories completos!*\n` +
        `📸 Instagram: ${igFinal} stories ativos\n` +
        `📘 Facebook: 3 stories\n\n` +
        `_Confira nas páginas._`
      );
      break;
    }

    if (t < MAX_TENTATIVAS) {
      const mins = DELAY_RETRY_MS / 60000;
      console.log(`  ⏳ Aguardando ${mins}min antes da próxima tentativa...`);
      await sleep(DELAY_RETRY_MS);
    } else {
      console.log('\n⚠️  Esgotou as tentativas.');
      await enviarWhatsApp(
        `⚠️ *BR Pneus — stories incompletos*\n` +
        `Postou: ${igTotal}/${igRestante} IG, ${fbTotal}/${fbRestante} FB\n` +
        `Rate limit do Meta. Tente novamente amanhã ou via _node tools/stories/deletar-e-repostar.js_`
      );
    }
  }
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
