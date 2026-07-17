'use strict';
/**
 * Gera 2 bots Kommo para GRUPO1 (todas as 11 categorias que enviam DM).
 * Uso: node tools/gerar-bot-kommo-grupo1.js
 */

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const outDir       = path.join(__dirname, '../output');
const knowledgePath = path.join(__dirname, '../knowledge/bot-comentarios-peg-pneus.json');
fs.mkdirSync(outDir, { recursive: true });

// ─── CRM IDs ──────────────────────────────────────────────────────────────────
const USER_BRUNA            = 15342631;
const PIPELINE_RS           = 13839039;
const STATUS_RS_CONTATO_BOT = 106784471;
const STATUS_RS_HUMANO      = 106784475;
const STATUS_RS_RESPONDIDO  = 106784479;

// ─── Grupo 1: categorias que enviam DM ────────────────────────────────────────
const GRUPO1_CATS = [
  'preco', 'estoque_disponibilidade', 'interesse_compra', 'contato_whatsapp',
  'agendamento', 'atacado_revenda', 'servicos', 'garantia', 'pagamento',
  'frete_entrega', 'duvidas_gerais',
];

// Kommo trava com muitas conditions. PRECO funciona em ~138. Cap conservador em 150.
const MAX_KEYWORDS    = 150;
const MAX_COND_HEIGHT = 8000;

// Carrega keywords e agrupa com deduplicação inteligente
const knowledge   = JSON.parse(fs.readFileSync(knowledgePath, 'utf8'));
const palavrasRaw = [];
for (const cat of GRUPO1_CATS) palavrasRaw.push(...knowledge.categorias[cat].gatilhos);
const PALAVRAS = dedupPalavras(palavrasRaw);

// ─── 10 respostas de comentário ───────────────────────────────────────────────
const RESPOSTAS = [
  'Oi {{contact.first_name}}! 😍 Te mandei uma DM com os detalhes, confere lá! 😉',
  'Olá {{contact.first_name}}! 🔥 Mandei as informações no seu direct, é só conferir! ✅',
  '{{contact.first_name}}, já te mandei uma mensagem privada com tudo! 📩 Confere a DM! 😊',
  'Oi {{contact.first_name}}! 💬 Respondi você no direct, dá uma olhada lá! 👌',
  '{{contact.first_name}}, te respondi no privado! 😊 Confere sua DM que tem tudo!',
  'Olá {{contact.first_name}}! 🚗 Já deixei tudo no seu direct, é só checar!',
  'Oi {{contact.first_name}}! ✉️ Mandei uma mensagem privada pra você agora, confere!',
  '{{contact.first_name}}! 🎯 Te chamei no direct com tudo que você precisa saber!',
  'Oi {{contact.first_name}}! 💚 Respondi no seu direct com todas as informações!',
  'Olá {{contact.first_name}}! 😄 Manda uma olhadinha no seu direct, já deixei tudo lá!',
];

// ─── WhatsApp ─────────────────────────────────────────────────────────────────
const WA_ARA = 'wa.me/551633225634?text=oi%2C%20vim%20das%20redes%20sociais%20para%20saber%20mais%20sobre%20valores';
const WA_SOR = 'wa.me/551531911031?text=oi%2C%20vim%20das%20redes%20sociais%20para%20saber%20mais%20sobre%20valores';

// ─── Sinônimos "Falar com atendente" ─────────────────────────────────────────
const SIN_ATENDENTE = [
  'Quero um atendente', 'Atendimento humano', 'Chamar atendente',
  'Falar com pessoa', 'Prefiro falar com alguém', 'Me conectar com vendedor',
  'Quero ser atendido', 'humano', 'atendente', 'consultor',
  'quero falar com consultor', 'quero falar com atendente', 'quero falar com humano',
];

// ─── Ações CRM — model.text ───────────────────────────────────────────────────
const ACT_CONTATO_BOT = { handler: 'action', params: { name: 'change_status',           params: { value: STATUS_RS_CONTATO_BOT, pipeline_id: PIPELINE_RS } } };
const ACT_HUMANO      = { handler: 'action', params: { name: 'change_status',           params: { value: STATUS_RS_HUMANO,      pipeline_id: PIPELINE_RS } } };
const ACT_RESPONDIDO  = { handler: 'action', params: { name: 'change_status',           params: { value: STATUS_RS_RESPONDIDO,  pipeline_id: PIPELINE_RS } } };
const ACT_RESP_BRUNA  = { handler: 'action', params: { name: 'change_responsible_user', params: { value: USER_BRUNA, type: 1, element_type: 1, contact_type: 'main' } } };

// ─── Ações CRM — positions ────────────────────────────────────────────────────
const PA_CONTATO_BOT = { links: [], params: { params: { name: 'change_status',           params: { value: STATUS_RS_CONTATO_BOT, pipeline_id: PIPELINE_RS } }, handler: 'action' } };
const PA_HUMANO      = { links: [], params: { params: { name: 'change_status',           params: { value: STATUS_RS_HUMANO,      pipeline_id: PIPELINE_RS } }, handler: 'action' } };
const PA_RESPONDIDO  = { links: [], params: { params: { name: 'change_status',           params: { value: STATUS_RS_RESPONDIDO,  pipeline_id: PIPELINE_RS } }, handler: 'action' } };
const PA_RESP_BRUNA  = { links: [], params: { params: { name: 'change_responsible_user', params: { value: USER_BRUNA, type: 'contact_main' } }, handler: 'action' } };

// ─── Deduplicação de palavras-gatilho ────────────────────────────────────────
// Colapsa tudo para lowercase, remove ALL CAPS, ? redundantes e frases subsumed por raiz.
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
  // 5. Hard cap: mantém só as N mais curtas (mais genéricas) para não travar o Kommo
  return result.slice(0, MAX_KEYWORDS);
}

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

// ════════════════════════════════════════════════════════════════════════════════
// BOT 1 — GRUPO1 RESPOSTA COMENTÁRIO (10 variantes)
// ════════════════════════════════════════════════════════════════════════════════

const tplC  = readJsonNoBOM(path.join(outDir, 'exported-comentarios-preco.json'));
const mC    = JSON.parse(tplC.model.text);
const pC    = JSON.parse(tplC.model.positions);
const gotoC = mC['0'].question.find(q => q.handler === 'goto').params.step; // 6

// Step 0: condições com todas as palavras Grupo 1
mC['0'].question = buildConditions(PALAVRAS, gotoC);

// Step 6: distribuição 10 variantes + change_status Respondido
const newSeedId = crypto.randomUUID();
mC[String(gotoC)].question[0].params.variants = RESPOSTAS.map((_, i) => ({ step: 12 + i, type: 'question' }));
mC[String(gotoC)].question[0].params.seed_id  = newSeedId;
if (!mC[String(gotoC)].question.find(q => q.handler === 'action')) {
  mC[String(gotoC)].question.push(ACT_RESPONDIDO);
}

// Steps 12–21: textos dos comentários (criar os que não existem)
for (let i = 0; i < 10; i++) {
  const step = String(12 + i);
  if (!mC[step]) {
    mC[step] = {
      question: [{
        params: {
          text: RESPOSTAS[i],
          recipient: { type: 'all_contacts', way_of_communication: 'over_all' },
          is_in_starting_block: true,
          send_to_all_chat_sources: true,
        },
        handler: 'send_comment',
      }],
      block_uuid: crypto.randomUUID(),
    };
  } else {
    mC[step].question[0].params.text = RESPOSTAS[i];
  }
}

// Positions — bloco conditions (step 0)
const condBlkC = pC.find(b => b.step === 0);
if (condBlkC) {
  const dest = condBlkC.actions[0]?.links?.[0]?.block ?? 15;
  condBlkC.actions = buildCondActions(PALAVRAS, dest);
  condBlkC.height  = Math.min(MAX_COND_HEIGHT, Math.max(400, PALAVRAS.length * 62 + 20));
  condBlkC.name    = 'Verificar palavra-chave';
}

// Positions — bloco distribuição (step 6)
const distBlkC = pC.find(b => b.step === gotoC);
if (distBlkC) {
  distBlkC.name    = 'Respostas de comentários';
  distBlkC.height  = 500;
  distBlkC.seed_id = newSeedId;

  let lastId   = Math.max(...distBlkC.actions.map(a => a.id),   0);
  let lastSort = Math.max(...distBlkC.actions.map(a => a.sort), 0);

  // Adiciona variantes 4–10 (blocos 34–40)
  for (let i = 3; i < 10; i++) {
    lastId++; lastSort++;
    distBlkC.actions.push({
      id: lastId, sort: lastSort,
      links: [{ block: 31 + i }],
      params: { params: { type: 'round_robin', variants: [] }, handler: 'distribution' },
    });
  }

  // change_status Respondido
  if (!distBlkC.actions.find(a => a.params?.handler === 'action')) {
    lastId++; lastSort++;
    distBlkC.actions.push({ id: lastId, sort: lastSort, ...PA_RESPONDIDO });
  }
}

// Positions — blocos de comentário (steps 12–21)
for (let i = 0; i < 10; i++) {
  const step  = 12 + i;
  const block = 31 + i;
  const blk   = pC.find(b => b.step === step);

  if (blk) {
    blk.name = 'Comentar';
    const act = blk.actions.find(a => a.params?.handler === 'send_comment');
    if (act) act.params.params.text = RESPOSTAS[i];
  } else {
    pC.push({
      x: 1273, y: 65 + i * 222, z: 69 + i,
      id: block, goto: null, name: 'Comentar',
      step, type: 'question', width: 400, height: 124,
      actions: [{
        id: 256 + i * 10, sort: 0, links: [],
        params: {
          params: {
            text: RESPOSTAS[i],
            recipient: { type: 'all_contacts', way_of_communication: 'over_all' },
            is_in_starting_block: true,
            send_to_all_chat_sources: true,
          },
          handler: 'send_comment',
        },
      }],
      deletable: true, block_uuid: crypto.randomUUID(),
    });
  }
}

tplC.model = {
  text:      JSON.stringify(mC),
  name:      'GRUPO1 — Resposta Comentário',
  positions: JSON.stringify(pC),
  type:      tplC.model.type,
};

const outComent = path.join(outDir, 'kommo-grupo1-comentario.json');
fs.writeFileSync(outComent, '﻿' + JSON.stringify(tplC, null, 2), 'utf8');

// ════════════════════════════════════════════════════════════════════════════════
// BOT 2 — GRUPO1 DM CIDADE + WHATSAPP (estrutura completa validada)
// ════════════════════════════════════════════════════════════════════════════════

const tplD = readJsonNoBOM(path.join(outDir, 'exported-dm-comentarios.json'));

const UUID = {
  b68:  crypto.randomUUID(), b7:   crypto.randomUUID(),
  b69:  crypto.randomUUID(), b70:  crypto.randomUUID(),
  b72:  crypto.randomUUID(), b73:  crypto.randomUUID(),
  b74:  crypto.randomUUID(), b89:  crypto.randomUUID(),
  b90:  crypto.randomUUID(), b92:  crypto.randomUUID(),
  b98:  crypto.randomUUID(), b103: crypto.randomUUID(),
  b104: crypto.randomUUID(),
};

// ── Botões (model.text answer) ────────────────────────────────────────────────
function dmAnswer(araStep, sorStep, atenStep, elseStep) {
  const params = [
    { value: 'Araraquara',          params: [{ params: { step: araStep,  type: 'question' }, handler: 'goto' }], synonyms: ['araraquara', 'aqa'] },
    { value: 'Sorocaba',            params: [{ params: { step: sorStep,  type: 'question' }, handler: 'goto' }], synonyms: ['sorocaba', 'sor'] },
    { value: 'Falar com atendente', params: [{ params: { step: atenStep, type: 'question' }, handler: 'goto' }], synonyms: SIN_ATENDENTE },
  ];
  if (elseStep !== null) params.push({ type: 'else', params: [{ params: { step: elseStep, type: 'question' }, handler: 'goto' }] });
  return [{ params, handler: 'buttons' }];
}

// ── send_message params helper ────────────────────────────────────────────────
function sm(text, buttons, onErrStep) {
  return {
    tag: '', text, type: 'external', buttons,
    on_error: onErrStep !== null ? { params: { step: onErrStep, type: 'question' }, handler: 'goto' } : null,
    recipient: { type: 'all_contacts', way_of_communication: 'over_all' },
    is_in_starting_block: false,
    send_to_all_chat_sources: true,
  };
}

const BTNS_CIDADE = [{ text: 'Araraquara', type: 'inline' }, { text: 'Sorocaba', type: 'inline' }, { text: 'Falar com atendente', type: 'inline' }];

// ── model.text ────────────────────────────────────────────────────────────────
const modelDM = {
  '0': {
    question:   buildConditions(PALAVRAS, 24),
    block_uuid: UUID.b68,
  },
  '24': {
    question:   [ ACT_CONTATO_BOT, { handler: 'goto', params: { step: 25, type: 'question' } } ],
    block_uuid: UUID.b7,
  },
  '25': {
    answer:     dmAnswer(32, 34, 38, 36),
    question:   [{ handler: 'send_message', params: sm(
      'Olá, {{contact.first_name}} ! Seja bem-vindo à Peg Pneus Atacarejo! 😊\n\nPara te atender melhor, qual cidade fica mais perto de você?',
      BTNS_CIDADE, 26) }],
    no_answer:  { params: { step: 29, type: 'question' }, handler: 'goto' },
    block_uuid: UUID.b69,
  },
  '36': {
    answer:     dmAnswer(32, 34, 38, null),
    question:   [{ handler: 'send_message', params: sm(
      'Entendi! 😊 Para te atender melhor, qual das nossas unidades fica mais acessível para você?',
      BTNS_CIDADE, 26) }],
    no_answer:  { params: { step: 37, type: 'question' }, handler: 'goto' },
    block_uuid: UUID.b70,
  },
  '32': {
    question: [
      { handler: 'send_message', params: sm('Perfeito! Entre em contato no WhatsApp para um atendimento mais rápido e personalizado!', [{ text: '📞 (16) 3322-5634', type: 'url', url: WA_ARA }], 26) },
      { handler: 'goto', params: { step: 33, type: 'finish' } },
    ],
    block_uuid: UUID.b72,
  },
  '29': {
    question: [{ handler: 'waits', params: { logic: 'or', conditions: [{ event: { delay: 900,  action: 'ended', source: 'timer' }, action: { step: 30, type: 'question' } }] } }],
    block_uuid: UUID.b73,
  },
  '34': {
    question: [
      { handler: 'send_message', params: sm('Show! Entre pelo WhatsApp e receba um atendimento rápido e exclusivo!', [{ text: '📞 (15) 3191-1031', type: 'url', url: WA_SOR }], 26) },
      { handler: 'goto', params: { step: 35, type: 'finish' } },
    ],
    block_uuid: UUID.b74,
  },
  '26': {
    question:   [ ACT_HUMANO, { handler: 'goto', params: { step: 27, type: 'question' } } ],
    block_uuid: UUID.b89,
  },
  '27': {
    question:   [ ACT_RESP_BRUNA, { handler: 'goto', params: { step: 28, type: 'finish' } } ],
    block_uuid: UUID.b90,
  },
  '30': {
    answer:     dmAnswer(32, 34, 38, 36),
    question:   [{ handler: 'send_message', params: sm(
      'Oi, {{contact.first_name}} ! 😊 Vi que você se interessou pela Peg Pneus!\n\nAinda posso te ajudar a encontrar o pneu ideal.\n\nQual cidade fica mais perto de você?',
      BTNS_CIDADE, 26) }],
    no_answer:  { params: { step: 31, type: 'question' }, handler: 'goto' },
    block_uuid: UUID.b92,
  },
  '31': {
    question: [{ handler: 'waits', params: { logic: 'or', conditions: [{ event: { delay: 7200, action: 'ended', source: 'timer' }, action: { step: 30, type: 'question' } }] } }],
    block_uuid: UUID.b98,
  },
  '37': {
    question: [{ handler: 'waits', params: { logic: 'or', conditions: [{ event: { delay: 900,  action: 'ended', source: 'timer' }, action: { step: 30, type: 'question' } }] } }],
    block_uuid: UUID.b103,
  },
  '38': {
    question: [
      { handler: 'send_message', params: sm(
        'Perfeito! 😊 Vou te conectar com um dos nossos atendentes agora.\n\nEles vão entrar em contato em breve, ou se preferir, já pode falar direto pelo WhatsApp!',
        [], 26) },
      { handler: 'goto', params: { step: 26, type: 'question' } },
    ],
    block_uuid: UUID.b104,
  },
  conversation: false,
};

// ── Positions helpers ─────────────────────────────────────────────────────────
function posWait(id, destBlock, delay) {
  return { id, sort: 0, links: [{ block: destBlock }], params: { params: { event: { delay, action: 'ended', source: 'timer' } }, handler: 'wait' } };
}

function posMsg(id, links, text, buttons, synonyms) {
  return {
    id, sort: 0, links,
    params: { params: { tag: '', text, type: 'external', buttons, recipient: { type: 'all_contacts', way_of_communication: 'over_all' }, is_in_starting_block: false, send_to_all_chat_sources: true }, handler: 'send_message' },
    synonyms,
  };
}

const LINKS_CIDADE = [
  { data: { regex: '/Araraquara/iu' }, block: 72 },
  { data: { regex: '/Sorocaba/iu' },   block: 74 },
  { data: { regex: '/Falar com atendente/iu' }, block: 104 },
];
const SYN_CIDADE = [['araraquara', 'aqa'], ['sorocaba', 'sor'], SIN_ATENDENTE];

// ── positions array ───────────────────────────────────────────────────────────
const posDM = [
  // infra
  { x: -511, y: -166, z: 165, id: 0,  goto: { block: 68 }, step: -1, type: 'start',  width: 170, height: 38, actions: [{ id: -3, sort: 0, links: [], params: { params: [], handler: '_start' } }], deletable: true },
  { x: -584, y: -48,  z: 164, id: -1, code: 'trigger',     step: -1, type: 'static', width: 260, height: 0,  actions: [], deletable: true },

  // bloco 68 (step 0) — conditions
  { x: -238, y: -300, z: 166, id: 68, goto: { block: 7 }, name: 'Verificar palavra-chave', step: 0, type: 'question', width: 400, height: Math.min(MAX_COND_HEIGHT, Math.max(400, PALAVRAS.length * 62 + 20)), actions: buildCondActions(PALAVRAS, 7), deletable: true, block_uuid: UUID.b68 },

  // bloco 7 (step 24) — change_status Contato Bot
  { x: 333, y: -300, z: 199, id: 7, goto: { block: 69 }, name: 'Mover para etapa', step: 24, type: 'question', width: 400, height: 100, actions: [{ id: 316, sort: 0, ...PA_CONTATO_BOT }], deletable: true, block_uuid: UUID.b7 },

  // bloco 69 (step 25) — DM inicial
  { x: 900, y: -100, z: 100, id: 69, goto: { block: 70 }, name: 'Enviar mensagem', step: 25, type: 'question', width: 400, height: 300, actions: [posMsg(315, LINKS_CIDADE, 'Olá, {{contact.first_name}} ! Seja bem-vindo à Peg Pneus Atacarejo! 😊\n\nPara te atender melhor, qual cidade fica mais perto de você?', BTNS_CIDADE, SYN_CIDADE)], on_error: { block: 89 }, no_answer: { block: 73 }, deletable: true, block_uuid: UUID.b69 },

  // bloco 70 (step 36) — outra resposta (sem else/goto)
  { x: 900, y: 500, z: 100, id: 70, goto: null, name: 'Enviar mensagem', step: 36, type: 'question', width: 400, height: 300, actions: [posMsg(316, LINKS_CIDADE, 'Entendi! 😊 Para te atender melhor, qual das nossas unidades fica mais acessível para você?', BTNS_CIDADE, SYN_CIDADE)], on_error: { block: 89 }, no_answer: { block: 103 }, deletable: true, block_uuid: UUID.b70 },

  // bloco 72 (step 32) — WA Araraquara → finish 99
  { x: 1500, y: -300, z: 100, id: 72, goto: { block: 99 }, name: 'Enviar mensagem', step: 32, type: 'question', width: 400, height: 200, actions: [posMsg(317, [], 'Perfeito! Entre em contato no WhatsApp para um atendimento mais rápido e personalizado!', [{ text: '📞 (16) 3322-5634', type: 'url', url: WA_ARA }], [[]])], on_error: { block: 89 }, deletable: true, block_uuid: UUID.b72 },

  // bloco 73 (step 29) — timer 900s → bloco 92
  { x: 1500, y: -100, z: 100, id: 73, goto: null, name: 'Pausar', step: 29, type: 'question', width: 400, height: 80, actions: [posWait(268, 92, 900)], deletable: true, block_uuid: UUID.b73 },

  // bloco 74 (step 34) — WA Sorocaba → finish 100
  { x: 1500, y: 100, z: 100, id: 74, goto: { block: 100 }, name: 'Enviar mensagem', step: 34, type: 'question', width: 400, height: 200, actions: [posMsg(318, [], 'Show! Entre pelo WhatsApp e receba um atendimento rápido e exclusivo!', [{ text: '📞 (15) 3191-1031', type: 'url', url: WA_SOR }], [[]])], on_error: { block: 89 }, deletable: true, block_uuid: UUID.b74 },

  // bloco 89 (step 26) — change_status Humano [FALLBACK 1]
  { x: 1900, y: 700, z: 100, id: 89, goto: { block: 90 }, name: 'Mudar o status do lead', step: 26, type: 'question', width: 400, height: 100, actions: [{ id: 319, sort: 0, ...PA_HUMANO }], deletable: true, block_uuid: UUID.b89 },

  // bloco 90 (step 27) — change_responsible Bruna [FALLBACK 2]
  { x: 2300, y: 700, z: 100, id: 90, goto: null, name: 'Mudar usuário resp.', step: 27, type: 'question', width: 400, height: 100, actions: [{ id: 320, sort: 0, ...PA_RESP_BRUNA }], deletable: true, block_uuid: UUID.b90 },

  // bloco 91 (step 28) — finish fallback
  { x: 2700, y: 700, z: 100, id: 91, step: 28, type: 'finish', width: 374, height: 62, actions: [{ id: 321, sort: 0, links: [], params: { params: [], handler: '_stop' } }], deletable: true },

  // bloco 92 (step 30) — retry (else → bloco 70)
  { x: 1200, y: 1000, z: 100, id: 92, goto: { block: 70 }, name: 'Enviar mensagem', step: 30, type: 'question', width: 400, height: 300, actions: [posMsg(322, LINKS_CIDADE, 'Oi, {{contact.first_name}} ! 😊 Vi que você se interessou pela Peg Pneus!\n\nAinda posso te ajudar a encontrar o pneu ideal.\n\nQual cidade fica mais perto de você?', BTNS_CIDADE, SYN_CIDADE)], on_error: { block: 89 }, no_answer: { block: 98 }, deletable: true, block_uuid: UUID.b92 },

  // bloco 98 (step 31) — timer 7200s → bloco 92 (loop)
  { x: 1700, y: 1000, z: 100, id: 98, goto: null, name: 'Pausar', step: 31, type: 'question', width: 400, height: 80, actions: [posWait(323, 92, 7200)], deletable: true, block_uuid: UUID.b98 },

  // bloco 99 (step 33) — finish Araraquara
  { x: 1900, y: -300, z: 100, id: 99,  step: 33, type: 'finish', width: 374, height: 62, actions: [{ id: 324, sort: 0, links: [], params: { params: [], handler: '_stop' } }], deletable: true },

  // bloco 100 (step 35) — finish Sorocaba
  { x: 1900, y: 100,  z: 100, id: 100, step: 35, type: 'finish', width: 374, height: 62, actions: [{ id: 325, sort: 0, links: [], params: { params: [], handler: '_stop' } }], deletable: true },

  // bloco 103 (step 37) — timer 900s (de bloco 70) → bloco 92
  { x: 1500, y: 500, z: 100, id: 103, goto: null, name: 'Pausar', step: 37, type: 'question', width: 400, height: 80, actions: [posWait(326, 92, 900)], deletable: true, block_uuid: UUID.b103 },

  // bloco 104 (step 38) — msg atendente → bloco 89
  { x: 1500, y: 700, z: 100, id: 104, goto: { block: 89 }, name: 'Enviar mensagem', step: 38, type: 'question', width: 400, height: 200, actions: [posMsg(327, [], 'Perfeito! 😊 Vou te conectar com um dos nossos atendentes agora.\n\nEles vão entrar em contato em breve, ou se preferir, já pode falar direto pelo WhatsApp!', [], [])], on_error: { block: 89 }, deletable: true, block_uuid: UUID.b104 },
];

tplD.model = {
  text:      JSON.stringify(modelDM),
  name:      'GRUPO1 — DM Cidade + WhatsApp',
  positions: JSON.stringify(posDM),
  type:      tplD.model.type,
};

const outDM = path.join(outDir, 'kommo-grupo1-dm.json');
fs.writeFileSync(outDM, '﻿' + JSON.stringify(tplD, null, 2), 'utf8');

// ─── Resultado ────────────────────────────────────────────────────────────────
console.log(`✅ ${outComent}`);
console.log(`✅ ${outDM}`);
console.log(`\n   Palavras-gatilho Grupo 1: ${PALAVRAS.length}`);
console.log(`   Categorias: ${GRUPO1_CATS.join(', ')}`);
console.log(`\n📋 Kommo → Automações → Bots → IMPORTAR (importar os 2 separados)`);
