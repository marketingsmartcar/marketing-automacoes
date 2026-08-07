/**
 * sync-ponto-inponto.js
 * Sincroniza registros de ponto do InPonto para o NexusZ (rh_pontos)
 *
 * Uso:
 *   node tools/sync-ponto-inponto.js             → últimos 30 dias
 *   node tools/sync-ponto-inponto.js --days 7    → últimos 7 dias
 *   node tools/sync-ponto-inponto.js --today      → só hoje
 *   node tools/sync-ponto-inponto.js --mes 07/2026 → mês específico
 *   node tools/sync-ponto-inponto.js --dry-run    → sem salvar no Supabase
 */

require("dotenv").config();
const https = require("https");
const { createClient } = require("@supabase/supabase-js");

// ── Config ───────────────────────────────────────────────────────────────────
const API_BASE = "https://pontogoapi-homolog-production.up.railway.app";
const AUTH     = process.env.INPONTO_TOKEN;
const COMPANY  = process.env.INPONTO_COMPANY_ID;
const USER_ID  = process.env.INPONTO_USER_ID;

if (!AUTH || !COMPANY || !USER_ID) {
  console.error("❌ Defina INPONTO_TOKEN, INPONTO_COMPANY_ID e INPONTO_USER_ID no .env");
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXUSZ_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXUSZ_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const TODAY_ONLY = args.includes("--today");
const daysIdx = args.indexOf("--days");
const mesIdx = args.indexOf("--mes");

let DAYS_BACK = 30;
if (TODAY_ONLY) DAYS_BACK = 0;
else if (daysIdx >= 0) DAYS_BACK = parseInt(args[daysIdx + 1]) || 30;

let FIXED_MES = null; // "MM/YYYY"
if (mesIdx >= 0) FIXED_MES = args[mesIdx + 1];

// ── Helpers ──────────────────────────────────────────────────────────────────
function toGoDate(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function httpGet(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { Authorization: AUTH } }, (res) => {
      let data = "";
      res.on("data", d => { data += d; });
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    }).on("error", e => resolve({ status: 0, body: e.message }));
  });
}

function httpPost(endpoint, payload) {
  const body = JSON.stringify(payload);
  const url = `${API_BASE}/${endpoint}`;
  return new Promise((resolve) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: "POST",
      headers: {
        Authorization: AUTH,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", d => { data += d; });
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on("error", e => resolve({ status: 0, body: e.message }));
    req.write(body);
    req.end();
  });
}

// Calcular horas trabalhadas em minutos a partir de array de batidas (timestamps)
function calcularHoras(batidas) {
  if (!batidas || batidas.length < 2) return 0;
  // Ordenar por horário
  const sorted = [...batidas].sort((a, b) => new Date(a) - new Date(b));
  let totalMin = 0;
  // Pares: (entrada,saida_almoco), (retorno_almoco,saida), ...
  for (let i = 0; i + 1 < sorted.length; i += 2) {
    const start = new Date(sorted[i]);
    const end = new Date(sorted[i + 1]);
    totalMin += Math.max(0, (end - start) / 60000);
  }
  return Math.round(totalMin);
}

// Extrair HH:MM — localDate já está em horário local (BRT), apenas extrair
function toLocalTime(isoStr) {
  if (!isoStr) return null;
  const m = isoStr.match(/T(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : null;
}

// Parsear batidas do dia para os 4 campos: entrada, saida_almoco, retorno_almoco, saida
function parseBatidas(pontos) {
  if (!pontos || pontos.length === 0) return { entrada: null, saida_almoco: null, retorno_almoco: null, saida: null };
  const sorted = [...pontos]
    .sort((a, b) => new Date(a.localDate || a.date) - new Date(b.localDate || b.date))
    .map(p => p.localDate || p.date);

  return {
    entrada: toLocalTime(sorted[0]) || null,
    saida_almoco: sorted.length >= 2 ? toLocalTime(sorted[1]) : null,
    retorno_almoco: sorted.length >= 3 ? toLocalTime(sorted[2]) : null,
    saida: sorted.length >= 4 ? toLocalTime(sorted[3]) : null,
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n⏱️  Sync Ponto InPonto → NexusZ${DRY_RUN ? " (DRY RUN)" : ""}`);
  console.log(`📅 ${TODAY_ONLY ? "Somente hoje" : FIXED_MES ? `Mês ${FIXED_MES}` : `Últimos ${DAYS_BACK} dias`}`);

  // ── Período ─────────────────────────────────────────────────────────────
  let startDate, endDate;
  const now = new Date();

  if (FIXED_MES) {
    const [mm, yyyy] = FIXED_MES.split("/").map(Number);
    startDate = new Date(yyyy, mm - 1, 1);
    endDate = new Date(yyyy, mm, 0); // último dia do mês
  } else {
    endDate = new Date(now);
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - DAYS_BACK);
  }

  const startStr = toGoDate(startDate);
  const endStr = toGoDate(endDate);
  console.log(`📆 Período: ${startStr} → ${endStr}\n`);

  // ── Buscar funcionários do InPonto ───────────────────────────────────────
  console.log("👥 Buscando funcionários do InPonto...");
  const empRes = await httpGet(`${API_BASE}/get-employees?company-token-pg=${COMPANY}&page=1&limit=200`);
  if (empRes.status !== 200 || !empRes.body?.list) {
    console.error("❌ Falha ao buscar funcionários:", empRes.status, JSON.stringify(empRes.body).substring(0, 200));
    process.exit(1);
  }
  const inpontoEmployees = empRes.body.list;
  console.log(`  ✅ ${inpontoEmployees.length} funcionários no InPonto`);

  // ── Buscar colaboradores do NexusZ ───────────────────────────────────────
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ SUPABASE_URL ou SUPABASE_KEY não configurados");
    process.exit(1);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log("🗄️  Buscando colaboradores NexusZ...");
  const { data: colaboradores, error: errColab } = await supabase
    .from("rh_colaboradores")
    .select("id, nome, cpf, status, inponto_employee_id");

  if (errColab) {
    console.error("❌ Erro Supabase:", errColab.message);
    process.exit(1);
  }
  console.log(`  ✅ ${colaboradores.length} colaboradores ativos no NexusZ`);

  // ── Montar mapa CPF → colaborador ────────────────────────────────────────
  const cpfMap = {};
  const inpontoIdMap = {};
  colaboradores.forEach(c => {
    if (c.cpf) {
      const cpfLimpo = c.cpf.replace(/\D/g, "");
      cpfMap[cpfLimpo] = c;
    }
    if (c.inponto_employee_id) inpontoIdMap[c.inponto_employee_id] = c;
  });

  // ── Buscar ocorrências ───────────────────────────────────────────────────
  console.log("\n📡 Buscando registros de ponto...");
  const occRes = await httpPost(
    `get-occurrences-from-company-range?company-token-pg=${COMPANY}&userId=${USER_ID}`,
    {
      companyId: COMPANY,
      occurrences: ["22", "23", "24", "25", "27"],
      considerFlexibleAsStrong: true,
      tolerance: "10m",
      startDate: startStr,
      endDate: endStr,
      team: ["all"],
      userId: USER_ID,
    }
  );

  if (occRes.status !== 200 || !occRes.body?.employees) {
    console.error("❌ Falha ao buscar ocorrências:", occRes.status, JSON.stringify(occRes.body).substring(0, 300));
    process.exit(1);
  }

  const employeeEntries = occRes.body.employees;
  console.log(`  ✅ ${employeeEntries.length} funcionários com registros no período`);

  // ── Processar e salvar ──────────────────────────────────────────────────
  let synced = 0, notFound = 0, errors = 0;
  const notFoundList = [];

  for (const entry of employeeEntries) {
    const emp = entry.employee;
    const cpfLimpo = (emp.cpf || "").replace(/\D/g, "");

    // Encontrar colaborador no NexusZ (por CPF ou inponto_id)
    let colab = cpfMap[cpfLimpo] || inpontoIdMap[emp.id];

    if (!colab) {
      notFound++;
      notFoundList.push({ nome: emp.name, cpf: emp.cpf, inponto_id: emp.id });
      continue;
    }

    // Atualizar inponto_employee_id no colaborador se não tiver
    if (!colab.inponto_employee_id && !DRY_RUN) {
      await supabase
        .from("rh_colaboradores")
        .update({ inponto_employee_id: emp.id })
        .eq("id", colab.id);
    }

    // Agrupar occurrences por dia
    const porDia = {}; // "YYYY-MM-DD" → {points, inconsistencias}
    for (const occ of (entry.occurrences || [])) {
      const dayKey = occ.date.substring(0, 10); // "YYYY-MM-DD"
      if (!porDia[dayKey]) porDia[dayKey] = { pontos: [], inconsistencias: [] };
      if (occ.message) porDia[dayKey].inconsistencias.push(occ.message);
      // Coletar pontos únicos (por ID)
      for (const p of (occ.points || [])) {
        if (!porDia[dayKey].pontos.find(x => x.id === p.id)) {
          porDia[dayKey].pontos.push(p);
        }
      }
    }

    // Upsert no rh_pontos
    const upserts = [];
    for (const [dayKey, dadosDia] of Object.entries(porDia)) {
      const pontosOrdenados = dadosDia.pontos.sort(
        (a, b) => new Date(a.localDate || a.date) - new Date(b.localDate || b.date)
      );
      const batidasTimestamps = pontosOrdenados.map(p => p.localDate || p.date);
      const { entrada, saida_almoco, retorno_almoco, saida } = parseBatidas(pontosOrdenados);
      const horasMin = calcularHoras(batidasTimestamps);
      const horasDec = parseFloat((horasMin / 60).toFixed(2));

      upserts.push({
        colaborador_id: colab.id,
        data: dayKey,
        inponto_employee_id: emp.id,
        entrada,
        saida_almoco,
        retorno_almoco,
        saida,
        horas_trabalhadas: horasDec,
        batidas: batidasTimestamps,
        inconsistencias: dadosDia.inconsistencias,
        sincronizado_em: new Date().toISOString(),
      });
    }

    if (DRY_RUN) {
      console.log(`  [DRY] ${emp.name.trim()}: ${upserts.length} dias`);
      upserts.slice(0, 2).forEach(u => {
        console.log(`    ${u.data}: ${u.entrada || "--"} | ${u.saida_almoco || "--"} | ${u.retorno_almoco || "--"} | ${u.saida || "--"} (${u.horas_trabalhadas}h)`);
        if (u.inconsistencias.length) console.log(`    ⚠️  ${u.inconsistencias.join(", ")}`);
      });
    } else if (upserts.length > 0) {
      const { error } = await supabase
        .from("rh_pontos")
        .upsert(upserts, { onConflict: "colaborador_id,data", ignoreDuplicates: false });
      if (error) {
        console.error(`  ❌ ${emp.name.trim()}: ${error.message}`);
        errors++;
      } else {
        synced += upserts.length;
      }
    }
  }

  // ── Resumo ───────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(50));
  console.log(`✅ Sync concluído!`);
  console.log(`   Registros salvos: ${synced}`);
  console.log(`   Funcionários sem match: ${notFound}`);
  console.log(`   Erros: ${errors}`);

  if (notFoundList.length > 0) {
    console.log("\n⚠️  Não encontrados no NexusZ:");
    notFoundList.forEach(n => console.log(`   ${n.nome?.trim()} | CPF: ${n.cpf} | ID: ${n.inponto_id}`));
  }
})();
