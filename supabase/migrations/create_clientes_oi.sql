-- Tabela de clientes extraída das OS do Oficina Inteligente
-- Fonte: OrdemDeServicoJSON (campos: NomeDoCliente, Celular, CPFCNPJ, DataDeNascimento)
-- Chave de dedup: 'cpf:<digitos>' se CPF disponível, senão 'tel:<digitos>'
-- Executar via Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS clientes_oi (
  chave             TEXT PRIMARY KEY,         -- 'cpf:12345678900' ou 'tel:16991234567'
  cpf_cnpj          TEXT,
  celular           TEXT,
  nome              TEXT,
  data_nascimento   DATE,                     -- para filtro de aniversário (dia+mês)
  ultima_compra     DATE,                     -- para reativação (3/6/9/12 meses)
  primeira_compra   DATE,
  ultima_loja       TEXT,                     -- última loja visitada
  total_os          INT DEFAULT 1,
  atualizado_em     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_oi_nascimento
  ON clientes_oi (EXTRACT(MONTH FROM data_nascimento), EXTRACT(DAY FROM data_nascimento))
  WHERE data_nascimento IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clientes_oi_ultima_compra
  ON clientes_oi (ultima_compra)
  WHERE ultima_compra IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clientes_oi_celular
  ON clientes_oi (celular)
  WHERE celular IS NOT NULL;

-- RLS: desabilitar para service_role (todos os scripts usam service_role)
ALTER TABLE clientes_oi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON clientes_oi TO service_role USING (true) WITH CHECK (true);
