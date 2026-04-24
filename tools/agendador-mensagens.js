'use strict';

require('dotenv').config();

const fs   = require('fs');
const path = require('path');

const ARQUIVO_AGENDA = path.join(__dirname, '..', 'data', 'agendamentos.json');
const PASTA_MIDIAS   = path.join(__dirname, '..', 'data', 'midias');

// ─── Persistência ──────────────────────────────────────────────────────────────

function carregarAgenda() {
  if (!fs.existsSync(ARQUIVO_AGENDA)) return [];
  try { return JSON.parse(fs.readFileSync(ARQUIVO_AGENDA, 'utf8')); } catch { return []; }
}

function salvarAgenda(agenda) {
  fs.mkdirSync(path.dirname(ARQUIVO_AGENDA), { recursive: true });
  fs.writeFileSync(ARQUIVO_AGENDA, JSON.stringify(agenda, null, 2));
}

function proximoId() {
  const agenda = carregarAgenda();
  return agenda.length === 0 ? 1 : Math.max(...agenda.map(a => a.id)) + 1;
}

// ─── CRUD de agendamentos ──────────────────────────────────────────────────────

function adicionarAgendamento({ data, hora, mensagem, imagemPath, grupoId, mentionedIds }) {
  const agenda = carregarAgenda();
  const item = {
    id:          proximoId(),
    data,
    hora,
    mensagem,
    imagemPath:  imagemPath  || null,
    mentionedIds: mentionedIds && mentionedIds.length > 0 ? mentionedIds : [],
    grupoId:     grupoId || process.env.WHATSAPP_GRUPO_ID,
    enviado:     false,
    criadoEm:   new Date().toISOString(),
  };
  agenda.push(item);
  salvarAgenda(agenda);
  return item;
}

function cancelarAgendamento(id) {
  const agenda = carregarAgenda();
  const idx = agenda.findIndex(a => a.id === parseInt(id));
  if (idx === -1) return null;
  const item = agenda[idx];
  agenda.splice(idx, 1);
  // Remover imagem se existir
  if (item.imagemPath && fs.existsSync(item.imagemPath)) {
    fs.unlinkSync(item.imagemPath);
  }
  salvarAgenda(agenda);
  return item;
}

function marcarEnviado(id) {
  const agenda = carregarAgenda();
  const item = agenda.find(a => a.id === id);
  if (item) {
    item.enviado = true;
    salvarAgenda(agenda);
  }
}

// ─── Verificar mensagens a enviar agora ────────────────────────────────────────

function getMensagensPendentes() {
  const agora  = new Date();
  const agoraStr = agora.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const [dataAtual, horaAtual] = agoraStr.split(', ');
  const [dia, mes, ano] = dataAtual.split('/');
  const [hh, mm] = horaAtual.split(':');
  const dataHoje = `${dia.padStart(2,'0')}/${mes.padStart(2,'0')}/${ano}`;
  const horaHoje = `${hh.padStart(2,'0')}:${mm.padStart(2,'0')}`;

  return carregarAgenda().filter(a =>
    !a.enviado &&
    a.data === dataHoje &&
    a.hora === horaHoje
  );
}

// ─── Salvar mídia recebida do WhatsApp ─────────────────────────────────────────

async function salvarMidia(msg) {
  const media = await msg.downloadMedia();
  if (!media) return null;

  fs.mkdirSync(PASTA_MIDIAS, { recursive: true });

  const ext      = media.mimetype.split('/')[1].split(';')[0]; // jpg, png, mp4...
  const nomeArq  = `agenda_${Date.now()}.${ext}`;
  const filePath = path.join(PASTA_MIDIAS, nomeArq);

  fs.writeFileSync(filePath, Buffer.from(media.data, 'base64'));
  return filePath;
}

// ─── Dispatcher — loop de verificação ─────────────────────────────────────────

function iniciarLoop(client) {
  // Checar a cada minuto se tem mensagem para enviar
  setInterval(async () => {
    const pendentes = getMensagensPendentes();
    for (const item of pendentes) {
      await enviarAgendamento(client, item);
    }
  }, 60 * 1000);

  console.log('📅 Agendador de mensagens ativo (verificação a cada minuto).');
}

async function enviarAgendamento(client, item) {
  try {
    const { MessageMedia } = require('whatsapp-web.js');
    // Sempre resolver o grupoId mais atualizado do .env, ignorando valores antigos inválidos
    const grupoId = (item.grupoId && item.grupoId.endsWith('@g.us'))
      ? item.grupoId
      : (process.env.WHATSAPP_GRUPO_ID || item.grupoId);
    const chat = await client.getChatById(grupoId);

    // Menções: passar IDs diretamente (whatsapp-web.js aceita strings ou Contact)
    const opts = (item.mentionedIds && item.mentionedIds.length > 0)
      ? { mentions: item.mentionedIds }
      : {};

    if (item.imagemPath && fs.existsSync(item.imagemPath)) {
      const media = MessageMedia.fromFilePath(item.imagemPath);
      await chat.sendMessage(media, { caption: item.mensagem || '', ...opts });
    } else {
      await chat.sendMessage(item.mensagem, opts);
    }

    marcarEnviado(item.id);
    console.log(`✅ Agendamento #${item.id} enviado ao grupo "${chat.name}".`);

    // Limpar imagem após envio
    if (item.imagemPath && fs.existsSync(item.imagemPath)) {
      fs.unlinkSync(item.imagemPath);
    }
  } catch (err) {
    console.error(`❌ Erro ao enviar agendamento #${item.id}:`, err.message);
  }
}

// ─── Formatar lista de agendamentos ───────────────────────────────────────────

function formatarLista() {
  const agenda = carregarAgenda().filter(a => !a.enviado);
  if (agenda.length === 0) return '📭 Nenhuma mensagem agendada.';

  let msg = `📅 *Mensagens agendadas (${agenda.length}):*\n\n`;
  for (const a of agenda) {
    msg += `*#${a.id}* — ${a.data} às ${a.hora}\n`;
    msg += `📝 ${a.mensagem ? a.mensagem.slice(0, 60) + (a.mensagem.length > 60 ? '...' : '') : '_(só imagem)_'}\n`;
    msg += `🖼️ Imagem: ${a.imagemPath ? 'Sim' : 'Não'}\n`;
    msg += `Para cancelar: \`!cancelar ${a.id}\`\n\n`;
  }
  return msg.trim();
}

module.exports = {
  adicionarAgendamento,
  cancelarAgendamento,
  carregarAgenda,
  salvarMidia,
  iniciarLoop,
  formatarLista,
  getMensagensPendentes,
};
