'use strict';

/**
 * monitor-tokens.js
 * BR Pneus & Oficina — Verificação de expiração dos tokens Meta
 *
 * Uso:
 *   node tools/monitor-tokens.js
 */

require('dotenv').config();

const https = require('https');

// ── Tokens a verificar ────────────────────────────────────────────────────────

const TOKENS = [
  {
    nome:      'BR Pneus — Ads (META_ACCESS_TOKEN_BR)',
    tokenEnv:  'META_ACCESS_TOKEN_BR',
    appIdEnv:  'META_APP_ID_BR',
    secretEnv: 'META_APP_SECRET_BR',
  },
  {
    nome:      'Peg Pneus — Ads (META_ACCESS_TOKEN_PEG)',
    tokenEnv:  'META_ACCESS_TOKEN_PEG',
    appIdEnv:  'META_APP_ID_PEG',
    secretEnv: 'META_APP_SECRET_PEG',
  },
  {
    nome:      'BR Pneus — Pages (META_PAGE_TOKEN_BR)',
    tokenEnv:  'META_PAGE_TOKEN_BR',
    appIdEnv:  'META_APP_ID_BR',
    secretEnv: 'META_APP_SECRET_BR',
  },
  {
    nome:      'Peg Pneus Araraquara — Pages (META_PAGE_TOKEN_PEG_ARQ)',
    tokenEnv:  'META_PAGE_TOKEN_PEG_ARQ',
    appIdEnv:  'META_APP_ID_PEG',
    secretEnv: 'META_APP_SECRET_PEG',
  },
  {
    nome:      'Peg Pneus Sorocaba — Pages (META_PAGE_TOKEN_PEG_SOR)',
    tokenEnv:  'META_PAGE_TOKEN_PEG_SOR',
    appIdEnv:  'META_APP_ID_PEG',
    secretEnv: 'META_APP_SECRET_PEG',
  },
];

const AVISO_DIAS = 7; // avisar quando faltar ≤ 7 dias

// ── Debug token via Graph API ─────────────────────────────────────────────────

function debugToken(token, appId, appSecret) {
  return new Promise((resolve, reject) => {
    const url = `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(token)}&access_token=${appId}|${appSecret}`;
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error('Resposta inválida da API'));
        }
      });
    }).on('error', reject);
  });
}

// ── Verificar todos os tokens ─────────────────────────────────────────────────

async function verificarTokens() {
  const resultados = [];
  const agora = Math.floor(Date.now() / 1000);

  for (const t of TOKENS) {
    const token  = process.env[t.tokenEnv];
    const appId  = process.env[t.appIdEnv];
    const secret = process.env[t.secretEnv];

    if (!token || !appId || !secret) {
      resultados.push({ nome: t.nome, erro: 'Variável de ambiente não configurada' });
      continue;
    }

    try {
      const resp = await debugToken(token, appId, secret);
      const info = resp.data;

      if (!info) {
        resultados.push({ nome: t.nome, erro: resp.error?.message || 'Sem dados na resposta' });
        continue;
      }

      if (!info.is_valid) {
        resultados.push({
          nome: t.nome,
          valido: false,
          erro: info.error?.message || 'Token inválido',
        });
        continue;
      }

      const expiresAt     = info.expires_at || 0;
      const nuncaExpira   = expiresAt === 0;
      const diasRestantes = nuncaExpira ? null : Math.floor((expiresAt - agora) / 86400);
      const expirando     = !nuncaExpira && diasRestantes <= AVISO_DIAS;
      const expirado      = !nuncaExpira && diasRestantes < 0;

      resultados.push({
        nome: t.nome,
        valido: true,
        nuncaExpira,
        diasRestantes,
        expirando,
        expirado,
        expiresAt,
        tipo: info.type,
      });
    } catch (err) {
      resultados.push({ nome: t.nome, erro: err.message });
    }
  }

  return resultados;
}

// ── Formatar alerta para WhatsApp ─────────────────────────────────────────────

function formatarAlertaTokens(resultados) {
  const criticos  = resultados.filter(r => r.expirado || (!r.valido && !r.erro?.includes('não configurada')));
  const expirando = resultados.filter(r => !r.expirado && r.expirando);
  const erros     = resultados.filter(r => r.erro);

  if (!criticos.length && !expirando.length && !erros.length) return null;

  const linhas = ['🔑 *Alerta de Tokens Meta*\n'];

  if (criticos.length) {
    linhas.push('🔴 *EXPIRADO — renovar agora:*');
    for (const r of criticos) linhas.push(`• ${r.nome}`);
    linhas.push('');
  }

  if (expirando.length) {
    linhas.push(`⚠️ *Expira em breve:*`);
    for (const r of expirando) {
      linhas.push(`• ${r.nome}\n  ↳ ${r.diasRestantes} dia(s) restante(s)`);
    }
    linhas.push('');
  }

  linhas.push('🔗 Renovar em: https://developers.facebook.com/tools/explorer/');

  return linhas.join('\n');
}

// ── Entry point ───────────────────────────────────────────────────────────────

if (require.main === module) {
  verificarTokens().then(resultados => {
    console.log('\n── Resultado ──────────────────────────');
    for (const r of resultados) {
      if (r.erro)          console.log(`❌ ${r.nome}: ${r.erro}`);
      else if (!r.valido)  console.log(`🔴 ${r.nome}: INVÁLIDO`);
      else if (r.expirado) console.log(`🔴 ${r.nome}: EXPIRADO`);
      else if (r.expirando) console.log(`⚠️  ${r.nome}: expira em ${r.diasRestantes} dia(s)`);
      else if (r.nuncaExpira)  console.log(`✅ ${r.nome}: nunca expira`);
      else                 console.log(`✅ ${r.nome}: ${r.diasRestantes} dia(s) restante(s)`);
    }

    const alerta = formatarAlertaTokens(resultados);
    if (alerta) {
      console.log('\n── Mensagem WhatsApp ───────────────────');
      console.log(alerta);
    } else {
      console.log('\n✅ Todos os tokens OK.');
    }
  }).catch(err => {
    console.error('Erro:', err.message);
    process.exit(1);
  });
}

module.exports = { verificarTokens, formatarAlertaTokens };
