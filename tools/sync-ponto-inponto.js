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

if (!AUTH) {
  console.error("❌ Defina INPONTO_TOKEN no .env");
  process.exit(1);
}

// Suporte a múltiplas empresas via INPONTO_COMPANY_N / INPONTO_USER_N
// Fallback para variáveis legadas INPONTO_COMPANY_ID / INPONTO_USER_ID
function carregarEmpresas() {
  const empresas = [];
  for (let i = 1; i <= 20; i++) {
    const id     = process.env[`INPONTO_COMPANY_${i}`];
    const userId = process.env[`INPONTO_USER_${i}`];
    if (id && userId) empresas.push({ id, userId });
    else if (i > 4) break;
  }
  if (empresas.length === 0) {
    // Fallback legado
    const id     = process.env.INPONTO_COMPANY_ID;
    const userId = process.env.INPONTO_USER_ID;
    if (id && userId) empresas.push({ id, userId });
    else { console.error("❌ Defina INPONTO_COMPANY_1/INPONTO_USER_1 (ou INPONTO_COMPANY_ID/USER_ID) no .env"); process.exit(1); }
  }
  return empresas;
}
const EMPRESAS = carregarEmpresas();

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

// Buscar lat/lng recursivamente em um objeto (usado para extrair coords do geofence)
// Rejeita 0,0 (coordenada inválida/nula)
function encontrarCoordenadas(obj, depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 6) return null;
  const isValido = (lat, lng) => Math.abs(lat) > 0.001 || Math.abs(lng) > 0.001;
  if (typeof obj.latitude === "number" && typeof obj.longitude === "number" && isValido(obj.latitude, obj.longitude)) {
    return { lat: obj.latitude, lng: obj.longitude };
  }
  if (typeof obj.lat === "number" && typeof obj.lng === "number" && isValido(obj.lat, obj.lng)) {
    return { lat: obj.lat, lng: obj.lng };
  }
  for (const val of Object.values(obj)) {
    if (val && typeof val === "object") {
      const found = encontrarCoordenadas(val, depth + 1);
      if (found) return found;
    }
  }
  return null;
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

  console.log(`🏢 ${EMPRESAS.length} empresa(s) InPonto configurada(s)`);

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

  // ── Montar mapas de lookup ──────────────────────────────────────────────
  const cpfMap = {};
  const inpontoIdMap = {};
  const nomeMap = {}; // nome normalizado → colaborador

  function normNome(n) {
    return (n || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/\s+/g, " ").trim();
  }

  colaboradores.forEach(c => {
    if (c.cpf) {
      const cpfLimpo = c.cpf.replace(/\D/g, "");
      if (cpfLimpo) cpfMap[cpfLimpo] = c;
    }
    if (c.inponto_employee_id) inpontoIdMap[c.inponto_employee_id] = c;
    const nn = normNome(c.nome);
    if (nn) nomeMap[nn] = c;
  });

  // ── Loop por empresa → buscar ocorrências e salvar ──────────────────────
  let synced = 0, notFound = 0, errors = 0;
  const notFoundList = [];

  // Calcula data de hoje em formato DD/MM/YYYY (BRT) para uso no team-status
  const nowBRT = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const todayKey = `${nowBRT.getFullYear()}-${String(nowBRT.getMonth()+1).padStart(2,"0")}-${String(nowBRT.getDate()).padStart(2,"0")}`;
  const todayBRTStr = `${String(nowBRT.getDate()).padStart(2,"0")}/${String(nowBRT.getMonth()+1).padStart(2,"0")}/${nowBRT.getFullYear()}`;

  for (const empresa of EMPRESAS) {
    const { id: COMPANY, userId: USER_ID } = empresa;
    console.log(`\n📡 Empresa ${COMPANY} — buscando pontos...`);
    const occRes = await httpPost(
      `get-occurrences-from-company-range?company-token-pg=${COMPANY}&userId=${USER_ID}`,
      {
        companyId: COMPANY,
        occurrences: ["21", "22", "23", "24", "25", "26", "27"],
        considerFlexibleAsStrong: true,
        tolerance: "10m",
        startDate: startStr,
        endDate: endStr,
        team: ["all"],
        userId: USER_ID,
      }
    );

    if (occRes.status !== 200 || !occRes.body?.employees) {
      console.error(`  ❌ Falha (${occRes.status}):`, JSON.stringify(occRes.body).substring(0, 200));
      continue; // tenta próxima empresa
    }

    const employeeEntries = occRes.body.employees;
    console.log(`  ✅ ${employeeEntries.length} funcionários com registros`);

  for (const entry of employeeEntries) {
    const emp = entry.employee;
    const cpfLimpo = (emp.cpf || "").replace(/\D/g, "");

    // Encontrar colaborador no NexusZ: CPF > inponto_id > nome normalizado
    let colab = (cpfLimpo && cpfMap[cpfLimpo])
      || inpontoIdMap[emp.id]
      || nomeMap[normNome(emp.name)];

    if (!colab) {
      notFound++;
      notFoundList.push({ nome: emp.name, cpf: emp.cpf, inponto_id: emp.id });
      continue;
    }

    // Persistir inponto_employee_id para acelerar lookups futuros
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
      const PHOTO_BASE = process.env.INPONTO_PHOTO_BASE_URL || null; // ex: https://firebasestorage.googleapis.com/v0/b/BUCKET/o/
      const batidasGeo = pontosOrdenados.map(p => {
        const rawFoto = p.pictureFromMobile || p.photo || p.photoUrl || p.foto || p.fotoUrl || null;
        const foto = rawFoto ? (PHOTO_BASE ? PHOTO_BASE + encodeURIComponent(rawFoto) + '?alt=media' : rawFoto) : null;
        return { t: p.localDate || p.date, lat: p.latitude ?? null, lng: p.longitude ?? null, foto };
      });
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
        batidas_geo: batidasGeo,
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
  } // fim loop employeeEntries
    // ── Sync complementar via get-team-status (captura sem ocorrência) ──────
    // Só roda se o período cobre hoje (TODAY_ONLY ou DAYS_BACK >= 0)
    const abrangeFim = new Date(endDate);
    const abrangeHoje = abrangeFim >= new Date(todayKey);
    if (abrangeHoje) {
      console.log(`  ℹ️  Sincronizando ponto do dia via get-team-status (${todayBRTStr})...`);
      const tsRes = await httpGet(
        `${API_BASE}/get-team-status?company-token-pg=${COMPANY}&date=${todayBRTStr}`
      );

      if (tsRes.status === 200 && Array.isArray(tsRes.body) && tsRes.body.length > 0) {
        const emJornada = tsRes.body;
        console.log(`    ${emJornada.length} funcionários em jornada hoje`);

        for (const ts of emJornada) {
          const empId = ts.employeeId;
          const entradaHora = ts.time; // "HH:MM"
          if (!entradaHora) continue;

          // Lookup no NexusZ
          let colab = inpontoIdMap[empId];
          if (!colab) {
            colab = nomeMap[normNome(ts.name)];
          }
          if (!colab) {
            // Já será marcado como notFound no loop de ocorrências
            continue;
          }

          // Buscar coordenadas do geofence como fallback de localização
          // (usado quando o funcionário não tem ocorrências — ponto perfeito)
          let geoFallback = null;
          try {
            const infoRes = await httpGet(
              `${API_BASE}/get-employee-info?company-token-pg=${COMPANY}&employee-token-pg=${empId}`
            );
            if (infoRes.status === 200 && infoRes.body?.journeyRule) {
              const coords = encontrarCoordenadas(infoRes.body.journeyRule);
              if (coords) geoFallback = coords;
            }
          } catch (_) {}

          const upsert = {
            colaborador_id: colab.id,
            data: todayKey,
            inponto_employee_id: empId,
            entrada: entradaHora,
            ...(geoFallback && {
              batidas_geo: [{ t: new Date().toISOString(), lat: geoFallback.lat, lng: geoFallback.lng, foto: null }],
            }),
            sincronizado_em: new Date().toISOString(),
          };

          if (DRY_RUN) {
            console.log(`    [DRY] team-status: ${ts.name?.trim()} → entrada ${entradaHora}${geoFallback ? ` (geofence: ${geoFallback.lat},${geoFallback.lng})` : " (sem geo)"}`);
          } else {
            // Verificar se já existe registro para hoje
            const { data: existente } = await supabase
              .from("rh_pontos")
              .select("id, batidas_geo")
              .eq("colaborador_id", colab.id)
              .eq("data", todayKey)
              .maybeSingle();

            if (!existente) {
              // Sem registro: inserir com geofence coords se disponível
              const { error: uErr } = await supabase.from("rh_pontos").insert(upsert);
              if (uErr) { console.error(`    ❌ team-status insert ${ts.name?.trim()}: ${uErr.message}`); errors++; }
              else synced++;
            } else if (geoFallback && (!existente.batidas_geo || existente.batidas_geo.length === 0)) {
              // Registro existe mas sem localização: enriquecer com geofence
              const { error: uErr } = await supabase
                .from("rh_pontos")
                .update({ batidas_geo: upsert.batidas_geo, sincronizado_em: upsert.sincronizado_em })
                .eq("id", existente.id);
              if (uErr) { console.error(`    ❌ team-status geo-update ${ts.name?.trim()}: ${uErr.message}`); errors++; }
              else synced++;
            }
            // Se já tem batidas_geo: não sobrescrever (preservar coordenadas exatas da ocorrência)
          }
        }
      } else {
        console.log(`    ⚠️  get-team-status: ${tsRes.status} — ${JSON.stringify(tsRes.body).substring(0,100)}`);
      }
    }
  } // fim loop EMPRESAS

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
