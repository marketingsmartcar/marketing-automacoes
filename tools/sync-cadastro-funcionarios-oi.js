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

// Unidades NexusZ (IDs fixos do banco)
const UNIT_MAP = {
  BR01: { unitId: '20578dc2-ec15-43c5-85b3-90ee82156304', nome: 'BR1 Centro' },
  BR03: { unitId: 'a8d2a117-3437-4c27-aa9c-059a84e5bc08', nome: 'BR3 Americana' },
  BR04: { unitId: '056fcb61-01d2-4373-abed-1be209eccd30', nome: 'BR4 S. Carlos' },
  PEG1: { unitId: 'd2a57bb8-e6d1-4d25-b3d9-e0cf77748dae', nome: 'Peg1 Araraquara' },
};

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

// Nomes a ignorar no sync (donos da empresa) — verifica se o nome COMEÇA COM qualquer um desses
const SKIP_NAMES = ['CIBELE REGINA OLIVEIRA', 'CIBELE ZACHI', 'FABIO ZACHI'];
function deveIgnorar(nomeNorm) {
  return SKIP_NAMES.some(skip => nomeNorm === skip || nomeNorm.startsWith(skip + ' ') || nomeNorm.startsWith(skip + '-'));
}

function normNome(n) {
  return (n || '').trim().toUpperCase()
    .replace(/\s*\(.*?\)\s*/g, '') // remove (conteúdo)
    .replace(/\s*\(.*$/g, '')       // remove ( sem fechamento
    .replace(/\s+/g, ' ').trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Remove parênteses do nome preservando maiúsculas/acentos originais
function limparNome(n) {
  return (n || '').trim()
    .replace(/\s*\(.*?\)\s*/g, '')
    .replace(/\s*\(.*$/, '')
    .replace(/\s+/g, ' ').trim();
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

    // ── Extrações específicas por padrão (fallback para campos que o lbl() não alcança) ──

    // CPF: 1º tenta seletor direto por ID (OI usa ctl00_cph_txtCPFCNPJ)
    if (!d['CPF/CNPJ'] && !d['CPF']) {
      const cpfEl = document.querySelector(
        '#ctl00_cph_txtCPFCNPJ, input[id$="txtCPFCNPJ"], input[id$="txtCPF"], input[name$="txtCPFCNPJ"]'
      );
      if (cpfEl) {
        const v = (cpfEl.value || '').trim();
        if (v && v !== '000.000.000-00') d['CPF/CNPJ'] = v;
      }
    }
    // CPF: 2º fallback por padrão numérico em qualquer input visível
    if (!d['CPF/CNPJ'] && !d['CPF']) {
      Array.from(document.querySelectorAll('input:not([type=hidden])')).forEach(el => {
        const v = (el.value || '').trim();
        if (/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(v) && v.replace(/\D/g,'').length === 11) {
          d['CPF/CNPJ'] = v;
        }
      });
    }

    // Sexo: 1º tenta pelo name/id do radio group (OI usa rdSexo)
    if (!d['Sexo']) {
      const sexoM = document.querySelector(
        'input[type=radio][id*="rdSexoM"]:checked, input[type=radio][name*="rdSexo"][value="M"]:checked'
      );
      const sexoF = document.querySelector(
        'input[type=radio][id*="rdSexoF"]:checked, input[type=radio][name*="rdSexo"][value="F"]:checked'
      );
      if (sexoM) d['Sexo'] = 'M';
      else if (sexoF) d['Sexo'] = 'F';
    }
    // Sexo: 2º fallback genérico por value M/F/Masculino/Feminino
    if (!d['Sexo']) {
      const sexoChecked = document.querySelector(
        'input[type=radio][value="M"]:checked, input[type=radio][value="F"]:checked, ' +
        'input[type=radio][value="Masculino"]:checked, input[type=radio][value="Feminino"]:checked'
      );
      if (sexoChecked) d['Sexo'] = sexoChecked.value;
    }

    return d;
  }).catch(() => ({}));
}

// ── Lê contatos de emergência da aba Contato (tabela de contatos existentes) ─────
async function lerContatosEmergencia(page) {
  return page.evaluate(() => {
    const contatos = [];
    const trs = Array.from(document.querySelectorAll('table tr'));
    let dentroTabela = false;

    for (const tr of trs) {
      const cells = Array.from(tr.querySelectorAll('td, th'));
      const textos = cells.map(c => c.textContent.trim().replace(/\s+/g,' '));

      if (!dentroTabela) {
        // Detecta header da tabela de contatos
        if (textos.includes('Contato') && textos.includes('Comercial')) {
          dentroTabela = true;
        }
        continue;
      }

      // Saiu da tabela (nova tabela ou fim)
      if (textos.includes('Contato') && textos.includes('Comercial')) continue;
      if (cells.length < 2) { dentroTabela = false; continue; }

      const col0 = textos[0] || '';
      // Ignora linhas de formulário/lixo (labels de upload, selects vazios, textos longos)
      if (col0.length > 60) continue;
      if (/selecione|descrição do|informada|arquivo|documento/i.test(col0)) continue;
      if (!col0 || col0.length < 1) continue;

      // Posições: 0=Contato, 1=Comercial, 2=Ramal, 3=Residencial, 4=Celular, 5=E-mail, 6=Departamento
      const comercial   = textos[1] || null;
      const residencial = textos[3] || null;
      const celular     = textos[4] || null;
      const emailC      = textos[5] || null;

      const telefone = celular || comercial || residencial || null;

      // Ignora se telefone parece texto de formulário
      if (telefone && /selecione|descrição|arquivo/i.test(telefone)) continue;

      if (col0 && (telefone || emailC)) {
        contatos.push({ nome: col0, telefone, email: emailC || null });
      }
    }
    return contatos;
  }).catch(() => []);
}

// ── Lê documentos da aba Documentos ──────────────────────────────────────────

async function lerDocumentosOI(page) {
  const baseUrl = BASE_URL;
  const result = await page.evaluate((baseUrl) => {
    const docs = [];
    const tables = Array.from(document.querySelectorAll('table'));

    for (const table of tables) {
      const headerCells = Array.from(table.querySelectorAll('tr:first-child th, tr:first-child td'))
        .map(h => h.textContent.trim().toLowerCase());
      const hasData = headerCells.some(h => h.includes('data'));
      const hasDesc = headerCells.some(h => h.includes('descri'));
      if (!hasData || !hasDesc) continue;

      const rows = Array.from(table.querySelectorAll('tr')).slice(1);
      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length < 2) continue;

        const dataCadastro = (cells[0]?.textContent || '').trim();
        const descricao    = (cells[1]?.textContent || '').trim();
        if (!descricao) continue;

        let urlOi = null;
        const allLinks = Array.from(row.querySelectorAll('a'));

        for (const a of allLinks) {
          // 1. URL na chamada fncNovaAba('/caminho/doc.pdf') no onclick
          const onclick = a.getAttribute('onclick') || '';
          const m = onclick.match(/fncNovaAba\s*\(\s*'([^']+)'/i);
          if (m) {
            urlOi = m[1].startsWith('http') ? m[1] : baseUrl + m[1];
            break;
          }
          // 2. Href direto (não-PostBack)
          const href = (a.getAttribute('href') || '').trim();
          if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
            urlOi = href.startsWith('http') ? href : baseUrl + (href.startsWith('/') ? href : '/' + href);
            break;
          }
        }

        if (docs.length === 0) {
          window.__docLinkDebug = allLinks.map(a => ({
            href: a.getAttribute('href'),
            onclick: (a.getAttribute('onclick') || '').slice(0, 100),
          }));
        }

        docs.push({ data_cadastro: dataCadastro, descricao, url_oi: urlOi });
      }
      if (docs.length > 0) {
        return { docs, linkDebug: window.__docLinkDebug || [] };
      }
    }
    return { docs: [], linkDebug: [] };
  }, baseUrl).catch(() => ({ docs: [], linkDebug: [] }));

  if (result.linkDebug && result.linkDebug.length > 0 && result.docs.length > 0) {
    process.stdout.write(`    [doc-links: ${JSON.stringify(result.linkDebug).slice(0, 400)}]\n`);
  }
  return result.docs;
}

// ── Salva documentos OI no NexusZ ─────────────────────────────────────────────

function parseDateBR(str) {
  if (!str) return null;
  const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

async function salvarDocumentosOI(colaboradorId, docs) {
  if (!docs || docs.length === 0) return { n: 0 };

  // Substitui todos os docs do colaborador (delete + insert)
  await fetch(`${SUPABASE_URL}/rest/v1/rh_documentos_oi?colaborador_id=eq.${colaboradorId}`, {
    method: 'DELETE',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });

  const rows = docs.map(d => ({
    colaborador_id: colaboradorId,
    data_cadastro:  parseDateBR(d.data_cadastro) || null,
    descricao:      d.descricao,
    url_oi:         d.url_oi || null,
    sincronizado_em: new Date().toISOString(),
  }));

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rh_documentos_oi`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json', 'Prefer': 'return=minimal',
    },
    body: JSON.stringify(rows),
  });
  return { ok: res.ok, n: rows.length };
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

    // Contato: lê todos os contatos de emergência da tabela
    if (aba === 'Contato') {
      const contatos = await lerContatosEmergencia(profilePage);
      if (contatos.length > 0) {
        camposPorAba['_contatosEmergencia'] = contatos;
        process.stdout.write(` [contatos:${contatos.length}]`);
      }
    }

    // Documentos: lê a lista de documentos da tabela
    if (aba === 'Documentos') {
      const docs = await lerDocumentosOI(profilePage);
      if (docs.length > 0) {
        camposPorAba['_documentosOI'] = docs;
        process.stdout.write(` [docs:${docs.length}]`);
      }
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

  // Nome completo (usado ao inserir novo colaborador)
  const nomeOI = get('Nome', 'Nome Completo') || null;

  // Campos flat de telefone
  const tel_celular   = get('Celular(SMS)', 'Celular');
  const tel_cel2      = get('Telefone 2', 'Telefone 3', 'Telefone 4');

  // Array `telefones` — formato que a UI do NexusZ exibe
  const telefonesArr = [];
  if (tel_celular) telefonesArr.push({ tipo: 'celular', numero: tel_celular, de_quem: 'próprio' });
  if (telefone_fixo) telefonesArr.push({ tipo: 'fixo', numero: telefone_fixo, de_quem: '' });
  if (tel_cel2) telefonesArr.push({ tipo: 'celular', numero: tel_cel2, de_quem: '' });

  // Campos flat de endereço
  const end_logradouro = campos.endereco   || get('Logradouro');
  const end_numero     = campos.numero     || get('Número', 'Num.');
  const end_complement = campos.complemento|| get('Complemento');
  const end_bairro     = campos.bairro     || get('Bairro');
  const end_cidade     = campos.cidade     || get('Cidade');
  const end_estado     = campos.estado     || get('Estado');
  const end_cep        = campos.cep        || get('CEP');

  // Array `enderecos` — formato que a UI do NexusZ exibe
  const enderecosArr = [];
  if (end_logradouro || end_cidade) {
    enderecosArr.push({
      de_quem:     'residencial',
      logradouro:  end_logradouro || '',
      numero:      end_numero     || '',
      complemento: end_complement || '',
      bairro:      end_bairro     || '',
      cidade:      end_cidade     || '',
      estado:      end_estado     || '',
      cep:         end_cep        || '',
    });
  }

  return {
    _nomeOI: nomeOI,
    nome: limparNome(nomeOI), // atualiza nome se tiver parênteses
    cpf,
    cnpj,
    rg:                  get('RG/I.E', 'RG'),
    data_nascimento:     parseDateBR(get('Dt. Nascimento', 'Nascimento', 'Data de Nascimento')),
    sexo,
    apelido:             get('Apelido'),
    email:               get('E-mail', 'Email'),
    // Campos flat (compatibilidade)
    telefone_celular:    tel_celular,
    telefone_fixo,
    telefone_celular_2:  tel_cel2,
    // Array dinâmico que a UI exibe
    telefones:           telefonesArr.length > 0 ? telefonesArr : null,
    // Endereço flat (compatibilidade)
    endereco:            end_logradouro,
    numero:              end_numero,
    complemento:         end_complement,
    bairro:              end_bairro,
    cidade:              end_cidade,
    estado:              end_estado,
    cep:                 end_cep,
    pais:                get('País', 'Pais'),
    // Array dinâmico que a UI exibe
    enderecos:           enderecosArr.length > 0 ? enderecosArr : null,
    observacoes:         get('Observação', 'Observacao'),
    // Dados bancários
    banco:               get('Banco'),
    agencia:             get('Agência', 'Agencia'),
    conta:               get('N.º Conta', 'Conta Corrente', 'Conta'),
    pix:                 get('PIX', 'Chave PIX'),
    // Funcionário — cargo NUNCA é sincronizado (gerenciado pelo usuário no NexusZ)
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
    // Contatos de emergência: popula contatos_principais[] a partir da aba Contato do OI
    contatos_principais: (() => {
      const lista = campos['_contatosEmergencia'];
      if (!Array.isArray(lista) || lista.length === 0) return null;
      const isPhone = s => s && /^[\d\s\+\-\(\)\.]{6,}$/.test(s.trim());
      return lista.map(c => {
        // Detecta e corrige quando nome e telefone estão invertidos
        const nomeParece    = !isPhone(c.nome)     && isPhone(c.telefone);
        const telefoneInv   =  isPhone(c.nome)     && !isPhone(c.telefone);
        const nome    = telefoneInv ? c.telefone : c.nome;
        const telefone = telefoneInv ? c.nome    : c.telefone;
        return {
          nome:             nome     || '',
          parentesco:       '',
          telefone_celular: telefone || null,
          telefone_fixo:    null,
          endereco:         null,
        };
      });
    })(),
  };
}

// ── Atualiza NexusZ ────────────────────────────────────────────────────────────

// Campos que o sync NUNCA deve sobrescrever — gerenciados pelo usuário no NexusZ
const CAMPOS_PROTEGIDOS_ATUALIZAR = new Set(['cargo', 'salario']);

async function atualizar(id, dados) {
  const payload = {};
  for (const [k, v] of Object.entries(dados)) {
    if (k.startsWith('_')) continue; // campos internos
    if (CAMPOS_PROTEGIDOS_ATUALIZAR.has(k)) continue; // campos protegidos
    // Arrays (telefones, enderecos) são incluídos mesmo que vazios não sejam string
    if (Array.isArray(v)) { if (v.length > 0) payload[k] = v; }
    else if (v !== null && v !== undefined && v !== '') payload[k] = v;
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

// ── Insere novo colaborador ────────────────────────────────────────────────────

async function inserirNovo(nomeDisplay, lojaKey, dados) {
  const unit = UNIT_MAP[lojaKey];
  if (!unit) return { skipped: true, motivo: `loja ${lojaKey} sem unit_id` };

  const { _nomeOI, ...dadosLimpos } = dados;
  const payload = {};
  // cargo e salario nunca são definidos pelo sync — gerenciados pelo usuário
  const CAMPOS_PROTEGIDOS = new Set(['cargo', 'salario']);
  for (const [k, v] of Object.entries(dadosLimpos)) {
    if (k.startsWith('_')) continue; // campos internos
    if (CAMPOS_PROTEGIDOS.has(k)) continue;
    if (v !== null && v !== undefined && v !== '') payload[k] = v;
  }

  payload.nome      = limparNome(_nomeOI || nomeDisplay);
  payload.status    = 'ativo';
  payload.unidade_id = unit.unitId;
  payload.oi_loja_key = lojaKey;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rh_colaboradores`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json', 'Prefer': 'return=minimal',
    },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, status: res.status, created: true, n: Object.keys(payload).length };
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
      if (deveIgnorar(n)) return; // pula donos da empresa
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
    console.log(`   🆕 ${semMatch.length} novos (serão inseridos)`);
    if (semMatch.length) {
      semMatch.forEach(g => console.log(`      + ${g.entradas[0].nome} (${g.entradas.map(e => e.lojaKey).join(', ')})`));
    }

    // Processa todos: comMatch (PATCH) + semMatch (INSERT)
    const todosGrupos = [...comMatch, ...semMatch];
    if (!todosGrupos.length) { console.log('\n❌ Nenhum para processar.'); return; }

    const totalEntradas = todosGrupos.reduce((s, g) => s + g.entradas.length, 0);
    console.log(`\n3️⃣  Lendo cadastros (${todosGrupos.length} funcionários / ${totalEntradas} entradas OI)...\n`);

    let totalOk = 0, totalNovo = 0, totalErro = 0;
    const resultados = [];

    for (let i = 0; i < todosGrupos.length; i++) {
      const { entradas, colaborador } = todosGrupos[i];
      const nomeDisplay = entradas[0].nome;
      const isDupl = entradas.length > 1;
      const isNovo = !colaborador;
      process.stdout.write(`  [${String(i+1).padStart(2)}/${todosGrupos.length}] ${isNovo ? '🆕 ' : ''}${nomeDisplay.padEnd(40)}`);
      if (isDupl) process.stdout.write(`(${entradas.length} entradas OI)\n`);

      try {
        // Abre TODAS as entradas OI e mescla os dados (campo não-nulo prevalece)
        let dadosMesclados = {};
        let totalCamposEncontrados = 0;
        let docsOI = [];

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
          if (campos._documentosOI) docsOI = docsOI.concat(campos._documentosOI);
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
          resultados.push({ nome: nomeDisplay, novo: isNovo, entradas: entradas.length, dados: dadosMesclados });
          continue;
        }

        if (!preenchidosFinal.length && !isNovo) {
          process.stdout.write(`    ⏭️  sem dados para salvar\n`);
          continue;
        }

        if (isNovo) {
          // INSERT: usa a primeira entrada para determinar a loja
          const lojaKey = entradas[0].lojaKey;
          const res = await inserirNovo(nomeDisplay, lojaKey, dadosMesclados);
          if (res.skipped) {
            process.stdout.write(`    ⏭️  ${res.motivo}\n`);
          } else if (res.ok) {
            process.stdout.write(`    🆕 inserido! ${res.n} campos (${lojaKey})\n`);
            totalNovo++;
          } else {
            process.stdout.write(`    ❌ HTTP ${res.status}\n`);
            totalErro++;
          }
          resultados.push({ nome: nomeDisplay, novo: true, entradas: entradas.length, loja: lojaKey });
        } else {
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
          // Salva documentos OI (metadados apenas, sem arquivos)
          if (docsOI.length > 0) {
            const docRes = await salvarDocumentosOI(colaborador.id, docsOI);
            if (docRes.n > 0) process.stdout.write(`    📄 ${docRes.n} docs OI\n`);
          }
          resultados.push({ nome: nomeDisplay, entradas: entradas.length, colaboradorId: colaborador.id, campos: res.n });
        }

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
      console.log(`   Novos:       ${totalNovo}`);
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
