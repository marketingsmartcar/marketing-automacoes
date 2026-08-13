#!/usr/bin/env node
/**
 * mapear-grupos-descricao.js
 *
 * Mapeia as 174 descrições sem grupo para os os_grupos do NexusZ
 * via matching por keywords e similaridade de texto.
 *
 * Uso:
 *   node tools/mapear-grupos-descricao.js              # exibe matches, não grava
 *   node tools/mapear-grupos-descricao.js --gravar     # grava mapeamentos confiantes (score>=0.40)
 *   node tools/mapear-grupos-descricao.js --min=0.30   # ajusta limiar de confiança
 */

require('dotenv').config();
const https = require('https');

const DRY = !process.argv.includes('--gravar');
const minArg = process.argv.find(a => a.startsWith('--min='));
const MIN_SCORE = minArg ? parseFloat(minArg.split('=')[1]) : 0.40;

const NEXUSZ_URL = process.env.NEXUSZ_SUPABASE_URL;
const NEXUSZ_KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY;

function supaReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const url = new URL(NEXUSZ_URL + path);
    const opts = {
      hostname: url.hostname, path: url.pathname + url.search, method,
      headers: {
        'Authorization': `Bearer ${NEXUSZ_KEY}`,
        'apikey': NEXUSZ_KEY,
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = https.request(opts, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, body: d }); } });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// Normaliza: remove acentos, pontuação, maiúsculas, stopwords
const STOPWORDS = new Set([
  'de','do','da','dos','das','em','no','na','nos','nas','para','com','sem','ao','ou',
  'e','a','o','os','as','um','uma','uns','umas','por','ate','ser',
  'br','pneus','carro','suv','venda','loja','lados','serv',
  'geral','completo','completa','parcial','basico',
]);

function norm(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
}

function tokenize(s) {
  return norm(s).toLowerCase().split(/\s+/)
    .filter(t => t.length >= 3 && !STOPWORDS.has(t));
}

// Score: quantos tokens do grupo aparecem na descrição
function score(descTokens, grupoTokens) {
  if (!grupoTokens.length) return 0;
  const descSet = new Set(descTokens);
  let hits = 0;
  for (const t of grupoTokens) {
    if (descSet.has(t)) { hits++; continue; }
    for (const dt of descTokens) {
      if (dt.includes(t) || t.includes(dt)) { hits += 0.6; break; }
    }
  }
  return hits / grupoTokens.length;
}

// Mapeamentos manuais — MAIS ESPECÍFICO PRIMEIRO, genérico no final
// Os grupos usam nomes NORMALIZADOS (sem acento) para match
const MANUAL = [
  // ── MAO DE OBRA ──────────────────────────────────────────────
  { k: 'servico tecnico mec', g: 'MAO DE OBRA MECANICA' },
  { k: 'servico mecanico',    g: 'MAO DE OBRA MECANICA' },
  { k: 'mao de obra mecan',   g: 'MAO DE OBRA MECANICA' },
  { k: 'mao de obra mec',     g: 'MAO DE OBRA MECANICA' },
  { k: 'revisao geral',       g: 'MAO DE OBRA MECANICA' },
  { k: 'ajuste angulo caster',g: 'MAO DE OBRA AJUSTE CAIXA' },

  // ── BALANCEAMENTO — k2 para subtipos cortesia/revisao/garantia ──
  { k: 'balanceamento peg',  k2: '(cortesia',  g: 'BALANCEAMENTO PEG CORTESIA' },
  { k: 'balanceamento peg',  k2: '(revisao',   g: 'BALANCEAMENTO PEG REVISAO'  },
  { k: 'balanceamento peg',  k2: '(revisão',   g: 'BALANCEAMENTO PEG REVISAO'  },
  { k: 'balanceamento peg',  k2: '(garantia',  g: 'BALANCEAMENTO PEG GARANTIA' },
  { k: 'balanceamento peg',                    g: 'BALANCEAMENTO PEG COMUM'    },
  { k: 'balanceamento roda peg', k2: '(revisao', g: 'BALANCEAMENTO PEG REVISAO' },
  { k: 'balanceamento roda peg', k2: '(revisão', g: 'BALANCEAMENTO PEG REVISAO' },
  { k: 'balanceamento roda peg',                 g: 'BALANCEAMENTO PEG'          },
  { k: 'balanceamento roda', k2: '(cortesia',  g: 'BALANCEAMENTO RODA CORTESIA' },
  { k: 'balanceamento roda', k2: '(revisao',   g: 'BALANCEAMENTO RODA REVISAO'  },
  { k: 'balanceamento roda', k2: '(revisão',   g: 'BALANCEAMENTO RODA REVISAO'  },
  { k: 'balanceamento roda', k2: '(garantia',  g: 'BALANCEAMENTO RODA GARANTIA' },
  { k: 'balanceamento roda',                   g: 'BALANCEAMENTO RODA BR TOTAL' },
  { k: 'balanceamento ',                       g: 'BALANCEAMENTO COMUM'         },

  // ── ALINHAMENTO — k2 para subtipos (depois do balanceamento) ─
  { k: 'alinhamento', k2: '(cortesia', g: 'ALINHAMENTO CORTESIA' },
  { k: 'alinhamento', k2: '(revisao',  g: 'ALINHAMENTO REVISAO'  },
  { k: 'alinhamento', k2: '(revisão',  g: 'ALINHAMENTO REVISAO'  },
  { k: 'alinhamento', k2: '(garantia', g: 'ALINHAMENTO GARANTIA' },
  { k: 'alinhamento tecnico',           g: 'ALINHAMENTO TECNICO'  },
  { k: 'alinhamento tras',              g: 'ALINHAMENTO COMUM'    },
  { k: 'alinhamento diant',             g: 'ALINHAMENTO COMUM'    },
  { k: 'alinhamento ',                  g: 'ALINHAMENTO COMUM'    },
  { k: 'ajuste camber',                 g: 'ALINHAMENTO COMUM'    },
  { k: 'ajuste angulo camber',          g: 'ALINHAMENTO COMUM'    },
  { k: 'geometria',                     g: 'ALINHAMENTO COMUM'    },

  // ── VÁLVULA AR ────────────────────────────────────────────────
  { k: 'valvula seguranca',       g: 'VALVULA AR' },
  { k: 'valvula ar',              g: 'VALVULA AR' },
  { k: 'tr414',                   g: 'VALVULA AR' },
  { k: 'valvula termostatica',    g: 'VALVULA TERMOSTATICA' },

  // ── EMBREAGEM ─────────────────────────────────────────────────
  { k: 'retifica volante embreagem', g: 'SERVICOS TERCEIROS' },
  { k: 'kit embragem',              g: 'KIT/CILINDRO/ATUADOR EMBREAGEM' },
  { k: 'kit embreagem',             g: 'KIT/CILINDRO/ATUADOR EMBREAGEM' },
  { k: 'embreagem',                 g: 'KIT/CILINDRO/ATUADOR EMBREAGEM' },

  // ── SEMI EIXO ─────────────────────────────────────────────────
  { k: 'reparo do semi eixo',      g: 'MAO DE OBRA REPARO SEMI' },
  { k: 'reparo semi eixo',         g: 'MAO DE OBRA REPARO SEMI' },
  { k: 'gabaritagem manga eixo',   g: 'MAO DE OBRA REPARO SEMI' },
  { k: 'semi eixo',                g: 'ROLAMENTO SEMI EIXO' },
  { k: 'semieixo',                 g: 'ROLAMENTO SEMI EIXO' },

  // ── FREIO — ESPECÍFICOS ANTES DO GENÉRICO ────────────────────
  { k: 'pastilha freio',           g: 'PASTILHA FREIO' },
  { k: 'pastilha ',                g: 'PASTILHA FREIO' },
  { k: 'sapata freio',             g: 'CILINDRO/SAPATA FREIO' },
  { k: 'sapata ',                  g: 'CILINDRO/SAPATA FREIO' },
  { k: 'cilindro roda',            g: 'CILINDRO RODA (ESTOQUE)' },
  { k: 'retifica disco freio',     g: 'RETIFICA DISCO/TAMBOR FREIO' },
  { k: 'retifica disco',           g: 'RETIFICA DISCO/TAMBOR FREIO' },
  { k: 'retifica tambor',          g: 'RETIFICA DISCO/TAMBOR FREIO' },
  { k: 'disco freio',              g: 'DISCO FREIO (ESTOQUE)' },
  { k: 'tambor freio',             g: 'DISCO FREIO (ESTOQUE)' },
  { k: 'sangria fluido freio',     g: 'SANGRIA FLUIDO FREIO' },
  { k: 'troca/sangria fluido',     g: 'SANGRIA FLUIDO FREIO' },
  { k: 'fluido freio',             g: 'SANGRIA FLUIDO FREIO' },
  { k: 'sangria sistema',          g: 'SANGRIA FLUIDO FREIO' },
  { k: 'sangria ',                 g: 'SANGRIA FLUIDO FREIO' },
  { k: 'flexivel freio',           g: 'FLEXIVEL FREIO (ESTOQUE)' },
  { k: 'flexível freio',           g: 'FLEXIVEL FREIO (ESTOQUE)' },
  { k: 'bucha da barra estabiliadora', g: 'ARTICULADOR/BARRA DIRECAO' },
  { k: 'barra estabiliadora',      g: 'ARTICULADOR/BARRA DIRECAO' },
  { k: 'reparo pinca',             g: 'MAO DE OBRA PINCA' },
  { k: 'reparo pinça',             g: 'MAO DE OBRA PINCA' },
  { k: 'limpeza sistema freio',    g: 'LIMPEZA FREIO SERVICO' },
  { k: 'limpeza freio',            g: 'LIMPEZA FREIO SERVICO' },
  { k: 'regulagem freio',          g: 'LIMPEZA FREIO SERVICO' },
  { k: 'tampa reservatorio fluido',g: 'FREIO (ESTOQUE)' },
  { k: 'fluido ',                  g: 'FLUIDO/COLA/DERIVADOS' },
  { k: 'freio',                    g: 'LIMPEZA FREIO SERVICO' }, // genérico — SEMPRE o último de freio

  // ── AMORTECEDOR ───────────────────────────────────────────────
  { k: 'coxim amort',              g: 'COXIM AMORT (ESTOQUE)' },
  { k: 'kit amort',                g: 'KIT AMORTECEDOR (ESTOQUE)' },
  { k: 'kit batente amort',        g: 'KIT AMORTECEDOR (ESTOQUE)' },
  { k: 'reman',                    g: 'AMORTECEDOR REMANUFATURADO' },
  { k: 'amort ',                   g: 'AMORTECEDOR NOVO (ESTOQUE)' },
  { k: 'amortecedor',              g: 'AMORTECEDOR NOVO (ESTOQUE)' },

  // ── SUSPENSÃO ─────────────────────────────────────────────────
  { k: 'revestimento mola',        g: 'MOLA' },
  { k: 'mola',                     g: 'MOLA' },
  { k: 'bucha diant band',         g: 'BANDEJA SUSPENSAO (ESTOQUE)' },
  { k: 'bucha traseira band',      g: 'BANDEJA SUSPENSAO (ESTOQUE)' },
  { k: 'bucha dianteira band',     g: 'BANDEJA SUSPENSAO (ESTOQUE)' },
  { k: 'bucha band',               g: 'BANDEJA SUSPENSAO (ESTOQUE)' },
  { k: 'bucha bandeja',            g: 'BANDEJA SUSPENSAO (ESTOQUE)' },
  { k: 'bucha caixa',              g: 'CAIXA DIRECAO' },
  { k: 'bucha susp',               g: 'BUCHA SUSPENSAO (ESTOQUE)' },
  { k: 'bucha suspensao',          g: 'BUCHA SUSPENSAO (ESTOQUE)' },
  { k: 'bandeja susp',             g: 'BANDEJA SUSPENSAO (ESTOQUE)' },
  { k: 'bandeja ',                 g: 'BANDEJA' },
  { k: 'pivo susp',                g: 'PIVO (ESTOQUE)' },
  { k: 'pivo suspensao',           g: 'PIVO SUSPENSAO' },
  { k: 'bieleta barra',            g: 'BIELETA BARRA (ESTOQUE)' },
  { k: 'kit barra estabil',        g: 'KIT BARRA (ESTOQUE)' },
  { k: 'axial',                    g: 'AXIAL (ESTOQUE)' },
  { k: 'rolamento roda',           g: 'ROLAMENTO RODA (ESTOQUE)' },
  { k: 'ajuste rolamento',         g: 'ROLAMENTO RODA' },
  { k: 'cubo roda',                g: 'CUBO RODA (ESTOQUE)' },
  { k: 'junta homoc',              g: 'JUNTA HOMOCINETICA' },
  { k: 'junta homocineti',         g: 'JUNTA HOMOCINETICA' },
  { k: 'trizeta',                  g: 'JUNTA HOMOCINETICA' },
  { k: 'coifa homo',               g: 'COIFA HOMOC (ESTOQUE)' },
  { k: 'coifa lado roda',          g: 'COIFA HOMOC (ESTOQUE)' },
  { k: 'coifa cambio triploide',   g: 'COIFA HOMOC (ESTOQUE)' },
  { k: 'coifa lado cambio',        g: 'KIT TRAMBULADOR' },
  { k: 'coifa',                    g: 'COIFA RODA/CAMBIO/CAIXA' },
  { k: 'kit coifa',                g: 'COIFA RODA/CAMBIO/CAIXA' },

  // ── DIREÇÃO ───────────────────────────────────────────────────
  { k: 'terminal direcao',         g: 'TERMINAL DIRECAO (ESTOQUE)' },
  { k: 'terminal direçao',         g: 'TERMINAL DIRECAO (ESTOQUE)' },
  { k: 'terminal direção',         g: 'TERMINAL DIRECAO (ESTOQUE)' },
  { k: 'articulador caixa',        g: 'CAIXA DIRECAO' },
  { k: 'caixa direcao',            g: 'CAIXA DIRECAO' },
  { k: 'caixa direçao',            g: 'CAIXA DIRECAO' },
  { k: 'caixa direção',            g: 'CAIXA DIRECAO' },

  // ── COXIM MOTOR/CÂMBIO ────────────────────────────────────────
  { k: 'coxim elast motor',        g: 'COXIM MOTOR' },
  { k: 'coxim motor',              g: 'COXIM MOTOR' },
  { k: 'coxim cambio',             g: 'COXIM CAMBIO' },

  // ── CORREIA ───────────────────────────────────────────────────
  { k: 'tensor correia',           g: 'TENSOR/KIT CORREIA DENTADA' },
  { k: 'kit correia',              g: 'TENSOR/KIT CORREIA DENTADA' },
  { k: 'correia dentada',          g: 'CORREIA DENTADA' },
  { k: 'correia ',                 g: 'CORREIA AUXILIAR' },

  // ── FILTROS ───────────────────────────────────────────────────
  { k: 'filtro oleo motor',        g: 'FILTRO OLEO (ESTOQUE)' },
  { k: 'filtro oleo',              g: 'FILTRO OLEO' },
  { k: 'filtro ar condicionado',   g: 'FILTRO AR CONDICIONADO' },
  { k: 'filtro ar cabine',         g: 'FILTRO AR CONDICIONADO' },
  { k: 'filtro cabine ar',         g: 'FILTRO AR CONDICIONADO' },
  { k: 'filtro cabine',            g: 'FILTRO AR CONDICIONADO' },
  { k: 'filtro ar motor',          g: 'FILTRO AR MOTOR' },
  { k: 'filtro ar ',               g: 'FILTRO AR MOTOR' },
  { k: 'filtro combustivel',       g: 'FILTRO COMBUSTIVEL' },

  // ── ÓLEO / LUBRIFICANTES ──────────────────────────────────────
  { k: 'oleo motor',               g: 'OLEO MOTOR/CAMBIO' },
  { k: 'oleo cambio',              g: 'OLEO MOTOR/CAMBIO' },
  { k: 'oleo lubrificante',        g: 'OLEO MOTOR/CAMBIO' },
  { k: 'aditivo radiador',         g: 'FLUIDO/COLA/DERIVADOS' },
  { k: 'cola silicone',            g: 'COLA MOTOR/CAMBIO' },
  { k: 'retentor ',                g: 'RETENTOR MOTOR/CAMBIO' },
  { k: 'cano d agua',              g: 'FLUIDO/COLA/DERIVADOS' },

  // ── SERVIÇOS TERCEIROS ────────────────────────────────────────
  { k: 'parceria',                 g: 'SERVICOS TERCEIROS' },
  { k: 'terceiro',                 g: 'SERVICOS TERCEIROS' },
  { k: 'guincho',                  g: 'SERVICOS TERCEIROS' },
  { k: 'lavagem veicular',         g: 'SERVICOS TERCEIROS' },

  // ── MONTAGEM / CONSERTO — antes de "pneu " genérico ─────────
  { k: 'montagem pneu',            g: 'MONTAGEM PNEU' },
  { k: 'conserto/desempeno roda',  g: 'CONSERTO RODA/REFORMA' },
  { k: 'desempeno roda',           g: 'CONSERTO RODA/REFORMA' },
  { k: 'conserto roda',            g: 'CONSERTO RODA/REFORMA' },
  { k: 'reparo roda',              g: 'CONSERTO RODA/REFORMA' },
  { k: 'conserto furo',            g: 'CONSERTO PNEU' },
  { k: 'conserto de furo',         g: 'CONSERTO PNEU' },
  { k: 'rodizio pneus',            g: 'MONTAGEM PNEU' },
  { k: 'rodizio ',                 g: 'MONTAGEM PNEU' },

  // ── PNEUS — específico antes do genérico ─────────────────────
  { k: 'pneu usado',               g: 'PNEU USADO' },
  { k: 'goodyear cargo',           g: 'PNEU NACIONAL CARGA LEVE' },
  { k: 'goodyear ',                g: 'PNEU NACIONAL PASSEIO/SUV' },
  { k: 'pirelli ',                 g: 'PNEU NACIONAL PASSEIO/SUV' },
  { k: 'continental ',             g: 'PNEU NACIONAL PASSEIO/SUV' },
  { k: 'bridgestone ',             g: 'PNEU NACIONAL PASSEIO/SUV' },
  { k: 'michelin ',                g: 'PNEU NACIONAL PASSEIO/SUV' },
  { k: 'firestone ',               g: 'PNEU NACIONAL PASSEIO/SUV' },
  { k: 'dunlop ',                  g: 'PNEU NACIONAL PASSEIO/SUV' },
  { k: 'zelda ',                   g: 'PNEU IMPORTADO CARGA LEVE' },
  { k: 'linglong',                 g: 'PNEU IMPORTADO PASSEIO/SUV' },
  { k: 'westlake',                 g: 'PNEU IMPORTADO PASSEIO/SUV' },
  { k: 'speedmax',                 g: 'PNEU IMPORTADO PASSEIO/SUV' },
  { k: 'xbri',                     g: 'PNEU IMPORTADO PASSEIO/SUV' },
  { k: 'pneu ',                    g: 'PNEU IMPORTADO PASSEIO/SUV' }, // fallback genérico

  // ── OUTROS ────────────────────────────────────────────────────
  { k: 'bateria veicular',         g: 'BATERIA' },
  { k: 'bateria ',                 g: 'BATERIA' },
  { k: 'parafuso roda',            g: 'PARAFUSO RODA' },
  { k: 'porca roda',               g: 'PARAFUSO RODA' },
  { k: 'parafuso ',                g: 'PARAFUSO GERAL' },
  { k: 'porca ',                   g: 'PARAFUSO GERAL' },
  { k: 'espassador roda',          g: 'CALOTA RODA' },
  { k: 'roda original',            g: 'RODA ESPORTIVA' },
  { k: 'limpeza molecular',        g: 'LIMPEZA INJECAO PECA' },
  { k: 'descarbonizante',          g: 'MATERIAL LIMPEZA' },
  { k: 'br total',                 g: 'BR TOTAL' },
  { k: 'garantia estendida',       g: 'GARANTIA ESTENDIDA' },
  { k: 'spray pintura',            g: 'MATERIAL OPERACIONAL' },
  { k: 'excluida',                 g: 'CANCELADA' },
  { k: 'desistencia',              g: 'CANCELADA' },
];

// Encontra o grupo NexusZ pelo nome normalizado (sem acentos)
function findGrupoByNormName(g, grupoMap) {
  const gNorm = norm(g);
  for (const [nome, obj] of grupoMap) {
    if (norm(nome) === gNorm) return obj;
  }
  for (const [nome, obj] of grupoMap) {
    const nomeN = norm(nome);
    if (nomeN.includes(gNorm) && gNorm.length >= nomeN.length - 5) return obj;
  }
  return null;
}

function manualMatch(desc, grupoMap) {
  // Normaliza sem acentos mas PRESERVA parênteses e pontuação para matches de '(cortesia)' etc.
  const low = desc.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const rule of MANUAL) {
    // Suporte a k2: ambas as keywords devem estar presentes
    const match = low.includes(rule.k) && (!rule.k2 || low.includes(rule.k2));
    if (match) {
      const obj = findGrupoByNormName(rule.g, grupoMap);
      if (obj) return { grupo: obj, via: 'manual', score: 1.0 };
    }
  }
  return null;
}

function autoScore(descTokens, grupoTokens) {
  if (!grupoTokens.length) return 0;
  const descSet = new Set(descTokens);
  let hits = 0;
  for (const t of grupoTokens) {
    if (descSet.has(t)) { hits++; continue; }
    for (const dt of descTokens) {
      if (dt.includes(t) || t.includes(dt)) { hits += 0.6; break; }
    }
  }
  return hits / grupoTokens.length;
}

(async () => {
  console.log('=== Mapeador de Grupos por Descrição ===\n');

  // 1. Busca grupos NexusZ
  const { body: grupos } = await supaReq('GET', '/rest/v1/os_grupos?select=id,grupo,area_id&order=grupo');
  if (!Array.isArray(grupos)) { console.error('Erro os_grupos:', grupos); process.exit(1); }
  const grupoMap = new Map(grupos.map(g => [g.grupo, g]));
  const grupoTokensList = grupos.map(g => ({ obj: g, tokens: tokenize(g.grupo) }));
  console.log(`Grupos NexusZ: ${grupos.length}`);

  // 2. Busca itens sem grupo
  const { body: semGrupo } = await supaReq('POST', '/rest/v1/rpc/get_itens_sem_grupo', { p_limit: 500 });
  if (!Array.isArray(semGrupo)) { console.error('Erro get_itens_sem_grupo:', semGrupo); process.exit(1); }
  console.log(`Itens sem grupo: ${semGrupo.length}\n`);

  // 3. Para cada descrição, tenta encontrar o melhor grupo
  const confiantes = [];
  const duvidosos  = [];
  const semMatch   = [];

  for (const item of semGrupo) {
    const desc = item.descricao.trim();
    const descTok = tokenize(desc);

    const manual = manualMatch(desc, grupoMap);
    if (manual) {
      confiantes.push({ desc, fat: item.fat, qtd: item.qtd, ...manual });
      continue;
    }

    let best = null;
    for (const { obj, tokens } of grupoTokensList) {
      const s = autoScore(descTok, tokens);
      if (!best || s > best.score) best = { grupo: obj, score: s, via: 'auto' };
    }

    if (!best || best.score === 0) { semMatch.push({ desc, fat: item.fat }); continue; }
    if (best.score >= MIN_SCORE)   { confiantes.push({ desc, fat: item.fat, qtd: item.qtd, ...best }); }
    else                           { duvidosos.push({ desc, fat: item.fat, qtd: item.qtd, ...best }); }
  }

  // 4. Exibe resultados
  const fmtFat = n => `R$${(n||0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g,'.')}`;
  const bar = '─'.repeat(80);

  console.log(`${bar}`);
  console.log(`CONFIANTES (score >= ${MIN_SCORE}): ${confiantes.length} itens`);
  console.log(`${bar}`);
  confiantes.sort((a,b) => b.fat - a.fat).forEach(m => {
    const conf = m.score === 1.0 ? '★ manual' : `${(m.score*100).toFixed(0)}%`;
    console.log(`  ${conf.padEnd(9)} ${m.grupo.grupo.padEnd(40)} ← "${m.desc.slice(0,55)}"`);
    if (m.fat > 0) console.log(`             qtd:${m.qtd||'?'} fat:${fmtFat(m.fat)}`);
  });

  if (duvidosos.length) {
    console.log(`\n${bar}`);
    console.log(`DUVIDOSOS (score < ${MIN_SCORE}): ${duvidosos.length} — revisar manualmente`);
    console.log(`${bar}`);
    duvidosos.sort((a,b) => b.fat - a.fat).forEach(m => {
      console.log(`  ${(m.score*100).toFixed(0).padEnd(4)}% ${m.grupo.grupo.padEnd(40)} ← "${m.desc.slice(0,55)}"`);
    });
  }

  if (semMatch.length) {
    console.log(`\n${bar}`);
    console.log(`SEM MATCH: ${semMatch.length} itens`);
    console.log(`${bar}`);
    semMatch.sort((a,b) => b.fat - a.fat).forEach(m =>
      console.log(`  fat:${fmtFat(m.fat).padEnd(10)} "${m.desc}"`)
    );
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Confiantes: ${confiantes.length} | Duvidosos: ${duvidosos.length} | Sem match: ${semMatch.length}`);
  console.log(`Faturamento total sem grupo:    ${fmtFat(semGrupo.reduce((s,i)=>s+(i.fat||0),0))}`);
  console.log(`Faturamento que será mapeado:   ${fmtFat(confiantes.reduce((s,i)=>s+(i.fat||0),0))}`);

  if (DRY) {
    console.log(`\n[DRY RUN] Para gravar os confiantes, rode com --gravar`);
    return;
  }

  // 5. Grava mapeamentos confiantes
  if (!confiantes.length) { console.log('\nNada a gravar.'); return; }

  console.log(`\nGravando ${confiantes.length} mapeamentos no Supabase...`);
  const payload = confiantes.map(m => ({ descricao: m.desc, grupo_id: m.grupo.id }));
  const LOTE = 50;
  for (let i = 0; i < payload.length; i += LOTE) {
    const lote = payload.slice(i, i + LOTE);
    const { status, body } = await supaReq('POST', '/rest/v1/os_descricao_grupo?on_conflict=descricao', lote);
    console.log(`  Lote ${Math.floor(i/LOTE)+1}: status ${status}`, status >= 300 ? JSON.stringify(body).slice(0,200) : 'OK');
  }

  // 6. Roda assign_item_grupos
  console.log('\nRodando assign_item_grupos...');
  const { status: s2, body: r2 } = await supaReq('POST', '/rest/v1/rpc/assign_item_grupos', {});
  console.log(`assign_item_grupos: status ${s2} — ${JSON.stringify(r2)}`);

  console.log('\nPronto!');
})().catch(e => { console.error('ERRO:', e); process.exit(1); });
