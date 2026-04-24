'use strict';

require('dotenv').config();

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode  = require('qrcode-terminal');
const { execSync } = require('child_process');
const path    = require('path');

// ─── Configuração ──────────────────────────────────────────────────────────────

const NUMEROS_AUTORIZADOS = (process.env.WHATSAPP_ADMIN_NUMBERS || '')
  .split(',').map(n => n.trim()).filter(Boolean)
  .map(n => n.replace(/\D/g, '') + '@c.us');

// WHATSAPP_GRUPO_ID          → destino das mensagens agendadas via !agendar
// WHATSAPP_GRUPO_AUTOMACAO_ID → relatórios de Ads, stories, avaliações negativas
const GRUPO_ID         = process.env.WHATSAPP_GRUPO_ID || '';
const GRUPO_ALERTAS_ID = process.env.WHATSAPP_GRUPO_AUTOMACAO_ID || GRUPO_ID;

const NODE_PATH   = process.execPath;
const MONITOR_ADS = path.join(__dirname, 'monitor-ads.js');
const SESSION_DIR = path.join(__dirname, '..', '.wwebjs_auth');

// ─── Estado de conversas (fluxo multi-etapa) ───────────────────────────────────
const estadoConversas = new Map();

// ─── Cliente WhatsApp ──────────────────────────────────────────────────────────

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: SESSION_DIR }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

// ─── QR Code ───────────────────────────────────────────────────────────────────

client.on('qr', (qr) => {
  console.clear();
  console.log('═'.repeat(60));
  console.log('  📱  WHATSAPP BOT — BR Pneus');
  console.log('═'.repeat(60));
  console.log('\n  Escaneie o QR Code abaixo com seu WhatsApp:\n');
  qrcode.generate(qr, { small: true });
  console.log('\n  WhatsApp → ⋮ Menu → Dispositivos vinculados → Vincular dispositivo');
  console.log('═'.repeat(60));
});

client.on('authenticated', () => {
  console.log('\n✅ Autenticado! Sessão salva — próximo start não precisará de QR.\n');
});

client.on('ready', async () => {
  console.log('═'.repeat(60));
  console.log('  🤖  BOT ONLINE — BR Pneus & Peg Pneus');
  console.log('═'.repeat(60));
  console.log('\n  Comandos disponíveis:');
  console.log('  !ads / !valoresads → Relatórios de Ads');
  console.log('  !agendar           → Agendar mensagem avulsa');
  console.log('  !fixo seg 09:00    → Post recorrente toda semana');
  console.log('  !dashboard         → Gerar dashboard HTML');
  console.log('  !ajuda             → Lista de comandos');
  console.log('\n  Aguardando mensagens...\n');

  // Loops de agendamento (avulso + recorrente)
  const { iniciarLoop } = require('./agendador-mensagens');
  const recorrente = require('./agendador-recorrente');
  iniciarLoop(client);
  recorrente.iniciarLoop(client);

  // Relatórios automáticos de Ads às 9h, 13h e 17h (seg–sáb)
  agendarAlertasAds();

  // Cobrança de vídeos toda segunda-feira às 8h
  agendarCobrancaVideos();

  // Alerta de saldo crítico (<R$50) a cada 30 min
  iniciarAlertaSaldoCritico();

  // Verificação de expiração de tokens Meta (diária às 7h)
  agendarVerificacaoTokens();

  // Monitoramento automático de avaliações negativas no Google (a cada 2h)
  iniciarMonitoramentoReviews();

  // Relatório semanal de gasto (toda segunda-feira às 8h05)
  agendarRelatorioSemanal();
});

// ─── Helpers de formatação ────────────────────────────────────────────────────

function horaAtual() {
  return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    .replace(',', ' —');  // "15/04/2026 — 13:47"
}

function brl(centavos) {
  return `R$ ${(parseFloat(centavos || 0) / 100).toFixed(2).replace('.', ',')}`;
}

function sinalSaldo(centavos) {
  const v = parseFloat(centavos || 0) / 100;
  if (v < 100) return '🔴';
  if (v < 200) return '🟠';
  return '🟢';
}

function sinalCtr(ctr) {
  const v = parseFloat(ctr || 0);
  if (v < 0.5) return '🔴';
  if (v < 1.0) return '🟠';
  return '🟢';
}

function statusLabel(code) {
  const map = { 1: 'Ativa', 2: 'Desativada', 3: 'Não confirmada', 7: 'Arquivada', 9: 'Suspensa' };
  return map[code] || `Status ${code}`;
}

function duracaoTexto(r) {
  if (r.saldo === '-1') return 'cartão';
  if (r.diasRestantes === null || parseFloat(r.gastoDiario) === 0) return 'sem gasto recente';
  if (r.diasRestantes === 0) return '⚠️ menos de 1 dia';
  return `~${r.diasRestantes} dia${r.diasRestantes !== 1 ? 's' : ''}`;
}

function numBR(n) {
  return parseInt(n || 0).toLocaleString('pt-BR');
}

// ─── Formatador Google Ads ────────────────────────────────────────────────────

function formatarAlertaGoogle(resultados, label) {
  const linhas = [`📊 *Google Ads${label ? ` — ${label}` : ''}*\n`];

  for (const r of resultados) {
    if (r.erro) {
      linhas.push(`❌ *${r.nome}*\n   ${r.erro}`);
      continue;
    }
    const sc   = sinalCtr(r.ctr7d);
    const gasto = `R$${parseFloat(r.spend7d).toFixed(0)}`;
    const orc   = `R$${parseFloat(r.orcamentoTotal).toFixed(0)}/d`;
    linhas.push(
      `${sc} *${r.nome}*\n` +
      `   Gasto 7d: ${gasto} | Orç: ${orc}\n` +
      `   CTR: ${r.ctr7d}% | CPC: R$${r.cpc7d} | Conv: ${r.conversions7d}`
    );
  }

  return linhas.join('\n─────────────────\n');
}

// ─── Formatador simples — só saldos por cor ───────────────────────────────────

function formatarAlertaSimples(metaResultados, googleResultados = []) {
  // ── Meta ──
  const mVerm = [], mLar = [], mVerd = [];
  for (const r of metaResultados) {
    if (r.erro || r.saldo === '-1') continue;
    const saldo = parseFloat(r.saldo || 0) / 100;
    const dias  = r.diasRestantes !== null ? `~${r.diasRestantes}d` : '—';
    const linha = `• ${r.nome} — R$${saldo.toFixed(0)} _(${dias})_`;
    if (saldo < 100)      mVerm.push(linha);
    else if (saldo < 200) mLar.push(linha);
    else                  mVerd.push(linha);
  }

  // ── Google ──
  const gVerm = [], gLar = [], gVerd = [];
  for (const r of googleResultados) {
    if (r.erro || r.saldoDisponivel === null || r.saldoDisponivel === undefined) continue;
    const saldo     = parseFloat(r.saldoDisponivel);
    const gasto3d   = parseFloat(r.spend3d || 0);
    const gasto7d   = parseFloat(r.spend7d || 0);
    const gastoDia  = gasto3d > 0 ? gasto3d / 3 : gasto7d / 7; // fallback 7d se 3d = 0
    const dias      = gastoDia > 0 ? `~${Math.floor(saldo / gastoDia)}d` : '—';
    const linha     = `• ${r.nome} — R$${saldo.toFixed(0)} _(${dias})_`;
    if (saldo < 100)      gVerm.push(linha);
    else if (saldo < 200) gLar.push(linha);
    else                  gVerd.push(linha);
  }

  let msg = `📊 *Dashboard Ads — ${horaAtual()}*\n`;

  // Seção Meta
  msg += `\n🟦 *Meta Ads*`;
  if (mVerm.length) msg += `\n🔴 *Crítico:*\n${mVerm.join('\n')}`;
  if (mLar.length)  msg += `\n🟠 *Atenção:*\n${mLar.join('\n')}`;
  if (mVerd.length) msg += `\n🟢 *OK:*\n${mVerd.join('\n')}`;
  if (!mVerm.length && !mLar.length && !mVerd.length) msg += `\n_Sem dados_`;

  // Seção Google
  if (googleResultados.length > 0) {
    msg += `\n\n🟦 *Google Ads*`;
    if (gVerm.length) msg += `\n🔴 *Crítico:*\n${gVerm.join('\n')}`;
    if (gLar.length)  msg += `\n🟠 *Atenção:*\n${gLar.join('\n')}`;
    if (gVerd.length) msg += `\n🟢 *OK:*\n${gVerd.join('\n')}`;
    if (!gVerm.length && !gLar.length && !gVerd.length) msg += `\n_Sem saldo cadastrado_`;
  }

  return msg.trim();
}

// ─── Formatador completo — detalhes de cada conta ────────────────────────────

function formatarRelatorioCompleto(resultados) {
  const linhas = [`📊 *Meta Ads — ${horaAtual()}*\n`];

  for (const r of resultados) {
    if (r.saldo === '-1') continue; // ocultar contas cartão
    if (r.erro) {
      linhas.push(`❌ *${r.nome}*\n   Erro: ${r.erro}\n`);
      continue;
    }
    const ss  = sinalSaldo(r.saldo);
    const sc  = sinalCtr(r.ctr7d);
    const tipo = r.recarga === 'fundos' ? 'Fundos' : 'Saldo';
    linhas.push(
      `${ss} *${r.nome}*\n` +
      `ID: ${r.id} | Status: ${statusLabel(r.status)} | Tipo: ${tipo}\n` +
      `Pagamento: ${r.saldoDisplay || brl(r.saldo)} → ${duracaoTexto(r)}\n` +
      `Gasto/dia: R$ ${parseFloat(r.gastoDiario).toFixed(2).replace('.', ',')} (média 7d)\n` +
      `Gasto 7d:  R$ ${parseFloat(r.spend7d).toFixed(2).replace('.', ',')}\n` +
      `Alcance 7d: ${numBR(r.reach7d)} pessoas\n` +
      `Impressões: ${numBR(r.impressions7d)} | Cliques: ${numBR(r.clicks7d)}\n` +
      `CTR: ${sc} ${r.ctr7d}% | CPC: R$ ${parseFloat(r.cpc7d).toFixed(2).replace('.', ',')}`
    );
  }

  return linhas.join('\n─────────────────\n');
}

// ─── Alertas automáticos de Ads (seg–sex: 8h–17h todo hora + 17h30 — sáb: 8h/11h — dom: nenhum) ──

function agendarAlertasAds() {
  // [hora, minuto]
  const HORARIOS_SEMANA = [[8,0],[9,0],[10,0],[11,0],[12,0],[13,0],[14,0],[15,0],[16,0],[17,0],[17,30]];
  const HORARIOS_SABADO = [[8,0],[11,0]];

  function horariosHoje(data) {
    const dia = data.getDay(); // 0=dom, 6=sáb
    if (dia === 0) return [];
    return dia === 6 ? HORARIOS_SABADO : HORARIOS_SEMANA;
  }

  function msAteProximoHorario() {
    const agora = new Date();
    const h = agora.getHours(), m = agora.getMinutes(), s = agora.getSeconds();

    for (const [hh, mm] of horariosHoje(agora)) {
      if (h < hh || (h === hh && (m < mm || (m === mm && s === 0)))) {
        const alvo = new Date(agora);
        alvo.setHours(hh, mm, 0, 0);
        return { ms: alvo - agora, label: `${hh}h${mm ? mm : ''}` };
      }
    }
    // Próximo dia útil com horários
    const proximo = new Date(agora);
    proximo.setDate(proximo.getDate() + 1);
    proximo.setHours(0, 0, 0, 0);
    while (horariosHoje(proximo).length === 0) proximo.setDate(proximo.getDate() + 1);
    const [hh0, mm0] = horariosHoje(proximo)[0];
    proximo.setHours(hh0, mm0, 0, 0);
    return { ms: proximo - agora, label: `${hh0}h${mm0 ? mm0 : ''}` };
  }

  async function disparar(label) {
    if (new Date().getDay() === 0) {
      console.log(`📊 Relatório das ${label} ignorado (domingo).`);
      return;
    }
    if (!GRUPO_ALERTAS_ID) {
      console.log('⚠️  WHATSAPP_GRUPO_AUTOMACAO_ID não configurado — relatório automático desativado.');
      return;
    }

    console.log(`📊 [${label}] Gerando dashboard Meta + Google...`);
    try {
      const { monitorarTodas: monitorarMeta }   = require('./monitor-meta-ads');
      const { monitorarTodas: monitorarGoogle } = require('./monitor-google-ads');
      const { gerarDashboardPng } = require('./gerar-dashboard');
      const { MessageMedia } = require('whatsapp-web.js');

      const [metaResult, googleResult] = await Promise.allSettled([
        monitorarMeta(),
        monitorarGoogle(),
      ]);
      const metaRes   = metaResult.status   === 'fulfilled' ? metaResult.value.resultados   : [];
      const googleRes = googleResult.status === 'fulfilled' ? googleResult.value.resultados : [];

      const caption = formatarAlertaSimples(metaRes, googleRes);
      const pngPath = await gerarDashboardPng();
      const media   = MessageMedia.fromFilePath(pngPath);
      const chat    = await client.getChatById(GRUPO_ALERTAS_ID);

      await chat.sendMessage(media, { caption });
      console.log(`✅ Relatório das ${label} enviado (Meta + Google).`);
    } catch (err) {
      console.error(`❌ Erro no relatório das ${label}:`, err.message);
    }
  }

  function loop() {
    const { ms, label } = msAteProximoHorario();
    console.log(`⏰ Próximo relatório automático: ${label} (em ${Math.round(ms / 60000)} min).`);
    setTimeout(async () => {
      await disparar(label);
      loop();
    }, ms);
  }

  loop();
}

// ─── Cobrança automática de vídeos toda segunda-feira às 8h ──────────────────

function agendarCobrancaVideos() {
  const HORA_DISPARO = 8; // 8h00 toda segunda

  function msAteProximaSegunda() {
    const agora = new Date();
    const alvo  = new Date(agora);
    // Avança até a próxima segunda-feira
    const diasAteSegunda = (8 - agora.getDay()) % 7 || 7; // 0=dom,1=seg,...
    // Se hoje é segunda e ainda não passou das 8h, dispara hoje
    if (agora.getDay() === 1 && agora.getHours() < HORA_DISPARO) {
      alvo.setHours(HORA_DISPARO, 0, 0, 0);
    } else {
      alvo.setDate(agora.getDate() + diasAteSegunda);
      alvo.setHours(HORA_DISPARO, 0, 0, 0);
    }
    return alvo - agora;
  }

  const GRUPO_VIDEOS_ID = process.env.WHATSAPP_GRUPO_VIDEOS_ID;

  async function disparar() {
    const msg =
      `Bom dia! Por favor, enviem os vídeos desta semana para publicação nos stories 🎬\n\n` +
      `Loja 1 - Araraquara ❌\n` +
      `Loja 2 - Araraquara ❌\n` +
      `Loja 3 - Americana ❌\n` +
      `Loja 4 - São Carlos ❌\n` +
      `Loja 5 - Maringá ❌\n` +
      `Loja 6 - Jaú ❌\n` +
      `Loja 7 - Ibitinga ❌\n` +
      `Peg 2 - Sorocaba ❌\n\n` +
      `⚠️⚠️⚠️⚠️`;

    try {
      const { MessageMedia } = require('whatsapp-web.js');
      const { gerarImagemTema } = require('./gerar-tema-video');
      const chat = await client.getChatById(GRUPO_VIDEOS_ID);

      // Gera imagem do tema e envia junto com o texto como caption
      try {
        const pngPath = await gerarImagemTema('output/criativos/tema-semana-atual.png');
        const media   = MessageMedia.fromFilePath(pngPath);
        await chat.sendMessage(media, { caption: msg });
      } catch (imgErr) {
        console.warn('⚠️  Imagem do tema não gerada:', imgErr.message);
        await chat.sendMessage(msg);
      }
      console.log('📹 Cobrança de vídeos + tema enviados ao grupo.');
    } catch (err) {
      console.error('❌ Erro ao enviar cobrança de vídeos:', err.message);
    }
  }

  function loop() {
    const ms = msAteProximaSegunda();
    const dias = Math.round(ms / 86400000);
    console.log(`📹 Próxima cobrança de vídeos: segunda às ${HORA_DISPARO}h (em ~${dias} dia(s)).`);
    setTimeout(async () => {
      await disparar();
      loop();
    }, ms);
  }

  loop();
}

// ─── Alerta de saldo crítico (<R$50) ─────────────────────────────────────────

function iniciarAlertaSaldoCritico() {
  const INTERVALO_MS  = 30 * 60 * 1000; // 30 min
  const LIMITE_CRITICO = 5000;           // R$50 em centavos
  const ESTADO_PATH   = require('path').join(__dirname, '..', 'output', 'alertas-saldo-critico.json');
  const fs2 = require('fs');

  function lerEstado() {
    try { return JSON.parse(fs2.readFileSync(ESTADO_PATH, 'utf8')); } catch { return {}; }
  }
  function salvarEstado(estado) {
    fs2.writeFileSync(ESTADO_PATH, JSON.stringify(estado, null, 2), 'utf8');
  }

  async function verificar() {
    try {
      const { monitorarTodas } = require('./monitor-meta-ads');
      const { resultados } = await monitorarTodas();
      const estado = lerEstado();
      const agora  = Date.now();
      const JANELA = 12 * 60 * 60 * 1000; // não repetir em 12h
      const criticos = [];

      for (const r of resultados) {
        if (r.erro || r.saldo === '-1') continue;
        const saldo = parseFloat(r.saldo || 0);
        if (saldo >= LIMITE_CRITICO) continue;

        const ultimoAlerta = estado[r.id] || 0;
        if (agora - ultimoAlerta < JANELA) continue;

        criticos.push(r);
        estado[r.id] = agora;
      }

      if (!criticos.length) return;
      salvarEstado(estado);

      const linhas = criticos.map(r => {
        const saldo = (parseFloat(r.saldo) / 100).toFixed(2).replace('.', ',');
        return `🔴 *${r.nome}* — R$${saldo} restante`;
      });

      const msg =
        `🚨 *SALDO CRÍTICO — Meta Ads*\n\n` +
        linhas.join('\n') +
        `\n\n⚡ Recarregue agora para não pausar os anúncios.`;

      const chat = await client.getChatById(GRUPO_ALERTAS_ID);
      await chat.sendMessage(msg);
      console.log(`🚨 Alerta de saldo crítico enviado: ${criticos.map(r => r.nome).join(', ')}`);
    } catch (err) {
      console.error('❌ Erro no alerta de saldo crítico:', err.message);
    }
  }

  setTimeout(() => {
    verificar();
    setInterval(verificar, INTERVALO_MS);
  }, 2 * 60 * 1000); // primeira verificação após 2 min do boot

  console.log('💰 Alerta de saldo crítico ativo (verifica a cada 30 min, avisa abaixo de R$50).');
}

// ─── Verificação diária de expiração de tokens Meta ──────────────────────────

function agendarVerificacaoTokens() {
  const HORA_VERIFICACAO = 7; // 7h da manhã

  function msAteProximas7h() {
    const agora = new Date();
    const alvo  = new Date(agora);
    alvo.setHours(HORA_VERIFICACAO, 0, 0, 0);
    if (alvo <= agora) alvo.setDate(alvo.getDate() + 1);
    return alvo - agora;
  }

  async function verificar() {
    try {
      const { verificarTokens, formatarAlertaTokens }               = require('./monitor-tokens');
      const { verificarTokenGoogle, formatarAlertaTokenGoogle }     = require('./monitor-token-google');

      const [resultadosMeta, resultadoGoogle] = await Promise.all([
        verificarTokens(),
        verificarTokenGoogle(),
      ]);

      const alertaMeta   = formatarAlertaTokens(resultadosMeta);
      const alertaGoogle = formatarAlertaTokenGoogle(resultadoGoogle);

      if (!alertaMeta && !alertaGoogle) {
        console.log('🔑 Tokens OK — nenhum expirando em breve.');
        return;
      }

      const chat = await client.getChatById(GRUPO_ALERTAS_ID);
      if (alertaMeta)   await chat.sendMessage(alertaMeta);
      if (alertaGoogle) await chat.sendMessage(alertaGoogle);
      console.log('🔑 Alerta(s) de token enviado(s) ao grupo.');

      // Auto-dispara renovação se token Google está crítico (≤ 1 dia)
      if (resultadoGoogle.critico || resultadoGoogle.expirado) {
        console.log('🔑 Token Google crítico — disparando renovação automática...');
        const { exec } = require('child_process');
        exec(
          'node tools/renovar-token-google.js',
          { cwd: path.join(__dirname, '..') },
          (err) => {
            if (err) console.error('❌ Erro ao auto-disparar renovação:', err.message);
            else     console.log('🔑 Script de renovação Google iniciado automaticamente.');
          }
        );
      }
    } catch (err) {
      console.error('❌ Erro na verificação de tokens:', err.message);
    }
  }

  function loop() {
    const ms   = msAteProximas7h();
    const horas = Math.round(ms / 3600000);
    console.log(`🔑 Próxima verificação de tokens: 7h (em ~${horas}h).`);
    setTimeout(async () => {
      await verificar();
      loop();
    }, ms);
  }

  loop();
}

// ─── Relatório semanal — toda segunda-feira às 8h05 ──────────────────────────

function agendarRelatorioSemanal() {
  function msAteProximaSegunda8h05() {
    const agora = new Date();
    const alvo  = new Date(agora);
    const dia   = agora.getDay(); // 0=dom, 1=seg
    const diasAteSegunda = dia === 1 ? 0 : (8 - dia) % 7;
    alvo.setDate(agora.getDate() + diasAteSegunda);
    alvo.setHours(8, 5, 0, 0);
    if (alvo <= agora) alvo.setDate(alvo.getDate() + 7);
    return alvo - agora;
  }

  async function disparar() {
    if (!GRUPO_ALERTAS_ID) {
      console.log('⚠️  WHATSAPP_GRUPO_AUTOMACAO_ID não configurado — relatório semanal desativado.');
      return;
    }
    console.log('📅 Gerando relatório semanal de Ads...');
    try {
      const { gerarRelatorioSemanal, formatarRelatorioSemanal } = require('./relatorio-semanal');
      const dados = await gerarRelatorioSemanal();
      const msg   = formatarRelatorioSemanal(dados);
      const chat  = await client.getChatById(GRUPO_ALERTAS_ID);
      await chat.sendMessage(msg);
      console.log('✅ Relatório semanal enviado ao grupo.');
    } catch (err) {
      console.error('❌ Erro no relatório semanal:', err.message);
    }
  }

  function loop() {
    const ms   = msAteProximaSegunda8h05();
    const dias = Math.round(ms / 86400000);
    console.log(`📅 Próximo relatório semanal: segunda às 8h05 (em ~${dias} dia(s)).`);
    setTimeout(async () => {
      await disparar();
      loop();
    }, ms);
  }

  loop();
}

// ─── Monitor automático de avaliações negativas ───────────────────────────────

function iniciarMonitoramentoReviews() {
  const INTERVALO_MS = 2 * 60 * 60 * 1000; // 2 horas (Puppeteer é mais pesado que API)

  async function verificar() {
    try {
      const { verificarReviewsNegativas, formatarAlertaReview } = require('./monitor-reviews');
      const alertas = await verificarReviewsNegativas();
      if (!alertas.length) return;

      console.log(`⭐ ${alertas.length} avaliação(ões) negativa(s) nova(s) detectada(s).`);

      const destino = process.env.WHATSAPP_GRUPO_AUTOMACOES_ID || GRUPO_ALERTAS_ID;
      if (!destino) {
        console.warn('⚠️  WHATSAPP_GRUPO_AUTOMACOES_ID não configurado — alerta de review não enviado.');
        return;
      }

      const chat = await client.getChatById(destino);
      for (const alerta of alertas) {
        await chat.sendMessage(formatarAlertaReview(alerta));
        await new Promise(r => setTimeout(r, 1500));
      }
    } catch (err) {
      console.error('❌ Erro no monitor de reviews:', err.message);
    }
  }

  // Primeira verificação após 1 min do boot (não na inicialização imediata)
  setTimeout(() => {
    verificar();
    setInterval(verificar, INTERVALO_MS);
  }, 60_000);

  console.log('⭐ Monitor de avaliações Google ativo (verificação a cada 30 min).');
}

client.on('disconnected', (reason) => {
  console.log('❌ Bot desconectado:', reason);
  process.exit(1);
});

// ─── Processar mensagens ───────────────────────────────────────────────────────

async function processarMensagem(msg) {
  // Ignorar respostas automáticas do próprio bot
  if (msg.fromMe && /^[✅⏳📅🤖🚨📊⚠️]/.test(msg.body)) return;

  const corpo     = msg.body.trim().toLowerCase();
  const isGrupo   = msg.from.endsWith('@g.us');
  const remetente = msg.author || msg.from;
  const emFluxo   = estadoConversas.has(remetente);

  if (!emFluxo) {
    if (isGrupo && !corpo.startsWith('!')) return;
    const PALAVRAS_CHAVE = ['ads','saldo','meta','google','grupos','ajuda','help','relatorio','relatório'];
    if (msg.fromMe && !corpo.startsWith('!') && !PALAVRAS_CHAVE.includes(corpo)) return;
  }

  if (!msg.fromMe) {
    if (NUMEROS_AUTORIZADOS.length > 0 && !NUMEROS_AUTORIZADOS.includes(remetente)) return;
  }

  console.log(`📩 [${new Date().toLocaleTimeString('pt-BR')}] ${isGrupo ? 'Grupo' : 'Direto'} — ${corpo}`);

  // ── Relatórios de Ads ───────────────────────────────────────────────────────

  // !recarga — mostra valor fixo de recarga por conta (BR R$300, Peg R$200)
  if (corpo === '!recarga') {
    const { CONTAS_META } = require('./monitor-meta-ads');
    const { CONTAS_GOOGLE } = require('./monitor-google-ads');

    const IDEAL_BR  = 300;
    const IDEAL_PEG = 300;

    let totalMeta = 0;
    const linhasMeta = CONTAS_META.map(c => {
      const ideal = c.nome.startsWith('PEG') ? IDEAL_PEG : IDEAL_BR;
      totalMeta  += ideal;
      const nome  = c.nome.replace('BR PNEUS ', '').replace('PEG PNEUS ', 'Peg ');
      return `💰 ${nome}: *R$${ideal}*`;
    });

    let totalGoogle = 0;
    const linhasGoogle = CONTAS_GOOGLE.map(c => {
      const ideal  = c.nome.startsWith('PEG') ? IDEAL_PEG : IDEAL_BR;
      totalGoogle += ideal;
      const nome   = c.nome.replace('BR PNEUS ', '').replace('PEG PNEUS ', 'Peg ');
      return `💰 ${nome}: *R$${ideal}*`;
    });

    await msg.reply(
      `💳 *Valor de recarga por conta*\n` +
      `_(R$300 por conta)_\n\n` +
      `*Meta Ads:*\n` +
      linhasMeta.join('\n') +
      `\n*Total Meta: R$${totalMeta}*\n` +
      `\n─────────────────\n` +
      `*Google Ads:*\n` +
      linhasGoogle.join('\n') +
      `\n*Total Google: R$${totalGoogle}*\n` +
      `\n─────────────────\n` +
      `*Total Geral: R$${totalMeta + totalGoogle}*`
    );
    return;
  }

  // !renovartoken — inicia renovação do refresh token Google Ads
  if (corpo === '!renovartoken') {
    await msg.reply('🔑 Iniciando renovação do token Google Ads...\n\nO navegador será aberto no servidor. Complete a autorização para salvar o novo token.');
    try {
      const { exec } = require('child_process');
      exec(
        'node tools/renovar-token-google.js',
        { cwd: path.join(__dirname, '..') },
        (err, stdout, stderr) => {
          if (err && !stdout.includes('Autorizado')) {
            console.error('❌ Erro renovar-token-google:', err.message);
          }
        }
      );
      await msg.reply('✅ Script iniciado. Autorize no navegador do servidor e o token será salvo automaticamente.\n\nApós autorizar, rode:\n`pm2 restart br-pneus-bot --update-env`');
    } catch (err) {
      await msg.reply(`❌ Erro: ${err.message}`);
    }
    return;
  }

  // !semanal — relatório semanal de spend Meta + Google sob demanda
  if (corpo === '!semanal') {
    await msg.reply('⏳ Gerando relatório semanal...');
    try {
      const { gerarRelatorioSemanal, formatarRelatorioSemanal } = require('./relatorio-semanal');
      const dados = await gerarRelatorioSemanal();
      await msg.reply(formatarRelatorioSemanal(dados));
    } catch (err) {
      await msg.reply(`❌ Erro: ${err.message}`);
    }
    return;
  }

  // !tokens — verifica expiração dos tokens Meta e Google agora
  if (corpo === '!tokens') {
    await msg.reply('⏳ Verificando tokens Meta e Google...');
    try {
      const { verificarTokens, formatarAlertaTokens }           = require('./monitor-tokens');
      const { verificarTokenGoogle, formatarAlertaTokenGoogle } = require('./monitor-token-google');

      const [resultadosMeta, resultadoGoogle] = await Promise.all([
        verificarTokens(),
        verificarTokenGoogle(),
      ]);

      // Meta
      const alertaMeta = formatarAlertaTokens(resultadosMeta);
      if (alertaMeta) {
        await msg.reply(alertaMeta);
      } else {
        const linhas = resultadosMeta.map(r => {
          if (r.erro)         return `❌ ${r.nome}: ${r.erro}`;
          if (r.nuncaExpira)  return `✅ ${r.nome}: nunca expira`;
          return `✅ ${r.nome}: ${r.diasRestantes} dia(s)`;
        });
        await msg.reply(`🔑 *Tokens Meta — Status*\n\n${linhas.join('\n')}`);
      }

      // Google
      const alertaGoogle = formatarAlertaTokenGoogle(resultadoGoogle);
      if (alertaGoogle) {
        await msg.reply(alertaGoogle);
      } else {
        const diasInfo = resultadoGoogle.diasRestantes !== null
          ? `${resultadoGoogle.diasRestantes} dia(s) restante(s)`
          : 'OK';
        await msg.reply(`🔑 *Token Google Ads — Status*\n\n✅ Google Ads — Refresh Token: ${diasInfo}`);
      }
    } catch (err) {
      await msg.reply(`❌ Erro: ${err.message}`);
    }
    return;
  }

  // !alertagrupo — envia o alerta automático agora no grupo de automações
  if (corpo === '!alertagrupo') {
    try {
      const { monitorarTodas: monitorarMeta }   = require('./monitor-meta-ads');
      const { monitorarTodas: monitorarGoogle } = require('./monitor-google-ads');
      const { gerarDashboardPng } = require('./gerar-dashboard');
      const { MessageMedia } = require('whatsapp-web.js');

      const [{ resultados: metaRes }, googleRes] = await Promise.allSettled([
        monitorarMeta(),
        monitorarGoogle(),
      ]).then(([m, g]) => [
        m.status === 'fulfilled' ? m.value : { resultados: [] },
        g.status === 'fulfilled' ? g.value.resultados : [],
      ]);

      const pngPath = await gerarDashboardPng();
      const media   = MessageMedia.fromFilePath(pngPath);

      if (GRUPO_ALERTAS_ID) {
        const chat = await client.getChatById(GRUPO_ALERTAS_ID);
        await chat.sendMessage(media, { caption: formatarAlertaSimples(metaRes, googleRes) });
        await msg.reply('✅ Meta + Google enviados ao grupo.');
      } else {
        await msg.reply('⚠️ WHATSAPP_GRUPO_AUTOMACAO_ID não configurado.');
      }
    } catch (err) {
      await msg.reply(`❌ Erro: ${err.message}`);
    }
    return;
  }

  // !valoresads — resumo simples por cor (saldo + dias restantes)
  if (corpo === '!valoresads') {
    try {
      const { monitorarTodas: monitorarMeta }   = require('./monitor-meta-ads');
      const { monitorarTodas: monitorarGoogle } = require('./monitor-google-ads');
      const [mR, gR] = await Promise.allSettled([monitorarMeta(), monitorarGoogle()]);
      const metaRes   = mR.status === 'fulfilled' ? mR.value.resultados   : [];
      const googleRes = gR.status === 'fulfilled' ? gR.value.resultados   : [];
      await msg.reply(formatarAlertaSimples(metaRes, googleRes));
    } catch (err) {
      await msg.reply(`❌ Erro: ${err.message}`);
    }
    return;
  }

  // !ads — relatório completo Meta + Google
  if (corpo === '!ads' || corpo === 'ads' || corpo === 'relatorio' || corpo === 'relatório') {
    try {
      const { monitorarTodas: monitorarMeta }   = require('./monitor-meta-ads');
      const { monitorarTodas: monitorarGoogle } = require('./monitor-google-ads');

      const [{ resultados: metaRes }, googleRes] = await Promise.allSettled([
        monitorarMeta(),
        monitorarGoogle(),
      ]).then(([m, g]) => [
        m.status === 'fulfilled' ? m.value : { resultados: [] },
        g.status === 'fulfilled' ? g.value.resultados : [],
      ]);

      await msg.reply(formatarRelatorioCompleto(metaRes));
      await new Promise(r => setTimeout(r, 1500));
      await msg.reply(formatarAlertaGoogle(googleRes));
    } catch (err) {
      await msg.reply(`❌ Erro: ${err.message}`);
    }
    return;
  }

  // !google — relatório Google Ads detalhado
  if (corpo === '!google' || corpo === 'google') {
    try {
      const { monitorarTodas } = require('./monitor-google-ads');
      const { resultados } = await monitorarTodas();
      await msg.reply(formatarAlertaGoogle(resultados));
    } catch (err) {
      await msg.reply(`❌ Erro: ${err.message}`);
    }
    return;
  }

  // ── Fluxo de agendamento (multi-etapa) ────────────────────────────────────

  const {
    adicionarAgendamento, cancelarAgendamento, salvarMidia, formatarLista,
  } = require('./agendador-mensagens');

  const estadoUsuario = estadoConversas.get(remetente);

  // ETAPA 2: aguardando imagem
  if (estadoUsuario?.etapa === 'aguardando_imagem') {
    if (corpo === 'pular') {
      estadoConversas.set(remetente, { etapa: 'aguardando_texto', dados: { ...estadoUsuario.dados, imagemPath: null } });
      await msg.reply('Ok! Agora envie o *texto da mensagem*.');
    } else if (msg.hasMedia) {
      const imagemPath = await salvarMidia(msg);
      estadoConversas.set(remetente, { etapa: 'aguardando_texto', dados: { ...estadoUsuario.dados, imagemPath } });
      await msg.reply('✅ Imagem recebida!\n\nAgora envie o *texto da mensagem*.\n\n_(ou envie `pular` para enviar só a imagem)_');
    } else {
      await msg.reply('⚠️ Envie a imagem/arte agora.\n\n_(ou `pular` para só texto, ou `cancelar` para desistir)_');
    }
    return;
  }

  // ETAPA 3: aguardando texto
  if (estadoUsuario?.etapa === 'aguardando_texto') {
    if (corpo === 'cancelar') {
      estadoConversas.delete(remetente);
      await msg.reply('❌ Agendamento cancelado.');
      return;
    }
    try {
      const texto        = corpo === 'pular' ? '' : msg.body.trim();
      const mentionedIds = Array.isArray(msg.mentionedIds) ? [...msg.mentionedIds] : [];
      const { data, hora, imagemPath } = estadoUsuario.dados;
      const item = adicionarAgendamento({ data, hora, mensagem: texto, imagemPath, mentionedIds });
      estadoConversas.delete(remetente);

      await msg.reply(
        `✅ *Mensagem agendada! #${item.id}*\n\n` +
        `📅 Data: *${data}*\n` +
        `⏰ Hora: *${hora}*\n` +
        `🖼️ Imagem: ${imagemPath ? 'Sim' : 'Não'}\n` +
        `📝 Texto: ${texto ? texto.slice(0, 80) : '_(sem texto)_'}\n` +
        `📤 Destino: ${GRUPO_ID ? 'grupo configurado' : '⚠️ grupo não configurado'}\n\n` +
        `Para cancelar: \`!cancelar ${item.id}\``
      );
    } catch (err) {
      estadoConversas.delete(remetente);
      console.error('Erro no agendamento etapa 3:', err.message);
      await msg.reply(`❌ Erro ao salvar agendamento: ${err.message}`);
    }
    return;
  }

  // ─── FLUXOS: !colaborador e !aniversario ────────────────────────────────────

  const MARCAS_VALIDAS = { '1': 'brpneus', brpneus: 'brpneus', br: 'brpneus', '2': 'pegpneus', pegpneus: 'pegpneus', peg: 'pegpneus', '3': 'smartcar', smartcar: 'smartcar', smart: 'smartcar' };
  const LABELS = { brpneus: 'BR Pneus & Oficina', pegpneus: 'Peg Pneus Atacarejo', smartcar: 'SmartCar' };

  // Estado: aguardando escolha de empresa — colaborador
  if (estadoUsuario?.etapa === 'colab_empresa') {
    if (corpo === 'cancelar') { estadoConversas.delete(remetente); await msg.reply('❌ Cancelado.'); return; }
    const marcaRaw = corpo.toLowerCase().replace(/[^a-z0-9]/g, '');
    const marca = MARCAS_VALIDAS[marcaRaw];
    if (!marca) { await msg.reply('⚠️ Opção inválida. Responda com *1*, *2* ou *3* (ou `cancelar`).'); return; }
    estadoConversas.set(remetente, { etapa: 'colab_foto', dados: { marca } });
    await msg.reply(`✅ *${LABELS[marca]}*\n\n📸 Envie a *foto* da pessoa.\n\n_(ou \`cancelar\` para desistir)_`);
    return;
  }

  // Estado: aguardando escolha de empresa — aniversário
  if (estadoUsuario?.etapa === 'aniv_empresa') {
    if (corpo === 'cancelar') { estadoConversas.delete(remetente); await msg.reply('❌ Cancelado.'); return; }
    const marcaRaw = corpo.toLowerCase().replace(/[^a-z0-9]/g, '');
    const marca = MARCAS_VALIDAS[marcaRaw];
    if (!marca) { await msg.reply('⚠️ Opção inválida. Responda com *1*, *2* ou *3* (ou `cancelar`).'); return; }
    estadoConversas.set(remetente, { etapa: 'aniv_foto', dados: { marca } });
    await msg.reply(`✅ *${LABELS[marca]}*\n\n📸 Envie a *foto* da pessoa.\n\n_(ou \`cancelar\` para desistir)_`);
    return;
  }

  // Estado: aguardando foto do colaborador
  if (estadoUsuario?.etapa === 'colab_foto') {
    if (corpo === 'cancelar') { estadoConversas.delete(remetente); await msg.reply('❌ Cancelado.'); return; }
    if (!msg.hasMedia) { await msg.reply('📸 Envie a *foto* da pessoa (ou `cancelar`).'); return; }
    const fotoPath = await salvarMidia(msg);
    estadoConversas.set(remetente, { etapa: 'colab_nome', dados: { ...estadoUsuario.dados, fotoPath } });
    await msg.reply('✅ Foto recebida!\n\nAgora envie o *nome completo*:');
    return;
  }

  // Estado: aguardando nome do colaborador
  if (estadoUsuario?.etapa === 'colab_nome') {
    if (corpo === 'cancelar') { estadoConversas.delete(remetente); await msg.reply('❌ Cancelado.'); return; }
    estadoConversas.set(remetente, { etapa: 'colab_cargo', dados: { ...estadoUsuario.dados, nome: msg.body.trim() } });
    await msg.reply('👍 Agora envie o *cargo*:\n\n_Ex: Mecânico, Consultora de Vendas, Caixa..._');
    return;
  }

  // Estado: aguardando cargo do colaborador
  if (estadoUsuario?.etapa === 'colab_cargo') {
    if (corpo === 'cancelar') { estadoConversas.delete(remetente); await msg.reply('❌ Cancelado.'); return; }
    estadoConversas.set(remetente, { etapa: 'colab_cidade', dados: { ...estadoUsuario.dados, cargo: msg.body.trim() } });
    await msg.reply('📍 Agora envie a *cidade/loja*:\n\n_Ex: Araraquara, São Carlos, Maringá..._');
    return;
  }

  // Estado: aguardando cidade do colaborador → gera arte
  if (estadoUsuario?.etapa === 'colab_cidade') {
    if (corpo === 'cancelar') { estadoConversas.delete(remetente); await msg.reply('❌ Cancelado.'); return; }
    const { marca, fotoPath, nome, cargo, chatId } = estadoUsuario.dados;
    const cidade = msg.body.trim();
    estadoConversas.delete(remetente);
    await msg.reply('⏳ Gerando arte... aguarde.');
    try {
      const { gerarColaborador } = require('./gerar-arte');
      const pngPath = await gerarColaborador({ marca, nome, cargo, cidade, fotoPath });
      const { MessageMedia } = require('whatsapp-web.js');
      const media = MessageMedia.fromFilePath(pngPath);
      await client.sendMessage(GRUPO_ALERTAS_ID, media, { caption: `✅ *Bem-vindo(a) ${nome}!*\n${cargo} — ${cidade}` });
    } catch (err) {
      await msg.reply(`❌ Erro ao gerar arte: ${err.message}`);
    }
    return;
  }

  // Estado: aguardando foto do aniversariante
  if (estadoUsuario?.etapa === 'aniv_foto') {
    if (corpo === 'cancelar') { estadoConversas.delete(remetente); await msg.reply('❌ Cancelado.'); return; }
    if (!msg.hasMedia) { await msg.reply('📸 Envie a *foto* da pessoa (ou `cancelar`).'); return; }
    const fotoPath = await salvarMidia(msg);
    estadoConversas.set(remetente, { etapa: 'aniv_nome', dados: { ...estadoUsuario.dados, fotoPath } });
    await msg.reply('✅ Foto recebida!\n\nAgora envie o *nome* do(a) aniversariante:');
    return;
  }

  // Estado: aguardando nome do aniversariante → gera arte
  if (estadoUsuario?.etapa === 'aniv_nome') {
    if (corpo === 'cancelar') { estadoConversas.delete(remetente); await msg.reply('❌ Cancelado.'); return; }
    const { marca, fotoPath, chatId } = estadoUsuario.dados;
    const nome = msg.body.trim();
    estadoConversas.delete(remetente);
    await msg.reply('⏳ Gerando arte... aguarde.');
    try {
      const { gerarAniversario } = require('./gerar-arte');
      const pngPath = await gerarAniversario({ marca, nome, fotoPath });
      const { MessageMedia } = require('whatsapp-web.js');
      const media = MessageMedia.fromFilePath(pngPath);
      await client.sendMessage(GRUPO_ALERTAS_ID, media, { caption: `🎂 *Parabéns ${nome}!*` });
    } catch (err) {
      await msg.reply(`❌ Erro ao gerar arte: ${err.message}`);
    }
    return;
  }

  // COMANDO: !colaborador
  if (corpo.startsWith('!colaborador')) {
    const MENU_EMPRESA = '🎉 *Arte de Novo Colaborador*\n\nEscolha a empresa:\n1️⃣ BR Pneus & Oficina\n2️⃣ Peg Pneus Atacarejo\n3️⃣ SmartCar\n\n_(ou `cancelar` para desistir)_';
    estadoConversas.set(remetente, { etapa: 'colab_empresa', dados: { chatId: msg.from } });
    await msg.reply(MENU_EMPRESA);
    return;
  }

  // COMANDO: !aniversario
  if (corpo.startsWith('!aniversario') || corpo.startsWith('!aniversário')) {
    const MENU_EMPRESA = '🎂 *Arte de Aniversariante*\n\nEscolha a empresa:\n1️⃣ BR Pneus & Oficina\n2️⃣ Peg Pneus Atacarejo\n3️⃣ SmartCar\n\n_(ou `cancelar` para desistir)_';
    estadoConversas.set(remetente, { etapa: 'aniv_empresa', dados: { chatId: msg.from } });
    await msg.reply(MENU_EMPRESA);
    return;
  }

  // COMANDO: !agendar DD/MM HH:MM
  if (corpo.startsWith('!agendar')) {
    const partes = msg.body.trim().split(/\s+/);
    if (partes.length < 3) {
      await msg.reply(
        '📅 *Como agendar uma mensagem:*\n\n' +
        '`!agendar DD/MM HH:MM`\n\n' +
        'Exemplos:\n`!agendar 25/04 09:00`\n`!agendar 01/05 14:30`\n\n' +
        'Depois envie a imagem e o texto.'
      );
      return;
    }

    let dataRaw = partes[1];
    const hora  = partes[2];

    if (!/^\d{2}:\d{2}$/.test(hora)) {
      await msg.reply('⚠️ Hora inválida. Use HH:MM, ex: `09:00`');
      return;
    }
    if (dataRaw.split('/').length === 2) dataRaw += `/${new Date().getFullYear()}`;
    const [d, m, a] = dataRaw.split('/');
    if (!d || !m || !a || isNaN(new Date(`${a}-${m}-${d}`))) {
      await msg.reply('⚠️ Data inválida. Use DD/MM ou DD/MM/AAAA, ex: `25/04`');
      return;
    }
    const data = `${d.padStart(2,'0')}/${m.padStart(2,'0')}/${a}`;

    estadoConversas.set(remetente, { etapa: 'aguardando_imagem', dados: { data, hora } });
    await msg.reply(
      `📅 Agendando para *${data} às ${hora}*\n\n` +
      `Envie a *imagem/arte* que será postada.\n\n` +
      `_(ou envie \`pular\` para só texto)_`
    );
    return;
  }

  // COMANDO: !agendamentos
  if (corpo === '!agendamentos' || corpo === '!agenda') {
    await msg.reply(formatarLista());
    return;
  }

  // COMANDO: !cancelar ID
  if (corpo.startsWith('!cancelar ')) {
    const id = corpo.split(' ')[1];
    const item = cancelarAgendamento(id);
    if (!item) {
      await msg.reply(`⚠️ Agendamento #${id} não encontrado.`);
    } else {
      await msg.reply(`✅ Agendamento #${id} cancelado.\n📅 Era para ${item.data} às ${item.hora}.`);
    }
    return;
  }

  // COMANDO: !grupos
  if (corpo === '!grupos' || corpo === 'grupos') {
    const chats = await client.getChats();
    const grupos = chats.filter(c => c.isGroup);
    if (grupos.length === 0) { await msg.reply('Nenhum grupo encontrado.'); return; }
    let lista = '📋 *Grupos disponíveis:*\n\n';
    for (const g of grupos) lista += `• *${g.name}*\n  ID: \`${g.id._serialized}\`\n\n`;
    lista += 'Configure no .env:\n`WHATSAPP_GRUPO_ID` → mensagens agendadas\n`WHATSAPP_GRUPO_AUTOMACAO_ID` → relatórios de Ads';
    await msg.reply(lista);
    return;
  }

  // ── Posts recorrentes ──────────────────────────────────────────────────────

  const rec = require('./agendador-recorrente');

  // !fixo seg 09:00 — iniciar criação de post recorrente
  if (corpo.startsWith('!fixo ')) {
    const partes = msg.body.trim().split(/\s+/);
    if (partes.length < 3) {
      await msg.reply(
        '🔁 *Como criar um post recorrente:*\n\n' +
        '`!fixo DIA HH:MM`\n\n' +
        'Dias: `seg` `ter` `qua` `qui` `sex` `sab` `dom`\n\n' +
        'Exemplos:\n`!fixo seg 09:00` → toda segunda às 9h\n`!fixo qui 11:00` → toda quinta às 11h'
      );
      return;
    }
    const diaStr = partes[1].toLowerCase();
    const hora   = partes[2];
    const diaSemana = rec.DIAS[diaStr];

    if (diaSemana === undefined) {
      await msg.reply('⚠️ Dia inválido. Use: `seg` `ter` `qua` `qui` `sex` `sab` `dom`');
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(hora)) {
      await msg.reply('⚠️ Hora inválida. Use HH:MM, ex: `09:00`');
      return;
    }

    estadoConversas.set(remetente, { etapa: 'fixo_aguardando_imagem', dados: { diaSemana, hora, diaStr } });
    await msg.reply(
      `🔁 Criando post recorrente: *${rec.DIAS_NOME[diaSemana]} às ${hora}*\n\n` +
      `Envie a *imagem/arte* que será postada toda semana.\n\n` +
      `_(ou envie \`pular\` para só texto)_`
    );
    return;
  }

  // Fluxo de criação do post recorrente — etapa imagem
  if (estadoConversas.get(remetente)?.etapa === 'fixo_aguardando_imagem') {
    const estado = estadoConversas.get(remetente);
    if (corpo === 'cancelar') {
      estadoConversas.delete(remetente);
      await msg.reply('❌ Cancelado.');
      return;
    }
    if (corpo === 'pular') {
      estadoConversas.set(remetente, { etapa: 'fixo_aguardando_texto', dados: { ...estado.dados, imagemPath: null } });
      await msg.reply('Ok! Agora envie o *texto da mensagem*.');
      return;
    }
    if (msg.hasMedia) {
      const imagemPath = await rec.salvarMidia(msg);
      estadoConversas.set(remetente, { etapa: 'fixo_aguardando_texto', dados: { ...estado.dados, imagemPath } });
      await msg.reply('✅ Imagem salva!\n\nAgora envie o *texto da mensagem*.\n\n_(ou `pular` para só imagem)_');
      return;
    }
    await msg.reply('⚠️ Envie a imagem ou `pular`.');
    return;
  }

  // Fluxo de criação do post recorrente — etapa texto
  if (estadoConversas.get(remetente)?.etapa === 'fixo_aguardando_texto') {
    const estado = estadoConversas.get(remetente);
    if (corpo === 'cancelar') {
      estadoConversas.delete(remetente);
      await msg.reply('❌ Cancelado.');
      return;
    }
    try {
      const texto = corpo === 'pular' ? '' : msg.body.trim();
      const { diaSemana, hora, imagemPath } = estado.dados;
      const item = rec.adicionar({ diaSemana, hora, mensagem: texto, imagemPath });
      estadoConversas.delete(remetente);
      await msg.reply(
        `✅ *Post recorrente criado! #${item.id}*\n\n` +
        `📅 Todo *${rec.DIAS_NOME[diaSemana]}* às *${hora}*\n` +
        `🖼️ Imagem: ${imagemPath ? 'Sim' : 'Não'}\n` +
        `📝 Texto: ${texto ? texto.slice(0,80) : '_(sem texto)_'}\n\n` +
        `Para pausar: \`!pausarfixo ${item.id}\`\nPara deletar: \`!deletarfixo ${item.id}\``
      );
    } catch (err) {
      estadoConversas.delete(remetente);
      await msg.reply(`❌ Erro: ${err.message}`);
    }
    return;
  }

  if (corpo === '!fixos' || corpo === '!recorrentes') {
    await msg.reply(rec.formatarLista());
    return;
  }

  if (corpo.startsWith('!pausarfixo ')) {
    const id   = corpo.split(' ')[1];
    const item = rec.toggleAtivo(id);
    if (!item) { await msg.reply(`⚠️ Post #${id} não encontrado.`); return; }
    await msg.reply(`${item.ativo ? '▶️ Retomado' : '⏸️ Pausado'}: Post #${item.id} (${rec.DIAS_NOME[item.diaSemana]} ${item.hora})`);
    return;
  }

  if (corpo.startsWith('!deletarfixo ')) {
    const id   = corpo.split(' ')[1];
    const item = rec.remover(id);
    if (!item) { await msg.reply(`⚠️ Post #${id} não encontrado.`); return; }
    await msg.reply(`🗑️ Post recorrente #${item.id} deletado.`);
    return;
  }

  // !leads / !leads7d / !leads30d — dashboard Deskrio por período
  if (corpo === '!leads' || corpo === '!leads7d' || corpo === '!leads30d') {
    const periodo = corpo === '!leads7d' ? '7d' : corpo === '!leads30d' ? '30d' : 'hoje';
    await msg.reply('⏳ Carregando dashboard...');
    try {
      const { gerarDeskrioDashboardPng, formatarResumo } = require('./monitor-deskrio');
      const { MessageMedia } = require('whatsapp-web.js');
      const { pngPath, resultados } = await gerarDeskrioDashboardPng(periodo);
      const texto = formatarResumo(resultados);
      const media = MessageMedia.fromFilePath(pngPath);
      const chat  = await msg.getChat();
      await chat.sendMessage(media, { caption: texto });
    } catch (err) {
      await msg.reply(`❌ Erro Deskrio: ${err.message}`);
    }
    return;
  }

  // !leadsdata DD/MM DD/MM — dashboard para período customizado
  if (corpo.startsWith('!leadsdata ')) {
    const partes = corpo.replace('!leadsdata ', '').trim().split(/\s+/);
    if (partes.length < 2) {
      await msg.reply('📅 *Uso:* `!leadsdata DD/MM DD/MM`\n_Exemplo:_ `!leadsdata 01/04 17/04`');
      return;
    }
    await msg.reply('⏳ Carregando dashboard...');
    try {
      const { gerarDeskrioDashboardPngRange, formatarResumo } = require('./monitor-deskrio');
      const { MessageMedia } = require('whatsapp-web.js');
      const { pngPath, resultados } = await gerarDeskrioDashboardPngRange(partes[0], partes[1]);
      const texto = formatarResumo(resultados);
      const media = MessageMedia.fromFilePath(pngPath);
      const chat  = await msg.getChat();
      await chat.sendMessage(media, { caption: texto });
    } catch (err) {
      await msg.reply(`❌ Erro: ${err.message}`);
    }
    return;
  }

  // !leadscheck — verificar integridade dos dados Deskrio
  if (corpo === '!leadscheck') {
    try {
      const { monitorarDeskrio, formatarVerificacao } = require('./monitor-deskrio');
      const resultados = await monitorarDeskrio('hoje');
      await msg.reply(formatarVerificacao(resultados));
    } catch (err) {
      await msg.reply(`❌ Erro: ${err.message}`);
    }
    return;
  }

  // ── Ranking de atendentes ──────────────────────────────────────────────────

  if (corpo === '!ranking' || corpo === '!ranking7d' || corpo === '!rankinghoje') {
    const periodo = corpo === '!ranking7d' ? '7d' : corpo === '!rankinghoje' ? 'hoje' : 'semana';
    await msg.reply('⏳ Calculando ranking...');
    try {
      const { gerarRankingDashboardPng, formatarRanking } = require('./monitor-deskrio');
      const { MessageMedia } = require('whatsapp-web.js');
      const { pngPath, resultados } = await gerarRankingDashboardPng(periodo);
      const texto = formatarRanking(resultados);
      const chat  = await msg.getChat();
      const media = MessageMedia.fromFilePath(pngPath);
      await chat.sendMessage(media, { caption: texto });
    } catch (err) {
      await msg.reply(`❌ Erro: ${err.message}`);
    }
    return;
  }

  // ── Reviews Google ─────────────────────────────────────────────────────────

  if (corpo === '!reviews' || corpo === '!reviewscheck') {
    try {
      const { statusConfig } = require('./monitor-reviews');
      await msg.reply(statusConfig());
    } catch (err) {
      await msg.reply(`❌ Erro: ${err.message}`);
    }
    return;
  }

  if (corpo === '!reviewstestar') {
    await msg.reply('⏳ Verificando avaliações...');
    try {
      const { verificarReviewsNegativas, formatarAlertaReview } = require('./monitor-reviews');
      const alertas = await verificarReviewsNegativas();
      if (!alertas.length) {
        await msg.reply('✅ Nenhuma avaliação negativa nova encontrada.');
      } else {
        await msg.reply(`⚠️ *${alertas.length} avaliação(ões) negativa(s) nova(s):*`);
        for (const a of alertas) {
          await msg.reply(formatarAlertaReview(a));
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    } catch (err) {
      await msg.reply(`❌ Erro: ${err.message}`);
    }
    return;
  }

  // ── Tema de vídeo semanal ──────────────────────────────────────────────────

  // !tema-preview [semana] — gera o tema de uma semana e manda no grupo automação para aprovação
  if (corpo.startsWith('!tema-preview')) {
    await msg.reply('⏳ Gerando imagem do tema...');
    try {
      const { gerarImagemTema, getSemanaAtual, getTemaDoAno } = require('./gerar-tema-video');
      const { MessageMedia } = require('whatsapp-web.js');

      const partes = corpo.split(/\s+/);
      const base   = getSemanaAtual();
      const semana = partes[1] ? parseInt(partes[1]) : base.semana + 1;
      const ano    = base.ano;
      const tema   = getTemaDoAno(ano, semana);
      const pngPath = await gerarImagemTema(
        `output/criativos/tema-semana-${semana}-preview.png`,
        { semana, ano }
      );

      // Salva o tema pendente para !confirmar-tema
      const pendentePath = path.join(__dirname, '..', 'output', 'tema-pendente.json');
      require('fs').writeFileSync(pendentePath, JSON.stringify({ pngPath, semana, ano, titulo: tema.titulo }), 'utf8');

      const media = MessageMedia.fromFilePath(pngPath);
      const chat  = await client.getChatById(GRUPO_ALERTAS_ID);
      await chat.sendMessage(media, {
        caption:
          `🔍 *Preview do tema da semana ${semana}*\n` +
          `*${tema.titulo}*\n\n` +
          `Responda \`!confirmar-tema\` aqui para enviar ao grupo de conteúdos das lojas.`,
      });
      await msg.reply(`✅ Preview enviado ao grupo automações.`);
    } catch (err) {
      await msg.reply(`❌ Erro: ${err.message}`);
    }
    return;
  }

  // !confirmar-tema — aprova o tema pendente e envia ao grupo de conteúdos com cobrance
  if (corpo === '!confirmar-tema') {
    try {
      const { MessageMedia } = require('whatsapp-web.js');
      const fs2 = require('fs');
      const pendentePath = path.join(__dirname, '..', 'output', 'tema-pendente.json');

      if (!fs2.existsSync(pendentePath)) {
        await msg.reply('⚠️ Nenhum tema pendente. Use `!tema-preview` primeiro.');
        return;
      }

      const { pngPath, semana, titulo } = JSON.parse(fs2.readFileSync(pendentePath, 'utf8'));
      if (!fs2.existsSync(pngPath)) {
        await msg.reply(`❌ Arquivo de imagem não encontrado: ${pngPath}`);
        return;
      }

      const GRUPO_VIDEOS_ID = process.env.WHATSAPP_GRUPO_VIDEOS_ID;
      if (!GRUPO_VIDEOS_ID) {
        await msg.reply('❌ WHATSAPP_GRUPO_VIDEOS_ID não configurado.');
        return;
      }

      const mensagem =
        `Bom dia! Por favor, enviem os vídeos desta semana para publicação nos stories 🎬\n\n` +
        `Loja 1 - Araraquara ❌\n` +
        `Loja 2 - Araraquara ❌\n` +
        `Loja 3 - Americana ❌\n` +
        `Loja 4 - São Carlos ❌\n` +
        `Loja 5 - Maringá ❌\n` +
        `Loja 6 - Jaú ❌\n` +
        `Loja 7 - Ibitinga ❌\n` +
        `Peg 2 - Sorocaba ❌\n\n` +
        `⚠️⚠️⚠️⚠️`;

      const media = MessageMedia.fromFilePath(pngPath);
      const chat  = await client.getChatById(GRUPO_VIDEOS_ID);
      await chat.sendMessage(media, { caption: mensagem });

      fs2.unlinkSync(pendentePath);
      await msg.reply(`✅ Tema *semana ${semana} — ${titulo}* enviado ao grupo de conteúdos!`);
    } catch (err) {
      await msg.reply(`❌ Erro: ${err.message}`);
    }
    return;
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────

  if (corpo === '!dashboard') {
    try {
      const { gerarDashboardPng } = require('./gerar-dashboard');
      const pngPath = await gerarDashboardPng();
      const { MessageMedia } = require('whatsapp-web.js');
      const media = MessageMedia.fromFilePath(pngPath);
      const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      const chat = await msg.getChat();
      await chat.sendMessage(media, { caption: `📊 *Dashboard Ads (Meta + Google) — ${agora}*` });
    } catch (err) {
      await msg.reply(`❌ Erro ao gerar dashboard: ${err.message}`);
    }
    return;
  }

  // COMANDO: !ajuda
  if (corpo === '!ajuda' || corpo === 'ajuda' || corpo === 'help') {
    await msg.reply(
      '🤖 *Bot BR Pneus — Comandos:*\n\n' +
      '📊 *Ads:*\n' +
      '`!valoresads` → Resumo 🔴🟠🟢\n' +
      '`!ads` → Relatório completo\n' +
      '`!recarga` → Quanto falta para o ideal\n' +
      '`!alertagrupo` → Enviar alerta ao grupo agora\n' +
      '`!dashboard` → Gerar dashboard HTML\n' +
      '`!tokens` → Verificar expiração dos tokens Meta\n\n' +
      '📅 *Agendamento avulso:*\n' +
      '`!agendar 25/04 09:00` → Agendar uma vez\n' +
      '`!agendamentos` → Ver agendados\n' +
      '`!cancelar 3` → Cancelar #3\n\n' +
      '🔁 *Posts recorrentes (toda semana):*\n' +
      '`!fixo seg 09:00` → Criar post toda segunda\n' +
      '`!fixo qui 11:00` → Criar post toda quinta\n' +
      '`!fixos` → Ver todos\n' +
      '`!pausarfixo 2` → Pausar/retomar #2\n' +
      '`!deletarfixo 2` → Deletar #2\n\n' +
      '📥 *Deskrio (leads):*\n' +
      '`!leads` → Hoje\n' +
      '`!leads7d` → Últimos 7 dias\n' +
      '`!leads30d` → Últimos 30 dias\n' +
      '`!leadsdata 01/04 17/04` → Período customizado\n' +
      '`!leadscheck` → Verificar integridade dos dados\n\n' +
      '🏆 *Ranking:*\n' +
      '`!ranking` → Semana atual (seg–hoje)\n' +
      '`!ranking7d` → Últimos 7 dias\n' +
      '`!rankinghoje` → Só hoje\n\n' +
      '⭐ *Avaliações Google:*\n' +
      '`!reviews` → Ver lojas monitoradas\n' +
      '`!reviewstestar` → Verificar agora manualmente\n' +
      '_Alertas automáticos a cada 30 min._\n\n' +
      '🎬 *Tema de vídeo semanal:*\n' +
      '`!tema-preview` → Preview semana seguinte\n' +
      '`!tema-preview 18` → Preview semana específica\n' +
      '`!confirmar-tema` → Enviar tema aprovado ao grupo de conteúdos\n\n' +
      '🎉 *Artes automáticas:*\n' +
      '`!colaborador brpneus` → Arte de novo colaborador (BR Pneus)\n' +
      '`!colaborador pegpneus` → Arte de novo colaborador (Peg Pneus)\n' +
      '`!colaborador smartcar` → Arte de novo colaborador (SmartCar)\n' +
      '`!aniversario brpneus` → Arte de aniversariante (BR Pneus)\n' +
      '`!aniversario pegpneus` → Arte de aniversariante (Peg Pneus)\n' +
      '_Após o comando: envie a foto → nome → cargo → cidade._\n\n' +
      '`!grupos` → Listar grupos\n' +
      '`!ajuda` → Esta mensagem\n\n' +
      '_Relatórios automáticos de Ads: 8h–17h (hora em hora) + 17h30 (seg–sáb)._'
    );
    return;
  }
}

client.on('message',        processarMensagem);
client.on('message_create', processarMensagem);

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function rodarMonitor(flags = '--meta --auto') {
  return new Promise((resolve) => {
    try {
      const out = execSync(
        `"${NODE_PATH}" "${MONITOR_ADS}" ${flags}`,
        { encoding: 'utf8', timeout: 60000, cwd: path.join(__dirname, '..') }
      );
      resolve(out);
    } catch (err) {
      resolve(err.stdout || err.message || 'Erro ao consultar.');
    }
  });
}

function formatarParaWhatsApp(texto) {
  const linhas = texto.split('\n')
    .filter(l => !l.includes('injected env') && !l.startsWith('◇'))
    .filter(l => !l.match(/^[═─]{10,}/))
    .map(l => l.replace(/^\s{2,}/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (linhas.length > 3000) {
    return linhas.slice(0, 3000) + '\n\n_(relatório truncado — use npm run ads para ver tudo)_';
  }
  return linhas;
}

async function enviarMensagem(chatId, texto) {
  try {
    const chat = await client.getChatById(chatId);
    await chat.sendMessage(texto);
    return true;
  } catch (err) {
    console.error('Erro ao enviar para', chatId, ':', err.message);
    return false;
  }
}

function getBotClient() { return client.info ? client : null; }
module.exports = { enviarMensagem, getBotClient };

// ─── API interna para comunicação entre processos (porta 3099) ────────────────

const http = require('http');
const apiServer = http.createServer((req, res) => {
  if (req.method !== 'POST' || (req.url !== '/send' && req.url !== '/send-media')) {
    res.writeHead(404); res.end(); return;
  }
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      if (req.url === '/send-media') {
        const { chatId, media, caption } = JSON.parse(body);
        const { MessageMedia } = require('whatsapp-web.js');
        const m = new MessageMedia(media.mimetype, media.data, media.filename);
        const chat = await client.getChatById(chatId);
        await chat.sendMessage(m, { caption: caption || '' });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      const { chatId, message } = JSON.parse(body);
      const chat = await client.getChatById(chatId);
      await chat.sendMessage(message);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, erro: e.message }));
    }
  });
});
apiServer.listen(3099, '127.0.0.1', () =>
  console.log('🔌 API interna do bot escutando em 127.0.0.1:3099')
);

// ─── Start ─────────────────────────────────────────────────────────────────────

console.log('🔄 Iniciando WhatsApp Bot...');
client.initialize();
