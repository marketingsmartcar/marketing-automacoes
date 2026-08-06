'use strict';
/**
 * tools/sync-cadastro-funcionarios-oi.js
 *
 * Coleta dados cadastrais dos funcionários no OI (todas as abas) e atualiza
 * os colaboradores correspondentes no NexusZ (rh_colaboradores).
 *
 * Uso:
 *   node tools/sync-cadastro-funcionarios-oi.js              # todas as lojas
 *   node tools/sync-cadastro-funcionarios-oi.js --dry-run    # coleta sem salvar
 *   node tools/sync-cadastro-funcionarios-oi.js --loja=BR01  # filtra por loja
 */

require('dotenv').config();

const puppeteer     = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const fs   = require('fs');
const path = require('path');

const BASE_URL  = 'https://sistemaoficinainteligente.com.br';
const LOGIN_URL = `${BASE_URL}/Entrar.aspx?sair=1`;
const FUNC_URL  = `${BASE_URL}/wfFuncionarioBusca.aspx`;
const DEBUG_DIR = path.join(__dirname, '..', 'output', 'debug-sync-funcionarios');
const SLEEP     = ms => new Promise(r => setTimeout(r, ms));

const SUPABASE_URL = process.env.NEXUSZ_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXUSZ_SUPABASE_ANON_KEY;

const args        = process.argv.slice(2);
const DRY_RUN     = args.includes('--dry-run');
const LOJA_FILTRO = (args.find(a => a.startsWith('--loja=')) || '').replace('--loja=', '').toUpperCase();

// ── Helpers ────────────────────────────────────────────────────────────────────

function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }

async function screenshot(page, nome) {
  ensureDir(DEBUG_DIR);
  await page.screenshot({ path: path.join(DEBUG_DIR, `${Date.now()}-${nome}.png`), fullPage: true }).catch(() => {});
}

function empresaParaLoja(empresa) {
  const e = empresa.toUpperCase();
  if (e.includes('BR01') || (e.includes('CENTRO') && !e.includes('PEG'))) return 'BR01';
  if (e.includes('BR03') || e.includes('AMERICANA'))                       return 'BR03';
  if (e.includes('BR04') || (e.includes('S') && e.includes('CARLOS')))    return 'BR04';
  if (e.includes('PEG') || e.includes('ATACAREJO'))                        return 'PEG1';
  return null;
}

// Nomes a ignorar no sync (donos da empresa)
const SKIP_NAMES = new Set(['CIBELE REGINA OLIVEIRA', 'FABIO ZACHI', 'CIBELE ZACHI']);

function normNome(n) {
  return (n || '').trim().toUpperCase()
    .replace(/\s*\(.*?\)\s*/g, '') // remove (conteúdo)
    .replace(/\s*\(.*$/g, '')       // remove ( sem fechamento
    .replace(/\s+/g, ' ').trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function parseDateBR(str) {
  if (!str) return null;
  const m = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  if (m[2] === '00' || m[3] === '0000') return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function parseNum(str) {
  if (!str) return null;
  const n = parseFloat(str.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim());
  return isNaN(n) || n === 0 ? null : n;
}

// ── Login ──────────────────────────────────────────────────────────────────────

async function login(page) {
  console.log('🔐 Login no OI...');
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('#Login1_UserName', { timeout: 30000 });
  await page.click('#Login1_UserName', { clickCount: 3 });
  await page.type('#Login1_UserName', process.env.OI_EMAIL, { delay: 30 });
  await page.click('#Login1_Password', { clickCount: 3 });
  await page.type('#Login1_Password', process.env.OI_SENHA, { delay: 30 });
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
    page.click('#Login1_btnEntrar'),
  ]);
  if (page.url().toLowerCase().includes('entrar')) throw new Error('Login falhou');
  console.log('  ✅ Logado');
}

// ── Coleta lista global ────────────────────────────────────────────────────────

async function coletarLista(page) {
  await page.goto(FUNC_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await SLEEP(800);

  await page.evaluate(() => {
    const btn = document.querySelector('#ctl00_cph_btnBuscar');
    if (btn) btn.click();
  });
  await Promise.race([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }),
    SLEEP(8000),
  ]).catch(() => {});
  await SLEEP(1000);
  await screenshot(page, 'lista-funcionarios');

  return page.evaluate(() => {
    const result = [];
    document.querySelectorAll('table tr').forEach(tr => {
      const tds = Array.from(tr.querySelectorAll('td'));
      if (tds.length < 3) return;
      const linkEl = tr.querySelector('a[href*="lkbAbrir"]');
      if (!linkEl) return;
      const href = linkEl.getAttribute('href') || '';
      const m = href.match(/'([^']+lkbAbrir)'/);
      const controlId = m ? m[1] : null;
      if (!controlId) return;
      const empresa = tds[0]?.textContent?.trim() || '';
      const nome    = tds[1]?.textContent?.trim() || '';
      if (!nome || nome.length < 3) return;
      result.push({ nome, empresa, controlId });
    });
    return result;
  });
}

// ── Filtra entradas inválidas ──────────────────────────────────────────────────

const SKIP_WORDS = ['excluido', 'excluída', 'excluida', 'material interno',
                    'material externo', 'material inter', 'desistência', 'desistencia'];

function filtrar(lista) {
  return lista.filter(f => {
    const nome = f.nome.toLowerCase().trim();
    if (/^\d/.test(f.nome.trim()))              return false; // começa com número
    if (f.nome.includes('/'))                    return false; // tem barra
    if (SKIP_WORDS.some(w => nome.startsWith(w))) return false; // palavras proibidas
    const loja = empresaParaLoja(f.empresa);
    if (!loja)                                   return false; // loja não ativa
    if (LOJA_FILTRO && loja !== LOJA_FILTRO)     return false;
    f.lojaKey = loja;
    return true;
  });
}

// ── Busca NexusZ ───────────────────────────────────────────────────────────────

async function buscarNexusz() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/rh_colaboradores?select=id,nome,cpf,unidade_id,status&limit=500`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return res.json();
}

function matchNexusz(colaboradores, nomeOI) {
  const nOI = normNome(nomeOI);
  // Exato
  let m = colaboradores.find(c => normNome(c.nome) === nOI);
  if (m) return m;
  // Tokens: todos os tokens do nome OI (>2 chars) presentes no nome NexusZ
  const toks = nOI.split(' ').filter(t => t.length > 2);
  if (toks.length >= 2) {
    m = colaboradores.find(c => {
      const nN = normNome(c.nome);
      return toks.every(t => nN.includes(t));
    });
  }
  return m || null;
}

// ── Abre perfil via PostBack ───────────────────────────────────────────────────
// Força form.target='_self' antes do PostBack para evitar abertura em nova aba.
// Fallback: captura nova aba via browser.on('targetcreated').
// Retorna a página do perfil (pode ser `page` ou uma nova Page), ou null se falhar.

async function abrirPerfil(page, browser, controlId) {
  // Vai para a lista com fresh GET
  await page.goto(FUNC_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await SLEEP(1200);

  // Aciona Buscar (POST da form de busca)
  const buscarNav = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null);
  await page.evaluate(() => {
    const btn = document.querySelector('#ctl00_cph_btnBuscar');
    if (btn) btn.click();
  });
  await Promise.race([buscarNav, SLEEP(10000)]);
  await SLEEP(800);

  // Debug
  const debugLinks = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href*="lkbAbrir"]')).map(a => a.getAttribute('href') || '')
  ).catch(() => []);
  console.log(`    [debug] ${debugLinks.length} links após Buscar | controlId: ${controlId}`);

  if (!debugLinks.length) return null;

  // Encontra o link do funcionário pelo controlId
  const links = await page.$$('a[href*="lkbAbrir"]').catch(() => []);
  let targetHandle = null;
  for (const h of links) {
    const href = await h.evaluate(el => el.getAttribute('href') || '').catch(() => '');
    if (href.includes(controlId)) { targetHandle = h; break; }
  }
  if (!targetHandle) {
    // Fallback por índice posicional (ctl02 = 0, ctl04 = 2 …)
    const m = controlId.match(/ctl(\d+)\$lkbAbrir/);
    if (m) {
      const idx = parseInt(m[1]) - 2;
      if (idx >= 0 && idx < links.length) targetHandle = links[idx];
    }
  }
  if (!targetHandle) { console.log(`    [debug] link não encontrado`); return null; }

  // ── CRÍTICO: remove target="_blank" da form antes do PostBack ──────────────
  // O OI abre o perfil em nova aba. Forçamos _self para navegar na mesma página.
  await page.evaluate(() => {
    document.querySelectorAll('form').forEach(f => f.setAttribute('target', '_self'));
  });

  // Listener de nova aba ANTES do clique (fallback caso _blank persista via JS)
  let novaPageResolver = () => {};
  const novaPagePromise = new Promise(resolve => { novaPageResolver = resolve; });
  const targetCreatedHandler = async target => {
    if (target.type() === 'page') {
      try { novaPageResolver(await target.page()); } catch {}
    }
  };
  browser.once('targetcreated', targetCreatedHandler);

  // waitForNavigation configurado ANTES do clique (evita race condition)
  const navPromise = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => null);

  await targetHandle.click().catch(() => {});

  const resultado = await Promise.race([
    navPromise.then(r => ({ tipo: 'mesmaAba', nav: r })),
    novaPagePromise.then(p => ({ tipo: 'novaAba', pagina: p })),
    SLEEP(12000).then(() => ({ tipo: 'timeout' })),
  ]);

  browser.off('targetcreated', targetCreatedHandler);

  let profilePage = page;

  if (resultado.tipo === 'novaAba' && resultado.pagina) {
    profilePage = resultado.pagina;
    console.log(`    [debug] perfil abriu em nova aba`);
    await SLEEP(1500);
  } else {
    await SLEEP(800);
    if (resultado.tipo === 'timeout') console.log(`    [debug] timeout aguardando navegação`);
  }

  // Screenshot pós-clique para diagnóstico
  await screenshot(profilePage, `pos-click-${controlId.replace(/\$/g,'_').replace(/ctl00_cph_grd_/,'')}`);

  // Verifica se é o perfil do funcionário (não a tela de busca)
  const urlAtual = profilePage.url();
  const ehPerfil = await profilePage.evaluate(() => {
    const url = location.href;
    // URL mudou para wfPessoa.aspx ou wfFuncionario.aspx
    if (url.includes('wfPessoa') || url.includes('wfFuncionario')) return true;
    // Tem campo de nome do funcionário (input específico do perfil)
    if (document.querySelector('#ctl00_cph_txtNome')) return true;
    // Tem abas de perfil E não é a tela de busca
    const temAbaPessoa = Array.from(document.querySelectorAll('a'))
      .some(a => a.textContent.trim() === 'Pessoa');
    const ehBusca = document.title.toLowerCase().includes('busca') ||
                    !!document.querySelector('#ctl00_cph_btnBuscar');
    return temAbaPessoa && !ehBusca;
  }).catch(() => false);

  console.log(`    [debug] url=${urlAtual.split('/').pop().slice(0,40)} | ehPerfil=${ehPerfil}`);

  if (!ehPerfil) {
    if (profilePage !== page) await profilePage.close().catch(() => {});
    return null;
  }
  return profilePage;
}

// ── Lê aba ────────────────────────────────────────────────────────────────────

async function lerAba(page, textoAba) {
  const clicou = await page.evaluate(texto => {
    const el = Array.from(document.querySelectorAll('a'))
      .find(a => a.textContent.trim() === texto);
    if (el) { el.click(); return true; }
    return false;
  }, textoAba).catch(() => false);

  if (clicou) {
    await Promise.race([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 8000 }),
      SLEEP(3000),
    ]).catch(() => {});
    await SLEEP(400);
  }
  return clicou;
}

// ── Extrai campos do formulário ────────────────────────────────────────────────

async function extrairCampos(page) {
  return page.evaluate(() => {
    const d = {};
    function lbl(el) {
      const l = document.querySelector(`label[for="${el.id}"]`);
      if (l) return l.textContent.trim().replace(/:$/, '').trim();
      const td = el.closest('td');
      if (td) {
        const prev = td.previousElementSibling;
        if (prev) return prev.textContent.trim().replace(/:$/, '').trim();
        const tr = td.closest('tr');
        const idx = Array.from(tr.cells).indexOf(td);
        const pTr = tr.previousElementSibling;
        if (pTr?.cells[idx]) return pTr.cells[idx].textContent.trim().replace(/:$/, '').trim();
      }
      return el.placeholder || el.name || el.id;
    }

    document.querySelectorAll(
      'input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=image]), textarea'
    ).forEach(el => {
      const k = lbl(el); if (!k || k.length > 80) return;
      if (el.value !== undefined) d[k] = el.value.trim();
    });

    document.querySelectorAll('input[type=radio]:checked, input[type=checkbox]:checked').forEach(el => {
      const k = lbl(el); if (!k || k.length > 80) return;
      d[k] = el.value || 'true';
    });

    document.querySelectorAll('select').forEach(el => {
      const k = lbl(el); if (!k || k.length > 80) return;
      d[k] = el.options[el.selectedIndex]?.text?.trim() || '';
    });

    return d;
  }).catch(() => ({}));
}

// ── Lê todas as abas ──────────────────────────────────────────────────────────

// Lê endereço da tabela-grade na aba Endereço (o OI mostra endereços em tabela, não em inputs)
async function lerEnderecoTabela(profilePage) {
  return profilePage.evaluate(() => {
    const resultado = {};
    const trs = Array.from(document.querySelectorAll('table tr'));
    for (const tr of trs) {
      const tds = Array.from(tr.querySelectorAll('td'));
      // Linha de endereço: pelo menos 7 colunas onde a 1ª parece ser CEP (8 dígitos)
      if (tds.length >= 7) {
        const cepRaw = (tds[0]?.textContent || '').trim().replace(/\D/g, '');
        if (cepRaw.length === 8) {
          resultado.cep         = cepRaw;
          resultado.endereco    = (tds[1]?.textContent || '').trim() || null;
          resultado.numero      = (tds[2]?.textContent || '').trim() || null;
          resultado.complemento = (tds[3]?.textContent || '').trim() || null;
          resultado.bairro      = (tds[4]?.textContent || '').trim() || null;
          resultado.cidade      = (tds[5]?.textContent || '').trim() || null;
          resultado.estado      = (tds[6]?.textContent || '').trim() || null;
          break;
        }
      }
    }
    return resultado;
  }).catch(() => ({}));
}

async function lerTudo(profilePage) {
  const camposPorAba = {};

  // Abas com inputs de formulário
  const abas = ['Pessoa', 'Endereço', 'Contato', 'Documentos', 'Dados Bancários', 'Funcionário'];
  for (const aba of abas) {
    await lerAba(profilePage, aba);
    const c = await extrairCampos(profilePage);

    // Endereço: complementa com dados da tabela-grade (o OI não usa inputs para o endereço salvo)
    if (aba === 'Endereço') {
      const tabela = await lerEnderecoTabela(profilePage);
      Object.assign(c, tabela); // tabela vence inputs vazios
    }

    for (const [k, v] of Object.entries(c)) {
      if (v && String(v).trim() && !camposPorAba[k]) camposPorAba[k] = v;
      else if (!camposPorAba[k]) camposPorAba[k] = v;
    }
    const novosPreench = Object.entries(c).filter(([,v]) => v && String(v).trim()).length;
    if (novosPreench > 0) process.stdout.write(` [${aba}:${novosPreench}✓]`);
  }
  process.stdout.write('\n');

  // Diagnóstico: se nenhum campo preenchido, mostra amostra dos campos brutos
  const preenchidos = Object.entries(camposPorAba).filter(([,v]) => v && String(v).trim());
  if (!preenchidos.length) {
    console.log(`    [debug] ⚠️ 0 campos preenchidos — amostra de campos brutos:`);
    Object.entries(camposPorAba).slice(0, 8).forEach(([k,v]) => console.log(`      "${k}": "${v}"`));
  }

  return camposPorAba;
}

// ── Mapeia OI → NexusZ ────────────────────────────────────────────────────────

function mapear(campos) {
  function get(...keys) {
    for (const k of keys) {
      const found = Object.entries(campos).find(([key]) =>
        key.toLowerCase().includes(k.toLowerCase())
      );
      const v = found?.[1];
      if (v && String(v).trim() && v !== '0,00' && v !== '00/00/0000' && v !== 'Selecione...') return String(v).trim();
    }
    return null;
  }

  // CPF / CNPJ — tenta pelo label e também pelo valor direto passado da tabela de endereço
  const cpfRaw    = get('CPF/CNPJ', 'CPF');
  const cpfDigits = (cpfRaw || '').replace(/\D/g, '');
  const cpf       = cpfDigits.length === 11 ? cpfRaw : null;
  const cnpj      = cpfDigits.length === 14 ? cpfRaw : null;

  // Sexo → valores exatos do Select NexusZ: "Masculino" | "Feminino"
  const sexoRaw = get('Sexo');
  let sexo = null;
  if (/^m/i.test(sexoRaw || '') || /masculino/i.test(sexoRaw || '')) sexo = 'Masculino';
  else if (/^f/i.test(sexoRaw || '') || /feminino/i.test(sexoRaw || '')) sexo = 'Feminino';

  // Estado Civil → valores exatos do Select NexusZ
  const ec = get('Estado Civil') || '';
  let estado_civil = null;
  if      (/casado/i.test(ec))            estado_civil = 'Casado(a)';
  else if (/solteir/i.test(ec))           estado_civil = 'Solteiro(a)';
  else if (/divorci/i.test(ec))           estado_civil = 'Divorciado(a)';
  else if (/vi[uú]v/i.test(ec))           estado_civil = 'Viúvo(a)';
  else if (/uni[aã]o/i.test(ec))          estado_civil = 'União estável';

  // Grau de Instrução → valores exatos do Select NexusZ
  const gr = get('Grau de Instrução', 'Grau de Instrucao', 'Instrução') || '';
  let grau_instrucao = null;
  if      (/fundamental.*incompl/i.test(gr))                        grau_instrucao = 'Fundamental Incompleto';
  else if (/fundamental.*compl/i.test(gr))                          grau_instrucao = 'Fundamental Completo';
  else if (/(medio|médio).*incompl/i.test(gr))                      grau_instrucao = 'Médio Incompleto';
  else if (/(medio|médio).*compl/i.test(gr))                        grau_instrucao = 'Médio Completo';
  else if (/superior.*incompl/i.test(gr))                           grau_instrucao = 'Superior Incompleto';
  else if (/superior.*compl/i.test(gr) || /faculdade/i.test(gr))    grau_instrucao = 'Superior Completo';
  else if (/p.?s.*grad/i.test(gr))                                  grau_instrucao = 'Pós-Graduação';
  else if (/mestrado/i.test(gr))                                     grau_instrucao = 'Mestrado';
  else if (/doutorado/i.test(gr))                                    grau_instrucao = 'Doutorado';

  // Telefone fixo: remove nome/texto que vem junto (ex: "16 99702-1116 Felipe" → "16 99702-1116")
  const telFixoRaw = get('Telefone 1');
  const telefone_fixo = telFixoRaw
    ? telFixoRaw.replace(/^(\(?\d{2}\)?\s*[\d\s\-]{8,})\s.*$/, '$1').trim() || null
    : null;

  return {
    cpf,
    cnpj,
    rg:                  get('RG/I.E', 'RG'),
    data_nascimento:     parseDateBR(get('Dt. Nascimento', 'Nascimento', 'Data de Nascimento')),
    sexo,
    apelido:             get('Apelido'),
    email:               get('E-mail', 'Email'),
    telefone_celular:    get('Celular(SMS)', 'Celular'),
    telefone_fixo,
    telefone_celular_2:  get('Telefone 2', 'Telefone 3', 'Telefone 4'),
    // Endereço — vem dos campos diretos passados pelo lerEnderecoTabela() via Object.assign
    endereco:            campos.endereco   || get('Logradouro'),
    numero:              campos.numero     || get('Número', 'Num.'),
    complemento:         campos.complemento|| get('Complemento'),
    bairro:              campos.bairro     || get('Bairro'),
    cidade:              campos.cidade     || get('Cidade'),
    estado:              campos.estado     || get('Estado'),
    cep:                 campos.cep        || get('CEP'),
    pais:                get('País', 'Pais'),
    observacoes:         get('Observação', 'Observacao'),
    // Dados bancários
    banco:               get('Banco'),
    agencia:             get('Agência', 'Agencia'),
    conta:               get('N.º Conta', 'Conta Corrente', 'Conta'),
    pix:                 get('PIX', 'Chave PIX'),
    // Funcionário
    cargo:               get('Cargo'),
    data_admissao:       parseDateBR(get('Data de Admissão', 'Admissão', 'Dt. Admissão')),
    data_demissao:       parseDateBR(get('Data de Demissão', 'Demissão')),
    data_registro:       parseDateBR(get('Data de Registro', 'Registro')),
    salario:             parseNum(get('Salário')),
    matricula:           get('Matrícula', 'Matricula', 'Código'),
    pis:                 get('PIS', 'PIS/PASEP'),
    ctps_numero:         get('Nº CTPS', 'CTPS'),
    ctps_serie:          get('Série CTPS', 'Serie CTPS'),
    titulo_eleitor:      get('Título Eleitor', 'Título de Eleitor', 'Titulo Eleitor'),
    titulo_eleitor_zona: get('Zona'),
    titulo_eleitor_secao:get('Seção', 'Secao'),
    certificado_reservista: get('Reservista', 'Certificado de Reservista'),
    estado_civil,
    grau_instrucao,
    horario_entrada:     get('Entrada'),
    horario_saida:       get('Saída', 'Saida', 'Termino Intervalo', 'Término Intervalo'),
    horario_intervalo:   get('Início Intervalo', 'Inicio Intervalo', 'Intervalo Refeição'),
  };
}

// ── Atualiza NexusZ ────────────────────────────────────────────────────────────

async function atualizar(id, dados) {
  const payload = {};
  for (const [k, v] of Object.entries(dados)) {
    if (v !== null && v !== undefined && v !== '') payload[k] = v;
  }
  if (!Object.keys(payload).length) return { skipped: true };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rh_colaboradores?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json', 'Prefer': 'return=minimal',
    },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, status: res.status, n: Object.keys(payload).length };
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.OI_EMAIL || !process.env.OI_SENHA) throw new Error('OI_EMAIL/OI_SENHA ausentes');
  if (!SUPABASE_URL || !SUPABASE_KEY)                  throw new Error('Supabase keys ausentes');

  console.log(`\n📋 Sync cadastro funcionários OI → NexusZ`);
  if (DRY_RUN)     console.log('   ⚠️  DRY-RUN — nada será salvo');
  if (LOJA_FILTRO) console.log(`   🏪 Filtro: ${LOJA_FILTRO}`);

  // 1. Colaboradores NexusZ
  console.log('\n1️⃣  Buscando colaboradores no NexusZ...');
  const nexuszList = await buscarNexusz();
  console.log(`   ✅ ${nexuszList.length} colaboradores`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
           '--disable-blink-features=AutomationControlled', '--window-size=1366,768'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
  );
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'pt-BR,pt;q=0.9' });
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  try {
    await login(page);

    // 2. Lista OI global
    console.log('\n2️⃣  Coletando lista OI...');
    const listaBruta = await coletarLista(page);
    const filtrada   = filtrar(listaBruta);
    console.log(`   📊 Bruto: ${listaBruta.length} | Válidos: ${filtrada.length} | Ignorados: ${listaBruta.length - filtrada.length}`);

    // Agrupa todas as entradas OI pelo nome normalizado (mantém TODAS — sem descartar duplicatas)
    // Ignora donos da empresa
    const porNome = new Map(); // normNome → [entradas]
    filtrada.forEach(f => {
      const n = normNome(f.nome);
      if (SKIP_NAMES.has(n)) return; // pula donos
      if (!porNome.has(n)) porNome.set(n, []);
      porNome.get(n).push(f);
    });

    const totalNomes   = porNome.size;
    const totalDupls   = [...porNome.values()].filter(v => v.length > 1).length;
    console.log(`   ✅ ${totalNomes} nomes únicos (${totalDupls} com entradas duplicadas na OI)`);
    if (totalDupls) {
      [...porNome.entries()].filter(([,v]) => v.length > 1).forEach(([n, v]) =>
        console.log(`      ↳ "${n}" — ${v.length}x (${v.map(e => e.lojaKey).join(', ')})`));
    }

    // Match contra NexusZ (por grupo de nome)
    const grupos = [...porNome.entries()].map(([nNorm, entradas]) => ({
      nNorm,
      entradas,
      colaborador: matchNexusz(nexuszList, entradas[0].nome),
    }));

    const comMatch  = grupos.filter(g => g.colaborador);
    const semMatch  = grupos.filter(g => !g.colaborador);

    console.log(`   ✅ ${comMatch.length} com match no NexusZ`);
    if (semMatch.length) {
      console.log(`   ⚠️  ${semMatch.length} sem match:`);
      semMatch.forEach(g => console.log(`      - ${g.entradas[0].nome} (${g.entradas.map(e => e.lojaKey).join(', ')})`));
    }

    if (!comMatch.length) {
      console.log('\n❌ Nenhum para processar.'); return;
    }

    const totalEntradas = comMatch.reduce((s, g) => s + g.entradas.length, 0);
    console.log(`\n3️⃣  Lendo cadastros (${comMatch.length} funcionários / ${totalEntradas} entradas OI)...\n`);

    let totalOk = 0, totalErro = 0;
    const resultados = [];

    for (let i = 0; i < comMatch.length; i++) {
      const { entradas, colaborador } = comMatch[i];
      const nomeDisplay = entradas[0].nome;
      const isDupl = entradas.length > 1;
      process.stdout.write(`  [${String(i+1).padStart(2)}/${comMatch.length}] ${nomeDisplay.padEnd(40)}`);
      if (isDupl) process.stdout.write(`(${entradas.length} entradas OI)\n`);

      try {
        // Abre TODAS as entradas OI e mescla os dados (campo não-nulo prevalece)
        let dadosMesclados = {};
        let totalCamposEncontrados = 0;

        for (let j = 0; j < entradas.length; j++) {
          const entrada = entradas[j];
          if (isDupl) process.stdout.write(`    [entrada ${j+1}/${entradas.length} — ${entrada.lojaKey}] `);

          const profilePage = await abrirPerfil(page, browser, entrada.controlId);
          if (!profilePage) {
            if (isDupl) console.log('⚠️  perfil não carregou');
            else process.stdout.write('⚠️  perfil não carregou\n');
            await screenshot(page, `sem-perfil-${nomeDisplay.slice(0,15).replace(/\s/g,'_')}-${j}`);
            continue;
          }

          const campos = await lerTudo(profilePage);
          if (profilePage !== page) await profilePage.close().catch(() => {});

          const dados = mapear(campos);
          const preenchidos = Object.entries(dados).filter(([,v]) => v !== null && v !== undefined && v !== '');

          if (isDupl) {
            process.stdout.write(`${preenchidos.length} campos: ${preenchidos.map(([k]) => k).join(', ')}\n`);
          }

          // Mescla: campo existente não-nulo não é sobrescrito por nulo; campo novo sempre aceito
          for (const [k, v] of Object.entries(dados)) {
            if (v !== null && v !== undefined && v !== '') {
              if (!dadosMesclados[k] || dadosMesclados[k] === null) {
                dadosMesclados[k] = v;
              }
            }
          }
          totalCamposEncontrados = Object.entries(dadosMesclados)
            .filter(([,v]) => v !== null && v !== undefined && v !== '').length;
        }

        // Mostra resumo dos campos mesclados (sempre, para facilitar diagnóstico)
        const preenchidosFinal = Object.entries(dadosMesclados)
          .filter(([,v]) => v !== null && v !== undefined && v !== '');

        if (!isDupl) {
          process.stdout.write(`    → ${preenchidosFinal.length} campos: `);
          process.stdout.write(preenchidosFinal.map(([k]) => k).join(', ') + '\n');
        } else {
          console.log(`    → Mesclado: ${preenchidosFinal.length} campos: ${preenchidosFinal.map(([k]) => k).join(', ')}`);
        }

        if (DRY_RUN) {
          resultados.push({ nome: nomeDisplay, entradas: entradas.length, dados: dadosMesclados });
          continue;
        }

        if (!preenchidosFinal.length) {
          process.stdout.write(`    ⏭️  sem dados para salvar\n`);
          continue;
        }

        const res = await atualizar(colaborador.id, dadosMesclados);
        if (res.skipped) {
          process.stdout.write(`    ⏭️  sem dados\n`);
        } else if (res.ok) {
          process.stdout.write(`    ✅ ${res.n} campos salvos\n`);
          totalOk++;
        } else {
          process.stdout.write(`    ❌ HTTP ${res.status}\n`);
          totalErro++;
        }
        resultados.push({ nome: nomeDisplay, entradas: entradas.length, colaboradorId: colaborador.id, campos: res.n });

      } catch (err) {
        process.stdout.write(`    ❌ ${err.message}\n`);
        await screenshot(page, `erro-${nomeDisplay.slice(0,15).replace(/\s/g,'_')}`).catch(() => {});
        totalErro++;
      }

      await SLEEP(300);
    }

    // 4. Resumo
    console.log(`\n─────────────────────────────────`);
    console.log(`✅ Concluído!`);
    if (!DRY_RUN) {
      console.log(`   Atualizados: ${totalOk}`);
      console.log(`   Erros:       ${totalErro}`);
    }

    ensureDir(DEBUG_DIR);
    fs.writeFileSync(path.join(DEBUG_DIR, 'resultado-sync.json'), JSON.stringify(resultados, null, 2));
    console.log(`   📁 Detalhes: ${path.join(DEBUG_DIR, 'resultado-sync.json')}`);

  } finally {
    await browser.close().catch(() => {});
  }
}

main().catch(e => { console.error('❌', e.message || e); process.exit(1); });
