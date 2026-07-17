'use strict';
const k = require('../knowledge/bot-comentarios-peg-pneus.json');

function dedup(palavras) {
  const s0 = palavras.filter(p => { const l = p.replace(/[^a-zA-ZÀ-ÿ]/g,''); return l.length===0||l!==l.toUpperCase(); });
  const seen = new Set(); const s2 = [];
  for (const p of s0) { const key = p.toLowerCase().trim(); if (!seen.has(key)) { seen.add(key); s2.push(key); } }
  const lw = new Set(s2);
  const s3 = s2.filter(p => { if (!p.endsWith('?')) return true; return !lw.has(p.slice(0,-1).trim()); });
  const sorted = [...s3].sort((a,b) => a.length-b.length);
  const result = []; const rLow = [];
  for (const p of sorted) {
    const sub = rLow.some(ex => {
      if (ex===p||p.length<=ex.length) return false;
      const esc = ex.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      return new RegExp('(^|\\s)'+esc+'(\\s|$)','i').test(p);
    });
    if (!sub) { result.push(p); rLow.push(p); }
  }
  return result.slice(0,150);
}

const G1_CATS = ['preco','estoque_disponibilidade','interesse_compra','contato_whatsapp','agendamento','atacado_revenda','servicos','garantia','pagamento','frete_entrega','duvidas_gerais'];
const g1kws = dedup(G1_CATS.flatMap(c => k.categorias[c].gatilhos));

const G2 = {
  localizacao: dedup(k.categorias.localizacao.gatilhos),
  horario:     dedup(k.categorias.horario.gatilhos),
  elogios:     dedup(k.categorias.elogios_feedback.gatilhos),
  negativos:   dedup(k.categorias.negativos_reclamacao.gatilhos),
};
const allBots = { 'grupo1': g1kws, ...G2 };

// Verifica se KW_A (de BotA) é substring de KW_B (de BotB) → mesmo comentário dispara os dois
function checkSubstringOverlap(nameA, kwsA, nameB, kwsB) {
  const conflicts = [];
  for (const kwA of kwsA) {
    for (const kwB of kwsB) {
      if (kwA === kwB) { conflicts.push({ type: 'igual', kwA, kwB }); continue; }
      // kwA é substring de kwB? → comentário com kwB dispara AMBOS
      if (kwB.includes(kwA)) conflicts.push({ type: `"${kwA}" está dentro de "${kwB}"`, kwA, kwB });
      // kwB é substring de kwA?
      else if (kwA.includes(kwB)) conflicts.push({ type: `"${kwB}" está dentro de "${kwA}"`, kwA, kwB });
    }
  }
  return conflicts;
}

const names = Object.keys(allBots);
let totalConflitos = 0;

for (let i = 0; i < names.length; i++) {
  for (let j = i+1; j < names.length; j++) {
    const a = names[i], b = names[j];
    const conflicts = checkSubstringOverlap(a, allBots[a], b, allBots[b]);
    if (conflicts.length) {
      console.log(`\n⚠️  ${a} ↔ ${b}: ${conflicts.length} conflito(s)`);
      conflicts.forEach(c => console.log(`   ${c.type}`));
      totalConflitos += conflicts.length;
    }
  }
}

if (totalConflitos === 0) {
  console.log('✅ Nenhum conflito de substring entre bots.');
} else {
  console.log(`\nTotal: ${totalConflitos} conflito(s)`);
}
