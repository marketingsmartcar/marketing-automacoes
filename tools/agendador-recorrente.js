'use strict';

require('dotenv').config();

const fs   = require('fs');
const path = require('path');

const ARQUIVO   = path.join(__dirname, '..', 'data', 'recorrentes.json');
const PASTA_MIDIAS = path.join(__dirname, '..', 'data', 'midias');

const DIAS = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6 };
const DIAS_NOME = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// ─── Persistência ──────────────────────────────────────────────────────────────

function carregar() {
  if (!fs.existsSync(ARQUIVO)) return [];
  try { return JSON.parse(fs.readFileSync(ARQUIVO, 'utf8')); } catch { return []; }
}

function salvar(lista) {
  fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true });
  fs.writeFileSync(ARQUIVO, JSON.stringify(lista, null, 2));
}

function proximoId() {
  const lista = carregar();
  return lista.length === 0 ? 1 : Math.max(...lista.map(r => r.id)) + 1;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

function adicionar({ diaSemana, hora, mensagem, imagemPath, grupoId }) {
  const lista = carregar();
  const item  = {
    id:          proximoId(),
    diaSemana,   // 0=dom … 6=sab
    hora,        // "HH:MM"
    mensagem:    mensagem || '',
    imagemPath:  imagemPath || null,
    grupoId:     grupoId || process.env.WHATSAPP_GRUPO_ID,
    ativo:       true,
    criadoEm:   new Date().toISOString(),
  };
  lista.push(item);
  salvar(lista);
  return item;
}

function toggleAtivo(id) {
  const lista = carregar();
  const item  = lista.find(r => r.id === parseInt(id));
  if (!item) return null;
  item.ativo = !item.ativo;
  salvar(lista);
  return item;
}

function remover(id) {
  const lista = carregar();
  const idx   = lista.findIndex(r => r.id === parseInt(id));
  if (idx === -1) return null;
  const [item] = lista.splice(idx, 1);
  if (item.imagemPath && fs.existsSync(item.imagemPath)) fs.unlinkSync(item.imagemPath);
  salvar(lista);
  return item;
}

// ─── Verificar quais disparar agora ───────────────────────────────────────────

function getPendentesAgora() {
  const agora    = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const [, hora] = agora.split(', ');
  const [hh, mm] = hora.split(':');
  const horaStr  = `${hh.padStart(2,'0')}:${mm.padStart(2,'0')}`;
  const diaSem   = new Date().getDay(); // 0=dom … 6=sab (horário local)

  return carregar().filter(r =>
    r.ativo &&
    r.diaSemana === diaSem &&
    r.hora === horaStr
  );
}

// ─── Enviar ───────────────────────────────────────────────────────────────────

async function enviarRecorrente(client, item) {
  try {
    const { MessageMedia } = require('whatsapp-web.js');
    // Suporta grupos (@g.us), números individuais (@c.us) e fallback para WHATSAPP_GRUPO_ID
    const destino = (item.grupoId && (item.grupoId.endsWith('@g.us') || item.grupoId.endsWith('@c.us')))
      ? item.grupoId
      : process.env.WHATSAPP_GRUPO_ID;
    const chat = await client.getChatById(destino);

    if (item.imagemPath && fs.existsSync(item.imagemPath)) {
      const media = MessageMedia.fromFilePath(item.imagemPath);
      await chat.sendMessage(media, { caption: item.mensagem || '' });
    } else if (item.mensagem) {
      await chat.sendMessage(item.mensagem);
    }

    console.log(`✅ Recorrente #${item.id} (${DIAS_NOME[item.diaSemana]} ${item.hora}) enviado.`);
  } catch (err) {
    console.error(`❌ Erro ao enviar recorrente #${item.id}:`, err.message);
  }
}

// ─── Loop (chamado junto com agendador-mensagens) ─────────────────────────────

function iniciarLoop(client) {
  setInterval(async () => {
    const pendentes = getPendentesAgora();
    for (const item of pendentes) {
      await enviarRecorrente(client, item);
    }
  }, 60 * 1000);

  const total = carregar().filter(r => r.ativo).length;
  console.log(`🔁 Agendador recorrente ativo (${total} post(s) configurado(s)).`);
}

// ─── Salvar mídia ─────────────────────────────────────────────────────────────

async function salvarMidia(msg) {
  const media = await msg.downloadMedia();
  if (!media) return null;
  fs.mkdirSync(PASTA_MIDIAS, { recursive: true });
  const ext      = media.mimetype.split('/')[1].split(';')[0];
  const nomeArq  = `recorrente_${Date.now()}.${ext}`;
  const filePath = path.join(PASTA_MIDIAS, nomeArq);
  fs.writeFileSync(filePath, Buffer.from(media.data, 'base64'));
  return filePath;
}

// ─── Formatar lista ───────────────────────────────────────────────────────────

function formatarLista() {
  const lista = carregar();
  if (lista.length === 0) return '📭 Nenhum post recorrente cadastrado.';

  let msg = `🔁 *Posts recorrentes (${lista.length}):*\n\n`;
  for (const r of lista) {
    const status = r.ativo ? '✅' : '⏸️';
    const grupoPadrao = process.env.WHATSAPP_GRUPO_ID;
    const destLabel = r.grupoId && r.grupoId !== grupoPadrao
      ? (r.grupoId.endsWith('@c.us') ? `📱 ${r.grupoId.replace('@c.us','')}` : `👥 Grupo personalizado`)
      : '👥 Grupo padrão';
    msg += `${status} *#${r.id}* — ${DIAS_NOME[r.diaSemana]} às ${r.hora}  |  ${destLabel}\n`;
    msg += `📝 ${r.mensagem ? r.mensagem.slice(0,60) + (r.mensagem.length > 60 ? '...' : '') : '_(só imagem)_'}\n`;
    msg += `🖼️ Imagem: ${r.imagemPath ? 'Sim' : 'Não'}\n`;
    msg += `Pausar/retomar: \`!pausarfixo ${r.id}\`  |  Deletar: \`!deletarfixo ${r.id}\`\n\n`;
  }
  return msg.trim();
}

module.exports = { adicionar, toggleAtivo, remover, iniciarLoop, formatarLista, salvarMidia, DIAS, DIAS_NOME };
