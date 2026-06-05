'use strict';
/**
 * Baixa arquivos do Google Drive usando Service Account
 * Suporta: listar pasta, baixar arquivo para /tmp
 */

const { google } = require('googleapis');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

// Autentica com Service Account
function getAuth() {
  let creds;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    // GitHub Actions: pode ser base64 ou JSON direto
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON.trim();
    const decoded = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    creds = JSON.parse(decoded);
  } else {
    // Local: arquivo de credenciais
    const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || 'credentials/google-sheets-key.json';
    creds = JSON.parse(fs.readFileSync(path.join(process.cwd(), keyPath), 'utf8'));
  }
  return new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
}

let _drive = null;
async function getDrive() {
  if (!_drive) _drive = google.drive({ version: 'v3', auth: getAuth() });
  return _drive;
}

// Lista arquivos de uma pasta (não recursivo)
async function listarPasta(folderId, exts = ['.mp4', '.mov', '.avi', '.png', '.jpg']) {
  const drive = await getDrive();
  const res = await drive.files.list({
    q: `"${folderId}" in parents and trashed=false`,
    fields: 'files(id,name,mimeType,size)',
    pageSize: 200,
    orderBy: 'name',
  });
  return (res.data.files || []).filter(f => {
    if (f.mimeType === 'application/vnd.google-apps.folder') return false;
    if (f.name.startsWith('desktop')) return false;
    const ext = path.extname(f.name).toLowerCase();
    return exts.length === 0 || exts.includes(ext);
  });
}

// Lista todos os arquivos de múltiplas pastas (não recursivo)
async function listarPastas(pastaMap, exts) {
  const result = [];
  for (const [nomePasta, folderId] of Object.entries(pastaMap)) {
    const files = await listarPasta(folderId, exts);
    files.forEach(f => result.push({ ...f, pasta: nomePasta, folderId }));
  }
  return result;
}

// Baixa um arquivo para /tmp e retorna o caminho local
async function baixarArquivo(fileId, fileName) {
  const drive = await getDrive();
  const dest  = path.join(os.tmpdir(), `stories_${fileId}_${fileName}`);
  if (fs.existsSync(dest)) return dest; // cache: já baixado nessa execução
  console.log(`  ⬇️  Baixando ${fileName} do Drive...`);
  const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
  await new Promise((resolve, reject) => {
    const out = fs.createWriteStream(dest);
    res.data.pipe(out);
    out.on('finish', resolve);
    out.on('error', reject);
  });
  const mb = Math.round(fs.statSync(dest).size / 1024 / 1024);
  console.log(`  ✅ Baixado: ${fileName} (${mb}MB)`);
  return dest;
}

module.exports = { listarPasta, listarPastas, baixarArquivo };
