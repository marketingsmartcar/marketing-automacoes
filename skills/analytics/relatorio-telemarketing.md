# Skill: Relatório de Telemarketing

## Comando
`/relatorio-telemarketing [periodo] [unidade-ou-rede]`

## O que faz
Gera a estrutura completa de relatório de desempenho do setor de telemarketing — o canal responsável por 63% dos veículos atendidos na BR Pneus & Oficina. Analisa funil, performance por operador, melhores horários, objeções e recomendações de otimização.

---

## Parâmetros

| Parâmetro | Obrigatório | Exemplos |
|-----------|-------------|---------|
| `periodo` | Sim | `julho-2026`, `semana-28-2026`, `trimestre3-2026` |
| `unidade-ou-rede` | Sim | `Araraquara`, `Maringa`, `rede` |

---

## Contexto: Importância do Telemarketing na BR Pneus

O telemarketing ativo é o canal #1 de atendimentos da BR Pneus & Oficina — responsável por 63% dos veículos atendidos. Isso significa que otimizar o funil de telemarketing tem impacto direto na receita maior do que qualquer canal de marketing digital. Uma melhoria de 5% na taxa de conversão do telemarketing pode superar o impacto de dobrar o orçamento de Google Ads.

---

## Estrutura do Output

---

### 1. Resumo Executivo

```
RELATÓRIO DE TELEMARKETING — [PERÍODO] — BR PNEUS & OFICINA [UNIDADE/REDE]

Total de contatos realizados: [INSERIR]
Taxa de conversão (ligação → serviço): [INSERIR]%
Receita gerada pelo telemarketing: R$ [INSERIR]
% da receita total atribuída ao telemarketing: [INSERIR]%

VS. PERÍODO ANTERIOR:
Contatos: ↑↓[%] | Conversão: ↑↓[pp] | Receita: ↑↓[%]

DESTAQUE DO PERÍODO:
🏆 Melhor operador/turno: [INSERIR] — [métrica que destaca]
⚡ Principal gargalo: [INSERIR etapa do funil] — [o que está causando]
📋 Recomendação #1: [INSERIR]
```

---

### 2. Funil de Telemarketing

**Funil visual completo:**

```
┌─────────────────────────────────────────────┐
│  LIGAÇÕES REALIZADAS                         │
│  [INSERIR] contatos tentados                 │
└────────────────┬────────────────────────────┘
                 │ Taxa de contato efetivo: [INSERIR]%
                 │ (benchmark ideal: > 50%)
                 ▼
┌─────────────────────────────────────────────┐
│  CONTATOS EFETIVOS                          │
│  [INSERIR] — falou com o cliente            │
└────────────────┬────────────────────────────┘
                 │ Taxa de interesse: [INSERIR]%
                 │ (% dos contatos que ouviu a proposta)
                 ▼
┌─────────────────────────────────────────────┐
│  DEMONSTRARAM INTERESSE                     │
│  [INSERIR] — não desligou de imediato       │
└────────────────┬────────────────────────────┘
                 │ Taxa de agendamento: [INSERIR]%
                 │ (benchmark ideal: > 30% dos contatos)
                 ▼
┌─────────────────────────────────────────────┐
│  AGENDAMENTOS REALIZADOS                    │
│  [INSERIR] — marcou horário                 │
└────────────────┬────────────────────────────┘
                 │ Taxa de comparecimento: [INSERIR]%
                 │ (benchmark ideal: > 70%)
                 ▼
┌─────────────────────────────────────────────┐
│  COMPARECIMENTOS                            │
│  [INSERIR] — foi à loja                     │
└────────────────┬────────────────────────────┘
                 │ Taxa de conversão final: [INSERIR]%
                 │ (benchmark ideal: > 90%)
                 ▼
┌─────────────────────────────────────────────┐
│  SERVIÇOS REALIZADOS                        │
│  [INSERIR] — comprou e fez o serviço        │
│  Ticket médio: R$ [INSERIR]                 │
│  Receita total: R$ [INSERIR]                │
└─────────────────────────────────────────────┘
```

**Taxa de conversão ponta a ponta (ligação → serviço):** [INSERIR]%
**Benchmark de mercado para telefone ativo no setor automotivo:** 10–20%

**Gargalo principal identificado:**
- Etapa: [INSERIR — onde a maior queda ocorre]
- Queda: de [n] para [n] ([%] de perda)
- Hipótese principal: [INSERIR]
- Ação recomendada: [INSERIR]

---

### 3. Análise por Tipo de Contato

| Tipo de Contato | Volume | Agend. | Taxa Agend. | Compareceu | Serviços | Conv. Final | Ticket Méd. |
|----------------|--------|--------|------------|-----------|---------|------------|------------|
| Primeiro contato (lead novo) | [n] | [n] | [%] | [n] | [n] | [%] | R$ [x] |
| Follow-up (2º/3º toque) | [n] | [n] | [%] | [n] | [n] | [%] | R$ [x] |
| Reativação (cliente inativo) | [n] | [n] | [%] | [n] | [n] | [%] | R$ [x] |
| Cross-sell pós-serviço | [n] | [n] | [%] | [n] | [n] | [%] | R$ [x] |
| Lembrete de revisão | [n] | [n] | [%] | [n] | [n] | [%] | R$ [x] |
| **TOTAL** | **[n]** | **[n]** | **[%]** | **[n]** | **[n]** | **[%]** | **R$ [x]** |

**Insights:**
- Tipo com maior taxa de conversão: [INSERIR] — [hipótese do porquê]
- Tipo com maior ticket médio: [INSERIR]
- Melhor ROI de tempo/esforço: [INSERIR — tipo que gera mais resultado por ligação]

**Recomendação de alocação do tempo da equipe:**
- Priorizar: [INSERIR — % do tempo]
- Manter: [INSERIR — % do tempo]
- Reduzir: [INSERIR — % do tempo]
- Justificativa: [INSERIR]

---

### 4. Análise por Serviço Ofertado

| Serviço Ofertado | Ligações | Interesse | Agendamentos | Taxa Conv. | Ticket Méd. | Receita |
|------------------|---------|-----------|-------------|-----------|------------|---------|
| Troca de pneu | [n] | [%] | [n] | [%] | R$ [x] | R$ [x] |
| Alinhamento + balanceamento | [n] | [%] | [n] | [%] | R$ [x] | R$ [x] |
| Troca de óleo | [n] | [%] | [n] | [%] | R$ [x] | R$ [x] |
| Revisão completa | [n] | [%] | [n] | [%] | R$ [x] | R$ [x] |
| Ar condicionado | [n] | [%] | [n] | [%] | R$ [x] | R$ [x] |
| Outros | [n] | [%] | [n] | [%] | R$ [x] | R$ [x] |

**Serviço com maior taxa de aceite:** [INSERIR] — [hipótese]
**Serviço com maior ticket:** [INSERIR]
**Oportunidade de cross-sell mais eficiente:** [INSERIR — ex: "quem aceita troca de óleo tem X% de aceitação para balanceamento na mesma visita"]
**Recomendação:** [INSERIR — como usar esse dado para treinar a equipe]

---

### 5. Performance por Operador

> Foco em desenvolvimento, nunca em punição. Dados para apoiar treinamento e reconhecimento.

**Tabela de Performance:**

| Operador | Ligações | Contatos | Agend. | Compar. | Serviços | Taxa Conv. | Ticket Méd. | Receita | Score |
|----------|---------|---------|--------|---------|---------|-----------|------------|---------|-------|
| [INSERIR] | [n] | [n] | [n] | [n] | [n] | [%] | R$ [x] | R$ [x] | [0-10] |
| [INSERIR] | | | | | | | | | |
| **Média** | | | | | | **[%]** | **R$ [x]** | **R$ [x]** | |

**Score do operador:** média ponderada de taxa de conversão (50%) + ticket médio (30%) + volume de ligações (20%)

**Top performer do período — [INSERIR NOME]:**
- Score: [n]/10
- O que faz diferente (levantar em conversa individual):
  - [ ] Tom de voz e abordagem mais consultiva?
  - [ ] Melhor identificação do momento certo para ligar?
  - [ ] Uso diferente do script (personalização)?
  - [ ] Maior persistência no follow-up?
- Ação: compartilhar a abordagem deste operador com o time em próxima reunião

**Operadores abaixo da média:**

| Operador | Gap vs. média | Hipótese | Ação de desenvolvimento |
|----------|--------------|---------|------------------------|
| [INSERIR] | -[X]pp conversão | [INSERIR] | [INSERIR — treinamento específico] |
| [INSERIR] | | | |

**Necessidades de treinamento identificadas:**
- [INSERIR — ex: "3 operadores com baixa taxa de contato — treinar abordagem inicial e horários de ligação"]
- [INSERIR]

---

### 6. Análise de Horários e Dias de Melhor Performance

**Tabela: Taxa de Contato Efetivo por Dia e Horário**

| Hora | Segunda | Terça | Quarta | Quinta | Sexta | Sábado |
|------|---------|-------|--------|--------|-------|--------|
| 8–9h | [%] | [%] | [%] | [%] | [%] | [%] |
| 9–10h | [%] | [%] | [%] | [%] | [%] | [%] |
| 10–11h | [%] | [%] | [%] | [%] | [%] | [%] |
| 11–12h | [%] | [%] | [%] | [%] | [%] | [%] |
| 13–14h | [%] | [%] | [%] | [%] | [%] | [%] |
| 14–15h | [%] | [%] | [%] | [%] | [%] | [%] |
| 15–16h | [%] | [%] | [%] | [%] | [%] | [%] |
| 16–17h | [%] | [%] | [%] | [%] | [%] | [%] |
| 17–18h | [%] | [%] | [%] | [%] | [%] | [%] |

**Gráfico sugerido:** Heatmap com gradiente de cor (verde = alta taxa / vermelho = baixa taxa)

**Insights:**
- Melhor janela de horário: [INSERIR]
- Melhor dia da semana: [INSERIR]
- Pior horário (evitar ou realocar equipe): [INSERIR]
- Recomendação de escala: [INSERIR — concentrar mais operadores nos horários de pico]

---

### 7. Análise de Objeções

> Dados coletados da planilha de telemarketing (campo "motivo da recusa/objeção")

**Top 5 Objeções Mais Frequentes:**

| # | Objeção | Freq. | Taxa de Contorno | Trend | Ação |
|---|---------|-------|-----------------|-------|------|
| 1 | [INSERIR — ex: "Já tenho um mecânico de confiança"] | [n] ([%]) | [%] | ↑↓ | [INSERIR] |
| 2 | [INSERIR — ex: "Está caro, vou ver em outros lugares"] | [n] ([%]) | [%] | ↑↓ | [INSERIR] |
| 3 | [INSERIR — ex: "Não estou precisando agora"] | [n] ([%]) | [%] | ↑↓ | [INSERIR] |
| 4 | [INSERIR — ex: "Não tenho tempo esta semana"] | [n] ([%]) | [%] | ↑↓ | [INSERIR] |
| 5 | [INSERIR] | [n] ([%]) | [%] | ↑↓ | [INSERIR] |

**Taxa de contorno** = % dos clientes com essa objeção que ainda assim agendaram

**Objeções com baixa taxa de contorno (< 20%) — oportunidade de melhoria de script:**
- [INSERIR] — [hipótese de por que a equipe tem dificuldade + argumento sugerido]
- [INSERIR]

**Recomendação:** Atualizar script de objeções usando a skill `/script-objecoes` do agente Telemarketing Scripts — priorizar as objeções #[n] e #[n]

---

### 8. Comparativo e Tendências

**Evolução mensal (últimos 6 meses):**

| Mês | Ligações | Conversão | Receita | CPL (R$) |
|-----|---------|-----------|---------|---------|
| [Mês -5] | [n] | [%] | R$ [x] | R$ [x] |
| [Mês -4] | [n] | [%] | R$ [x] | R$ [x] |
| [Mês -3] | [n] | [%] | R$ [x] | R$ [x] |
| [Mês -2] | [n] | [%] | R$ [x] | R$ [x] |
| [Mês -1] | [n] | [%] | R$ [x] | R$ [x] |
| [Mês atual] | [n] | [%] | R$ [x] | R$ [x] |

**Gráfico sugerido:** Linha com conversão e receita mês a mês — identificar tendência

**Correlação com leads de marketing:**

| Mês | Leads de Ads | Ligações Telemarketing | Serviços | Correlação |
|-----|-------------|----------------------|---------|-----------|
| [INSERIR] | [n] | [n] | [n] | [INSERIR] |

**Insight:** O telemarketing é mais eficiente quando recebe leads quentes de marketing ou quando trabalha com base fria? [INSERIR análise]

**Projeção para o próximo período:**
- Base atual de [X] conversões/mês → com ajustes recomendados → meta de [Y] conversões
- Receita adicional projetada: R$ [INSERIR]

---

### 9. Recomendações

**3 ações para aumentar taxa de conversão:**

| # | Ação | Impacto Esperado | Responsável | Prazo |
|---|------|-----------------|------------|-------|
| 1 | [INSERIR — ex: "Implementar sequência de 3 toques para leads que não atenderam no 1º contato"] | +[X]pp conversão | [INSERIR] | [INSERIR] |
| 2 | [INSERIR — ex: "Ligar prioritariamente na faixa 10h-12h, que tem 30% mais taxa de contato"] | +[X]pp taxa contato | [INSERIR] | [INSERIR] |
| 3 | [INSERIR] | [INSERIR] | [INSERIR] | [INSERIR] |

**3 ações para aumentar ticket médio:**

| # | Ação | Impacto Esperado | Responsável | Prazo |
|---|------|-----------------|------------|-------|
| 1 | [INSERIR — ex: "Treinar oferta de combo: troca de óleo + balanceamento sempre que cliente aceitar troca de óleo"] | +R$ [x] ticket | [INSERIR] | [INSERIR] |
| 2 | [INSERIR] | [INSERIR] | [INSERIR] | [INSERIR] |
| 3 | [INSERIR] | [INSERIR] | [INSERIR] | [INSERIR] |

**Necessidades de treinamento:**
- [INSERIR — ex: "Treinamento de contorno de objeção 'está caro' — 3 operadores abaixo da taxa média"]
  - Skill a usar: `agents/telemarketing-scripts.md` + `/script-objecoes`
- [INSERIR]

**Metas sugeridas para o próximo período:**

| KPI | Meta Atual | Meta Sugerida | Justificativa |
|-----|-----------|--------------|--------------|
| Taxa de contato efetivo | [%] | [%] | [INSERIR] |
| Taxa de agendamento | [%] | [%] | [INSERIR] |
| Taxa de comparecimento | [%] | [%] | [INSERIR] |
| Taxa de conversão final | [%] | [%] | [INSERIR] |
| Ticket médio | R$ [x] | R$ [x] | [INSERIR] |
| Receita total | R$ [x] | R$ [x] | [INSERIR] |

---

## Salvar em
`output/relatorios/telemarketing-[periodo]-[unidade]-[data].md`

---

## Referências Cruzadas
- KPIs de telemarketing: `agents/analytics-reporter.md`
- Scripts e objeções: `agents/telemarketing-scripts.md`
- Relatório mensal completo: `/relatorio-mensal`
- Diagnóstico de queda: `/insight-acao taxa-conversao-telemarketing-caindo [unidade]`
