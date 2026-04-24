'use strict';

const fs    = require('fs');
const path  = require('path');
const axios = require('axios');

const BASE_GRAPH = 'https://graph.facebook.com/v19.0';

// Cache de page tokens para não chamar a API repetidamente
const _pageTokenCache = {};

async function resolverPageToken(pageId, token) {
  const cacheKey = `${pageId}:${token.slice(-8)}`;
  if (_pageTokenCache[cacheKey]) return _pageTokenCache[cacheKey];
  try {
    const { data } = await axios.get(`${BASE_GRAPH}/${pageId}`, {
      params: { fields: 'access_token', access_token: token },
    });
    if (data.access_token) {
      _pageTokenCache[cacheKey] = data.access_token;
      return data.access_token;
    }
  } catch {}
  // Se não conseguiu trocar, usa o token original (já é page token)
  return token;
}

// ─── Utilitário: sleep ────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Upload do vídeo via sessão resumível (Instagram e Facebook) ──────────────
async function uploadVideoResumivel(videoPath, token, uploadUrl) {
  const bytes   = fs.readFileSync(videoPath);
  const tamanho = bytes.length;

  await axios.post(uploadUrl, bytes, {
    headers: {
      'Authorization':   `OAuth ${token}`,
      'Content-Type':    'application/octet-stream',
      'Content-Length':  tamanho,
      'offset':          '0',
      'file_size':       tamanho,
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });
}

// ─── Instagram Story ──────────────────────────────────────────────────────────
async function postarInstagramStory(igUserId, pageToken, videoPath) {
  const nomeArq = path.basename(videoPath);
  console.log(`  📸 [IG] Iniciando upload: ${nomeArq}`);

  // 1. Criar container (sessão resumível)
  const { data: container } = await axios.post(
    `${BASE_GRAPH}/${igUserId}/media`,
    null,
    {
      params: {
        media_type:   'STORIES',
        upload_type:  'resumable',
        access_token: pageToken,
      },
    }
  );

  const containerId = container.id;
  const uploadUri   = container.uri;

  // 2. Enviar bytes do vídeo
  try {
    await uploadVideoResumivel(videoPath, pageToken, uploadUri);
  } catch (err) {
    const msg = err.response?.data?.debug_info?.message || err.message;
    throw new Error(`Upload falhou (vídeo incompatível?): ${msg}`);
  }
  console.log(`  ✅ [IG] Upload concluído: ${nomeArq}`);

  // 3. Aguardar processamento
  for (let tentativa = 0; tentativa < 20; tentativa++) {
    await sleep(8000);
    const { data: status } = await axios.get(
      `${BASE_GRAPH}/${containerId}`,
      { params: { fields: 'status_code,status', access_token: pageToken } }
    );
    console.log(`  ⏳ [IG] Status: ${status.status_code}`);
    if (status.status_code === 'FINISHED') break;
    if (status.status_code === 'ERROR') throw new Error(`Erro no processamento IG: ${JSON.stringify(status)}`);
  }

  // 4. Publicar
  const { data: publicado } = await axios.post(
    `${BASE_GRAPH}/${igUserId}/media_publish`,
    null,
    { params: { creation_id: containerId, access_token: pageToken } }
  );

  console.log(`  🎉 [IG] Story publicado! ID: ${publicado.id}`);
  return publicado.id;
}

// ─── Facebook Page Story ──────────────────────────────────────────────────────
async function postarFacebookStory(pageId, pageToken, videoPath) {
  const nomeArq = path.basename(videoPath);
  console.log(`  📘 [FB] Iniciando upload: ${nomeArq}`);

  // Garante que temos um Page Access Token (troca system user token se necessário)
  const token = await resolverPageToken(pageId, pageToken);

  // 1. Iniciar sessão de upload
  const { data: sessao } = await axios.post(
    `${BASE_GRAPH}/${pageId}/video_stories`,
    null,
    {
      params: {
        upload_phase: 'start',
        access_token: token,
      },
    }
  );

  const videoId  = sessao.video_id;
  const uploadUrl = sessao.upload_url;

  // 2. Enviar bytes
  await uploadVideoResumivel(videoPath, token, uploadUrl);
  console.log(`  ✅ [FB] Upload concluído: ${nomeArq}`);

  // 3. Finalizar publicação
  const { data: publicado } = await axios.post(
    `${BASE_GRAPH}/${pageId}/video_stories`,
    null,
    {
      params: {
        upload_phase: 'finish',
        video_id:     videoId,
        access_token: token,
      },
    }
  );

  console.log(`  🎉 [FB] Story publicado! ID: ${videoId}`);
  return videoId;
}

module.exports = { postarInstagramStory, postarFacebookStory };
