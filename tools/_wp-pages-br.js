'use strict';
const https = require('https');
const creds = Buffer.from('NexusZ:6Hg3 fP6S fOad For2 L46D sHYN').toString('base64');

function wpReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'brpneusararaquara.com.br',
      path: '/wp-json/wp/v2' + path,
      method, rejectUnauthorized: false,
      headers: {
        'Authorization': 'Basic ' + creds,
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, raw: d.slice(0, 300) }); } });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

const PRIVACY = `
<h2>Quem somos</h2>
<p>A BR Pneus &amp; Oficina é uma rede de franquias de pneus e serviços automotivos com sede em Araraquara-SP. Site: <a href="https://brpneusararaquara.com.br">brpneusararaquara.com.br</a>.</p>

<h2>Quais dados coletamos</h2>
<p>Ao interagir com nossas páginas nas redes sociais (Facebook e Instagram), podemos coletar:</p>
<ul>
<li>Nome e identificador de perfil público</li>
<li>Comentários e mensagens enviadas para nossas páginas</li>
<li>Dados de engajamento (curtidas, compartilhamentos)</li>
</ul>

<h2>Por que coletamos esses dados</h2>
<p>Utilizamos esses dados para responder dúvidas e comentários de clientes e melhorar nosso atendimento.</p>

<h2>Armazenamento e segurança</h2>
<p>Os dados são armazenados em servidores seguros com acesso restrito à equipe de atendimento. Não compartilhamos dados pessoais com terceiros, exceto quando exigido por lei.</p>

<h2>Seus direitos (LGPD)</h2>
<p>Conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a acessar, corrigir ou solicitar a exclusão dos seus dados. Para isso, entre em contato pelo e-mail <a href="mailto:marketing@redesmartcar.com.br">marketing@redesmartcar.com.br</a>.</p>

<h2>Cookies</h2>
<p>Nosso site utiliza cookies para melhorar a experiência de navegação. Você pode desativá-los nas configurações do seu navegador.</p>

<h2>Contato</h2>
<p>E-mail: <a href="mailto:marketing@redesmartcar.com.br">marketing@redesmartcar.com.br</a> | SAC: 0800 942 4402</p>
`;

const DELETION = `
<h2>Solicitação de exclusão de dados pessoais</h2>
<p>A BR Pneus &amp; Oficina respeita sua privacidade e garante o direito à exclusão de dados conforme a <strong>Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>.</p>

<h2>Quais dados podem ser excluídos</h2>
<ul>
<li>Nome e identificador de perfil coletado via redes sociais</li>
<li>Histórico de mensagens e comentários armazenados em nossos sistemas</li>
<li>Qualquer outro dado pessoal que tenhamos coletado de você</li>
</ul>

<h2>Como solicitar</h2>
<p>Envie um e-mail para <strong><a href="mailto:marketing@redesmartcar.com.br">marketing@redesmartcar.com.br</a></strong> com o assunto <strong>"Exclusão de Dados"</strong> informando:</p>
<ol>
<li>Seu nome completo</li>
<li>Seu e-mail ou perfil nas redes sociais</li>
<li>Descrição do dado que deseja excluir</li>
</ol>

<h2>Prazo de resposta</h2>
<p>Processaremos sua solicitação em até <strong>15 dias úteis</strong>.</p>

<h2>Contato</h2>
<p>SAC: <strong>0800 942 4402</strong> | E-mail: <a href="mailto:marketing@redesmartcar.com.br">marketing@redesmartcar.com.br</a></p>
`;

(async () => {
  // 1. Atualizar Política de Privacidade (page_id=3)
  const r1 = await wpReq('POST', '/pages/3', { title: 'Política de Privacidade', content: PRIVACY, status: 'publish' });
  console.log('Política de Privacidade:', r1.status, r1.data?.link || r1.data?.code);

  // 2. Verificar se página de exclusão já existe
  const search = await wpReq('GET', '/pages?slug=exclusao-de-dados');
  const existing = search.data?.[0];

  let r2;
  if (existing) {
    r2 = await wpReq('POST', '/pages/' + existing.id, { title: 'Exclusão de Dados', content: DELETION, status: 'publish' });
  } else {
    r2 = await wpReq('POST', '/pages', { title: 'Exclusão de Dados', content: DELETION, status: 'publish', slug: 'exclusao-de-dados' });
  }
  console.log('Exclusão de Dados:', r2.status, r2.data?.link || r2.data?.code);
})();
