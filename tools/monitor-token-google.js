'use strict';

/**
 * monitor-token-google.js
 * Verifica se o refresh_token do Google Ads ainda está válido
 * e avisa quantos dias faltam para expirar (modo teste = 7 dias).
 *
 * Uso: node tools/monitor-token-google.js
 */

require('dotenv').config();

const fs   = require('fs');
const path = require('path');
const { GoogleAdsApi } = require('google-ads-api');

const STATE_FILE  = path.join(__dirname, '..', 'output', 'google-token-state.json');
const DIAS_EXPIRY = 7;   // apps em modo teste expiram em 7 dias
const AVISO_DIAS  = 3;   // avisar quando faltar ≤ 3 dias
const CRITICO_DIAS = 1;  // crítico quando faltar ≤ 1 dia

// ── Lê/salva estado ───────────────────────────────────────────────────────────

function lerEstado() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function salvarEstado(data) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ── Verifica o token ──────────────────────────────────────────────────────────

async function verificarTokenGoogle() {
  const refreshToken   = process.env.GOOGLE_ADS_REFRESH_TOKEN;
  const clientId       = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret   = process.env.GOOGLE_ADS_CLIENT_SECRET;
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

  if (!refreshToken || !clientId || !clientSecret || !developerToken) {
    return { erro: 'Variáveis GOOGLE_ADS_* não configuradas no .env' };
  }

  const api = new GoogleAdsApi({ client_id: clientId, client_secret: clientSecret, developer_token: developerToken });

  // Testa o token fazendo uma chamada real
  try {
    await api.listAccessibleCustomers(refreshToken);
  } catch (err) {
    const msg = err.message || '';
    if (msg.includes('invalid_grant') || msg.includes('Token has been expired')) {
      salvarEstado({ renovadoEm: null, invalido: true });
      return { valido: false, erro: 'Token expirado — rode: node tools/renovar-token-google.js' };
    }
    // Outros erros não indicam expiração do token
    return { valido: true, aviso: `Aviso ao testar: ${msg}`, diasRestantes: null };
  }

  // Token OK — verifica idade pelo state file
  const estado = lerEstado();
  if (!estado?.renovadoEm) {
    // Nenhum state → salva agora como referência
    salvarEstado({ renovadoEm: new Date().toISOString() });
    return { valido: true, diasRestantes: null, semHistorico: true };
  }

  const renovadoEm     = new Date(estado.renovadoEm);
  const diasPassados   = Math.floor((Date.now() - renovadoEm.getTime()) / 86400000);
  const diasRestantes  = DIAS_EXPIRY - diasPassados;
  const expirando      = diasRestantes <= AVISO_DIAS;
  const critico        = diasRestantes <= CRITICO_DIAS;
  const expirado       = diasRestantes <= 0;

  return { valido: !expirado, diasPassados, diasRestantes, expirando, critico, expirado, renovadoEm: estado.renovadoEm };
}

// ── Formata alerta para WhatsApp ──────────────────────────────────────────────

function formatarAlertaTokenGoogle(resultado) {
  if (!resultado.erro && resultado.valido && !resultado.expirando && !resultado.expirado) return null;

  const linhas = ['🔑 *Alerta de Token Google Ads*\n'];

  if (!resultado.valido || resultado.expirado) {
    linhas.push('🔴 *EXPIRADO — renovar agora:*');
    linhas.push('• Google Ads — Refresh Token');
    linhas.push('');
    linhas.push('▶️ No terminal: `node tools/renovar-token-google.js`');
    linhas.push('▶️ No WhatsApp: `!renovartoken`');
  } else if (resultado.critico) {
    linhas.push(`🔴 *CRÍTICO — expira em ${resultado.diasRestantes} dia(s):*`);
    linhas.push('• Google Ads — Refresh Token');
    linhas.push('');
    linhas.push('▶️ No terminal: `node tools/renovar-token-google.js`');
    linhas.push('▶️ No WhatsApp: `!renovartoken`');
  } else if (resultado.expirando) {
    linhas.push(`⚠️ *Expira em ${resultado.diasRestantes} dia(s):*`);
    linhas.push('• Google Ads — Refresh Token');
    linhas.push('');
    linhas.push('▶️ Renove em breve: `!renovartoken`');
  } else if (resultado.erro) {
    linhas.push(`❌ Erro ao verificar token Google Ads:\n${resultado.erro}`);
  }

  return linhas.join('\n');
}

// ── Entry point ───────────────────────────────────────────────────────────────

if (require.main === module) {
  verificarTokenGoogle().then(r => {
    console.log('\n── Resultado ──────────────────────────');
    if (r.erro)          console.log(`❌ ${r.erro}`);
    else if (!r.valido)  console.log('🔴 Token INVÁLIDO / EXPIRADO');
    else if (r.expirado) console.log('🔴 Token EXPIRADO');
    else if (r.expirando) console.log(`⚠️  Expira em ${r.diasRestantes} dia(s)`);
    else if (r.semHistorico) console.log('✅ Token OK (sem histórico de renovação — referência salva)');
    else if (r.diasRestantes !== null) console.log(`✅ Token OK — ${r.diasRestantes} dia(s) restante(s)`);
    else console.log('✅ Token OK');

    const alerta = formatarAlertaTokenGoogle(r);
    if (alerta) { console.log('\n── Mensagem WhatsApp ───────────────────'); console.log(alerta); }
  }).catch(err => { console.error('Erro:', err.message); process.exit(1); });
}

module.exports = { verificarTokenGoogle, formatarAlertaTokenGoogle };
