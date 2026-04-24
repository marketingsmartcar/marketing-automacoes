---
name: estrategia-conteudo-seo
description: Gera plano estratégico de conteúdo SEO para o blog e site da BR Pneus & Oficina, com mapeamento de topic clusters, calendário de pautas priorizadas por potencial de tráfego e conversão, conteúdos sazonais e metas. Use sempre que precisar de estratégia de conteúdo, planejamento de blog para SEO, plano de pautas, grade de conteúdo para ranquear ou roadmap de conteúdo orgânico — mesmo que o pedido use termos como "plano de conteúdo", "o que publicar no blog", "estratégia de SEO para o trimestre" ou "pautas para o blog".
---

# Skill: Estratégia de Conteúdo SEO

## Comando
```
/estrategia-conteudo-seo [periodo]
```

## Parâmetros
- **periodo** (obrigatório): `mensal`, `trimestral` ou `semestral`

---

## Processo antes de gerar

1. Ler `knowledge/calendario-sazonal.md` para identificar datas e picos de demanda no período
2. Ler `knowledge/personas.md` para distribuir as pautas entre as 4 personas
3. Cruzar as keywords de maior potencial (saídas da skill `/pesquisa-keywords`) com a sazonalidade

---

## Estrutura obrigatória do output

### 1. Diagnóstico de Ponto de Partida

```
Período planejado: [data início → data fim]
Situação atual assumida: [blog novo / em crescimento / estabelecido]
Foco principal do período: [ex: "Estabelecer autoridade em pneus" | "Crescer tráfego local de serviços"]
Meta de tráfego orgânico ao final do período: [estimativa realista]
```

---

### 2. Mapeamento de Topic Clusters

O modelo de topic cluster organiza o conteúdo em torno de páginas-pilar, com artigos satélite que linkam para ela — melhora autoridade temática e navegação interna.

**Como funciona:**
```
Página Pilar (conteúdo amplo e definitivo sobre o tema)
├── Artigo Satélite 1 (aspecto específico do tema)
├── Artigo Satélite 2 (outro aspecto)
└── Artigo Satélite 3 (outro aspecto)
```

**Clusters sugeridos para a BR Pneus:**

---

**Cluster 1: Pneus**
- Página pilar: "Guia Completo de Pneus: como escolher, quando trocar e onde comprar"
- Satélites sugeridos:
  - "Como saber se o pneu está ruim: 7 sinais para não ignorar"
  - "Pneu nacional vs importado: vale a diferença de preço?"
  - "Guia de pneus por aro: qual o certo para o seu carro"
  - "Quando trocar os pneus: quilometragem ou tempo de uso?"
  - "Como calibrar o pneu corretamente"

---

**Cluster 2: Revisão Automotiva**
- Página pilar: "Revisão do carro: o guia completo para não ser enganado na oficina"
- Satélites sugeridos:
  - "Revisão preventiva: o que é e por que vale a pena"
  - "Checklist de revisão antes de viajar"
  - "De quanto em quanto tempo fazer revisão"
  - "O que é revisão completa e o que inclui"
  - "Quanto custa uma revisão completa: o que influencia o preço"

---

**Cluster 3: Serviços Mecânicos**
- Página pilar: "Serviços de mecânica: guia completo para cuidar do seu carro"
- Satélites sugeridos:
  - "Alinhamento e balanceamento: diferença, quando fazer e quanto custa"
  - "Troca de óleo: intervalos corretos por tipo de veículo"
  - "Freios: sinais de desgaste e quando substituir"
  - "Suspensão: como identificar problemas comuns"
  - "Correia dentada: o risco de não trocar no prazo"

---

**Cluster 4: Segurança no Trânsito**
- Página pilar: "Segurança no carro: tudo que você precisa checar antes de pegar a estrada"
- Satélites sugeridos:
  - "Como dirigir na chuva com segurança"
  - "Pneus no molhado: por que o desgaste é tão perigoso"
  - "Viagem de férias: checklist completo do carro"
  - "Por que o alinhamento afeta a segurança de frenagem"

---

**Cluster 5: Economia Automotiva**
- Página pilar: "Como economizar com o carro: guia de manutenção preventiva"
- Satélites sugeridos:
  - "Manutenção preventiva vs corretiva: qual é mais barata?"
  - "Como economizar combustível: dicas práticas"
  - "Parcelar pneu compensa? Veja as contas"
  - "O que a revisão periódica evita em gastos futuros"

---

### 3. Calendário de Pautas

Para o período solicitado, gerar a tabela completa de publicações:

**Regra de cadência:**
- Mínimo: 4 artigos por mês
- Ideal: 8 artigos por mês (2 por semana)
- Distribuição: 50% evergreen + 50% sazonal/oportunidade

Para cada pauta:

| Semana | Título sugerido | Keyword principal | Keywords secundárias | Cluster | Persona-alvo | Tipo de conteúdo | Prioridade | Critério |
|--------|----------------|-------------------|---------------------|---------|-------------|-----------------|-----------|---------|

**Prioridade (1–5):** baseada no cruzamento de:
- Volume de busca estimado para a keyword local
- Facilidade de ranquear (concorrência)
- Relevância para conversão (transacional supera informacional)
- Alinhamento com sazonalidade

**Tipo de conteúdo:** guia completo, lista de dicas, tutorial passo a passo, comparativo, FAQ, artigo local

---

### 4. Pautas Sazonais

Conteúdos que devem ser publicados com antecedência para ranquear antes do pico de demanda:

| Data/Evento | Antecedência de publicação | Pauta sugerida | Keyword |
|------------|--------------------------|----------------|---------|

Eventos recorrentes a considerar (cruzar com `knowledge/calendario-sazonal.md`):
- Férias de julho: 30 dias antes → "Revisão antes das férias" / "Checklist de viagem"
- Início das chuvas (out/nov): 30 dias antes → "Pneus para chuva" / "Segurança no molhado"
- Black Friday (novembro): 20 dias antes → "Guia de compra de pneu" / "Quando vale a pena trocar"
- Carnaval: 20 dias antes → "Carro seguro para a folia"
- Fim de ano: 30 dias antes → "Revisão de fim de ano"
- Volta às aulas: 15 dias antes → "Segurança no trânsito escolar"

---

### 5. Conteúdos Evergreen Prioritários

Artigos que geram tráfego consistente o ano inteiro — publicar nos primeiros meses para colher resultados mais rápido:

| # | Título | Keyword | Por que é evergreen |
|---|--------|---------|-------------------|
| 1 | "Quando trocar o pneu do carro: o guia definitivo" | quando trocar o pneu | Busca constante, alta intenção |
| 2 | "Quanto custa trocar o pneu: o que influencia o preço" | quanto custa trocar pneu | Alta intenção de compra |
| 3 | "Diferença entre alinhamento e balanceamento" | diferença alinhamento balanceamento | Busca frequente, informacional |
| 4 | "Sinais de que o pneu está careca" | pneu careca sinais | Alta busca, urgência |
| 5 | "De quanto em quanto tempo trocar o óleo" | intervalo troca de óleo | Busca constante de motoristas |
| 6 | "O que é revisão preventiva e por que fazer" | revisão preventiva carro | Topo de funil, alta autoridade |
| 7 | "Como calibrar o pneu corretamente" | como calibrar pneu | Busca recorrente |
| 8 | "Revisão antes de viajar: o checklist completo" | revisão antes de viajar | Pico nas férias, bom o ano todo |
| 9 | "Pneu nacional vs importado: qual escolher" | pneu nacional ou importado | Dúvida frequente na compra |
| 10 | "Como economizar combustível: dicas práticas" | economizar combustível carro | Sempre relevante, amplo |

---

### 6. Métricas e Metas

```
Metas para o período [inserir período]:
- Artigos publicados: [N]
- Keywords na primeira página do Google: [N] (estimativa realista)
- Crescimento de tráfego orgânico: [X%] sobre o período anterior
- Leads gerados pelo blog (cliques no CTA de agendamento): [N]

O que monitorar mensalmente:
- Google Search Console: impressões, cliques, CTR, posição média por keyword
- Top 10 artigos por tráfego orgânico
- Keywords que entraram no top 10 (primeira página)
- Keywords que saíram do top 10 (precisam de atualização)
- Taxa de rejeição por artigo (indicador de qualidade)

Frequência de revisão e atualização de conteúdo:
- Artigos com queda de tráfego > 20% em 90 dias: revisar e atualizar
- Artigos evergreen: revisão anual mínima
- Atualizar data de modificação após revisão (sinal de frescor para o Google)
```

---

## Regras de qualidade

- Nunca planejar dois artigos para a mesma keyword principal (canibalização)
- Conteúdo evergreen tem prioridade sobre conteúdo sazonal nos primeiros 3 meses
- Cada artigo deve ser útil por si mesmo — não criar conteúdo only para SEO sem valor real ao leitor
- Links internos: todo novo artigo deve linkar para pelo menos 2 páginas existentes e receber link de pelo menos 1 página existente

---

## Onde salvar
```
output/relatorios/estrategia-seo-[periodo]-[YYYY-MM-DD].md
```
**Exemplo:** `output/relatorios/estrategia-seo-trimestral-2026-04-07.md`
