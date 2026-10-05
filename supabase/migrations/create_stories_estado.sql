-- Estado do scheduler de stories
-- Substitui data/stories-cloud-state.json
-- Chave: conta (br, peg) | valor: JSONB com historico, indices e datas

CREATE TABLE IF NOT EXISTS stories_estado (
  conta         TEXT PRIMARY KEY,             -- 'br' | 'peg'
  ultima_regular DATE,                        -- última data que postou vídeos regulares
  ultima_arte    DATE,                        -- última data que postou artes
  arraia_arte_index    INT DEFAULT 1,
  arraia_video_index   INT DEFAULT 0,
  sazonal_index        INT DEFAULT 0,
  historico      JSONB DEFAULT '{}',          -- { fileId: 'YYYY-MM-DD' }
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- Seed inicial para as duas contas
INSERT INTO stories_estado (conta) VALUES ('br'), ('peg')
ON CONFLICT (conta) DO NOTHING;
