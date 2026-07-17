-- Tabela para armazenar notas médias e total de avaliações Google por loja
-- Executar no Supabase SQL Editor antes de rodar tools/coletar-avaliacoes.js

CREATE TABLE IF NOT EXISTS google_ratings (
  id               bigserial PRIMARY KEY,
  loja_key         text        NOT NULL,
  loja_nome        text        NOT NULL,
  nota_media       numeric(3,1),
  total_avaliacoes integer,
  coletado_em      timestamptz DEFAULT now()
);

-- Índice para buscar a coleta mais recente por loja
CREATE INDEX IF NOT EXISTS idx_google_ratings_loja_ts
  ON google_ratings (loja_key, coletado_em DESC);

-- RLS: leitura pública (sem dados sensíveis)
ALTER TABLE google_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leitura_publica" ON google_ratings FOR SELECT USING (true);
CREATE POLICY "service_role_insert" ON google_ratings FOR INSERT WITH CHECK (true);
