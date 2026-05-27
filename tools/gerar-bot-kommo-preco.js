'use strict';
/**
 * Gera 2 bots Kommo no formato exato para importação:
 * 1. output/kommo-preco-comentario.json — responde no comentário (3 rotações) → "confira a DM"
 * 2. output/kommo-preco-dm.json        — envia DM com botões cidade → WhatsApp
 *
 * Uso: node tools/gerar-bot-kommo-preco.js
 */

const fs   = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

// Encoding mojibake: Kommo armazena/exporta em latin1, então precisamos
// converter UTF-8 → latin1 ao gerar arquivos de importação.
const moji = str => Buffer.from(str, 'utf8').toString('latin1');

// ─── PALAVRAS DE PREÇO (133 gatilhos) ───────────────────────────────────────
const PALAVRAS = [
  'quanto','Quanto','QUANTO',
  'valor','Valor','VALOR',
  'preço','Preço','PREÇO',
  'preco','Preco','PRECO',
  'custa','Custa','CUSTA',
  'custam','Custam',
  'fica','Fica',
  'sai','Sai',
  'orçamento','Orçamento','ORÇAMENTO',
  'orcamento','Orcamento',
  'orça','Orça','orca','Orca',
  'cotação','Cotação','cotacao','Cotacao',
  'tabela','Tabela','TABELA',
  'tabela de preço','Tabela de preço','tabela de preco',
  'lista de preco','lista de preço','Lista de preços',
  'qual o valor','Qual o valor','QUAL O VALOR',
  'qual o preco','qual o preço','Qual o preço',
  'quanto custa','Quanto custa','QUANTO CUSTA',
  'quanto custam','Quanto custam',
  'quanto fica','Quanto fica',
  'quanto sai','Quanto sai',
  'quanto é','Quanto é',
  'quanto e','Quanto e',
  'quanto ta','quanto tá','Quanto tá',
  'qual o preco desse','qual o preço desse',
  'qual o preco disso','qual o preço disso',
  'manda o preço','manda o preco','Manda o preço',
  'manda preco','manda preço',
  'passa o preço','passa o preco','Passa o preço',
  'me passa o preço','Me passa o preço',
  'me manda o preço','Me manda o preço',
  'me fala o preço','Me fala o preço',
  'me fala o valor','Me fala o valor',
  'preço do pneu','Preço do pneu','preco do pneu',
  'preço dos pneus','Preço dos pneus',
  'valor do pneu','Valor do pneu',
  'valor dos pneus','Valor dos pneus',
  'qual o preco do jogo','qual o preço do jogo',
  'quanto o jogo','Quanto o jogo',
  'quanto o par','Quanto o par',
  'quanto o kit','Quanto o kit',
  'precinho','Precinho',
  'me diz o preço','Me diz o preço',
  'qual valor','Qual valor',
  'quero orçamento','Quero orçamento',
  'pede orçamento','faz orçamento',
  'qual o preco minimo','qual o preço mínimo',
  'preço atacado','Preço atacado','preco atacado',
  'valor atacado','Valor atacado',
  'preço para revenda','Preço para revenda',
  'preço no atacado','Preço no atacado',
  'preço varejo','Preço varejo',
  'custo','Custo','CUSTO',
  'tem preço','Tem preço','tem preco',
  'tem tabela','Tem tabela',
];

// ─── 3 RESPOSTAS NO COMENTÁRIO ───────────────────────────────────────────────
const RESPOSTAS = [
  'Oi {{contact.first_name}} ! 😊 Te mandei uma DM com os detalhes, confere lá! 💚',
  'Olá {{contact.first_name}} ! 🔥 Mandei as informações no seu direct, é só conferir! ✅',
  '{{contact.first_name}} , já te mandei uma mensagem privada com tudo! 📩 Confere a DM! 😊',
];

// ─── HELPER: condition step ───────────────────────────────────────────────────
function makeConditions(palavras, gotoStep, withTip) {
  return palavras.map((palavra, i) => {
    const p = {
      logic: 'and',
      result: [{ params: { step: gotoStep, type: 'question' }, handler: 'goto' }],
      conditions: [{
        term1:      '{{comment}}',
        term2:      moji(palavra),
        operation:  'contains',
        value_type: 'custom_value',
      }],
    };
    if (withTip && i === 0) {
      p.tipText        = moji('Defina uma palavra-chave — você pode alterá-la a qualquer momento!');
      p.tipTitle       = moji('Sua palavra-chave aciona o bot');
      p.tipImageSrc    = '/frontend/images/interface/wizard_influencers/tips/send_promo_code/condition_tip_pt.png';
      p.tipFeatureName = '';
    }
    return { params: p, handler: 'conditions' };
  });
}

// ─── HELPER: condition actions (positions) ────────────────────────────────────
function makeCondActions(palavras, gotoBlock, startId, withTip) {
  let id = startId;
  return palavras.map((palavra, i) => {
    const pp = {
      logic:  'and',
      result: [],
      conditions: [{
        term1:      '{{comment}}',
        term2:      moji(palavra),
        operation:  'contains',
        value_type: 'custom_value',
      }],
    };
    if (withTip && i === 0) {
      pp.tipText        = moji('Defina uma palavra-chave — você pode alterá-la a qualquer momento!');
      pp.tipTitle       = moji('Sua palavra-chave aciona o bot');
      pp.tipImageSrc    = '/frontend/images/interface/wizard_influencers/tips/send_promo_code/condition_tip_pt.png';
      pp.tipFeatureName = '';
    }
    return { id: id++, sort: i, links: [{ block: gotoBlock }], params: { params: pp, handler: 'conditions' } };
  });
}


// ════════════════════════════════════════════════════════════════════════════════
// BOT 1 — COMENTÁRIO (3 rotações → "confira a DM")
// ════════════════════════════════════════════════════════════════════════════════

const C_UUID_COND = randomUUID();
const C_UUID_DIST = randomUUID();
const C_UUID_MSG1 = randomUUID();
const C_UUID_MSG2 = randomUUID();
const C_UUID_MSG3 = randomUUID();
const C_UUID_SEED = randomUUID();

const C_BLK_COND = 3;
const C_BLK_DIST = 15;
const C_BLK_MSG1 = 31;
const C_BLK_MSG2 = 32;
const C_BLK_MSG3 = 33;

const comentModel = {
  '0': {
    question:   makeConditions(PALAVRAS, 6, true),
    block_uuid: C_UUID_COND,
  },
  '6': {
    question: [{
      params: {
        type:     'round_robin',
        seed_id:  C_UUID_SEED,
        variants: [
          { step: 12, type: 'question' },
          { step: 13, type: 'question' },
          { step: 14, type: 'question' },
        ],
      },
      handler: 'distribution',
    }],
    block_uuid: C_UUID_DIST,
  },
  '12': {
    question: [{
      params: {
        text:                     moji(RESPOSTAS[0]),
        recipient:                { type: 'all_contacts', way_of_communication: 'over_all' },
        is_in_starting_block:     true,
        send_to_all_chat_sources: true,
      },
      handler: 'send_comment',
    }],
    block_uuid: C_UUID_MSG1,
  },
  '13': {
    question: [{
      params: {
        text:                     moji(RESPOSTAS[1]),
        recipient:                { type: 'all_contacts', way_of_communication: 'over_all' },
        is_in_starting_block:     true,
        send_to_all_chat_sources: true,
      },
      handler: 'send_comment',
    }],
    block_uuid: C_UUID_MSG2,
  },
  '14': {
    question: [{
      params: {
        text:                     moji(RESPOSTAS[2]),
        recipient:                { type: 'all_contacts', way_of_communication: 'over_all' },
        is_in_starting_block:     true,
        send_to_all_chat_sources: true,
      },
      handler: 'send_comment',
    }],
    block_uuid: C_UUID_MSG3,
  },
  conversation: false,
};

let cId = 1000;
const cCondActions = makeCondActions(PALAVRAS, C_BLK_DIST, cId, true);
cId += PALAVRAS.length;

const condHeight = Math.max(200, PALAVRAS.length * 62 + 20);

const comentPositions = [
  {
    x: -3, y: 65, z: 65,
    id: 0,
    goto: { block: C_BLK_COND },
    step: -1,
    type: 'start',
    width: 170, height: 38,
    actions: [{ id: -3, sort: 0, links: [], params: { params: [], handler: '_start' } }],
    deletable: true,
  },
  {
    x: -350, y: 0, z: 10,
    id: -1,
    code: 'trigger',
    step: -1,
    type: 'static',
    width: 260, height: 0,
    actions: [],
    deletable: true,
  },
  {
    x: 215, y: 65, z: 64,
    id: C_BLK_COND,
    goto: { block: C_BLK_DIST },
    name: moji('Verificar palavra-chave'),
    step: 0,
    type: 'question',
    width: 400, height: condHeight,
    actions: cCondActions,
    deletable: true,
    block_uuid: C_UUID_COND,
  },
  {
    x: 708, y: 65, z: 22,
    id: C_BLK_DIST,
    name: moji('Respostas de comentários'),
    step: 6,
    type: 'question',
    width: 400, height: 187,
    actions: [
      { id: cId++, sort: 0, links: [{ block: C_BLK_MSG1 }], params: { params: { type: 'round_robin', variants: [] }, handler: 'distribution' } },
      { id: cId++, sort: 1, links: [{ block: C_BLK_MSG2 }], params: { params: { type: 'round_robin', variants: [] }, handler: 'distribution' } },
      { id: cId++, sort: 2, links: [{ block: C_BLK_MSG3 }], params: { params: { type: 'round_robin', variants: [] }, handler: 'distribution' } },
    ],
    seed_id:    C_UUID_SEED,
    deletable:  true,
    block_uuid: C_UUID_DIST,
  },
  {
    x: 1273, y: 65, z: 69,
    id: C_BLK_MSG1,
    goto: null,
    name: moji('Comentar'),
    step: 12,
    type: 'question',
    width: 400, height: 124,
    actions: [{
      id: cId++, sort: 0, links: [],
      params: { params: { text: moji(RESPOSTAS[0]), recipient: { type: 'all_contacts', way_of_communication: 'over_all' }, is_in_starting_block: true, send_to_all_chat_sources: true }, handler: 'send_comment' },
    }],
    deletable: true,
    block_uuid: C_UUID_MSG1,
  },
  {
    x: 1273, y: 272, z: 74,
    id: C_BLK_MSG2,
    goto: null,
    name: moji('Comentar'),
    step: 13,
    type: 'question',
    width: 400, height: 124,
    actions: [{
      id: cId++, sort: 0, links: [],
      params: { params: { text: moji(RESPOSTAS[1]), recipient: { type: 'all_contacts', way_of_communication: 'over_all' }, is_in_starting_block: true, send_to_all_chat_sources: true }, handler: 'send_comment' },
    }],
    deletable: true,
    block_uuid: C_UUID_MSG2,
  },
  {
    x: 1273, y: 494, z: 77,
    id: C_BLK_MSG3,
    goto: null,
    name: moji('Comentar'),
    step: 14,
    type: 'question',
    width: 400, height: 124,
    actions: [{
      id: cId++, sort: 0, links: [],
      params: { params: { text: moji(RESPOSTAS[2]), recipient: { type: 'all_contacts', way_of_communication: 'over_all' }, is_in_starting_block: true, send_to_all_chat_sources: true }, handler: 'send_comment' },
    }],
    deletable: true,
    block_uuid: C_UUID_MSG3,
  },
];

const comentBot = {
  type_functionality: 0,
  model:     { text: JSON.stringify(comentModel) },
  name:      moji('PREÇO — Resposta Comentário'),
  positions: JSON.stringify(comentPositions),
  type:      2,
};


// ════════════════════════════════════════════════════════════════════════════════
// BOT 2 — DM (cidade → WhatsApp)
// ════════════════════════════════════════════════════════════════════════════════

const D_UUID_COND  = randomUUID();
const D_UUID_CITY  = randomUUID();
const D_UUID_TIMER = randomUUID();
const D_UUID_RETRY = randomUUID();
const D_UUID_AQA   = randomUUID();
const D_UUID_SOR   = randomUUID();
const D_UUID_ELSE  = randomUUID();

// Block IDs for positions
const D_BLK_COND  = 3;
const D_BLK_CITY  = 6;
const D_BLK_AQA   = 37;
const D_BLK_TIMER = 39;
const D_BLK_RETRY = 40;
const D_BLK_SOR   = 52;
const D_BLK_ELSE  = 53;
const D_BLK_FIN1  = 61;
const D_BLK_FIN2  = 69;
const D_BLK_FIN3  = 70;
const D_BLK_FIN4  = 72;
const D_BLK_FIN5  = 73;
const D_BLK_FIN6  = 75;

const cityButtons = [
  { text: 'Araraquara', type: 'inline' },
  { text: 'Sorocaba',   type: 'inline' },
];

const cityAnswer = [{
  params: [
    { value: 'Araraquara', params: [{ params: { step: 20, type: 'question' }, handler: 'goto' }], synonyms: ['araraquara', 'aqa'] },
    { value: 'Sorocaba',   params: [{ params: { step: 21, type: 'question' }, handler: 'goto' }], synonyms: ['sorocaba', 'sor'] },
    { type: 'else',        params: [{ params: { step: 22, type: 'question' }, handler: 'goto' }] },
  ],
  handler: 'buttons',
}];

const dmModel = {
  '0': {
    question:   makeConditions(PALAVRAS, 23, true),
    block_uuid: D_UUID_COND,
  },
  '23': {
    answer: cityAnswer,
    question: [{
      params: {
        tag:  '',
        text: moji('Olá, {{contact.first_name}} ! Seja bem-vindo à Peg Pneus Atacarejo! 😊 \n\nPara te atender melhor, qual cidade fica mais perto de você?'),
        type: 'external',
        buttons: cityButtons,
        on_error: { params: { step: 17, type: 'question' }, handler: 'goto' },
        recipient: { type: 'all_contacts', way_of_communication: 'over_all' },
        is_in_starting_block:     true,
        send_to_all_chat_sources: true,
      },
      handler: 'send_message',
    }],
    no_answer:  { params: { step: 16, type: 'question' }, handler: 'goto' },
    block_uuid: D_UUID_CITY,
  },
  '16': {
    question: [{
      params: {
        logic: 'or',
        conditions: [{
          event:  { delay: 900, action: 'ended', source: 'timer' },
          action: { step: 17, type: 'question' },
        }],
      },
      handler: 'waits',
    }],
    block_uuid: D_UUID_TIMER,
  },
  '17': {
    answer: cityAnswer,
    question: [{
      params: {
        tag:  '',
        text: moji('Oi, {{contact.first_name}} ! 😊 Vi que você se interessou pela Peg Pneus!\n\nAinda posso te ajudar a encontrar o pneu ideal. \n\nQual cidade fica mais perto de você?'),
        type: 'external',
        buttons: cityButtons,
        on_error: { params: { step: 31, type: 'finish' }, handler: 'goto' },
        recipient: { type: 'all_contacts', way_of_communication: 'over_all' },
        is_in_starting_block:     false,
        send_to_all_chat_sources: true,
      },
      handler: 'send_message',
    }],
    block_uuid: D_UUID_RETRY,
  },
  '20': {
    question: [
      {
        params: {
          tag:  '',
          text: moji('Perfeito! Entre em contato no WhatsApp para um atendimento mais rápido e personalizado!'),
          type: 'external',
          buttons: [{ url: 'wa.me/551633225634', text: moji('📞 (16) 3322-5634'), type: 'url' }],
          on_error: { params: { step: 30, type: 'finish' }, handler: 'goto' },
          recipient: { type: 'all_contacts', way_of_communication: 'over_all' },
          is_in_starting_block:     false,
          send_to_all_chat_sources: true,
        },
        handler: 'send_message',
      },
      { params: { step: 26, type: 'finish' }, handler: 'goto' },
    ],
    block_uuid: D_UUID_AQA,
  },
  '21': {
    question: [
      {
        params: {
          tag:  '',
          text: moji('Show! Entre pelo WhatsApp e receba um atendimento rápido e exclusivo!'),
          type: 'external',
          buttons: [{ url: 'wa.me/551531911031', text: moji('📞 (15) 3191-1031'), type: 'url' }],
          on_error: { params: { step: 27, type: 'finish' }, handler: 'goto' },
          recipient: { type: 'all_contacts', way_of_communication: 'over_all' },
          is_in_starting_block:     false,
          send_to_all_chat_sources: true,
        },
        handler: 'send_message',
      },
      { params: { step: 25, type: 'finish' }, handler: 'goto' },
    ],
    block_uuid: D_UUID_SOR,
  },
  '22': {
    answer: [{
      params: [
        { value: 'Araraquara', params: [{ params: { step: 20, type: 'question' }, handler: 'goto' }], synonyms: ['araraquara', 'aqa'] },
        { value: 'Sorocaba',   params: [{ params: { step: 21, type: 'question' }, handler: 'goto' }], synonyms: ['sorocaba', 'sor'] },
        { type: 'else',        params: [{ params: { step: 0,  type: 'question' }, handler: 'goto' }] },
      ],
      handler: 'buttons',
    }],
    question: [{
      params: {
        tag:  '',
        text: moji('Entendi! 😊 Para te atender melhor, qual das nossas unidades fica mais acessível para você?'),
        type: 'external',
        buttons: cityButtons,
        on_error: { params: { step: 29, type: 'finish' }, handler: 'goto' },
        recipient: { type: 'all_contacts', way_of_communication: 'over_all' },
        is_in_starting_block:     false,
        send_to_all_chat_sources: true,
      },
      handler: 'send_message',
    }],
    block_uuid: D_UUID_ELSE,
  },
  conversation: false,
};

let dId = 200;
const dCondActions = makeCondActions(PALAVRAS, D_BLK_CITY, dId, true);
dId += PALAVRAS.length;

const dmPositions = [
  {
    x: -3, y: 65, z: 65,
    id: 0,
    goto: { block: D_BLK_COND },
    step: -1,
    type: 'start',
    width: 170, height: 38,
    actions: [{ id: -3, sort: 0, links: [], params: { params: [], handler: '_start' } }],
    deletable: true,
  },
  {
    x: -350, y: 0, z: 10,
    id: -1,
    code: 'trigger',
    step: -1,
    type: 'static',
    width: 260, height: 0,
    actions: [],
    deletable: true,
  },
  {
    x: 215, y: 65, z: 64,
    id: D_BLK_COND,
    goto: { block: D_BLK_CITY },
    name: moji('Verificar palavra-chave'),
    step: 0,
    type: 'question',
    width: 400, height: condHeight,
    actions: dCondActions,
    deletable: true,
    block_uuid: D_UUID_COND,
  },
  {
    x: 708, y: 0, z: 71,
    id: D_BLK_CITY,
    goto: { block: D_BLK_ELSE },
    name: moji('Mensagem'),
    step: 23,
    type: 'question',
    width: 400, height: 343,
    actions: [{
      id: dId++, sort: 0,
      links: [
        { data: { regex: '/Araraquara/iu' }, block: D_BLK_AQA },
        { data: { regex: '/Sorocaba/iu' },   block: D_BLK_SOR },
      ],
      params: {
        params: {
          tag:  '',
          text: moji('Olá, {{contact.first_name}} ! Seja bem-vindo à Peg Pneus Atacarejo! 😊 \n\nPara te atender melhor, qual cidade fica mais perto de você?'),
          type: 'external',
          buttons: cityButtons,
          recipient: { type: 'all_contacts', way_of_communication: 'over_all' },
          is_in_starting_block:     true,
          send_to_all_chat_sources: true,
        },
        handler: 'send_message',
      },
      synonyms: [['araraquara', 'aqa'], ['sorocaba', 'sor']],
    }],
    on_error:   { block: D_BLK_RETRY },
    deletable:  true,
    no_answer:  { block: D_BLK_TIMER },
    block_uuid: D_UUID_CITY,
  },
  {
    x: 1293, y: -231, z: 95,
    id: D_BLK_AQA,
    goto: { block: D_BLK_FIN5 },
    name: moji('Enviar mensagem'),
    step: 20,
    type: 'question',
    width: 400, height: 219,
    actions: [{
      id: dId++, sort: 0,
      links: [],
      params: {
        params: {
          tag:  '',
          text: moji('Perfeito! Entre em contato no WhatsApp para um atendimento mais rápido e personalizado!'),
          type: 'external',
          buttons: [{ url: 'wa.me/551633225634', text: moji('📞 (16) 3322-5634'), type: 'url' }],
          recipient: { type: 'all_contacts', way_of_communication: 'over_all' },
          is_in_starting_block:     false,
          send_to_all_chat_sources: true,
        },
        handler: 'send_message',
      },
      synonyms: [[]],
    }],
    on_error:   { block: D_BLK_FIN2 },
    deletable:  true,
    block_uuid: D_UUID_AQA,
  },
  {
    x: 1293, y: 952, z: 67,
    id: D_BLK_TIMER,
    name: moji('Pausar'),
    step: 16,
    type: 'question',
    width: 400, height: 0,
    actions: [{
      id: dId++, sort: 0,
      links: [{ block: D_BLK_RETRY }],
      params: { params: { event: { delay: 900, action: 'ended', source: 'timer' } }, handler: 'wait' },
    }],
    deletable:  true,
    block_uuid: D_UUID_TIMER,
  },
  {
    x: 1293, y: 1127, z: 37,
    id: D_BLK_RETRY,
    goto: { block: D_BLK_CITY },
    name: moji('Enviar mensagem'),
    step: 17,
    type: 'question',
    width: 400, height: 0,
    actions: [{
      id: dId++, sort: 0,
      links: [
        { data: { regex: '/Araraquara/iu' }, block: D_BLK_AQA },
        { data: { regex: '/Sorocaba/iu' },   block: D_BLK_SOR },
      ],
      params: {
        params: {
          tag:  '',
          text: moji('Oi, {{contact.first_name}} ! 😊 Vi que você se interessou pela Peg Pneus!\n\nAinda posso te ajudar a encontrar o pneu ideal. \n\nQual cidade fica mais perto de você?'),
          type: 'external',
          buttons: cityButtons,
          recipient: { type: 'all_contacts', way_of_communication: 'over_all' },
          is_in_starting_block:     false,
          send_to_all_chat_sources: true,
        },
        handler: 'send_message',
      },
      synonyms: [['araraquara', 'aqa'], ['sorocaba', 'sor']],
    }],
    on_error:   { block: D_BLK_FIN6 },
    deletable:  true,
    block_uuid: D_UUID_RETRY,
  },
  {
    x: 1293, y: 103, z: 28,
    id: D_BLK_SOR,
    goto: { block: D_BLK_FIN1 },
    name: moji('Enviar mensagem'),
    step: 21,
    type: 'question',
    width: 400, height: 199,
    actions: [{
      id: dId++, sort: 0,
      links: [],
      params: {
        params: {
          tag:  '',
          text: moji('Show! Entre pelo WhatsApp e receba um atendimento rápido e exclusivo!'),
          type: 'external',
          buttons: [{ url: 'wa.me/551531911031', text: moji('📞 (15) 3191-1031'), type: 'url' }],
          recipient: { type: 'all_contacts', way_of_communication: 'over_all' },
          is_in_starting_block:     false,
          send_to_all_chat_sources: true,
        },
        handler: 'send_message',
      },
      synonyms: [[], []],
    }],
    on_error:   { block: D_BLK_FIN3 },
    deletable:  true,
    block_uuid: D_UUID_SOR,
  },
  {
    x: 1293, y: 493, z: 38,
    id: D_BLK_ELSE,
    goto: { block: D_BLK_CITY },
    name: moji('Enviar mensagem'),
    step: 22,
    type: 'question',
    width: 400, height: 303,
    actions: [{
      id: dId++, sort: 0,
      links: [
        { data: { regex: '/Araraquara/iu' }, block: D_BLK_AQA },
        { data: { regex: '/Sorocaba/iu' },   block: D_BLK_SOR },
      ],
      params: {
        params: {
          tag:  '',
          text: moji('Entendi! 😊 Para te atender melhor, qual das nossas unidades fica mais acessível para você?'),
          type: 'external',
          buttons: cityButtons,
          recipient: { type: 'all_contacts', way_of_communication: 'over_all' },
          is_in_starting_block:     false,
          send_to_all_chat_sources: true,
        },
        handler: 'send_message',
      },
      synonyms: [['araraquara', 'aqa'], ['sorocaba', 'sor']],
    }],
    on_error:   { block: D_BLK_FIN4 },
    deletable:  true,
    no_answer:  null,
    block_uuid: D_UUID_ELSE,
  },
  // Finish blocks
  { x: 1812, y: 168,  z: 98, id: D_BLK_FIN1, step: 25, type: 'finish', width: 374, height: 62, actions: [{ id: dId++, sort: 0, links: [], params: { params: [], handler: '_stop' } }], deletable: true },
  { x: 1812, y: 1200, z: 61, id: D_BLK_FIN2, step: 30, type: 'finish', width: 374, height: 0,  actions: [{ id: dId++, sort: 0, links: [], params: { params: [], handler: '_stop' } }], deletable: true },
  { x: 1812, y: 302,  z: 36, id: D_BLK_FIN3, step: 27, type: 'finish', width: 374, height: 62, actions: [{ id: dId++, sort: 0, links: [], params: { params: [], handler: '_stop' } }], deletable: true },
  { x: 1812, y: 1275, z: 56, id: D_BLK_FIN4, step: 29, type: 'finish', width: 374, height: 0,  actions: [{ id: dId++, sort: 0, links: [], params: { params: [], handler: '_stop' } }], deletable: true },
  { x: 1812, y: -166, z: 30, id: D_BLK_FIN5, step: 26, type: 'finish', width: 374, height: 62, actions: [{ id: dId++, sort: 0, links: [], params: { params: [], handler: '_stop' } }], deletable: true },
  { x: 1812, y: 940,  z: 64, id: D_BLK_FIN6, step: 31, type: 'finish', width: 374, height: 0,  actions: [{ id: dId++, sort: 0, links: [], params: { params: [], handler: '_stop' } }], deletable: true },
];

const dmBot = {
  type_functionality: 0,
  model:     { text: JSON.stringify(dmModel) },
  name:      moji('PREÇO — DM Cidade + WhatsApp'),
  positions: JSON.stringify(dmPositions),
  type:      2,
};


// ─── OUTPUT ──────────────────────────────────────────────────────────────────
const outDir = path.join(__dirname, '../output');
fs.mkdirSync(outDir, { recursive: true });

const outComent = path.join(outDir, 'kommo-preco-comentario.json');
const outDm     = path.join(outDir, 'kommo-preco-dm.json');

fs.writeFileSync(outComent, JSON.stringify(comentBot, null, 2), 'latin1');
fs.writeFileSync(outDm,     JSON.stringify(dmBot,     null, 2), 'latin1');

console.log(`✅ Gerado: ${outComent}`);
console.log(`✅ Gerado: ${outDm}`);
console.log(`   Palavras-gatilho: ${PALAVRAS.length}`);
console.log(`   Bot 1: resposta no comentário (3 rotações)`);
console.log(`   Bot 2: DM cidade → WhatsApp`);
console.log(`\n📋 Kommo → Automações → Bots → IMPORTAR → selecione cada arquivo`);
