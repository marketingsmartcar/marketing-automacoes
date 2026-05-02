# Skill: Mensagens SMS Promocionais

## Comando
`/sms-promocional [tipo-promocao] [cidade]`

## O que faz
Gera mensagens SMS curtas e impactantes para campanhas promocionais por unidade da BR Pneus & Oficina — com 5 variações por campanha, contagem exata de caracteres, regras de conformidade com LGPD e configuração de disparo.

---

## Parâmetros

| Parâmetro | Obrigatório | Exemplos |
|-----------|-------------|---------|
| `tipo-promocao` | Sim | `Black-Friday`, `ferias-julho`, `dia-dos-pais`, `dia-das-maes`, `aniversario-loja`, `promocao-pneus`, `promocao-revisao`, `volta-as-aulas`, `virada-de-ano`, `feriado-prolongado` |
| `cidade` | Sim | `Araraquara`, `Sao-Carlos`, `Americana`, `Maringa` |

---

## Regras Rígidas de SMS (NÃO NEGOCIÁVEIS)

1. **Máximo 160 caracteres por SMS** — ultrapassar gera cobrança dupla (SMS concatenado)
2. **Sempre identificar o remetente** — iniciar com "BR Pneus [Cidade]:" ou incluir no texto
3. **Sempre incluir opt-out** — "Resp SAIR" ou "SAIR: [link]" — obrigatório por lei
4. **Nunca enviar fora do horário:** 10h–18h em dias úteis
5. **Máximo 2 SMS de marketing por cliente por mês**
6. **Conformidade LGPD:** só enviar para quem deu consentimento para receber SMS
7. **Links:** usar sempre encurtador (bit.ly ou similar) — links longos consomem caracteres
8. **Números e símbolos:** evitar acentuação quando possível (alguns carriers não suportam UTF-8 sem custo extra)

---

## Estrutura do Output

### 5 Variações de SMS (para teste A/B)

Para cada variação, incluir:
- Texto completo da mensagem
- Contagem exata de caracteres (contar manualmente, incluindo espaços)
- Ângulo/abordagem da variação
- Elementos: identificação + oferta + urgência + CTA + link + opt-out

**Fórmula base:**
```
[ID remetente] [Oferta] [Urgência] [CTA] [Link] [Opt-out]
```

---

### Exemplo de Output para `/sms-promocional Black-Friday Araraquara`

**Variação 1 — Desconto direto (156 chars):**
```
BR Pneus Araraquara: Black Friday! Pneus ate 40% OFF + parcela 18x. 
So hoje! Agende: bit.ly/brp-aq Resp SAIR p/ cancelar
```
Chars: 128 ✅ | Ângulo: desconto + parcelamento

**Variação 2 — Urgência + escassez (158 chars):**
```
BR Pneus Araraquara: Black Friday com vagas limitadas! 
Pneus+servicos com desconto especial. Ate 18x. Garante o seu: bit.ly/brp-aq SAIR: bit.ly/sair
```
Chars: 155 ✅ | Ângulo: escassez de vagas

**Variação 3 — Pacote de serviços (155 chars):**
```
BR Pneus AQ: Black Friday! Troca de oleo + filtro + revisao basica com condicao especial. 
Ate 18x. Agende: bit.ly/brp-aq Resp SAIR
```
Chars: 133 ✅ | Ângulo: pacote/combo

**Variação 4 — Personalizado com nome (159 chars):**
```
[NOME], BR Pneus Araraquara: Black Friday exclusivo pra voce! 
Desconto na revisao do seu carro. Ate 18x. Hoje: bit.ly/brp-aq Resp SAIR p/ cancelar
```
Chars: 148 ✅ | Ângulo: personalização

**Variação 5 — Chamada para WhatsApp (157 chars):**
```
BR Pneus Araraquara: Ofertas Black Friday no carro! Pneus, alinhamento, oleo e +. 
Ate 18x. Chama no ZAP: bit.ly/brp-zap Resp SAIR p/ nao receber
```
Chars: 151 ✅ | Ângulo: variedade + WhatsApp

---

## Templates por Tipo de Promoção

### Black-Friday
- Período: última semana de novembro
- Ângulo principal: maior desconto do ano
- Palavra-chave: "Black Friday", "maior desconto", "só hoje", "48h"
- Oferta sugerida: desconto em pneus + parcelamento + pacote revisão

### ferias-julho
- Período: segunda quinzena de junho / julho
- Ângulo principal: segurança na viagem
- Palavra-chave: "viagem segura", "antes das férias", "revise antes de viajar"
- Oferta sugerida: check-up de viagem (alinhamento + óleo + freios + calibragem)

### dia-dos-pais
- Período: primeira quinzena de agosto
- Ângulo principal: presente que cuida e protege
- Palavra-chave: "presente para o pai", "cuide do carro do pai", "segurança em família"
- Oferta sugerida: revisão completa com desconto especial

### dia-das-maes
- Período: primeira quinzena de maio
- Ângulo principal: segurança da família
- Palavra-chave: "cuide da mãe", "carro seguro para ela", "presente especial"
- Oferta sugerida: higienização de ar condicionado + alinhamento

### aniversario-loja
- Período: mês do aniversário da unidade
- Ângulo principal: celebração + gratidão
- Palavra-chave: "aniversário", "obrigado por fazer parte", "oferta especial de aniversário"
- Oferta sugerida: desconto exclusivo + brinde simbólico

### promocao-pneus
- Período: qualquer época
- Ângulo principal: preço imbatível
- Palavra-chave: "maior mix", "melhor preço", "pneus a partir de"
- Atenção: NUNCA incluir valor específico de pneu sem confirmar com a loja

### promocao-revisao
- Período: qualquer época
- Ângulo principal: prevenção e economia
- Palavra-chave: "revisão completa", "carro em dia", "diagnóstico"
- Oferta sugerida: revisão com desconto ou item grátis incluído

---

## Configuração de Disparo

| Campo | Configurar |
|-------|-----------|
| Segmento alvo | Ex: todos os clientes com opt-in + última visita há menos de 12 meses |
| Dia ideal de envio | Terça, quarta ou quinta (melhor taxa de abertura/clique) |
| Horário ideal | 10h–12h ou 14h–16h |
| Volume estimado | Depende da base de cada unidade |
| Meta de CTR | 3–7% (SMS tem CTR menor que WhatsApp mas maior alcance) |
| Janela de conversão | 48–72h após o envio (pico nas primeiras 4h) |

---

## Checklist Pré-Envio

- [ ] Mensagem tem no máximo 160 caracteres (contar incluindo espaços)
- [ ] Remetente identificado claramente
- [ ] Opt-out incluído ("Resp SAIR" ou equivalente)
- [ ] Link encurtado e testado
- [ ] Horário configurado: 10h–18h em dias úteis
- [ ] Segmento filtrado: apenas clientes com consentimento para SMS
- [ ] Frequência respeitada: máximo 2 SMS/mês por cliente
- [ ] Nenhum valor de preço específico inventado
- [ ] Conformidade com LGPD verificada

---

## Salvar em
`output/emails/sms-[tipo]-[cidade]-[data].md`

---

## Referências Cruzadas
- Contexto de marca: `CLAUDE.md`
- Personas: `knowledge/personas.md`
- Calendário de datas: `knowledge/calendario-sazonal.md`
- Fluxo multicanal: `/fluxo-automacao sazonal`
