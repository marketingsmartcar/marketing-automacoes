'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const { getProximosVideos } = require('./video-queue');
const { postarInstagramStory, postarFacebookStory } = require('./story-poster');

const CONTAS = [
  {
    key:       'br',
    nome:      'BR Pneus',
    instagram: { igUserId: process.env.META_IG_ID_BR,        pageToken: process.env.META_PAGE_TOKEN_BR,      maxSeg: 60 },
    facebook:  { pageId:   process.env.META_PAGE_ID_BR,      pageToken: process.env.META_PAGE_TOKEN_BR,      maxSeg: 30 },
  },
  {
    key:       'peg_araraquara',
    nome:      'Peg Pneus Araraquara',
    instagram: { igUserId: process.env.META_IG_ID_PEG_ARQ,   pageToken: process.env.META_PAGE_TOKEN_PEG_ARQ, maxSeg: 60 },
    facebook:  { pageId:   process.env.META_PAGE_ID_PEG_ARQ, pageToken: process.env.META_PAGE_TOKEN_PEG_ARQ, maxSeg: 30 },
  },
  {
    key:       'peg_sorocaba',
    nome:      'Peg Pneus Sorocaba',
    instagram: null,
    facebook:  { pageId:   process.env.META_PAGE_ID_PEG_SOR, pageToken: process.env.META_PAGE_TOKEN_PEG_SOR, maxSeg: 30 },
  },
];

async function testar() {
  console.log('\n🧪 TESTE — 1 vídeo por conta\n');

  for (const conta of CONTAS) {
    console.log(`\n📂 ${conta.nome}`);

    if (conta.instagram) {
      let postado = false;
      for (let tentativa = 0; tentativa < 3 && !postado; tentativa++) {
        const [video] = await getProximosVideos(conta.key, 1, conta.instagram.maxSeg);
        if (!video) { console.log('  ⚠️  [IG] Nenhum vídeo elegível'); break; }
        console.log(`  📹 [IG] Vídeo: ${require('path').basename(video)}`);
        try {
          await postarInstagramStory(conta.instagram.igUserId, conta.instagram.pageToken, video);
          postado = true;
        } catch (err) {
          console.error(`  ❌ [IG] ${err.message} — tentando próximo vídeo...`);
        }
      }
    }

    if (conta.facebook) {
      let postado = false;
      for (let tentativa = 0; tentativa < 3 && !postado; tentativa++) {
        const [video] = await getProximosVideos(conta.key, 1, conta.facebook.maxSeg);
        if (!video) { console.log('  ⚠️  [FB] Nenhum vídeo elegível'); break; }
        console.log(`  📹 [FB] Vídeo: ${require('path').basename(video)}`);
        try {
          await postarFacebookStory(conta.facebook.pageId, conta.facebook.pageToken, video);
          postado = true;
        } catch (err) {
          console.error(`  ❌ [FB] ${err.message} — tentando próximo vídeo...`);
        }
      }
    }
  }

  console.log('\n✅ Teste concluído.\n');
}

testar();
