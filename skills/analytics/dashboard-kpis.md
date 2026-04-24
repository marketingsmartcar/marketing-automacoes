# Skill: Template de Dashboard de KPIs

## Comando
`/dashboard-kpis [tipo]`

## O que faz
Gera a especificação completa de um dashboard de KPIs de marketing — quais métricas mostrar, como visualizá-las, de onde vem cada dado, como calcular, alertas automáticos e instruções de implementação.

---

## Parâmetros

| Parâmetro | Obrigatório | Opções |
|-----------|-------------|--------|
| `tipo` | Sim | `unidade`, `rede`, `campanha`, `telemarketing`, `social-media` |

---

## Estrutura do Output (para todos os tipos)

---

### BLOCO 1 — Especificação Geral

```
Nome do dashboard: [INSERIR]
Objetivo: [INSERIR — o que esse dashboard responde em 1 frase]
Público-alvo: [INSERIR — quem vai olhar e para quê]
Frequência de atualização: [Tempo real / Diário / Semanal / Mensal]
Ferramenta sugerida: [INSERIR]
Acesso: [INSERIR — quem deve ter acesso]
```

---

### BLOCO 2 — Layout Visual Sugerido

```
╔══════════════════════════════════════════════════════════╗
║  HEADER: Logo BR Pneus + Nome do Dashboard + Período     ║
╠══════════╦══════════╦══════════╦══════════╦══════════════╣
║  KPI #1  ║  KPI #2  ║  KPI #3  ║  KPI #4  ║   KPI #5    ║
║  (card)  ║  (card)  ║  (card)  ║  (card)  ║   (card)    ║
╠══════════╩══════╦═══╩══════════╩═══╦══════╩══════════════╣
║  Gráfico linha  ║  Gráfico barras  ║  Gráfico pizza/donut ║
║  (tendência)    ║  (comparativo)   ║  (distribuição)      ║
╠═════════════════╩══════════════════╩═════════════════════╣
║          Tabela detalhada / Ranking                       ║
╚══════════════════════════════════════════════════════════╝
```

**Seção 1 (topo):** KPIs macro em cards grandes — número principal + variação vs. período anterior + semáforo  
**Seção 2 (meio):** Gráficos (tendência temporal, comparativo entre canais/unidades)  
**Seção 3 (base):** Tabelas detalhadas, rankings, listas acionáveis  

---

## Dashboards por Tipo

---

### DASHBOARD: unidade

**Nome:** Dashboard de Marketing — BR Pneus & Oficina [Cidade]  
**Objetivo:** Visão completa do desempenho de marketing da unidade em tempo real  
**Público:** Gerente da unidade + marketing central  
**Atualização:** Diária (dados de ads em tempo real; demais com delay de 24h)  
**Ferramenta sugerida:** Google Looker Studio (gratuito) conectado ao Google Analytics + Google Ads + Meta Ads

---

**Cards do Topo (métricas principais):**

| Card | Métrica | Fórmula | Fonte | Semáforo |
|------|---------|---------|-------|---------|
| 1 | Leads no mês | Contagem de conversões | Google Ads + Meta + CRM | 🟢 ≥ meta / 🟡 -10% / 🔴 -10%+ |
| 2 | CPL médio (R$) | Investimento / leads | Google Ads + Meta | 🟢 ≤ meta / 🟡 +10% / 🔴 +10%+ |
| 3 | ROAS | Receita atribuída / investimento | Google Ads + Meta + CRM | 🟢 ≥ 4x / 🟡 3-4x / 🔴 < 3x |
| 4 | Agendamentos | Contagem no CRM/planilha | CRM | 🟢 ≥ meta / 🟡 -10% / 🔴 -10%+ |
| 5 | Avaliação Google | Nota média atual | GMB | 🟢 ≥ 4.5 / 🟡 4.0-4.5 / 🔴 < 4.0 |

**Gráficos:**

| Gráfico | Tipo | Dados | Insight que fornece |
|---------|------|-------|-------------------|
| Leads por dia (mês atual) | Linha | Google Ads + Meta + telefone | Identifica dias com picos/quedas correlacionáveis a ações |
| Investimento vs. Leads por canal | Barras agrupadas | Google Ads + Meta | Qual canal entrega mais leads por real investido |
| Funil de conversão | Funil | CRM + planilha | Onde estão os gargalos |
| Distribuição de investimento | Pizza | Planilha financeira | Se a verba está bem alocada |

**Tabela detalhada:**
- Performance por campanha (nome, impressões, cliques, leads, custo, ROAS)
- Top 5 keywords (cliques, conversões, custo)
- Últimas avaliações do Google (nota, texto, respondido?)

---

### DASHBOARD: rede

**Nome:** Dashboard Executivo — Rede BR Pneus & Oficina  
**Objetivo:** Visão consolidada e comparativa de todas as unidades para tomada de decisão estratégica  
**Público:** Diretoria + marketing central  
**Atualização:** Semanal (dados consolidados; tendências mensais)  
**Ferramenta sugerida:** Google Looker Studio com múltiplas fontes consolidadas por blender

---

**Cards do Topo:**

| Card | Métrica | Cálculo | Fonte |
|------|---------|---------|-------|
| 1 | Leads totais rede (mês) | Soma de todas unidades | Google Ads + Meta + CRM |
| 2 | CPL médio rede (R$) | Investimento total / leads totais | Google Ads + Meta |
| 3 | Receita atribuída marketing (R$) | Soma receita marketing todas unidades | CRM |
| 4 | ROAS médio rede | Receita / investimento total | Calculado |
| 5 | NPS médio rede | Média ponderada por volume | Sistema NPS |
| 6 | Avaliação Google média | Média ponderada por volume | GMB |

**Gráficos:**

| Gráfico | Tipo | Insight |
|---------|------|---------|
| Ranking de unidades por leads | Barras horizontais | Qual unidade está performando mais |
| Tendência da rede (últimos 6 meses) | Linha | Crescimento ou declínio da rede |
| Mapa de calor: unidade x KPI | Heatmap | Visual rápido de onde estão os problemas |
| Investimento vs. Receita por unidade | Scatter plot | Eficiência de cada unidade |

**Tabela:** Todas as unidades × todos os KPIs — com semáforo por célula

---

### DASHBOARD: campanha

**Nome:** Dashboard de Acompanhamento — [Nome da Campanha]  
**Objetivo:** Monitorar performance da campanha em tempo real e permitir ajustes ágeis  
**Público:** Gestor de tráfego + marketing central  
**Atualização:** Tempo real (Google Ads + Meta com delay de até 3h)  
**Ferramenta sugerida:** Google Ads + Meta Business Manager (dashboards nativos) + Google Sheets consolidado

---

**Cards do Topo:**

| Card | Métrica |
|------|---------|
| 1 | Leads gerados vs. meta (%) |
| 2 | Orçamento gasto vs. total (%) — alertar se gastar rápido demais |
| 3 | CPL atual vs. CPL meta |
| 4 | ROAS atual vs. ROAS meta |
| 5 | Dias restantes de campanha |

**Gráficos:**
- Leads por dia (linha) — com linha de meta diária para comparação
- Orçamento diário gasto (barras) — identificar se está bem distribuído
- Performance por criativo (barras) — para pausar os que não funcionam

**Alerta crítico:** Se orçamento gastar 50% antes de 40% da campanha → revisar lances e distribuição

---

### DASHBOARD: telemarketing

**Nome:** Dashboard de Telemarketing — BR Pneus & Oficina [Unidade/Rede]  
**Objetivo:** Monitorar e otimizar o funil de televendas responsável por 63% dos atendimentos  
**Público:** Supervisor de telemarketing + gerentes de unidade  
**Atualização:** Diária (planilha preenchida no final do turno)  
**Ferramenta sugerida:** Google Sheets com gráficos automáticos ou Looker Studio conectado à planilha

---

**Cards do Topo:**

| Card | Métrica | Fórmula | Meta |
|------|---------|---------|------|
| 1 | Ligações realizadas hoje | Contagem planilha | [INSERIR] |
| 2 | Taxa de contato efetivo | Contatos / ligações × 100 | > 50% |
| 3 | Taxa de agendamento | Agendamentos / contatos × 100 | > 30% |
| 4 | Taxa de comparecimento | Comparecimentos / agendamentos × 100 | > 70% |
| 5 | Taxa de conversão final | Serviços / ligações × 100 | > 15% |
| 6 | Receita gerada (hoje/semana/mês) | Soma ticket × serviços | [INSERIR] |

**Gráficos:**
- Funil visual (ligações → contatos → agendamentos → comparecimentos → serviços)
- Taxa de conversão por operador (barras horizontais)
- Tendência semanal de conversão (linha — últimas 4 semanas)
- Melhores horários de contato (heatmap dia × hora)

**Tabela:** Performance por operador (ligações, contatos, agendamentos, conversão, ticket médio)

---

### DASHBOARD: social-media

**Nome:** Dashboard de Redes Sociais — BR Pneus & Oficina [Unidade/Rede]  
**Objetivo:** Monitorar crescimento e engajamento nas redes sociais  
**Público:** Social media manager + marketing central  
**Atualização:** Diária (Instagram/Facebook Insights + TikTok Analytics)  
**Ferramenta sugerida:** Metricool (gratuito até certo volume) ou Looker Studio + connectors de redes sociais

---

**Cards do Topo:**

| Card | Métrica | Meta |
|------|---------|------|
| 1 | Seguidores totais Instagram | Crescimento > 3%/mês |
| 2 | Engajamento médio (%) | > 3% |
| 3 | Alcance total no mês | [INSERIR] |
| 4 | Posts publicados no mês | ≥ 12 (3/semana) |
| 5 | Avaliação Google média | ≥ 4.5⭐ |

**Gráficos:**
- Crescimento de seguidores (linha — últimos 12 meses)
- Engajamento por tipo de post (barras — educativo, promo, institucional, entretenimento)
- Alcance orgânico vs. pago (barras empilhadas)
- Melhores horários de publicação (heatmap)

**Tabela:** Top 10 posts do mês (tipo, alcance, engajamento, salvamentos, comentários)

---

### BLOCO 3 — Alertas Automáticos (para todos os tipos)

Configure alertas que disparam email/WhatsApp automaticamente:

| Trigger | Alerta para | Ação esperada |
|---------|-------------|--------------|
| CPL sobe > 20% em 7 dias | Gestor de tráfego | Revisar criativos e segmentação |
| Orçamento diário gasto antes das 14h | Gestor de tráfego | Ajustar limite diário |
| Taxa de conversão telemarketing < 10% por 3 dias | Supervisor telemarketing | Revisar script + treinamento |
| Avaliação Google cai abaixo de 4.3 | Gerente da unidade | Responder avaliações negativas |
| Avaliação negativa (1-2 estrelas) publicada | Gerente da unidade | Responder em até 24h |
| Orçamento de campanha atingir 80% | Gestor de tráfego + diretoria | Avaliar extensão ou pausa |
| NPS cai abaixo de 40 por 2 semanas | Gerente + marketing central | Investigar causa |
| Leads caem > 30% em relação à semana anterior | Gestor de tráfego | Diagnóstico imediato |

---

### BLOCO 4 — Instruções de Implementação

**Google Looker Studio (gratuito — recomendado):**

1. Acessar: lookerstudio.google.com
2. Criar novo relatório → selecionar fontes de dados
3. Conectar: Google Analytics 4 / Google Ads / Google Search Console / Google Sheets
4. Para Meta Ads: usar conector de terceiro (Supermetrics, Funnel.io ou exportar para Sheets)
5. Adicionar os gráficos e cards conforme o layout especificado
6. Configurar filtros de período e unidade
7. Compartilhar: "Visualizar" para franqueados / "Editar" para marketing central

**Planilha Google Sheets (alternativa sem integração):**
- Planilha mestre com abas por canal (Google Ads, Meta, Telemarketing, Social)
- Aba de dashboard com fórmulas que puxam os dados das outras abas
- Preenchimento diário pela equipe responsável por cada canal
- Atualização automatizada via Google Forms para telemarketing

**Níveis de acesso:**
| Perfil | Acesso | Dados visíveis |
|--------|--------|---------------|
| Franqueado | Visualizar | Apenas sua unidade |
| Gerente de unidade | Visualizar | Apenas sua unidade |
| Gestor de tráfego | Editar | Todas as unidades |
| Marketing central | Editar | Todas as unidades |
| Diretoria | Visualizar | Rede consolidada |

---

## Salvar em
`output/relatorios/dashboard-[tipo]-[data].md`

---

## Referências Cruzadas
- KPIs de referência: `agents/analytics-reporter.md`
- Relatório mensal completo: `/relatorio-mensal`
- Benchmark entre unidades: `/benchmark-unidades`
- Diagnóstico de alertas: `/insight-acao`
