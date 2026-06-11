-- Tabela para armazenar avaliações individuais do Google por loja
-- Cada review é único por (loja_key, author_name, rating, review_text)

CREATE TABLE IF NOT EXISTS google_reviews (
  id              bigserial PRIMARY KEY,
  loja_key        text        NOT NULL,
  loja_nome       text        NOT NULL,
  author_name     text,
  profile_photo   text,
  rating          integer     CHECK (rating BETWEEN 1 AND 5),
  review_text     text,
  time_text       text,
  reply_text      text,
  coletado_em     timestamptz DEFAULT now()
);

-- Índice para buscar reviews recentes por loja
CREATE INDEX IF NOT EXISTS idx_google_reviews_loja_ts
  ON google_reviews (loja_key, coletado_em DESC);

-- Evitar duplicatas exatas (mesmo review coletado em datas diferentes)
CREATE UNIQUE INDEX IF NOT EXISTS idx_google_reviews_unique
  ON google_reviews (loja_key, author_name, rating, left(COALESCE(review_text,''), 80));

-- RLS
ALTER TABLE google_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leitura_publica"    ON google_reviews FOR SELECT USING (true);
CREATE POLICY "service_role_insert" ON google_reviews FOR INSERT WITH CHECK (true);
