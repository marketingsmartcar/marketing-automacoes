import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const API_BASE = "https://pontogoapi-homolog-production.up.railway.app";
const AUTH     = Deno.env.get("INPONTO_TOKEN")!;
const SB_URL   = Deno.env.get("SUPABASE_URL")!;
const SB_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Carrega empresas de INPONTO_COMPANY_N / INPONTO_USER_N (fallback: legado)
function carregarEmpresas(): { id: string; userId: string }[] {
  const lista: { id: string; userId: string }[] = [];
  for (let i = 1; i <= 20; i++) {
    const id     = Deno.env.get(`INPONTO_COMPANY_${i}`);
    const userId = Deno.env.get(`INPONTO_USER_${i}`);
    if (id && userId) lista.push({ id, userId });
    else if (i > 4) break;
  }
  if (lista.length === 0) {
    const id     = Deno.env.get("INPONTO_COMPANY_ID");
    const userId = Deno.env.get("INPONTO_USER_ID");
    if (id && userId) lista.push({ id, userId });
  }
  return lista;
}

function toGoDate(d: Date) {
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}

function toLocalTime(iso: string | null) {
  if (!iso) return null;
  const m = iso.match(/T(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : null;
}

function parseBatidas(pontos: any[]) {
  if (!pontos?.length) return { entrada: null, saida_almoco: null, retorno_almoco: null, saida: null };
  const sorted = [...pontos]
    .sort((a, b) => new Date(a.localDate||a.date).getTime() - new Date(b.localDate||b.date).getTime())
    .map(p => p.localDate || p.date);
  return {
    entrada:        toLocalTime(sorted[0] ?? null),
    saida_almoco:   toLocalTime(sorted[1] ?? null),
    retorno_almoco: toLocalTime(sorted[2] ?? null),
    saida:          toLocalTime(sorted[3] ?? null),
  };
}

function calcularHoras(batidas: string[]) {
  if (batidas.length < 2) return 0;
  const sorted = [...batidas].sort();
  let min = 0;
  for (let i = 0; i + 1 < sorted.length; i += 2) {
    min += Math.max(0, (new Date(sorted[i+1]).getTime() - new Date(sorted[i]).getTime()) / 60000);
  }
  return parseFloat((min / 60).toFixed(2));
}

async function apiPost(path: string, body: unknown) {
  const r = await fetch(`${API_BASE}/${path}`, {
    method: "POST",
    headers: { Authorization: AUTH, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const hoje = new Date();
    const endDate      = body.endDate   ? new Date(body.endDate)   : hoje;
    const defaultStart = new Date(hoje);
    defaultStart.setDate(defaultStart.getDate() - 10);
    const startDate    = body.startDate ? new Date(body.startDate) : defaultStart;

    const sb = createClient(SB_URL, SB_KEY);
    const { data: colabData } = await sb.from("rh_colaboradores").select("id,nome,cpf,inponto_employee_id");

    const cpfMap: Record<string, any> = {};
    const idMap:  Record<string, any> = {};
    for (const c of (colabData || [])) {
      if (c.cpf) cpfMap[c.cpf.replace(/\D/g, "")] = c;
      if (c.inponto_employee_id) idMap[c.inponto_employee_id] = c;
    }

    const EMPRESAS = carregarEmpresas();
    let saved = 0, notFound = 0;

    for (const empresa of EMPRESAS) {
      const { id: COMPANY, userId: USER_ID } = empresa;
      const occRes = await apiPost(
        `get-occurrences-from-company-range?company-token-pg=${COMPANY}&userId=${USER_ID}`,
        { companyId: COMPANY, occurrences: ["22","23","24","25","27"], considerFlexibleAsStrong: true,
          tolerance: "10m", startDate: toGoDate(startDate), endDate: toGoDate(endDate), team: ["all"], userId: USER_ID }
      );

      for (const entry of (occRes.employees || [])) {
        const emp   = entry.employee;
        const colab = cpfMap[(emp.cpf||"").replace(/\D/g,"")] || idMap[emp.id];
        if (!colab) { notFound++; continue; }

        if (!colab.inponto_employee_id) {
          await sb.from("rh_colaboradores").update({ inponto_employee_id: emp.id }).eq("id", colab.id);
        }

        const porDia: Record<string, { pontos: any[]; inconsistencias: string[] }> = {};
        for (const occ of (entry.occurrences || [])) {
          const day = occ.date.substring(0, 10);
          if (!porDia[day]) porDia[day] = { pontos: [], inconsistencias: [] };
          if (occ.message) porDia[day].inconsistencias.push(occ.message);
          for (const p of (occ.points || [])) {
            if (!porDia[day].pontos.find((x: any) => x.id === p.id)) porDia[day].pontos.push(p);
          }
        }

        const upserts = Object.entries(porDia).map(([day, d]) => {
          const sorted = d.pontos.sort((a: any, b: any) =>
            new Date(a.localDate||a.date).getTime() - new Date(b.localDate||b.date).getTime()
          );
          const batidas = sorted.map((p: any) => p.localDate || p.date);
          const { entrada, saida_almoco, retorno_almoco, saida } = parseBatidas(sorted);
          return {
            colaborador_id: colab.id, data: day, inponto_employee_id: emp.id,
            entrada, saida_almoco, retorno_almoco, saida,
            horas_trabalhadas: calcularHoras(batidas),
            batidas, inconsistencias: d.inconsistencias,
            sincronizado_em: new Date().toISOString(),
          };
        });

        if (upserts.length) {
          const { error } = await sb.from("rh_pontos").upsert(upserts, { onConflict: "colaborador_id,data" });
          if (!error) saved += upserts.length;
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, saved, notFound, empresas: EMPRESAS.length }), {
      headers: { "Content-Type": "application/json", ...CORS },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }
});
