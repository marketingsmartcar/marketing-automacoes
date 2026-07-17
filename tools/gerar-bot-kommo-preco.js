'use strict';
/**
 * Gera 2 bots Kommo para importação (baseados nos templates exportados).
 * Uso: node tools/gerar-bot-kommo-preco.js
 */

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const outDir = path.join(__dirname, '../output');
fs.mkdirSync(outDir, { recursive: true });

// ─── IDs Kommo ────────────────────────────────────────────────────────────────
const USER_BRUNA   = 15342631;   // Bruna (comercial)

// Funil Redes Sociais (Instagram, Facebook, TikTok)
const STATUS_RS_CONTATO_BOT = 106784471; // Contanto Inicial Bot
const STATUS_RS_HUMANO      = 106784475; // Transferido p/ Humano
const STATUS_RS_RESPONDIDO  = 106784479; // Respondido pelo Bot

// ─── PALAVRAS DE PREÇO (138 gatilhos) ────────────────────────────────────────
const PALAVRAS_RAW = [
  'quanto','Quanto','QUANTO',
  'valor','Valor','VALOR',
  'preco','Preco','PRECO',
  'custa','Custa','CUSTA',
  'custam','Custam',
  'fica','Fica',
  'sai','Sai',
  'orcamento','Orcamento',
  'orca','Orca',
  'cotacao','Cotacao',
  'tabela','Tabela','TABELA',
  'tabela de preco','Tabela de preco',
  'lista de preco',
  'qual o valor','Qual o valor','QUAL O VALOR',
  'qual o preco','Qual o preco',
  'quanto custa','Quanto custa','QUANTO CUSTA',
  'quanto custam','Quanto custam',
  'quanto fica','Quanto fica',
  'quanto sai','Quanto sai',
  'quanto e','Quanto e',
  'quanto ta',
  'qual o preco desse',
  'qual o preco disso',
  'manda o preco','Manda o preco',
  'manda preco',
  'passa o preco','Passa o preco',
  'me passa o preco',
  'me manda o preco',
  'me fala o preco',
  'me fala o valor',
  'preco do pneu','Preco do pneu',
  'preco dos pneus',
  'valor do pneu','Valor do pneu',
  'valor dos pneus',
  'qual o preco do jogo',
  'quanto o jogo','Quanto o jogo',
  'quanto o par','Quanto o par',
  'quanto o kit','Quanto o kit',
  'precinho','Precinho',
  'me diz o preco',
  'qual valor','Qual valor',
  'quero orcamento','Quero orcamento',
  'pede orcamento','faz orcamento',
  'qual o preco minimo',
  'preco atacado','Preco atacado',
  'valor atacado','Valor atacado',
  'preco para revenda',
  'preco no atacado',
  'preco varejo',
  'custo','Custo','CUSTO',
  'tem preco','Tem preco',
  'tem tabela','Tem tabela',
  // Com acentos
  'quanto é','Quanto é',
  'quanto tá',
  'orçamento','Orçamento','ORÇAMENTO',
  'orça','Orça',
  'cotação','Cotação',
  'tabela de preço','Tabela de preço',
  'lista de preço','Lista de preços',
  'qual o preço','Qual o preço',
  'manda o preço','Manda o preço',
  'manda preço',
  'passa o preço','Passa o preço',
  'me passa o preço',
  'me manda o preço',
  'me fala o preço',
  'preço do pneu','Preço do pneu',
  'preço dos pneus','Preço dos pneus',
  'qual o preço do jogo',
  'preço atacado','Preço atacado',
  'preço para revenda',
  'preço no atacado',
  'preço varejo',
  'tem preço','Tem preço',
  'me diz o preço',
  'quero orçamento','Quero orçamento',
  'qual o preço mínimo',
  'preço','Preço','PREÇO',
];
const PALAVRAS = [...new Set(PALAVRAS_RAW)];

// ─── AÇÕES CRM (handlers nativos Kommo: handler sempre "action") ──────────────
const PIPELINE_RS = 13839039;  // Funil Redes Sociais

const ACTION_CHANGE_RESP = {
  params:  { name: 'change_responsible_user', params: { value: USER_BRUNA, type: 1, element_type: 1, contact_type: 'main' } },
  handler: 'action',
};

// Etapas do funil Redes Sociais
const ACTION_RS_CONTATO_BOT = {
  params: { name: 'change_status', params: { value: STATUS_RS_CONTATO_BOT, pipeline_id: PIPELINE_RS } },
  handler: 'action',
};
const ACTION_RS_RESPONDIDO = {
  params: { name: 'change_status', params: { value: STATUS_RS_RESPONDIDO, pipeline_id: PIPELINE_RS } },
  handler: 'action',
};
const ACTION_RS_HUMANO = {
  params: { name: 'change_status', params: { value: STATUS_RS_HUMANO, pipeline_id: PIPELINE_RS } },
  handler: 'action',
};

// Versão para positions (params aninhado)
const POS_ACTION_RESP = {
  links: [],
  params: { params: { name: 'change_responsible_user', params: { value: USER_BRUNA, type: 'contact_main' } }, handler: 'action' },
};
const POS_ACTION_RS_CONTATO_BOT = {
  links: [],
  params: { params: { name: 'change_status', params: { value: STATUS_RS_CONTATO_BOT, pipeline_id: PIPELINE_RS } }, handler: 'action' },
};
const POS_ACTION_RS_RESPONDIDO = {
  links: [],
  params: { params: { name: 'change_status', params: { value: STATUS_RS_RESPONDIDO, pipeline_id: PIPELINE_RS } }, handler: 'action' },
};
const POS_ACTION_RS_HUMANO = {
  links: [],
  params: { params: { name: 'change_status', params: { value: STATUS_RS_HUMANO, pipeline_id: PIPELINE_RS } }, handler: 'action' },
};

// ─── TEXTOS DAS MENSAGENS (plain UTF-8 — sem mojibake) ───────────────────────
const WA_MSG_PADRAO = encodeURIComponent('Oi, vim do instagram para saber mais sobre valores');

const RESPOSTAS = [
  'Oi {{contact.first_name}} ! 😊 Te mandei uma DM com os detalhes, confere lá! 💚',
  'Olá {{contact.first_name}} ! 🔥 Mandei as informações no seu direct, é só conferir! ✅',
  '{{contact.first_name}} , já te mandei uma mensagem privada com tudo! 📩 Confere a DM! 😊',
];

const DM_TEXTS = {
  '23': 'Olá, {{contact.first_name}} ! Seja bem-vindo à Peg Pneus Atacarejo! 😊 \n\nPara te atender melhor, qual cidade fica mais perto de você?',
  '17': 'Oi, {{contact.first_name}} ! 😊 Vi que você se interessou pela Peg Pneus!\n\nAinda posso te ajudar a encontrar o pneu ideal. \n\nQual cidade fica mais perto de você?',
  '20': { text: 'Perfeito! Entre em contato no WhatsApp para um atendimento mais rápido e personalizado!', btn: '📞 (16) 3322-5634', url: `wa.me/551633225634?text=${WA_MSG_PADRAO}` },
  '21': { text: 'Show! Entre pelo WhatsApp e receba um atendimento rápido e exclusivo!',                  btn: '📞 (15) 3191-1031', url: `wa.me/551531911031?text=${WA_MSG_PADRAO}` },
  '22': 'Entendi! 😊 Para te atender melhor, qual das nossas unidades fica mais acessível para você?',
};

// ─── UTILIDADES ───────────────────────────────────────────────────────────────
function readJsonNoBOM(filePath) {
  const buf = fs.readFileSync(filePath);
  const str = buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF
    ? buf.slice(3).toString('utf8')
    : buf.toString('utf8');
  return JSON.parse(str);
}

function buildConditions(palavras, gotoStep) {
  const conds = palavras.map((palavra, i) => {
    const params = {
      logic:  'and',
      result: [{ params: { step: gotoStep, type: 'question' }, handler: 'goto' }],
    };
    if (i === 0) {
      params.tipText        = 'Defina uma palavra-chave — você pode alterá-la a qualquer momento!';
      params.tipTitle       = 'Sua palavra-chave aciona o bot';
      params.conditions     = [{ term1: '{{comment}}', term2: palavra, operation: 'contains', value_type: 'custom_value' }];
      params.tipImageSrc    = '/frontend/images/interface/wizard_influencers/tips/send_promo_code/condition_tip_pt.png';
      params.tipFeatureName = '';
    } else {
      params.conditions = [{ term1: '{{comment}}', term2: palavra, operation: 'contains', value_type: 'custom_value' }];
    }
    return { params, handler: 'conditions' };
  });
  conds.push({ params: { step: gotoStep, type: 'question' }, handler: 'goto' });
  return conds;
}

function buildCondActions(palavras, destBlock) {
  return palavras.map((palavra, i) => ({
    id:    200 + i,
    sort:  i,
    links: [{ block: destBlock }],
    params: {
      params: {
        logic:  'and',
        result: [],
        ...(i === 0 ? {
          tipText:        'Defina uma palavra-chave — você pode alterá-la a qualquer momento!',
          tipTitle:       'Sua palavra-chave aciona o bot',
          conditions:     [{ term1: '{{comment}}', term2: palavra, operation: 'contains', value_type: 'custom_value' }],
          tipImageSrc:    '/frontend/images/interface/wizard_influencers/tips/send_promo_code/condition_tip_pt.png',
          tipFeatureName: '',
        } : {
          conditions: [{ term1: '{{comment}}', term2: palavra, operation: 'contains', value_type: 'custom_value' }],
        }),
      },
      handler: 'conditions',
    },
  }));
}

// ════════════════════════════════════════════════════════════════════════════════
// BOT 1 — COMENTÁRIO
// ════════════════════════════════════════════════════════════════════════════════

const templateComent = readJsonNoBOM(path.join(outDir, 'exported-comentarios-preco.json'));
const modelComent    = JSON.parse(templateComent.model.text);
const posComent      = JSON.parse(templateComent.model.positions);

// Goto step do template (normalmente 6)
const gotoComent = modelComent['0'].question.find(q => q.handler === 'goto').params.step;

// Substitui conditions com 138 palavras
modelComent['0'].question = buildConditions(PALAVRAS, gotoComent);

// Adiciona ação CRM no step de distribuição (step 6): mover para "Respondido pelo Bot" (Redes Sociais)
const distStepKey = String(gotoComent);
const distStep    = modelComent[distStepKey];
if (distStep && !distStep.question.find(q => q.handler === 'action')) {
  distStep.question.push(ACTION_RS_RESPONDIDO);
}

// Atualiza textos das 3 respostas de comentário (steps 12, 13, 14)
modelComent['12'].question[0].params.text = RESPOSTAS[0];
modelComent['13'].question[0].params.text = RESPOSTAS[1];
modelComent['14'].question[0].params.text = RESPOSTAS[2];

// Positions — bloco conditions (step 0)
const condBlockComent = posComent.find(b => b.step === 0);
if (condBlockComent) {
  const destBlock = condBlockComent.actions[0]?.links?.[0]?.block ?? 15;
  condBlockComent.actions = buildCondActions(PALAVRAS, destBlock);
  condBlockComent.height  = Math.max(400, PALAVRAS.length * 62 + 20);
  condBlockComent.name    = 'Verificar palavra-chave';
}

// Positions — bloco distribuição (step 6): ação CRM → "Respondido pelo Bot"
const distBlockPos = posComent.find(b => b.step === gotoComent);
if (distBlockPos) {
  distBlockPos.name = 'Respostas de comentários';
  if (!distBlockPos.actions.find(a => a.params?.handler === 'action')) {
    const nextId   = Math.max(...distBlockPos.actions.map(a => a.id),   0) + 1;
    const nextSort = Math.max(...distBlockPos.actions.map(a => a.sort), 0) + 1;
    distBlockPos.actions.push({ id: nextId, sort: nextSort, ...POS_ACTION_RS_RESPONDIDO });
  }
}

// Positions — textos das respostas (steps 12, 13, 14)
for (const [step, text] of [[12, RESPOSTAS[0]], [13, RESPOSTAS[1]], [14, RESPOSTAS[2]]]) {
  const blk = posComent.find(b => b.step === step);
  if (blk) {
    blk.name = 'Comentar';
    const act = blk.actions.find(a => a.params?.handler === 'send_comment');
    if (act) act.params.params.text = text;
  }
}

templateComent.model = {
  text:      JSON.stringify(modelComent),
  name:      'PRECO — Resposta Comentário',
  positions: JSON.stringify(posComent),
  type:      templateComent.model.type,
};

const outComent = path.join(outDir, 'kommo-preco-comentario.json');
fs.writeFileSync(outComent, '﻿' + JSON.stringify(templateComent, null, 2), 'utf8');

// ════════════════════════════════════════════════════════════════════════════════
// BOT 2 — DM  (apenas blocos 68 + 6; restante criado manualmente no Kommo)
// ════════════════════════════════════════════════════════════════════════════════

const templateDM = readJsonNoBOM(path.join(outDir, 'exported-dm-comentarios.json'));

// ── Model: step 0 (conditions) + step 24 (ação: mover para etapa do funil)
const modelDM = {
  '0': {
    question:   buildConditions(PALAVRAS, 24),
    block_uuid: '6c561ba2-31dc-4323-b678-1ba27483cb9c',
  },
  '24': {
    block_uuid: crypto.randomUUID(),
    question: [
      ACTION_RS_CONTATO_BOT,
    ],
  },
  conversation: false,
};

// ── Positions: start, trigger, conditions (68) → bloco de ação (7)
const posDM = [
  {
    x: -511, y: -166, z: 165, id: 0, goto: { block: 68 },
    step: -1, type: 'start', width: 170, height: 38,
    actions: [{ id: -3, sort: 0, links: [], params: { params: [], handler: '_start' } }],
    deletable: true,
  },
  {
    x: -584, y: -48, z: 164, id: -1, code: 'trigger',
    step: -1, type: 'static', width: 260, height: 0,
    actions: [], deletable: true,
  },
  {
    x: -238, y: -314, z: 166, id: 68, goto: { block: 7 },
    name: 'Verificar palavra-chave', step: 0, type: 'question',
    width: 400, height: Math.max(400, PALAVRAS.length * 62 + 20),
    actions: buildCondActions(PALAVRAS, 7),
    deletable: true, block_uuid: '6c561ba2-31dc-4323-b678-1ba27483cb9c',
  },
  {
    x: 333, y: -314, z: 199, id: 7, goto: null,
    name: 'Mover para etapa', step: 24, type: 'question',
    width: 400, height: 100,
    actions: [
      { id: 316, sort: 0, links: [], ...POS_ACTION_RS_CONTATO_BOT },
    ],
    deletable: true,
  },
];

templateDM.model = {
  text:      JSON.stringify(modelDM),
  name:      'PRECO — DM Cidade + WhatsApp',
  positions: JSON.stringify(posDM),
  type:      templateDM.model.type,
};

const outDM = path.join(outDir, 'kommo-preco-dm.json');
fs.writeFileSync(outDM, '﻿' + JSON.stringify(templateDM, null, 2), 'utf8');

// ════════════════════════════════════════════════════════════════════════════════
// BOT UNIFICADO — desativado (voltar aos 2 bots separados)
// ════════════════════════════════════════════════════════════════════════════════
if (false) {

const tplC = readJsonNoBOM(path.join(outDir, 'exported-comentarios-preco.json'));
const tplD = readJsonNoBOM(path.join(outDir, 'exported-dm-comentarios.json'));

const mC = JSON.parse(tplC.model.text);
const pC = JSON.parse(tplC.model.positions);
const mD = JSON.parse(tplD.model.text);
const pD = JSON.parse(tplD.model.positions);

// Usa template de comentário como base; injeta steps do DM
const modelU = JSON.parse(JSON.stringify(mC));

// Copia steps 17, 20, 21, 22, 23 do modelo DM
for (const key of ['17','20','21','22','23']) {
  if (mD[key]) modelU[key] = JSON.parse(JSON.stringify(mD[key]));
}
modelU.conversation = mD.conversation ?? false;

// ── step 0: conditions → step 6 (mesmo do comentário)
const gotoU = modelU['0'].question.find(q => q.handler === 'goto').params.step;
modelU['0'].question = buildConditions(PALAVRAS, gotoU);

// ── step 6 (distribuição): mantém ACTION_RS_RESPONDIDO (comentário respondido)
const distU = modelU[String(gotoU)];
if (distU && !distU.question.find(q => q.handler === 'action')) {
  distU.question.push(ACTION_RS_RESPONDIDO);
}

// ── steps 12/13/14: responde comentário + goto step 23 para iniciar DM
for (const [key, text] of [['12', RESPOSTAS[0]], ['13', RESPOSTAS[1]], ['14', RESPOSTAS[2]]]) {
  const s = modelU[key];
  if (!s) continue;
  const sendCmt = s.question.find(q => q.handler === 'send_comment');
  if (sendCmt) sendCmt.params.text = text;
  // Remove goto anterior (se houver) e adiciona goto para step 23
  s.question = s.question.filter(q => q.handler !== 'goto');
  s.question.push({ handler: 'goto', params: { step: 23, type: 'question' } });
}

// ── Corrige textos DM (mojibake cleanup)
for (const [step, fix] of Object.entries(DM_TEXTS)) {
  const stepData = modelU[step];
  if (!stepData) continue;
  const msgQ = stepData.question?.find(q => q.handler === 'send_message');
  if (msgQ) {
    msgQ.params.text = typeof fix === 'string' ? fix : fix.text;
    if (fix.btn && msgQ.params.buttons?.length > 0) msgQ.params.buttons[0].text = fix.btn;
    if (fix.url && msgQ.params.buttons?.length > 0) msgQ.params.buttons[0].url = fix.url;
  }
}

// ── step 23: remove set_pipeline/set_responsible herdados, injeta ACTION_RS_CONTATO_BOT
const s23u = modelU['23'];
if (s23u) {
  s23u.question = s23u.question.filter(q => q.handler !== 'set_pipeline' && q.handler !== 'set_responsible');
  if (!s23u.question.find(q => q.handler === 'action')) s23u.question.push(ACTION_RS_CONTATO_BOT);
  putActionsFirst(s23u);
  setOnError(s23u, ON_ERR_FALLBACK);
}

// ── step 17: retry sem Bruna; on_error → step 31
const s17u = modelU['17'];
if (s17u) {
  s17u.question = s17u.question.filter(q => q.handler !== 'action');
  setOnError(s17u, ON_ERR_FALLBACK);
}

// ── steps 20/21: botão WA + ACTION_RS_RESPONDIDO; on_error → step 31
for (const key of ['20','21']) {
  const s = modelU[key];
  if (s && !s.question.find(q => q.handler === 'action')) s.question.unshift(ACTION_RS_RESPONDIDO);
  setOnError(modelU[key], ON_ERR_FALLBACK);
}

// ── step 22: on_error → step 31
setOnError(modelU['22'], ON_ERR_FALLBACK);

// ── steps 30/31: vendedor + fallback (UUIDs únicos para este bot)
const UUID_VEND_U = crypto.randomUUID();
const UUID_FALL_U = crypto.randomUUID();

modelU[STEP_VENDEDOR] = {
  question: [
    ACTION_RS_HUMANO, ACTION_CHANGE_RESP,
    { handler: 'send_message', params: {
      tag: '', text: 'Perfeito! 😊 Vou te conectar com um de nossos vendedores agora mesmo! Em breve alguém vai falar com você por aqui. ✅',
      type: 'external', buttons: [], on_error: null,
      recipient: { type: 'all_contacts', way_of_communication: 'over_all' },
      is_in_starting_block: false, send_to_all_chat_sources: true,
    }},
  ],
  block_uuid: UUID_VEND_U,
};
modelU[STEP_FALLBACK] = {
  question: [
    ACTION_RS_HUMANO, ACTION_CHANGE_RESP,
    { handler: 'send_message', params: {
      tag: '', text: 'Ops! Não conseguimos enviar a mensagem. 😔 Um atendente vai falar com você em breve!',
      type: 'external', buttons: [], on_error: null,
      recipient: { type: 'all_contacts', way_of_communication: 'over_all' },
      is_in_starting_block: false, send_to_all_chat_sources: true,
    }},
  ],
  block_uuid: UUID_FALL_U,
};

// ── Injeta opção "vendedor" no answer de steps 23/17/22
const VEND_ANS_U = {
  value: 'Vendedor',
  params: [{ params: { step: STEP_VENDEDOR, type: 'question' }, handler: 'goto' }],
  synonyms: SINONIMOS_VENDEDOR,
};
for (const stepKey of ['23','17','22']) {
  const stepData = modelU[stepKey];
  if (!stepData?.answer) continue;
  const bh = stepData.answer.find(a => a.handler === 'buttons');
  if (!bh) continue;
  const elseIdx = bh.params.findIndex(p => p.type === 'else');
  if (elseIdx >= 0) bh.params.splice(elseIdx, 0, VEND_ANS_U);
  else bh.params.push(VEND_ANS_U);
}

// ── POSITIONS: começa com posComent, adiciona blocos DM
const posU = JSON.parse(JSON.stringify(pC));

// ID do bloco step 23 no template DM (para setar goto nos blocos de comentário)
const dmBlk23 = pD.find(b => b.step === 23);
const dmBlk23Id = dmBlk23?.id;

// Adiciona blocos DM relevantes (ignora steps 0/-1: conditions/trigger/start do DM)
for (const blk of pD) {
  if (![17,20,21,22,23].includes(blk.step)) continue;
  const c = JSON.parse(JSON.stringify(blk));
  c.name = 'Enviar mensagem';
  // Corrige textos no positions
  const fix = DM_TEXTS[String(blk.step)];
  if (fix) {
    const act = c.actions?.find(a => a.params?.handler === 'send_message');
    if (act?.params?.params) {
      act.params.params.text = typeof fix === 'string' ? fix : fix.text;
      if (fix.btn && act.params.params.buttons?.length > 0) act.params.params.buttons[0].text = fix.btn;
      if (fix.url && act.params.params.buttons?.length > 0) act.params.params.buttons[0].url = fix.url;
    }
  }
  if (blk.step === 23) {
    c.actions = c.actions.filter(a => a.params?.handler !== 'set_pipeline' && a.params?.handler !== 'set_responsible');
    if (!c.actions.find(a => a.params?.handler === 'action')) {
      const nId = Math.max(...c.actions.map(a => a.id), 0) + 1;
      const nSt = Math.max(...c.actions.map(a => a.sort), 0) + 1;
      c.actions.unshift({ id: nId, sort: nSt, ...POS_ACTION_RS_CONTATO_BOT });
    }
  }
  if (blk.step === 17) {
    c.actions = c.actions.filter(a => a.params?.handler !== 'action');
  }
  if (blk.step === 20 || blk.step === 21) {
    if (!c.actions.find(a => a.params?.handler === 'action')) {
      const nId = Math.max(...c.actions.map(a => a.id), 0) + 1;
      const nSt = Math.max(...c.actions.map(a => a.sort), 0) + 1;
      c.actions.unshift({ id: nId, sort: nSt, ...POS_ACTION_RS_RESPONDIDO });
    }
  }
  posU.push(c);
}

// Blocos de comentário (steps 12/13/14): seta goto para bloco step 23 do DM + atualiza texto
for (const [step, text] of [[12, RESPOSTAS[0]], [13, RESPOSTAS[1]], [14, RESPOSTAS[2]]]) {
  const blk = posU.find(b => b.step === step);
  if (!blk) continue;
  blk.name = 'Comentar';
  if (dmBlk23Id != null) blk.goto = { block: dmBlk23Id };
  const act = blk.actions.find(a => a.params?.handler === 'send_comment');
  if (act) act.params.params.text = text;
}

// Conditions block
const condBlkU = posU.find(b => b.step === 0);
if (condBlkU) {
  const destBlock = condBlkU.actions[0]?.links?.[0]?.block ?? 15;
  condBlkU.actions = buildCondActions(PALAVRAS, destBlock);
  condBlkU.height  = Math.max(400, PALAVRAS.length * 62 + 20);
  condBlkU.name    = 'Verificar palavra-chave';
}

// Distribution block
const distBlkU = posU.find(b => b.step === gotoU);
if (distBlkU && !distBlkU.actions.find(a => a.params?.handler === 'action')) {
  const nId = Math.max(...distBlkU.actions.map(a => a.id), 0) + 1;
  const nSt = Math.max(...distBlkU.actions.map(a => a.sort), 0) + 1;
  distBlkU.actions.push({ id: nId, sort: nSt, ...POS_ACTION_RS_RESPONDIDO });
}

// Novos blocos step 30/31
posU.push({
  x: 1800, y: 900, z: 99,
  id: BLOCK_VENDEDOR, step: STEP_VENDEDOR,
  goto: null, name: 'Transferir para vendedor',
  type: 'question', width: 400, height: 200,
  deletable: true, block_uuid: UUID_VEND_U,
  actions: [
    { id: 950, sort: 0, ...POS_ACTION_RS_HUMANO },
    { id: 951, sort: 1, ...POS_ACTION_RESP },
    { id: 952, sort: 2, links: [], params: { params: {
      text: 'Perfeito! 😊 Vou te conectar com um de nossos vendedores agora mesmo! Em breve alguém vai falar com você por aqui. ✅',
      type: 'external', buttons: [], on_error: null,
      recipient: { type: 'all_contacts', way_of_communication: 'over_all' },
      is_in_starting_block: false, send_to_all_chat_sources: true,
    }, handler: 'send_message' }},
  ],
});
posU.push({
  x: 2100, y: 900, z: 99,
  id: BLOCK_FALLBACK, step: STEP_FALLBACK,
  goto: null, name: 'Fallback — Transferir p/ Humano',
  type: 'question', width: 400, height: 180,
  deletable: true, block_uuid: UUID_FALL_U,
  actions: [
    { id: 960, sort: 0, ...POS_ACTION_RS_HUMANO },
    { id: 961, sort: 1, ...POS_ACTION_RESP },
    { id: 962, sort: 2, links: [], params: { params: {
      text: 'Ops! Não conseguimos enviar a mensagem. 😔 Um atendente vai falar com você em breve!',
      type: 'external', buttons: [], on_error: null,
      recipient: { type: 'all_contacts', way_of_communication: 'over_all' },
      is_in_starting_block: false, send_to_all_chat_sources: true,
    }, handler: 'send_message' }},
  ],
});

const tplU = JSON.parse(JSON.stringify(tplC));
tplU.model = {
  text:      JSON.stringify(modelU),
  name:      'PRECO — Comentário + DM (Unificado)',
  positions: JSON.stringify(posU),
  type:      tplC.model.type,
};

const outUnif = path.join(outDir, 'kommo-preco-unificado.json');
fs.writeFileSync(outUnif, '﻿' + JSON.stringify(tplU, null, 2), 'utf8');
} // fim if(false) — bot unificado desativado

// ─── RESULTADO ────────────────────────────────────────────────────────────────
console.log(`✅ Gerado: ${outComent}`);
console.log(`✅ Gerado: ${outDM}`);
console.log(`   Palavras-gatilho: ${PALAVRAS.length}`);
console.log(`   Funil Redes Sociais: respondido=${STATUS_RS_RESPONDIDO}, contato=${STATUS_RS_CONTATO_BOT}, humano=${STATUS_RS_HUMANO}`);
console.log(`   Bruna: ${USER_BRUNA}`);
console.log(`\n📋 Kommo → Automações → Bots → IMPORTAR`);
