-- Adiciona coluna review_date para armazenar data aproximada da avaliação
-- (derivada do time_text do Google, ex: "9 meses atrás" → data calculada na coleta)
ALTER TABLE google_reviews
  ADD COLUMN IF NOT EXISTS review_date timestamptz;

CREATE INDEX IF NOT EXISTS idx_google_reviews_review_date
  ON google_reviews (loja_key, review_date DESC NULLS LAST);
