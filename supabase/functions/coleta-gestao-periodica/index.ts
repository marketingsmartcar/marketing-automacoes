// v62: extrai URL S3 dos documentos direto do HTML (onclick fncNovaAba) — sem POST
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9",
};

const LOJAS = [
  { key: "BR01", ddl: "469" },
  { key: "BR03", ddl: "2202" },
  { key: "BR04", ddl: "1524" },
  { key: "PEG1", ddl: "3098" },
];

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

function parseBRL(s: string): number {
  if (!s) return 0;
  const n = parseFloat(s.replace(/R\$\s*/g, "").replace(/\./g, "").replace(",", ".").trim());
  return isNaN(n) ? 0 : n;
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .trim();
}

interface BuscaRow {
  os_numero: number;
  hora_inicio: string | null;
  hora_fim: string | null;
  responsavel: string | null;
  pesquisa: string | null;
  os_path: string | null;
}

function parseBuscaTable(html: string): BuscaRow[] {
  const result: BuscaRow[] = [];
  const grdIdx = html.indexOf('id="ctl00_cph_grd"');
  if (grdIdx === -1) return result;
  const tableEnd = html.indexOf("</table>", grdIdx);
  const tableHtml = html.slice(grdIdx, tableEnd > 0 ? tableEnd + 8 : undefined);
  const rowPattern = /<tr[^>]*class="[^"]*Row[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = rowPattern.exec(tableHtml)) !== null) {
    const rowHtml = m[1];
    const osNumMatch = rowHtml.match(/lkbOrdemDeServicoID[^>]*>\s*(\d+)\s*</i);
    if (!osNumMatch) continue;
    const osNum = parseInt(osNumMatch[1]);
    if (!osNum) continue;
    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => stripHtml(c[1]));
    if (cells.length < 10) continue;
    // OI usa &#39; em vez de ' no onclick — decodificar antes do regex
    const rowDecoded = rowHtml.replace(/&#39;/g, "'").replace(/&amp;/g, "&");
    const pathMatch = rowDecoded.match(/fncNovaAba\('([^']+)'\)/);
    result.push({
      os_numero: osNum,
      hora_inicio: cells[2] || null,
      hora_fim: cells[3] || null,
      responsavel: cells[8] || null,
      pesquisa: cells[9] || null,
      os_path: pathMatch?.[1] ?? null,
    });
  }
  return result;
}

function parseDocumentos(html: string): Array<{ descricao: string; data_cadastro: string | null; eventTarget: string | null; url: string | null }> {
  const docs: Array<{ descricao: string; data_cadastro: string | null; eventTarget: string | null; url: string | null }> = [];
  function decodeHtmlEntities(s: string): string {
    return s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
            .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">")
            .replace(/&#(\d+);/g, (_: string, n: string) => String.fromCharCode(parseInt(n))).trim();
  }
  // Percorre todas as <tr> procurando linhas com "Ordem de Serviço" na 1ª célula
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = trRe.exec(html)) !== null) {
    const rowHtml = m[1];
    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(c => decodeHtmlEntities(c[1]));
    if (cells.length < 3) continue;
    if (!/ordem\s+de\s+servi[çc]o/i.test(cells[0])) continue;
    const data_cadastro = /^\d{2}\/\d{2}\/\d{4}$/.test(cells[1]) ? cells[1] : null;
    const descricao = cells[2] || "";
    if (!descricao) continue;
    // Extrai __EVENTTARGET do javascript:WebForm_PostBackOptions
    const etM = rowHtml.match(/WebForm_PostBackOptions\s*\(\s*&quot;([^&]+)&quot;/i)
      ?? rowHtml.match(/WebForm_PostBackOptions\s*\(\s*"([^"]+)"/i);
    const eventTarget = etM?.[1] ?? null;
    // Extrai URL S3 do onclick="fncNovaAba(&#39;https://apldoc...&#39;)" — já presente no HTML
    const urlM = rowHtml.match(/fncNovaAba\(&#39;(https?:\/\/apldoc(?:[^&]|&amp;)*?)&#39;\)/i)
      ?? rowHtml.match(/fncNovaAba\('(https?:\/\/apldoc[^']+)'/i);
    const url = urlM ? urlM[1].replace(/&amp;/g, "&") : null;
    docs.push({ descricao, data_cadastro, eventTarget, url });
  }
  return docs;
}

function extrairOrcamentoId(html: string): string | null {
  // Campo "Orçamento" em "Mais Informações da Ordem de Serviço"
  const m =
    html.match(/[Oo]r[çc]amento[^<]{0,200}?<input[^>]+value="(\d+)"/i) ??
    html.match(/txtOrcamento[^>]*value="(\d+)"/i) ??
    html.match(/OrcamentoID[^>]*value="(\d+)"/i) ??
    html.match(/id="[^"]*Orcamento[^"]*"[^>]*value="(\d+)"/i);
  return m?.[1] || null;
}

function extrairClienteId(html: string): string | null {
  // Link da "lupa" do cliente: href="wfCliente.aspx?ClienteID=XXXX"
  const m =
    html.match(/wfCliente\.aspx\?ClienteID=(\d+)/i) ??
    html.match(/ClienteID=(\d+)/i);
  return m?.[1] || null;
}

function extrairCpf(html: string): string | null {
  // Campo CPF no formulário da OS
  const m =
    html.match(/[Cc][Pp][Ff][^<]{0,100}?<[^>]+value="(\d{3}\.?\d{3}\.?\d{3}-?\d{2})"/i) ??
    html.match(/txtCPF[^>]*value="(\d{3}\.?\d{3}\.?\d{3}-?\d{2})"/i) ??
    html.match(/id="[^"]*CPF[^"]*"[^>]*value="([\d./-]{11,14})"/i);
  return m?.[1] || null;
}

function extrairDropdown(html: string, fieldPattern: string): string | null {
  // Encontra <select name/id contendo fieldPattern> e extrai o <option selected>
  const selRe = new RegExp(`<select[^>]+(?:name|id)="[^"]*${fieldPattern}[^"]*"[^>]*>([\\s\\S]*?)<\\/select>`, "i");
  const selM = selRe.exec(html);
  if (!selM) return null;
  const optM = /<option[^>]+selected[^>]*>([\s\S]*?)<\/option>/i.exec(selM[1]);
  if (!optM) return null;
  return optM[1]
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/&#x([0-9a-fA-F]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .trim() || null;
}

function extrairResponsavel(html: string): string | null {
  return extrairDropdown(html, "ddlResponsavel");
}

function extrairPesquisa(html: string): string | null {
  return extrairDropdown(html, "ddlPesquisa");
}

function extrairTipoOS(html: string): string | null {
  // Dropdown Tipo de OS na seção "Mais Informações da Ordem de Serviço"
  return extrairDropdown(html, "ddlTipo");
}

function inputVal(html: string, ...ids: string[]): string | null {
  for (const id of ids) {
    const m =
      html.match(new RegExp(`id="[^"]*${id}[^"]*"[^>]*value="([^"]*)"`, "i")) ??
      html.match(new RegExp(`name="[^"]*${id}[^"]*"[^>]*value="([^"]*)"`, "i")) ??
      html.match(new RegExp(`name="[^"]*${id}[^"]*"[\\s\\S]{0,60}value="([^"]*)"`, "i"));
    const v = m?.[1]?.trim();
    if (v) return v;
  }
  return null;
}

function parseClientePage(html: string): Record<string, string | null> {
  return {
    nome:          inputVal(html, "txtNomeFantasia", "txtNome"),
    cpf:           inputVal(html, "txtCPFCNPJ", "txtCPF"),
    celular:       inputVal(html, "txtCelular"),
    telefone:      inputVal(html, "txtTelefone1", "txtTelefone"),
    email:         inputVal(html, "txtEmail"),
    dt_nascimento: inputVal(html, "txtDtNascimento", "txtDataNascimento", "txtDtNasc"),
    rg:            inputVal(html, "txtRGInscricao", "txtRG", "txtInscricaoEstadual"),
    cep:           inputVal(html, "txtCEP", "txtCep"),
    logradouro:    inputVal(html, "txtLogradouro", "txtEndereco", "txtRua"),
    numero:        inputVal(html, "txtNumero", "txtNro", "txtNum"),
    complemento:   inputVal(html, "txtComplemento", "txtCompl"),
    bairro:        inputVal(html, "txtBairro"),
    estado:        extrairDropdown(html, "ddlEstado") ?? inputVal(html, "txtEstado"),
    cidade:        extrairDropdown(html, "ddlCidade") ?? inputVal(html, "txtCidade"),
    pais:          extrairDropdown(html, "ddlPais") ?? inputVal(html, "txtPais"),
  };
}

function parseOSPage(html: string): {
  itens: Array<{ codigo: string; executor: string | null }>;
  pagamentos: Array<{ parcela: number; vencimento: string | null; forma: string; valor: number; nro_operacao: string | null; nro_cheque: string | null }>;
  total_os: number; total_servicos: number; total_produtos: number;
  observacoes: string | null;
  documentos: Array<{ descricao: string; data_cadastro: string | null; eventTarget: string | null }>;
  orcamento_id: string | null;
  cliente_oi_id: string | null;
  cpf: string | null;
  responsavel: string | null;
  pesquisa: string | null;
  tipo: string | null;
} {
  // </td> → \t para que split("\t") funcione nas células
  const texto = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/td[^>]*>/gi, "\t")
    .replace(/<\/tr[^>]*>/gi, "\n")
    .replace(/<\/(div|p|li|h[1-6])[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n");

  const itens: Array<{ codigo: string; executor: string | null }> = [];
  const pagamentos: Array<{ parcela: number; vencimento: string | null; forma: string; valor: number; nro_operacao: string | null; nro_cheque: string | null }> = [];

  // Palavras que indicam que uma linha isolada NÃO é executor
  const NAO_EXECUTOR = /^(Associados|Similares|Produto nas outras|Documentos anexados|Total da OS|TOTAL|Pago=>|Pcls|Valor|Restante|Vencimentos|Parcela|Documento|Nota|Histórico|Garantia|Agendamento|Visualizar|XML|e-mail|Sim,|Não|NFe|NFCe|NFSe|Preencher Executor)/i;

  // Escaneia o texto completo para itens — independente de prodIdx.
  // Filtra células vazias antes de checar colunas, pois o OI pode ter células extras.
  // Identifica a região de itens pela maior janela contínua de linhas-item.
  {
    const linhas = texto.split("\n");
    let idx = 0;
    while (idx < linhas.length) {
      const parts = linhas[idx].split("\t").map(s => s.trim()).filter(s => s.length > 0);
      // Linha de item: ≥3 colunas, parts[2] numérica (quantidade ≤ 999), parts[1] tem texto (descrição)
      if (parts.length >= 3 && /^\d+$/.test(parts[2]) && parseInt(parts[2]) < 1000 && parts[0] && parts[1] && parts[1].length > 2) {
        // Código pode vir como "13754 BIC0TR414" — pegar só o primeiro token (antes do primeiro espaço)
        const codigoRaw = parts[0];
        const codigo = codigoRaw.includes(" ") ? codigoRaw.split(" ")[0] : codigoRaw;
        if (!codigo || codigo.length > 25 || /^C.{0,6}digo$/i.test(codigo) || codigo === "TOTAL") { idx++; continue; }

        // Busca executor nas próximas 6 linhas: linha isolada (1 célula) que não seja marcador
        let executor: string | null = null;
        for (let j = idx + 1; j <= idx + 7 && j < linhas.length; j++) {
          const np = linhas[j].split("\t").map(s => s.trim()).filter(s => s.length > 0);
          if (np.length === 1 && np[0].length >= 2 && !NAO_EXECUTOR.test(np[0]) && !/^[\d.,]+$/.test(np[0]) && !/^\d{2}\/\d{2}\//.test(np[0])) {
            executor = np[0];
            break;
          }
          // Para ao encontrar próxima linha de item
          if (np.length >= 3 && /^\d+$/.test(np[2])) break;
        }
        itens.push({ codigo, executor });
      }
      idx++;
    }
  }

  // Pagamentos: extrai direto do HTML (<tr> da seção de pagamentos)
  // Mais robusto que usar texto — não depende da estrutura de tabs.
  {
    const FORMAS_PAG = /\b(pix|dinheiro|cart[aã]o|boleto|cheque|credi[aá]rio|transfer[eê]ncia|dep[oó]sito|financiamento|debito|débito|crédito|credito|pagseguro|vale|convenio|conv[eê]nio)\b/i;
    // Extrai células de uma <tr>
    function trCells(trHtml: string): string[] {
      const cells: string[] = [];
      const re = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(trHtml)) !== null) {
        const txt = m[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&").replace(/&quot;/g, '"')
          .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
          .trim();
        cells.push(txt);
      }
      return cells;
    }
    const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let trM: RegExpExecArray | null;
    while ((trM = trRe.exec(html)) !== null) {
      const cells = trCells(trM[1]).filter(c => c.length > 0);
      if (cells.length < 3) continue;
      const parcelaNum = parseInt(cells[0]);
      if (isNaN(parcelaNum) || parcelaNum <= 0 || parcelaNum > 99) continue;
      const formaCell = cells.find(c => FORMAS_PAG.test(c));
      if (!formaCell) continue;
      const formaIdx = cells.indexOf(formaCell);
      const vencimento = formaIdx > 1 && /^\d{2}\/\d{2}\/\d{4}$/.test(cells[1]) ? cells[1] : null;
      const valor = parseBRL(cells[formaIdx + 1] || "");
      const nro_operacao = cells[formaIdx + 2]?.trim() || null;
      if (valor <= 0) continue;
      pagamentos.push({ parcela: parcelaNum, vencimento, forma: formaCell, valor, nro_operacao, nro_cheque: null });
    }
  }

  const totalOSM = texto.match(/TOTAL\s+O\.?S\.?[^\d]*([\d.,]+)/i);
  const servM = texto.match(/SERVI[\s\S]{0,5}OS\s+([\d.,]+)/i);
  const prodM = texto.match(/PRODUTOS\s+([\d.,]+)/i);

  // Extrai observacoes do textarea do formulário OI
  const obsMatch =
    html.match(/id="ctl00_cph_txtObservacao[^"]*"[^>]*>([\s\S]*?)<\/textarea>/i) ??
    html.match(/name="[^"]*txtObservacao[^"]*"[\s\S]*?>([\s\S]*?)<\/textarea>/i) ??
    html.match(/Observa[çc][oõ]es[\s\S]{0,200}?<textarea[^>]*>([\s\S]*?)<\/textarea>/i);
  let observacoes: string | null = null;
  if (obsMatch) {
    observacoes = obsMatch[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
      .replace(/&nbsp;/g, " ")
      .trim() || null;
  }

  const documentos = parseDocumentos(html);
  const orcamento_id = extrairOrcamentoId(html);
  const cliente_oi_id = extrairClienteId(html);
  const cpf = extrairCpf(html);
  const responsavel = extrairResponsavel(html);
  const pesquisa = extrairPesquisa(html);
  const tipo = extrairTipoOS(html);

  // Nota fiscal: aba tapFiscal presente no HTML?
  // "Nenhuma Nota relacionada a esta O.S." → false; sem mensagem de vazio → true; aba ausente → null
  let tem_nota_fiscal: boolean | null = null;
  if (html.includes("tapFiscal")) {
    tem_nota_fiscal = !html.includes("Nenhuma Nota relacionada");
  }

  return {
    itens, pagamentos, observacoes, documentos, orcamento_id, cliente_oi_id, cpf,
    responsavel, pesquisa, tipo, tem_nota_fiscal,
    total_os: totalOSM ? parseBRL(totalOSM[1]) : 0,
    total_servicos: servM ? parseBRL(servM[1]) : 0,
    total_produtos: prodM ? parseBRL(prodM[1]) : 0,
  };
}

// resolveDocUrl removida (v62): URLs S3 estão no HTML da OS como onclick fncNovaAba

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

async function buscarOS(deBR: string, ck: string): Promise<{ html: string; ck: string }> {
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
  const ck2 = exCk(r2.headers);
  return { html, ck: ck2.length > 0 ? mergeCk(ck, ck2) : ck };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const email = Deno.env.get("OI_EMAIL") ?? "";
  const senha = Deno.env.get("OI_SENHA") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!email || !senha || !supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: "credenciais ausentes" }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const today = new Intl.DateTimeFormat("sv", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const de = (body?.de as string) || today;
  const detalhe = (body?.detalhe as boolean) || false;
  const [y, mo, d] = de.split("-");
  const deBR = `${d}/${mo}/${y}`;

  const supabase = createClient(supabaseUrl, supabaseKey);
  const log: string[] = [`Login OI... de=${de} detalhe=${detalhe}`];
  const summary: Record<string, { busca: number; atualizadas: number; detalhe: number; errors: string[] }> = {};

  try {
    let ck = await login(email, senha);
    log.push("Login OK");

    for (const loja of LOJAS) {
      const s = { busca: 0, atualizadas: 0, detalhe: 0, errors: [] as string[] };
      summary[loja.key] = s;
      log.push(loja.key);

      try {
        ck = await trocarLoja(loja.ddl, ck);

        const { html, ck: ck2 } = await buscarOS(deBR, ck);
        ck = ck2;

        const rows = parseBuscaTable(html);
        s.busca = rows.length;
        log.push(`  busca: ${rows.length} OS`);

        for (const row of rows) {
          try {
            // 1) hora_inicio / hora_fim da tabela de busca
            const update: Record<string, string | null> = {};
            if (row.hora_inicio) update.hora_inicio = row.hora_inicio;
            if (row.hora_fim) update.hora_fim = row.hora_fim;
            if (Object.keys(update).length > 0) {
              const { error } = await supabase
                .from("os_vendas")
                .update(update)
                .eq("loja_key", loja.key)
                .eq("os_numero", row.os_numero);
              if (error) s.errors.push(`OS${row.os_numero}: ${error.message}`);
              else s.atualizadas++;
            }

            // 2) Sempre acessa página individual — responsavel, pesquisa, tipo, cpf, pagamentos, docs, etc.
            try {
              const { data: osRow } = await supabase
                .from("os_vendas")
                .select("id")
                .eq("loja_key", loja.key)
                .eq("os_numero", row.os_numero)
                .single();

              if (osRow) {
                // Usa o path real capturado da tabela de busca (tem o OrdemDeServicoID interno)
                // Se os_path for null, fallback para o número visível
                const rawPath = row.os_path ?? `wfOrdemDeServico.aspx?OrdemDeServicoID=${row.os_numero}`;
                const osUrl = rawPath.startsWith("http") ? rawPath : `${OI_BASE}/${rawPath.replace(/^\//, "")}`;
                const rDet = await fetch(osUrl, { headers: { ...BASE_H, Cookie: ck }, redirect: "follow" });
                const finalOsUrl = rDet.url || osUrl; // URL real após redirects (parâmetros encriptados)
                const hDet = await rDet.text();
                const det = parseOSPage(hDet);

                const upd: Record<string, unknown> = {};
                if (det.responsavel) upd.responsavel = det.responsavel;
                if (det.pesquisa) upd.pesquisa = det.pesquisa;
                if (det.tipo) upd.tipo = det.tipo;
                if (det.cpf) upd.cpf = det.cpf;
                if (det.orcamento_id) upd.orcamento_id = det.orcamento_id;
                if (det.cliente_oi_id) upd.cliente_oi_id = det.cliente_oi_id;
                if (det.pagamentos.length > 0) upd.pagamentos = det.pagamentos;
                if (det.total_os > 0) upd.total_os = det.total_os;
                if (det.total_servicos > 0) upd.total_servicos = det.total_servicos;
                if (det.total_produtos > 0) upd.total_produtos = det.total_produtos;
                if (det.observacoes) upd.observacoes = det.observacoes;
                if (det.tem_nota_fiscal !== null) upd.tem_nota_fiscal = det.tem_nota_fiscal;
                if (det.documentos.length > 0) {
                  // URLs S3 já extraídas diretamente do HTML pela parseDocumentos (v62)
                  upd.documentos = det.documentos.map((doc) => ({
                    descricao: doc.descricao,
                    data_cadastro: doc.data_cadastro,
                    url: doc.url,
                    eventTarget: doc.eventTarget ?? undefined,
                  }));
                }

                // Busca dados cadastrais do cliente para verificação no NexusZ
                if (det.cliente_oi_id) {
                  try {
                    const clientUrl = `${OI_BASE}/wfCliente.aspx?ClienteID=${det.cliente_oi_id}`;
                    const rCli = await fetch(clientUrl, { headers: { ...BASE_H, Cookie: ck }, redirect: "follow" });
                    const hCli = await rCli.text();
                    const clienteData = parseClientePage(hCli);
                    // Só salva se tiver pelo menos nome ou CPF (confirmação de que a página carregou)
                    if (clienteData.nome || clienteData.cpf) {
                      upd.cliente_cadastro = clienteData;
                    }
                  } catch (_) { /* silencioso */ }
                }

                if (Object.keys(upd).length > 0) {
                  await supabase.from("os_vendas").update(upd).eq("id", osRow.id);
                }

                // Executores e codigo de itens — sempre coleta
                for (const item of det.itens) {
                  if (!item.executor) continue;
                  await supabase
                    .from("os_itens")
                    .update({ executor: item.executor })
                    .eq("os_vendas_id", osRow.id)
                    .eq("codigo", item.codigo);
                }

                s.detalhe++;
                log.push(`    OS${row.os_numero}: itens=${det.itens.length} exec=${det.itens.filter(i=>i.executor).length} pag=${det.pagamentos.length}`);
              }
            } catch (e) {
              s.errors.push(`paginaOS${row.os_numero}: ${String(e).slice(0, 80)}`);
            }
          } catch (e) {
            s.errors.push(`OS${row.os_numero}: ${String(e).slice(0, 80)}`);
          }
        }
      } catch (e) {
        s.errors.push(`loja: ${String(e).slice(0, 100)}`);
        log.push(`  ERRO: ${String(e).slice(0, 100)}`);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, de, detalhe, summary, log }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e), log }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
