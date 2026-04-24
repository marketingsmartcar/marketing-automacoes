# Skill: Insight → Ação (Diagnóstico Rápido)

## Comando
`/insight-acao [problema-ou-dado] [unidade-opcional]`

## O que faz
A partir de um problema, dado ou observação específica, gera análise diagnóstica rápida com hipóteses priorizadas, checklist de verificação imediata e plano de ação em 3 horizontes (24h, 7 dias, correção completa). É o "médico de plantão" do marketing.

---

## Parâmetros

| Parâmetro | Obrigatório | Exemplos |
|-----------|-------------|---------|
| `problema-ou-dado` | Sim | `queda-30-leads-google-ads`, `NPS-caiu-6.5`, `CPL-dobrou-Meta`, `taxa-conversao-telemarketing-caiu`, `engajamento-Instagram-caiu-metade`, `avaliacao-google-3.8` |
| `unidade-opcional` | Não | `Araraquara`, `Maringa`, `rede` |

---

## Estrutura do Output

---

### 1. Diagnóstico Inicial

```
PROBLEMA IDENTIFICADO:
[Restatement do problema em 1-2 frases claras]

UNIDADE/ESCOPO: [INSERIR]
PERÍODO DETECTADO: [INSERIR — quando o problema começou ou foi identificado]

GRAVIDADE:
🔴 CRÍTICO — agir hoje (impacto direto em receita ou risco à marca)
🟡 IMPORTANTE — agir esta semana (impacto crescente se não endereçado)
🟢 MONITORAR — agir no próximo ciclo (tendência, não emergência)

STATUS: [INSERIR]
```

**Dados disponíveis para análise:**
- [INSERIR — lista do que se sabe sobre o problema]

**Dados ausentes que seriam úteis:**
- [INSERIR — o que falta para análise completa]

---

### 2. Hipóteses (da mais para a menos provável)

Para cada hipótese:

---

**Hipótese 1 — [INSERIR NOME CURTO]**
- Descrição: [INSERIR — o que pode estar causando o problema]
- Probabilidade: 🔴 Alta | 🟡 Média | 🟢 Baixa
- Base: [INSERIR — por que essa hipótese faz sentido dado o contexto]
- Como verificar: [INSERIR — que dado olhar, onde, em quanto tempo]
- Tempo para verificar: [INSERIR — ex: "5 minutos no painel do Google Ads"]

**Hipótese 2 — [INSERIR]**
- Descrição: [INSERIR]
- Probabilidade: 🔴/🟡/🟢
- Base: [INSERIR]
- Como verificar: [INSERIR]
- Tempo para verificar: [INSERIR]

*(Mínimo 5 hipóteses — cobrir causas técnicas, de conteúdo, de mercado e operacionais)*

**Hipótese 3 — [INSERIR]** (mesmo formato)
**Hipótese 4 — [INSERIR]** (mesmo formato)
**Hipótese 5 — [INSERIR]** (mesmo formato)

---

### 3. Diagnóstico Rápido (30 minutos)

Checklist de verificações imediatas, ordenadas por velocidade:

**Em 5 minutos — verificar no painel:**
- [ ] [INSERIR — ex: "Google Ads: verificar se alguma campanha foi pausada ou teve orçamento zerado"]
  - Onde: Google Ads → Campanhas → Status
  - O que procurar: [INSERIR]
- [ ] [INSERIR]
- [ ] [INSERIR]

**Em 15 minutos — verificar nos dados:**
- [ ] [INSERIR — ex: "Comparar curva de leads desta semana vs. semana anterior dia a dia"]
  - Onde: [INSERIR]
  - O que procurar: [INSERIR]
- [ ] [INSERIR]
- [ ] [INSERIR]

**Em 30 minutos — verificar no contexto:**
- [ ] [INSERIR — ex: "Verificar se houve mudança de sazonalidade — feriado? Evento local?"]
  - Onde: calendário + `knowledge/calendario-sazonal.md`
- [ ] [INSERIR — ex: "Verificar se concorrente lançou promoção agressiva na região"]
  - Onde: busca manual no Google + redes sociais dos concorrentes
- [ ] [INSERIR]

---

**Árvore de decisão por hipótese confirmada:**

```
[Verificou que a campanha principal foi pausada?]
    └── SIM → Reativar imediatamente + verificar por que foi pausada
               (orçamento zerado? Problema no cartão? Aprovação de anúncio reprovada?)

[Verificou que o CPC subiu muito?]
    └── SIM → Verificar leilão → competidores entraram no leilão?
               → Reduzir lances em keywords menos eficientes + aumentar em conversoras

[Verificou que os criativos pararam de rodar?]
    └── SIM → Criar novos criativos ou reativar variações antigas que funcionavam

[Verificou que é sazonalidade/feriado?]
    └── SIM → Normal — monitorar retorno. Considerar antecipação da campanha próxima vez.

[Verificou que é problema operacional (telemarketing não está ligando)?]
    └── SIM → Verificar escala/ausências + redistribuir contatos urgentes
```

*(Adaptar a árvore de decisão ao problema específico informado)*

---

### 4. Ações Imediatas (próximas 24–48h)

> 3 ações que podem ser tomadas AGORA, independente da causa confirmada.

**Ação Imediata #1 — [INSERIR NOME]**
- O que fazer: [INSERIR — específico, com passo a passo]
- Quem faz: [INSERIR]
- Quando: [INSERIR — hoje / em X horas]
- Resultado esperado: [INSERIR]
- Risco de não fazer: [INSERIR]

**Ação Imediata #2 — [INSERIR NOME]**
(mesmo formato)

**Ação Imediata #3 — [INSERIR NOME]**
(mesmo formato)

---

### 5. Ações de Investigação (próximos 7 dias)

**Análises a aprofundar:**
- [INSERIR — ex: "Análise de auction insights do Google Ads: algum novo concorrente entrou no leilão?"]
  - Como fazer: [INSERIR]
  - Tempo estimado: [INSERIR]
- [INSERIR]
- [INSERIR]

**Dados a coletar:**
- [INSERIR — ex: "Exportar relatório de keywords dos últimos 30 dias e comparar com os 30 dias anteriores"]
  - Fonte: [INSERIR]
- [INSERIR]

**Testes a realizar:**
- [INSERIR — ex: "Criar 3 novos criativos com ângulos diferentes e deixar rodar por 5 dias"]
- [INSERIR]

**Comparações a fazer:**
- [INSERIR — ex: "Comparar performance desta unidade vs. outras unidades da rede no mesmo período"]
  - Skill: `/benchmark-unidades`
- [INSERIR]

---

### 6. Plano de Correção (se hipótese principal se confirmar)

> Preencher após confirmação da causa. Substituir a hipótese principal pelo problema real.

**Causa confirmada:** [INSERIR após investigação]

**Plano de correção:**

| Etapa | Ação | Responsável | Prazo | Recurso necessário |
|-------|------|------------|-------|-------------------|
| 1 | [INSERIR] | [INSERIR] | [INSERIR] | [INSERIR] |
| 2 | [INSERIR] | [INSERIR] | [INSERIR] | [INSERIR] |
| 3 | [INSERIR] | [INSERIR] | [INSERIR] | [INSERIR] |
| 4 | [INSERIR] | [INSERIR] | [INSERIR] | [INSERIR] |

**Meta de recuperação:**
- KPI atual: [INSERIR]
- Meta em 30 dias: [INSERIR]
- Meta em 60 dias: [INSERIR]

**Ponto de reavaliação:** [INSERIR — ex: "Revisar em 7 dias após implementar ações"]

---

### 7. Prevenção — Monitorar para Detectar Mais Cedo

**Indicadores que devem ser monitorados com maior frequência após este incidente:**

| Indicador | Frequência atual | Frequência recomendada | Onde monitorar |
|-----------|-----------------|----------------------|---------------|
| [INSERIR] | [semanal/mensal] | [diária/semanal] | [INSERIR] |
| [INSERIR] | | | |
| [INSERIR] | | | |

**Alerta automático sugerido:**
- Se [KPI] cair [X]% em [período] → alertar [responsável] via [canal]
- Implementar em: [dashboard ou ferramenta de monitoramento]
- Referência: `/dashboard-kpis [tipo]` — seção de alertas automáticos

---

## Guia por Tipo de Problema

Para cada categoria de problema, gerar hipóteses específicas:

---

### Queda de Leads (Google Ads)

**Hipóteses padrão a verificar:**
1. Campanha pausada (orçamento zerado, problema no pagamento, aprovação reprovada)
2. Aumento de CPC por competição no leilão — outros anunciantes entraram
3. Criativos com fadiga (mesmos anúncios rodando há muito tempo — CTR caiu)
4. Mudança no algoritmo ou na configuração da campanha (alguém mexeu?)
5. Sazonalidade — período naturalmente mais fraco
6. Problema de rastreamento (tag de conversão parou de funcionar — leads existem mas não aparecem)
7. Keyword match type alterado (broad demais ou exact restritivo demais)
8. Budget esgotando antes do fim do dia

**Verificação prioritária:** `Google Ads → Diagnóstico → Verificar status das campanhas + conversões nos últimos 7 dias`

---

### Queda de Leads (Meta Ads)

**Hipóteses padrão:**
1. Fadiga de criativo — frequência alta, CTR caindo
2. Segmentação esgotada — o público foi saturado
3. Aprovação de anúncio reprovada ou conta suspensa
4. Aumento de CPM (custo por mil impressões) por maior competição
5. Pixel com problema — conversões não estão sendo contadas
6. Mudança no algoritmo do Meta
7. Orçamento insuficiente para o objetivo da campanha

**Verificação prioritária:** `Meta Business → Gerenciador → Diagnóstico de entrega + Frequência média`

---

### Queda de NPS

**Hipóteses padrão:**
1. Problema de qualidade em serviço específico (novo fornecedor? Peça com defeito?)
2. Problema de atendimento (funcionário novo? Rotatividade?)
3. Tempo de espera aumentou (volume maior sem aumento de equipe?)
4. Promessa feita na venda não cumprida na entrega
5. Problema com a garantia BR Total (cliente acionou e não foi atendido bem?)
6. Período de alta demanda — qualidade caiu com volume
7. Problema em uma unidade específica ou generalizado?

**Verificação prioritária:** `Ler os comentários abertos do NPS + cruzar com a unidade e período`

---

### CPL Subindo (Meta ou Google)

**Hipóteses padrão:**
1. Fadiga de criativo (mesmo anúncio, CTR caindo, custo subindo)
2. Maior competição no leilão (período sazonal para concorrentes também)
3. Segmentação foi alargada demais ou restringida demais
4. Qualidade do lead caiu (muitos leads desqualificados — taxa de conversão caiu também?)
5. Mudança na oferta/mensagem (a proposta atual ressoa menos?)
6. Aumento de CPM base (Meta) ou CPC base (Google) por sazonalidade
7. Problema na landing page/fluxo de captura (mais cliques, menos conversões)

---

### Taxa de Conversão do Telemarketing Caindo

**Hipóteses padrão:**
1. Qualidade dos leads piorou (leads mais frios chegando)
2. Script desatualizado (objeções novas não mapeadas)
3. Operador novo ou operador chave saiu
4. Horário de contato inadequado (ligando em horários de menor receptividade)
5. Problema na oferta — concorrente com condição melhor no momento
6. Volume muito alto por operador — qualidade do atendimento caiu
7. Follow-up insuficiente (desistindo rápido demais)

---

## Salvar em
`output/relatorios/insight-[problema-resumido]-[data].md`

---

## Referências Cruzadas
- KPIs e metas de referência: `agents/analytics-reporter.md`
- Benchmark para comparação: `/benchmark-unidades`
- Dashboard com alertas: `/dashboard-kpis`
- Calendário sazonal (sazonalidade): `knowledge/calendario-sazonal.md`
