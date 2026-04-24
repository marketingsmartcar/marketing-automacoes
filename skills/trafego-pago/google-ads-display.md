---
name: google-ads-display
description: Gera copies, segmentações e briefings de criativo para campanhas de Google Ads Display e Performance Max da BR Pneus & Oficina, com banners em 3 tamanhos, assets para PMax e públicos-alvo configurados. Use sempre que precisar de campanha de display no Google, banner de remarketing, Performance Max, anúncio visual para Rede de Display do Google ou campanha de awareness regional — mesmo que o pedido use termos como "banner do Google", "anúncio visual", "remarketing no Google" ou "PMax".
---

# Skill: Google Ads — Campanhas de Display e Performance Max

## Comando
```
/google-ads-display [objetivo] [servico] [cidade]
```

## Parâmetros
- **objetivo** (obrigatório): `awareness` (novo público), `consideracao` (quem pesquisou), `remarketing` (quem visitou o site)
- **servico** (obrigatório): Serviço ou produto a divulgar
- **cidade** (obrigatório): Cidade-alvo

---

## Quando usar Display vs Search

- **Search:** usuário está pesquisando ativamente → alta intenção, maior CPC, maior conversão
- **Display:** usuário está navegando em outros sites → interrompe a atenção, CPC baixo, construção de marca e remarketing
- **Performance Max:** campanha unificada que roda em todos os canais Google (Search, Display, YouTube, Gmail, Maps) com otimização automática por IA

Para a BR Pneus, Display é mais útil para **remarketing** e **awareness regional** do que para captação de novos clientes.

---

## Processo antes de criar

1. Definir se é campanha de Display padrão (controle manual de posicionamento) ou Performance Max (mais abrangente, menos controle)
2. Consultar `knowledge/personas.md` para calibrar os públicos de afinidade
3. Verificar se há campanha de Search ativa para sincronizar o remarketing

---

## Estrutura obrigatória do output

### 1. Configuração da Campanha

```
Tipo: [Display padrão | Performance Max] — justificar a escolha
Objetivo: [Reconhecimento de marca | Consideração | Conversões]
Segmentação geográfica: Raio de [15–30 km] ao redor da unidade em [Cidade]
  → Display pode ter raio maior que Search — impacto de marca tem alcance mais amplo
Orçamento diário: R$[15–40]/dia (Display custa menos que Search)
Estratégia de lance: CPC máximo (Display manual) | Maximizar conversões (PMax)
```

**Públicos-alvo (escolher os relevantes por objetivo):**

| Público | Tipo | Para qual objetivo |
|---------|------|-------------------|
| Donos de carro na região | Afinidade | Awareness + Consideração |
| "No mercado" para serviços automotivos | Intenção de compra | Consideração |
| "No mercado" para pneus | Intenção de compra | Consideração |
| Interessados em marcas de pneu (Michelin, Pirelli, Goodyear) | Afinidade | Consideração |
| Motoristas de aplicativo | Afinidade | Todos |
| Visitantes do site (últimos 30 dias) | Remarketing | Remarketing |
| Visitantes da página de [serviço] (últimos 14 dias) | Remarketing | Remarketing |
| Lista de clientes (upload de e-mail/telefone) | CRM | Reativação |
| Público semelhante aos clientes | Similar | Awareness |

**Exclusões de posicionamento sugeridas:**
```
- Aplicativos mobile (cliques acidentais)
- Jogos mobile
- Sites de conteúdo adulto
- Sites de notícias de alta sensibilidade
```

---

### 2. Copies para Banners Display (3 tamanhos principais)

Para cada tamanho, gerar copy completa + briefing de criativo:

---

**300x250 (Retângulo Médio — o mais comum)**

*3 variações de copy:*

**Variação A (Preço/Oferta):**
```
Headline curta (máx 25 chars): Pneus a Partir de R$179
Headline longa (máx 90 chars): Maior mix de pneus em [Cidade]. Nacionais e importados com o menor preço.
Descrição (máx 60 chars): Parcele em até 18x. Garantia BR Total.
Botão CTA: Peça seu Orçamento
Briefing criativo: Fundo amarelo #F5A623, pneu novo em destaque, preço "a partir de" em letras grandes, logo BR Pneus no canto inferior
```

**Variação B (Serviço/Urgência):**
```
Headline curta: Troque Seu Pneu Hoje
Headline longa: Pneu ruim coloca sua família em risco. Venha para a BR Pneus & Oficina em [Cidade].
Descrição: Atendimento rápido. Sem fila. Agende já.
Botão CTA: Agendar pelo WhatsApp
Briefing criativo: Fundo preto, imagem de pneu desgastado vs novo (contraste), texto em branco e amarelo
```

**Variação C (Confiança/Institucional):**
```
Headline curta: Muito mais que pneus
Headline longa: BR Pneus & Oficina em [Cidade]: o melhor atendimento, os melhores preços, garantia de 1 ano.
Descrição: Avaliação 4.8★ no Google. Visite-nos!
Botão CTA: Saiba Mais
Briefing criativo: Foto real da loja em [Cidade], logo em destaque, estrelas do Google visíveis
```

---

**728x90 (Leaderboard — topo de página)**

*Copy condensada — lida em 1 segundo:*

```
Variação A: "Pneus Baratos em [Cidade] | Parcele em 18x | Garantia BR Total | Agende Agora →"
Variação B: "BR Pneus & Oficina [Cidade] — Maior Mix de Pneus | Melhores Preços | WhatsApp →"
Variação C: "Troque Seu Pneu Hoje | BR Pneus [Cidade] | 4.8★ no Google | Visite-nos →"
Briefing criativo: Horizontal, logo à esquerda, texto central, botão CTA amarelo à direita
```

---

**160x600 (Skyscraper — lateral de página)**

*Formato vertical — leitura de cima para baixo:*

```
Variação A:
Topo: Logo BR Pneus
Meio: "Pneus e Serviços em [Cidade]" + benefícios em bullets (•18x •Garantia •Preço Baixo)
Base: Botão "Agendar" em amarelo

Variação B:
Topo: "Seu pneu precisa de atenção?"
Meio: imagem pneu desgastado + seta para baixo + pneu novo
Base: "Troque Agora — BR Pneus [Cidade]" + botão

Briefing criativo: Cores da marca, texto legível em 600px de altura, CTA no terço inferior
```

---

### 3. Assets para Performance Max

PMax requer múltiplos assets e combina automaticamente — todos devem funcionar independentemente:

**5 Headlines curtas (máx 30 chars):**
```
1. Pneus Baratos em [Cidade]
2. Parcele em Até 18x
3. Garantia BR Total 1 Ano
4. Maior Mix de Pneus
5. Agende Pelo WhatsApp
```

**5 Headlines longas (máx 90 chars):**
```
1. Pneus nacionais e importados com os melhores preços em [Cidade]. Parcele em 18x!
2. BR Pneus & Oficina [Cidade]: alinhamento, óleo, revisão e muito mais.
3. Troque seu pneu com garantia de 1 ano. Equipe treinada em [Cidade].
4. Maior estoque de pneus em [Cidade]. Atendimento rápido e sem fila.
5. Cuide do seu carro com quem entende. BR Pneus & Oficina em [Cidade].
```

**5 Descrições (máx 90 chars):**
```
1. Pneus nacionais, importados e semi-novos. Menor preço. Parcela em 18x. Visite!
2. Garantia BR Total em todos os serviços. Avaliação 4.8★ no Google. Agende já!
3. Alinhamento 3D, troca de óleo, revisão completa. Tudo em [Cidade].
4. Atendimento sem complicação. WhatsApp, telefone ou visite nossa loja.
5. Mais de [N] clientes satisfeitos em [Cidade]. Venha ser mais um!
```

**Sugestões de imagens (produzir em 3 formatos):**

| Formato | Dimensões | O que fotografar |
|---------|-----------|-----------------|
| Paisagem | 1200x628px | Fachada da loja em [Cidade] com nome visível |
| Quadrado | 1200x1200px | Mecânico trabalhando + pneu novo em destaque |
| Retrato | 628x1200px | Pilha de pneus novos com preço/condição overlay |

**Sinais de público (audience signals — orientam a IA do PMax):**
```
1. Visitantes do site (últimos 30 dias)
2. Lista de clientes (upload)
3. Interesses: automóveis, manutenção de carros
4. Palavras-chave de pesquisa relacionadas ao serviço
```

---

## Onde salvar
```
output/campanhas/google-display-[servico]-[cidade]-[YYYY-MM-DD].md
```
**Exemplo:** `output/campanhas/google-display-pneus-saocarlos-2026-04-07.md`
