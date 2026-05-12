-- Adicionar coluna de leads Meta (formulários nativos + pixel) na tabela ads_snapshots
ALTER TABLE ads_snapshots ADD COLUMN IF NOT EXISTS leads_7d numeric(10,2);
