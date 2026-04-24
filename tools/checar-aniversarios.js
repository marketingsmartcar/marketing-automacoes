'use strict';

require('dotenv').config();

const fs   = require('fs');
const path = require('path');

const ARQUIVO = path.join(__dirname, '..', 'data', 'aniversariantes.json');

// ─── Carregar lista ────────────────────────────────────────────────────────────

function carregarAniversariantes() {
  if (!fs.existsSync(ARQUIVO)) return [];
  return JSON.parse(fs.readFileSync(ARQUIVO, 'utf8'));
}

// ─── Verificar aniversários de hoje ───────────────────────────────────────────

function aniversariantesHoje() {
  const hoje = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const [dataHoje] = hoje.split(', ');           // "15/04/2026"
  const [dia, mes] = dataHoje.split('/');
  const ddmm = `${dia.padStart(2,'0')}/${mes.padStart(2,'0')}`;

  return carregarAniversariantes().filter(p => p.data === ddmm);
}

// ─── Montar mensagem ───────────────────────────────────────────────────────────

function montarMensagem(pessoa) {
  const emojis = ['🎂', '🎉', '🥳', '🎈', '🎁'];
  const emoji  = emojis[Math.floor(Math.random() * emojis.length)];

  let msg = `${emoji} *Feliz Aniversário, ${pessoa.nome}!* ${emoji}\n\n`;

  if (pessoa.cargo && pessoa.loja) {
    msg += `Hoje é um dia especial para nosso(a) *${pessoa.cargo}* da *${pessoa.loja}*!\n\n`;
  } else if (pessoa.loja) {
    msg += `Hoje é um dia especial para alguém da *${pessoa.loja}*!\n\n`;
  }

  msg += `Que este novo ano seja repleto de conquistas, saúde e muito sucesso!\n\n`;
  msg += `Da equipe *BR Pneus & Oficina* com muito carinho. 🧡`;

  return msg;
}

function montarMensagemGrupo(aniversariantes) {
  if (aniversariantes.length === 0) return null;

  if (aniversariantes.length === 1) {
    return montarMensagem(aniversariantes[0]);
  }

  // Vários aniversariantes no mesmo dia
  const nomes = aniversariantes.map(p => `*${p.nome}*`).join(' e ');
  let msg = `🎂🎉 *Feliz Aniversário!* 🎉🎂\n\n`;
  msg += `Hoje comemoramos o aniversário de ${nomes}!\n\n`;
  msg += `Que este novo ano seja repleto de conquistas, saúde e muito sucesso!\n\n`;
  msg += `Da equipe *BR Pneus & Oficina* com muito carinho. 🧡`;
  return msg;
}

// ─── Enviar via WhatsApp Bot ───────────────────────────────────────────────────

async function enviarAoGrupo(mensagem, client, grupoId) {
  grupoId = grupoId || process.env.WHATSAPP_GRUPO_ANIVERSARIOS_ID || process.env.WHATSAPP_GRUPO_ID;
  if (!grupoId) {
    console.log('⚠️  Nenhum grupo de aniversários configurado — mensagem não enviada.');
    console.log('\nMensagem que seria enviada:\n');
    console.log(mensagem);
    return false;
  }

  try {
    const chat = await client.getChatById(grupoId);
    await chat.sendMessage(mensagem);
    console.log(`✅ Mensagem de aniversário enviada ao grupo: ${chat.name}`);
    return true;
  } catch (err) {
    console.error('❌ Erro ao enviar ao grupo:', err.message);
    return false;
  }
}

// ─── Verificar e disparar ──────────────────────────────────────────────────────

async function verificarEDisparar(client = null, grupoId = null) {
  const hoje = aniversariantesHoje();

  if (hoje.length === 0) {
    console.log(`📅 Sem aniversariantes hoje.`);
    return [];
  }

  console.log(`🎂 ${hoje.length} aniversariante(s) hoje: ${hoje.map(p => p.nome).join(', ')}`);

  if (client) {
    await enviarAoGrupo(montarMensagemGrupo(hoje), client, grupoId);
  } else {
    console.log('⚠️  Bot não está rodando — mensagem de aniversário não enviada.');
  }

  return hoje;
}

module.exports = { verificarEDisparar, aniversariantesHoje, montarMensagemGrupo, carregarAniversariantes };

// ─── CLI standalone ────────────────────────────────────────────────────────────

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args[0] === '--listar') {
    const lista = carregarAniversariantes();
    if (lista.length === 0) {
      console.log('Nenhum aniversariante cadastrado em data/aniversariantes.json');
    } else {
      console.log(`\n🎂 Aniversariantes cadastrados (${lista.length}):\n`);
      lista.sort((a, b) => {
        const [da, ma] = a.data.split('/').map(Number);
        const [db, mb] = b.data.split('/').map(Number);
        return ma !== mb ? ma - mb : da - db;
      }).forEach(p => {
        console.log(`  ${p.data}  ${p.nome.padEnd(25)} ${p.loja || ''} — ${p.cargo || ''}`);
      });
      console.log('');
    }
    return;
  }

  if (args[0] === '--hoje') {
    const hoje = aniversariantesHoje();
    if (hoje.length === 0) {
      console.log('Sem aniversariantes hoje.');
    } else {
      console.log(`\n🎂 Aniversariante(s) hoje:\n`);
      hoje.forEach(p => console.log(`  • ${p.nome} — ${p.loja || ''}`));
      console.log('\nMensagem que seria enviada:\n');
      console.log(montarMensagemGrupo(hoje));
    }
    return;
  }

  // Padrão: verificar e disparar (sem bot, usa CallMeBot como fallback)
  verificarEDisparar(null).catch(err => console.error('Erro:', err.message));
}
