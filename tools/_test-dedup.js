'use strict';
const fs = require('fs');
const path = require('path');

const f1 = fs.statSync(path.join(__dirname, '../output/kommo-grupo1-comentario.json'));
const f2 = fs.statSync(path.join(__dirname, '../output/kommo-grupo1-dm.json'));
console.log('comentario size:', (f1.size/1024).toFixed(1), 'KB');
console.log('dm size:', (f2.size/1024).toFixed(1), 'KB');

const k = require('../knowledge/bot-comentarios-peg-pneus.json');
const G1 = ['preco','estoque_disponibilidade','interesse_compra','contato_whatsapp','agendamento','atacado_revenda','servicos','garantia','pagamento','frete_entrega','duvidas_gerais'];
const raw = G1.flatMap(c => k.categorias[c].gatilhos);
console.log('Raw total:', raw.length);

// Simula dedup lowercase-only (colapsa título para lowercase)
const s1 = raw.filter(p => { const l = p.replace(/[^a-zA-ZÀ-ÿ]/g,''); return l.length === 0 || l !== l.toUpperCase(); });
const seen = new Set();
const s2 = s1.filter(p => { const key = p.toLowerCase().trim(); if (seen.has(key)) return false; seen.add(key); return true; });
const lw = new Set(s2.map(p => p.toLowerCase().trim()));
const s3 = s2.filter(p => { const t = p.trim(); if (!t.endsWith('?')) return true; return !lw.has(t.slice(0,-1).toLowerCase().trim()); });
const sorted = [...s3].sort((a,b) => a.length - b.length);
const result = []; const rLow = [];
for (const p of sorted) {
  const pl = p.toLowerCase().trim();
  const sub = rLow.some(ex => {
    if (ex === pl || pl.length <= ex.length) return false;
    const esc = ex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(^|\\s)' + esc + '(\\s|$)', 'i').test(pl);
  });
  if (!sub) { result.push(p); rLow.push(pl); }
}
console.log('Lowercase-only dedup:', result.length, 'keywords');
console.log('Atual (mantendo title-case):', 600);
