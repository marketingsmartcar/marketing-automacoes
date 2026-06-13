'use strict';
/**
 * tools/server-artes.js
 *
 * Servidor HTTP leve para geração e download de artes de colaboradores.
 * Hospedado no Railway — independente do PC local.
 *
 * Endpoints:
 *   GET  /health             — health check do Railway
 *   POST /gerar-arte         — gera PNG via gerar-arte-colaborador.js
 *   GET  /download-arte      — proxy de download do Drive
 *   POST /drive-set-public   — torna arquivo do Drive público
 */

require('dotenv').config();
const http   = require('http');
const path   = require('path');
const { spawn } = require('child_process');
const { google } = require('googleapis');

const PORT = process.env.PORT || 3098;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ── Spawna gerar-arte-colaborador.js como processo filho ──────────────────────

function runArte(extraEnv = {}) {
  const script = path.join(__dirname, 'gerar-arte-colaborador.js');
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [script], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, ...extraEnv },
      stdio: 'inherit',
    });
    proc.on('close', code => (code === 0 ? resolve() : reject(new Error(`Exit ${code}`))));
    proc.on('error', reject);
  });
}

// ── Drive auth ────────────────────────────────────────────────────────────────

function driveAuth(scopes) {
  const SA_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!SA_JSON) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON não configurada');
  let parsed;
  try { parsed = JSON.parse(SA_JSON); }
  catch { parsed = JSON.parse(Buffer.from(SA_JSON, 'base64').toString('utf8')); }
  return new google.auth.GoogleAuth({ credentials: parsed, scopes });
}

// ── Servidor ──────────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, ts: new Date().toISOString() }));
    return;
  }

  // POST /gerar-arte
  if (req.method === 'POST' && req.url === '/gerar-arte') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { colaborador_id, tipo, marca, info, nome, cargo, loja, foto_base64 } = JSON.parse(body);
        if (!tipo) {
          res.writeHead(400, CORS_HEADERS);
          res.end(JSON.stringify({ ok: false, erro: 'tipo é obrigatório' }));
          return;
        }
        if (!colaborador_id && !foto_base64) {
          res.writeHead(400, CORS_HEADERS);
          res.end(JSON.stringify({ ok: false, erro: 'Envie uma foto para gerar a arte' }));
          return;
        }
        if (!colaborador_id && !nome) {
          res.writeHead(400, CORS_HEADERS);
          res.end(JSON.stringify({ ok: false, erro: 'nome é obrigatório' }));
          return;
        }

        const extra = { ARTE_TIPO: tipo };
        if (colaborador_id) {
          extra.ARTE_COLABORADOR_ID = colaborador_id;
        } else {
          const tmpFoto = require('path').join(require('os').tmpdir(), `arte-foto-${Date.now()}.jpg`);
          const b64 = foto_base64.replace(/^data:image\/\w+;base64,/, '');
          require('fs').writeFileSync(tmpFoto, Buffer.from(b64, 'base64'));
          extra.ARTE_FOTO_PATH = tmpFoto;
          extra.ARTE_NOME = nome;
          if (cargo) extra.ARTE_CARGO = cargo;
          if (loja)  extra.ARTE_LOJA  = loja;
        }
        if (marca) extra.ARTE_MARCA = marca;
        if (info)  extra.ARTE_INFO  = info;

        console.log(`[arte] Iniciando: tipo=${tipo} ${colaborador_id ? 'colab=' + colaborador_id : 'manual:' + nome}`);
        res.writeHead(202, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, running: true }));
        runArte(extra)
          .then(() => console.log(`[arte] Concluída: tipo=${tipo}`))
          .catch(e  => console.error(`[arte] ERRO:`, e.message));
      } catch (e) {
        res.writeHead(400, CORS_HEADERS);
        res.end(JSON.stringify({ ok: false, erro: 'JSON inválido: ' + e.message }));
      }
    });
    return;
  }

  // GET /download-arte?id=FILE_ID&name=arquivo.png
  if (req.method === 'GET' && req.url.startsWith('/download-arte')) {
    const params = new URL(req.url, 'http://localhost').searchParams;
    const fileId = params.get('id');
    const nome   = params.get('name') || 'arte.png';
    if (!fileId) {
      res.writeHead(400, CORS_HEADERS);
      res.end('file id obrigatório');
      return;
    }
    (async () => {
      const auth  = driveAuth(['https://www.googleapis.com/auth/drive.readonly']);
      const drive = google.drive({ version: 'v3', auth });
      const fileRes = await drive.files.get(
        { fileId, alt: 'media', supportsAllDrives: true },
        { responseType: 'stream' },
      );
      res.writeHead(200, {
        ...CORS_HEADERS,
        'Content-Type':        'image/png',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(nome)}"`,
      });
      fileRes.data.pipe(res);
    })().catch(e => {
      res.writeHead(500, CORS_HEADERS);
      res.end(e.message);
    });
    return;
  }

  // POST /drive-set-public  { file_id }
  if (req.method === 'POST' && req.url === '/drive-set-public') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { file_id } = JSON.parse(body);
        if (!file_id) {
          res.writeHead(400, CORS_HEADERS);
          res.end(JSON.stringify({ ok: false, erro: 'file_id obrigatório' }));
          return;
        }
        const auth  = driveAuth(['https://www.googleapis.com/auth/drive']);
        const drive = google.drive({ version: 'v3', auth });
        await drive.permissions.create({
          fileId:      file_id,
          requestBody: { role: 'reader', type: 'anyone' },
          supportsAllDrives: true,
        });
        res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(500, CORS_HEADERS);
        res.end(JSON.stringify({ ok: false, erro: e.message }));
      }
    });
    return;
  }

  // 404
  res.writeHead(404, CORS_HEADERS);
  res.end('Not found');
});

server.listen(PORT, () => console.log(`[server-artes] Rodando na porta ${PORT}`));
