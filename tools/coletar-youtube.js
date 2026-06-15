'use strict';
/**
 * tools/coletar-youtube.js
 *
 * Coleta inscritos, vídeos e Shorts dos canais YouTube da BR Pneus e Peg Pneus
 * via Google YouTube Data API v3.
 * - Busca a playlist de uploads (todos os vídeos) E a playlist de Shorts separadamente
 * - Videos na playlist de Shorts recebem tipo 'SHORT'
 * - Salva snapshots em social_account_snapshots e vídeos em social_posts no Supabase
 *
 * Uso: node tools/coletar-youtube.js
 */

require('dotenv').config();

const YT_BASE  = 'https://www.googleapis.com/youtube/v3';
const YT_KEY   = process.env.YOUTUBE_API_KEY;
const SUPA_URL = process.env.NEXUSZ_SUPABASE_URL;
const SUPA_KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY;

const CONTAS = [
  { key: 'BR',  label: 'BR Pneus & Oficina',  handle: '@brpneusautomotivo'  },
  { key: 'PEG', label: 'Peg Pneus Atacarejo', handle: '@PegPneusAtacarejo'  },
];

function hoje() { return new Date().toISOString().slice(0, 10); }

async function ytFetch(url) {
  const res  = await fetch(url);
  const json = await res.json();
  if (json.error) throw new Error(`YouTube API: ${json.error.message} (${json.error.code})`);
  return json;
}

// Busca todos os itens de uma playlist (paginado)
async function fetchPlaylistItems(playlistId) {
  const items = [];
  let pageToken = null;
  do {
    const url = `${YT_BASE}/playlistItems?part=snippet&playlistId=${playlistId}` +
      `&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ''}&key=${YT_KEY}`;
    const page = await ytFetch(url);
    items.push(...(page.items ?? []));
    pageToken = page.nextPageToken ?? null;
  } while (pageToken);
  return items;
}

async function coletarCanal(conta) {
  // 1. Canal: stats + snippet + contentDetails
  const canalData = await ytFetch(
    `${YT_BASE}/channels?part=statistics,snippet,contentDetails` +
    `&forHandle=${encodeURIComponent(conta.handle)}&key=${YT_KEY}`
  );

  const canal = canalData.items?.[0];
  if (!canal) {
    console.log(`  ⚠️  ${conta.key} YT: canal não encontrado (${conta.handle})`);
    return null;
  }

  const inscritos   = parseInt(canal.statistics.subscriberCount ?? '0') || null;
  const totalVideos = parseInt(canal.statistics.videoCount      ?? '0') || null;
  const channelId   = canal.id;
  const nome        = canal.snippet?.title ?? conta.handle;
  const uploadsId   = canal.contentDetails?.relatedPlaylists?.uploads;
  const shortsId    = `UUSH${channelId.slice(2)}`; // Playlist de Shorts do canal

  console.log(`  ✅ ${conta.key} YT: ${nome} | ${inscritos?.toLocaleString('pt-BR')} inscritos | ${totalVideos} vídeos`);

  // 2. Busca uploads e Shorts em paralelo
  const [uploadsItems, shortsItems] = await Promise.all([
    uploadsId ? fetchPlaylistItems(uploadsId) : Promise.resolve([]),
    fetchPlaylistItems(shortsId).catch(() => []), // Shorts podem não existir
  ]);

  // Set de IDs que são Shorts
  const shortsSet = new Set(shortsItems.map(v => v.snippet?.resourceId?.videoId).filter(Boolean));

  // Merge: todos os uploads + Shorts que não estejam nos uploads (edge case)
  const uploadsIds  = new Set(uploadsItems.map(v => v.snippet?.resourceId?.videoId));
  const extrasShorts = shortsItems.filter(v => !uploadsIds.has(v.snippet?.resourceId?.videoId));
  const allItems = [...uploadsItems, ...extrasShorts];

  console.log(`    📹 ${uploadsItems.length} vídeos | 🩳 ${shortsSet.size} Shorts`);

  // 3. Stats dos vídeos em lotes de 50
  const videoIds = allItems.map(v => v.snippet.resourceId.videoId).filter(Boolean);
  const statsMap = {};
  for (let i = 0; i < videoIds.length; i += 50) {
    const ids  = videoIds.slice(i, i + 50).join(',');
    const data = await ytFetch(`${YT_BASE}/videos?part=statistics&id=${ids}&key=${YT_KEY}`);
    for (const v of (data.items ?? [])) statsMap[v.id] = v.statistics;
  }

  return { inscritos, totalVideos, channelId, nome, allItems, statsMap, shortsSet };
}

// ── Supabase ──────────────────────────────────────────────────────────────────

async function upsertSupabase(endpoint, rows, conflictKey) {
  if (!rows.length) return 0;
  const headers = {
    apikey:         SUPA_KEY,
    Authorization:  `Bearer ${SUPA_KEY}`,
    'Content-Type': 'application/json',
    Prefer:         'resolution=merge-duplicates',
  };
  const r = await fetch(`${SUPA_URL}/rest/v1/${endpoint}?on_conflict=${conflictKey}`,
    { method: 'POST', headers, body: JSON.stringify(rows) });
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    throw new Error(`Supabase ${endpoint} (${r.status}): ${body.slice(0, 200)}`);
  }
  return rows.length;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n📺 YouTube — coleta ${hoje()}\n`);

  if (!YT_KEY)   { console.error('❌ YOUTUBE_API_KEY não configurada'); process.exit(1); }
  if (!SUPA_URL) { console.error('❌ NEXUSZ_SUPABASE_URL não configurada'); process.exit(1); }

  const dataHoje   = hoje();
  const coletadoEm = new Date().toISOString();
  const snapshots  = [];
  const postRows   = [];

  const results = await Promise.allSettled(CONTAS.map(c => coletarCanal(c)));

  for (let i = 0; i < CONTAS.length; i++) {
    const conta = CONTAS[i];
    const res   = results[i];
    if (res.status === 'rejected') { console.warn(`  ❌ ${conta.key} YT: ${res.reason?.message}`); continue; }
    if (!res.value) continue;

    const { inscritos, totalVideos, nome, allItems, statsMap, shortsSet } = res.value;

    snapshots.push({
      conta_key:   conta.key,
      conta_label: conta.label,
      plataforma:  'youtube',
      data:        dataHoje,
      seguidores:  inscritos,
      seguindo:    null,
      posts_count: totalVideos,
      username:    nome,
      coletado_em: coletadoEm,
    });

    for (const item of allItems) {
      const vid     = item.snippet;
      const videoId = vid?.resourceId?.videoId;
      if (!videoId) continue;

      const stats    = statsMap[videoId] ?? {};
      const curtidas = parseInt(stats.likeCount    ?? '0') || 0;
      const coments  = parseInt(stats.commentCount ?? '0') || 0;
      const views    = parseInt(stats.viewCount    ?? '0') || 0;
      const isShort  = shortsSet.has(videoId);

      postRows.push({
        conta_key:         conta.key,
        conta_label:       conta.label,
        plataforma:        'youtube',
        post_id:           `yt_${videoId}`,
        data_post:         vid.publishedAt ?? null,
        tipo:              isShort ? 'SHORT' : 'VIDEO',
        caption:           (vid.title ?? '').slice(0, 1000),
        permalink:         `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail_url:     vid.thumbnails?.medium?.url ?? vid.thumbnails?.default?.url ?? null,
        curtidas,
        comentarios:       coments,
        compartilhamentos: views,
        engajamento:       curtidas + coments,
      });
    }
  }

  if (!snapshots.length) { console.log('⚠️  Nenhum dado coletado'); return; }

  await upsertSupabase('social_account_snapshots', snapshots, 'conta_key,plataforma,data');
  console.log(`  ✅ Snapshots: ${snapshots.length}`);

  if (postRows.length) {
    for (let i = 0; i < postRows.length; i += 50) {
      await upsertSupabase('social_posts', postRows.slice(i, i + 50), 'post_id');
    }
    const shorts = postRows.filter(p => p.tipo === 'SHORT').length;
    const videos = postRows.filter(p => p.tipo === 'VIDEO').length;
    console.log(`  ✅ Vídeos salvos: ${videos} vídeos + ${shorts} Shorts = ${postRows.length} total`);
  }

  console.log('\n✅ YouTube concluído\n');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
