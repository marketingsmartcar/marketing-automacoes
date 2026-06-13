'use strict';
/**
 * tools/gerar-arte-colaborador.js
 *
 * Gera arte PNG para um colaborador usando os mesmos templates do bot WhatsApp,
 * faz upload para o Google Drive e salva o registro no Supabase.
 *
 * Parâmetros via env vars:
 *   ARTE_COLABORADOR_ID  — UUID do colaborador em rh_colaboradores
 *   ARTE_TIPO            — aniversario | boasvinda
 *   ARTE_MARCA           — BR | PEG | SMARTCAR (opcional; detecta pela unidade)
 *
 * Requer:
 *   NEXUSZ_SUPABASE_URL, NEXUSZ_SUPABASE_SERVICE_ROLE_KEY
 *   GOOGLE_SERVICE_ACCOUNT_JSON  — JSON da Service Account (ou base64)
 *   GOOGLE_DRIVE_ARTES_FOLDER_ID — ID da pasta no Drive
 */

require('dotenv').config();
const path       = require('path');
const os         = require('os');
const fs         = require('fs');
const { google } = require('googleapis');

// Reutiliza os geradores do bot do WhatsApp
const { gerarColaborador, gerarAniversario } = require('./gerar-arte');

const SUPA_URL  = process.env.NEXUSZ_SUPABASE_URL;
const SUPA_KEY  = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY;
const SA_JSON   = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const FOLDER_ID = process.env.GOOGLE_DRIVE_ARTES_FOLDER_ID;

const COLAB_ID   = process.env.ARTE_COLABORADOR_ID;
const TIPO       = process.env.ARTE_TIPO  ?? 'aniversario';
const MARCA_ENV  = process.env.ARTE_MARCA;
// Modo manual (sem colaborador_id)
const ARTE_NOME      = process.env.ARTE_NOME;
const ARTE_CARGO     = process.env.ARTE_CARGO;
const ARTE_LOJA      = process.env.ARTE_LOJA;
const ARTE_FOTO_PATH = process.env.ARTE_FOTO_PATH;

// Mapeia BR/PEG/SMARTCAR → brpneus/pegpneus/smartcar (formato do gerar-arte.js)
const MARCA_MAP = { BR: 'brpneus', PEG: 'pegpneus', SMARTCAR: 'smartcar' };

// ── Supabase helpers ──────────────────────────────────────────────────────────

function supaHeaders() {
  return {
    apikey:        SUPA_KEY,
    Authorization: `Bearer ${SUPA_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function supaGet(table, qs) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${table}?${qs}`, { headers: supaHeaders() });
  if (!r.ok) throw new Error(`Supabase GET ${table} (${r.status})`);
  return r.json();
}

async function supaInsert(table, row) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...supaHeaders(), Prefer: 'return=minimal' },
    body: JSON.stringify(row),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Supabase INSERT ${table} (${r.status}): ${t.slice(0, 200)}`);
  }
}

async function supaUpdate(table, qs, row) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${table}?${qs}`, {
    method: 'PATCH',
    headers: { ...supaHeaders(), Prefer: 'return=minimal' },
    body: JSON.stringify(row),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Supabase PATCH ${table} (${r.status}): ${t.slice(0, 200)}`);
  }
}

async function supaDelete(table, qs) {
  await fetch(`${SUPA_URL}/rest/v1/${table}?${qs}`, {
    method: 'DELETE', headers: supaHeaders(),
  });
}

// ── Drive helper ──────────────────────────────────────────────────────────────

function driveAuth() {
  if (!SA_JSON) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON não configurada');
  let parsed;
  try { parsed = JSON.parse(SA_JSON); }
  catch { parsed = JSON.parse(Buffer.from(SA_JSON, 'base64').toString('utf8')); }
  return new google.auth.GoogleAuth({
    credentials: parsed,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
}

async function findOrCreateFolder(drive, name, parentId) {
  // Busca pasta existente com esse nome dentro do parent
  const q = `mimeType='application/vnd.google-apps.folder' and name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and trashed=false`;
  const list = await drive.files.list({
    q,
    fields:                   'files(id)',
    supportsAllDrives:        true,
    includeItemsFromAllDrives: true,
    driveId:                  undefined,
  });
  if (list.data.files && list.data.files.length > 0) {
    return list.data.files[0].id;
  }
  // Cria a pasta
  const created = await drive.files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
    fields:            'id',
    supportsAllDrives: true,
  });
  return created.data.id;
}

async function deleteDriveFile(fileId) {
  if (!fileId) return;
  try {
    const auth  = driveAuth();
    const drive = google.drive({ version: 'v3', auth });
    await drive.files.delete({ fileId, supportsAllDrives: true });
  } catch { /* ignora se já deletado */ }
}

async function uploadToDrive(filePath, fileName, nome, tipo) {
  const auth  = driveAuth();
  const drive = google.drive({ version: 'v3', auth });

  // Estrutura: FOLDER_ID / Colaborador / Artes / {nome} / {Boas-vindas|Aniversariantes}
  const tipoLabel = tipo === 'boasvinda' ? 'Boas-vindas' : 'Aniversariantes';
  const rootId    = FOLDER_ID;
  const colabId   = await findOrCreateFolder(drive, 'Colaborador', rootId);
  const artesId   = await findOrCreateFolder(drive, 'Artes', colabId);
  const nomeId    = await findOrCreateFolder(drive, nome, artesId);
  const tipoId    = await findOrCreateFolder(drive, tipoLabel, nomeId);

  const media = { mimeType: 'image/png', body: fs.createReadStream(filePath) };
  const res   = await drive.files.create({
    requestBody:       { name: fileName, parents: [tipoId] },
    media,
    fields:            'id,webViewLink',
    supportsAllDrives: true,
  });
  const fileId = res.data.id;

  await drive.permissions.create({
    fileId,
    requestBody:       { role: 'reader', type: 'anyone' },
    supportsAllDrives: true,
  });

  return {
    drive_file_id:  fileId,
    drive_url:      res.data.webViewLink,
    thumbnail_url:  `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`,
  };
}

// ── Download foto para arquivo temporário ─────────────────────────────────────

async function downloadFoto(fotoUrl) {
  if (!fotoUrl) return null;
  try {
    const m   = fotoUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const url = m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w800` : fotoUrl;
    const r   = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) return null;
    const buf     = Buffer.from(await r.arrayBuffer());
    const tmpPath = path.join(os.tmpdir(), `foto-${Date.now()}.jpg`);
    fs.writeFileSync(tmpPath, buf);
    return tmpPath;
  } catch {
    return null;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!COLAB_ID && !ARTE_NOME) { console.error('❌ ARTE_COLABORADOR_ID ou ARTE_NOME não definido'); process.exit(1); }
  if (!SUPA_URL) { console.error('❌ NEXUSZ_SUPABASE_URL não configurada'); process.exit(1); }

  let nomeCompleto, primeiroNome, cargo, cidade, fotoTmp, marcaKey;

  if (COLAB_ID) {
    // ── Modo normal: busca dados do colaborador no Supabase ─────────────────
    console.log(`\n🎨 Gerando arte: tipo=${TIPO} colaborador=${COLAB_ID}\n`);
    const rows = await supaGet(
      'rh_colaboradores',
      `id=eq.${COLAB_ID}&select=id,nome,cargo,foto_url,status,units(name,city,unit_type)&limit=1`
    );
    if (!rows.length) { console.error('❌ Colaborador não encontrado'); process.exit(1); }
    const colab  = rows[0];
    nomeCompleto = colab.nome;
    primeiroNome = nomeCompleto.split(' ')[0];
    cargo        = colab.cargo ?? '';
    cidade       = colab.units?.city ?? colab.units?.name ?? '';
    const unitType = colab.units?.unit_type ?? '';
    marcaKey     = MARCA_ENV ?? (unitType === 'peg_pneus' ? 'PEG' : unitType === 'smartcar' ? 'SMARTCAR' : 'BR');

    fotoTmp = await downloadFoto(colab.foto_url);
    console.log(`  📸 Foto: ${fotoTmp ? fotoTmp : 'sem foto'}`);
    if (!fotoTmp) { console.error('❌ Foto do colaborador não encontrada — necessária para gerar a arte'); process.exit(1); }

  } else {
    // ── Modo manual: dados via env vars + foto já salva em ARTE_FOTO_PATH ───
    console.log(`\n🎨 Gerando arte manual: tipo=${TIPO} nome=${ARTE_NOME}\n`);
    if (!ARTE_FOTO_PATH || !fs.existsSync(ARTE_FOTO_PATH)) {
      console.error('❌ ARTE_FOTO_PATH não definido ou arquivo não encontrado'); process.exit(1);
    }
    nomeCompleto = ARTE_NOME;
    primeiroNome = nomeCompleto.split(' ')[0];
    cargo        = ARTE_CARGO ?? '';
    cidade       = ARTE_LOJA  ?? '';
    marcaKey     = MARCA_ENV  ?? 'BR';
    fotoTmp      = ARTE_FOTO_PATH;
  }

  const marca = MARCA_MAP[marcaKey] ?? 'brpneus';
  console.log(`  👤 ${primeiroNome} | ${cargo} | ${cidade} | marca=${marcaKey} (${marca})`);

  // 4. Gerar PNG usando os templates do bot
  const nomeSafe = primeiroNome.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
  const fileName = `arte-${TIPO}-${nomeSafe}-${Date.now()}.png`;
  let outPath;

  console.log(`  🖼️  Renderizando com template do bot...`);
  if (TIPO === 'boasvinda') {
    outPath = await gerarColaborador({ marca, nome: primeiroNome, cargo, cidade, fotoPath: fotoTmp });
  } else if (TIPO === 'aniversario') {
    outPath = await gerarAniversario({ marca, nome: primeiroNome, fotoPath: fotoTmp });
  } else {
    console.error(`❌ Tipo inválido: ${TIPO}`); process.exit(1);
  }
  console.log(`  ✅ PNG gerado: ${outPath}`);

  // Renomear para fileName consistente
  const finalPath = path.join(path.dirname(outPath), fileName);
  fs.renameSync(outPath, finalPath);

  // 5. Verificar se já existe arte anterior para substituir
  const existQs = COLAB_ID
    ? `colaborador_id=eq.${COLAB_ID}&tipo=eq.${TIPO}&order=criado_em.desc&limit=1`
    : `nome_colab=eq.${encodeURIComponent(nomeCompleto)}&tipo=eq.${TIPO}&order=criado_em.desc&limit=1`;
  const existentes = await supaGet('artes_colaboradores', existQs);
  const existente = existentes[0] ?? null;

  // Deletar arquivo antigo do Drive se existir
  if (existente?.drive_file_id) {
    console.log(`  🗑️  Removendo arte anterior do Drive...`);
    await deleteDriveFile(existente.drive_file_id);
  }

  // 6. Upload ao Drive
  let driveInfo = { drive_file_id: null, drive_url: null, thumbnail_url: null };
  if (SA_JSON && FOLDER_ID) {
    console.log(`  ☁️  Enviando para o Drive...`);
    driveInfo = await uploadToDrive(finalPath, fileName, nomeCompleto, TIPO);
    console.log(`  ✅ Drive: ${driveInfo.drive_url}`);
  } else {
    console.log(`  ⚠️  Drive não configurado — pulando upload`);
  }

  // 7. Salvar no Supabase (update se existia, insert se novo)
  const payload = {
    ...(COLAB_ID ? { colaborador_id: COLAB_ID } : {}),
    nome_colab:     nomeCompleto,
    cargo_colab:    cargo,
    tipo:           TIPO,
    marca:          marcaKey,
    drive_file_id:  driveInfo.drive_file_id,
    drive_url:      driveInfo.drive_url,
    thumbnail_url:  driveInfo.thumbnail_url,
    nome_arquivo:   fileName,
    criado_em:      new Date().toISOString(),
  };
  if (existente) {
    await supaUpdate('artes_colaboradores', `id=eq.${existente.id}`, payload);
    console.log(`  ✅ Arte substituída no Supabase (id=${existente.id})`);
  } else {
    await supaInsert('artes_colaboradores', payload);
    console.log(`  ✅ Arte salva no Supabase`);
  }

  // 7. Limpar temporários
  try { fs.unlinkSync(finalPath); } catch {}
  // Só deleta fotoTmp se foi um download temporário (não o path externo enviado pelo servidor)
  if (!ARTE_FOTO_PATH) try { fs.unlinkSync(fotoTmp); } catch {}
  else try { fs.unlinkSync(ARTE_FOTO_PATH); } catch {} // deleta o temp salvo pelo servidor

  console.log('\n✅ Arte gerada com sucesso!\n');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
