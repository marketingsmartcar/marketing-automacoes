# Oficina Inteligente — Integração ERP

> ERP utilizado por toda a rede BR Pneus & Peg Pneus para gestão de OS, estoque, clientes e financeiro.
> Última atualização: 2026-04-22

---

## Tokens por Loja

| Código ERP | Rede | Cidade | Env Var Principal | WS Ativo |
|-----------|------|--------|-------------------|----------|
| BR01 CENTRO | BR Pneus | Araraquara (Loja 1) | `OI_TOKEN_BR01_CENTRO` | ✅ Sim |
| BR02 VILA | BR Pneus | Araraquara (Loja 2) | `OI_TOKEN_BR02_VILA` | ⚠️ Não |
| BR03 | BR Pneus | Americana | `OI_TOKEN_BR03_AMERICANA` | ⚠️ Não |
| BR04 | BR Pneus | São Carlos | `OI_TOKEN_BR04_SAO_CARLOS` | ⚠️ Não |
| BR05 | BR Pneus | Maringá | `OI_TOKEN_BR05_MARINGA` | ⚠️ Não |
| PEGI1 | Peg Pneus | Araraquara | `OI_TOKEN_PEG1_ARARAQUARA` | ⚠️ Não |
| PEGI2 | Peg Pneus | Sorocaba | `OI_TOKEN_PEG2_SOROCABA` | ⚠️ Não |
| ~~BR06~~ | ~~BR Pneus~~ | ~~Jaú~~ | ~~`OI_TOKEN_BR06_JAU`~~ | **ENCERRADA** |
| ~~BR08~~ | ~~BR Pneus~~ | ~~Ibitinga~~ | ~~`OI_TOKEN_BR08_IBITINGA`~~ | **ENCERRADA** |

> ⚠️ **Ação necessária:** Para usar a API das lojas com WebServices inativo, acesse Configuração → Integração → marque "Utiliza WebServices da Oficina Inteligente?" e clique em Salvar.

Cada loja tem também um **Token Alternativo** (`OI_TOKEN_ALT_*`) para uso em integrações secundárias ou fallback.

---

## Como Usar a API

A OI expõe um WebService ASMX (v2). O token vai como **query parameter na URL** — sem headers especiais.

### Base URL
```
https://www.oiapi.com.br/ws/v2/IntegracaoOficinaInteligente.asmx/
```

### Endpoints Disponíveis

| Endpoint | Parâmetros | Descrição |
|----------|-----------|-----------|
| `OrdemDeServicoJSON` | `token`, `data` (dd/MM/yyyy) | OS de um dia específico |
| `OrdemDeServicoXML` | `token`, `data` | OS em XML |
| `ProdutoJSON` | `token`, `produtoID?`, `somenteAtivo` (0/1) | Catálogo de produtos |
| `ProdutoXML` | `token`, `produtoID?`, `somenteAtivo` | Produtos em XML |

### Exemplo de chamada
```
GET https://www.oiapi.com.br/ws/v2/IntegracaoOficinaInteligente.asmx/OrdemDeServicoJSON?token=SEU_TOKEN&data=22/04/2026
```

### Campos retornados — OS
`EmpresaID`, `OrdemDeServicoID`, `Data`, `SituacaoDaOrdemDeServico` (Aberta/Fechada),
`NomeDoCliente`, `Celular`, `CPFCNPJ`, `DataDeNascimento`,
`PlacaDoVeiculo`, `ModeloDoVeiculo`, `AnoDoVeiculo`, `KMDoVeiculo`,
`ValorDaOrdemDeServico`, `Itens[]`

### Regras importantes
- ⚠️ Não consultar em loop com menos de 5 minutos de intervalo (há bloqueio automático)
- ⚠️ Consumo excessivo desativa o token automaticamente
- Dúvidas: suporte@oficinainteligente.com.br

### Token correto por loja
Algumas lojas só funcionam com o Token **Alternativo** (bug do lado deles):

| Loja | Token usado |
|------|-------------|
| BR01 CENTRO | `OI_TOKEN_ALT_BR01_CENTRO` ⚠️ |
| BR03 AMERICANA | `OI_TOKEN_ALT_BR03_AMERICANA` ⚠️ |
| Demais | `OI_TOKEN_*` (principal) ✅ |

O script `tools/oficina-inteligente.js` já lida com isso automaticamente.

---

## Casos de Uso para Marketing

### 1. Reativação de Clientes (CRM)
- Buscar clientes sem OS há mais de 6 meses
- Disparar mensagem WhatsApp via Deskrio com oferta personalizada
- Skill: `skills/crm-email/programa-indicacao.md`

### 2. Segmentação por Veículo
- Clientes com veículo cadastrado como SUV → campanha pneus SUV
- Clientes com veículos pesados → campanha pneus caminhão
- Integração: OI → filtro por tipo → lista Deskrio

### 3. Pós-OS (avaliação + upsell)
- Detectar OS fechada no dia → disparar mensagem de agradecimento
- Solicitar avaliação no Google
- Oferecer próximo serviço (ex: revisão em 6 meses)

### 4. Aniversariantes do Mês
- Puxar clientes com aniversário no mês corrente
- Enviar mensagem especial com cupom ou oferta

---

## Script de Teste

```javascript
// tools/test-oi-api.js
const fetch = require('node-fetch');
require('dotenv').config();

async function testOI(lojaKey) {
  const token = process.env[`OI_TOKEN_${lojaKey}`];
  const res = await fetch('https://api.oficinainteligente.com.br/v1/clientes?limit=1', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  console.log(`[${lojaKey}] Status: ${res.status}`, data);
}

// Testar loja com WS ativo
testOI('BR01_CENTRO');
```

```bash
node tools/test-oi-api.js
```

---

## Status de Integração

| Funcionalidade | Status |
|---------------|--------|
| Tokens salvos no `.env` | ✅ Feito |
| WebServices ativo (BR01) | ✅ Ativo |
| WebServices demais lojas | ⚠️ Pendente habilitar no ERP |
| Script de busca de clientes | 🔲 A desenvolver |
| Integração com Deskrio/WhatsApp | 🔲 A desenvolver |
| Segmentação por veículo | 🔲 A desenvolver |
