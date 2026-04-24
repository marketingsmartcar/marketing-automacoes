---
name: carrossel-educativo
description: Gera conteúdo completo de carrossel educativo para Instagram e Facebook da BR Pneus & Oficina — slide a slide, com headline, texto, sugestão visual, legenda e hashtags. Use sempre que precisar criar um carrossel, slideshow, conteúdo em sequência de imagens, ou "post com vários slides" para redes sociais, mesmo que o pedido não use a palavra "carrossel".
---

# Skill: Carrossel Educativo

## Comando
```
/carrossel-educativo [tema] [num-slides-opcional]
```

## Parâmetros
- **tema** (obrigatório): assunto do carrossel. Ex: "sinais de que seu pneu precisa ser trocado", "o que inclui uma revisão completa", "5 cuidados antes de viajar nas férias"
- **num-slides** (opcional, padrão: 7): quantidade de slides. Mínimo 5, máximo 10.

---

## Processo antes de criar

1. Identificar qual persona tem maior aderência ao tema (ver `knowledge/personas.md`)
2. Verificar se o tema tem relação com alguma data ou período do `knowledge/calendario-sazonal.md`
3. Definir a progressão lógica dos slides antes de escrever (não pode ser aleatório)

---

## Estrutura obrigatória do output

### Slide 1 — Capa
O slide mais importante: decide se o usuário vai passar para o próximo ou não.

```
Headline: [máx 8 palavras | gera curiosidade, urgência ou promessa de valor]
Subtítulo: [1 linha complementando a headline]
Sugestão visual: [cor de fundo, elemento gráfico, foto ou ícone sugerido]
Nota: usar fundo preto (#1A1A1A) ou amarelo (#F5A623) para maior impacto
```

### Slides intermediários (Slide 2 até Slide N-1) — Conteúdo
Para cada slide intermediário:

```
Slide [número]: [título do slide — máx 5 palavras, em destaque]
Texto: [máx 40 palavras — carrossel é visual, não textual]
Elemento visual: [ícone, foto, ilustração ou dado sugerido]
Dado de impacto (se aplicável): [número ou estatística relevante]
```

Regras para slides de conteúdo:
- Cada slide deve fazer sentido sozinho — quem vê só 1 slide ainda entende o ponto
- Progressão lógica e crescente: do problema → para a causa → para a solução → para a ação
- Alternar slides de texto com slides de dado/estatística quando possível
- Nunca usar frases longas — bullet points ou frases de no máximo 10 palavras quando possível

### Slide final — CTA
```
Frase de fechamento: [conectar o tema ao serviço da BR Pneus & Oficina — 1-2 linhas]
CTA principal: [ex: "Agende sua revisão pelo WhatsApp" / "Venha até a BR Pneus mais perto de você"]
Informações de contato: 0800 942 4402
Logo: BR Pneus & Oficina | Muito mais que pneus
Sugestão visual: fundo escuro com logo em destaque
```

---

## Legenda do post

```
Texto da legenda: [máx 200 palavras]
- Primeira linha: copy de impacto (aparece antes do "ver mais") — deve gerar curiosidade
- Desenvolvimento: expandir o tema com 2-3 informações que não estão nos slides
- Menção a diferencial: parcelamento 18x, garantia BR Total ou melhor preço (o mais adequado ao tema)
- CTA: direcionar para WhatsApp, agendamento ou visita à loja
- Pergunta de engajamento: terminar com pergunta aberta para gerar comentários
  Ex: "Você sabia disso? Conta pra gente aqui embaixo 👇"

Hashtags: [15-20 hashtags]
- Mix de: hashtags de volume alto (#pneus, #oficina, #carros) + nicho (#alinhamento3D, #revisaodecarros) + local (#Araraquara, #SãoPaulo) + marca (#BRPneus)
```

---

## Orientações para o designer

```
Paleta obrigatória:
- Amarelo/laranja: #F5A623 (destaques, fundos de capa, CTAs)
- Preto: #1A1A1A (fundos escuros, texto principal)
- Branco: #FFFFFF (texto sobre fundo escuro, espaçamento)

Tipografia:
- Títulos e headlines: fonte bold, peso 700+
- Corpo e texto de slides: fonte regular ou medium, boa legibilidade em tela pequena

Formato:
- Instagram Feed: 1080x1080px (quadrado)
- Instagram Retrato: 1080x1350px (recomendado para mais espaço)

Estilo geral:
- Consistente com identidade da BR Pneus & Oficina
- Limpo, com bastante espaço em branco
- Ícones e elementos gráficos modernos, sem excesso de ornamentação
- Logo da BR Pneus & Oficina no último slide (obrigatório)
```

---

## Onde salvar
```
output/posts/carrossel-[tema-resumido]-[YYYY-MM-DD].md
```
**Exemplo:** `output/posts/carrossel-sinais-pneu-desgastado-2026-04-07.md`
