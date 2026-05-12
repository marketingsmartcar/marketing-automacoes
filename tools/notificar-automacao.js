'use strict';
/**
 * tools/notificar-automacao.js
 *
 * Registra status de automações e envia lista completa no grupo de automações.
 *
 * Uso:
 *   node tools/notificar-automacao.js --nome "OI Lojas" --status inicio
 *   node tools/notificar-automacao.js --nome "OI Colaboradores" --status fim
 *   node tools/notificar-automacao.js --nome "Monitor ADS" --status erro --detalhe "token expirado"
 *   node tools/notificar-automacao.js --nome "Monitor ADS" --status inicio --silencioso
 *
 * Flags:
 *   --silencioso   Atualiza o arquivo de status mas não envia WA (para automações horárias)
 *   --detalhe      Mensagem extra em caso de erro
 */

require('dotenv').config();

const fs   = require('fs');
const path = require('path');
const http = require('http');

const STATUS_FILE = path.join(__dirname, '..', 'data', 'automacao-status.json');
const BOT_URL     = 'http://127.0.0.1:3099/send';
const GRUPO_ID    = process.env.WHATSAPP_GRUPO_AUTOMACAO_ID;

// Ordem e metadados de todas as automações (OI Retroativo não entra na lista diária)
const AUTOMACOES_DEF = [
  { nome: 'Stories',          horario: '08h diário'     },
  { nome: 'OI Colaboradores', horario: '08h diário'     },
  { nome: 'OI Lojas',         horario: '20h seg–sáb'    },
  { nome: 'Monitor ADS',      horario: '08h–19h/hora'   },
  { nome: 'Social Media',     horario: '08h–19h/hora'   },
  { nome: 'Leads Hoje',       horario: '07h–18h/hora'   },
  { nome: 'Leads Planilha',   horario: '07h–18h/hora'   },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function hojeStr() {
  return new Intl.DateTimeFormat('sv', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function horaStr() {
  return new Date().toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit',
  });
}

function lerStatus() {
  try {
    const raw = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
    if (raw.data !== hojeStr()) return { data: hojeStr(), automacoes: {} };
    return raw;
  } catch {
    return { data: hojeStr(), automacoes: {} };
  }
}

function salvar(estado) {
  fs.mkdirSync(path.dirname(STATUS_FILE), { recursive: true });
  fs.writeFileSync(STATUS_FILE, JSON.stringify(estado, null, 2));
}

function calcDuracao(inicioStr, fimStr) {
  try {
    const [hi, mi] = inicioStr.split(':').map(Number);
    const [hf, mf] = fimStr.split(':').map(Number);
    const min = (hf * 60 + mf) - (hi * 60 + mi);
    if (min <= 0) return null;
    return min >= 60
      ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}min`
      : `${min}min`;
  } catch { return null; }
}

function formatarMensagem(estado) {
  const hoje = new Date().toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  });

  const linhas = [`🤖 *Automações — ${hoje}*\n`];

  for (const def of AUTOMACOES_DEF) {
    const s = estado.automacoes[def.nome];
    if (!s) {
      linhas.push(`⏳ ${def.nome} — aguardando (${def.horario})`);
      continue;
    }
    switch (s.status) {
      case 'em_andamento':
        linhas.push(`🔄 ${def.nome} — em andamento desde ${s.inicio}`);
        break;
      case 'concluido': {
        const dur = s.duracao ? ` (${s.duracao})` : '';
        const ult = s.fim ? ` às ${s.fim}` : '';
        linhas.push(`✅ ${def.nome} — concluído${ult}${dur}`);
        break;
      }
      case 'erro': {
        const det = s.detalhe ? `: ${s.detalhe}` : '';
        linhas.push(`❌ ${def.nome} — erro às ${s.fim || s.inicio || '?'}${det}`);
        break;
      }
    }
  }

  return linhas.join('\n');
}

function enviarWA(mensagem) {
  return new Promise((resolve) => {
    if (!GRUPO_ID) {
      console.log('[notificar] WHATSAPP_GRUPO_AUTOMACAO_ID não configurado — pulando envio');
      return resolve();
    }
    const body = JSON.stringify({ chatId: GRUPO_ID, message: mensagem });
    const req  = http.request(BOT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => { res.resume(); console.log(`[notificar] WA enviado (HTTP ${res.statusCode})`); resolve(); });
    req.on('error', () => { console.log('[notificar] Bot não disponível — status salvo no arquivo'); resolve(); });
    req.setTimeout(6000, () => { req.destroy(); resolve(); });
    req.write(body);
    req.end();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args      = process.argv.slice(2);
  const nome      = args[args.indexOf('--nome') + 1];
  const status    = args[args.indexOf('--status') + 1]; // inicio | fim | erro
  const detalhe   = args.includes('--detalhe')    ? args[args.indexOf('--detalhe') + 1]    : null;
  const silencioso = args.includes('--silencioso');

  if (!nome || !status) {
    console.error('Uso: node notificar-automacao.js --nome "Nome" --status inicio|fim|erro [--silencioso] [--detalhe "msg"]');
    process.exit(1);
  }

  const estado = lerStatus();
  const hora   = horaStr();

  if (status === 'inicio') {
    estado.automacoes[nome] = { status: 'em_andamento', inicio: hora };
  } else if (status === 'fim') {
    const ini     = estado.automacoes[nome]?.inicio;
    const duracao = ini ? calcDuracao(ini, hora) : null;
    estado.automacoes[nome] = {
      status:  'concluido',
      inicio:  ini || hora,
      fim:     hora,
      duracao,
    };
  } else if (status === 'erro') {
    estado.automacoes[nome] = {
      ...estado.automacoes[nome],
      status:  'erro',
      fim:     hora,
      detalhe: detalhe || null,
    };
  }

  salvar(estado);

  // OI Retroativo Semana: mensagem avulsa (não entra na lista diária)
  if (nome === 'OI Retroativo Semana') {
    if (status === 'fim') {
      const msg = `✅ *OI Retroativo Semana* concluído às ${hora}.`;
      console.log('[notificar]\n' + msg);
      await enviarWA(msg);
    } else if (status === 'erro') {
      const det = detalhe ? `: ${detalhe}` : '';
      const msg = `❌ *OI Retroativo Semana* — erro às ${hora}${det}`;
      console.log('[notificar]\n' + msg);
      await enviarWA(msg);
    } else {
      console.log(`[notificar] OI Retroativo Semana — ${status} (sem notificação de início)`);
    }
    return;
  }

  // Erros SEMPRE notificam; silencioso nunca notifica; outros sempre notificam
  if (!silencioso || status === 'erro') {
    const msg = formatarMensagem(estado);
    console.log('[notificar]\n' + msg);
    await enviarWA(msg);
  } else {
    console.log(`[notificar] ${nome} — ${status} (silencioso, status salvo)`);
  }
}

main().catch(e => { console.error('[notificar] erro:', e.message); process.exit(0); });
