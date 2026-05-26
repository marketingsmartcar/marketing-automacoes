-- Tabela de contatos Deskrio (BR Pneus + Peg Pneus)
-- Executar no Supabase SQL Editor antes de rodar tools/sync-contatos-deskrio.js

CREATE TABLE IF NOT EXISTS deskrio_contatos (
  deskrio_id      bigint      NOT NULL,
  empresa         text        NOT NULL,  -- 'BR' ou 'PEG'
  nome            text,
  numero          text,
  cidade          text,
  criado_em       timestamptz,
  sincronizado_em timestamptz DEFAULT now(),
  PRIMARY KEY (deskrio_id, empresa)
);

CREATE INDEX IF NOT EXISTS idx_deskrio_contatos_criado
  ON deskrio_contatos (criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_deskrio_contatos_empresa
  ON deskrio_contatos (empresa, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_deskrio_contatos_numero
  ON deskrio_contatos (numero);

ALTER TABLE deskrio_contatos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leitura_publica"    ON deskrio_contatos FOR SELECT USING (true);
CREATE POLICY "service_role_write" ON deskrio_contatos FOR ALL   WITH CHECK (true);
