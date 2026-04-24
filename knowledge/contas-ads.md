# Contas de Ads — BR Pneus & Peg Pneus

> Documento de referência para o sistema de monitoramento de anúncios.
> Última atualização: 2026-04-13

---

## Meta Ads (8 contas)

| Loja | Account ID | Env var | Método de recarga |
|------|-----------|---------|-------------------|
| BR PNEUS IBITINGA | `585036840552616` | `META_ACCOUNT_BR_IBITINGA` | Pix no **Saldo** |
| BR PNEUS MARINGÁ | `314207321290540` | `META_ACCOUNT_BR_MARINGA` | Pix no **Saldo** |
| BR PNEUS AMERICANA | `319423037203736` | `META_ACCOUNT_BR_AMERICANA` | Pix no **Saldo** |
| BR PNEUS JAÚ | `949063329571714` | `META_ACCOUNT_BR_JAU` | Pix no **Saldo** |
| BR PNEUS SÃO CARLOS | `678751073395713` | `META_ACCOUNT_BR_SAO_CARLOS` | Pix no **Saldo** |
| BR PNEUS ARARAQUARA | `291920152109217` | `META_ACCOUNT_BR_ARARAQUARA` | Pix nos **Fundos** ⚠️ |
| PEG PNEUS SOROCABA | `653846450374888` | `META_ACCOUNT_PEG_SOROCABA` | Pix no **Saldo** |
| PEG PNEUS ARARAQUARA | `3736536456594469` | `META_ACCOUNT_PEG_ARARAQUARA` | Pix no **Saldo** |

> ⚠️ **ATENÇÃO:** BR PNEUS ARARAQUARA usa **Pix nos Fundos** (não no Saldo).
> As demais 7 contas usam **Pix no Saldo**.

### Como recarregar — Meta Ads
- **Pix no Saldo:** Gerenciador de Anúncios → Configurações de Cobrança → Saldo Pré-pago → Adicionar Fundos → Pix
- **Pix nos Fundos:** Gerenciador de Anúncios → Configurações de Cobrança → Métodos de Pagamento → Pix → Pagar Fatura

---

## Google Ads (7 contas)

| Loja | Customer ID | Env var |
|------|------------|---------|
| BR PNEUS AMERICANA | `694-339-5750` | `GOOGLE_ACCOUNT_BR_AMERICANA` |
| BR PNEUS ARARAQUARA | `486-896-4135` | `GOOGLE_ACCOUNT_BR_ARARAQUARA` |
| BR PNEUS JAÚ | `123-944-1933` | `GOOGLE_ACCOUNT_BR_JAU` |
| BR PNEUS MARINGÁ | `107-641-5452` | `GOOGLE_ACCOUNT_BR_MARINGA` |
| BR PNEUS SÃO CARLOS | `784-908-8560` | `GOOGLE_ACCOUNT_BR_SAO_CARLOS` |
| PEG PNEUS ARARAQUARA | `915-964-4725` | `GOOGLE_ACCOUNT_PEG_ARARAQUARA` |
| PEG PNEUS SOROCABA | `773-516-8117` | `GOOGLE_ACCOUNT_PEG_SOROCABA` |

### Como recarregar — Google Ads
- Google Ads → Ferramentas → Faturamento → Resumo → Fazer um pagamento
- Método: Pix, boleto ou cartão (conforme configuração de cada conta)

---

## Alertas e Thresholds

| Métrica | Alerta Amarelo | Alerta Vermelho |
|---------|---------------|-----------------|
| Saldo Meta | < R$ 50 | < R$ 20 |
| CTR Meta | < 1% | < 0,5% |
| Saldo Google | < R$ 50 | < R$ 20 |
| CTR Google | < 2% | < 1% |
| CPC Google | > R$ 5 | > R$ 10 |

---

## Acesso ao Gerenciador

- **Meta Business:** https://business.facebook.com/
- **Google Ads:** https://ads.google.com/
- **Meta Billing:** https://www.facebook.com/ads/manager/billing/
- **Google Billing:** https://ads.google.com/aw/billing/summary
