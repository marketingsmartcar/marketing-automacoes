'use strict';
/**
 * Cria/atualiza páginas WordPress da BR Pneus Araraquara via cPanel API:
 * 1. Política de Privacidade (atualiza página existente para pt-BR)
 * 2. Exclusão de Dados (página nova)
 *
 * Uso: node tools/wp-criar-paginas-br.js
 */

const https = require('https');

const CPANEL_HOST = 'sh-pro44.hostgator.com.br';
const CPANEL_PORT = 2083;
const CPANEL_AUTH = 'cpanel brpneu76:QQ1BFWLWO0W2M3H3O13SM2SF6084VU9J';
const WP_DIR     = '/home3/brpneu76/public_html';
const WP_URL     = 'https://brpneusararaquara.com.br';
const SCRIPT_NAME = '_wp_setup_pages.php';

// ── Conteúdo das páginas ──────────────────────────────────────────────────────

const PRIVACY_CONTENT = `
<h2>Quem somos</h2>
<p>A BR Pneus &amp; Oficina é uma rede de franquias de pneus e serviços automotivos com sede em Araraquara-SP. Nosso site é <a href="https://brpneusararaquara.com.br">https://brpneusararaquara.com.br</a>.</p>

<h2>Quais dados coletamos</h2>
<p>Coletamos os seguintes dados pessoais dos usuários que interagem com nossas páginas nas redes sociais (Facebook e Instagram):</p>
<ul>
<li>Nome e identificador de perfil público</li>
<li>Comentários e mensagens enviadas para nossas páginas</li>
<li>Dados de engajamento (curtidas, compartilhamentos)</li>
</ul>

<h2>Por que coletamos esses dados</h2>
<p>Utilizamos esses dados para responder a dúvidas e comentários de clientes, melhorar nossos serviços e garantir um atendimento de qualidade.</p>

<h2>Armazenamento e segurança</h2>
<p>Os dados são armazenados em servidores seguros com acesso restrito à equipe de atendimento da BR Pneus &amp; Oficina. Não compartilhamos dados pessoais com terceiros, exceto quando exigido por lei.</p>

<h2>Seus direitos</h2>
<p>Você tem direito a acessar, corrigir ou solicitar a exclusão dos seus dados pessoais armazenados por nós. Para exercer esses direitos, envie um e-mail para <a href="mailto:marketing@redesmartcar.com.br">marketing@redesmartcar.com.br</a>.</p>

<h2>Cookies</h2>
<p>Nosso site utiliza cookies para melhorar a experiência de navegação. Você pode desativar os cookies nas configurações do seu navegador.</p>

<h2>Contato</h2>
<p>Dúvidas sobre esta política? Entre em contato: <a href="mailto:marketing@redesmartcar.com.br">marketing@redesmartcar.com.br</a> | SAC: 0800 942 4402</p>
`;

const DELETION_CONTENT = `
<h2>Como solicitar a exclusão dos seus dados</h2>
<p>A BR Pneus &amp; Oficina respeita a sua privacidade e garante o seu direito à exclusão de dados pessoais conforme a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).</p>

<h2>Quais dados podem ser excluídos</h2>
<ul>
<li>Nome e identificador de perfil coletado via redes sociais</li>
<li>Histórico de mensagens e comentários armazenados em nossos sistemas</li>
<li>Qualquer outro dado pessoal que tenhamos coletado de você</li>
</ul>

<h2>Como fazer a solicitação</h2>
<p>Envie um e-mail para <strong><a href="mailto:marketing@redesmartcar.com.br">marketing@redesmartcar.com.br</a></strong> com o assunto <strong>"Exclusão de Dados"</strong> informando:</p>
<ol>
<li>Seu nome completo</li>
<li>Seu e-mail ou perfil nas redes sociais</li>
<li>Descrição do dado que deseja excluir</li>
</ol>

<h2>Prazo</h2>
<p>Processaremos sua solicitação em até <strong>15 dias úteis</strong> a partir do recebimento do e-mail.</p>

<h2>Contato</h2>
<p>Central de Atendimento: <strong>0800 942 4402</strong><br>
E-mail: <a href="mailto:marketing@redesmartcar.com.br">marketing@redesmartcar.com.br</a></p>
`;

// ── Script PHP ────────────────────────────────────────────────────────────────

const privacyB64  = Buffer.from(PRIVACY_CONTENT).toString('base64');
const deletionB64 = Buffer.from(DELETION_CONTENT).toString('base64');

const phpScript = `<?php
require_once('wp-load.php');
$results = [];

$privacy_content  = base64_decode('${privacyB64}');
$deletion_content = base64_decode('${deletionB64}');

// 1. Atualizar Política de Privacidade (page_id=3)
$r1 = wp_update_post(array(
  'ID'           => 3,
  'post_title'   => 'Política de Privacidade',
  'post_content' => $privacy_content,
  'post_status'  => 'publish',
  'post_type'    => 'page',
), true);
$results[] = is_wp_error($r1) ? 'ERRO privacy: ' . $r1->get_error_message() : 'OK privacy page_id=' . $r1;

// 2. Criar/atualizar página de Exclusão de Dados
$existing = get_page_by_path('exclusao-de-dados');
if ($existing) {
  $r2 = wp_update_post(array(
    'ID'           => $existing->ID,
    'post_title'   => 'Exclusão de Dados',
    'post_content' => $deletion_content,
    'post_status'  => 'publish',
  ), true);
  $results[] = is_wp_error($r2) ? 'ERRO deletion: ' . $r2->get_error_message() : 'OK deletion updated id=' . $r2;
} else {
  $r2 = wp_insert_post(array(
    'post_title'   => 'Exclusão de Dados',
    'post_content' => $deletion_content,
    'post_status'  => 'publish',
    'post_type'    => 'page',
    'post_name'    => 'exclusao-de-dados',
  ), true);
  $results[] = is_wp_error($r2) ? 'ERRO deletion: ' . $r2->get_error_message() : 'OK deletion created id=' . $r2;
}

echo implode("\\n", $results);
unlink(__FILE__);
`;

// ── Funções cPanel API ────────────────────────────────────────────────────────

function cpanelRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: CPANEL_HOST,
      port: CPANEL_PORT,
      path,
      method: 'GET',
      rejectUnauthorized: false,
      headers: { Authorization: CPANEL_AUTH },
    };
    https.request(options, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ raw: data }); }
      });
    }).on('error', reject).end();
  });
}

function cpanelPost(path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    const options = {
      hostname: CPANEL_HOST,
      port: CPANEL_PORT,
      path,
      method: 'POST',
      rejectUnauthorized: false,
      headers: {
        Authorization: CPANEL_AUTH,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ raw: data }); }
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : require('http');
    mod.get(url, { rejectUnauthorized: false }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  console.log('1. Fazendo upload do script PHP...');
  const uploadResp = await cpanelPost(
    '/execute/Fileman/save_file_content',
    {
      dir: WP_DIR,
      file: SCRIPT_NAME,
      content: phpScript,
    }
  );
  if (!uploadResp.status) {
    console.error('❌ Falha no upload:', JSON.stringify(uploadResp).slice(0, 200));
    process.exit(1);
  }
  console.log('   ✅ Upload OK');

  console.log('2. Executando script via HTTP...');
  const execResp = await httpGet(`${WP_URL}/${SCRIPT_NAME}`);
  console.log(`   Status HTTP: ${execResp.status}`);
  console.log(`   Resultado:\n${execResp.body}`);

  if (execResp.status !== 200) {
    console.log('3. Removendo script manualmente (execução falhou)...');
    await cpanelPost('/execute/Fileman/delete_files', {
      files: [{ dir: WP_DIR, file: SCRIPT_NAME }],
    });
  } else {
    console.log('   (script auto-deletado pelo PHP)');
  }

  console.log('\n✅ Concluído!');
  console.log('   Política de Privacidade: https://brpneusararaquara.com.br/?page_id=3');
  console.log('   Exclusão de Dados:       https://brpneusararaquara.com.br/exclusao-de-dados/');
})();
