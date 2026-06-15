'use strict';
/**
 * tools/coletar-social-video.js
 *
 * Coleta seguidores e lista de vídeos do TikTok via Apify
 * para BR Pneus & Oficina e Peg Pneus Atacarejo.
 * Salva snapshots em social_account_snapshots e vídeos em social_posts no Supabase.
 *
 * Roda 1x/dia via GitHub Actions (social-video.yml).
 * NÃO é acionado pelo botão "Atualizar agora" — preserva os créditos Apify.
 *
 * Uso:
 *   node tools/coletar-social-video.js
 */

require('dotenv').config();

const SUPABASE_URL = process.env.NEXUSZ_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY;
const APIFY_TOKEN  = process.env.APIFY_TOKEN;

const CONTAS = [
  { key: 'BR',  label: 'BR Pneus & Oficina',  tkUsername: 'redebr_pneus'       },
  { key: 'PEG', label: 'Peg Pneus Atacarejo', tkUsername: 'pegpneus_atacarejo'  },
];

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

// ── TikTok via Apify ──────────────────────────────────────────────────────────

async function coletarTikTok(usernames) {
  if (!APIFY_TOKEN) {
    console.log('  ⚠️  APIFY_TOKEN não configurado — pulado');
    return { perfis: {}, videos: [] };
  }

  console.log(`  🔄 Iniciando coleta via Apify (${usernames.join(', ')})...`);

  const url = `https://api.apify.com/v2/acts/clockworks~tiktok-profile-scraper/run-sync-get-dataset-items` +
              `?token=${APIFY_TOKEN}&timeout=120&memory=512`;

  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ profiles: usernames }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Apify error (${res.status}): ${body.slice(0, 300)}`);
  }

  const items   = await res.json();
  const perfis  = {};  // username → { fans, videos, name }
  const postRows = [];

  for (const item of (Array.isArray(items) ? items : [])) {
    const meta     = item.authorMeta ?? item;
    const username = (meta.name ?? meta.uniqueId ?? '').toLowerCase().replace(/^@/, '');
    if (!username) continue;

    // Perfil (só registra uma vez por username)
    if (!perfis[username]) {
      const fans   = meta.fans    ?? meta.followerCount ?? null;
      const videos = meta.video   ?? meta.videoCount    ?? null;
      const name   = meta.nickName ?? meta.nickname ?? username;
      perfis[username] = { fans, videos, name };
      console.log(`  ✅ @${username}: ${fans?.toLocaleString('pt-BR')} seguidores | ${videos} vídeos`);
    }

    // Vídeo individual
    const videoId = item.id ?? item.videoId ?? null;
    if (videoId) {
      const curtidas    = item.diggCount     ?? item.likeCount    ?? 0;
      const comentarios = item.commentCount  ?? 0;
      const compartilhs = item.shareCount    ?? 0;
      const views       = item.playCount     ?? item.viewCount    ?? 0;
      const caption     = (item.text ?? item.desc ?? '').slice(0, 1000);
      const thumbnail   = item.videoMeta?.coverUrl ?? item.covers?.[0] ?? item.cover ?? null;
      const permalink   = item.webVideoUrl ?? `https://www.tiktok.com/@${username}/video/${videoId}`;
      const createTime  = item.createTimeISO ?? (item.createTime ? new Date(item.createTime * 1000).toISOString() : null);

      postRows.push({ username, videoId, curtidas, comentarios, compartilhs, views, caption, thumbnail, permalink, createTime });
    }
  }

  return { perfis, postRows };
}

// ── Supabase ──────────────────────────────────────────────────────────────────

async function upsertSupabase(endpoint, rows, conflictKey) {
  if (!rows.length) return;
  const headers = {
    apikey:         SUPABASE_KEY,
    Authorization:  `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer:         'resolution=merge-duplicates',
  };
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}?on_conflict=${conflictKey}`,
    { method: 'POST', headers, body: JSON.stringify(rows) });
  if (!r.ok) throw new Error(`Supabase ${endpoint} error (${r.status}): ${await r.text().catch(() => '')}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🎵 TikTok — coleta ${hoje()}\n`);

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ NEXUSZ_SUPABASE_URL / NEXUSZ_SUPABASE_SERVICE_ROLE_KEY não configurados');
    process.exit(1);
  }

  const dataHoje   = hoje();
  const coletadoEm = new Date().toISOString();
  const snapshots  = [];
  const postRows   = [];

  try {
    const { perfis, postRows: tkPosts } = await coletarTikTok(CONTAS.map(c => c.tkUsername));

    for (const conta of CONTAS) {
      const tk = perfis[conta.tkUsername.toLowerCase()];
      if (!tk) { console.warn(`  ⚠️  ${conta.key}: perfil não encontrado`); continue; }

      snapshots.push({
        conta_key:   conta.key,
        conta_label: conta.label,
        plataforma:  'tiktok',
        data:        dataHoje,
        seguidores:  tk.fans,
        seguindo:    null,
        posts_count: tk.videos,
        username:    tk.name,
        coletado_em: coletadoEm,
      });

      // Vídeos desta conta
      for (const v of tkPosts.filter(p => p.username === conta.tkUsername.toLowerCase())) {
        postRows.push({
          conta_key:         conta.key,
          conta_label:       conta.label,
          plataforma:        'tiktok',
          post_id:           `tk_${v.videoId}`,
          data_post:         v.createTime,
          tipo:              'VIDEO',
          caption:           v.caption,
          permalink:         v.permalink,
          thumbnail_url:     v.thumbnail,
          curtidas:          v.curtidas,
          comentarios:       v.comentarios,
          compartilhamentos: v.compartilhs,
          engajamento:       v.curtidas + v.comentarios + v.compartilhs,
        });
      }
    }
  } catch (err) {
    console.error(`  ❌ TikTok: ${err.message}`);
    process.exit(1);
  }

  if (!snapshots.length) { console.log('⚠️  Nenhum dado coletado'); return; }

  await upsertSupabase('social_account_snapshots', snapshots, 'conta_key,plataforma,data');
  console.log(`  ✅ Snapshots: ${snapshots.length}`);

  if (postRows.length) {
    for (let i = 0; i < postRows.length; i += 50) {
      await upsertSupabase('social_posts', postRows.slice(i, i + 50), 'post_id');
    }
    console.log(`  ✅ Vídeos TikTok: ${postRows.length}`);
  }

  console.log('\n✅ TikTok concluído\n');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
