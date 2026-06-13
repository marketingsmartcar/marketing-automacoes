'use strict';

require('dotenv').config();

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode  = require('qrcode-terminal');
const { execSync, exec } = require('child_process');
const path    = require('path');
const fs      = require('fs');

// ─── Configuração ──────────────────────────────────────────────────────────────

const NUMEROS_AUTORIZADOS = (process.env.WHATSAPP_ADMIN_NUMBERS || '')
  .split(',').map(n => n.trim()).filter(Boolean)
  .map(n => n.replace(/\D/g, '') + '@c.us');

// WHATSAPP_GRUPO_ID          → destino das mensagens agendadas via !agendar
// WHATSAPP_GRUPO_AUTOMACAO_ID → relatórios de Ads, stories, avaliações negativas
const GRUPO_ID               = process.env.WHATSAPP_GRUPO_ID || '';
const GRUPO_ALERTAS_ID       = process.env.WHATSAPP_GRUPO_AUTOMACAO_ID || '';
const GRUPO_PEG_ATENDIMENTO  = process.env.WHATSAPP_PEG_ATENDIMENTO_ID || '';

const NODE_PATH   = process.execPath;
const MONITOR_ADS = path.join(__dirname, 'monitor-ads.js');
const SESSION_DIR = path.join(__dirname, '..', '.wwebjs_auth');

const { processarAtendimento } = require('./peg-atendimento');

const { processarCidade, listarCidadesComVideos } = require('./video-editor/editor-automatico');

// ─── Senhas por setor ──────────────────────────────────────────────────────────
const SENHAS_SETORES = {
  'pos venda':          'rTqVB@2025',
  'pós venda':          'rTqVB@2025',
  'posvenda':           'rTqVB@2025',
  'rh':                 'nBvCX@2025',
  'financeiro':         'vBnJH@2025',
  'marketing':          'Mkt@2025',
  'supervisores':       'zXkLP@2025',
  'supervisor':         'zXkLP@2025',
  'caixas':             'fGyDS@2025',
  'caixa':              'fGyDS@2025',
  'peg pneus':          'pLcNM@2025',
  'peg':                'pLcNM@2025',
  'pegpneus':           'pLcNM@2025',
  'supervisao tecnica': 'Felipe@13',
  'supervisão técnica': 'Felipe@13',
  'sup tecnica':        'Felipe@13',
  'sup técnica':        'Felipe@13',
  'tecnica':            'Felipe@13',
  'técnica':            'Felipe@13',
  'cd':                 'vBnJH@2025',
  'agendamento':        'XjKqW@2026',
  'agendamento 1':      'XjKqW@2026',
  'agendamento 2':      'XjKqW@2026',
  'estoque':            'vRzQy@2026',
  'comercial':          'xSwZa@2026',
};

// ─── Estado de conversas (fluxo multi-etapa) ───────────────────────────────────
const estadoConversas = new Map();

// ─── Cliente WhatsApp ──────────────────────────────────────────────────────────

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: SESSION_DIR }),
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1039212651-alpha.html',
  },
  puppeteer: {
    headless: true,
    protocolTimeout: 120000,
    args: [
      '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
      '--disable-gpu', '--disable-extensions', '--no-first-run',
      '--disable-background-networking', '--disable-default-apps',
    ],
  },
});

// ─── QR Code — serve imagem PNG em localhost:3200 ──────────────────────────────

const QRCode = require('qrcode');
let _qrBuf = null;
let _qrServer = null;

function _startQrServer() {
  if (_qrServer) return;
  const HTML = `<!DOCTYPE html><html><head><title>WhatsApp QR</title>
<style>body{background:#111;display:flex;flex-direction:column;align-items:center;
justify-content:center;height:100vh;margin:0;font-family:sans-serif;color:#fff;}
img{border:12px solid #fff;border-radius:12px;width:320px;height:320px;}
p{margin-top:16px;font-size:18px;}small{opacity:.5;font-size:13px;margin-top:6px;display:block;}</style>
</head><body>
<div id="m" style="font-size:20px;margin-bottom:16px">⏳ Aguardando QR...</div>
<img id="q" style="display:none">
<p>Escaneie com o WhatsApp</p>
<small>⋮ Menu → Dispositivos vinculados → Vincular dispositivo</small>
<small>Atualiza a cada 3s</small>
<script>
function poll(){fetch('/qr.png?t='+Date.now()).then(r=>{
  if(r.ok&&r.headers.get('content-type').includes('image')){
    r.blob().then(b=>{const u=URL.createObjectURL(b);
      document.getElementById('q').src=u;
      document.getElementById('q').style.display='block';
      document.getElementById('m').textContent='📱 Escaneie agora!';
    });
  }}).catch(()=>{});
  setTimeout(poll,3000);}
poll();
</script></body></html>`;
  _qrServer = http.createServer(async (req, res) => {
    if (req.url.startsWith('/qr.png') && _qrBuf) {
      res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(_qrBuf);
    } else if (req.url.startsWith('/qr.png')) {
      res.writeHead(204); res.end();
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(HTML);
    }
  });
  _qrServer.listen(3200, '127.0.0.1', () => {
    console.log('  🌐  QR disponível em: http://localhost:3200');
    try { execSync('start http://localhost:3200'); } catch {}
  });
}

const QR_FILE = path.join(__dirname, '..', 'qr-whatsapp.png');

client.on('qr', async (qr) => {
  _qrBuf = await QRCode.toBuffer(qr, { scale: 10 });
  fs.writeFileSync(QR_FILE, _qrBuf);
  _startQrServer();
  console.log('  📱  QR atualizado — acesse http://localhost:3200 ou abra qr-whatsapp.png');
});

client.on('authenticated', () => {
  if (_qrServer) { _qrServer.close(); _qrServer = null; }
});

client.on('authenticated', () => {
  if (_qrServer) { _qrServer.close(); _qrServer = null; }
  try { if (fs.existsSync(QR_FILE)) fs.unlinkSync(QR_FILE); } catch {}
  console.log('\n✅ Autenticado! Sessão salva — próximo start não precisará de QR.\n');

  // Watchdog: se 'ready' não disparar em 4 minutos, reinicia
  const watchdog = setTimeout(() => {
    console.error('⏰ Watchdog: ready não disparou em 4 min — reiniciando...');
    process.exit(1);
  }, 4 * 60 * 1000);
  client.once('ready', () => clearTimeout(watchdog));
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

  // Parabéns automático de aniversariantes (diário às 8h)
  agendarAniversarios();
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
    const saldo  = parseFloat(r.saldo || 0) / 100;
    const isPeg  = r.nome.toUpperCase().includes('PEG');
    const crit   = isPeg ? 50  : 100;
    const atenc  = isPeg ? 100 : 200;
    const dias   = r.diasRestantes !== null ? `~${r.diasRestantes}d` : '—';
    const linha  = `• ${r.nome} — R$${saldo.toFixed(0)} _(${dias})_`;
    if (saldo < crit)       mVerm.push(linha);
    else if (saldo < atenc) mLar.push(linha);
    else                    mVerd.push(linha);
  }

  // ── Google ──
  const gVerm = [], gLar = [], gVerd = [], gErro = [];
  for (const r of googleResultados) {
    if (r.erro) { gErro.push(`• ${r.nome} — ⚠️ ${r.erro.slice(0, 60)}`); continue; }

    const gasto3d  = parseFloat(r.spend3d || 0);
    const gasto7d  = parseFloat(r.spend7d || 0);
    const orcDia   = parseFloat(r.orcamentoTotal || 0);

    if (r.saldoDisponivel !== null && r.saldoDisponivel !== undefined) {
      // Conta pré-paga: exibe saldo + dias restantes
      const saldo    = parseFloat(r.saldoDisponivel);
      const isPegG   = r.nome.toUpperCase().includes('PEG');
      const critG    = isPegG ? 50  : 100;
      const atencG   = isPegG ? 100 : 200;
      const gastoDia = gasto3d > 0 ? gasto3d / 3 : gasto7d / 7;
      const dias     = gastoDia > 0 ? `~${Math.floor(saldo / gastoDia)}d` : '—';
      const linha    = `• ${r.nome} — R$${saldo.toFixed(0)} _(${dias})_`;
      if (saldo < critG)       gVerm.push(linha);
      else if (saldo < atencG) gLar.push(linha);
      else                     gVerd.push(linha);
    } else {
      // Conta pós-paga: exibe gasto 3d e orçamento diário
      const gastoDiaReal = gasto3d > 0 ? (gasto3d / 3).toFixed(0) : (gasto7d / 7).toFixed(0);
      const orcLabel     = orcDia > 0 ? `Orç: R$${orcDia.toFixed(0)}/d` : 'sem campanha';
      const linha        = `• ${r.nome} — R$${gastoDiaReal}/d _(${orcLabel})_`;
      if (orcDia === 0 || (parseFloat(gasto3d) === 0 && parseFloat(gasto7d) === 0)) {
        gLar.push(linha); // sem gasto = atenção
      } else {
        gVerd.push(linha);
      }
    }
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
    if (gErro.length) msg += `\n⚠️ *Erros:*\n${gErro.join('\n')}`;
    if (!gVerm.length && !gLar.length && !gVerd.length && !gErro.length) msg += `\n_Sem dados_`;
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

      console.log(`📤 [${label}] Enviando para grupo ${GRUPO_ALERTAS_ID}...`);
      await Promise.race([
        client.sendMessage(GRUPO_ALERTAS_ID, media, { caption }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('sendMessage timeout (90s)')), 90000)),
      ]);
      console.log(`✅ Relatório das ${label} enviado (Meta + Google).`);
    } catch (err) {
      console.error(`❌ Erro no relatório das ${label}:`, err.message);
      // Frame detachado = Chrome zumbi. Matar o processo Chrome específico antes de sair.
      if (err.message?.includes('detached Frame') || err.message?.includes('Target closed')
          || err.message?.includes('timed out')) {
        console.log('🔄 Detectado frame detachado — encerrando Chrome e saindo para PM2 reiniciar...');
        try {
          const chromePid = client.pupBrowser?.process()?.pid;
          if (chromePid) {
            execSync(`taskkill /F /T /PID ${chromePid} 2>nul`, { shell: true });
            console.log(`🔪 Chrome PID ${chromePid} encerrado.`);
          }
        } catch (_) {}
        await new Promise(r => setTimeout(r, 3000)); // aguarda Chrome liberar userDataDir
        process.exit(1);
      }
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

let dispararCobrancaVideos = null; // exposto para comando !cobrarvideo

function agendarCobrancaVideos() {
  const HORA_DISPARO = 8; // 8h00 toda segunda

  const GRUPO_VIDEOS_ID = process.env.WHATSAPP_GRUPO_VIDEOS_ID;

  async function disparar() {
    const msg =
      `Bom dia! Por favor, enviem os vídeos desta semana para publicação nos stories 🎬\n\n` +
      `Loja 1 - Araraquara ❌\n` +
      `Loja 2 - Araraquara ❌\n` +
      `Loja 3 - Americana ❌\n` +
      `Loja 4 - São Carlos ❌\n` +
      `Loja 5 - Maringá ❌\n` +
      `Peg 1 - Araraquara ❌\n` +
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

  dispararCobrancaVideos = disparar; // expõe para !cobrarvideo

  const COBRANCA_STATE_FILE = path.join(__dirname, '..', 'data', 'cobranca-videos-enviado.json');

  function dataHojeCobranca() {
    return new Date().toISOString().slice(0, 10);
  }

  function jaEnviouHoje() {
    try {
      if (!fs.existsSync(COBRANCA_STATE_FILE)) return false;
      const { data } = JSON.parse(fs.readFileSync(COBRANCA_STATE_FILE, 'utf8'));
      return data === dataHojeCobranca();
    } catch { return false; }
  }

  function marcarEnviadoHoje() {
    fs.writeFileSync(COBRANCA_STATE_FILE, JSON.stringify({ data: dataHojeCobranca() }));
  }

  function msAteProximaSegunda() {
    const agora = new Date();
    const alvo  = new Date(agora);
    if (agora.getDay() === 1 && !jaEnviouHoje()) {
      if (agora.getHours() < HORA_DISPARO) {
        // Antes das 8h — aguarda até às 8h
        alvo.setHours(HORA_DISPARO, 0, 0, 0);
        return alvo - agora;
      } else {
        // Após as 8h — bot perdeu o horário, dispara imediatamente uma vez
        return 1;
      }
    }
    // Já enviou hoje ou não é segunda — próxima segunda às 8h
    const diasAteSegunda = (8 - agora.getDay()) % 7 || 7;
    alvo.setDate(agora.getDate() + diasAteSegunda);
    alvo.setHours(HORA_DISPARO, 0, 0, 0);
    return alvo - agora;
  }

  function loop() {
    const ms   = msAteProximaSegunda();
    const dias = Math.round(ms / 86400000);
    if (ms <= 1) {
      console.log(`📹 Segunda-feira: enviando cobrança de vídeos agora (bot perdeu o horário das 8h).`);
    } else {
      console.log(`📹 Próxima cobrança de vídeos: segunda às ${HORA_DISPARO}h (em ~${dias} dia(s)).`);
    }
    setTimeout(async () => {
      marcarEnviadoHoje();
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

      await client.sendMessage(GRUPO_ALERTAS_ID, msg);
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

      if (alertaMeta)   await client.sendMessage(GRUPO_ALERTAS_ID, alertaMeta);
      if (alertaGoogle) await client.sendMessage(GRUPO_ALERTAS_ID, alertaGoogle);
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

// ─── Aniversários automáticos — diário às 8h ─────────────────────────────────

function agendarAniversarios() {
  function msAte8h() {
    const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const alvo  = new Date(agora);
    alvo.setHours(8, 0, 0, 0);
    if (alvo <= agora) alvo.setDate(alvo.getDate() + 1);
    return alvo - agora;
  }

  function loop() {
    const ms   = msAte8h();
    const horas = Math.round(ms / 3600000);
    console.log(`🎂 Próxima verificação de aniversários: às 8h (em ~${horas}h).`);
    setTimeout(async () => {
      try {
        const { verificarEDisparar } = require('./checar-aniversarios');
        await verificarEDisparar(client, GRUPO_ALERTAS_ID);
      } catch (err) {
        console.error('❌ Erro no checar-aniversarios:', err.message);
      }
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

async function responder(msg, texto) {
  const chat = await msg.getChat();
  return chat.sendMessage(texto);
}

async function processarMensagem(msg) {
  try {
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

  // ── Primeiro atendimento Peg Pneus (clientes externos) ──────────────────────
  // Mensagens de números desconhecidos (não-admins) são roteadas para o fluxo
  // de atendimento Peg Pneus quando WHATSAPP_PEG_ATENDIMENTO_ID está configurado.
  if (!msg.fromMe && !isGrupo && GRUPO_PEG_ATENDIMENTO && !corpo.startsWith('!')) {
    const ehAdmin = NUMEROS_AUTORIZADOS.length === 0 || NUMEROS_AUTORIZADOS.includes(remetente);
    if (!ehAdmin) {
      const tratado = await processarAtendimento(msg, client, GRUPO_PEG_ATENDIMENTO);
      if (tratado) return;
    }
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

    await responder(msg,
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
    await responder(msg,'🔑 Iniciando renovação do token Google Ads...\n\nO navegador será aberto no servidor. Complete a autorização para salvar o novo token.');
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
      await responder(msg,'✅ Script iniciado. Autorize no navegador do servidor e o token será salvo automaticamente.\n\nApós autorizar, rode:\n`pm2 restart br-pneus-bot --update-env`');
    } catch (err) {
      await responder(msg,`❌ Erro: ${err.message}`);
    }
    return;
  }

  // !semanal — relatório semanal de spend Meta + Google sob demanda
  if (corpo === '!semanal') {
    await responder(msg,'⏳ Gerando relatório semanal...');
    try {
      const { gerarRelatorioSemanal, formatarRelatorioSemanal } = require('./relatorio-semanal');
      const dados = await gerarRelatorioSemanal();
      await responder(msg,formatarRelatorioSemanal(dados));
    } catch (err) {
      await responder(msg,`❌ Erro: ${err.message}`);
    }
    return;
  }

  // !tokens — verifica expiração dos tokens Meta e Google agora
  if (corpo === '!tokens') {
    await responder(msg,'⏳ Verificando tokens Meta e Google...');
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
        await responder(msg,alertaMeta);
      } else {
        const linhas = resultadosMeta.map(r => {
          if (r.erro)         return `❌ ${r.nome}: ${r.erro}`;
          if (r.nuncaExpira)  return `✅ ${r.nome}: nunca expira`;
          return `✅ ${r.nome}: ${r.diasRestantes} dia(s)`;
        });
        await responder(msg,`🔑 *Tokens Meta — Status*\n\n${linhas.join('\n')}`);
      }

      // Google
      const alertaGoogle = formatarAlertaTokenGoogle(resultadoGoogle);
      if (alertaGoogle) {
        await responder(msg,alertaGoogle);
      } else {
        const diasInfo = resultadoGoogle.diasRestantes !== null
          ? `${resultadoGoogle.diasRestantes} dia(s) restante(s)`
          : 'OK';
        await responder(msg,`🔑 *Token Google Ads — Status*\n\n✅ Google Ads — Refresh Token: ${diasInfo}`);
      }
    } catch (err) {
      await responder(msg,`❌ Erro: ${err.message}`);
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
        console.log(`📤 [!alertagrupo] Enviando para grupo ${GRUPO_ALERTAS_ID}...`);
        await Promise.race([
          client.sendMessage(GRUPO_ALERTAS_ID, media, { caption: formatarAlertaSimples(metaRes, googleRes) }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('sendMessage timeout (90s)')), 90000)),
        ]);
        await responder(msg, '✅ Meta + Google enviados ao grupo.');
      } else {
        await responder(msg, '⚠️ WHATSAPP_GRUPO_AUTOMACAO_ID não configurado.');
      }
    } catch (err) {
      await responder(msg,`❌ Erro: ${err.message}`);
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
      await responder(msg,formatarAlertaSimples(metaRes, googleRes));
    } catch (err) {
      await responder(msg,`❌ Erro: ${err.message}`);
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

      await responder(msg,formatarRelatorioCompleto(metaRes));
      await new Promise(r => setTimeout(r, 1500));
      await responder(msg,formatarAlertaGoogle(googleRes));
    } catch (err) {
      await responder(msg,`❌ Erro: ${err.message}`);
    }
    return;
  }

  // !google — relatório Google Ads detalhado
  if (corpo === '!google' || corpo === 'google') {
    try {
      const { monitorarTodas } = require('./monitor-google-ads');
      const { resultados } = await monitorarTodas();
      await responder(msg,formatarAlertaGoogle(resultados));
    } catch (err) {
      await responder(msg,`❌ Erro: ${err.message}`);
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
      await responder(msg,'Ok! Agora envie o *texto da mensagem*.');
    } else if (msg.hasMedia) {
      const imagemPath = await salvarMidia(msg);
      estadoConversas.set(remetente, { etapa: 'aguardando_texto', dados: { ...estadoUsuario.dados, imagemPath } });
      await responder(msg,'✅ Imagem recebida!\n\nAgora envie o *texto da mensagem*.\n\n_(ou envie `pular` para enviar só a imagem)_');
    } else {
      await responder(msg,'⚠️ Envie a imagem/arte agora.\n\n_(ou `pular` para só texto, ou `cancelar` para desistir)_');
    }
    return;
  }

  // ETAPA 3: aguardando texto
  if (estadoUsuario?.etapa === 'aguardando_texto') {
    if (corpo === 'cancelar') {
      estadoConversas.delete(remetente);
      await responder(msg,'❌ Agendamento cancelado.');
      return;
    }
    try {
      const texto        = corpo === 'pular' ? '' : msg.body.trim();
      const mentionedIds = Array.isArray(msg.mentionedIds) ? [...msg.mentionedIds] : [];
      const { data, hora, imagemPath } = estadoUsuario.dados;
      const item = adicionarAgendamento({ data, hora, mensagem: texto, imagemPath, mentionedIds });
      estadoConversas.delete(remetente);

      await responder(msg,
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
      await responder(msg,`❌ Erro ao salvar agendamento: ${err.message}`);
    }
    return;
  }

  // ─── FLUXOS: !colaborador e !aniversario ────────────────────────────────────

  const MARCAS_VALIDAS = { '1': 'brpneus', brpneus: 'brpneus', br: 'brpneus', '2': 'pegpneus', pegpneus: 'pegpneus', peg: 'pegpneus', '3': 'smartcar', smartcar: 'smartcar', smart: 'smartcar' };
  const LABELS = { brpneus: 'BR Pneus & Oficina', pegpneus: 'Peg Pneus Atacarejo', smartcar: 'SmartCar' };

  // Estado: aguardando escolha de empresa — colaborador
  if (estadoUsuario?.etapa === 'colab_empresa') {
    if (corpo === 'cancelar') { estadoConversas.delete(remetente); await responder(msg,'❌ Cancelado.'); return; }
    const marcaRaw = corpo.toLowerCase().replace(/[^a-z0-9]/g, '');
    const marca = MARCAS_VALIDAS[marcaRaw];
    if (!marca) { await responder(msg,'⚠️ Opção inválida. Responda com *1*, *2* ou *3* (ou `cancelar`).'); return; }
    estadoConversas.set(remetente, { etapa: 'colab_foto', dados: { marca } });
    await responder(msg,`✅ *${LABELS[marca]}*\n\n📸 Envie a *foto* da pessoa.\n\n_(ou \`cancelar\` para desistir)_`);
    return;
  }

  // Estado: aguardando escolha de empresa — aniversário
  if (estadoUsuario?.etapa === 'aniv_empresa') {
    if (corpo === 'cancelar') { estadoConversas.delete(remetente); await responder(msg,'❌ Cancelado.'); return; }
    const marcaRaw = corpo.toLowerCase().replace(/[^a-z0-9]/g, '');
    const marca = MARCAS_VALIDAS[marcaRaw];
    if (!marca) { await responder(msg,'⚠️ Opção inválida. Responda com *1*, *2* ou *3* (ou `cancelar`).'); return; }
    estadoConversas.set(remetente, { etapa: 'aniv_foto', dados: { marca } });
    await responder(msg,`✅ *${LABELS[marca]}*\n\n📸 Envie a *foto* da pessoa.\n\n_(ou \`cancelar\` para desistir)_`);
    return;
  }

  // Estado: aguardando foto do colaborador
  if (estadoUsuario?.etapa === 'colab_foto') {
    if (corpo === 'cancelar') { estadoConversas.delete(remetente); await responder(msg,'❌ Cancelado.'); return; }
    if (!msg.hasMedia) { await responder(msg,'📸 Envie a *foto* da pessoa (ou `cancelar`).'); return; }
    const fotoPath = await salvarMidia(msg);
    estadoConversas.set(remetente, { etapa: 'colab_nome', dados: { ...estadoUsuario.dados, fotoPath } });
    await responder(msg,'✅ Foto recebida!\n\nAgora envie o *nome completo*:');
    return;
  }

  // Estado: aguardando nome do colaborador
  if (estadoUsuario?.etapa === 'colab_nome') {
    if (corpo === 'cancelar') { estadoConversas.delete(remetente); await responder(msg,'❌ Cancelado.'); return; }
    estadoConversas.set(remetente, { etapa: 'colab_cargo', dados: { ...estadoUsuario.dados, nome: msg.body.trim() } });
    await responder(msg,'👍 Agora envie o *cargo*:\n\n_Ex: Mecânico, Consultora de Vendas, Caixa..._');
    return;
  }

  // Estado: aguardando cargo do colaborador
  if (estadoUsuario?.etapa === 'colab_cargo') {
    if (corpo === 'cancelar') { estadoConversas.delete(remetente); await responder(msg,'❌ Cancelado.'); return; }
    estadoConversas.set(remetente, { etapa: 'colab_cidade', dados: { ...estadoUsuario.dados, cargo: msg.body.trim() } });
    await responder(msg,'📍 Agora envie a *cidade/loja*:\n\n_Ex: Araraquara, São Carlos, Maringá..._');
    return;
  }

  // Estado: aguardando cidade do colaborador → gera arte
  if (estadoUsuario?.etapa === 'colab_cidade') {
    if (corpo === 'cancelar') { estadoConversas.delete(remetente); await responder(msg,'❌ Cancelado.'); return; }
    const { marca, fotoPath, nome, cargo, chatId } = estadoUsuario.dados;
    const cidade = msg.body.trim();
    estadoConversas.delete(remetente);
    await responder(msg,'⏳ Gerando arte... aguarde.');
    try {
      const { gerarColaborador } = require('./gerar-arte');
      const pngPath = await gerarColaborador({ marca, nome, cargo, cidade, fotoPath });
      const { MessageMedia } = require('whatsapp-web.js');
      const media = MessageMedia.fromFilePath(pngPath);
      await client.sendMessage(GRUPO_ALERTAS_ID, media, { caption: `✅ *Bem-vindo(a) ${nome}!*\n${cargo} — ${cidade}` });
    } catch (err) {
      await responder(msg,`❌ Erro ao gerar arte: ${err.message}`);
    }
    return;
  }

  // Estado: aguardando foto do aniversariante
  if (estadoUsuario?.etapa === 'aniv_foto') {
    if (corpo === 'cancelar') { estadoConversas.delete(remetente); await responder(msg,'❌ Cancelado.'); return; }
    if (!msg.hasMedia) { await responder(msg,'📸 Envie a *foto* da pessoa (ou `cancelar`).'); return; }
    const fotoPath = await salvarMidia(msg);
    estadoConversas.set(remetente, { etapa: 'aniv_nome', dados: { ...estadoUsuario.dados, fotoPath } });
    await responder(msg,'✅ Foto recebida!\n\nAgora envie o *nome* do(a) aniversariante:');
    return;
  }

  // Estado: aguardando nome do aniversariante → gera arte
  if (estadoUsuario?.etapa === 'aniv_nome') {
    if (corpo === 'cancelar') { estadoConversas.delete(remetente); await responder(msg,'❌ Cancelado.'); return; }
    const { marca, fotoPath, chatId } = estadoUsuario.dados;
    const nome = msg.body.trim();
    estadoConversas.delete(remetente);
    await responder(msg,'⏳ Gerando arte... aguarde.');
    try {
      const { gerarAniversario } = require('./gerar-arte');
      const pngPath = await gerarAniversario({ marca, nome, fotoPath });
      const { MessageMedia } = require('whatsapp-web.js');
      const media = MessageMedia.fromFilePath(pngPath);
      await client.sendMessage(GRUPO_ALERTAS_ID, media, { caption: `🎂 *Parabéns ${nome}!*` });
    } catch (err) {
      await responder(msg,`❌ Erro ao gerar arte: ${err.message}`);
    }
    return;
  }

  // ─── FLUXO: !aniversariantes (cadastro em massa) ────────────────────────────

  // Estado: aguardando mês
  if (estadoUsuario?.etapa === 'aniv_massa_mes') {
    if (corpo === 'cancelar') { estadoConversas.delete(remetente); await responder(msg,'❌ Cancelado.'); return; }
    const mes = corpo.trim().padStart(2, '0');
    if (!/^(0[1-9]|1[0-2])$/.test(mes)) {
      await responder(msg,'⚠️ Mês inválido. Envie um número de 1 a 12 (ex: *5* para Maio).');
      return;
    }
    const NOMES_MESES = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    estadoConversas.set(remetente, { etapa: 'aniv_massa_lista', dados: { mes } });
    await responder(msg,
      `📅 *${NOMES_MESES[parseInt(mes,10)]}* selecionado!\n\n` +
      `Agora manda a lista (uma por linha):\n\n` +
      `_Nome - Loja - Dia_\n\n` +
      `Exemplo:\n` +
      `Evandro - Vila - 01\n` +
      `Julia - Smartcar - 05\n` +
      `Tiago - São Carlos - 18\n\n` +
      `_(ou \`cancelar\`)_`
    );
    return;
  }

  // Estado: aguardando lista
  if (estadoUsuario?.etapa === 'aniv_massa_lista') {
    if (corpo === 'cancelar') { estadoConversas.delete(remetente); await responder(msg,'❌ Cancelado.'); return; }
    const { mes } = estadoUsuario.dados;
    const NOMES_MESES = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

    const LOJA_INFO = {
      'smartcar':    { marca: 'smartcar', loja: 'SmartCar' },
      'smart car':   { marca: 'smartcar', loja: 'SmartCar' },
      'smart':       { marca: 'smartcar', loja: 'SmartCar' },
      'vila':        { marca: 'brpneus',  loja: 'BR Pneus Vila' },
      'centro':      { marca: 'brpneus',  loja: 'BR Pneus Centro' },
      'americana':   { marca: 'brpneus',  loja: 'BR Pneus Americana' },
      'sao carlos':  { marca: 'brpneus',  loja: 'BR Pneus São Carlos' },
      'maringa':     { marca: 'brpneus',  loja: 'BR Pneus Maringá' },
      'jau':         { marca: 'brpneus',  loja: 'BR Pneus Jaú' },
      'ibitinga':    { marca: 'brpneus',  loja: 'BR Pneus Ibitinga' },
      'sorocaba':    { marca: 'pegpneus', loja: 'Peg Pneus Sorocaba' },
      'peg':         { marca: 'pegpneus', loja: 'Peg Pneus Araraquara' },
      'peg pneus':   { marca: 'pegpneus', loja: 'Peg Pneus Araraquara' },
    };

    function normalizarLoja(raw) {
      const key = raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
      return LOJA_INFO[key] || { marca: 'brpneus', loja: raw.trim() };
    }

    const linhas = msg.body.trim().split('\n').map(l => l.trim()).filter(Boolean);
    const pessoas = [];
    const erros   = [];

    for (const linha of linhas) {
      const partes = linha.split(/\s*[-–|;]\s*/);
      if (partes.length < 3) { erros.push(`"${linha}"`); continue; }
      const nome = partes[0].trim();
      const dia  = partes[partes.length - 1].trim().padStart(2,'0');
      const lojaRaw = partes.slice(1, partes.length - 1).join(' ').trim();
      if (!nome || !/^\d{2}$/.test(dia) || +dia < 1 || +dia > 31) { erros.push(`"${linha}"`); continue; }
      const { marca, loja } = normalizarLoja(lojaRaw);
      pessoas.push({ nome, data: `${dia}/${mes}`, loja, marca, foto: null });
    }

    if (pessoas.length === 0) {
      await responder(msg,'❌ Nenhuma linha válida. Formato: _Nome - Loja - Dia_');
      return;
    }

    // Merge no JSON
    const ARQUIVO_JSON = path.join(__dirname, '..', 'data', 'aniversariantes.json');
    const existentes = fs.existsSync(ARQUIVO_JSON) ? JSON.parse(fs.readFileSync(ARQUIVO_JSON,'utf8')) : [];
    for (const nova of pessoas) {
      const idx = existentes.findIndex(e => e.nome === nova.nome && e.data === nova.data);
      if (idx >= 0) {
        existentes[idx] = { ...existentes[idx], ...nova, foto: existentes[idx].foto };
      } else {
        existentes.push(nova);
      }
    }
    fs.writeFileSync(ARQUIVO_JSON, JSON.stringify(existentes, null, 2), 'utf8');

    const listaConfirm = pessoas.map(p => `• ${p.data} — *${p.nome}* (${p.loja})`).join('\n');
    const primeira = pessoas[0];
    let resp = `✅ *${pessoas.length} pessoa(s) de ${NOMES_MESES[parseInt(mes,10)]} salvas!*\n\n${listaConfirm}`;
    if (erros.length) resp += `\n\n⚠️ Linhas ignoradas:\n${erros.join('\n')}`;
    resp += `\n\n📸 Manda a foto de:\n*${primeira.nome}* (${primeira.data} — ${primeira.loja})\n\n_(ou \`pular\` / \`cancelar\`)_`;

    estadoConversas.set(remetente, { etapa: 'aniv_massa_foto', dados: { pessoas, index: 0, chatId: msg.from } });
    await responder(msg, resp);
    return;
  }

  // Estado: aguardando foto de cada pessoa (loop)
  if (estadoUsuario?.etapa === 'aniv_massa_foto') {
    const { pessoas, index, chatId } = estadoUsuario.dados;
    const pessoa = pessoas[index];

    if (corpo === 'cancelar') {
      estadoConversas.delete(remetente);
      await responder(msg,'❌ Encerrado. Pessoas já salvas no JSON permanecem. Use `!aniversariantes` para retomar.');
      return;
    }

    async function avancarMassa(msgAtual) {
      const prox = index + 1;
      if (prox >= pessoas.length) {
        estadoConversas.delete(remetente);
        await responder(msgAtual, `🎉 *Tudo pronto!* ${pessoas.length} arte(s) gerada(s) e enviada(s)!`);
      } else {
        const p = pessoas[prox];
        estadoConversas.set(remetente, { etapa: 'aniv_massa_foto', dados: { pessoas, index: prox, chatId } });
        await responder(msgAtual, `📸 Manda a foto de:\n*${p.nome}* (${p.data} — ${p.loja})\n\n_(ou \`pular\` / \`cancelar\`)_`);
      }
    }

    if (corpo === 'pular') {
      await responder(msg, `⏭️ *${pessoa.nome}* pulada (sem foto).`);
      await avancarMassa(msg);
      return;
    }

    if (!msg.hasMedia) {
      await responder(msg, `📸 Envie a *foto* de *${pessoa.nome}* (ou \`pular\` / \`cancelar\`).`);
      return;
    }

    await responder(msg, `⏳ Gerando arte de *${pessoa.nome}*...`);
    try {
      const fotoTemp = await salvarMidia(msg);

      // Salva foto em assets/colaboradores/ para reusar no disparo automático
      const COLABS_DIR = path.join(__dirname, '..', 'assets', 'colaboradores');
      fs.mkdirSync(COLABS_DIR, { recursive: true });
      const ext = path.extname(fotoTemp) || '.jpg';
      const fotoDestino = path.join(COLABS_DIR, `${pessoa.nome.replace(/\s+/g,'_')}_${pessoa.data.replace('/','- ')}.jpg`.replace('- ','- ').replace('- ','_'));
      const fotoPerm = path.join(COLABS_DIR, `${pessoa.nome.replace(/\s+/g,'_')}_${pessoa.data.replace('/','- ')}${ext}`);
      fs.copyFileSync(fotoTemp, fotoPerm);

      // Atualiza o JSON com o caminho da foto
      const ARQUIVO_JSON = path.join(__dirname, '..', 'data', 'aniversariantes.json');
      const lista = JSON.parse(fs.readFileSync(ARQUIVO_JSON,'utf8'));
      const jIdx  = lista.findIndex(e => e.nome === pessoa.nome && e.data === pessoa.data);
      if (jIdx >= 0) lista[jIdx].foto = fotoPerm;
      fs.writeFileSync(ARQUIVO_JSON, JSON.stringify(lista, null, 2), 'utf8');

      // Gera arte
      const { gerarAniversario } = require('./gerar-arte');
      const pngGerado = await gerarAniversario({ marca: pessoa.marca, nome: pessoa.nome, fotoPath: fotoPerm });

      // Renomeia para Nome_DD-MM.png
      const nomeArq = `${pessoa.nome.replace(/\s+/g,'_')}_${pessoa.data.replace('/','-')}.png`;
      const pngFinal = path.join(path.dirname(pngGerado), nomeArq);
      if (fs.existsSync(pngFinal)) fs.unlinkSync(pngFinal);
      fs.renameSync(pngGerado, pngFinal);

      // Envia como documento (arquivo baixável com nome visível)
      const { MessageMedia } = require('whatsapp-web.js');
      const mediaData = fs.readFileSync(pngFinal).toString('base64');
      const media = new MessageMedia('image/png', mediaData, nomeArq);
      const chat  = await client.getChatById(chatId);
      await chat.sendMessage(media, { sendMediaAsDocument: true, caption: `🎂 *${pessoa.nome}* — ${pessoa.data}` });
      console.log(`✅ Arte massa: ${nomeArq}`);
    } catch (err) {
      console.error(`❌ Arte massa ${pessoa.nome}:`, err.message);
      await responder(msg, `❌ Erro ao gerar *${pessoa.nome}*: ${err.message}\n\nMande a foto novamente ou \`pular\`.`);
      return;
    }

    await avancarMassa(msg);
    return;
  }

  // ─── FLUXO: !editar ──────────────────────────────────────────────────────────

  // Estado: aguardando escolha de cidade
  if (estadoUsuario?.etapa === 'editar_cidade') {
    if (corpo === 'cancelar') { estadoConversas.delete(remetente); await responder(msg,'❌ Cancelado.'); return; }

    const cidades = estadoUsuario.dados.cidades;
    const idx = parseInt(corpo, 10);
    let cidadeEscolhida = null;

    if (!isNaN(idx) && idx >= 1 && idx <= cidades.length) {
      cidadeEscolhida = cidades[idx - 1];
    } else {
      cidadeEscolhida = cidades.find(c => c.toLowerCase().includes(corpo.toLowerCase()));
    }

    if (!cidadeEscolhida) {
      await responder(msg,`⚠️ Opção inválida. Responda com o *número* da cidade (ou \`cancelar\`).`);
      return;
    }

    estadoConversas.set(remetente, { etapa: 'editar_modo', dados: { cidade: cidadeEscolhida } });
    await responder(msg,
      `🎬 *${cidadeEscolhida}* selecionada!\n\n` +
      `Escolha o modo de edição:\n\n` +
      `1️⃣ *Com áudio* — vídeo narrado com legendas\n` +
      `2️⃣ *Sem voz* — todos os clips com música de fundo e transições\n\n` +
      `_(ou \`cancelar\` para desistir)_`
    );
    return;
  }

  // Estado: aguardando escolha de modo (com áudio / sem voz)
  if (estadoUsuario?.etapa === 'editar_modo') {
    if (corpo === 'cancelar') { estadoConversas.delete(remetente); await responder(msg,'❌ Cancelado.'); return; }

    const { cidade } = estadoUsuario.dados;
    let modo = null;

    if (corpo === '1' || corpo.includes('com') || corpo.includes('audio') || corpo.includes('áudio')) {
      modo = 'com_audio';
    } else if (corpo === '2' || corpo.includes('sem') || corpo.includes('voz') || corpo.includes('musica') || corpo.includes('música')) {
      modo = 'sem_voz';
    }

    if (!modo) {
      await responder(msg,`⚠️ Opção inválida. Responda com *1* (Com áudio) ou *2* (Sem voz).`);
      return;
    }

    // sem_voz não precisa de subtipo — inicia direto
    if (modo === 'sem_voz') {
      estadoConversas.delete(remetente);
      await responder(msg,`🎬 Iniciando edição de *${cidade}* — Sem voz 🎵\nVou avisar quando terminar!`);
      processarCidade(cidade, null, 'sem_voz', 'juntar')
        .then(async ({ cidade: c, numClips, pasta }) => {
          const chat = await client.getChatById(GRUPO_ALERTAS_ID || msg.from);
          await chat.sendMessage(
            `✅ *Edição concluída!*\n\n📍 Cidade: *${c}*\n🎞️ Clips gerados: *${numClips}*\n📁 Pasta: ${pasta}`
          );
        })
        .catch(async (err) => {
          const chat = await client.getChatById(GRUPO_ALERTAS_ID || msg.from);
          await chat.sendMessage(`❌ Erro ao editar *${cidade}*: ${err.message}`);
        });
      return;
    }

    // com_audio → perguntar subtipo
    estadoConversas.set(remetente, { etapa: 'editar_subtipo', dados: { cidade } });
    await responder(msg,
      `🎙️ *Com áudio* selecionado!\n\n` +
      `Como deseja editar os clips?\n\n` +
      `1️⃣ *Clips individuais* — cada arquivo editado separado (máx. 30s, melhores partes)\n` +
      `2️⃣ *Juntar todos* — concatena tudo e divide em clips de 30s\n\n` +
      `_(ou \`cancelar\` para desistir)_`
    );
    return;
  }

  // Estado: aguardando subtipo de edição com áudio (individuais / juntar)
  if (estadoUsuario?.etapa === 'editar_subtipo') {
    if (corpo === 'cancelar') { estadoConversas.delete(remetente); await responder(msg,'❌ Cancelado.'); return; }

    const { cidade } = estadoUsuario.dados;
    let subtipo = null;

    if (corpo === '1' || corpo.includes('individual') || corpo.includes('separa') || corpo.includes('cada')) {
      subtipo = 'individuais';
    } else if (corpo === '2' || corpo.includes('junt') || corpo.includes('todos') || corpo.includes('concat')) {
      subtipo = 'juntar';
    }

    if (!subtipo) {
      await responder(msg,`⚠️ Opção inválida. Responda com *1* (Clips individuais) ou *2* (Juntar todos).`);
      return;
    }

    estadoConversas.delete(remetente);
    const subLabel = subtipo === 'individuais' ? 'Clips individuais' : 'Juntar todos';
    await responder(msg,`🎬 Iniciando edição de *${cidade}* — Com áudio 🎙️ / ${subLabel}\nVou avisar quando terminar!`);

    processarCidade(cidade, null, 'com_audio', subtipo)
      .then(async ({ cidade: c, numClips, pasta }) => {
        const chat = await client.getChatById(GRUPO_ALERTAS_ID || msg.from);
        await chat.sendMessage(
          `✅ *Edição concluída!*\n\n📍 Cidade: *${c}*\n🎞️ Clips gerados: *${numClips}*\n📁 Pasta: ${pasta}`
        );
      })
      .catch(async (err) => {
        const chat = await client.getChatById(GRUPO_ALERTAS_ID || msg.from);
        await chat.sendMessage(`❌ Erro ao editar *${cidade}*: ${err.message}`);
      });

    return;
  }

  // COMANDO: !editar
  if (corpo.startsWith('!editar')) {
    const cidades = listarCidadesComVideos();
    if (cidades.length === 0) {
      await responder(msg,'📂 Nenhum vídeo encontrado nas pastas de edição.\n\nColoque os vídeos em:\n`#1 PARA EDITAR/{cidade}/`');
      return;
    }
    const lista = cidades.map((c, i) => `${i + 1}️⃣ ${c}`).join('\n');
    estadoConversas.set(remetente, { etapa: 'editar_cidade', dados: { cidades } });
    await responder(msg,`🎬 *Editor de Vídeos*\n\nCidades com vídeos prontos:\n\n${lista}\n\n_Responda com o número da cidade (ou \`cancelar\`)_`);
    return;
  }

  // COMANDO: !colaborador
  if (corpo.startsWith('!colaborador')) {
    const MENU_EMPRESA = '🎉 *Arte de Novo Colaborador*\n\nEscolha a empresa:\n1️⃣ BR Pneus & Oficina\n2️⃣ Peg Pneus Atacarejo\n3️⃣ SmartCar\n\n_(ou `cancelar` para desistir)_';
    estadoConversas.set(remetente, { etapa: 'colab_empresa', dados: { chatId: msg.from } });
    await responder(msg,MENU_EMPRESA);
    return;
  }

  // COMANDO: !aniversariantes (cadastro em massa)
  if (corpo.startsWith('!aniversariantes')) {
    estadoConversas.set(remetente, { etapa: 'aniv_massa_mes', dados: { chatId: msg.from } });
    await responder(msg,
      '🎂 *Cadastro em Massa de Aniversariantes*\n\n' +
      'Para qual mês?\n\n' +
      '_Envie o número (ex: *5* para Maio, *12* para Dezembro)_\n\n' +
      '_(ou `cancelar` para desistir)_'
    );
    return;
  }

  // COMANDO: !aniversario
  if (corpo.startsWith('!aniversario') || corpo.startsWith('!aniversário')) {
    const MENU_EMPRESA = '🎂 *Arte de Aniversariante*\n\nEscolha a empresa:\n1️⃣ BR Pneus & Oficina\n2️⃣ Peg Pneus Atacarejo\n3️⃣ SmartCar\n\n_(ou `cancelar` para desistir)_';
    estadoConversas.set(remetente, { etapa: 'aniv_empresa', dados: { chatId: msg.from } });
    await responder(msg,MENU_EMPRESA);
    return;
  }

  // COMANDO: !agendar DD/MM HH:MM
  if (corpo.startsWith('!agendar')) {
    const partes = msg.body.trim().split(/\s+/);
    if (partes.length < 3) {
      await responder(msg,
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
      await responder(msg,'⚠️ Hora inválida. Use HH:MM, ex: `09:00`');
      return;
    }
    if (dataRaw.split('/').length === 2) dataRaw += `/${new Date().getFullYear()}`;
    const [d, m, a] = dataRaw.split('/');
    if (!d || !m || !a || isNaN(new Date(`${a}-${m}-${d}`))) {
      await responder(msg,'⚠️ Data inválida. Use DD/MM ou DD/MM/AAAA, ex: `25/04`');
      return;
    }
    const data = `${d.padStart(2,'0')}/${m.padStart(2,'0')}/${a}`;

    estadoConversas.set(remetente, { etapa: 'aguardando_imagem', dados: { data, hora } });
    await responder(msg,
      `📅 Agendando para *${data} às ${hora}*\n\n` +
      `Envie a *imagem/arte* que será postada.\n\n` +
      `_(ou envie \`pular\` para só texto)_`
    );
    return;
  }

  // COMANDO: !agendamentos
  if (corpo === '!agendamentos' || corpo === '!agenda') {
    await responder(msg,formatarLista());
    return;
  }

  // COMANDO: !cancelar ID
  if (corpo.startsWith('!cancelar ')) {
    const id = corpo.split(' ')[1];
    const item = cancelarAgendamento(id);
    if (!item) {
      await responder(msg,`⚠️ Agendamento #${id} não encontrado.`);
    } else {
      await responder(msg,`✅ Agendamento #${id} cancelado.\n📅 Era para ${item.data} às ${item.hora}.`);
    }
    return;
  }

  // COMANDO: !grupos
  if (corpo === '!grupos' || corpo === 'grupos') {
    const chats = await client.getChats();
    const grupos = chats.filter(c => c.isGroup);
    if (grupos.length === 0) { await responder(msg,'Nenhum grupo encontrado.'); return; }
    let lista = '📋 *Grupos disponíveis:*\n\n';
    for (const g of grupos) lista += `• *${g.name}*\n  ID: \`${g.id._serialized}\`\n\n`;
    lista += 'Configure no .env:\n`WHATSAPP_GRUPO_ID` → mensagens agendadas\n`WHATSAPP_GRUPO_AUTOMACAO_ID` → relatórios de Ads';
    await responder(msg,lista);
    return;
  }

  // ── Posts recorrentes ──────────────────────────────────────────────────────

  const rec = require('./agendador-recorrente');

  // !fixo seg 09:00 — iniciar criação de post recorrente
  if (corpo.startsWith('!fixo ')) {
    const partes = msg.body.trim().split(/\s+/);
    if (partes.length < 3) {
      await responder(msg,
        '🔁 *Como criar um post recorrente:*\n\n' +
        '`!fixo DIA HH:MM [numero]`\n\n' +
        'Dias: `seg` `ter` `qua` `qui` `sex` `sab` `dom`\n\n' +
        'Exemplos:\n`!fixo seg 09:00` → toda segunda (grupo padrão)\n' +
        '`!fixo qui 11:00 5516999999999` → toda quinta para um número específico'
      );
      return;
    }
    const diaStr = partes[1].toLowerCase();
    const hora   = partes[2];
    const diaSemana = rec.DIAS[diaStr];

    if (diaSemana === undefined) {
      await responder(msg,'⚠️ Dia inválido. Use: `seg` `ter` `qua` `qui` `sex` `sab` `dom`');
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(hora)) {
      await responder(msg,'⚠️ Hora inválida. Use HH:MM, ex: `09:00`');
      return;
    }

    // Número opcional no 4º parâmetro: 5516999999999 → 5516999999999@c.us
    let grupoId = null;
    if (partes[3]) {
      const num = partes[3].replace(/\D/g, '');
      grupoId = num.endsWith('@c.us') || num.endsWith('@g.us') ? num : `${num}@c.us`;
    }

    const destLabel = grupoId ? `📱 ${partes[3].replace(/\D/g,'')}` : '👥 grupo padrão';
    estadoConversas.set(remetente, { etapa: 'fixo_aguardando_imagem', dados: { diaSemana, hora, diaStr, grupoId } });
    await responder(msg,
      `🔁 Criando post recorrente: *${rec.DIAS_NOME[diaSemana]} às ${hora}* → ${destLabel}\n\n` +
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
      await responder(msg,'❌ Cancelado.');
      return;
    }
    if (corpo === 'pular') {
      estadoConversas.set(remetente, { etapa: 'fixo_aguardando_texto', dados: { ...estado.dados, imagemPath: null } });
      await responder(msg,'Ok! Agora envie o *texto da mensagem*.');
      return;
    }
    if (msg.hasMedia) {
      const imagemPath = await rec.salvarMidia(msg);
      estadoConversas.set(remetente, { etapa: 'fixo_aguardando_texto', dados: { ...estado.dados, imagemPath } });
      await responder(msg,'✅ Imagem salva!\n\nAgora envie o *texto da mensagem*.\n\n_(ou `pular` para só imagem)_');
      return;
    }
    await responder(msg,'⚠️ Envie a imagem ou `pular`.');
    return;
  }

  // Fluxo de criação do post recorrente — etapa texto
  if (estadoConversas.get(remetente)?.etapa === 'fixo_aguardando_texto') {
    const estado = estadoConversas.get(remetente);
    if (corpo === 'cancelar') {
      estadoConversas.delete(remetente);
      await responder(msg,'❌ Cancelado.');
      return;
    }
    try {
      const texto = corpo === 'pular' ? '' : msg.body.trim();
      const { diaSemana, hora, imagemPath, grupoId } = estado.dados;
      const item = rec.adicionar({ diaSemana, hora, mensagem: texto, imagemPath, grupoId });
      estadoConversas.delete(remetente);
      const destLabel = grupoId ? `📱 ${grupoId.replace('@c.us','').replace('@g.us','')}` : '👥 Grupo padrão';
      await responder(msg,
        `✅ *Post recorrente criado! #${item.id}*\n\n` +
        `📅 Todo *${rec.DIAS_NOME[diaSemana]}* às *${hora}*\n` +
        `📤 Destino: ${destLabel}\n` +
        `🖼️ Imagem: ${imagemPath ? 'Sim' : 'Não'}\n` +
        `📝 Texto: ${texto ? texto.slice(0,80) : '_(sem texto)_'}\n\n` +
        `Para pausar: \`!pausarfixo ${item.id}\`\nPara deletar: \`!deletarfixo ${item.id}\``
      );
    } catch (err) {
      estadoConversas.delete(remetente);
      await responder(msg,`❌ Erro: ${err.message}`);
    }
    return;
  }

  if (corpo === '!fixos' || corpo === '!recorrentes') {
    await responder(msg,rec.formatarLista());
    return;
  }

  if (corpo.startsWith('!pausarfixo ')) {
    const id   = corpo.split(' ')[1];
    const item = rec.toggleAtivo(id);
    if (!item) { await responder(msg,`⚠️ Post #${id} não encontrado.`); return; }
    await responder(msg,`${item.ativo ? '▶️ Retomado' : '⏸️ Pausado'}: Post #${item.id} (${rec.DIAS_NOME[item.diaSemana]} ${item.hora})`);
    return;
  }

  if (corpo.startsWith('!deletarfixo ')) {
    const id   = corpo.split(' ')[1];
    const item = rec.remover(id);
    if (!item) { await responder(msg,`⚠️ Post #${id} não encontrado.`); return; }
    await responder(msg,`🗑️ Post recorrente #${item.id} deletado.`);
    return;
  }

  // COMANDO: !alinhamento [N] — imprime N cópias do vale alinhamento
  if (corpo.startsWith('!alinhamento')) {
    const partes = corpo.trim().split(/\s+/);
    const copias = Math.max(1, Math.min(20, parseInt(partes[1]) || 1));

    const pastaVale = path.join(__dirname, '..', 'assets', 'vale-alinhamento');
    const arquivos  = fs.existsSync(pastaVale)
      ? fs.readdirSync(pastaVale).filter(f => /\.(jpg|jpeg|png)$/i.test(f))
      : [];

    if (arquivos.length === 0) {
      await responder(msg,'❌ Nenhum arquivo encontrado em `assets/vale-alinhamento/`.\nColoque o JPG do vale nesta pasta.');
      return;
    }

    const arquivo = path.join(pastaVale, arquivos[0]);
    await responder(msg,`🖨️ Enviando *${copias}* cópia(s) do vale alinhamento para impressão...`);

    // PowerShell: imprime usando System.Drawing sem abrir janela
    const caminhoPs  = arquivo.replace(/\\/g, '\\\\').replace(/'/g, "''");
    const scriptPs1  = path.join(pastaVale, '_print_tmp.ps1');
    const conteudoPs = `Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('${caminhoPs}')
$pd  = New-Object System.Drawing.Printing.PrintDocument
$pd.PrinterSettings.Copies = ${copias}
$pd.Add_PrintPage({
    param($s, $e)
    $rect  = $e.MarginBounds
    $ratio = [Math]::Min($rect.Width / $img.Width, $rect.Height / $img.Height)
    $w = [int]($img.Width * $ratio); $h = [int]($img.Height * $ratio)
    $x = $rect.X + [int](($rect.Width  - $w) / 2)
    $y = $rect.Y + [int](($rect.Height - $h) / 2)
    $e.Graphics.DrawImage($img, [int]$x, [int]$y, [int]$w, [int]$h)
})
$pd.Print()
$img.Dispose()
`;
    fs.writeFileSync(scriptPs1, conteudoPs, 'utf8');

    exec(`powershell -NonInteractive -ExecutionPolicy Bypass -File "${scriptPs1}"`, async (err, _out, stderr) => {
      try { fs.unlinkSync(scriptPs1); } catch {}
      if (err) {
        await responder(msg,`❌ Erro ao imprimir: ${stderr || err.message}`);
      } else {
        await responder(msg,`✅ *${copias}* vale(s) enviado(s) para impressão!`);
      }
    });
    return;
  }

  // !leads / !leads7d / !leads30d — dashboard Deskrio por período
  if (corpo === '!leads' || corpo === '!leads7d' || corpo === '!leads30d') {
    const periodo = corpo === '!leads7d' ? '7d' : corpo === '!leads30d' ? '30d' : 'hoje';
    await responder(msg,'⏳ Carregando dashboard...');
    try {
      const { gerarDeskrioDashboardPng, formatarResumo } = require('./monitor-deskrio');
      const { MessageMedia } = require('whatsapp-web.js');
      const { pngPath, resultados } = await gerarDeskrioDashboardPng(periodo);
      const texto = formatarResumo(resultados);
      const media = MessageMedia.fromFilePath(pngPath);
      const chat  = await msg.getChat();
      await chat.sendMessage(media, { caption: texto });
    } catch (err) {
      await responder(msg,`❌ Erro Deskrio: ${err.message}`);
    }
    return;
  }

  // !leadsdata DD/MM DD/MM — dashboard para período customizado
  if (corpo.startsWith('!leadsdata ')) {
    const partes = corpo.replace('!leadsdata ', '').trim().split(/\s+/);
    if (partes.length < 2) {
      await responder(msg,'📅 *Uso:* `!leadsdata DD/MM DD/MM`\n_Exemplo:_ `!leadsdata 01/04 17/04`');
      return;
    }
    await responder(msg,'⏳ Carregando dashboard...');
    try {
      const { gerarDeskrioDashboardPngRange, formatarResumo } = require('./monitor-deskrio');
      const { MessageMedia } = require('whatsapp-web.js');
      const { pngPath, resultados } = await gerarDeskrioDashboardPngRange(partes[0], partes[1]);
      const texto = formatarResumo(resultados);
      const media = MessageMedia.fromFilePath(pngPath);
      const chat  = await msg.getChat();
      await chat.sendMessage(media, { caption: texto });
    } catch (err) {
      await responder(msg,`❌ Erro: ${err.message}`);
    }
    return;
  }

  // !leadscheck — verificar integridade dos dados Deskrio
  if (corpo === '!leadscheck') {
    try {
      const { monitorarDeskrio, formatarVerificacao } = require('./monitor-deskrio');
      const resultados = await monitorarDeskrio('hoje');
      await responder(msg,formatarVerificacao(resultados));
    } catch (err) {
      await responder(msg,`❌ Erro: ${err.message}`);
    }
    return;
  }

  // ── Ranking de atendentes ──────────────────────────────────────────────────

  if (corpo === '!ranking' || corpo === '!ranking7d' || corpo === '!rankinghoje') {
    const periodo = corpo === '!ranking7d' ? '7d' : corpo === '!rankinghoje' ? 'hoje' : 'semana';
    await responder(msg,'⏳ Calculando ranking...');
    try {
      const { gerarRankingDashboardPng, formatarRanking } = require('./monitor-deskrio');
      const { MessageMedia } = require('whatsapp-web.js');
      const { pngPath, resultados } = await gerarRankingDashboardPng(periodo);
      const texto = formatarRanking(resultados);
      const chat  = await msg.getChat();
      const media = MessageMedia.fromFilePath(pngPath);
      await chat.sendMessage(media, { caption: texto });
    } catch (err) {
      await responder(msg,`❌ Erro: ${err.message}`);
    }
    return;
  }

  // ── Reviews Google ─────────────────────────────────────────────────────────

  if (corpo === '!reviews' || corpo === '!reviewscheck') {
    try {
      const { statusConfig } = require('./monitor-reviews');
      await responder(msg,statusConfig());
    } catch (err) {
      await responder(msg,`❌ Erro: ${err.message}`);
    }
    return;
  }

  if (corpo === '!reviewstestar') {
    await responder(msg,'⏳ Verificando avaliações...');
    try {
      const { verificarReviewsNegativas, formatarAlertaReview } = require('./monitor-reviews');
      const alertas = await verificarReviewsNegativas();
      if (!alertas.length) {
        await responder(msg,'✅ Nenhuma avaliação negativa nova encontrada.');
      } else {
        await responder(msg,`⚠️ *${alertas.length} avaliação(ões) negativa(s) nova(s):*`);
        for (const a of alertas) {
          await responder(msg,formatarAlertaReview(a));
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    } catch (err) {
      await responder(msg,`❌ Erro: ${err.message}`);
    }
    return;
  }

  // ── Tema de vídeo semanal ──────────────────────────────────────────────────

  // !tema-preview [semana] — gera o tema de uma semana e manda no grupo automação para aprovação
  if (corpo.startsWith('!tema-preview')) {
    await responder(msg,'⏳ Gerando imagem do tema...');
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
      await responder(msg,`✅ Preview enviado ao grupo automações.`);
    } catch (err) {
      await responder(msg,`❌ Erro: ${err.message}`);
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
        await responder(msg,'⚠️ Nenhum tema pendente. Use `!tema-preview` primeiro.');
        return;
      }

      const { pngPath, semana, titulo } = JSON.parse(fs2.readFileSync(pendentePath, 'utf8'));
      if (!fs2.existsSync(pngPath)) {
        await responder(msg,`❌ Arquivo de imagem não encontrado: ${pngPath}`);
        return;
      }

      const GRUPO_VIDEOS_ID = process.env.WHATSAPP_GRUPO_VIDEOS_ID;
      if (!GRUPO_VIDEOS_ID) {
        await responder(msg,'❌ WHATSAPP_GRUPO_VIDEOS_ID não configurado.');
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
      await responder(msg,`✅ Tema *semana ${semana} — ${titulo}* enviado ao grupo de conteúdos!`);
    } catch (err) {
      await responder(msg,`❌ Erro: ${err.message}`);
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
      await responder(msg,`❌ Erro ao gerar dashboard: ${err.message}`);
    }
    return;
  }

  // COMANDO: !senhas (todas) ou !senha <setor>
  if (corpo === '!senhas' || corpo.startsWith('!senha')) {
    if (isGrupo) {
      await responder(msg,'🔒 Este comando só funciona em conversa privada.');
      return;
    }

    // !senhas → lista completa
    if (corpo === '!senhas') {
      console.log('[SENHAS] Enviando lista completa para', msg.from);
      await responder(msg,
        '🔑 *Senhas dos Setores*\n\n' +
        '👤 *Pós Venda:* `rTqVB@2025`\n' +
        '👤 *RH:* `nBvCX@2025`\n' +
        '👤 *Financeiro:* `vBnJH@2025`\n' +
        '👤 *Marketing:* `Mkt@2025`\n' +
        '👤 *Supervisores:* `zXkLP@2025`\n' +
        '👤 *Caixas:* `fGyDS@2025`\n' +
        '👤 *Peg Pneus:* `pLcNM@2025`\n' +
        '👤 *Supervisão Técnica:* `Felipe@13`\n' +
        '👤 *CD:* `vBnJH@2025`\n' +
        '📅 *Agendamento (1 e 2):* `XjKqW@2026`\n' +
        '📦 *Estoque (todas as lojas):* `vRzQy@2026`\n' +
        '🏪 *Comercial (todas as lojas):* `xSwZa@2026`'
      );
      return;
    }

    // !senha <setor> → senha específica
    const setor = corpo.replace('!senha', '').trim();
    const LISTA_SETORES =
      '`pos venda` · `rh` · `financeiro` · `marketing`\n' +
      '`supervisores` · `caixas` · `peg pneus`\n' +
      '`supervisao tecnica` · `cd`\n' +
      '`agendamento` · `estoque` · `comercial`\n\n' +
      '_Use `!senhas` para ver todas de uma vez._';
    if (!setor) {
      await responder(msg, '🔑 *Uso:* `!senha <setor>`\n\n*Setores:*\n' + LISTA_SETORES);
      return;
    }
    const senha = SENHAS_SETORES[setor];
    if (senha) {
      console.log('[SENHAS] Enviando senha do setor', setor, 'para', msg.from);
      await responder(msg, `🔑 *${setor}*\n\`${senha}\``);
    } else {
      await responder(msg, `❌ Setor *"${setor}"* não encontrado.\n\n*Setores válidos:*\n` + LISTA_SETORES);
    }
    return;
  }

  // COMANDO: !emails — contas e senhas do Google Workspace
  if (corpo === '!emails') {
    if (isGrupo) {
      await responder(msg, '🔒 Este comando só funciona em conversa privada.');
      return;
    }
    console.log('[EMAILS] Enviando lista de contas para', msg.from);
    await responder(msg,
      '📧 *Contas Workspace*\n\n' +
      '👤 *Pós Vendas*\n`pos.venda@smartcarnegocios.com.br`\n🔑 `rTqVB@2025`\n\n' +
      '👤 *RH*\n`rh@smartcarnegocios.com.br`\n🔑 `nBvCX@2025`\n\n' +
      '👤 *Financeiro*\n`financeiro@smartcarnegocios.com.br`\n🔑 `vBnJH@2025`\n\n' +
      '👤 *Marketing*\n`marketing@redesmartcar.com.br`\n🔑 `Mkt@2025`\n\n' +
      '👤 *Supervisores*\n`supervisao.comercial@redesmartcar.com.br`\n🔑 `zXkLP@2025`\n\n' +
      '👤 *Caixas*\n`caixa@smartcarnegocios.com.br`\n🔑 `fGyDS@2025`\n\n' +
      '👤 *Peg Pneus*\n`comercial.peg@smartcarnegocios.com.br`\n🔑 `pLcNM@2025`\n\n' +
      '👤 *Supervisão Técnica*\n`supervisao.tecnica@smartcarnegocios.com.br`\n🔑 `Felipe@13`\n\n' +
      '👤 *CD*\n`estoque.cd@smartcarnegocios.com.br`\n🔑 `hJkFD@2025`\n\n' +
      '📅 *Agendamento 1*\n`agendamento1@smartcarnegocios.com.br`\n🔑 `XjKqW@2026`\n\n' +
      '📅 *Agendamento 2*\n`agendamento2@smartcarnegocios.com.br`\n🔑 `XjKqW@2026`\n\n' +
      '📦 *Estoque Lojas 1, 2, 3 e 4*\n`estoque1@smartcarnegocios.com.br`\n🔑 `vRzQy@2026`\n\n' +
      '📦 *Estoque Lojas 5, 6 e 7*\n`estoque2@smartcarnegocios.com.br`\n🔑 `vRzQy@2026`\n\n' +
      '🏪 *Comercial Lojas 1 e 2*\n`comercial1@smartcarnegocios.com.br`\n🔑 `xSwZa@2026`\n\n' +
      '🏪 *Comercial Lojas 3 e 4*\n`comercial2@smartcarnegocios.com.br`\n🔑 `xSwZa@2026`\n\n' +
      '🏪 *Comercial Lojas 5 e 6*\n`comercial3@smartcarnegocios.com.br`\n🔑 `xSwZa@2026`'
    );
    return;
  }

  // COMANDO: !workspace — códigos de verificação Google Workspace
  if (corpo === '!workspace' || corpo.startsWith('!workspace ')) {
    await responder(msg, '🔑 Buscando códigos do Workspace...');
    try {
      const { google } = require('googleapis');
      const fs         = require('fs');
      const path       = require('path');
      const TOKEN_PATH = path.join(__dirname, '..', 'credentials', 'workspace-token.json');
      const CREDS_PATH = path.join(__dirname, '..', 'credentials', 'workspace-oauth-client.json');

      if (!fs.existsSync(TOKEN_PATH) || !fs.existsSync(CREDS_PATH)) {
        await responder(msg, '❌ Token do Workspace não configurado. Rode primeiro:\n`node tools/workspace-gerar-codigos.js`');
        return;
      }

      const creds  = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf8'));
      const token  = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
      const { client_id, client_secret } = creds.installed;
      const auth   = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:3456');
      auth.setCredentials(token);
      const admin  = google.admin({ version: 'directory_v1', auth });

      const partes    = corpo.split(' ');
      const gerarNovos = partes.includes('gerar');
      const emailAlvo  = partes.find(p => p.includes('@'));

      // Listar usuários
      const usersRes = await admin.users.list({ domain: 'smartcarnegocios.com.br', orderBy: 'email', maxResults: 500 });
      const usuarios = (usersRes.data.users || []).filter(u => emailAlvo ? u.primaryEmail === emailAlvo : true);

      if (!usuarios.length) {
        await responder(msg, `❌ Usuário não encontrado: ${emailAlvo}`);
        return;
      }

      if (gerarNovos) {
        await responder(msg, `⚠️ Gerando *novos* códigos para ${usuarios.length} usuário(s)...\n_(os códigos antigos serão invalidados)_`);
      }

      let texto = gerarNovos
        ? `🔑 *Novos códigos gerados — Workspace*\n\n`
        : `🔑 *Códigos de verificação — Workspace*\n\n`;

      const ROTULOS_EMAIL = {
        'comercial1@smartcarnegocios.com.br': 'Comercial 1 (Lojas 1 e 2)',
        'comercial2@smartcarnegocios.com.br': 'Comercial 2 (Lojas 3 e 4)',
        'comercial3@smartcarnegocios.com.br': 'Comercial 3 (Lojas 5 e 6)',
        'estoque1@smartcarnegocios.com.br':   'Estoque 1 (Lojas 1, 2, 3 e 4)',
        'estoque2@smartcarnegocios.com.br':   'Estoque 2 (Lojas 5, 6 e 7)',
        'agendamento1@smartcarnegocios.com.br': 'Agendamento 1',
        'agendamento2@smartcarnegocios.com.br': 'Agendamento 2',
      };

      for (const user of usuarios) {
        const email = user.primaryEmail;
        const nome  = ROTULOS_EMAIL[email] || user.name?.givenName || email.split('@')[0];

        if (gerarNovos) await admin.verificationCodes.generate({ userKey: email }).catch(() => {});

        const codesRes = await admin.verificationCodes.list({ userKey: email }).catch(() => ({ data: {} }));
        const codigos  = (codesRes.data.items || []).filter(c => !c.isAlreadyUsed);

        if (!codigos.length) {
          texto += `👤 *${nome}*\n_sem códigos ativos_\n\n`;
        } else {
          texto += `👤 *${nome}*\n`;
          texto += codigos.map(c => `\`${c.verificationCode}\``).join('  ') + '\n\n';
        }
      }

      texto += `_Total: ${usuarios.length} usuário(s)_`;

      // Mensagem pode ser longa — enviar em partes se necessário
      if (texto.length > 3800) {
        const metade = Math.floor(usuarios.length / 2);
        await responder(msg, texto.slice(0, 3800) + '\n...');
        await responder(msg, '_(continuação)_\n' + texto.slice(3800));
      } else {
        await responder(msg, texto);
      }
    } catch (err) {
      console.error('[workspace]', err.message);
      await responder(msg, `❌ Erro: ${err.message}`);
    }
    return;
  }

  // COMANDO: !cobrarvideo — dispara a cobrança de vídeos manualmente
  if (corpo === '!cobrarvideo') {
    if (!dispararCobrancaVideos) { await responder(msg, '❌ Função não inicializada ainda.'); return; }
    await responder(msg, '📹 Enviando cobrança de vídeos ao grupo...');
    await dispararCobrancaVideos();
    return;
  }

  // COMANDO: !ajuda
  if (corpo === '!ajuda' || corpo === 'ajuda' || corpo === 'help') {
    await responder(msg,
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
      '🎬 *Vídeos:*\n' +
      '`!cobrarvideo` → Enviar cobrança de vídeos ao grupo agora\n' +
      '`!tema-preview` → Preview semana seguinte\n' +
      '`!tema-preview 18` → Preview semana específica\n' +
      '`!confirmar-tema` → Enviar tema aprovado ao grupo de conteúdos\n\n' +
      '🎬 *Editor de vídeos:*\n' +
      '`!editar` → Lista cidades → escolha modo:\n' +
      '  • *1 Com áudio* — narrado + legendas\n' +
      '  • *2 Sem voz* — todos clips + música + transições\n\n' +
      '🎉 *Artes automáticas:*\n' +
      '`!colaborador brpneus` → Arte de novo colaborador (BR Pneus)\n' +
      '`!colaborador pegpneus` → Arte de novo colaborador (Peg Pneus)\n' +
      '`!colaborador smartcar` → Arte de novo colaborador (SmartCar)\n' +
      '`!aniversario brpneus` → Arte de aniversariante (BR Pneus)\n' +
      '`!aniversario pegpneus` → Arte de aniversariante (Peg Pneus)\n' +
      '_Após o comando: envie a foto → nome → cargo → cidade._\n\n' +
      '🔑 *Senhas:*\n' +
      '`!senha <setor>` → Consultar senha do setor (privado)\n\n' +
      '🖥️ *Google Workspace:*\n' +
      '`!workspace` → Listar códigos de backup de todos os usuários\n' +
      '`!workspace gerar` → Gerar *novos* códigos para todos\n' +
      '`!workspace rh@smartcarnegocios.com.br` → Códigos de um usuário\n' +
      '`!workspace gerar rh@smartcarnegocios.com.br` → Gerar novo para um usuário\n\n' +
      '`!grupos` → Listar grupos\n' +
      '`!ajuda` → Esta mensagem\n\n' +
      '_Relatórios automáticos de Ads: 8h–17h (hora em hora) + 17h30 (seg–sáb)._'
    );
    return;
  }
  } catch (err) {
    console.error('[BOT] Erro em processarMensagem:', err.message);
    console.error(err.stack);
    try { await responder(msg, `❌ Erro interno: ${err.message}`); } catch {}
  }
}

client.on('message',        (msg) => processarMensagem(msg).catch(err => console.error('[BOT] Erro em message:', err.message)));
client.on('message_create', (msg) => { if (msg.fromMe) processarMensagem(msg).catch(err => console.error('[BOT] Erro em message_create:', err.message)); });

// ─── Helpers ───────────────────────────────────────────────────────────────────

function rodarMonitor(flags = '--meta --auto') {
  const args = flags.trim().split(/\s+/);
  return new Promise((resolve) => {
    let out = '';
    const proc = spawn(process.execPath, [MONITOR_ADS, ...args], {
      cwd:         path.join(__dirname, '..'),
      env:         process.env,
      stdio:       'pipe',
      windowsHide: true,
    });
    proc.stdout.on('data', d => { out += d; });
    proc.stderr.on('data', d => { out += d; });
    proc.on('close', () => resolve(out));
    setTimeout(() => { try { proc.kill(); } catch {} resolve(out || 'Timeout.'); }, 65000);
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
const { spawn } = require('child_process');

// Argumentos extras por script (ex: leads-hoje precisa de --agora para não virar scheduler)
const COLLECT_ARGS = {
  [path.join(__dirname, 'leads-hoje.js')]: ['--agora'],
};

function runCollector(script, extraEnv = {}) {
  const args = COLLECT_ARGS[script] || [];
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [script, ...args], {
      cwd:          path.join(__dirname, '..'),
      env:          { ...process.env, ...extraEnv },
      stdio:        'pipe',
      windowsHide:  true,
    });
    let out = '';
    proc.stdout.on('data', d => { out += d; });
    proc.stderr.on('data', d => { out += d; });
    proc.on('close', code => code === 0 ? resolve(out) : reject(new Error(out.slice(-400))));
  });
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const COLLECT_ROUTES = {
  '/collect/social':    path.join(__dirname, 'coletar-social-media.js'),
  '/collect/youtube':   path.join(__dirname, 'coletar-youtube.js'),
  '/collect/video':     path.join(__dirname, 'coletar-social-video.js'),
  '/collect/ads':       path.join(__dirname, 'coletar-ads-supabase.js'),
  '/collect/leads':     path.join(__dirname, 'leads-hoje.js'),
  '/collect/avaliacoes':path.join(__dirname, 'coletar-avaliacoes.js'),
};

const apiServer = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS); res.end(); return;
  }

  // Collect endpoints — responde 202 imediatamente e roda coleta em background
  if (req.method === 'POST' && COLLECT_ROUTES[req.url]) {
    const script = COLLECT_ROUTES[req.url];
    console.log(`[API] Coleta manual via NexusZ: ${req.url}`);
    res.writeHead(202, CORS_HEADERS);
    res.end(JSON.stringify({ ok: true, running: true }));
    runCollector(script)
      .then(() => console.log(`[API] Coleta ${req.url} concluída`))
      .catch(err => console.error(`[API] Coleta ${req.url} ERRO:`, err.message.slice(0, 200)));
    return;
  }

  // Gerar arte de colaborador
  if (req.method === 'POST' && req.url === '/gerar-arte') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { colaborador_id, tipo, marca, info, nome, cargo, loja, foto_base64 } = JSON.parse(body);
        if (!tipo) {
          res.writeHead(400, CORS_HEADERS);
          res.end(JSON.stringify({ ok: false, erro: 'tipo é obrigatório' }));
          return;
        }
        if (!colaborador_id && !foto_base64) {
          res.writeHead(400, CORS_HEADERS);
          res.end(JSON.stringify({ ok: false, erro: 'Selecione um colaborador ou envie uma foto' }));
          return;
        }
        if (!colaborador_id && !nome) {
          res.writeHead(400, CORS_HEADERS);
          res.end(JSON.stringify({ ok: false, erro: 'nome é obrigatório no modo manual' }));
          return;
        }

        const extra = { ARTE_TIPO: tipo };
        if (colaborador_id) {
          extra.ARTE_COLABORADOR_ID = colaborador_id;
        } else {
          // Modo manual: salva foto base64 em arquivo temporário
          const tmpFoto = path.join(require('os').tmpdir(), `arte-foto-manual-${Date.now()}.jpg`);
          const base64Data = foto_base64.replace(/^data:image\/\w+;base64,/, '');
          require('fs').writeFileSync(tmpFoto, Buffer.from(base64Data, 'base64'));
          extra.ARTE_FOTO_PATH = tmpFoto;
          extra.ARTE_NOME      = nome;
          if (cargo) extra.ARTE_CARGO = cargo;
          if (loja)  extra.ARTE_LOJA  = loja;
        }
        if (marca) extra.ARTE_MARCA = marca;
        if (info)  extra.ARTE_INFO  = info;

        console.log(`[API] Gerar arte: tipo=${tipo} colab=${colaborador_id || 'manual:' + nome}`);
        res.writeHead(202, CORS_HEADERS);
        res.end(JSON.stringify({ ok: true, running: true }));
        const script = path.join(__dirname, 'gerar-arte-colaborador.js');
        runCollector(script, extra)
          .then(() => console.log(`[API] Arte ${tipo}/${colaborador_id || nome} concluída`))
          .catch(err => console.error(`[API] Arte ERRO:`, err.message.slice(0, 200)));
      } catch (e) {
        res.writeHead(400, CORS_HEADERS);
        res.end(JSON.stringify({ ok: false, erro: 'JSON inválido' }));
      }
    });
    return;
  }

  // Download direto de arquivo do Drive (proxy para o NexusZ)
  if (req.method === 'GET' && req.url.startsWith('/download-arte')) {
    const params = new URL(req.url, 'http://localhost').searchParams;
    const fileId  = params.get('id');
    const nome    = params.get('name') || 'arte.png';
    if (!fileId) { res.writeHead(400, CORS_HEADERS); res.end('file id obrigatorio'); return; }
    (async () => {
      const SA_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
      const { google } = require('googleapis');
      let parsed;
      try { parsed = JSON.parse(SA_JSON); } catch { parsed = JSON.parse(Buffer.from(SA_JSON, 'base64').toString('utf8')); }
      const auth  = new google.auth.GoogleAuth({ credentials: parsed, scopes: ['https://www.googleapis.com/auth/drive.readonly'] });
      const drive = google.drive({ version: 'v3', auth });
      const fileRes = await drive.files.get({ fileId, alt: 'media', supportsAllDrives: true }, { responseType: 'stream' });
      res.writeHead(200, {
        ...CORS_HEADERS,
        'Content-Type':        'image/png',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(nome)}"`,
      });
      fileRes.data.pipe(res);
    })().catch(e => {
      res.writeHead(500, CORS_HEADERS);
      res.end(e.message);
    });
    return;
  }

  // Tornar arquivo do Drive público (usado após upload de foto de perfil)
  if (req.method === 'POST' && req.url === '/drive-set-public') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { file_id } = JSON.parse(body);
        if (!file_id) { res.writeHead(400, CORS_HEADERS); res.end(JSON.stringify({ ok: false, erro: 'file_id obrigatório' })); return; }
        const SA_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
        const { google } = require('googleapis');
        let parsed;
        try { parsed = JSON.parse(SA_JSON); } catch { parsed = JSON.parse(Buffer.from(SA_JSON, 'base64').toString('utf8')); }
        const auth  = new google.auth.GoogleAuth({ credentials: parsed, scopes: ['https://www.googleapis.com/auth/drive'] });
        const drive = google.drive({ version: 'v3', auth });
        await drive.permissions.create({ fileId: file_id, requestBody: { role: 'reader', type: 'anyone' }, supportsAllDrives: true });
        res.writeHead(200, CORS_HEADERS);
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(500, CORS_HEADERS);
        res.end(JSON.stringify({ ok: false, erro: e.message }));
      }
    });
    return;
  }

  // Mensagem WhatsApp
  if (req.method === 'POST' && (req.url === '/send' || req.url === '/send-media')) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        if (req.url === '/send-media') {
          const { chatId, media, caption } = JSON.parse(body);
          const { MessageMedia } = require('whatsapp-web.js');
          const m = new MessageMedia(media.mimetype, media.data, media.filename);
          await client.sendMessage(chatId, m, { caption: caption || '' });
          res.writeHead(200, CORS_HEADERS);
          res.end(JSON.stringify({ ok: true }));
          return;
        }
        const { chatId, message } = JSON.parse(body);
        await client.sendMessage(chatId, message);
        res.writeHead(200, CORS_HEADERS);
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(500, CORS_HEADERS);
        res.end(JSON.stringify({ ok: false, erro: e.message }));
      }
    });
    return;
  }

  res.writeHead(404, CORS_HEADERS); res.end(JSON.stringify({ ok: false }));
});
apiServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log('⚠️  Porta 3099 em uso — API interna desativada nesta instância (reinício rápido).');
  } else {
    console.error('❌ Erro API interna:', err.message);
  }
});
apiServer.listen(3099, '127.0.0.1', () =>
  console.log('🔌 API interna do bot escutando em 127.0.0.1:3099')
);

// ─── Error handlers ────────────────────────────────────────────────────────────

process.on('unhandledRejection', (reason) => {
  console.error('[BOT] UnhandledRejection:', reason instanceof Error ? reason.message : reason);
  if (reason instanceof Error) console.error(reason.stack);
});

// Graceful shutdown: garante que o Chrome filho é morto antes do PM2 reiniciar
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM — encerrando bot...');
  client.destroy().catch(() => {}).finally(() => process.exit(0));
});

// ─── Start ─────────────────────────────────────────────────────────────────────

async function iniciarBot(tentativasRestantes = 3) {
  try {
    console.log('🔄 Iniciando WhatsApp Bot...');
    await client.initialize();
  } catch (e) {
    const sessaoCorrempida =
      e.message?.includes('Execution context was destroyed') ||
      e.message?.includes('Session closed') ||
      e.message?.includes('Target closed') ||
      e.message?.includes('Protocol error');

    if (sessaoCorrempida) {
      console.warn('⚠️  Sessão corrompida detectada — limpando e reiniciando...');
      try { fs.rmSync(SESSION_DIR, { recursive: true, force: true }); } catch {}
      await new Promise(r => setTimeout(r, 3000));
      return iniciarBot(3); // reinicia com tentativas cheias após limpar
    }

    if (e.message?.includes('already running') && tentativasRestantes > 0) {
      console.log(`⏳ Browser ainda ativo — aguardando 8s (${tentativasRestantes} tentativas restantes)...`);
      await new Promise(r => setTimeout(r, 8000));
      return iniciarBot(tentativasRestantes - 1);
    }

    throw e;
  }
}

iniciarBot();
