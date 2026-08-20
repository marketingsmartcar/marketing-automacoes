// coleta-doc-url: resolve URL real do documento OI via POST WebForm on-demand
// Chamada pelo NexusZ quando o usuário clica "Visualizar" — sessão exclusiva, sem conflito de batch
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OI_BASE = "https://sistemaoficinainteligente.com.br";
const LOGIN_URL = `${OI_BASE}/Entrar.aspx`;
const RELAT_URL = `${OI_BASE}/wfRelatorioOperacao.aspx`;
const BUSCA_URL = `${OI_BASE}/wfOrdemDeServicoBusca.aspx`;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120";
const BASE_H: Record<string, string> = {
  "User-Agent": UA,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9",
};

const LOJAS: Record<string, string> = {
  BR01: "469", BR03: "2202", BR04: "1524", PEG1: "3098",
};

function ph(html: string, field: string): string {
  const esc = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    html.match(new RegExp(`name="${esc}"[^>]*value="([^"]*)"`))?.[ 1] ??
    html.match(new RegExp(`id="${field.replace(/\$/g, "_")}"[^>]*value="([^"]*)"`))?.[ 1] ??
    ""
  );
}

function exCk(headers: Headers): string[] {
  const h = headers as unknown as { getSetCookie?: () => string[] };
  if (typeof h.getSetCookie === "function") {
    const a = h.getSetCookie();
    if (a.length) return a.map((c) => c.split(";")[0].trim());
  }
  const res: string[] = [];
  for (const [n, v] of headers as unknown as Iterable<[string, string]>)
    if (n.toLowerCase() === "set-cookie") res.push(v.split(";")[0].trim());
  if (!res.length) {
    const sc = headers.get("set-cookie");
    if (sc) sc.split(/,(?=[^;]+=)/).forEach((p) => res.push(p.split(";")[0].trim()));
  }
  return res.filter(Boolean);
}

function mergeCk(base: string, extra: string[]): string {
  const m = new Map<string, string>();
  for (const c of [...base.split("; ").filter(Boolean), ...extra]) {
    const k = c.split("=")[0].trim();
    if (k) m.set(k, c);
  }
  return [...m.values()].join("; ");
}

async function login(email: string, senha: string): Promise<string> {
  const r1 = await fetch(LOGIN_URL, { redirect: "manual", headers: BASE_H });
  const c1 = exCk(r1.headers);
  const h1 = await r1.text();
  const r2 = await fetch(LOGIN_URL, {
    method: "POST",
    headers: { ...BASE_H, "Content-Type": "application/x-www-form-urlencoded", Cookie: c1.join("; ") },
    body: new URLSearchParams({
      __LASTFOCUS: "", tksm_HiddenField: ph(h1, "tksm_HiddenField"),
      __EVENTTARGET: "", __EVENTARGUMENT: "",
      __VIEWSTATE: ph(h1, "__VIEWSTATE"),
      __VIEWSTATEGENERATOR: ph(h1, "__VIEWSTATEGENERATOR"),
      __EVENTVALIDATION: ph(h1, "__EVENTVALIDATION"),
      "Login1$UserName": email, "Login1$Password": senha, "Login1$btnEntrar": "Entrar",
    }).toString(),
    redirect: "manual",
  });
  const c2 = exCk(r2.headers);
  let ck = mergeCk(c1.join("; "), c2);
  await r2.body?.cancel();
  let loc = r2.headers.get("location");
  let steps = 0;
  while (loc && steps < 5) {
    steps++;
    const url = loc.startsWith("http") ? loc : `${OI_BASE}/${loc.replace(/^\//, "")}`;
    const r = await fetch(url, { headers: { ...BASE_H, Cookie: ck }, redirect: "manual" });
    ck = mergeCk(ck, exCk(r.headers));
    loc = r.headers.get("location");
    await r.body?.cancel();
  }
  return ck;
}

async function trocarLoja(ddl: string, ck: string): Promise<string> {
  const r1 = await fetch(RELAT_URL, { headers: { ...BASE_H, Cookie: ck }, redirect: "follow" });
  const h1 = await r1.text();
  const r2 = await fetch(RELAT_URL, {
    method: "POST",
    headers: { ...BASE_H, "Content-Type": "application/x-www-form-urlencoded", Cookie: ck },
    body: new URLSearchParams({
      __VIEWSTATE: ph(h1, "__VIEWSTATE"),
      __VIEWSTATEGENERATOR: ph(h1, "__VIEWSTATEGENERATOR"),
      __EVENTVALIDATION: ph(h1, "__EVENTVALIDATION"),
      __EVENTTARGET: "", __EVENTARGUMENT: "",
      "ctl00$ddlTrocarEmpresa": ddl,
      "ctl00$btnTrocarEmpresa": "Trocar",
    }).toString(),
    redirect: "follow",
  });
  const c2 = exCk(r2.headers);
  await r2.body?.cancel();
  return c2.length > 0 ? mergeCk(ck, c2) : ck;
}

async function buscarOsUrl(osNumero: number, deBR: string, ck: string): Promise<string | null> {
  // Busca a OS para obter o path real (com parâmetros encriptados)
  const r1 = await fetch(BUSCA_URL, { headers: { ...BASE_H, Cookie: ck }, redirect: "follow" });
  const hGet = await r1.text();
  const ck1 = exCk(r1.headers);
  if (ck1.length > 0) ck = mergeCk(ck, ck1);
  const r2 = await fetch(BUSCA_URL, {
    method: "POST",
    headers: { ...BASE_H, "Content-Type": "application/x-www-form-urlencoded", Cookie: ck },
    body: new URLSearchParams({
      __VIEWSTATE: ph(hGet, "__VIEWSTATE"),
      __VIEWSTATEGENERATOR: ph(hGet, "__VIEWSTATEGENERATOR"),
      __EVENTVALIDATION: ph(hGet, "__EVENTVALIDATION"),
      __EVENTTARGET: "", __EVENTARGUMENT: "",
      "ctl00$cph$txtDataInicial": deBR,
      "ctl00$cph$txtDataFinal": deBR,
      "ctl00$cph$chkExibirAberta": "on",
      "ctl00$cph$chkExibirFechada": "on",
      "ctl00$cph$btnBuscar": "Buscar",
    }).toString(),
    redirect: "follow",
  });
  const html = await r2.text();
  // Encontra a linha com o número da OS e extrai o path
  const rowRe = new RegExp(`lkbOrdemDeServicoID[^>]*>\\s*${osNumero}\\s*<`);
  if (!rowRe.test(html)) return null;
  // Extrai o path do link da OS (fncNovaAba ou href)
  const rowIdx = html.search(rowRe);
  const rowSlice = html.slice(Math.max(0, rowIdx - 2000), rowIdx + 200);
  const decoded = rowSlice.replace(/&#39;/g, "'").replace(/&amp;/g, "&");
  const pathMatch = decoded.match(/fncNovaAba\('([^']+)'\)/);
  if (pathMatch) return pathMatch[1];
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const email = Deno.env.get("OI_EMAIL") ?? "";
  const senha = Deno.env.get("OI_SENHA") ?? "";

  if (!email || !senha) {
    return new Response(JSON.stringify({ error: "credenciais OI ausentes" }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  let body: { loja_key?: string; os_numero?: number; data_os?: string; event_target?: string };
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "body JSON inválido" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const { loja_key, os_numero, data_os, event_target } = body;
  if (!loja_key || !os_numero || !data_os || !event_target) {
    return new Response(JSON.stringify({ error: "loja_key, os_numero, data_os e event_target são obrigatórios" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const ddl = LOJAS[loja_key];
  if (!ddl) {
    return new Response(JSON.stringify({ error: `loja_key inválida: ${loja_key}` }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  try {
    // 1. Login
    let ck = await login(email, senha);

    // 2. Troca para a loja correta
    ck = await trocarLoja(ddl, ck);

    // 3. Busca URL real da OS (parâmetros encriptados)
    const [y, mo, d] = data_os.split("-");
    const deBR = `${d}/${mo}/${y}`;
    const osPath = await buscarOsUrl(os_numero, deBR, ck);
    const osUrl = osPath
      ? (osPath.startsWith("http") ? osPath : `${OI_BASE}/${osPath.replace(/^\//, "")}`)
      : `${OI_BASE}/wfOrdemDeServico.aspx?OrdemDeServicoID=${os_numero}`;

    // 4. GET da página da OS (ViewState fresco)
    const rGet = await fetch(osUrl, { headers: { ...BASE_H, Cookie: ck }, redirect: "follow" });
    const freshHtml = await rGet.text();
    const freshUrl = rGet.url || osUrl;
    const tksm = ph(freshHtml, "tksm_HiddenField");

    // 5. POST para disparar o Visualizar do documento
    const rPost = await fetch(freshUrl, {
      method: "POST",
      headers: {
        ...BASE_H,
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: ck,
        Referer: freshUrl,
      },
      body: new URLSearchParams({
        __EVENTTARGET: event_target,
        __EVENTARGUMENT: "",
        __LASTFOCUS: "",
        __VIEWSTATE: ph(freshHtml, "__VIEWSTATE"),
        __VIEWSTATEGENERATOR: ph(freshHtml, "__VIEWSTATEGENERATOR"),
        __EVENTVALIDATION: ph(freshHtml, "__EVENTVALIDATION"),
        ...(tksm ? { tksm_HiddenField: tksm } : {}),
      }).toString(),
      redirect: "manual",
    });

    // 6. Captura URL do documento
    const loc = rPost.headers.get("location");
    if (loc && !loc.includes("wfErro")) {
      const full = loc.startsWith("http") ? loc : `${OI_BASE}/${loc.replace(/^\//, "")}`;
      await rPost.body?.cancel();
      return new Response(JSON.stringify({ ok: true, url: full }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // 7. Fallback: procura URL S3 no body
    const postBody = await rPost.text();
    const s3M = postBody.match(/https?:\/\/apldoc[^"'\s<>]+/i)
      ?? postBody.match(/https?:\/\/[^"'\s<>]+\.s3[^"'\s<>]+/i)
      ?? postBody.match(/window\.open\(['"]([^'"]+)['"]/i)
      ?? postBody.match(/(?:location\.href|top\.location)\s*=\s*['"]([^'"]+)['"]/i);

    if (s3M) {
      const url = (s3M[1] ?? s3M[0]).trim();
      if (!url.includes("wfErro") && url.startsWith("http")) {
        return new Response(JSON.stringify({ ok: true, url }), {
          headers: { ...CORS, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ ok: false, error: "URL do documento não encontrada", loc, bodySnippet: postBody.slice(0, 300) }), {
      status: 404, headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
