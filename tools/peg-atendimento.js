'use strict';

/**
 * Módulo de primeiro atendimento — Peg Pneus Atacarejo
 *
 * Fluxo:
 *   1. Mensagem entra → envia boas-vindas se for o primeiro contato
 *   2. Cliente responde → detecta categoria por palavras-chave
 *   3. Encontrou → responde "encaminhando" + manda resumo pro grupo de atendimento
 *   4. Não encontrou → exibe menu com as 3 opções
 *   5. Cliente escolhe do menu → idem ao passo 3
 */

const fs   = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', 'data', 'peg-atendimento.json');

// ── Categorias + palavras-chave ────────────────────────────────────────────────
const CATEGORIAS = [
  {
    id:      'pneu_novo',
    nome:    'Pneu Novo',
    emoji:   '🛞',
    setor:   'Vendas — Pneu Novo',
    gatilhos: [
      'pneu novo', 'pneus novos', 'comprar pneu', 'comprar pneus',
      'preciso de pneu', 'quero pneu', 'quero comprar', 'novo pneu',
      'pneu para', 'pneu do', 'pneu da', 'pneus para',
      'quanto custa', 'qual o preço', 'preço do pneu', 'valor do pneu',
      '1', 'um', 'primeira',
    ],
  },
  {
    id:      'troca_montagem',
    nome:    'Troca + Montagem',
    emoji:   '🔧',
    setor:   'Montagem — Troca com Serviço',
    gatilhos: [
      'troca', 'trocar', 'trocar pneu', 'trocar os pneus',
      'montar', 'montagem', 'colocar pneu', 'instalar', 'instalação',
      'trocar e montar', 'troca e monta', 'troca com montagem',
      '2', 'dois', 'segunda',
    ],
  },
  {
    id:      'montagem_balanceamento',
    nome:    'Montagem e Balanceamento',
    emoji:   '⚖️',
    setor:   'Montagem — Serviço Avulso',
    gatilhos: [
      'balanceamento', 'balancear', 'balancear pneu', 'só montagem',
      'so montagem', 'só balanceamento', 'alinhamento', 'alinhar',
      'vibração', 'vibrando', 'trepidando', 'trepidação',
      'serviço', 'serviço avulso', 'só o serviço',
      '3', 'tres', 'três', 'terceira',
    ],
  },
];

// ── Estado das conversas (em memória + arquivo) ────────────────────────────────

function carregarEstado() {
  try {
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {}
  return {};
}

function salvarEstado(estado) {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(estado, null, 2)); } catch {}
}

const estado = carregarEstado();

// ── Funções auxiliares ─────────────────────────────────────────────────────────

function agora() {
  return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function detectarCategoria(texto) {
  const lower = texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const cat of CATEGORIAS) {
    const normalizedGatilhos = cat.gatilhos.map(g =>
      g.normalize('NFD').replace(/[̀-ͯ]/g, '')
    );
    if (normalizedGatilhos.some(g => lower.includes(g))) return cat;
  }
  return null;
}

function gerarResumo(contato, nomeContato, mensagem, categoria) {
  return (
    `📋 *Novo Atendimento — Peg Pneus Atacarejo*\n` +
    `${'─'.repeat(38)}\n` +
    `${categoria.emoji} *Necessidade:* ${categoria.nome}\n` +
    `🏬 *Setor:* ${categoria.setor}\n` +
    `👤 *Cliente:* ${nomeContato || contato}\n` +
    `📱 *Contato:* ${contato.replace('@c.us', '').replace('@lid', '')}\n` +
    `💬 *Mensagem:* _"${mensagem}"_\n` +
    `🕐 *Horário:* ${agora()}`
  );
}

// ── Fluxo principal ────────────────────────────────────────────────────────────

/**
 * @param {object} msg         — objeto msg do whatsapp-web.js
 * @param {object} client      — client do whatsapp-web.js
 * @param {string} grupoId     — ID do grupo/número que recebe o resumo
 * @returns {boolean}          — true se a mensagem foi tratada aqui
 */
async function processarAtendimento(msg, client, grupoId) {
  // Ignora mensagens de grupos e do próprio bot
  if (msg.from.includes('@g.us') || msg.fromMe) return false;

  const contato = msg.from;
  const texto   = (msg.body || '').trim();
  if (!texto) return false;

  const chat        = await msg.getChat();
  const nomeContato = chat.name || '';

  // Helper local para responder via chat (resolve @lid)
  async function responder(mensagem) {
    return chat.sendMessage(mensagem);
  }

  const conv = estado[contato] || { fase: 'novo' };

  // ── FASE: novo contato ────────────────────────────────────────────────────────
  if (conv.fase === 'novo') {
    estado[contato] = { fase: 'aguardando', contato, nome: nomeContato };
    salvarEstado(estado);

    await responder(
      `Olá! 👋 Seja bem-vindo ao *Peg Pneus Atacarejo*\n` +
      `o primeiro atacarejo de pneus do Brasil!\n\n` +
      `Como posso te ajudar hoje?`
    );
    return true;
  }

  // ── FASE: aguardando resposta livre ──────────────────────────────────────────
  if (conv.fase === 'aguardando' || conv.fase === 'menu') {
    const categoria = detectarCategoria(texto);

    if (categoria) {
      // Encaminha para o setor
      estado[contato] = { fase: 'encaminhado', categoria: categoria.id, ultimaMsg: texto };
      salvarEstado(estado);

      await responder(
        `Perfeito! ✅\n\n` +
        `Irei te encaminhar para o *${categoria.setor}* agora mesmo.\n` +
        `Em breve um de nossos atendentes vai te chamar! 😊\n\n` +
        `_Horário de atendimento: seg–sex 8h–18h | sáb 8h–12h_`
      );

      // Envia resumo ao grupo/atendente
      if (grupoId) {
        const resumo = gerarResumo(contato, nomeContato, texto, categoria);
        await client.sendMessage(grupoId, resumo);
        console.log(`[PEG-ATD] Resumo enviado: ${nomeContato || contato} → ${categoria.nome}`);
      }

      return true;
    }

    // Não identificou — exibe menu de opções
    estado[contato] = { ...conv, fase: 'menu', ultimaMsg: texto };
    salvarEstado(estado);

    await responder(
      `Entendido! Para te ajudar melhor, qual é a sua necessidade? 😊\n\n` +
      `1️⃣  *Pneu Novo* — quero comprar pneus\n` +
      `2️⃣  *Troca + Montagem* — preciso trocar e montar\n` +
      `3️⃣  *Montagem e Balanceamento* — só o serviço\n\n` +
      `_Responda com o número ou descreva sua necessidade._`
    );
    return true;
  }

  // ── FASE: já encaminhado ──────────────────────────────────────────────────────
  if (conv.fase === 'encaminhado') {
    // Mensagem nova após encaminhamento — reinicia o fluxo
    estado[contato] = { fase: 'aguardando', contato, nome: nomeContato };
    salvarEstado(estado);

    await responder(
      `Olá novamente! 👋\n\n` +
      `Como posso te ajudar?`
    );
    return true;
  }

  return false;
}

// ── Reset manual de um contato (útil para testes) ────────────────────────────
function resetarContato(contato) {
  delete estado[contato];
  salvarEstado(estado);
}

module.exports = { processarAtendimento, resetarContato };
