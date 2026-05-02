# Skill: Monitor de Ads

**Agente:** Analytics Reporter  
**Categoria:** analytics  
**Arquivo:** `skills/analytics/monitor-ads.md`

---

## Objetivo

Monitorar em tempo real todas as contas de anúncios da rede BR Pneus & Peg Pneus, identificar alertas de saldo baixo ou performance ruim e guiar o processo de recarga.

---

## Contas Monitoradas

### Meta Ads (6 contas ativas)
| Conta | Account ID | Recarga |
|-------|-----------|---------|
| BR PNEUS MARINGÁ | `314207321290540` | Pix no Saldo |
| BR PNEUS AMERICANA | `319423037203736` | Pix no Saldo |
| BR PNEUS SÃO CARLOS | `678751073395713` | Pix no Saldo |
| BR PNEUS ARARAQUARA | `291920152109217` | **Pix nos Fundos** ⚠️ |
| PEG PNEUS SOROCABA | `653846450374888` | Pix no Saldo |
| PEG PNEUS ARARAQUARA | `3736536456594469` | Pix no Saldo |

> ⚠️ **BR PNEUS ARARAQUARA** usa **Pix nos Fundos** — fluxo diferente das demais!
>
> Contas encerradas (lojas fechadas): BR PNEUS IBITINGA e BR PNEUS JAÚ.

### Google Ads (6 contas ativas)
| Conta | Customer ID |
|-------|------------|
| BR PNEUS AMERICANA | `694-339-5750` |
| BR PNEUS ARARAQUARA | `486-896-4135` |
| BR PNEUS MARINGÁ | `107-641-5452` |
| BR PNEUS SÃO CARLOS | `784-908-8560` |
| PEG PNEUS ARARAQUARA | `915-964-4725` |
| PEG PNEUS SOROCABA | `773-516-8117` |

> Conta encerrada (loja fechada): BR PNEUS JAÚ.

---

## Comandos

```bash
# Relatório completo (Meta + Google)
npm run ads

# Apenas Meta Ads
npm run ads:meta

# Apenas Google Ads
npm run ads:google

# Fluxo interativo de recarga
npm run ads:recarregar
```

---

## Métricas Monitoradas

### Meta Ads
- Saldo atual da conta
- Gasto dos últimos 7 dias
- Alcance e impressões (7 dias)
- Cliques e CTR (7 dias)
- CPC médio

### Google Ads
- Gasto dos últimos 7 dias
- Orçamento total das campanhas ativas
- Impressões, cliques e CTR (7 dias)
- CPC médio
- Conversões (7 dias)

---

## Thresholds de Alerta

| Métrica | 🟡 Amarelo | 🔴 Vermelho |
|---------|-----------|------------|
| Saldo Meta | < R$ 50 | < R$ 20 |
| CTR Meta | < 1% | < 0,5% |
| CTR Google | < 2% | < 1% |
| CPC Google | > R$ 5 | > R$ 10 |

---

## Fluxo de Recarga

Ao detectar contas com saldo baixo, o monitor automaticamente:
1. Lista as contas com alerta
2. Pergunta se deseja ver instruções de recarga
3. Exibe o guia passo-a-passo específico para cada conta
   - Pix no Saldo (7 contas Meta)
   - Pix nos Fundos (BR Pneus Araraquara — exclusivo)

Para recarga manual sem monitoramento:
```bash
npm run ads:recarregar
```

---

## Configuração Inicial

Antes de usar, preencha as credenciais no `.env`:

```
META_ACCESS_TOKEN=seu_token_aqui
META_APP_ID=seu_app_id
META_APP_SECRET=seu_app_secret

GOOGLE_ADS_DEVELOPER_TOKEN=seu_developer_token
GOOGLE_ADS_CLIENT_ID=seu_client_id
GOOGLE_ADS_CLIENT_SECRET=seu_client_secret
GOOGLE_ADS_REFRESH_TOKEN=seu_refresh_token
GOOGLE_ADS_LOGIN_CUSTOMER_ID=seu_mcc_id
```

Guia completo de configuração: [`docs/setup-ads-apis.md`](../../docs/setup-ads-apis.md)

---

## Arquivos do Sistema

| Arquivo | Função |
|---------|--------|
| `tools/monitor-ads.js` | Monitor unificado (entry point) |
| `tools/monitor-meta-ads.js` | Monitor específico Meta Ads |
| `tools/monitor-google-ads.js` | Monitor específico Google Ads |
| `knowledge/contas-ads.md` | Tabela de contas e IDs |
| `docs/setup-ads-apis.md` | Guia de configuração das APIs |
