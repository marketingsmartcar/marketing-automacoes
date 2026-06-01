'use strict';
/**
 * Cria a tabela estoque_pneus no Supabase via upsert especial.
 * Roda uma vez só: node tools/criar-tabela-estoque.js
 */
require('dotenv').config();
const https = require('https');

function sbSQL(query) {
  return new Promise((res, rej) => {
    // Usa a Edge Function trigger-vendas-sync como proxy SQL é complexo.
    // Alternativa: tentar criar via REST com dados dummy e capturar o erro de schema
    // Na verdade, vamos usar a API de Management do Supabase diretamente
    const body = JSON.stringify({ query });
    const projectRef = new URL(process.env.NEXUSZ_SUPABASE_URL).hostname.split('.')[0];
    const r = https.request({
      hostname: 'api.supabase.com',
      path: `/v1/projects/${projectRef}/database/query`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        // Precisa de Personal Access Token da Supabase
      }
    }, resp => {
      let d = ''; resp.on('data', c => d+=c);
      resp.on('end', () => res({ status: resp.statusCode, body: d }));
    });
    r.on('error', rej);
    r.write(body); r.end();
  });
}

console.log('Use o Supabase Dashboard para criar a tabela com o SQL abaixo:');
console.log(`
CREATE TABLE IF NOT EXISTS estoque_pneus (
  id          BIGSERIAL PRIMARY KEY,
  loja        TEXT NOT NULL,
  grupo       TEXT NOT NULL,
  descricao   TEXT NOT NULL,
  medida      TEXT,
  marca       TEXT,
  estoque     INTEGER NOT NULL DEFAULT 0,
  custo       NUMERIC(10,2),
  venda       NUMERIC(10,2),
  atualizado  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS estoque_pneus_loja_desc
  ON estoque_pneus(loja, descricao);

ALTER TABLE estoque_pneus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_all" ON estoque_pneus FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "auth_read"   ON estoque_pneus FOR SELECT TO authenticated USING (true);
`);
