'use strict';

/**
 * Roda UMA vez para autorizar acesso ao Google Sheets.
 * Abre o navegador, você clica em Aceitar, e salva o token no .env.
 *
 * Uso: node tools/setup-google-sheets-auth.js
 */

require('dotenv').config();

const { google }   = require('googleapis');
const http         = require('http');
const url          = require('url');
const fs           = require('fs');
const path         = require('path');
const { execSync } = require('child_process');

const CLIENT_ID     = process.env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
const REDIRECT_URI  = 'http://localhost:3456/oauth2callback';
const SCOPES        = ['https://www.googleapis.com/auth/spreadsheets'];
const ENV_FILE      = path.join(__dirname, '..', '.env');

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ GOOGLE_ADS_CLIENT_ID e GOOGLE_ADS_CLIENT_SECRET precisam estar no .env');
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent',
});

console.log('\n🔑 Abrindo navegador para autorização...');
console.log('   (se não abrir, acesse manualmente:)');
console.log('   ' + authUrl + '\n');

// Tenta abrir o browser automaticamente
try { execSync(`start "" "${authUrl}"`, { stdio: 'ignore' }); } catch {}

// Servidor local para capturar o redirect
const server = http.createServer(async (req, res) => {
  const { pathname, query } = url.parse(req.url, true);
  if (pathname !== '/oauth2callback') { res.end('Aguardando...'); return; }

  const code = query.code;
  if (!code) { res.end('❌ Código não recebido.'); server.close(); return; }

  try {
    const { tokens } = await oauth2.getToken(code);
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      res.end('<h2>❌ Refresh token não retornado. Revogue o acesso no Google e tente novamente.</h2>');
      server.close(); return;
    }

    // Salva no .env
    let envContent = fs.readFileSync(ENV_FILE, 'utf8');
    const linha = `GOOGLE_SHEETS_REFRESH_TOKEN=${refreshToken}`;
    if (envContent.includes('GOOGLE_SHEETS_REFRESH_TOKEN=')) {
      envContent = envContent.replace(/GOOGLE_SHEETS_REFRESH_TOKEN=.*/,linha);
    } else {
      envContent += `\n# ─── Google Sheets API ────────────────────────────────────────────────────────\n${linha}\n`;
    }
    fs.writeFileSync(ENV_FILE, envContent);

    console.log('✅ Token salvo no .env como GOOGLE_SHEETS_REFRESH_TOKEN');
    res.end('<h2 style="font-family:sans-serif;color:green">✅ Autorização concluída! Pode fechar esta aba.</h2>');
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao trocar código por token:', err.message);
    res.end('<h2>❌ Erro: ' + err.message + '</h2>');
    server.close();
  }
});

server.listen(3456, () => console.log('⏳ Aguardando callback em http://localhost:3456/oauth2callback ...'));
