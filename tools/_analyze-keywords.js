'use strict';
const k = require('../knowledge/bot-comentarios-peg-pneus.json');
const G1 = ['preco','estoque_disponibilidade','interesse_compra','contato_whatsapp','agendamento','atacado_revenda','servicos','garantia','pagamento','frete_entrega','duvidas_gerais'];
const raw = G1.flatMap(c => k.categorias[c].gatilhos);

const s0 = raw.filter(p => { const l = p.replace(/[^a-zA-ZÀ-ÿ]/g,''); return l.length===0||l!==l.toUpperCase(); });
const seen = new Set(); const s2 = [];
for (const p of s0) { const key = p.toLowerCase().trim(); if (!seen.has(key)) { seen.add(key); s2.push(key); } }
const lw = new Set(s2);
const s3 = s2.filter(p => { if (!p.endsWith('?')) return true; return !lw.has(p.slice(0,-1).trim()); });
const sorted = [...s3].sort((a,b) => a.length - b.length);
const result = []; const rLow = [];
for (const p of sorted) {
  const sub = rLow.some(ex => {
    if (ex === p || p.length <= ex.length) return false;
    const esc = ex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(^|\\s)' + esc + '(\\s|$)', 'i').test(p);
  });
  if (!sub) { result.push(p); rLow.push(p); }
}

const by1 = result.filter(p => p.split(' ').length === 1);
const by2 = result.filter(p => p.split(' ').length === 2);
const by3 = result.filter(p => p.split(' ').length >= 3);
console.log('Total atual:', result.length);
console.log('1 palavra:', by1.length, '| 2 palavras:', by2.length, '| 3+ palavras:', by3.length);
console.log('\n--- 1 palavra ---');
console.log(by1.join(', '));
console.log('\n--- 2 palavras ---');
console.log(by2.join(', '));
console.log('\n--- 3+ palavras ---');
console.log(by3.join(', '));
