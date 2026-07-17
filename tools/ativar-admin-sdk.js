'use strict';
// Ativa o Admin SDK API no projeto nexusz-admin via OAuth2

const { google } = require('googleapis');
const fs   = require('fs');
const path = require('path');
const http = require('http');
const url  = require('url');

const CREDENTIALS_PATH = path.join(__dirname, '..', 'credentials', 'workspace-oauth-client.json');
const TOKEN_PATH       = path.join(__dirname, '..', 'credentials', 'workspace-token.json');
const PROJECT_ID       = 'nexusz-admin';

const SCOPES = [
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/admin.directory.user',
  'https://www.googleapis.com/auth/admin.directory.user.security',
];

async function autenticar() {
  const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const { client_id, client_secret } = creds.installed;
  const auth = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:3456');

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    // Re-auth se escopo mudou
    const hasCloudScope = token.scope?.includes('cloud-platform');
    if (hasCloudScope) {
      auth.setCredentials(token);
      return auth;
    }
  }

  const authUrl = auth.generateAuthUrl({ access_type: 'offline', scope: SCOPES, prompt: 'consent' });
  console.log('\n🔐 Abrindo navegador para autorização...\n');
  console.log('   Acesse:', authUrl, '\n');

  // Tenta abrir o navegador
  try {
    const { exec } = require('child_process');
    exec(`start "" "${authUrl}"`);
  } catch {}

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const qs   = new url.URL(req.url, 'http://localhost:3456').searchParams;
      const code = qs.get('code');
      res.end('<html><body><h2>✅ Autorizado! Pode fechar esta aba.</h2></body></html>');
      server.close();
      code ? resolve(code) : reject(new Error('Código não recebido'));
    }).listen(3456);
  });

  const { tokens } = await auth.getToken(code);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  auth.setCredentials(tokens);
  console.log('✅ Autenticado!\n');
  return auth;
}

async function main() {
  console.log('\n🔧 Ativando Admin SDK API no projeto', PROJECT_ID, '...\n');

  const auth        = await autenticar();
  const serviceUsage = google.serviceusage({ version: 'v1', auth });

  const serviceName = `projects/${PROJECT_ID}/services/admin.googleapis.com`;

  try {
    const status = await serviceUsage.services.get({ name: serviceName });
    if (status.data.state === 'ENABLED') {
      console.log('✅ Admin SDK API já está ativa!\n');
    } else {
      console.log('⏳ Ativando...');
      await serviceUsage.services.enable({ name: serviceName });
      console.log('✅ Admin SDK API ativada com sucesso!\n');
    }
  } catch (err) {
    if (err.message?.includes('not found') || err.code === 404) {
      console.log('⏳ Ativando Admin SDK API...');
      try {
        await serviceUsage.services.enable({ name: serviceName });
        console.log('✅ Admin SDK API ativada!\n');
      } catch (e2) {
        console.error('❌', e2.message);
        console.log('\n   Ative manualmente em:');
        console.log('   https://console.cloud.google.com/apis/library/admin.googleapis.com?project=nexusz-admin\n');
      }
    } else {
      console.error('❌', err.message);
    }
  }

  console.log('Agora rode: node tools/workspace-gerar-codigos.js\n');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
