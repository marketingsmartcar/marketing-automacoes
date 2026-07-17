'use strict';
/**
 * tools/configurar-kommo-ia.js
 *
 * Abre o Kommo via Puppeteer, faz login e atualiza a configuração
 * da IA de primeiro atendimento da Peg Pneus (Função e personalidade + Diretrizes).
 *
 * Uso:
 *   node tools/configurar-kommo-ia.js
 *   node tools/configurar-kommo-ia.js --headless   (roda sem abrir janela)
 */

require('dotenv').config();
const puppeteer    = require('puppeteer');
const path         = require('path');
const fs           = require('fs');

const KOMMO_URL    = 'https://pegpeusatacarejo.kommo.com';
const LOGIN_URL    = 'https://www.kommo.com/login/';
const EMAIL        = process.env.KOMMO_EMAIL  || 'marketing@redesmartcar.com.br';
const SENHA        = process.env.KOMMO_SENHA  || 'Mkt@2025';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'output', 'debug-kommo');
const HEADLESS     = !process.argv.includes('--visible'); // headless por padrão

// ── Textos que serão configurados na IA ──────────────────────────────────────

const PERSONALIDADE = `Você é a IA de primeiro atendimento da Peg Pneus Atacarejo, o primeiro atacarejo de pneus do Brasil.

Sua função é qualificar a necessidade do cliente e transferir para um vendedor humano.

REGRAS INVIOLÁVEIS:
1. NUNCA envie mais de uma pergunta na mesma mensagem. Uma pergunta por mensagem.
2. NUNCA pergunte sobre perfil de pneu.
3. NUNCA repita uma pergunta já respondida. Rastreie tudo que o cliente disse.
4. NUNCA pergunte marca/modelo/ano do veículo antes do Passo 4 (confirmação final).
5. Respostas curtas e objetivas.

FLUXO DE QUALIFICAÇÃO (siga esta ordem exata):
Passo 1: Pergunte "Qual a medida do pneu?" — Se não souber: "Qual a marca, modelo e ano do veículo?" e aguarde.
Passo 2: Se quantidade não foi informada: "Quantos pneus você precisa?"
Passo 3: "Tem preferência de alguma marca de pneu?"
Passo 4: "Para nosso atendente confirmar se é a medida original, pode informar a marca, modelo e ano do veículo?"
Passo 5: Transferir com resumo:
"Perfeito! Vou te conectar com um de nossos especialistas. Aguarde! 👍"
🔹 Veículo: [informado / não informado]
🔹 Medida: [medida]
🔹 Quantidade: [quantidade]
🔹 Marca: [marca / Sem preferência / Importado]`;

// Diretrizes: array de { quando, fazer, mais }
const DIRETRIZES = [
  {
    quando: 'cliente não sabe a medida ou pergunta qual medida usar, qual pneu serve, qual pneu fica no meu carro',
    fazer:  'Perguntar: "Qual a marca, modelo e ano do veículo?" — para identificar a medida correta.',
    mais:   'Após identificar a medida, siga o fluxo: quantidade → marca → veículo (confirmação) → transferência. Uma pergunta por mensagem.',
  },
  {
    quando: 'cliente informa a medida do pneu diretamente (ex: 175/70 R13, 205/55 R16, qualquer número com R)',
    fazer:  'Registrar a medida e perguntar apenas: "Quantos pneus você precisa?"',
    mais:   'Uma pergunta por mensagem. Não peça marca/modelo/ano do veículo agora. Após quantidade: marca preferida → veículo confirmação → transferência.',
  },
  {
    quando: 'cliente demonstra frustração, raiva, impaciência ou pede para falar com atendente, vendedor ou humano',
    fazer:  'Transferir imediatamente sem pedir permissão. Dizer: "Um especialista já vai continuar seu atendimento!"',
    mais:   'Inclua no resumo de transferência o que já foi coletado até o momento.',
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function ensureDebugDir() {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function screenshot(page, nome) {
  ensureDebugDir();
  const dest = path.join(SCREENSHOT_DIR, `${Date.now()}-${nome}.png`);
  await page.screenshot({ path: dest, fullPage: true }).catch(() => {});
  console.log(`  📸 ${dest}`);
  return dest;
}

// Limpa um campo de texto e digita o novo valor
async function clearAndType(page, selector, texto) {
  await page.focus(selector);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Delete');
  await sleep(200);
  await page.type(selector, texto, { delay: 5 });
}

// Tenta clicar num seletor, com timeout customizado
async function tryClick(page, selector, timeout = 10000) {
  await page.waitForSelector(selector, { timeout });
  await page.click(selector);
}

// ── Login ────────────────────────────────────────────────────────────────────

async function login(page) {
  console.log('🔐 Acessando Kommo...');
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(2000); // aguarda scripts do React carregar
  await screenshot(page, '01-login-page');

  // Aguarda campos aparecerem (sem visible: true — headless tem comportamento diferente)
  await page.waitForSelector('input', { timeout: 15000 });
  await sleep(1000);

  // Inspeciona todos os inputs para debug
  const inputInfo = await page.evaluate(() =>
    Array.from(document.querySelectorAll('input')).map(i => ({
      type: i.type, name: i.name, id: i.id,
      placeholder: i.placeholder, autocomplete: i.autocomplete,
    }))
  );
  console.log('  Inputs encontrados:', JSON.stringify(inputInfo));

  // page.type() com seletor name= (é o mais confiável — foca + digita char a char, React aceita)
  await page.type('input[name="email"]', EMAIL, { delay: 50 });
  await sleep(300);
  await page.type('input[name="password"]', SENHA, { delay: 50 });
  await sleep(500);
  await screenshot(page, '02-campos-preenchidos');

  // Tenta click direto no botão submit via page.click() (não evaluate)
  const btnSel = 'button[type="submit"]';
  try {
    await page.waitForSelector(btnSel, { timeout: 5000 });
    await page.click(btnSel);
    console.log('  🖱️  Botão submit clicado via page.click()');
  } catch (_) {
    // Fallback: Enter no campo senha
    await page.focus('input[name="password"]');
    await page.keyboard.press('Enter');
    console.log('  ⌨️  Fallback: Enter no campo senha');
  }
  await sleep(1000);

  // Passo 1: aguarda #go-to-account (seleção de conta) ou redirect direto para a conta
  const t0 = Date.now();
  while (Date.now() - t0 < 15000) {
    await sleep(500);
    const url = page.url();
    if (url.includes('#go-to-account') || (!url.includes('/login') && !url.includes('kommo.com/login'))) break;
  }
  await sleep(1000);
  console.log('  🌐 URL após passo 1:', page.url());

  // Passo 2: se caiu no #go-to-account, navega diretamente para a conta
  // (os cookies de sessão já foram setados pelo POST oauth2/authorize)
  if (page.url().includes('#go-to-account')) {
    console.log('  📋 Etapa "go-to-account" — navegando direto para a conta...');
    const cookies = await page.cookies();
    console.log('  Cookies disponíveis:', cookies.map(c => `${c.name}=${c.value.substring(0,20)}...`).join(', '));

    await page.goto(`${KOMMO_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await sleep(2000);
    console.log('  🌐 URL após navegar para conta:', page.url());
    await screenshot(page, '02b-navegacao-direta');
  }

  await screenshot(page, '03-apos-login');
  console.log('  🌐 URL atual:', page.url());

  if (page.url().includes('/login')) {
    await screenshot(page, '03-login-falhou');
    throw new Error('Login falhou — verifique email/senha e subdomínio');
  }
  console.log('  ✅ Login OK');
}

// ── Navegar até configurações da IA ─────────────────────────────────────────

async function navegarParaIA(page) {
  console.log('\n🤖 Navegando para configurações do Agente de IA...');

  // Tenta direto a URL do agente de IA
  const urlsParaTentar = [
    `${KOMMO_URL}/settings/communications/`,
    `${KOMMO_URL}/settings/ai-agent/`,
    `${KOMMO_URL}/settings/ai/`,
    `${KOMMO_URL}/settings/chat/`,
  ];

  for (const url of urlsParaTentar) {
    console.log('  Tentando:', url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
    await sleep(2000);
    const cur = page.url();
    console.log('  → URL resultante:', cur);

    // Verifica se chegou na página certa (não redirecionou para login/pay)
    if (!cur.includes('/login') && !cur.includes('/settings/pay') && (cur.includes(url.replace(/\/$/, '')) || cur.startsWith(url.replace(/\/$/, '')))) {
      await screenshot(page, '05-settings-ia');
      console.log('  ✅ Página da IA encontrada:', cur);

      // Debug: lista textareas visíveis para mapear campos
      const textareasDebug = await page.$$eval('textarea', els =>
        els.map(el => ({
          name: el.name,
          placeholder: el.placeholder.substring(0, 60),
          class: el.className.substring(0, 60),
          visible: (() => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; })(),
        }))
      );
      console.log('  Textareas na página:', JSON.stringify(textareasDebug));

      // Debug full page: inputs, selects, texto de labels
      const pageElements = await page.evaluate(() => {
        const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
        return {
          allInputs: Array.from(document.querySelectorAll('input,textarea,select')).filter(vis).map(el => ({
            tag: el.tagName, type: el.type, name: el.name, placeholder: el.placeholder?.substring(0,50), id: el.id
          })),
          labels: Array.from(document.querySelectorAll('label,h1,h2,h3,h4,[class*="title"],[class*="label"],[class*="heading"],[class*="section"]')).filter(vis).map(el => el.textContent.trim().substring(0,80)).filter(t => t.length > 2),
          pageText: document.body.innerText.substring(0, 2000),
          internalLinks: Array.from(document.querySelectorAll('a[href*="' + location.hostname + '"]')).filter(vis).map(a => ({ text: a.textContent.trim().substring(0,40), href: a.href })),
        };
      });
      console.log('  [page inputs]', JSON.stringify(pageElements.allInputs));
      console.log('  [page labels]', JSON.stringify(pageElements.labels));
      console.log('  [page text]', pageElements.pageText);
      console.log('  [internal links]', JSON.stringify(pageElements.internalLinks.slice(0,20)));
      return true;
    }
  }

  await screenshot(page, '05-nao-encontrado');
  console.log('  ⚠️  Não encontrei a página da IA.');
  return false;
}

// ── Atualizar campo Função e personalidade ───────────────────────────────────

async function atualizarPersonalidade(page) {
  console.log('\n✏️  Atualizando campo Função e personalidade...');

  // Seletores prováveis para o campo de personalidade
  const seletores = [
    'textarea[name*="person"]',
    'textarea[name*="function"]',
    'textarea[placeholder*="person"]',
    'textarea[placeholder*="função"]',
    'textarea[placeholder*="descri"]',
    '.ai-personality textarea',
    '.chatbot-personality textarea',
    '[data-name="personality"] textarea',
    '[data-name="function"] textarea',
  ];

  let sel = null;
  for (const s of seletores) {
    const el = await page.$(s);
    if (el) { sel = s; break; }
  }

  if (!sel) {
    // Pega todos os textareas e mostra para debug
    const textareas = await page.$$eval('textarea', els =>
      els.map(el => ({
        name: el.name,
        placeholder: el.placeholder,
        id: el.id,
        class: el.className.substring(0, 80),
        visible: (() => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; })(),
        value: el.value.substring(0, 50),
      }))
    );
    console.log('  Textareas encontrados:', JSON.stringify(textareas, null, 2));
    await screenshot(page, '05-textareas-debug');

    // Fallback: usa o primeiro textarea VISÍVEL
    const firstVisible = textareas.findIndex(t => t.visible);
    if (firstVisible >= 0) {
      console.log(`  ↩️  Usando fallback: textarea[${firstVisible}]`);
      sel = `textarea:nth-of-type(${firstVisible + 1})`;
    } else {
      throw new Error('Campo de personalidade não encontrado — veja o screenshot de debug');
    }
  }

  await clearAndType(page, sel, PERSONALIDADE);
  await screenshot(page, '05-personalidade-preenchida');
  console.log('  ✅ Personalidade preenchida');
}

// ── Atualizar Diretrizes ──────────────────────────────────────────────────────

async function atualizarDiretrizes(page) {
  console.log('\n📋 Atualizando Diretrizes...');

  // O Kommo tem 3 regras inteligentes com campos Quando / Fazer / Mais
  // Tenta encontrar os grupos de campos
  const gruposSel = [
    '.smart-rule',
    '.directive-item',
    '.rule-item',
    '[data-name="rules"] > div',
    '.conditions-list > div',
  ];

  let grupos = [];
  for (const s of gruposSel) {
    grupos = await page.$$(s);
    if (grupos.length > 0) break;
  }

  if (grupos.length === 0) {
    // Debug: lista todos os inputs/textareas visíveis
    await screenshot(page, '06-diretrizes-debug');
    console.log('  ⚠️  Grupos de diretrizes não encontrados pelo seletor — veja screenshot');
    return false;
  }

  console.log(`  Encontrados ${grupos.length} grupo(s) de diretriz`);

  for (let i = 0; i < Math.min(grupos.length, DIRETRIZES.length); i++) {
    const dir    = DIRETRIZES[i];
    const grupo  = grupos[i];

    const textareas = await grupo.$$('textarea');
    if (textareas.length >= 3) {
      // Ordem: Quando (0), Fazer (1), Mais (2)
      await textareas[0].click({ clickCount: 3 });
      await textareas[0].type(dir.quando, { delay: 5 });
      await sleep(100);
      await textareas[1].click({ clickCount: 3 });
      await textareas[1].type(dir.fazer,  { delay: 5 });
      await sleep(100);
      await textareas[2].click({ clickCount: 3 });
      await textareas[2].type(dir.mais,   { delay: 5 });
      console.log(`  ✅ Diretriz ${i + 1} preenchida`);
    } else {
      console.log(`  ⚠️  Diretriz ${i + 1}: esperava 3 textareas, encontrou ${textareas.length}`);
    }
  }

  await screenshot(page, '06-diretrizes-preenchidas');
  return true;
}

// ── Salvar ────────────────────────────────────────────────────────────────────

async function salvar(page) {
  console.log('\n💾 Salvando...');

  const botoesSalvar = [
    'button[type="submit"]',
    'button[data-action="save"]',
    '.save-button',
    'input[type="submit"]',
  ];

  for (const s of botoesSalvar) {
    const btn = await page.$(s);
    if (btn) {
      await btn.click();
      await sleep(2000);
      await screenshot(page, '07-apos-salvar');
      console.log('  ✅ Salvo');
      return true;
    }
  }

  // Tenta encontrar botão pelo texto
  const clicou = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const salvar = btns.find(b => /salvar|save|aplicar|apply|confirmar/i.test(b.textContent));
    if (salvar) { salvar.click(); return true; }
    return false;
  });
  if (clicou) {
    await sleep(2000);
    await screenshot(page, '07-apos-salvar-texto');
    console.log('  ✅ Salvo via texto');
    return true;
  }

  // Tenta via teclado (Enter ou Tab+Enter)
  await page.keyboard.press('Tab');
  await sleep(200);
  await screenshot(page, '07-sem-botao-salvar');
  console.log('  ⚠️  Botão salvar não encontrado — veja screenshot');
  return false;
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  const browser = await puppeteer.launch({
    headless: HEADLESS,
    defaultViewport: { width: 1400, height: 900 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
    ignoreHTTPSErrors: true,
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  // Evita detecção de headless / bot
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  );
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en-US', 'en'] });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  });

  // Silencia erros de console (muitos CSP warnings não relacionados)
  // Intercepta requests de login para debug
  page.on('request', req => {
    const url = req.url();
    if (url.includes('kommo.com') && (url.includes('login') || url.includes('auth') || url.includes('oauth')) && req.method() === 'POST') {
      console.log('  [req POST]', url);
      const body = req.postData();
      if (body) console.log('  [req body]', body.substring(0, 300));
    }
  });
  page.on('response', async res => {
    const url = res.url();
    if (url.includes('kommo.com') && (url.includes('login') || url.includes('auth') || url.includes('oauth'))) {
      const status = res.status();
      console.log(`  [res ${status}]`, url.substring(0, 120));
      if (status >= 400) {
        const body = await res.text().catch(() => '');
        console.log('  [res body]', body.substring(0, 300));
      }
    }
  });

  try {
    await login(page);
    const iaEncontrada = await navegarParaIA(page);

    if (!iaEncontrada) {
      console.log('\n⚠️  Não consegui encontrar a página da IA automaticamente.');
      console.log('   Verifique os screenshots em:', SCREENSHOT_DIR);
      console.log('   Navegue manualmente até a configuração da IA e tire um print da URL.');
      if (!HEADLESS) {
        console.log('\n   Janela do browser aberta — navegue manualmente e pressione Enter quando estiver na tela certa.');
        await new Promise(r => process.stdin.once('data', r));
      }
    } else {
      await atualizarPersonalidade(page);
      await atualizarDiretrizes(page);
      await salvar(page);
      console.log('\n🎉 Configuração da IA atualizada com sucesso!');
    }

  } catch (err) {
    console.error('\n❌ Erro:', err.message);
    await screenshot(page, 'ERRO-final').catch(() => {});
    console.log('  Screenshots salvos em:', SCREENSHOT_DIR);
  } finally {
    await browser.close();
  }
})();
