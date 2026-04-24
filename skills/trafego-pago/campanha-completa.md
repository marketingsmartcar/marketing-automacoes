---
name: campanha-completa
description: Gera a estrutura integrada completa de uma campanha de tráfego pago da BR Pneus & Oficina, combinando Google Ads Search, Meta Ads (Feed + Stories), Landing Page e Remarketing em um único plano com distribuição de orçamento, metas, cronograma e checklist de lançamento. Use sempre que precisar estruturar uma campanha do zero, planejar uma campanha completa de tráfego pago, definir onde investir o orçamento de mídia ou criar uma estratégia integrada de aquisição — mesmo que o pedido use termos como "monta uma campanha", "como investir meu orçamento de ads", "estratégia de tráfego pago" ou "campanha de lançamento".
---

# Skill: Campanha Completa de Tráfego Pago

## Comando
```
/campanha-completa [objetivo] [servico] [cidade] [orcamento-mensal]
```

## Parâmetros
- **objetivo** (obrigatório): `leads`, `agendamentos`, `whatsapp`, `visitas-loja`
- **servico** (obrigatório): Serviço ou oferta central da campanha. Ex: "pneus", "revisão completa", "troca de óleo", "alinhamento"
- **cidade** (obrigatório): Cidade-alvo
- **orcamento-mensal** (obrigatório): Orçamento total mensal em reais. Ex: `R$1500`, `R$3000`, `R$5000`

---

## Processo antes de criar

1. Consultar `CLAUDE.md` para confirmar diferenciais, personas e lista de unidades ativas
2. Consultar `knowledge/calendario-sazonal.md` para verificar se há data especial no período que justifique ajuste de estratégia
3. Calcular distribuição de orçamento com base no objetivo (Search tem maior ROI inicial para serviços locais)

---

## Estrutura obrigatória do output

### 1. Resumo Estratégico

```
Campanha: BR Pneus | [Serviço] | [Cidade]
Objetivo: [Leads | Agendamentos | Conversas WhatsApp | Visitas à loja]
Período sugerido: [30 dias padrão — ajustar se promoção com prazo]
Mensagem central: [1 frase que resume a proposta da campanha]
Diferencial principal em destaque: [parcelamento 18x | garantia BR Total | preço | mix]
Persona principal: [Carlos | Ana | Roberto | Giovana — baseada no serviço]
```

---

### 2. Distribuição de Orçamento

Calcular a partir do orçamento mensal informado:

| Canal | % do Orçamento | Valor Mensal | Valor Diário | Justificativa |
|-------|---------------|-------------|-------------|---------------|
| Google Ads Search | 45% | R$[X] | R$[X]/dia | Maior intenção de compra — captura quem já quer o serviço |
| Meta Ads Feed | 25% | R$[X] | R$[X]/dia | Alcance e geração de demanda latente |
| Meta Ads Stories | 10% | R$[X] | R$[X]/dia | Complementa feed com formato imersivo |
| Remarketing (Google + Meta) | 15% | R$[X] | R$[X]/dia | Reimpactar leads que não converteram |
| Reserva para testes/otimização | 5% | R$[X] | — | Escalar o que funcionar |

> Para orçamentos abaixo de R$1.500/mês: concentrar em Google Search (60%) + Meta Feed (30%) + Remarketing (10%)  
> Para orçamentos acima de R$4.000/mês: adicionar Performance Max e aumentar remarketing

---

### 3. Metas e KPIs

```
Meta de leads/mês: [calcular: orçamento total ÷ CPL estimado R$15–30]
Meta de custo por lead (CPL): R$[15–30] (benchmark regional)
Meta de conversão de leads em agendamentos: 30–50%
Meta de ROAS mínimo: 3x (cada R$1 investido gera R$3 em receita)

KPIs para acompanhar semanalmente:
Google Ads:
  - Impressões e CTR por grupo de anúncios
  - CPC médio
  - Conversões (ligações, WhatsApp clicado, formulário)
  - Custo por conversão

Meta Ads:
  - Alcance e CPM
  - CTR e CPC
  - Custo por mensagem iniciada (objetivo mensagens)
  - Frequência (acima de 5 = necessário renovar criativo)

Geral:
  - Total de leads por semana
  - Taxa de conversão de lead para agendamento (medir no CRM/WhatsApp)
  - Receita atribuída à campanha
```

---

### 4. Google Ads Search (resumo executivo)

*Para copy completa: usar skill `/google-ads-search [servico] [cidade]`*

```
Campanha: BR Pneus | [Serviço] Search | [Cidade]
Orçamento diário: R$[X]

Grupo 1: [Intenção de compra direta]
Keywords principais: [pneu barato cidade] | "trocar pneu cidade" | [loja de pneus cidade]
Headline destaque: "Pneus Baratos em [Cidade] | Parcele em 18x"
Description destaque: "Maior mix, melhores preços, garantia BR Total. Agende pelo WhatsApp!"

Grupo 2: [Intenção de serviço]
Keywords principais: "alinhamento cidade" | [troca de pneu cidade] | "revisão cidade"
Headline destaque: "[Serviço] em [Cidade] | BR Pneus & Oficina"
Description destaque: "Equipe treinada, equipamentos modernos. Preço justo + garantia de 1 ano."

Keywords negativas prioritárias: usado, recapado, emprego, vaga, grátis, curso

Extensions obrigatórias: Sitelinks (4) + Destaque (4) + Chamada + Local
```

---

### 5. Meta Ads Feed + Stories (resumo executivo)

*Para copy completa: usar skills `/meta-ads-feed` e `/meta-ads-stories`*

```
Conjunto 1 — Aquisição (público frio):
Segmentação: [Cidade] + raio [X km] | Idade [25–55] | Donos de carro + interesses automotivos
Orçamento: R$[X]/dia
Anúncio A (feed): Abordagem racional — preço/condição em destaque
Anúncio B (feed): Abordagem emocional — segurança/família
CTA: Enviar Mensagem (WhatsApp)

Conjunto 2 — Stories Imersivo:
Segmentação: mesmo do Conjunto 1
Orçamento: R$[X]/dia
Anúncio: Vídeo 15s OU sequência de 3 cards
Roteiro sumário: [gancho 0-3s] → [oferta 3-10s] → [CTA 10-15s]
```

---

### 6. Landing Page (resumo executivo)

*Para copy completa: usar skill `/landing-page-copy [servico] [cidade]`*

```
URL: /[servico]-[cidade] (ex: /pneus-sao-carlos)
Headline: "[Keyword principal em [Cidade]] — Congruente com o anúncio"
Above the fold obrigatório: headline + CTA WhatsApp + elemento de confiança (estrelas Google)
Seções: Dor → Solução → Diferenciais → Prova Social → Oferta → FAQ → CTA Final
Conversores adicionais: WhatsApp flutuante + exit intent popup
Mobile: testar em celular ANTES de lançar — 90% dos cliques são mobile
```

---

### 7. Remarketing (resumo executivo)

*Para copy completa: usar skill `/remarketing-copy [estagio] [servico] [cidade]`*

```
Público 1: Visitantes do site (últimos 30 dias) — Google Display + Meta
Abordagem: Lembrete suave → Incentivo (dias 4-7) → Urgência (dias 8-14)

Público 2: Engajaram com anúncio Meta mas não clicaram
Abordagem: Criativo diferente para segunda impressão

Público 3: Clicaram mas não iniciaram contato
Abordagem: Oferta com benefício extra para fechar

Exclusões obrigatórias: quem já converteu nos últimos 30 dias
```

---

### 8. Cronograma de Implementação

```
SEMANA 1 — Configurar e Lançar:
  - Dia 1-2: Configurar Pixel Meta + Conversão Google + UTMs
  - Dia 2-3: Criar e publicar landing page (testar mobile + WhatsApp)
  - Dia 3-4: Criar campanhas Google Search (pelo menos 1 grupo rodando)
  - Dia 4-5: Criar campanhas Meta (Feed + Stories)
  - Dia 5: Revisar tudo, aprovar criativos, confirmar links
  - Dia 6-7: Acompanhar primeiras impressões e cliques

SEMANA 2 — Primeiras Otimizações:
  - Pausar keywords com CPC muito alto e zero conversão
  - Identificar melhor variação de anúncio (Meta: parar o de menor CTR)
  - Ajustar lance se CPC muito acima do benchmark
  - Verificar se o WhatsApp está respondendo os leads (parte operacional)

SEMANA 3-4 — Análise e Escala:
  - Escalar orçamento na campanha com melhor CPL
  - Lançar remarketing com audiências formadas na semana 1-2
  - Adicionar extensões e novos criativos se frequência > 3
  - Reunião de resultado parcial: o que está funcionando?

MENSAL — Revisão Completa:
  - Análise de CPL e ROAS real vs meta
  - Renovar criativos (fadiga de anúncio é real — trocar após 4 semanas)
  - Atualizar keywords negativas (analisar relatório de termos de pesquisa)
  - Definir orçamento e estratégia do próximo mês
```

---

### 9. Checklist de Lançamento

Antes de apertar "Publicar" em qualquer campanha:

**Rastreamento:**
- [ ] Pixel do Meta instalado no site e evento de conversão testado
- [ ] Conversão do Google Ads configurada (ligação, WhatsApp, formulário)
- [ ] UTMs definidas para cada anúncio e canal (utm_source, utm_medium, utm_campaign)
- [ ] Google Analytics conectado e registrando sessões da LP

**Estrutura:**
- [ ] Landing page no ar, testada em mobile e desktop
- [ ] Botão WhatsApp funciona e vai para o número correto da unidade
- [ ] Orçamento diário correto em cada campanha
- [ ] Segmentação geográfica limitada à cidade/raio correto

**Criativos:**
- [ ] Mínimo 3 variações de anúncio por campanha (A/B/C)
- [ ] Textos revisados (sem erro ortográfico, sem preço inventado)
- [ ] Criativos aprovados pelo Meta (verificar política de texto em imagem)
- [ ] Headlines do Google Ads dentro de 30 caracteres

**Operacional:**
- [ ] WhatsApp Business da unidade configurado com mensagem automática de boas-vindas
- [ ] Equipe da loja sabe que haverá aumento de contatos e está pronta para atender
- [ ] Remarketing audiences criadas (para ativar na semana 2)
- [ ] Exclusão de conversões duplicadas configurada

---

## Onde salvar
```
output/campanhas/campanha-completa-[servico]-[cidade]-[YYYY-MM-DD].md
```
**Exemplo:** `output/campanhas/campanha-completa-revisao-americana-2026-04-07.md`
