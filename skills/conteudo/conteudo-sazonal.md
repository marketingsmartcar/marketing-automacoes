---
name: conteudo-sazonal
description: Gera pacote completo de conteúdo para uma data sazonal ou evento específico da BR Pneus & Oficina, adaptado para múltiplos canais: Instagram, Facebook, blog, email e WhatsApp, com cronograma de publicação. Use sempre que precisar criar conteúdo para Black Friday, Dia das Mães, férias, Semana do Trânsito, inverno, ou qualquer data comemorativa ou campanha de período — mesmo que o pedido use apenas "campanha de [data]" ou "conteúdo para [evento]".
---

# Skill: Conteúdo Sazonal

## Comando
```
/conteudo-sazonal [data-ou-evento] [canais-opcional]
```

## Parâmetros
- **data-ou-evento** (obrigatório): nome da data ou evento. Ex: "Black Friday 2026", "Dia dos Pais 2026", "férias de julho 2026", "Semana Nacional do Trânsito 2026"
- **canais** (opcional, padrão: todos): especificar se quiser apenas alguns. Opções: `instagram`, `facebook`, `blog`, `email`, `whatsapp`

---

## Processo antes de criar

1. Consultar `knowledge/calendario-sazonal.md` para:
   - Contexto da data (por que é relevante para a BR Pneus & Oficina)
   - Serviço(s) mais adequado(s) para vincular à data
   - Persona-alvo principal do período
2. Definir o ângulo central da campanha (único fio condutor que conecta todos os canais)
3. Definir 1-2 serviços em destaque para a campanha (não dispersar em muitos)

---

## Estrutura obrigatória do output

### Briefing da campanha
```
Evento/Data: [nome]
Data(s): [quando acontece]
Ângulo central: [frase que resume o conceito da campanha]
Serviço em destaque: [1-2 serviços]
Persona principal: [qual persona e por quê]
Tom da campanha: [ex: urgência, emocional, educativo, promocional]
```

---

### Canal: Instagram

**Post principal de feed (imagem ou vídeo)**
```
Headline da imagem: [máx 8 palavras]
Legenda: [150-200 palavras]
- Primeira linha de impacto (visível antes do "ver mais")
- Contexto da data conectado ao serviço
- Diferencial da BR Pneus & Oficina (parcelamento, garantia, preço)
- CTA claro
- Pergunta de engajamento
Hashtags: [20 hashtags — mistura de volume, nicho, local e marca]
```

**Carrossel de campanha (5-7 slides)**
```
Slide 1 — Capa: [headline + subtítulo + sugestão visual]
Slide 2: [ponto 1 da campanha]
Slide 3: [ponto 2]
Slide 4: [ponto 3]
Slide 5 (CTA): [chamada + contato + logo]
[Slides extras se num-slides > 5]
```

**Stories (2 stories)**
```
Story 1: [conteúdo/imagem + texto + sugestão visual]
Story 2: [CTA com link/sticker "Fale conosco" ou "Saiba mais"]
```

**Roteiro de Reels (15-30 segundos)**
```
Gancho [0-3s]: [frase ou ação que prende atenção imediata]
Desenvolvimento [3-20s]: [explicação visual rápida — o que fazer, por que importa]
CTA final [20-30s]: [convite para ação + logo BR Pneus & Oficina]
Texto sugerido em tela: [legendas principais para quem assiste sem som]
Trilha sugerida: [estilo de música — animada, dramática, popular]
```

---

### Canal: Facebook

**Post principal**
```
Copy: [150-200 palavras — pode ser mais longo que Instagram, público diferente]
- Contextualizar a data para quem não "mergulhou" na campanha
- Tom mais explicativo, menos visual
- CTA com link para WhatsApp ou site
Imagem sugerida: [descrição]
```

**Evento no Facebook (se aplicável)**
```
Nome do evento: [título]
Descrição: [2-3 parágrafos]
Foto de capa sugerida: [descrição]
```

---

### Canal: Blog

**Pauta de artigo**
```
Título SEO sugerido: [com keyword + localização se aplicável]
Keyword principal: [1 termo]
Keywords secundárias: [3-4 termos]
Ângulo editorial: [por que escrever sobre isso agora, ligado à data]
Estrutura de H2s sugerida:
  H2 1: [seção 1]
  H2 2: [seção 2]
  H2 3: [seção 3]
  H2 4: [seção 4 — CTA e BR Pneus]
Persona-alvo do artigo: [qual persona e por quê]
```

*Nota: usar `/post-blog` para gerar o artigo completo com base nesta pauta.*

---

### Canal: Email

**Email promocional da campanha**
```
Assunto A: [urgência/data — máx 50 caracteres]
Assunto B: [benefício — máx 50 caracteres]
Preview text: [máx 90 caracteres]

Corpo:
- Saudação: Oi, {{nome}}!
- Abertura: [1-2 frases sobre a data e relevância]
- Destaque do serviço: [o que é, por que agora, diferencial BR Pneus]
- CTA principal: [botão "Aproveitar Agora" ou "Agendar"]
- Urgência: [se houver prazo, incluir aqui — nunca inventar]
- Assinatura: BR Pneus & Oficina | 0800 942 4402
```

---

### Canal: WhatsApp

**Mensagem para lista de transmissão**
```
[máx 500 caracteres — objetivo: gerar clique ou resposta]
Texto: [mensagem direta, com emoji estratégico, CTA claro]
```

**Template para WhatsApp Business (com variáveis)**
```
Olá, {{nome}}! 👋
[2-3 frases sobre a data/campanha]
[Serviço em destaque e diferencial]
Quer agendar? É só responder aqui! 😊
```

---

### Cronograma de publicação sugerido

Gerar timeline com o que publicar e quando, relativo à data do evento:

```
[X dias antes — Teaser]:
  - Instagram: story de contagem regressiva ou teaser
  - WhatsApp: mensagem de antecipação para lista

[X dias antes — Aquecimento]:
  - Instagram: carrossel educativo sobre o tema/serviço
  - Facebook: post explicativo
  - Blog: publicar artigo (se preparado)

[Véspera]:
  - Email: disparo para base
  - Instagram: post principal de feed
  - WhatsApp: disparo para lista

[Dia do evento]:
  - Instagram Stories: 2 stories + Reels
  - Facebook: post + possível impulsionamento

[Pós-evento (se campanha com prazo)]:
  - Instagram: lembrete de "últimas horas"
  - WhatsApp: mensagem de última chance
```

---

## Regras

- Manter coerência de ângulo e narrativa em todos os canais — é 1 campanha, não 6 peças soltas
- Urgência e escassez só quando houver prazo real definido pelo usuário
- Nunca inventar preço, prazo de serviço ou condição promocional
- Sempre mencionar pelo menos 1 diferencial da BR Pneus & Oficina
- Cidades mencionadas devem ter unidade ativa (verificar no CLAUDE.md)

---

## Onde salvar
```
output/posts/sazonal-[evento-resumido]-[YYYY-MM-DD].md
```
**Exemplo:** `output/posts/sazonal-black-friday-2026-11-01.md`
