---
name: google-ads-search
description: Gera estrutura completa de campanha de Google Ads Search para a BR Pneus & Oficina — grupos de anúncios, keywords com tipo de correspondência, anúncios responsivos (RSA) com 15 headlines e 4 descriptions, extensões e recomendações de página de destino. Use sempre que precisar de campanha no Google, anúncio de pesquisa, Google Search Ads, texto para aparecer quando alguém pesquisa no Google, ou estrutura de keywords para tráfego pago — mesmo que o pedido use termos como "anúncio no Google", "aparecer quando pesquisar" ou "campanha de search".
---

# Skill: Google Ads — Anúncios de Pesquisa

## Comando
```
/google-ads-search [servico-ou-produto] [cidade]
```

## Parâmetros
- **servico-ou-produto** (obrigatório): Ex: `pneus`, `alinhamento`, `troca-de-oleo`, `revisao-completa`, `freios`, `suspensao`
- **cidade** (obrigatório): Cidade-alvo (verificar unidades ativas em `agents/copywriter-ads.md`)

---

## Por que o Google Search é prioritário para a BR Pneus

No Search, o usuário já tomou a decisão de buscar — "pneu barato em Araraquara" é intenção de compra ativa. O trabalho do anúncio é ser a melhor resposta para essa busca, não criar desejo. Isso exige copy direta, keywords precisas e congruência perfeita entre anúncio e página de destino.

---

## Processo antes de criar

1. Consultar `CLAUDE.md` para confirmar diferenciais e lista de unidades ativas
2. Mapear a intenção de busca do serviço: quem busca "pneu barato" está em estágio diferente de quem busca "quanto custa troca de pneu"
3. Pensar nos grupos de anúncios por intenção — não misturar keywords transacionais com informacionais

---

## Estrutura obrigatória do output

### 1. Configuração da Campanha

```
Nome da campanha: BR Pneus | [Serviço] | [Cidade] | Search
Objetivo: Leads (ligações, WhatsApp, agendamento)
Tipo: Somente Rede de Pesquisa (NÃO incluir parceiros de pesquisa — qualidade inferior)
Segmentação geográfica: Raio de [10–20 km] ao redor do endereço da unidade em [Cidade]
  → Cidades menores (Ibitinga, Jaú): raio de 20–25 km
  → Cidades maiores (Araraquara, São Carlos, Maringá): raio de 10–15 km
Idioma: Português
Estratégia de lance: Maximizar Conversões (após 30+ conversões/mês) | CPC Manual (fase inicial)
Orçamento diário sugerido: R$[30–80]/dia conforme cidade e concorrência
Programação de anúncios: seg–sex 7h–19h | sáb 7h–14h (horários de funcionamento da loja)
Rotação de anúncios: Otimizar para melhores anúncios
```

---

### 2. Grupos de Anúncios (mínimo 3)

Cada grupo deve ter um tema de intenção único — não misturar keywords de intenções diferentes no mesmo grupo.

---

**Grupo 1: [Intenção de compra direta]**
*Ex para "pneus": "Comprar pneu em [cidade]"*

**Keywords (mínimo 8):**

| Keyword | Tipo | Intenção |
|---------|------|----------|
| [pneu barato cidade] | [exata] | Compra imediata, sensível a preço |
| "comprar pneu cidade" | "frase" | Busca pneu para comprar hoje |
| "loja de pneus cidade" | "frase" | Procura estabelecimento físico |
| [pneu aro 14 cidade] | [exata] | Especificação técnica + local |
| "pneus baratos cidade" | "frase" | Preço como motivador principal |
| trocar pneu cidade | ampla modificada | Intenção de trocar + local |
| "melhor loja pneus cidade" | "frase" | Comparando opções |
| [pneu preço cidade] | [exata] | Pesquisa de preço pré-compra |

**Grupo 2: [Intenção de serviço]**
*Ex para "pneus": "Troca de pneu em [cidade]"*

**Keywords (mínimo 8):**

| Keyword | Tipo | Intenção |
|---------|------|----------|
| [troca de pneu cidade] | [exata] | Quer executar o serviço |
| "montar pneu cidade" | "frase" | Tem o pneu, precisa montar |
| "borracharia cidade" | "frase" | Termo popular para loja de pneu |
| "calibrar pneu cidade" | "frase" | Serviço simples, porta de entrada |
| [rodízio de pneus cidade] | [exata] | Serviço específico |
| "conserto de pneu cidade" | "frase" | Urgência, pneu furado |
| [pneu furado cidade] | [exata] | Alta urgência, conversão rápida |
| "onde trocar pneu cidade" | "frase" | Busca por local específico |

**Grupo 3: [Intenção de orçamento/comparação]**
*Ex para "pneus": "Preço de pneu em [cidade]"*

**Keywords (mínimo 8):**

| Keyword | Tipo | Intenção |
|---------|------|----------|
| "quanto custa pneu cidade" | "frase" | Pesquisa de preço, mid-funnel |
| "preço de pneu cidade" | "frase" | Comparando antes de decidir |
| "pneu promoção cidade" | "frase" | Procura oferta específica |
| [tabela de pneu cidade] | [exata] | Pesquisa comparativa de preços |
| "orçamento pneu cidade" | "frase" | Quer cotar antes de visitar |
| pneu parcelado cidade | ampla | Parcelamento como gatilho |
| "pneu em promoção cidade" | "frase" | Alta sensibilidade a oferta |
| "pneu mais barato cidade" | "frase" | Preço é o critério principal |

---

### 3. Keywords Negativas (mínimo 15 para a campanha toda)

| Keyword Negativa | Tipo | Por que excluir |
|-----------------|------|----------------|
| usado | ampla | Não vendemos pneu usado |
| recapado | ampla | Não vendemos recapado |
| seminovo | ampla | Não vendemos seminovo |
| como fazer | ampla | Intenção informacional, não compra |
| como calibrar sozinho | frase | DIY — não precisa de loja |
| vaga | ampla | Busca por emprego |
| emprego | ampla | Busca por emprego |
| cursos | ampla | Busca por formação |
| grátis | ampla | Expectativa de gratuidade |
| gratuito | ampla | Expectativa de gratuidade |
| atacado | ampla | Volume industrial, não nosso perfil |
| fornecedor | ampla | B2B, não varejo |
| fabricante | ampla | Não somos fabricante |
| imagem | ampla | Busca por fotos |
| wikipedia | exata | Busca informacional pura |

---

### 4. Anúncios Responsivos de Pesquisa (RSA)

Para cada grupo de anúncios, gerar **1 RSA completo**. O Google combina os elementos automaticamente — cada headline e description deve funcionar sozinha e em qualquer combinação.

**Regras de criação:**
- Máx 30 caracteres por headline (incluindo espaços)
- Máx 90 caracteres por description
- Incluir a cidade em pelo menos 2–3 headlines
- Incluir keyword principal em pelo menos 3 headlines
- Incluir CTA em pelo menos 2 headlines e 2 descriptions
- Indicar pinos quando necessário (Posição 1, 2 ou 3)

---

**RSA — Grupo 1 exemplo (pneus, cidade)**

**15 Headlines:**

| # | Headline | Chars | Obs |
|---|----------|-------|-----|
| 1 | Pneus Baratos em [Cidade] | 25 | Fixar Pos.1 — keyword+local |
| 2 | BR Pneus & Oficina [Cidade] | 27 | Fixar Pos.1 — marca+local |
| 3 | Maior Mix de Pneus da Região | 29 | Diferencial |
| 4 | Parcele em até 18x Sem Juros | 29 | Condição de pagamento |
| 5 | Garantia BR Total de 1 Ano | 27 | Diferencial de confiança |
| 6 | Melhores Preços em Pneus | 25 | Preço como benefício |
| 7 | Pneus Nacionais e Importados | 29 | Mix como diferencial |
| 8 | Agende Agora pelo WhatsApp | 27 | CTA |
| 9 | Atendimento Rápido e Sem Fila | 30 | Conveniência |
| 10 | Consulte Seu Pneu Ideal | 23 | Convite à ação |
| 11 | Troque Seu Pneu Hoje | 21 | Urgência + CTA |
| 12 | Pneu com Qualidade e Preço | 27 | Duplo benefício |
| 13 | Orçamento Grátis e Sem Compromisso | 30 | Elimina barreira |
| 14 | Visite Nossa Loja em [Cidade] | 29 | Local |
| 15 | Ligue Agora: Pneus e Serviços | 30 | CTA telefônico |

**4 Descriptions:**

| # | Description | Chars | Foco |
|---|-------------|-------|------|
| 1 | Pneus nacionais e importados com os melhores preços. Parcele em até 18x. Visite! | 82 | Produto + preço + parcela |
| 2 | Garantia BR Total de 1 ano em pneus e serviços. Equipe treinada em [Cidade]. | 76 | Confiança + local |
| 3 | Agende pelo WhatsApp agora e evite fila. Atendemos de seg a sáb em [Cidade]. | 76 | CTA + conveniência + local |
| 4 | Maior mix de pneus: nacionais, importados e semi-novos. Menor preço garantido! | 79 | Mix + preço |

---

### 5. Extensões de Anúncio

**Sitelinks (4 obrigatórios):**

| Título | Descrição linha 1 | Descrição linha 2 | URL destino |
|--------|------------------|------------------|-------------|
| Ver Pneus em Promoção | Melhores preços em [Cidade] | Parcele em até 18x | /promocoes |
| Agendar pelo WhatsApp | Atendimento rápido e sem fila | Resposta em minutos | [link WhatsApp] |
| Nossos Serviços | Alinhamento, óleo, revisão | Tudo em um só lugar | /servicos |
| Como Chegar | [Endereço resumido] | Aberto seg–sáb | /contato |

**Extensões de destaque (4):**

```
Parcelamento em 18x | Garantia BR Total | Maior Mix da Região | Preço Baixo Todo Dia
```

**Snippets estruturados:**
```
Tipo: Serviços
Valores: Troca de Pneus, Alinhamento 3D, Balanceamento, Troca de Óleo, Revisão Completa
```

**Extensão de chamada:**
```
Número: [telefone da unidade em [Cidade]]
```

**Extensão de local:**
```
Endereço: [endereço da unidade] — vinculada ao GMB
```

---

### 6. Página de Destino

```
URL de destino: /[servico]/[cidade] ou /pneus-[cidade] (URL limpa e localizada)

A LP deve conter obrigatoriamente:
- Headline espelhando a keyword do anúncio (congruência = mais conversão)
- Preço "a partir de" ou condição de destaque
- Botão WhatsApp proeminente above the fold
- Endereço da unidade com mapa
- Avaliações Google (prova social)
- Tempo de espera ou "atendimento sem fila"

Congruência obrigatória:
- Anúncio fala em "pneu barato" → LP abre com "Os melhores preços em pneus de [Cidade]"
- Anúncio fala em "parcele 18x" → LP destaca o parcelamento above the fold
```

---

## Onde salvar
```
output/campanhas/google-search-[servico]-[cidade]-[YYYY-MM-DD].md
```
**Exemplo:** `output/campanhas/google-search-pneus-araraquara-2026-04-07.md`
