-- Tabela para artes geradas por colaborador (aniversario, boasvinda, destaque)
-- Executar no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS artes_colaboradores (
  id             bigserial    PRIMARY KEY,
  colaborador_id uuid         NOT NULL,
  nome_colab     text,
  cargo_colab    text,
  tipo           text         NOT NULL,  -- aniversario | boasvinda | destaque
  marca          text         NOT NULL,  -- BR | PEG
  drive_file_id  text,
  drive_url      text,
  thumbnail_url  text,
  nome_arquivo   text,
  criado_em      timestamptz  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_artes_colab_id
  ON artes_colaboradores (colaborador_id, criado_em DESC);

ALTER TABLE artes_colaboradores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leitura_publica"  ON artes_colaboradores FOR SELECT USING (true);
CREATE POLICY "service_role_all" ON artes_colaboradores FOR ALL  WITH CHECK (true);
