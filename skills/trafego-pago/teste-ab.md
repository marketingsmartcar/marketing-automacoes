---
name: teste-ab
description: Gera variações estruturadas para testes A/B em anúncios, landing pages e copies da BR Pneus & Oficina — com hipótese clara, mínimo 3 variações por elemento testado, critérios de significância estatística e próximo teste sugerido. Use sempre que precisar de teste A/B, variações de copy para testar, como descobrir qual anúncio performa melhor, ou estruturar um ciclo de otimização contínua — mesmo que o pedido use termos como "testa duas versões", "qual copy é melhor", "variações de headline" ou "otimizar meu anúncio".
---

# Skill: Gerador de Testes A/B

## Comando
```
/teste-ab [elemento] [tema] [cidade-opcional]
```

## Parâmetros
- **elemento** (obrigatório): O que será testado. Opções:
  - `headline` — Headline de anúncio ou landing page
  - `description` — Description de anúncio Google ou texto principal do Meta
  - `cta` — Texto, cor ou posicionamento do botão de ação
  - `oferta` — Diferentes formas de apresentar a mesma oferta
  - `angulo` — Diferentes ângulos de copy: racional vs emocional vs urgência
  - `criativo` — Diferentes conceitos visuais (briefing para o designer)
  - `publico` — Diferentes segmentações de público para comparar
- **tema** (obrigatório): Contexto do teste. Ex: "pneus", "troca de óleo", "campanha de férias"
- **cidade** (opcional): Localização (personaliza exemplos e contexto)

---

## Por que testar sistematicamente

Feeling não substitui dado. Mesmo com experiência, é impossível prever qual headline, CTA ou ângulo vai funcionar melhor com um público específico em uma cidade específica. Testes A/B transformam adivinhação em aprendizado acumulado — cada resultado melhora as campanhas futuras.

---

## Processo antes de criar

1. Identificar qual elemento tem maior impacto potencial para testar primeiro:
   - Headline → mais impacto (é o que o usuário lê antes de decidir clicar)
   - CTA → segundo maior impacto (define a ação esperada)
   - Criativo → crítico no Meta (a imagem é 80% do resultado no feed)
   - Descrição/body → menor impacto isolado, mas relevante
2. Garantir que apenas 1 elemento é mudado entre as variações — testar múltiplas variáveis ao mesmo tempo não permite identificar o que causou a diferença

---

## Estrutura obrigatória do output

### 1. Hipótese do Teste

```
Elemento testado: [nome do elemento]
Contexto: [serviço/campanha/tema]
Variação de controle (A): [o que está sendo usado atualmente, ou a abordagem base]
Variação(ões) de teste: [B, C, D — o que está sendo testado como alternativa]

Hipótese: "Acreditamos que [Variação X] vai superar [Variação A] porque 
[razão baseada em comportamento do público ou princípio de copywriting]."

Métrica primária de sucesso: [CTR | conversões | CPL | taxa de clique no CTA | mensagens iniciadas]
Métrica secundária (contexto): [impressões | frequência | custo]
```

---

### 2. Variações (mínimo 3)

Para cada variação, gerar o conteúdo completo + análise:

---

**Variação A — Controle (base)**

```
[Conteúdo da variação A — o que está sendo testado no estado atual ou abordagem padrão]

Abordagem: [ex: racional, baseada em preço]
Por que pode funcionar: [raciocínio baseado em princípios de copy/comportamento]
Por que pode não funcionar: [o que pode limitar o resultado]
```

---

**Variação B**

```
[Conteúdo da variação B — diferença clara e intencional em relação a A]

Abordagem: [ex: emocional, baseada em segurança]
Por que pode funcionar: [raciocínio]
Por que pode não funcionar: [limitação potencial]
```

---

**Variação C**

```
[Conteúdo da variação C — terceira abordagem distinta]

Abordagem: [ex: urgência, baseada em escassez]
Por que pode funcionar: [raciocínio]
Por que pode não funcionar: [limitação potencial]
```

*(adicionar Variação D e E quando o tema justificar mais variações)*

---

### 3. Exemplos de variações por elemento

**Se elemento = `headline`:**
```
A: "Pneus Baratos em [Cidade] | Parcele em 18x"
   → Racional | keyword + condição de pagamento
B: "Seu Pneu Vai Durar Mais uma Viagem? Confira"
   → Emocional | desperta dúvida e curiosidade
C: "Troque Seu Pneu Hoje — Vagas Limitadas em [Cidade]"
   → Urgência | escassez de vagas na agenda
```

**Se elemento = `cta`:**
```
A: "Saiba Mais" → baixo comprometimento, menos cliques qualificados
B: "Pedir Orçamento" → intenção mais clara, qualifica o clique
C: "Agendar pelo WhatsApp" → canal + ação específica, melhor para conversão direta
D: "Garantir Meu Preço" → posse antecipada, cria senso de ganho
```

**Se elemento = `oferta`:**
```
A: "Pneus a partir de R$179 em até 18x"
   → Preço + parcela como destaque
B: "Troque 4 pneus e ganhe 1 ano de garantia"
   → Benefício extra como destaque
C: "Alinhamento grátis na troca de 4 pneus essa semana"
   → Oferta combinada com urgência
```

**Se elemento = `angulo`:**
```
A: Ângulo racional — "Maior mix, menor preço, parcele em 18x"
   → Público: Carlos (econômico prático), Roberto (frotista)
B: Ângulo emocional — "Sua família merece chegar com segurança"
   → Público: Ana (mãe preocupada)
C: Ângulo de autoridade — "20 anos cuidando de carros no interior de SP"
   → Público: todos, especialmente quem valoriza experiência
```

**Se elemento = `publico`:**
```
A: Interesse: automóveis + donos de carro | Idade 25-45
B: Interesse: motoristas de aplicativo + autônomo | Idade 25-40
C: Comportamento: visitou lojas de pneu nos últimos 30 dias | Lookalike de clientes
```

---

### 4. Configuração do Teste

```
Duração mínima: [7 dias para Meta | 14 dias para Google Search]
  → Testar por menos tempo gera dados insuficientes e conclusões erradas

Volume mínimo de dados para significância:
  → Meta Ads: mínimo 100 cliques por variação antes de tirar conclusão
  → Google Ads: mínimo 50 conversões por variação (ou 14 dias, o que vier primeiro)
  → Regra prática: se uma variação tem CTR 2x maior com 200 impressões, pode confiar

Orçamento por variação: distribuir igualmente (mesma verba para todas)
  → Meta: usar recurso "Teste A/B" nativo para divisão controlada
  → Google: separar em grupos de anúncio com rotação igualitária

Critérios de parada antecipada:
  → Parar se uma variação tiver CTR consistentemente 50%+ pior que as outras (após 3 dias)
  → Não parar por resultado positivo cedo demais — aguardar o volume mínimo

O que fazer com o vencedor:
  → Parar as variações perdedoras
  → Escalar a verba do vencedor em 20-30%
  → Usar o vencedor como nova "Variação A" para o próximo ciclo
```

---

### 5. Próximo Teste Sugerido

Cada teste gera insight para o seguinte — construir um roadmap:

```
Resultado provável do teste atual:
  → "Se headline racional vencer: próximo teste = variações da description com ângulo racional"
  → "Se headline emocional vencer: próximo teste = criativo emocional (família) vs product-focused"
  → "Se urgência vencer: próximo teste = diferentes tipos de urgência (prazo vs vagas vs preço)"

Roadmap sugerido de otimização (3 ciclos):
  Ciclo 1 (mês 1): Testar [elemento atual]
  Ciclo 2 (mês 2): Testar [elemento de maior impacto baseado no resultado do ciclo 1]
  Ciclo 3 (mês 3): Testar [refinamento do elemento vencedor do ciclo 2]

Princípio: otimização contínua gera ganhos compostos. Uma campanha testada por 3 meses
performará substancialmente melhor do que a versão original de lançamento.
```

---

---

## Guia de Significância Estatística (simplificado)

Para garantir que os resultados do teste são confiáveis antes de decidir o vencedor:

| Volume mínimo por variação | Confiança do resultado | Ação recomendada |
|---------------------------|----------------------|-----------------|
| < 100 cliques | Baixa — não concluir | Aguardar mais dados |
| 100–300 cliques | Média — checar tendência | Pausar variações muito piores (> 50% abaixo) |
| 300–500 cliques | Alta — pode decidir | Encerrar o teste e escalar o vencedor |
| 500+ cliques | Muito alta | Decisão segura com 95% de confiança |

**Regra prática para a BR Pneus:**
> Se uma variação tem CTR consistentemente 2x maior ou menor por 5+ dias seguidos e mais de 200 impressões, a diferença provavelmente é real — não precisa de calculadora estatística.

---

## Princípios Psicológicos por Trás dos Testes

Ao criar variações de headline ou oferta, ancorar em um destes princípios aumenta a chance de encontrar um vencedor claro:

| Princípio | Variação ideal para testar | Persona mais receptiva |
|-----------|--------------------------|----------------------|
| Aversão à perda | "Não arrisque a família com pneu careca" | Ana |
| Ancoragem de preço | "4 pneus por menos de R$50/mês" | Carlos |
| Prova social | "4.8 estrelas | +500 clientes em [cidade]" | Giovana |
| Urgência real | "Vagas limitadas essa semana" | Todos |
| Reciprocidade | "Check-up gratuito antes de qualquer oferta" | Ana, Carlos |
| Autoridade | "[N] anos cuidando de carros em [cidade]" | Roberto |

> Ao definir as variações A/B/C, usar um princípio diferente em cada — assim o teste identifica qual gatilho ressoa mais com o público daquela campanha/cidade.

---

## Onde salvar
```
output/campanhas/teste-ab-[elemento]-[tema]-[YYYY-MM-DD].md
```
**Exemplo:** `output/campanhas/teste-ab-headline-pneus-2026-04-07.md`

---

## Referências Cruzadas
- Princípios psicológicos completos: `skills/conteudo/psicologia-marketing.md`
- Fórmulas de headline para criar variações: `skills/trafego-pago/landing-page-copy.md` → seção Biblioteca de Fórmulas
- Análise de resultado dos testes: `skills/analytics/insight-acao.md`
