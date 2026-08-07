import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GITHUB_PAT  = Deno.env.get("GITHUB_PAT")!;
const GITHUB_REPO = Deno.env.get("GITHUB_REPO") || "marketingsmartcar/marketing-automacoes";
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function dispatchWorkflow(workflow: string, inputs?: Record<string, string>) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${workflow}/dispatches`;
  const body: Record<string, unknown> = { ref: "main" };
  if (inputs && Object.keys(inputs).length > 0) body.inputs = inputs;
  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GITHUB_PAT}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const sb = createClient(SB_URL, SB_KEY);

    // Cria registro de job "pendente" para o frontend acompanhar progresso
    const { data: job } = await sb.from("sync_jobs").insert({
      tipo: "vendas_pneus",
      status: "pendente",
      progresso: 0,
      mensagem: "Iniciando coleta de vendas e OS...",
      iniciado_em: new Date().toISOString(),
    }).select("id").single();

    // Dispara vendas + OS em paralelo (OS roda em self-hosted — falha silenciosa se offline)
    await Promise.allSettled([
      dispatchWorkflow("vendas-auto-update.yml"),
      dispatchWorkflow("coleta-os-tempo-real.yml"),
    ]);

    return new Response(JSON.stringify({ ok: true, jobId: job?.id ?? null }), {
      headers: { "Content-Type": "application/json", ...CORS },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }
});
