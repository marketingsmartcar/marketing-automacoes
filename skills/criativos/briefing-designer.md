---
name: briefing-designer
description: Gera briefing profissional completo para um designer (interno, freelancer ou agência) executar uma peça visual da BR Pneus & Oficina com nível de detalhe que elimine idas e vindas. Use sempre que precisar de briefing de design, documentar uma peça visual, contratar designer, especificar um material gráfico ou comunicar o que precisa para um criativo ser produzido — mesmo que o pedido use termos como "briefing para designer", "especificação de arte", "o que passar para o designer", "pedido de arte" ou "documentar o criativo".
---

# Skill: Briefing para Designer

## Comando
```
/briefing-designer [tipo-peca] [conteudo] [cidade]
```

## Parâmetros
- **tipo-peca** (obrigatório): Tipo de material. Opções:
  - `post-instagram` — Post feed quadrado ou retrato
  - `post-facebook` — Post para Facebook
  - `stories` — Instagram/Facebook Stories
  - `banner-site` — Banner para o site
  - `banner-google` — Banner de display Google Ads
  - `outdoor` — Outdoor 3×9m ou similar
  - `faixa` — Faixa de lona para fachada
  - `flyer` — Flyer A5 ou A4 imprimível
  - `cartao-visita` — Cartão de visita
  - `adesivo-carro` — Adesivo para veículo da loja
  - `adesivo-vitrine` — Adesivo para vidro da loja
  - `uniforme` — Arte para bordado/silk em uniforme
  - `thumbnail-video` — Thumbnail para YouTube
- **conteudo** (obrigatório): O que comunicar. Ex: "promoção pneus aro 14 a partir de R$199, parcelado em 18x, até dia 30/04"
- **cidade** (obrigatório): Unidade

---

## Estrutura do Output

### 1. Informações Gerais

```
BRIEFING DE DESIGN — BR Pneus & Oficina
Data de criação: [DATA]
Solicitante: [NOME/CARGO]
Unidade: [CIDADE]

Tipo de peça: [tipo selecionado]
Dimensões: [px para digital | mm para impresso]
Resolução: [72dpi para digital | 300dpi para impresso]
Formato de entrega: [PNG/JPG para digital | PDF/AI/PSD para impresso]
Prazo de entrega: [DATA SUGERIDA]
Número de variações: [X variações]

Referência visual obrigatória:
→ Seguir identidade visual BR Pneus & Oficina (ver materiais existentes)
→ Paleta: #F5A623 (amarelo/laranja), #1A1A1A (preto), #FFFFFF (branco)
→ Estilo: industrial, automotivo, bold — NÃO minimalista, NÃO delicado
```

---

### 2. Copy Exata

Toda a hierarquia de texto na ordem de leitura, com tamanho relativo indicado:

```
HIERARQUIA DE TEXTO (em ordem de destaque visual):

① HEADLINE (tamanho: GRANDE — maior elemento de texto)
"[Texto exato da headline — sem variações]"

② SUB-HEADLINE (tamanho: MÉDIO — 60-70% do headline)
"[Texto exato do sub — pode ser 2 linhas máx]"

③ CORPO / DETALHES (tamanho: NORMAL)
"[Bullets ou texto corrido — máx 3 itens/linhas]"
• [Item 1]
• [Item 2]
• [Item 3]

④ CTA — BOTÃO (tamanho: MÉDIO, destaque: fundo #F5A623)
"[Texto exato do botão — ex: 'Agende pelo WhatsApp']"

⑤ INFORMAÇÕES DE CONTATO (tamanho: PEQUENO)
📍 [Endereço completo], [Cidade], [Estado]
📱 ([DDD]) [Número]
☎️ 0800 942 4402
@brpneus[cidade]

⑥ AVISO LEGAL / DISCLAIMER (tamanho: MÍNIMO — barely readable)
"[Texto legal se necessário — ex: 'Preços a partir de. Consulte condições na sua unidade.']"

⑦ TAGLINE (opcional, em peças de marca)
"Muito mais que pneus"
```

---

### 3. Diretrizes Visuais

```
CORES (códigos HEX exatos):
Principal (destaques, CTA, faixas): #F5A623
Fundo/background: #1A1A1A
Texto principal: #FFFFFF
Texto sobre amarelo: #000000
Secundário/escuro alternativo: #2A2A2A

HIERARQUIA VISUAL (o que o olho deve ver PRIMEIRO → SEGUNDO → TERCEIRO):
1º: [Elemento mais importante — ex: preço, headline]
2º: [Segundo elemento — ex: condição, serviço]
3º: [CTA e contato]

FONTES:
Headlines: Arial Black ou Impact — caixa alta, bold/black
Subtítulos: Arial Bold — bold
Corpo: Arial ou similar — regular
Preços: Arial Black — maior que qualquer outro texto

LOGO BR PNEUS:
→ Posição: canto superior direito (padrão)
→ Versão: colorida em fundo escuro / monocromática em fundo claro
→ Tamanho mínimo: 80px de altura (não reduzir abaixo disso)
→ Área de respiro: mínimo 10px de qualquer outro elemento

BARRA AMARELA:
→ Faixa #F5A623 no topo E na base da peça
→ Topo: 6-8% da altura total — pode conter tagline ou badge
→ Base: 5-6% da altura — pode conter tagline "Muito mais que pneus"

ESTILO GERAL:
→ Fundo predominante: escuro (#1A1A1A ou gradiente escuro)
→ Exceção: post institucional pode ter fundo amarelo
→ Textura: sutil textura de concreto/asfalto no fundo é bem-vinda
→ Fotos: quando incluir imagem de produto/serviço, colocar à direita ou abaixo
→ Efeitos: aceitos: sombra suave em texto, gradiente. Evitar: blur excessivo, glitter, efeitos 3D
```

---

### 4. Layout Wireframe

```
DIAGRAMA DESCRITIVO DA PEÇA:

[Para cada peça, descrever a posição dos elementos com texto]

Exemplo para post 1080×1080:

┌─────────────────────────────────┐
│ ████ BARRA AMARELA (70px) █████│ ← Badge promo + logo canto direito
│                                 │
│   HEADLINE                      │ ← 60-70px, branco, bold, caixa alta
│   EM DUAS LINHAS               │
│                                 │
│   Sub-headline (30px)          │ ← Cinza claro, regular
│                                 │
│  [CARD DE PREÇO OU IMAGEM]     │ ← Elemento visual central
│                                 │
│  [BOTÃO CTA] ← fundo amarelo  │
│                                 │
│   📍 Endereço | 📱 Contato     │ ← Rodapé de contato
│                                 │
│ ████ BARRA AMARELA (50px) █████│ ← "Muito mais que pneus"
└─────────────────────────────────┘
```

---

### 5. Referências Visuais

```
REFERÊNCIAS INTERNAS (materiais BR Pneus existentes):
1. [Outdoor existente com preços por aro — usar como referência de cards de preço]
2. [Post Instagram recente da unidade — referência de estilo geral]
3. [Flyer de inauguração anterior — referência de hierarquia]

REFERÊNCIAS EXTERNAS (estilo similar para inspiração):
1. [Descrever estilo: "outdoor de loja de pneus com fundo escuro e destaque em cor vibrante"]
2. [Descrever estilo: "post automotivo estilo industrial com tipografia bold"]

ANTI-REFERÊNCIAS (o que NÃO fazer):
→ Não fazer layout minimalista com muito espaço em branco
→ Não usar fontes serifadas ou delicadas
→ Não usar azul, verde ou roxo como cor de destaque
→ Não reduzir o logo abaixo do mínimo
→ Não omitir o CTA
→ Não criar fundo branco (exceto se peça para Google Ads com fundo claro)
```

---

### 6. Variações a Entregar

```
VARIAÇÕES SOLICITADAS:

Variação 1: [Nome — ex: "Headline A — foco em preço"]
  O que muda: [ex: headline diferente, mesmo layout]

Variação 2: [Nome — ex: "Headline B — foco em parcelamento"]
  O que muda: [ex: headline diferente]

Variação 3 (se aplicável): [Nome]
  O que muda: [ex: versão para fundo amarelo]

ADAPTAÇÕES DE TAMANHO (mesma arte, formatos diferentes):
→ Principal: [1080×1080px]
→ Retrato: [1080×1350px — adicionar espaço no meio do layout]
→ Stories: [1080×1920px — rearranjar para vertical longo]
→ Facebook: [1200×630px — adaptar para horizontal]
```

---

### 7. Checklist de Aprovação

O designer deve confirmar todos os itens antes de entregar:

```
ANTES DE ENTREGAR, CONFIRMAR:

Visual:
[ ] Identidade visual BR Pneus mantida (cores, estilo, tipografia)
[ ] Logo presente, correto e no mínimo de tamanho especificado
[ ] Paleta respeitada — nenhuma cor fora do padrão sem aprovação
[ ] Barras amarelas no topo e na base
[ ] Fundo escuro ou amarelo (conforme tipo de peça)

Conteúdo:
[ ] Copy exata conforme briefing (sem alterações, sem correções não autorizadas)
[ ] CTA visível e com destaque adequado
[ ] Informações de contato da unidade corretas
[ ] "A partir de" / "Consulte condições" em peças com preço
[ ] Disclaimer legal presente (se aplicável)

Técnico:
[ ] Dimensões corretas (verificar em px ou mm)
[ ] Resolução adequada (72dpi digital / 300dpi impresso)
[ ] Formato de arquivo correto (PNG/JPG/PDF/AI/PSD conforme solicitado)
[ ] Fontes incorporadas ou convertidas em curvas (para impresso)
[ ] Arquivo nomeado corretamente: [tipo]-[tema]-[cidade]-[data]

Variações:
[ ] Todas as variações solicitadas entregues
[ ] Adaptações de tamanho entregues (quadrado + retrato + stories se solicitado)
```

---

## Salvar em
```
output/criativos/briefing-[tipo]-[resumo]-[cidade]-[YYYY-MM-DD].md
```
**Exemplo:** `output/criativos/briefing-outdoor-black-friday-bauru-2026-04-09.md`

---

## Referências Cruzadas
- Versão HTML para não precisar de designer: `skills/criativos/post-visual-html.md`
- Referência de prompts para imagens: `skills/criativos/prompt-imagem-ia.md`
- Material de PDV (briefings específicos para loja): `skills/franquias/material-pdv.md`
- Checklist de marca (para validar antes de aprovar): `skills/conteudo/brand-checklist-marca.md`
