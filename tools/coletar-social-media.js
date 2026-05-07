'use strict';
/**
 * tools/coletar-social-media.js
 *
 * Coleta métricas de Instagram e Facebook (Graph API v21.0) para todas as contas
 * e sincroniza com as tabelas social_account_snapshots e social_posts no Supabase.
 *
 * Uso:
 *   node tools/coletar-social-media.js
 */

require('dotenv').config();

const GRAPH = 'https://graph.facebook.com/v21.0';

const CONTAS = [
  {
    key:        'BR',
    label:      'BR Pneus & Oficina',
    marca:      'br',
    ig_id:      process.env.META_IG_ID_BR,
    ig_token:   process.env.META_ACCESS_TOKEN_BR,
    fb_page_id: process.env.META_PAGE_ID_BR,
    fb_token:   process.env.META_PAGE_TOKEN_BR,
  },
  {
    key:        'PEG_ARQ',
    label:      'Peg Pneus Araraquara',
    marca:      'peg',
    ig_id:      process.env.META_IG_ID_PEG_ARQ,
    ig_token:   process.env.META_ACCESS_TOKEN_PEG,
    fb_page_id: process.env.META_PAGE_ID_PEG_ARQ,
    fb_token:   process.env.META_PAGE_TOKEN_PEG_ARQ,
  },
  {
    key:        'PEG_SOR',
    label:      'Peg Pneus Sorocaba',
    marca:      'peg',
    ig_id:      process.env.META_IG_ID_PEG_SOR || null,
    ig_token:   process.env.META_ACCESS_TOKEN_PEG,
    fb_page_id: process.env.META_PAGE_ID_PEG_SOR,
    fb_token:   process.env.META_PAGE_TOKEN_PEG_SOR,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function apiFetch(url) {
  const res = await fetch(url);
  const json = await res.json();
  if (json.error) throw new Error(`Graph API: ${json.error.message} (code ${json.error.code})`);
  return json;
}

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

// ── Instagram ─────────────────────────────────────────────────────────────────

async function coletarInstagram(conta) {
  if (!conta.ig_id || !conta.ig_token) {
    console.log(`  ⚠️  ${conta.key} IG: sem ig_id ou token — pulado`);
    return null;
  }

  // Perfil
  const perfil = await apiFetch(
    `${GRAPH}/${conta.ig_id}` +
    `?fields=username,followers_count,follows_count,media_count,profile_picture_url` +
    `&access_token=${conta.ig_token}`
  );

  // Posts (até 100 mais recentes)
  let posts = [];
  let url = `${GRAPH}/${conta.ig_id}/media` +
    `?fields=id,caption,media_type,timestamp,like_count,comments_count,media_url,thumbnail_url,permalink` +
    `&limit=100&access_token=${conta.ig_token}`;

  while (url && posts.length < 200) {
    const data = await apiFetch(url);
    posts = posts.concat(data.data || []);
    url = data.paging?.next || null;
  }

  console.log(`  ✅ ${conta.key} IG: @${perfil.username} | ${perfil.followers_count} seguidores | ${posts.length} posts`);
  return { perfil, posts };
}

// ── Facebook ──────────────────────────────────────────────────────────────────

async function coletarFacebook(conta) {
  if (!conta.fb_page_id || !conta.fb_token) {
    console.log(`  ⚠️  ${conta.key} FB: sem page_id ou token — pulado`);
    return null;
  }

  // Página
  const pagina = await apiFetch(
    `${GRAPH}/${conta.fb_page_id}` +
    `?fields=name,fan_count,followers_count,picture` +
    `&access_token=${conta.fb_token}`
  );

  // Posts (até 100 mais recentes)
  let posts = [];
  let url = `${GRAPH}/${conta.fb_page_id}/posts` +
    `?fields=id,message,full_picture,created_time,attachments{media_type},` +
    `reactions.summary(true),comments.summary(true),shares` +
    `&limit=100&access_token=${conta.fb_token}`;

  while (url && posts.length < 200) {
    const data = await apiFetch(url);
    posts = posts.concat(data.data || []);
    url = data.paging?.next || null;
  }

  console.log(`  ✅ ${conta.key} FB: ${pagina.name} | ${pagina.fan_count ?? pagina.followers_count} seguidores | ${posts.length} posts`);
  return { pagina, posts };
}

// ── Supabase sync ─────────────────────────────────────────────────────────────

async function syncSupabase(conta, igData, fbData) {
  const supaUrl = process.env.NEXUSZ_SUPABASE_URL;
  const supaKey = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXUSZ_SUPABASE_ANON_KEY;
  if (!supaUrl || !supaKey) {
    console.log('  ⚠️  Supabase não configurado — sync ignorado');
    return;
  }

  const headers = {
    'apikey':        supaKey,
    'Authorization': `Bearer ${supaKey}`,
    'Content-Type':  'application/json',
    'Prefer':        'resolution=merge-duplicates',
  };

  const snapshots = [];
  const postRows  = [];
  const dataHoje  = hoje();

  // ── Snapshot Instagram ────────────────────────────────────────────────────
  if (igData) {
    snapshots.push({
      conta_key:   conta.key,
      conta_label: conta.label,
      plataforma:  'instagram',
      data:        dataHoje,
      seguidores:  igData.perfil.followers_count ?? null,
      seguindo:    igData.perfil.follows_count   ?? null,
      posts_count: igData.perfil.media_count     ?? null,
      username:    igData.perfil.username        ?? null,
    });

    for (const p of igData.posts) {
      const curtidas     = p.like_count     ?? 0;
      const comentarios  = p.comments_count ?? 0;
      postRows.push({
        conta_key:          conta.key,
        conta_label:        conta.label,
        plataforma:         'instagram',
        post_id:            p.id,
        data_post:          p.timestamp,
        tipo:               p.media_type || 'IMAGE',
        caption:            (p.caption || '').slice(0, 500),
        permalink:          p.permalink || null,
        thumbnail_url:      p.thumbnail_url || p.media_url || null,
        curtidas,
        comentarios,
        compartilhamentos:  0,
        engajamento:        curtidas + comentarios,
      });
    }
  }

  // ── Snapshot Facebook ─────────────────────────────────────────────────────
  if (fbData) {
    snapshots.push({
      conta_key:   conta.key,
      conta_label: conta.label,
      plataforma:  'facebook',
      data:        dataHoje,
      seguidores:  fbData.pagina.fan_count ?? fbData.pagina.followers_count ?? null,
      seguindo:    null,
      posts_count: fbData.posts.length,
      username:    fbData.pagina.name ?? null,
    });

    for (const p of fbData.posts) {
      const curtidas     = p.reactions?.summary?.total_count ?? 0;
      const comentarios  = p.comments?.summary?.total_count  ?? 0;
      const compartilhamentos = p.shares?.count ?? 0;
      const tipo = p.attachments?.data?.[0]?.media_type?.toUpperCase() || 'TEXT';
      postRows.push({
        conta_key:         conta.key,
        conta_label:       conta.label,
        plataforma:        'facebook',
        post_id:           p.id,
        data_post:         p.created_time,
        tipo,
        caption:           (p.message || '').slice(0, 500),
        permalink:         `https://www.facebook.com/${p.id}`,
        thumbnail_url:     p.full_picture || null,
        curtidas,
        comentarios,
        compartilhamentos,
        engajamento:       curtidas + comentarios + compartilhamentos,
      });
    }
  }

  // ── Upsert snapshots ──────────────────────────────────────────────────────
  if (snapshots.length) {
    const r = await fetch(
      `${supaUrl}/rest/v1/social_account_snapshots?on_conflict=conta_key,plataforma,data`,
      { method: 'POST', headers, body: JSON.stringify(snapshots) }
    );
    if (!r.ok) console.warn(`    ⚠️  Snapshots: ${r.status} ${await r.text()}`);
    else console.log(`    ✅ Snapshots: ${snapshots.length}`);
  }

  // ── Upsert posts ──────────────────────────────────────────────────────────
  if (postRows.length) {
    const r = await fetch(
      `${supaUrl}/rest/v1/social_posts?on_conflict=post_id`,
      { method: 'POST', headers, body: JSON.stringify(postRows) }
    );
    if (!r.ok) console.warn(`    ⚠️  Posts: ${r.status} ${await r.text()}`);
    else console.log(`    ✅ Posts: ${postRows.length}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n📱 Social Media — coleta ${hoje()}\n`);

  for (const conta of CONTAS) {
    console.log(`\n🔄 ${conta.label} (${conta.key})`);
    try {
      const [igData, fbData] = await Promise.allSettled([
        coletarInstagram(conta),
        coletarFacebook(conta),
      ]);

      const ig = igData.status === 'fulfilled' ? igData.value : null;
      const fb = fbData.status === 'fulfilled' ? fbData.value : null;

      if (igData.status === 'rejected') console.warn(`  ❌ IG: ${igData.reason?.message}`);
      if (fbData.status === 'rejected') console.warn(`  ❌ FB: ${fbData.reason?.message}`);

      await syncSupabase(conta, ig, fb);
    } catch (err) {
      console.error(`  ❌ ${conta.key}: ${err.message}`);
    }
  }

  console.log('\n✅ Social Media concluído\n');
}

main().catch(e => { console.error(e.message || e); process.exit(1); });
