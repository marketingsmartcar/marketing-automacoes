'use strict';
/**
 * coletar-vendas-pneus.js
 *
 * Coleta vendas de pneus por item (grupo/descricao/medida/marca) via API OI
 * para todas as lojas e grava na tabela vendas_pneus do Supabase.
 *
 * Uso:
 *   node tools/coletar-vendas-pneus.js                    # ontem
 *   node tools/coletar-vendas-pneus.js 2026-05-28         # data específica
 *   node tools/coletar-vendas-pneus.js --inspecionar      # mostra itens brutos (sem gravar)
 */

require('dotenv').config();
const https = require('https');

const BASE_URL = 'https://www.oiapi.com.br/ws/v2/IntegracaoOficinaInteligente.asmx';

const NEXUSZ_URL = process.env.NEXUSZ_SUPABASE_URL;
const NEXUSZ_KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY;

// Mapeamento loja → código usado na tabela vendas_pneus
const LOJAS = [
  { key: 'BR01_CENTRO',     loja: 'BR01', nome: 'BR Pneus Araraquara Centro', alt: true  },
  { key: 'BR02_VILA',       loja: 'BR02', nome: 'BR Pneus Araraquara Vila',   alt: false },
  { key: 'BR03_AMERICANA',  loja: 'BR03', nome: 'BR Pneus Americana',         alt: true  },
  { key: 'BR04_SAO_CARLOS', loja: 'BR04', nome: 'BR Pneus São Carlos',        alt: false },
  { key: 'BR05_MARINGA',    loja: 'BR05', nome: 'BR Pneus Maringá',           alt: false },
  { key: 'PEG1_ARARAQUARA', loja: 'PEG1', nome: 'Peg Pneus Araraquara',      alt: false },
  { key: 'PEG2_SOROCABA',   loja: 'SOR1', nome: 'Peg Pneus Sorocaba',        alt: false },
];

// Grupos de pneu — usados para classificar cada item
const GRUPOS_PNEU = [
  'PNEU IMPORTADO (CURVA A)',
  'PNEU IMPORTADO (PROMOCIONAL)',
  'PNEU IMPORTADO AGRICOLA',
  'PNEU IMPORTADO ALL TERRAIN',
  'PNEU IMPORTADO CAMIONETE',
  'PNEU IMPORTADO CARGA LEVE',
  'PNEU IMPORTADO CARGA PESADA',
  'PNEU IMPORTADO INDUSTRIAL',
  'PNEU IMPORTADO MOTO',
  'PNEU IMPORTADO PASSEIO/SUV',
  'PNEU IMPORTADO PERFIL BAIXO',
  'PNEU IMPORTADO RUNFLAT',
  'PNEU NACIONAL AGRICOLA',
  'PNEU NACIONAL ALL TERRAIN',
  'PNEU NACIONAL CAMIONETE',
  'PNEU NACIONAL CARGA LEVE',
  'PNEU NACIONAL CARGA PESADA',
  'PNEU NACIONAL INDUSTRIAL',
  'PNEU NACIONAL MOTO',
  'PNEU NACIONAL PASSEIO/SUV',
  'PNEU NACIONAL PERFIL BAIXO',
  'PNEU NACIONAL RUNFLAT',
];

// Marcas nacionais conhecidas (para distinguir nacional × importado)
const MARCAS_NACIONAIS = new Set([
  'PIRELLI','MICHELIN','BRIDGESTONE','GOODYEAR','FIRESTONE','DUNLOP',
  'CONTINENTAL', // licenciada no BR
]);

const SLEEP = ms => new Promise(r => setTimeout(r, ms));

// ── Helpers ───────────────────────────────────────────────────────────────────

function getToken(loja) {
  const key = loja.alt
    ? `OI_TOKEN_ALT_${loja.key}`
    : `OI_TOKEN_${loja.key}`;
  return process.env[key] || null;
}

function formatDateOI(d) {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function apiGet(endpoint, params) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}/${endpoint}?${new URLSearchParams(params)}`;
    https.get(url, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body), raw: body }); }
        catch { resolve({ status: res.statusCode, data: null, raw: body.slice(0, 200) }); }
      });
    }).on('error', reject);
  });
}

// ── Parsers ───────────────────────────────────────────────────────────────────

// OI format: "PNEU NNN NN RR BRAND MODEL LOAD_SPEED (extra)"
// All three dimension numbers are separated by spaces (not slashes)

/**
 * Extrai width, aspect, rim da descrição OI.
 * Retorna { w, a, r } ou null se não encontrar.
 */
function extrairDimensoes(desc) {
  // Formato OI com espaços: "PNEU 195 65 15" ou "PNEU 195 65 R15" (com ou sem R antes do aro)
  const m = desc.match(/^PNEU\s+(\d{2,3})\s+(\d{2,3})\s+[Rr]?(\d{1,2}(?:\.\d)?)\b/i);
  if (m) return { w: parseInt(m[1],10), a: parseInt(m[2],10), r: parseFloat(m[3]) };

  // Formato com barras: "PNEU 195/65R15", "PNEU 195/65 R15" ou "PNEU 90/90-18"
  const m2 = desc.match(/^PNEU\s+(\d{2,3})\/(\d{2,3})\s*[Rr-]\s*(\d{1,2}(?:\.\d)?)/i);
  if (m2) return { w: parseInt(m2[1],10), a: parseInt(m2[2],10), r: parseFloat(m2[3]) };

  // Formato com ponto: "PNEU 195.65R15" (variação menos comum)
  const m3 = desc.match(/^PNEU\s+(\d{2,3})\.(\d{2,3})[Rr](\d{1,2}(?:\.\d)?)/i);
  if (m3) return { w: parseInt(m3[1],10), a: parseInt(m3[2],10), r: parseFloat(m3[3]) };

  return null;
}

function extrairMedida(desc) {
  const d = extrairDimensoes(desc);
  if (!d) return '';
  const isMoto = d.w <= 130; // larguras moto: 60, 70, 80, 90, 100, 110, 120, 130
  return isMoto ? `${d.w}/${d.a}-${d.r}` : `${d.w}/${d.a}R${d.r}`;
}

function extrairMarca(desc) {
  // Após "PNEU NNN NN RR", a próxima palavra é a marca
  const m = desc.match(/^PNEU\s+\d{2,3}\s+\d{2,3}\s+\d{1,2}\s+([A-Z][A-Z0-9\-\.]*)/i);
  if (m) return m[1].toUpperCase();

  // Fallback para formato com barra
  const m2 = desc.match(/^PNEU\s+\d[\d\/Rr\-\.]+\s+([A-Z][A-Z0-9\-\.]*)/i);
  if (m2) return m2[1].toUpperCase();

  return 'DESCONHECIDA';
}

/**
 * Determina o grupo do pneu baseado na descrição e dimensões.
 */
function determinarGrupo(desc) {
  const d  = desc.toUpperCase();
  const dim = extrairDimensoes(desc);

  // Marca (4ª palavra após PNEU NNN NN RR)
  const marcaToken = extrairMarca(desc);
  const isNacional = MARCAS_NACIONAIS.has(marcaToken);
  const prefixo = isNacional ? 'PNEU NACIONAL' : 'PNEU IMPORTADO';

  // Moto: largura ≤ 130 mm ou palavra "MOTO" na descrição
  if (d.includes('MOTO') || (dim && dim.w <= 130)) return `${prefixo} MOTO`;

  // Agrícola
  if (d.includes('AGRICOLA') || d.includes('AGRÍCOLA') || d.includes('TRATOR'))
    return `${prefixo} AGRICOLA`;

  // Carga pesada (caminhão)
  if (d.includes('CARGA PESADA') || d.includes('CAMINHAO') || d.includes('CAMINHÃO') ||
      /\bTBR\b/.test(d) || d.includes(' 22.5') || d.includes('22 5'))
    return `${prefixo} CARGA PESADA`;

  // Carga leve (van/utilitário) — lonas/PR indicam carga
  if (d.includes('CARGA LEVE') || d.includes(' VAN ') || d.includes('UTILITARIO') ||
      /\b(6|8|10|12)\s*(LONAS|PR|PLY)\b/.test(d) ||
      d.includes('LT ') || /\bC\b/.test(d))
    return `${prefixo} CARGA LEVE`;

  // All Terrain
  if (d.includes('ALL TERRAIN') || /\bA\/T\b/.test(d) || d.includes(' ATR ') ||
      d.includes(' AT ') || d.includes('(MISTO)'))
    return `${prefixo} ALL TERRAIN`;

  // Camionete/SUV off-road
  if (d.includes('CAMIONETE') || d.includes('PICKUP') || /\bH\/T\b/.test(d) ||
      d.includes(' HT ') || d.includes('(LISO)') || d.includes('M/T') || d.includes(' MT '))
    return `${prefixo} CAMIONETE`;

  // Runflat
  if (d.includes('RUNFLAT') || d.includes('RUN FLAT') || /\bROF\b/.test(d) || /\bSSR\b/.test(d))
    return `${prefixo} RUNFLAT`;

  // Perfil baixo: aspect ≤ 45
  if (d.includes('PERFIL BAIXO') || d.includes('UHP') || (dim && dim.a <= 45))
    return `${prefixo} PERFIL BAIXO`;

  // Industrial
  if (d.includes('INDUSTRIAL') || d.includes('EMPILHADEIRA') || d.includes('RETRO'))
    return `${prefixo} INDUSTRIAL`;

  // Fallback
  if (isNacional) return 'PNEU NACIONAL PASSEIO/SUV';

  // Importado: CURVA A se marca premium, PROMOCIONAL senão
  const MARCAS_CURVA_A = new Set([
    'CONTINENTAL','DUNLOP','HANKOOK','YOKOHAMA','KUMHO',
    'NANKANG','NEXEN','TOYO','FALKEN','COOPER','GENERAL','UNIROYAL',
    'BARUM','SAVA','KLEBER','SEMPERIT','MATADOR',
  ]);
  return MARCAS_CURVA_A.has(marcaToken)
    ? 'PNEU IMPORTADO (CURVA A)'
    : 'PNEU IMPORTADO (PROMOCIONAL)';
}

// ── Coleta de OS ──────────────────────────────────────────────────────────────

async function coletarOSLoja(loja, dataOI) {
  const token = getToken(loja);
  if (!token) {
    console.log(`  ⚠️  ${loja.nome}: sem token no .env — pulando`);
    return null;
  }

  const r = await apiGet('OrdemDeServicoJSON', { token, data: dataOI });

  if (r.status !== 200 || !Array.isArray(r.data)) {
    console.log(`  ❌ ${loja.nome}: HTTP ${r.status} — ${r.raw.slice(0,100)}`);
    return null;
  }

  return r.data;
}

/**
 * Processa array de OS e retorna linhas para inserir em vendas_pneus.
 * Cada linha representa (loja, data, grupo, descricao, medida, marca) agrupado.
 */
function processarOS(osList, lojaCode, dataISO, inspecionar) {
  // Acumula qtd e faturamento por chave composta
  const acc = new Map();

  let totalItens = 0;
  let pneuItens  = 0;

  for (const os of osList) {
    if (!Array.isArray(os.Itens)) continue;
    for (const item of os.Itens) {
      totalItens++;
      const desc = (item.DescricaoDoItem || item.Descricao || '').trim().toUpperCase();
      if (!desc.startsWith('PNEU')) continue;
      // Ignora pneus usados (retiradas) — não são vendas
      if (desc.includes('USADO') || desc.includes('RETIRADA')) continue;

      pneuItens++;

      const qtd        = Number(item.QuantidadeDoItem  ?? item.Quantidade  ?? 0);
      const vUnit      = Number(item.ValorUnitarioDoItem ?? item.ValorUnitario ?? 0);
      const vTotal     = Number(item.ValorTotalDoItem  ?? item.ValorTotal   ?? 0);

      const medida     = extrairMedida(desc);
      const marca      = extrairMarca(desc);
      const grupo      = determinarGrupo(desc);

      if (inspecionar) {
        console.log(`    • ${desc.slice(0,50).padEnd(50)} | medida=${medida.padEnd(10)} | marca=${marca.padEnd(15)} | grupo=${grupo}`);
      }

      // Normaliza descrição: remove a parte de medida+marca do que veio do OI para ficar limpa
      const descNorm = desc;

      const chave = `${grupo}||${descNorm}||${medida}||${marca}`;
      const prev  = acc.get(chave) || { qtd: 0, fat: 0, vUnit };
      acc.set(chave, {
        qtd:   prev.qtd + qtd,
        fat:   prev.fat + vTotal,
        vUnit: prev.vUnit || vUnit, // mantém o primeiro preço unitário
      });
    }
  }

  if (inspecionar) {
    console.log(`  📦 ${totalItens} itens totais | ${pneuItens} pneus`);
  }

  const rows = [];
  for (const [chave, v] of acc) {
    const [grupo, descricao, medida, marca] = chave.split('||');
    rows.push({
      loja:           lojaCode,
      data:           dataISO,
      grupo,
      descricao,
      medida,
      marca,
      quantidade:     v.qtd,
      preco_unitario: v.vUnit,
      faturamento:    v.fat,
    });
  }

  return rows;
}

// ── Supabase ──────────────────────────────────────────────────────────────────

function supabaseRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url     = new URL(NEXUSZ_URL + path);
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      path:     url.pathname + url.search,
      method,
      headers: {
        'apikey':         NEXUSZ_KEY,
        'Authorization':  `Bearer ${NEXUSZ_KEY}`,
        'Content-Type':   'application/json',
        'Prefer':         'resolution=merge-duplicates',
      },
    };
    if (payload) options.headers['Content-Length'] = Buffer.byteLength(payload);

    const req = https.request(options, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function insertVendasPneus(rows) {
  if (!rows.length) return 0;
  const BATCH = 100;
  let ok = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const r = await supabaseRequest('POST', '/rest/v1/vendas_pneus', batch);
    if (r.status < 300) {
      ok += batch.length;
    } else {
      console.log(`  ⚠️  Supabase ${r.status}: ${r.body.slice(0,200)}`);
    }
  }
  return ok;
}

// ── Deletar dia anterior antes de reinserir ───────────────────────────────────

async function deletarDia(loja, dataISO) {
  const r = await supabaseRequest(
    'DELETE',
    `/rest/v1/vendas_pneus?loja=eq.${loja}&data=eq.${dataISO}`,
    null
  );
  return r.status < 300;
}

// ── Progresso no Supabase (sync_jobs) ─────────────────────────────────────────

async function atualizarJob(jobId, campos) {
  if (!jobId || !NEXUSZ_URL || !NEXUSZ_KEY) return;
  return supabaseRequest('PATCH', `/rest/v1/sync_jobs?id=eq.${jobId}`, campos);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args        = process.argv.slice(2);
  const inspecionar = args.includes('--inspecionar');
  const dateArg     = args.find(a => /^\d{4}-\d{2}-\d{2}$/.test(a));
  const jobIdArg    = args.find(a => a.startsWith('--job-id='))?.split('=')[1];

  // Data alvo: ontem por padrão
  const hoje  = new Date();
  let alvo;
  if (dateArg) {
    alvo = new Date(dateArg + 'T12:00:00');
  } else {
    alvo = new Date(hoje);
    alvo.setDate(alvo.getDate() - 1);
  }

  const dataISO = `${alvo.getFullYear()}-${String(alvo.getMonth()+1).padStart(2,'0')}-${String(alvo.getDate()).padStart(2,'0')}`;
  const dataOI  = formatDateOI(alvo);

  if (!NEXUSZ_URL || !NEXUSZ_KEY) {
    console.error('❌ NEXUSZ_SUPABASE_URL ou NEXUSZ_SUPABASE_SERVICE_ROLE_KEY não encontrados no .env');
    process.exit(1);
  }

  console.log(`\n🛞  Coleta de Vendas de Pneus — ${dataISO}`);
  if (inspecionar) console.log('🔍 Modo inspeção — nada será gravado no Supabase\n');
  console.log('='.repeat(60));

  // Marca job como rodando
  if (jobIdArg) {
    await atualizarJob(jobIdArg, {
      status: 'rodando', progresso: 0, mensagem: `Iniciando coleta de ${dataISO}...`,
      lojas_total: LOJAS.length, data_alvo: dataISO
    });
  }

  const totais = { lojas: 0, pneus: 0, erros: 0 };
  const logDetalhe = [];

  for (let idx = 0; idx < LOJAS.length; idx++) {
    const loja = LOJAS[idx];
    console.log(`\n📍 ${loja.nome} (${loja.loja})`);

    const progresso = Math.round((idx / LOJAS.length) * 90); // 0-90 durante coleta
    if (jobIdArg) {
      await atualizarJob(jobIdArg, {
        progresso,
        mensagem: `Coletando ${loja.nome}... (${idx + 1}/${LOJAS.length})`,
        lojas_ok: totais.lojas
      });
    }

    const osList = await coletarOSLoja(loja, dataOI);
    if (!osList) {
      totais.erros++;
      logDetalhe.push({ loja: loja.loja, ok: false, pneus: 0 });
      continue;
    }

    console.log(`   ${osList.length} OS encontradas`);
    const rows = processarOS(osList, loja.loja, dataISO, inspecionar);
    const qtdPneus = rows.reduce((s, r) => s + r.quantidade, 0);
    console.log(`   ${rows.length} linhas de pneu | ${qtdPneus} unidades`);

    if (!inspecionar && rows.length > 0) {
      await deletarDia(loja.loja, dataISO);
      const ok = await insertVendasPneus(rows);
      console.log(`   ✅ ${ok} linhas gravadas`);
    } else if (!inspecionar) {
      console.log('   ℹ️  Sem vendas de pneu no dia');
    }

    totais.lojas++;
    totais.pneus += qtdPneus;
    logDetalhe.push({ loja: loja.loja, ok: true, pneus: qtdPneus });

    await SLEEP(300);
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Concluído: ${totais.lojas} lojas | ${totais.pneus} pneus | ${totais.erros} erros`);

  // Finaliza job
  if (jobIdArg) {
    await atualizarJob(jobIdArg, {
      status: totais.erros === LOJAS.length ? 'erro' : 'concluido',
      progresso: 100,
      mensagem: `Concluído: ${totais.lojas} lojas | ${totais.pneus} pneus | ${totais.erros} erros`,
      lojas_ok: totais.lojas,
      pneus_coletados: totais.pneus,
      concluido_em: new Date().toISOString(),
      log_detalhe: logDetalhe
    });
  }
}

main().catch(async e => {
  console.error('❌ Fatal:', e.message || e);
  process.exit(1);
});
