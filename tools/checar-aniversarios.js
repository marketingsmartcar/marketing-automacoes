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

// ─── Verificar e disparar ──────────────────────────────────────────────────────

async function verificarEDisparar(client = null, grupoId = null) {
  const hoje = aniversariantesHoje();

  if (hoje.length === 0) {
    console.log(`📅 Sem aniversariantes hoje.`);
    return [];
  }

  console.log(`🎂 ${hoje.length} aniversariante(s) hoje: ${hoje.map(p => p.nome).join(', ')}`);

  if (!client) {
    console.log('⚠️  Bot não está rodando — mensagem não enviada.');
    console.log('\nMensagem(s) que seriam enviadas:\n');
    hoje.forEach(p => console.log(montarMensagem(p) + '\n---'));
    return hoje;
  }

  const destino = grupoId
    || process.env.WHATSAPP_GRUPO_ANIVERSARIOS_ID
    || process.env.WHATSAPP_GRUPO_AUTOMACAO_ID
    || process.env.WHATSAPP_GRUPO_ID;

  if (!destino) {
    console.log('⚠️  Nenhum grupo de aniversários configurado — mensagem não enviada.');
    return hoje;
  }

  const { gerarAniversario } = require('./gerar-arte');
  const { MessageMedia }     = require('whatsapp-web.js');

  for (const pessoa of hoje) {
    const caption = montarMensagem(pessoa);
    try {
      // Gera arte se a foto existe
      if (pessoa.foto && fs.existsSync(pessoa.foto)) {
        const pngPath = await gerarAniversario({
          marca:    pessoa.marca || 'brpneus',
          nome:     pessoa.nome,
          fotoPath: pessoa.foto,
        });
        const media = MessageMedia.fromFilePath(pngPath);
        await client.sendMessage(destino, media, { caption });
        console.log(`✅ Arte enviada: ${pessoa.nome}`);
      } else {
        // Sem foto — envia só texto
        await client.sendMessage(destino, caption);
        console.log(`✅ Mensagem enviada: ${pessoa.nome} (sem foto)`);
      }
    } catch (err) {
      console.error(`❌ Erro ao processar ${pessoa.nome}:`, err.message);
      // Tenta fallback de texto se a arte falhou
      try {
        await client.sendMessage(destino, caption);
        console.log(`↩️  Fallback texto enviado: ${pessoa.nome}`);
      } catch (e2) {
        console.error(`❌ Fallback também falhou: ${e2.message}`);
      }
    }
  }

  return hoje;
}

module.exports = { verificarEDisparar, aniversariantesHoje, montarMensagem, carregarAniversariantes };

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
        console.log(`  ${p.data}  ${p.nome.padEnd(25)} ${(p.loja || '').padEnd(22)} ${p.cargo || ''}`);
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
      hoje.forEach(p => {
        console.log(`  • ${p.nome} — ${p.loja || ''} | foto: ${p.foto || 'não cadastrada'}`);
        console.log('\n' + montarMensagem(p) + '\n');
      });
    }
    return;
  }

  verificarEDisparar(null).catch(err => console.error('Erro:', err.message));
}
