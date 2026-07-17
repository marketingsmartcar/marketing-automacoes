'use strict';
/**
 * Gera 4 bots Kommo para GRUPO2 (categorias só de comentário — sem DM).
 * Uso: node tools/gerar-bot-kommo-grupo2.js
 *
 * localizacao   → 3 respostas diretas com endereço
 * horario       → 3 respostas diretas com horário
 * elogios       → 3 respostas de agradecimento
 * negativos     → 1 resposta empática + change_status Humano + assign Bruna
 */

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const outDir        = path.join(__dirname, '../output');
const knowledgePath = path.join(__dirname, '../knowledge/bot-comentarios-peg-pneus.json');
fs.mkdirSync(outDir, { recursive: true });

// Kommo trava com muitas conditions. Cap em 150 para ficar próximo do PRECO (138).
const MAX_KEYWORDS    = 150;
const MAX_COND_HEIGHT = 8000;

// ─── CRM IDs ──────────────────────────────────────────────────────────────────
const USER_BRUNA           = 15342631;
const PIPELINE_RS          = 13839039;
const STATUS_RS_HUMANO     = 106784475;
const STATUS_RS_RESPONDIDO = 106784479;

// ─── Ações CRM — model.text ───────────────────────────────────────────────────
const ACT_HUMANO     = { handler: 'action', params: { name: 'change_status',           params: { value: STATUS_RS_HUMANO,     pipeline_id: PIPELINE_RS } } };
const ACT_RESPONDIDO = { handler: 'action', params: { name: 'change_status',           params: { value: STATUS_RS_RESPONDIDO, pipeline_id: PIPELINE_RS } } };
const ACT_RESP_BRUNA = { handler: 'action', params: { name: 'change_responsible_user', params: { value: USER_BRUNA, type: 1, element_type: 1, contact_type: 'main' } } };

// ─── Ações CRM — positions ────────────────────────────────────────────────────
const PA_HUMANO     = { links: [], params: { params: { name: 'change_status',           params: { value: STATUS_RS_HUMANO,     pipeline_id: PIPELINE_RS } }, handler: 'action' } };
const PA_RESPONDIDO = { links: [], params: { params: { name: 'change_status',           params: { value: STATUS_RS_RESPONDIDO, pipeline_id: PIPELINE_RS } }, handler: 'action' } };
const PA_RESP_BRUNA = { links: [], params: { params: { name: 'change_responsible_user', params: { value: USER_BRUNA, type: 'contact_main' } }, handler: 'action' } };

// ─── Respostas ────────────────────────────────────────────────────────────────
const BOTS = {
  localizacao: {
    name:  'LOCALIZACAO — Resposta Comentário',
    file:  'kommo-grupo2-localizacao.json',
    respostas: [
      '📍 {{contact.first_name}}, estamos em:\n• Araraquara-SP — Av. Maria Antonia Camargo de Oliveira, 463 | ☎️ (16) 3322-5634\n• Sorocaba-SP — Av. São Paulo, 1030, Além Ponte | ☎️ (15) 3191-1031\nHorário: Seg–Sex 8h–18h | Sáb 8h–12h 🏪',
      'Oi {{contact.first_name}}! 😊 Temos 2 unidades:\n📍 Araraquara-SP: Av. Maria Antonia Camargo de Oliveira, 463\n📍 Sorocaba-SP: Av. São Paulo, 1030 — Além Ponte\nVenha nos visitar! 🚗',
      '{{contact.first_name}}, pode vir! 📍 Araraquara: Av. Maria Antonia Camargo de Oliveira, 463 | Sorocaba: Av. São Paulo, 1030. Seg–Sex 8h–18h, Sáb 8h–12h 😊',
    ],
    tipo: 'simples',
  },
  horario: {
    name:  'HORARIO — Resposta Comentário',
    file:  'kommo-grupo2-horario.json',
    respostas: [
      '⏰ {{contact.first_name}}, nosso horário de funcionamento:\n• Segunda a Sexta: 8h às 18h\n• Sábados: 8h às 12h\nAguardamos sua visita! 😊',
      'Oi {{contact.first_name}}! 🕗 Abrimos de Seg a Sex das 8h às 18h e aos Sábados das 8h ao meio-dia. Domingos e feriados estamos fechados.',
      '{{contact.first_name}}, estamos abertos: Seg–Sex 8h–18h | Sáb 8h–12h ⏰ Venha conhecer a Peg Pneus Atacarejo! 🚗',
    ],
    tipo: 'simples',
  },
  elogios: {
    name:  'ELOGIOS — Resposta Comentário',
    file:  'kommo-grupo2-elogios.json',
    respostas: [
      'Muito obrigado, {{contact.first_name}}! É uma satisfação enorme receber seu carinho! Pode contar sempre com a Peg Pneus Atacarejo!',
      'Oi {{contact.first_name}}! Que comentário lindo! Fico muito feliz que tenha tido uma boa experiência. Volte sempre!',
      '{{contact.first_name}}, obrigado demais! É por isso que amamos o que fazemos! Conte sempre com a Peg Pneus — o primeiro atacarejo de pneus do Brasil!',
    ],
    tipo: 'simples',
  },
  negativos: {
    name:  'NEGATIVOS — Resposta Comentário',
    file:  'kommo-grupo2-negativos.json',
    respostas: [
      '{{contact.first_name}}, lamentamos muito a sua experiência. 😔 Nossa equipe vai entrar em contato com você o mais rápido possível para resolver tudo. Pedimos desculpas pelo transtorno.',
    ],
    tipo: 'negativo', // change_status Humano + assign Bruna
  },
};

// ─── Deduplicação ────────────────────────────────────────────────────────────

function dedupPalavras(palavras) {
  // 1. Remove 100% MAIÚSCULAS
  const s0 = palavras.filter(p => {
    const letters = p.replace(/[^a-zA-ZÀ-ÿ]/g, '');
    return letters.length === 0 || letters !== letters.toUpperCase();
  });
  // 2. Colapsa para lowercase e deduplica
  const seen = new Set();
  const s2 = [];
  for (const p of s0) {
    const key = p.toLowerCase().trim();
    if (!seen.has(key)) { seen.add(key); s2.push(key); }
  }
  // 3. Remove variante com '?' se a sem '?' já existe
  const lw = new Set(s2);
  const s3 = s2.filter(p => {
    if (!p.endsWith('?')) return true;
    return !lw.has(p.slice(0, -1).trim());
  });
  // 4. Remove frases compostas subsumed por palavra raiz mais curta
  const sorted = [...s3].sort((a, b) => a.length - b.length);
  const result = []; const rLow = [];
  for (const p of sorted) {
    const sub = rLow.some(ex => {
      if (ex === p || p.length <= ex.length) return false;
      const esc = ex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp('(^|\\s)' + esc + '(\\s|$)', 'i').test(p);
    });
    if (!sub) { result.push(p); rLow.push(p); }
  }
  return result.slice(0, MAX_KEYWORDS);
}

// ─── Conhecimento ─────────────────────────────────────────────────────────────
const knowledge = JSON.parse(fs.readFileSync(knowledgePath, 'utf8'));

// Gera o set de keywords do Grupo1 para dedup cruzado
const G1_CATS = ['preco','estoque_disponibilidade','interesse_compra','contato_whatsapp','agendamento','atacado_revenda','servicos','garantia','pagamento','frete_entrega','duvidas_gerais'];
const g1Keywords = dedupPalavras(G1_CATS.flatMap(c => knowledge.categorias[c].gatilhos));

// Remove keywords do G2 que conflitam com G1 via substring (contains do Kommo dispara os dois)
function removeConflitosG1(palavras) {
  return palavras.filter(kw => {
    // Remove se alguma keyword G1 é substring de kw (comentário com kw aciona G1 também)
    if (g1Keywords.some(g1 => kw !== g1 && kw.includes(g1))) return false;
    // Remove se kw é substring de alguma keyword G1 (conflito inverso)
    if (g1Keywords.some(g1 => g1 !== kw && g1.includes(kw))) return false;
    return true;
  });
}

const CAT_MAP = {
  localizacao: 'localizacao',
  horario:     'horario',
  elogios:     'elogios_feedback',
  negativos:   'negativos_reclamacao',
};

// ─── Utilitários ──────────────────────────────────────────────────────────────
function readJsonNoBOM(filePath) {
  const buf = fs.readFileSync(filePath);
  const str = (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF)
    ? buf.slice(3).toString('utf8') : buf.toString('utf8');
  return JSON.parse(str);
}

function buildConditions(palavras, gotoStep) {
  const conds = palavras.map((palavra, i) => {
    const params = {
      logic: 'and',
      result: [{ params: { step: gotoStep, type: 'question' }, handler: 'goto' }],
      ...(i === 0 ? {
        tipText:        'Defina uma palavra-chave — você pode alterá-la a qualquer momento!',
        tipTitle:       'Sua palavra-chave aciona o bot',
        tipImageSrc:    '/frontend/images/interface/wizard_influencers/tips/send_promo_code/condition_tip_pt.png',
        tipFeatureName: '',
      } : {}),
      conditions: [{ term1: '{{comment}}', term2: palavra, operation: 'contains', value_type: 'custom_value' }],
    };
    return { params, handler: 'conditions' };
  });
  return conds;
}

function buildCondActions(palavras, destBlock) {
  return palavras.map((palavra, i) => ({
    id: 200 + i, sort: i,
    links: [{ block: destBlock }],
    params: {
      params: {
        logic: 'and', result: [],
        ...(i === 0 ? {
          tipText:        'Defina uma palavra-chave — você pode alterá-la a qualquer momento!',
          tipTitle:       'Sua palavra-chave aciona o bot',
          tipImageSrc:    '/frontend/images/interface/wizard_influencers/tips/send_promo_code/condition_tip_pt.png',
          tipFeatureName: '',
        } : {}),
        conditions: [{ term1: '{{comment}}', term2: palavra, operation: 'contains', value_type: 'custom_value' }],
      },
      handler: 'conditions',
    },
  }));
}

// ─── Gera bot simples (3 rotações) ────────────────────────────────────────────
function buildSimpleCommentBot(botKey, cfg, palavras) {
  const tpl = readJsonNoBOM(path.join(outDir, 'exported-comentarios-preco.json'));
  const m   = JSON.parse(tpl.model.text);
  const p   = JSON.parse(tpl.model.positions);

  const gotoStep  = m['0'].question.find(q => q.handler === 'goto').params.step; // 6
  const N         = cfg.respostas.length;
  const newSeedId = crypto.randomUUID();

  // Step 0: condições
  m['0'].question = buildConditions(palavras, gotoStep);

  // Step 6: distribuição + change_status Respondido
  m[String(gotoStep)].question[0].params.variants = cfg.respostas.map((_, i) => ({ step: 12 + i, type: 'question' }));
  m[String(gotoStep)].question[0].params.seed_id  = newSeedId;
  if (!m[String(gotoStep)].question.find(q => q.handler === 'action')) {
    m[String(gotoStep)].question.push(ACT_RESPONDIDO);
  }

  // Steps 12..N+11: textos
  for (let i = 0; i < N; i++) {
    const step = String(12 + i);
    if (!m[step]) {
      m[step] = {
        question: [{
          params: { text: cfg.respostas[i], recipient: { type: 'all_contacts', way_of_communication: 'over_all' }, is_in_starting_block: true, send_to_all_chat_sources: true },
          handler: 'send_comment',
        }],
        block_uuid: crypto.randomUUID(),
      };
    } else {
      m[step].question[0].params.text = cfg.respostas[i];
    }
    // Remove variantes extras (caso template tenha mais do que precisamos)
    if (i >= N) delete m[step];
  }

  // Positions: conditions (step 0)
  const condBlk = p.find(b => b.step === 0);
  if (condBlk) {
    const dest = condBlk.actions[0]?.links?.[0]?.block ?? 15;
    condBlk.actions = buildCondActions(palavras, dest);
    condBlk.height  = Math.min(MAX_COND_HEIGHT, Math.max(400, palavras.length * 62 + 20));
    condBlk.name    = 'Verificar palavra-chave';
  }

  // Positions: distribuição (step 6)
  const distBlk = p.find(b => b.step === gotoStep);
  if (distBlk) {
    distBlk.name    = 'Respostas de comentários';
    distBlk.seed_id = newSeedId;

    // Mantém só os N primeiros links de distribuição + adiciona se faltar
    const distActions = distBlk.actions.filter(a => a.params?.handler === 'distribution').slice(0, N);
    while (distActions.length < N) {
      const lastId   = Math.max(...distActions.map(a => a.id),   0) + 1;
      const lastSort = Math.max(...distActions.map(a => a.sort), 0) + 1;
      distActions.push({ id: lastId, sort: lastSort, links: [{ block: 31 + distActions.length }], params: { params: { type: 'round_robin', variants: [] }, handler: 'distribution' } });
    }

    // Garante change_status Respondido
    const crmAction = { id: Math.max(...distActions.map(a => a.id), 0) + 1, sort: N, ...PA_RESPONDIDO };
    distBlk.actions = [...distActions, crmAction];
  }

  // Positions: blocos de comentário (steps 12..N+11)
  for (let i = 0; i < N; i++) {
    const step  = 12 + i;
    const block = 31 + i;
    const blk   = p.find(b => b.step === step);
    if (blk) {
      blk.name = 'Comentar';
      const act = blk.actions.find(a => a.params?.handler === 'send_comment');
      if (act) act.params.params.text = cfg.respostas[i];
    } else {
      p.push({
        x: 1273, y: 65 + i * 222, z: 69 + i,
        id: block, goto: null, name: 'Comentar',
        step, type: 'question', width: 400, height: 124,
        actions: [{
          id: 256 + i * 10, sort: 0, links: [],
          params: { params: { text: cfg.respostas[i], recipient: { type: 'all_contacts', way_of_communication: 'over_all' }, is_in_starting_block: true, send_to_all_chat_sources: true }, handler: 'send_comment' },
        }],
        deletable: true, block_uuid: crypto.randomUUID(),
      });
    }
  }

  // Remove blocos extras do template (step 14 se N < 3)
  for (let i = N; i < 3; i++) {
    const idx = p.findIndex(b => b.step === 12 + i);
    if (idx !== -1) p.splice(idx, 1);
    delete m[String(12 + i)];
  }

  tpl.model = { text: JSON.stringify(m), name: cfg.name, positions: JSON.stringify(p), type: tpl.model.type };
  return tpl;
}

// ─── Gera bot negativo (comment empático + Humano + Bruna) ───────────────────
function buildNegativoBot(cfg, palavras) {
  const tpl = readJsonNoBOM(path.join(outDir, 'exported-comentarios-preco.json'));
  const m   = JSON.parse(tpl.model.text);
  const p   = JSON.parse(tpl.model.positions);

  // Step 0: condições → step 6
  m['0'].question = buildConditions(palavras, 6);

  // Step 6: change_status Humano + change_responsible Bruna → finish (sem comentário)
  m['6'] = {
    question: [
      ACT_HUMANO,
      ACT_RESP_BRUNA,
      { handler: 'finish', params: {} },
    ],
    block_uuid: crypto.randomUUID(),
  };

  // Remove blocos de comentário do template
  delete m['12'];
  delete m['13'];
  delete m['14'];

  // Positions: conditions (step 0)
  const condBlk = p.find(b => b.step === 0);
  if (condBlk) {
    condBlk.actions = buildCondActions(palavras, 15);
    condBlk.height  = Math.min(MAX_COND_HEIGHT, Math.max(400, palavras.length * 62 + 20));
    condBlk.name    = 'Verificar palavra-chave';
  }

  // Positions: bloco 15 (step 6) — ações CRM + finish
  const distBlkIdx = p.findIndex(b => b.step === 6);
  const FINISH_ID = 31;
  if (distBlkIdx !== -1) {
    p[distBlkIdx] = {
      x: 708, y: 65, z: 22, id: 15, goto: { block: FINISH_ID },
      name: 'Escalar para humano', step: 6, type: 'question',
      width: 400, height: 120,
      actions: [
        { id: 235, sort: 0, ...PA_HUMANO },
        { id: 236, sort: 1, ...PA_RESP_BRUNA },
      ],
      deletable: true, block_uuid: crypto.randomUUID(),
    };
  }

  // Positions: bloco finish (step 12 → agora é finish)
  for (const step of [12, 13, 14]) {
    const idx = p.findIndex(b => b.step === step);
    if (idx !== -1) p.splice(idx, 1);
  }
  p.push({
    x: 1273, y: 65, z: 69, id: FINISH_ID, goto: null, name: 'Fim',
    step: 12, type: 'finish', width: 200, height: 60,
    actions: [], deletable: true, block_uuid: crypto.randomUUID(),
  });

  tpl.model = { text: JSON.stringify(m), name: cfg.name, positions: JSON.stringify(p), type: tpl.model.type };
  return tpl;
}

// ─── Gera todos os bots ───────────────────────────────────────────────────────
const results = [];

for (const [botKey, cfg] of Object.entries(BOTS)) {
  const catKey  = CAT_MAP[botKey];
  const palavras = removeConflitosG1(dedupPalavras(knowledge.categorias[catKey].gatilhos));

  let output;
  if (cfg.tipo === 'negativo') {
    output = buildNegativoBot(cfg, palavras);
  } else {
    output = buildSimpleCommentBot(botKey, cfg, palavras);
  }

  const outFile = path.join(outDir, cfg.file);
  fs.writeFileSync(outFile, '﻿' + JSON.stringify(output, null, 2), 'utf8');
  results.push({ name: cfg.name, file: cfg.file, palavras: palavras.length, tipo: cfg.tipo });
  console.log(`✅ ${outFile}`);
}

console.log('\n📋 Resumo Grupo 2:');
for (const r of results) {
  console.log(`   ${r.name} — ${r.palavras} palavras-gatilho [${r.tipo}]`);
}
console.log('\n📋 Kommo → Automações → Bots → IMPORTAR (importar cada um separado)');
