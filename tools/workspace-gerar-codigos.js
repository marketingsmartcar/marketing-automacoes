'use strict';
/**
 * tools/workspace-gerar-codigos.js
 *
 * Gera códigos de verificação de backup para todos os usuários do Google Workspace.
 *
 * Uso:
 *   node tools/workspace-gerar-codigos.js          # lista códigos existentes
 *   node tools/workspace-gerar-codigos.js --gerar  # gera NOVOS códigos (invalida os antigos)
 *   node tools/workspace-gerar-codigos.js --usuario fulano@smartcarnegocios.com.br
 */

const { google }  = require('googleapis');
const fs          = require('fs');
const path        = require('path');
const http        = require('http');
const url         = require('url');
const open        = require('open').default ?? require('open');

const CREDENTIALS_PATH = path.join(__dirname, '..', 'credentials', 'workspace-oauth-client.json');
const TOKEN_PATH       = path.join(__dirname, '..', 'credentials', 'workspace-token.json');
const DOMAIN           = 'smartcarnegocios.com.br';

const SCOPES = [
  'https://www.googleapis.com/auth/admin.directory.user',
  'https://www.googleapis.com/auth/admin.directory.user.security',
];

// ── OAuth2 ────────────────────────────────────────────────────────────────────

function criarOAuth2Client() {
  const creds  = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const { client_id, client_secret, redirect_uris } = creds.installed;
  return new google.auth.OAuth2(client_id, client_secret, 'http://localhost:3456');
}

async function autenticar() {
  const auth = criarOAuth2Client();

  // Token salvo?
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    auth.setCredentials(token);

    // Refresh se expirado
    if (token.expiry_date && token.expiry_date < Date.now()) {
      const { credentials } = await auth.refreshAccessToken();
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(credentials, null, 2));
      auth.setCredentials(credentials);
    }
    return auth;
  }

  // Primeiro uso — abrir browser para autorizar
  const authUrl = auth.generateAuthUrl({ access_type: 'offline', scope: SCOPES, prompt: 'consent' });

  console.log('\n🔐 Abrindo navegador para autorização...');
  console.log('   Se não abrir automaticamente, acesse:\n');
  console.log('  ', authUrl, '\n');

  // Servidor local para capturar o code
  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const qs = new url.URL(req.url, 'http://localhost:3456').searchParams;
      const code = qs.get('code');
      res.end('<html><body><h2>✅ Autorizado! Pode fechar esta aba.</h2></body></html>');
      server.close();
      code ? resolve(code) : reject(new Error('Código não recebido'));
    }).listen(3456);

    try { open(authUrl); } catch {}
  });

  const { tokens } = await auth.getToken(code);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  auth.setCredentials(tokens);
  console.log('✅ Autenticado e token salvo.\n');
  return auth;
}

// ── Admin SDK ─────────────────────────────────────────────────────────────────

async function listarUsuarios(admin) {
  const res = await admin.users.list({
    domain:  DOMAIN,
    orderBy: 'email',
    maxResults: 500,
  });
  return res.data.users || [];
}

async function listarCodigos(admin, email) {
  try {
    const res = await admin.verificationCodes.list({ userKey: email });
    return res.data.items || [];
  } catch (e) {
    return [];
  }
}

async function gerarCodigos(admin, email) {
  await admin.verificationCodes.generate({ userKey: email });
  return listarCodigos(admin, email);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args       = process.argv.slice(2);
  const gerarNovos = args.includes('--gerar');
  const soUsuario  = args[args.indexOf('--usuario') + 1];

  console.log('\n🔑 Workspace — Códigos de Verificação de Backup');
  console.log(`   Domínio: ${DOMAIN}`);
  console.log(`   Modo: ${gerarNovos ? '⚠️  GERAR NOVOS (invalida anteriores)' : 'Listar existentes'}\n`);

  const auth  = await autenticar();
  const admin = google.admin({ version: 'directory_v1', auth });

  const usuarios = soUsuario
    ? [{ primaryEmail: soUsuario, name: { fullName: soUsuario } }]
    : await listarUsuarios(admin);

  if (!usuarios.length) {
    console.log('❌ Nenhum usuário encontrado.');
    return;
  }

  console.log(`👥 ${usuarios.length} usuário(s) encontrado(s)\n`);
  console.log('═'.repeat(80));

  const resultado = [];

  for (const user of usuarios) {
    const email = user.primaryEmail;
    const nome  = user.name?.fullName || email;

    process.stdout.write(`  ${email.padEnd(50)} `);

    try {
      const codigos = gerarNovos
        ? await gerarCodigos(admin, email)
        : await listarCodigos(admin, email);

      const ativos = codigos.filter(c => !c.isAlreadyUsed);

      if (ativos.length === 0) {
        console.log('(sem códigos ativos)');
      } else {
        console.log(`${ativos.length} código(s):`);
        ativos.forEach(c => process.stdout.write(`    ${c.verificationCode}  `));
        process.stdout.write('\n');
      }

      resultado.push({ email, nome, codigos: ativos.map(c => c.verificationCode) });
    } catch (err) {
      console.log(`❌ ${err.message}`);
      resultado.push({ email, nome, codigos: [], erro: err.message });
    }
  }

  console.log('\n' + '═'.repeat(80));

  // Salvar em arquivo
  const outPath = path.join(__dirname, '..', 'logs', `workspace-codigos-${new Date().toISOString().slice(0,10)}.json`);
  fs.writeFileSync(outPath, JSON.stringify(resultado, null, 2));
  console.log(`\n✅ Resultado salvo em: ${outPath}\n`);
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1); });
