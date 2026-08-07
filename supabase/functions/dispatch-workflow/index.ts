// Proxy que aciona um workflow_dispatch no GitHub Actions
// Mantém o GitHub PAT no servidor (nunca exposto ao frontend)

const GITHUB_PAT  = Deno.env.get("GITHUB_PAT")!;
const GITHUB_REPO = Deno.env.get("GITHUB_REPO") || "marketingsmartcar/marketing-automacoes";

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
    const { workflow, inputs } = await req.json();
    if (!workflow) throw new Error("Campo 'workflow' obrigatório");

    const url = `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${workflow}/dispatches`;
    const body: Record<string, unknown> = { ref: "main" };
    if (inputs && Object.keys(inputs).length > 0) body.inputs = inputs;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_PAT}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.status === 204) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }

    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text}`);
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }
});
