'use strict';
/**
 * MCP Server — Kommo CRM
 * Protocolo: stdio (JSON-RPC 2.0)
 * Ferramentas disponíveis para o Claude Code:
 *   kommo_listar_leads, kommo_buscar_lead, kommo_atualizar_lead,
 *   kommo_listar_pipelines, kommo_listar_usuarios, kommo_criar_tarefa,
 *   kommo_listar_contatos, kommo_buscar_contato, kommo_criar_nota
 */

require('dotenv').config();

const https = require('https');

const TOKEN      = process.env.KOMMO_ACCESS_TOKEN;
const API_DOMAIN = process.env.KOMMO_API_DOMAIN || 'api-c.kommo.com';

if (!TOKEN) {
  process.stderr.write('KOMMO_ACCESS_TOKEN não configurado\n');
  process.exit(1);
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: API_DOMAIN,
      path: `/api/v4${path}`,
      method,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(opts, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        if (res.statusCode >= 400) { reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 400)}`)); return; }
        try { resolve(raw ? JSON.parse(raw) : {}); }
        catch { resolve({ _raw: raw }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ─── Ferramentas ──────────────────────────────────────────────────────────────

const TOOLS = {
  kommo_listar_leads: {
    description: 'Lista leads/negócios do CRM. Aceita filtros por pipeline, responsável, status e texto.',
    inputSchema: {
      type: 'object',
      properties: {
        pipeline_id: { type: 'number', description: 'ID do pipeline (funil)' },
        status_id:   { type: 'number', description: 'ID do estágio' },
        query:       { type: 'string',  description: 'Texto livre para buscar' },
        responsavel_id: { type: 'number', description: 'ID do usuário responsável' },
        limit:       { type: 'number',  description: 'Máximo de resultados (padrão 50)' },
        page:        { type: 'number',  description: 'Página (padrão 1)' },
      },
    },
    async fn(args) {
      const params = new URLSearchParams();
      if (args.pipeline_id)    params.set('filter[pipeline_id][]', args.pipeline_id);
      if (args.status_id)      params.set('filter[status_id][]', args.status_id);
      if (args.query)          params.set('query', args.query);
      if (args.responsavel_id) params.set('filter[responsible_user_id][]', args.responsavel_id);
      params.set('limit', args.limit ?? 50);
      params.set('page',  args.page  ?? 1);
      params.set('with', 'contacts,pipeline,loss_reason');
      const r = await api('GET', `/leads?${params}`);
      const leads = r._embedded?.leads ?? [];
      return leads.map(l => ({
        id: l.id, nome: l.name, valor: l.price,
        status_id: l.status_id, pipeline_id: l.pipeline_id,
        responsavel: l.responsible_user_id,
        criado_em: new Date(l.created_at * 1000).toISOString(),
        atualizado_em: new Date(l.updated_at * 1000).toISOString(),
        contatos: l._embedded?.contacts?.map(c => ({ id: c.id, nome: c.name })) ?? [],
      }));
    },
  },

  kommo_buscar_lead: {
    description: 'Busca detalhes completos de um lead pelo ID.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'number', description: 'ID do lead' },
      },
    },
    async fn(args) {
      return api('GET', `/leads/${args.id}?with=contacts,pipeline,loss_reason,notes,tasks`);
    },
  },

  kommo_atualizar_lead: {
    description: 'Atualiza campos de um lead existente (nome, valor, responsável, estágio, campos customizados).',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id:            { type: 'number', description: 'ID do lead' },
        nome:          { type: 'string', description: 'Novo nome do lead' },
        valor:         { type: 'number', description: 'Valor do negócio' },
        status_id:     { type: 'number', description: 'ID do estágio de destino' },
        pipeline_id:   { type: 'number', description: 'ID do pipeline de destino' },
        responsavel_id:{ type: 'number', description: 'ID do usuário responsável' },
        campos_customizados: {
          type: 'array',
          description: 'Lista de { field_id, values: [{ value }] }',
          items: { type: 'object' },
        },
      },
    },
    async fn(args) {
      const body = {};
      if (args.nome)            body.name = args.nome;
      if (args.valor != null)   body.price = args.valor;
      if (args.status_id)       body.status_id = args.status_id;
      if (args.pipeline_id)     body.pipeline_id = args.pipeline_id;
      if (args.responsavel_id)  body.responsible_user_id = args.responsavel_id;
      if (args.campos_customizados) body.custom_fields_values = args.campos_customizados;
      return api('PATCH', `/leads/${args.id}`, body);
    },
  },

  kommo_listar_pipelines: {
    description: 'Lista todos os funis (pipelines) e seus estágios.',
    inputSchema: { type: 'object', properties: {} },
    async fn() {
      const r = await api('GET', '/leads/pipelines');
      const pipes = r._embedded?.pipelines ?? [];
      return pipes.map(p => ({
        id: p.id, nome: p.name, ativo: p.is_active,
        estagios: (p._embedded?.statuses ?? []).map(s => ({ id: s.id, nome: s.name, cor: s.color })),
      }));
    },
  },

  kommo_listar_usuarios: {
    description: 'Lista todos os usuários/responsáveis da conta.',
    inputSchema: { type: 'object', properties: {} },
    async fn() {
      const r = await api('GET', '/users');
      return (r._embedded?.users ?? []).map(u => ({
        id: u.id, nome: u.name, email: u.email, cargo: u.role,
      }));
    },
  },

  kommo_listar_contatos: {
    description: 'Lista contatos do CRM com filtro opcional por texto.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Texto para filtrar por nome/telefone/email' },
        limit: { type: 'number' },
        page:  { type: 'number' },
      },
    },
    async fn(args) {
      const params = new URLSearchParams();
      if (args.query) params.set('query', args.query);
      params.set('limit', args.limit ?? 50);
      params.set('page',  args.page  ?? 1);
      params.set('with', 'leads');
      const r = await api('GET', `/contacts?${params}`);
      return (r._embedded?.contacts ?? []).map(c => ({
        id: c.id, nome: c.name,
        leads: c._embedded?.leads?.map(l => l.id) ?? [],
      }));
    },
  },

  kommo_buscar_contato: {
    description: 'Busca detalhes completos de um contato pelo ID.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'number' } },
    },
    async fn(args) {
      return api('GET', `/contacts/${args.id}?with=leads`);
    },
  },

  kommo_criar_nota: {
    description: 'Adiciona uma nota de texto em um lead.',
    inputSchema: {
      type: 'object',
      required: ['lead_id', 'texto'],
      properties: {
        lead_id: { type: 'number', description: 'ID do lead' },
        texto:   { type: 'string', description: 'Conteúdo da nota' },
      },
    },
    async fn(args) {
      return api('POST', `/leads/${args.lead_id}/notes`, [{ note_type: 'common', params: { text: args.texto } }]);
    },
  },

  kommo_criar_tarefa: {
    description: 'Cria uma tarefa vinculada a um lead.',
    inputSchema: {
      type: 'object',
      required: ['lead_id', 'texto', 'prazo_unix'],
      properties: {
        lead_id:       { type: 'number', description: 'ID do lead' },
        texto:         { type: 'string', description: 'Descrição da tarefa' },
        prazo_unix:    { type: 'number', description: 'Timestamp Unix do prazo' },
        responsavel_id:{ type: 'number', description: 'ID do responsável (opcional)' },
      },
    },
    async fn(args) {
      const body = [{
        task_type_id: 1,
        text:         args.texto,
        complete_till: args.prazo_unix,
        entity_id:    args.lead_id,
        entity_type:  'leads',
        ...(args.responsavel_id ? { responsible_user_id: args.responsavel_id } : {}),
      }];
      return api('POST', '/tasks', body);
    },
  },
};

// ─── MCP stdio server ─────────────────────────────────────────────────────────

function responder(id, result) {
  const msg = JSON.stringify({ jsonrpc: '2.0', id, result });
  process.stdout.write(`Content-Length: ${Buffer.byteLength(msg)}\r\n\r\n${msg}`);
}

function errar(id, code, message) {
  const msg = JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } });
  process.stdout.write(`Content-Length: ${Buffer.byteLength(msg)}\r\n\r\n${msg}`);
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  buf += chunk;
  while (true) {
    const clMatch = buf.match(/Content-Length:\s*(\d+)\r\n\r\n/);
    if (!clMatch) break;
    const len     = parseInt(clMatch[1]);
    const start   = buf.indexOf('\r\n\r\n') + 4;
    if (buf.length < start + len) break;
    const raw = buf.slice(start, start + len);
    buf = buf.slice(start + len);
    let req;
    try { req = JSON.parse(raw); } catch { continue; }
    handleRequest(req).catch(e => errar(req.id, -32603, e.message));
  }
});

async function handleRequest(req) {
  const { id, method, params } = req;

  if (method === 'initialize') {
    return responder(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'kommo-mcp', version: '1.0.0' },
    });
  }

  if (method === 'tools/list') {
    return responder(id, {
      tools: Object.entries(TOOLS).map(([name, t]) => ({
        name, description: t.description, inputSchema: t.inputSchema,
      })),
    });
  }

  if (method === 'tools/call') {
    const tool = TOOLS[params?.name];
    if (!tool) return errar(id, -32601, `Ferramenta desconhecida: ${params?.name}`);
    try {
      const result = await tool.fn(params?.arguments ?? {});
      return responder(id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
    } catch (e) {
      return errar(id, -32603, e.message);
    }
  }

  if (method === 'notifications/initialized') return; // sem resposta

  return errar(id, -32601, `Método desconhecido: ${method}`);
}
