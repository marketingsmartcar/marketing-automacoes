# Skill: Email de Lembrete de Revisão/Retorno

## Comando
`/email-lembrete-revisao [servico] [periodo]`

## O que faz
Gera emails de lembrete para serviços periódicos, avisando o cliente que está na hora de voltar. Três variações com ângulos diferentes (preventivo, prático, oferta) com lógica de progressão se o cliente não abre.

---

## Parâmetros

| Parâmetro | Obrigatório | Exemplos |
|-----------|-------------|---------|
| `servico` | Sim | `troca-de-oleo`, `alinhamento`, `balanceamento`, `revisao-completa`, `troca-de-pneu`, `ar-condicionado`, `freios`, `correia-dentada` |
| `periodo` | Sim | `6meses`, `1ano`, `2anos`, `3anos` — tempo desde o último serviço |

---

## Tabela de Referência de Ciclos

| Serviço | Intervalo Recomendado | Quando Enviar o Lembrete |
|---------|----------------------|--------------------------|
| Troca de óleo | 6 meses / 5.000–10.000 km | 5 meses após o serviço |
| Alinhamento e balanceamento | 6 meses / 10.000 km | 5 meses |
| Revisão completa | 12 meses / 10.000 km | 10 meses |
| Troca de pneu | 3–4 anos / 40.000–50.000 km | 2,5 anos |
| Ar condicionado (higienização) | 12 meses | 10 meses (antes do verão idealmente) |
| Freios (verificação) | 12 meses / 20.000 km | 10 meses |
| Correia dentada | 50.000–60.000 km | ~45.000 km |

---

## Estrutura do Output

### Variação A — Cuidado Preventivo

**Ângulo:** "prevenir é mais barato que remediar"

**Assuntos (3 opções):**
- A1: `{{nome}}, seu {{servico}} está no prazo — sabia que pode economizar?`
- A2: `Já faz {{periodo}} da sua última {{servico}}, {{nome}}`
- A3: `A hora certa de cuidar do carro é antes de precisar`

**Preview text:** `{{servico}} em dia = menos gasto, mais segurança.`

**Corpo:**
- Abertura personalizada: "{{nome}}, já faz {{periodo}} desde a sua última {{servico}} aqui na BR Pneus & Oficina {{unidade}}."
- Explicação educativa do que pode acontecer se atrasar (tom informativo, sem alarmismo):
  - `troca-de-oleo`: "Óleo velho desgasta o motor mais rápido — o que seria uma troca de R$ X pode virar uma revisão muito mais cara."
  - `alinhamento`: "Pneus desalinhados gastam 30% mais rápido e aumentam o consumo de combustível."
  - `revisao-completa`: "Uma revisão preventiva custa muito menos que reparar o que quebra por falta de atenção."
  - `troca-de-pneu`: "Pneu desgastado é risco de aquaplanagem e estouro — o mais barato sempre é prevenir."
  - `ar-condicionado`: "Ar sujo circula mofo e bactérias dentro do carro — higienização anual protege a saúde da família."
- Dado de referência: "Especialistas recomendam {{servico}} a cada {{intervalo_recomendado}}."
- CTA: "Agende agora pelo WhatsApp — é rápido e sem complicação"
- Link: `{{unidade_whatsapp}}`

**Tom:** educativo, cuidadoso — parceiro que se preocupa com o cliente

---

### Variação B — Praticidade

**Ângulo:** "é rápido e fácil, a gente cuida de tudo"

**Assuntos (3 opções):**
- B1: `{{nome}}, bora colocar a {{servico}} em dia?`
- B2: `Seu carro pede atenção — a gente resolve rapidinho`
- B3: `15 minutos que fazem diferença no seu dia, {{nome}}`

**Preview text:** `Sem enrolação — agenda pelo WhatsApp e a gente cuida do resto.`

**Corpo:**
- Abertura direta: "Oi, {{nome}}! Tá na hora da {{servico}} — e a gente deixa tudo rápido para você."
- Tempo estimado do serviço:
  - Troca de óleo: ~30 minutos
  - Alinhamento + balanceamento: ~45 minutos
  - Revisão completa: ~2 horas (avisar antecipadamente)
  - Troca de pneu: ~30–45 minutos
- Destaque para conveniência: horários flexíveis, sem necessidade de marcar hora com antecedência
- Parcelamento disponível: "e ainda parcela em até 18x sem juros"
- CTA: "Responda este email ou chame no WhatsApp — a gente agenda rapidinho"
- Link: `{{unidade_whatsapp}}`

**Tom:** descomplicado, ágil — "a gente facilita a vida"

---

### Variação C — Oferta de Retorno

**Ângulo:** incentivo financeiro para voltar

**Assuntos (3 opções):**
- C1: `{{nome}}, preparamos uma condição especial para a sua {{servico}}`
- C2: `Oferta exclusiva para quem já conhece a BR Pneus`
- C3: `{{nome}}, essa oferta é só para você — válida até {{data_validade}}`

**Preview text:** `Condição exclusiva por 15 dias. Não deixa passar.`

**Corpo:**
- Abertura: "{{nome}}, por ser cliente BR Pneus & Oficina {{unidade}}, preparamos algo especial para a sua {{servico}}."
- Benefício (sugerir opções conforme o contexto — escolher uma):
  - Desconto exclusivo no serviço
  - Serviço complementar grátis (ex: troca de óleo + filtro de óleo com desconto)
  - Check-up gratuito ao realizar o serviço
  - Parcelamento diferenciado
- Validade: 15 dias (com data específica: "Válida até {{data_validade}}")
- Urgência genuína: "Vagas limitadas — agende com antecedência."
- CTA: "Agendar com código CLIENTE-VIP" → link WhatsApp com mensagem pré-preenchida
- Rodapé: link de descadastro + "Não quer mais receber lembretes? Clique aqui."

**Tom:** generoso, exclusivo — "você merece essa condição"

---

## Lógica de Progressão (Automação)

```
[Enviar Variação A no momento ideal de lembrete]
    ↓ esperar 3 dias
[Abriu?]
    ├── SIM + Clicou → marcado como "lembrete atendido", aguardar conversão
    ├── SIM + Não clicou → enviar Variação B em 4 dias
    └── NÃO → enviar Variação B imediatamente
              ↓ esperar 5 dias
              [Abriu?]
              ├── SIM + Clicou → aguardar conversão
              └── SIM/NÃO sem clicar → enviar Variação C
                        ↓ esperar 7 dias
                        [Converteu?]
                        ├── SIM → entrar no fluxo pós-serviço
                        └── NÃO → entrar no fluxo de reativação (/email-reativacao)
```

---

## Especificações Técnicas

- **Versão texto puro** para cada variação
- **Mobile-first:** botões com mínimo 44px, fonte mínima 16px
- **Personalização obrigatória:** `{{nome}}`, `{{servico}}`, `{{periodo}}`, `{{unidade}}`
- **Métricas esperadas:**
  - Variação A: abertura ~30–40%, CTR ~8–12%
  - Variação B: abertura ~25–35%, CTR ~6–10%
  - Variação C: abertura ~20–30%, CTR ~10–15% (oferta)
- **Taxa de conversão em agendamento:** meta de 15–20% dos que abriram qualquer variação

---

## Salvar em
`output/emails/lembrete-[servico]-[periodo]-[data].md`

---

## Referências Cruzadas
- Contexto de marca: `CLAUDE.md`
- Personas: `knowledge/personas.md`
- Fluxo de lembretes periódicos: `/fluxo-automacao lembrete-periodico`
