'use strict';
/**
 * verificar-token-google-ci.js
 * Testa se o GOOGLE_ADS_REFRESH_TOKEN está válido fazendo uma chamada real à API.
 *
 * Exit codes:
 *   0 — token OK
 *   2 — token inválido/expirado (invalid_grant)
 *   1 — outro erro (não relacionado ao token)
 *
 * Uso: node tools/verificar-token-google-ci.js
 */

require('dotenv').config();

const { GoogleAdsApi } = require('google-ads-api');

async function main() {
  const refreshToken   = process.env.GOOGLE_ADS_REFRESH_TOKEN;
  const clientId       = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret   = process.env.GOOGLE_ADS_CLIENT_SECRET;
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

  if (!refreshToken || !clientId || !clientSecret || !developerToken) {
    console.error('❌ Variáveis GOOGLE_ADS_* não configuradas.');
    process.exit(1);
  }

  const api = new GoogleAdsApi({ client_id: clientId, client_secret: clientSecret, developer_token: developerToken });

  try {
    const customers = await api.listAccessibleCustomers(refreshToken);
    console.log(`✅ Token Google Ads válido — ${customers.resource_names?.length ?? 0} contas acessíveis.`);
    process.exit(0);
  } catch (err) {
    const msg = err.message || '';
    if (msg.includes('invalid_grant') || msg.includes('Token has been expired') || msg.includes('UNAUTHENTICATED')) {
      console.error('❌ Token expirado (invalid_grant). Renovar em: node tools/renovar-google-token.js');
      process.exit(2);
    }
    // Outros erros (rede, quota, etc.) — token pode estar OK
    console.warn(`⚠️  Erro ao testar token (pode ser temporário): ${msg.slice(0, 120)}`);
    process.exit(1);
  }
}

main();
