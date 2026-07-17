'use strict';
/**
 * Gera bot Kommo para atendimento via DM direta (sem trigger de comentário).
 * Aciona em qualquer DM recebida — fluxo: cidade → WhatsApp / Falar com atendente.
 * Uso: node tools/gerar-bot-kommo-dm-direto.js
 */

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const outDir = path.join(__dirname, '../output');
fs.mkdirSync(outDir, { recursive: true });

// ─── CRM IDs ──────────────────────────────────────────────────────────────────
const USER_BRUNA            = 15342631;
const PIPELINE_RS           = 13839039;
const STATUS_RS_CONTATO_BOT = 106784471;
const STATUS_RS_HUMANO      = 106784475;

// ─── Ações CRM — model.text ───────────────────────────────────────────────────
const ACT_CONTATO_BOT = { handler: 'action', params: { name: 'change_status',           params: { value: STATUS_RS_CONTATO_BOT, pipeline_id: PIPELINE_RS } } };
const ACT_HUMANO      = { handler: 'action', params: { name: 'change_status',           params: { value: STATUS_RS_HUMANO,      pipeline_id: PIPELINE_RS } } };
const ACT_RESP_BRUNA  = { handler: 'action', params: { name: 'change_responsible_user', params: { value: USER_BRUNA, type: 1, element_type: 1, contact_type: 'main' } } };

// ─── Ações CRM — positions ────────────────────────────────────────────────────
const PA_CONTATO_BOT = { links: [], params: { params: { name: 'change_status',           params: { value: STATUS_RS_CONTATO_BOT, pipeline_id: PIPELINE_RS } }, handler: 'action' } };
const PA_HUMANO      = { links: [], params: { params: { name: 'change_status',           params: { value: STATUS_RS_HUMANO,      pipeline_id: PIPELINE_RS } }, handler: 'action' } };
const PA_RESP_BRUNA  = { links: [], params: { params: { name: 'change_responsible_user', params: { value: USER_BRUNA, type: 'contact_main' } }, handler: 'action' } };

// ─── Links WhatsApp ───────────────────────────────────────────────────────────
const WA_ARA = 'wa.me/551633225634?text=oi%2C%20vim%20das%20redes%20sociais%20para%20saber%20mais%20sobre%20valores';
const WA_SOR = 'wa.me/551531911031?text=oi%2C%20vim%20das%20redes%20sociais%20para%20saber%20mais%20sobre%20valores';

// ─── Sinônimos botão "Falar com atendente" ────────────────────────────────────
const SIN_ATENDENTE = [
  'Quero um atendente', 'Atendimento humano', 'Chamar atendente',
  'Falar com pessoa', 'Prefiro falar com alguém', 'Me conectar com vendedor',
  'Quero ser atendido', 'humano', 'atendente', 'consultor',
  'quero falar com consultor', 'quero falar com atendente', 'quero falar com humano',
];

// ─── Botões de cidade ─────────────────────────────────────────────────────────
const BTNS_CIDADE = [
  { text: 'Araraquara', type: 'inline' },
  { text: 'Sorocaba',   type: 'inline' },
  { text: 'Falar com atendente', type: 'inline' },
];

function dmAnswer(araStep, sorStep, atenStep, elseStep) {
  const params = [
    { value: 'Araraquara',          params: [{ params: { step: araStep,  type: 'question' }, handler: 'goto' }], synonyms: ['araraquara', 'aqa'] },
    { value: 'Sorocaba',            params: [{ params: { step: sorStep,  type: 'question' }, handler: 'goto' }], synonyms: ['sorocaba', 'sor'] },
    { value: 'Falar com atendente', params: [{ params: { step: atenStep, type: 'question' }, handler: 'goto' }], synonyms: SIN_ATENDENTE },
  ];
  if (elseStep !== null) params.push({ type: 'else', params: [{ params: { step: elseStep, type: 'question' }, handler: 'goto' }] });
  return [{ params, handler: 'buttons' }];
}

function sm(text, buttons, onErrStep) {
  return {
    tag: '', text, type: 'external', buttons,
    on_error: onErrStep !== null ? { params: { step: onErrStep, type: 'question' }, handler: 'goto' } : null,
    recipient: { type: 'all_contacts', way_of_communication: 'over_all' },
    is_in_starting_block: false,
    send_to_all_chat_sources: true,
  };
}

// ─── UUIDs ────────────────────────────────────────────────────────────────────
const UUID = {
  b7:   crypto.randomUUID(), b69:  crypto.randomUUID(),
  b70:  crypto.randomUUID(), b72:  crypto.randomUUID(),
  b73:  crypto.randomUUID(), b74:  crypto.randomUUID(),
  b89:  crypto.randomUUID(), b90:  crypto.randomUUID(),
  b92:  crypto.randomUUID(), b98:  crypto.randomUUID(),
  b103: crypto.randomUUID(), b104: crypto.randomUUID(),
};

// ════════════════════════════════════════════════════════════════════════════════
// MODEL.TEXT — sem bloco de condições (dispara em qualquer DM recebida)
// ════════════════════════════════════════════════════════════════════════════════
const modelDM = {
  // Passo 0: muda status → vai direto para DM inicial (sem condições)
  '0': {
    question:   [ ACT_CONTATO_BOT, { handler: 'goto', params: { step: 25, type: 'question' } } ],
    block_uuid: UUID.b7,
  },
  // Passo 25: DM inicial — pergunta cidade
  '25': {
    answer:    dmAnswer(32, 34, 38, 36),
    question:  [{ handler: 'send_message', params: sm(
      'Olá, {{contact.first_name}}! Seja bem-vindo à Peg Pneus Atacarejo!\n\nPara te atender melhor, qual cidade fica mais perto de você?',
      BTNS_CIDADE, 26) }],
    no_answer: { params: { step: 29, type: 'question' }, handler: 'goto' },
    block_uuid: UUID.b69,
  },
  // Passo 36: outra resposta (caso não seja Araraquara/Sorocaba/Atendente)
  '36': {
    answer:    dmAnswer(32, 34, 38, null),
    question:  [{ handler: 'send_message', params: sm(
      'Entendi! Para te atender melhor, qual das nossas unidades fica mais acessível para você?',
      BTNS_CIDADE, 26) }],
    no_answer: { params: { step: 37, type: 'question' }, handler: 'goto' },
    block_uuid: UUID.b70,
  },
  // Passo 32: WA Araraquara
  '32': {
    question: [
      { handler: 'send_message', params: sm('Perfeito! Entre em contato no WhatsApp para um atendimento mais rápido e personalizado!', [{ text: '📞 (16) 3322-5634', type: 'url', url: WA_ARA }], 26) },
      { handler: 'goto', params: { step: 33, type: 'finish' } },
    ],
    block_uuid: UUID.b72,
  },
  // Passo 29: timer 15min sem resposta → retry
  '29': {
    question: [{ handler: 'waits', params: { logic: 'or', conditions: [{ event: { delay: 900, action: 'ended', source: 'timer' }, action: { step: 30, type: 'question' } }] } }],
    block_uuid: UUID.b73,
  },
  // Passo 34: WA Sorocaba
  '34': {
    question: [
      { handler: 'send_message', params: sm('Show! Entre pelo WhatsApp e receba um atendimento rápido e exclusivo!', [{ text: '📞 (15) 3191-1031', type: 'url', url: WA_SOR }], 26) },
      { handler: 'goto', params: { step: 35, type: 'finish' } },
    ],
    block_uuid: UUID.b74,
  },
  // Passo 26: fallback — muda status para Humano
  '26': {
    question:   [ ACT_HUMANO, { handler: 'goto', params: { step: 27, type: 'question' } } ],
    block_uuid: UUID.b89,
  },
  // Passo 27: fallback — atribui Bruna
  '27': {
    question:   [ ACT_RESP_BRUNA, { handler: 'goto', params: { step: 28, type: 'finish' } } ],
    block_uuid: UUID.b90,
  },
  // Passo 30: retry — manda DM de novo
  '30': {
    answer:    dmAnswer(32, 34, 38, 36),
    question:  [{ handler: 'send_message', params: sm(
      'Oi, {{contact.first_name}}! Vi que você entrou em contato com a Peg Pneus.\n\nAinda posso te ajudar! Qual cidade fica mais perto de você?',
      BTNS_CIDADE, 26) }],
    no_answer: { params: { step: 31, type: 'question' }, handler: 'goto' },
    block_uuid: UUID.b92,
  },
  // Passo 31: timer 2h sem resposta → loop retry
  '31': {
    question: [{ handler: 'waits', params: { logic: 'or', conditions: [{ event: { delay: 7200, action: 'ended', source: 'timer' }, action: { step: 30, type: 'question' } }] } }],
    block_uuid: UUID.b98,
  },
  // Passo 37: timer 15min (de outra resposta) → retry
  '37': {
    question: [{ handler: 'waits', params: { logic: 'or', conditions: [{ event: { delay: 900, action: 'ended', source: 'timer' }, action: { step: 30, type: 'question' } }] } }],
    block_uuid: UUID.b103,
  },
  // Passo 38: mensagem de transferência para atendente → fallback
  '38': {
    question: [
      { handler: 'send_message', params: sm(
        'Vou te conectar com um dos nossos atendentes agora.\n\nEles vão entrar em contato em breve, ou se preferir, já pode falar direto pelo WhatsApp!',
        [], 26) },
      { handler: 'goto', params: { step: 26, type: 'question' } },
    ],
    block_uuid: UUID.b104,
  },
  conversation: false,
};

// ════════════════════════════════════════════════════════════════════════════════
// POSITIONS — sem bloco 68 (conditions); start → bloco 7 diretamente
// ════════════════════════════════════════════════════════════════════════════════
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

const posDM = [
  // Start aponta direto para bloco 7 (sem condições)
  { x: -400, y: -166, z: 165, id: 0,  goto: { block: 7 }, step: -1, type: 'start',  width: 170, height: 38, actions: [{ id: -3, sort: 0, links: [], params: { params: [], handler: '_start' } }], deletable: true },
  { x: -480, y: -48,  z: 164, id: -1, code: 'trigger',    step: -1, type: 'static', width: 260, height: 0,  actions: [], deletable: true },

  // Bloco 7 (step 0) — change_status Contato Bot → DM inicial
  { x: -50, y: -300, z: 199, id: 7, goto: { block: 69 }, name: 'Mover para etapa', step: 0, type: 'question', width: 400, height: 100, actions: [{ id: 316, sort: 0, ...PA_CONTATO_BOT }], deletable: true, block_uuid: UUID.b7 },

  // Bloco 69 (step 25) — DM inicial
  { x: 500, y: -100, z: 100, id: 69, goto: { block: 70 }, name: 'Enviar mensagem', step: 25, type: 'question', width: 400, height: 300,
    actions: [posMsg(315, LINKS_CIDADE, 'Olá, {{contact.first_name}}! Seja bem-vindo à Peg Pneus Atacarejo!\n\nPara te atender melhor, qual cidade fica mais perto de você?', BTNS_CIDADE, SYN_CIDADE)],
    on_error: { block: 89 }, no_answer: { block: 73 }, deletable: true, block_uuid: UUID.b69 },

  // Bloco 70 (step 36) — outra resposta
  { x: 500, y: 500, z: 100, id: 70, goto: null, name: 'Enviar mensagem', step: 36, type: 'question', width: 400, height: 300,
    actions: [posMsg(316, LINKS_CIDADE, 'Entendi! Para te atender melhor, qual das nossas unidades fica mais acessível para você?', BTNS_CIDADE, SYN_CIDADE)],
    on_error: { block: 89 }, no_answer: { block: 103 }, deletable: true, block_uuid: UUID.b70 },

  // Bloco 72 (step 32) — WA Araraquara
  { x: 1100, y: -300, z: 100, id: 72, goto: { block: 99 }, name: 'Enviar mensagem', step: 32, type: 'question', width: 400, height: 200,
    actions: [posMsg(317, [], 'Perfeito! Entre em contato no WhatsApp para um atendimento mais rápido e personalizado!', [{ text: '📞 (16) 3322-5634', type: 'url', url: WA_ARA }], [[]])],
    on_error: { block: 89 }, deletable: true, block_uuid: UUID.b72 },

  // Bloco 73 (step 29) — timer 900s → bloco 92
  { x: 1100, y: -100, z: 100, id: 73, goto: null, name: 'Pausar', step: 29, type: 'question', width: 400, height: 80,
    actions: [posWait(268, 92, 900)], deletable: true, block_uuid: UUID.b73 },

  // Bloco 74 (step 34) — WA Sorocaba
  { x: 1100, y: 100, z: 100, id: 74, goto: { block: 100 }, name: 'Enviar mensagem', step: 34, type: 'question', width: 400, height: 200,
    actions: [posMsg(318, [], 'Show! Entre pelo WhatsApp e receba um atendimento rápido e exclusivo!', [{ text: '📞 (15) 3191-1031', type: 'url', url: WA_SOR }], [[]])],
    on_error: { block: 89 }, deletable: true, block_uuid: UUID.b74 },

  // Bloco 89 (step 26) — fallback: change_status Humano
  { x: 1500, y: 700, z: 100, id: 89, goto: { block: 90 }, name: 'Mudar o status do lead', step: 26, type: 'question', width: 400, height: 100,
    actions: [{ id: 319, sort: 0, ...PA_HUMANO }], deletable: true, block_uuid: UUID.b89 },

  // Bloco 90 (step 27) — fallback: change_responsible Bruna
  { x: 1900, y: 700, z: 100, id: 90, goto: null, name: 'Mudar usuário resp.', step: 27, type: 'question', width: 400, height: 100,
    actions: [{ id: 320, sort: 0, ...PA_RESP_BRUNA }], deletable: true, block_uuid: UUID.b90 },

  // Bloco 91 (step 28) — finish fallback
  { x: 2300, y: 700, z: 100, id: 91, step: 28, type: 'finish', width: 374, height: 62,
    actions: [{ id: 321, sort: 0, links: [], params: { params: [], handler: '_stop' } }], deletable: true },

  // Bloco 92 (step 30) — retry DM (else → bloco 70)
  { x: 800, y: 1000, z: 100, id: 92, goto: { block: 70 }, name: 'Enviar mensagem', step: 30, type: 'question', width: 400, height: 300,
    actions: [posMsg(322, LINKS_CIDADE, 'Oi, {{contact.first_name}}! Vi que você entrou em contato com a Peg Pneus.\n\nAinda posso te ajudar! Qual cidade fica mais perto de você?', BTNS_CIDADE, SYN_CIDADE)],
    on_error: { block: 89 }, no_answer: { block: 98 }, deletable: true, block_uuid: UUID.b92 },

  // Bloco 98 (step 31) — timer 7200s → bloco 92 (loop)
  { x: 1300, y: 1000, z: 100, id: 98, goto: null, name: 'Pausar', step: 31, type: 'question', width: 400, height: 80,
    actions: [posWait(323, 92, 7200)], deletable: true, block_uuid: UUID.b98 },

  // Bloco 99 (step 33) — finish Araraquara
  { x: 1500, y: -300, z: 100, id: 99,  step: 33, type: 'finish', width: 374, height: 62,
    actions: [{ id: 324, sort: 0, links: [], params: { params: [], handler: '_stop' } }], deletable: true },

  // Bloco 100 (step 35) — finish Sorocaba
  { x: 1500, y: 100,  z: 100, id: 100, step: 35, type: 'finish', width: 374, height: 62,
    actions: [{ id: 325, sort: 0, links: [], params: { params: [], handler: '_stop' } }], deletable: true },

  // Bloco 103 (step 37) — timer 900s (de bloco 70) → bloco 92
  { x: 1100, y: 500, z: 100, id: 103, goto: null, name: 'Pausar', step: 37, type: 'question', width: 400, height: 80,
    actions: [posWait(326, 92, 900)], deletable: true, block_uuid: UUID.b103 },

  // Bloco 104 (step 38) — msg atendente → fallback
  { x: 1100, y: 700, z: 100, id: 104, goto: { block: 89 }, name: 'Enviar mensagem', step: 38, type: 'question', width: 400, height: 200,
    actions: [posMsg(327, [], 'Vou te conectar com um dos nossos atendentes agora.\n\nEles vão entrar em contato em breve, ou se preferir, já pode falar direto pelo WhatsApp!', [], [])],
    on_error: { block: 89 }, deletable: true, block_uuid: UUID.b104 },
];

// ─── Monta e salva ────────────────────────────────────────────────────────────
function readJsonNoBOM(filePath) {
  const buf = fs.readFileSync(filePath);
  const str = (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) ? buf.slice(3).toString('utf8') : buf.toString('utf8');
  return JSON.parse(str);
}
const tplBase = readJsonNoBOM(path.join(outDir, 'exported-dm-comentarios.json'));

const output = {
  type_functionality: tplBase.type_functionality,
  model: {
    text:      JSON.stringify(modelDM),
    name:      'DM DIRETO — Atendimento Peg Pneus',
    positions: JSON.stringify(posDM),
    type:      tplBase.model.type,
  },
};

const outFile = path.join(outDir, 'kommo-dm-direto.json');
fs.writeFileSync(outFile, '﻿' + JSON.stringify(output, null, 2), 'utf8');

console.log('✅', outFile);
console.log('\nFluxo:');
console.log('  Qualquer DM → Muda status "Contato Inicial Bot"');
console.log('  → Pergunta cidade [Araraquara | Sorocaba | Falar com atendente]');
console.log('  → Araraquara: WA (16) 3322-5634 → fim');
console.log('  → Sorocaba:   WA (15) 3191-1031 → fim');
console.log('  → Atendente:  transfere para Bruna + status Humano');
console.log('  → Sem resposta 15min: retry | Sem resposta 2h: loop retry');
console.log('  → Qualquer erro: fallback Bruna + status Humano');
console.log('\n📋 Kommo → Automações → Bots → IMPORTAR');
