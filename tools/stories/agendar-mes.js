'use strict';
/**
 * agendar-mes.js
 *
 * Pré-planeja os stories do mês inteiro, distribuindo vídeos das lojas
 * em sequência (sem repetir em dias consecutivos) e salvando em
 * data/stories-schedule.json.
 *
 * Uso:
 *   node tools/stories/agendar-mes.js                 # a partir de amanhã
 *   node tools/stories/agendar-mes.js 2026-06-06       # a partir de data específica
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs   = require('fs');
const path = require('path');

const { listarPasta, listarPastas } = require('./drive-downloader');
const { PASTAS_BR, PASTAS_PEG, ARRAIA, SAZONAIS } = require('./drive-config');

const SCHEDULE_FILE = path.join(__dirname, '..', '..', 'data', 'stories-schedule.json');

// ─── Helpers de data ──────────────────────────────────────────────────────────

function brt() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function dowOf(dateStr) {
  return new Date(dateStr + 'T12:00:00').getDay(); // 0=Dom, 1=Seg...
}

function lastDayOfMonth(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${last.getFullYear()}-${String(last.getMonth()+1).padStart(2,'0')}-${String(last.getDate()).padStart(2,'0')}`;
}

// Embaralha determinístico (seed baseado no mês) — mesma seed = mesmo embaralhamento
function shuffleSeeded(arr, seed) {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Distribui items em slots de N por slot, sequencialmente (sem pular)
function distribuir(items, totalSlots, porSlot) {
  const result = [];
  let idx = 0;
  for (let s = 0; s < totalSlots; s++) {
    const slot = [];
    for (let i = 0; i < porSlot; i++) {
      slot.push(items[idx % items.length]);
      idx++;
    }
    result.push(slot);
  }
  return result;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args      = process.argv.slice(2);
  const startDate = args[0] || (() => {
    const d = brt();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();
  const endDate = lastDayOfMonth(startDate);

  console.log(`\n📅 Planejando stories de ${startDate} até ${endDate}`);

  // ── Carregar vídeos do Drive ─────────────────────────────────────────────────
  console.log('\n📂 Carregando vídeos do Drive...');
  const [
    lojasBR, lojasPeg,
    artesBR, artesPeg,
    arrBR, arrPeg,
    sazBR, sazPeg,
  ] = await Promise.all([
    listarPastas(PASTAS_BR,  ['.mp4', '.mov']),
    listarPastas(PASTAS_PEG, ['.mp4', '.mov']),
    listarPasta(ARRAIA.artes_br,  ['.png', '.jpg']),
    listarPasta(ARRAIA.artes_peg, ['.png', '.jpg']),
    listarPasta(ARRAIA.videos_br,  ['.mp4', '.mov']),
    listarPasta(ARRAIA.videos_peg, ['.mp4', '.mov']),
    listarPasta(SAZONAIS.br,  ['.mp4', '.mov']),
    listarPasta(SAZONAIS.peg, ['.mp4', '.mov']),
  ]);

  // Ordena artes numericamente (1.png, 2.png...)
  const sortArtes = arr => [...arr].sort((a, b) => {
    const na = parseInt(a.name), nb = parseInt(b.name);
    return isNaN(na) || isNaN(nb) ? a.name.localeCompare(b.name) : na - nb;
  });
  const artesBRs = sortArtes(artesBR);
  const artesPegs = sortArtes(artesPeg);

  console.log(`  BR lojas: ${lojasBR.length} vídeos | Peg lojas: ${lojasPeg.length} vídeos`);
  console.log(`  BR artes: ${artesBRs.length} | Peg artes: ${artesPegs.length}`);
  console.log(`  Arraia BR: ${arrBR.length} vídeos | Arraia Peg: ${arrPeg.length} vídeos`);
  console.log(`  Sazonal BR: ${sazBR.length} | Sazonal Peg: ${sazPeg.length}`);

  // ── Dias úteis (Seg–Sáb) ─────────────────────────────────────────────────────
  const dias = [];
  let cur = startDate;
  while (cur <= endDate) {
    if (dowOf(cur) !== 0) dias.push(cur); // pula domingo
    cur = addDays(cur, 1);
  }
  console.log(`\n📆 ${dias.length} dias úteis (Seg–Sáb)`);

  // ── Embaralhar lojas uma vez com seed do mês ─────────────────────────────────
  const [ano, mes] = startDate.split('-').map(Number);
  const seed = ano * 100 + mes;
  const brEmbaralhados  = shuffleSeeded(lojasBR,  seed);
  const pegEmbaralhados = shuffleSeeded(lojasPeg, seed + 1);

  // Distribuir em slots de 3 por dia
  const brSlots  = distribuir(brEmbaralhados,  dias.length, 3);
  const pegSlots = distribuir(pegEmbaralhados, dias.length, 3);

  // ── Montar plano dia a dia ───────────────────────────────────────────────────
  const isJunho2026 = (d) => d.startsWith('2026-06');
  const isSegQuaSex = (dow) => [1, 3, 5].includes(dow);
  const isTerQuiSab = (dow) => [2, 4, 6].includes(dow);

  let arteBRIdx  = 1;  // começa na arte 2 (arte 1 = fixa)
  let artePegIdx = 1;
  let arrBRIdx   = 0;
  let arrPegIdx  = 0;
  let sazBRIdx   = 0;

  const DIAS_NOME = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  const schedule = {};

  dias.forEach((dia, i) => {
    const dow   = dowOf(dia);
    const junho = isJunho2026(dia);
    const sqsf  = isSegQuaSex(dow);
    const tqs   = isTerQuiSab(dow);

    // Artes arraia
    let arteBR = null, artePeg = null;
    if (junho && artesBRs.length >= 1) {
      arteBR = {
        fixa:     { id: artesBRs[0].id, name: artesBRs[0].name },
        rotativa: artesBRs.length > 1 ? { id: artesBRs[arteBRIdx].id, name: artesBRs[arteBRIdx].name } : null,
      };
    }
    if (junho && artesPegs.length >= 1) {
      artePeg = {
        fixa:     { id: artesPegs[0].id, name: artesPegs[0].name },
        rotativa: artesPegs.length > 1 ? { id: artesPegs[artePegIdx].id, name: artesPegs[artePegIdx].name } : null,
      };
    }

    schedule[dia] = {
      dia_semana: DIAS_NOME[dow],
      br: {
        lojas: brSlots[i].map(v => ({ id: v.id, name: v.name, pasta: v.pasta })),
        arte:  arteBR,
        arraia_video: junho && sqsf && arrBR.length > 0
          ? { id: arrBR[arrBRIdx % arrBR.length].id, name: arrBR[arrBRIdx % arrBR.length].name }
          : null,
        sazonal: junho && tqs && sazBR.length > 0
          ? { id: sazBR[sazBRIdx % sazBR.length].id, name: sazBR[sazBRIdx % sazBR.length].name }
          : null,
      },
      peg: {
        lojas: pegSlots[i].map(v => ({ id: v.id, name: v.name, pasta: v.pasta })),
        arte:  artePeg,
        arraia_video: junho && sqsf && arrPeg.length > 0
          ? { id: arrPeg[arrPegIdx % arrPeg.length].id, name: arrPeg[arrPegIdx % arrPeg.length].name }
          : null,
      },
    };

    // Avança índices das rotações
    if (artesBRs.length > 1)  { arteBRIdx  = arteBRIdx  >= artesBRs.length  - 1 ? 1 : arteBRIdx  + 1; }
    if (artesPegs.length > 1) { artePegIdx = artePegIdx >= artesPegs.length - 1 ? 1 : artePegIdx + 1; }
    if (junho && sqsf) { arrBRIdx++; arrPegIdx++; }
    if (junho && tqs)  { sazBRIdx++; }
  });

  // ── Salvar schedule ──────────────────────────────────────────────────────────
  fs.mkdirSync(path.dirname(SCHEDULE_FILE), { recursive: true });

  // Mescla com schedule existente (preserva dias já feitos)
  let existing = {};
  if (fs.existsSync(SCHEDULE_FILE)) {
    try { existing = JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8')); } catch {}
  }
  const merged = { ...existing, ...schedule };
  fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(merged, null, 2));

  console.log(`\n✅ Schedule salvo: ${SCHEDULE_FILE}`);
  console.log(`\n📋 Prévia dos primeiros 5 dias:\n`);
  Object.entries(schedule).slice(0, 5).forEach(([dia, e]) => {
    console.log(`  ${dia} (${e.dia_semana})`);
    console.log(`    BR lojas:  ${e.br.lojas.map(v => v.name.slice(0, 22)).join(' | ')}`);
    if (e.br.arte)          console.log(`    BR artes:  1.png (fixa) + ${e.br.arte.rotativa?.name || '-'} (rotativa)`);
    if (e.br.arraia_video)  console.log(`    BR arraia: ${e.br.arraia_video.name}`);
    if (e.br.sazonal)       console.log(`    BR sazonal:${e.br.sazonal.name}`);
    console.log(`    Peg lojas: ${e.peg.lojas.map(v => v.name.slice(0, 22)).join(' | ')}`);
    if (e.peg.arraia_video) console.log(`    Peg arraia:${e.peg.arraia_video.name}`);
  });

  console.log(`\n⚡ Próximo passo: commitar data/stories-schedule.json e configurar o cron no Hostgator.`);
}

main().catch(e => { console.error('ERRO FATAL:', e); process.exit(1); });
