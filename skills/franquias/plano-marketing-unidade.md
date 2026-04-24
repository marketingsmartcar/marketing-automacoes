# Skill: Plano de Marketing por Unidade

## Comando
`/plano-marketing-unidade [cidade] [periodo]`

## O que faz
Gera um plano de marketing completo e personalizado para uma unidade específica da rede BR Pneus & Oficina — considerando o perfil da cidade, a maturidade da unidade, os canais mais eficientes para aquele mercado e uma rotina executável pelo franqueado.

---

## Parâmetros

| Parâmetro | Obrigatório | Opções |
|-----------|-------------|--------|
| `cidade` | Sim | Qualquer cidade com unidade ativa |
| `periodo` | Sim | `mensal`, `trimestral`, `semestral` |

---

## Estrutura do Output

---

### 1. Diagnóstico da Unidade

**Perfil da cidade:**
- Tamanho (hab.)
- Perfil econômico dominante
- Concorrência estimada (baixa / moderada / alta)
- Canais digitais mais usados na cidade (base no perfil demográfico)
- Diferenciais competitivos locais da BR Pneus nesta cidade

**Maturidade da unidade:**

| Fase | Critério | Prioridade de marketing |
|------|---------|------------------------|
| **Nova** | Menos de 6 meses | Awareness + cadastros + avaliações Google |
| **Em crescimento** | 6 a 18 meses | Leads qualificados + conversão + retenção |
| **Consolidada** | Mais de 18 meses | LTV + indicação + cross-sell + expansão de ticket |

**O que mudar por fase:**

**Unidade Nova (ex: Maringá no início):**
- 60% dos esforços em awareness (fazer as pessoas saberem que existe)
- Meta principal: 30 avaliações Google nos primeiros 30 dias
- Sem reativação ainda — base de clientes é pequena demais
- Inauguração ainda ativa: usar `/kit-inauguracao` se ainda no período

**Unidade em Crescimento (ex: Jaú, Ibitinga):**
- 50% em aquisição, 30% em retenção, 20% em indicação
- Ativar fluxo de CRM para clientes dos primeiros 6 meses
- Começar campanhas sazonais locais

**Unidade Consolidada (ex: Araraquara):**
- 40% em retenção e LTV, 30% em indicação, 30% em aquisição
- Foco em cross-sell (quem fez pneu → oferecer alinhamento)
- Programa de fidelidade ativo

---

### 2. Canais Priorizados

**Critérios de priorização por perfil de cidade:**

| Tipo de cidade | Canais prioritários | Canais secundários |
|---------------|-------------------|------------------|
| Cidade menor (<100 mil) | GMB, WhatsApp, boca a boca, ações locais | Instagram, flyer |
| Cidade média (100-300 mil) | GMB, Instagram, tráfego pago local, WhatsApp | Facebook, SEO, rádio |
| Cidade grande (>300 mil) | Tráfego pago, GMB, Instagram, SEO | Facebook, YouTube, OOH |

**Tabela de canais por unidade (preencher com dados reais):**

| # | Canal | Prioridade | Investimento Mensal Sugerido | Quem executa |
|---|-------|-----------|---------------------------|-------------|
| 1 | Google Meu Negócio | Alta | R$ 0 (tempo = 30 min/semana) | Franqueado |
| 2 | Instagram | Alta | R$ 0-300 (orgânico + impulsionamento) | Franqueado |
| 3 | WhatsApp Business | Alta | R$ 0 | Franqueado |
| 4 | Google Ads | Alta-Média | R$ 500-1.500 | Marketing central |
| 5 | Meta Ads | Alta-Média | R$ 300-800 | Marketing central |
| 6 | SEO Local | Média | R$ 0 (via conteúdo no GMB) | Marketing central |
| 7 | Ações locais / PDV | Média | R$ 100-400 | Franqueado |
| 8 | Rádio local | Baixa (cidades médias) | R$ 300-800 | Franqueado + apoio central |

> Ajustar o ranking e os valores de acordo com o perfil real da unidade.

---

### 3. Orçamento Sugerido por Porte

| Porte da cidade | Investimento Mínimo Viável | Investimento Ideal | Investimento Acelerado |
|----------------|--------------------------|-------------------|-----------------------|
| Cidade pequena (<100 mil) | R$ 500/mês | R$ 1.200/mês | R$ 2.000/mês |
| Cidade média (100-300 mil) | R$ 1.000/mês | R$ 2.500/mês | R$ 4.000/mês |
| Cidade grande (>300 mil) | R$ 1.500/mês | R$ 3.500/mês | R$ 6.000/mês |

**Distribuição sugerida do orçamento:**

| Canal | % do orçamento |
|-------|---------------|
| Google Ads | 35% |
| Meta Ads (Instagram + Facebook) | 30% |
| Ações locais e PDV | 15% |
| Impresso e sinalização | 10% |
| Reserva para campanhas sazonais | 10% |

**O que é pago pelo marketing central vs. pelo franqueado:**

| Investimento | Pago por |
|-------------|---------|
| Google Ads da unidade | Marketing central (modelo a definir por contrato) |
| Meta Ads da unidade | Marketing central |
| Posts e materiais base | Marketing central |
| Impulsionamento local adicional | Franqueado |
| Impressos (flyers, banners) | Franqueado |
| Ações locais, parcerias, brindes | Franqueado |

---

### 4. Calendário de Ações

**Para cada mês do período, listar:**

```
MÊS [X] — [NOME]

CAMPANHAS DO MARKETING CENTRAL (já entregues ou a entregar):
- [Campanha nacional adaptada para a unidade]
- [Material criado pelo marketing central]

AÇÕES LOCAIS DO FRANQUEADO:
- Semana 1: [Post programado + ação específica]
- Semana 2: [Post + story + WhatsApp lista]
- Semana 3: [Ação sazonal ou oferta local se houver]
- Semana 4: [Post de encerramento do mês + pedido de avaliações]

DATAS LOCAIS RELEVANTES:
- [Datas do calendário da cidade neste mês]

VOLUME DE POSTS MÍNIMO:
- Instagram: [X] posts + [X] stories
- Facebook: [X] posts
- GMB: [X] atualizações
```

---

### 5. Metas por Período

**Formato SMART adaptado ao porte da cidade:**

**Unidade nova / cidade pequena (ex: Ibitinga):**

| KPI | Meta Mensal | Meta Trimestral | Como Medir |
|-----|------------|----------------|-----------|
| Leads gerados | 40-60 | 150-200 | WhatsApp + telefone |
| Agendamentos | 20-35 | 70-120 | Agenda |
| Avaliações Google (acumuladas) | +10/mês | 30+ no total | GMB |
| Nota Google | 4.5+ | 4.5+ | GMB |
| Seguidores Instagram | +50/mês | +180 | Instagram Insights |
| Posts publicados | 12-15 | 40-50 | Contagem |

**Unidade consolidada / cidade grande (ex: Bauru):**

| KPI | Meta Mensal | Meta Trimestral | Como Medir |
|-----|------------|----------------|-----------|
| Leads gerados | 150-250 | 500-800 | CRM |
| Agendamentos | 80-120 | 270-400 | CRM |
| Taxa de conversão (lead→atendimento) | 50%+ | 50%+ | CRM |
| Avaliações Google | +20/mês | +60 | GMB |
| Nota Google | 4.7+ | 4.7+ | GMB |
| Ticket médio | Crescimento 5% a.t. | +15% vs trimestre anterior | Financeiro |
| Retenção | 40%+ clientes retornam em 6 meses | — | CRM |

---

### 6. Ações Específicas para Esta Cidade

> Gerar 5 ações customizadas baseadas no perfil local. Exemplos por cidade:

---

**Ibitinga:**
1. **Parceria com lojas de bordado:** co-branding — "quem compra bordado, desconto nos pneus" (circulação de clientes do comércio)
2. **Post mensal de orgulho local:** conteúdo que celebra a cidade ("Orgulho de ser de Ibitinga 💛") — gera engajamento e identificação
3. **Ação na Expo Bordados** (se houver): estande ou distribuição de flyer com oferta especial
4. **Rádio AM local:** spot de 30 segundos na rádio comunitária — custo baixo, alta penetração
5. **WhatsApp comunitário:** participar de grupos locais (vizinhança, bairros) com posts de utilidade pública sobre segurança veicular

---

**São Carlos:**
1. **Ação nas repúblicas estudantis:** distribuição de flyer em repúblicas próximas à UFSCar e USP São Carlos — foco em troca de óleo e pneus de carros usados
2. **Parceria com app de transporte** (99/Uber): oferta para motoristas de app da cidade — perfil "Carlos"
3. **Conteúdo técnico simplificado:** São Carlos tem público mais escolarizado — posts educativos mais elaborados funcionam bem
4. **Instagram com foco em Reels:** público jovem, mais engajado com vídeo
5. **Google Ads com palavras de urgência:** "oficina aberta sábado São Carlos", "revisão rápida São Carlos"

---

**Bauru:**
1. **Parceria com postos de combustível:** indicação cruzada — quem abastece lá, desconto na BR Pneus (e vice-versa)
2. **Ação no trevo de acesso à cidade:** panfleto ou outdoor próximo às entradas de Bauru — "Chegou em Bauru? A BR Pneus está aqui"
3. **Patrocínio de campeonato amador** (futebol, vôlei): nome da marca em bandeiras ou uniformes — alto impacto, baixo custo
4. **Google Ads com raio ampliado:** captar clientes das cidades vizinhas que passam por Bauru
5. **SEO local agressivo:** Bauru tem concorrência maior — otimizar GMB com mais palavras-chave, postar no GMB 3x/semana

---

**Maringá:**
1. **Ação de awareness de marca:** público ainda não conhece a BR Pneus — priorizar "quem somos" antes de oferta
2. **Parceria com revendedoras de veículos:** indicação de novos donos que precisam de revisão do carro recém-comprado
3. **Instagram com foco em identidade local:** posts que mostram a equipe de Maringá, referenciam a cidade — criar pertencimento
4. **Meta Ads com segmentação agroindustrial:** atingir proprietários de frotas agrícolas e caminhoneiros da região
5. **Campanhas de final de safra:** motoristas com dinheiro na mão e veículo desgastado — época de maior oportunidade

---

### 7. Material Necessário

**Inventário de materiais para o período:**

| Material | Status | Prazo de Entrega | Responsável |
|---------|--------|-----------------|------------|
| Posts mensais (templates) | Existente → localizar | Início de cada mês | Marketing central |
| Stories templates | Existente → localizar | Início de cada mês | Marketing central |
| Banner balcão atualizado | Criar | [DATA] | Marketing central |
| Flyers para distribuição | Criar | [DATA] | Franqueado executa, marketing apoia |
| Anúncios Google Ads | Criar/Atualizar | [DATA] | Marketing central |
| Anúncios Meta Ads | Criar/Atualizar | [DATA] | Marketing central |
| Templates de WhatsApp | Existente | Disponível agora | Marketing central |

---

### 8. Rotina do Franqueado

**O que fazer toda semana (30 minutos):**

| Dia | Tarefa | Tempo | Ferramenta |
|-----|--------|-------|-----------|
| Segunda | Publicar post semanal no Instagram | 10 min | Instagram |
| Segunda | Responder avaliações Google | 5 min | GMB |
| Quarta | Publicar story (foto do dia) | 3 min | Instagram |
| Quarta | Responder WhatsApps pendentes | 5 min | WhatsApp Business |
| Quinta | Publicar no GMB (oferta ou novidade) | 5 min | GMB |
| Sexta | Tirar 2-3 fotos para a semana que vem | 5 min | Celular |

**O que fazer todo mês (2 horas):**

| Semana | Tarefa |
|--------|--------|
| Semana 1 | Verificar métricas do mês anterior (nota Google, leads, posts) |
| Semana 1 | Alinhar com o marketing central: campanhas do mês, materiais necessários |
| Semana 2 | Executar ação local do mês (parceria, evento, campanha sazonal) |
| Semana 4 | Pedido ativo de avaliações: ligar para 5-10 clientes satisfeitos e pedir avaliação |

---

### 9. Indicadores de Sucesso

**Como saber se o plano está funcionando — métricas simples:**

| Sinal positivo | Sinal de alerta | Ação corretiva |
|----------------|----------------|---------------|
| Leads crescendo mês a mês | Leads estagnados por 2 semanas | Impulsionar 1 post + verificar horário de funcionamento no GMB |
| Nota Google 4.5+ | Nota caiu abaixo de 4.3 | Pedir avaliações ativamente + responder as negativas |
| Agendamentos chegando pelo WhatsApp | Nenhuma mensagem nova por 3 dias | Verificar se WhatsApp está ativo e com saudação configurada |
| Posts com 50+ curtidas e comentários | Posts com menos de 20 curtidas | Revisar horário de publicação + qualidade da foto |
| Clientes retornando em 3-6 meses | Alta taxa de first-time e nunca mais | Ativar fluxo de CRM de lembrete de revisão |

---

## Salvar em
`output/relatorios/plano-marketing-[cidade]-[periodo]-[data].md`

---

## Referências Cruzadas
- Posts para executar o calendário: `/post-local [tema] [cidade]`
- Campanhas sazonais: `/campanha-local [tipo-evento] [cidade]`
- Materiais de PDV: `/material-pdv [tipo] [conteudo] [cidade]`
- Treinamento para o franqueado: `/treinamento-marketing-franqueado [modulo]`
- Relatório de performance da unidade: `skills/analytics/benchmark-unidades.md`
- Calendário de datas sazonais: `knowledge/calendario-sazonal.md`
- Fluxos de CRM para reter clientes captados: `skills/crm-email/fluxo-automacao.md`
