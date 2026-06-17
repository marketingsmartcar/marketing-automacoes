// tools/setup-artes-storage.js
// Upload dos templates PNG para o bucket artes-templates no Supabase
// Uso: node tools/setup-artes-storage.js
require('dotenv').config();
const fs   = require('fs');
const path = require('path');

const SUPA_URL = process.env.NEXUSZ_SUPABASE_URL;
const SUPA_KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY;
const BUCKET   = 'artes-templates';

if (!SUPA_URL || !SUPA_KEY) {
  console.error('❌ NEXUSZ_SUPABASE_URL e NEXUSZ_SUPABASE_SERVICE_ROLE_KEY são obrigatórios no .env');
  process.exit(1);
}

const TEMPLATES = [
  'colaborador-brpneus.png',
  'colaborador-pegpneus.png',
  'colaborador-smartcar.png',
  'aniversario-brpneus.png',
  'aniversario-pegpneus.png',
  'aniversario-smartcar.png',
];

async function upload(fileName, filePath) {
  const buf  = fs.readFileSync(filePath);
  const url  = `${SUPA_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(fileName)}`;
  const res  = await fetch(url, {
    method:  'POST',
    headers: {
      apikey:        SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      'Content-Type': 'image/png',
      'x-upsert':    'true',
    },
    body: buf,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${res.status} — ${txt}`);
  }
  return res.json();
}

async function main() {
  const dir = path.join(__dirname, '..', 'assets', 'templates');
  let ok = 0, fail = 0;
  for (const f of TEMPLATES) {
    const fp = path.join(dir, f);
    if (!fs.existsSync(fp)) { console.warn(`⚠️  Não encontrado: ${fp}`); fail++; continue; }
    try {
      await upload(f, fp);
      console.log(`✅  ${f}`);
      ok++;
    } catch (e) {
      console.error(`❌  ${f}: ${e.message}`);
      fail++;
    }
  }
  console.log(`\n${ok} enviados, ${fail} erros`);
}

main().catch(err => { console.error(err); process.exit(1); });
