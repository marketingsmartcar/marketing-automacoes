---
name: post-blog
description: Gera artigo completo para o blog da BR Pneus & Oficina, otimizado para SEO, com estrutura de H1/H2/H3, FAQ schema, CTA e sugestões editoriais. Use sempre que precisar criar conteúdo de blog, artigo educativo, texto longo para o site, ou pauta de conteúdo sobre cuidados automotivos — mesmo que o pedido use palavras como "texto", "artigo", "post longo" ou "conteúdo para o site".
---

# Skill: Post de Blog

## Comando
```
/post-blog [tema] [persona-alvo] [cidade-opcional]
```

## Parâmetros
- **tema** (obrigatório): assunto do artigo. Ex: "quando trocar o pneu", "importância do alinhamento 3D", "como economizar combustível"
- **persona-alvo** (opcional, padrão: todas): Carlos, Ana, Roberto ou Giovana — ver `knowledge/personas.md` para adaptar o ângulo
- **cidade** (opcional): se informada, inclui referências locais e otimização para SEO local ("alinhamento em Araraquara")

---

## Processo antes de escrever

1. Ler `knowledge/personas.md` para identificar dores, gatilhos e linguagem da persona-alvo
2. Ler `knowledge/calendario-sazonal.md` para verificar se o tema tem aderência sazonal que pode ser aproveitada
3. Definir keyword principal e 3-5 secundárias com base no tema e cidade (se fornecida)

---

## Estrutura obrigatória do output

### 1. Meta informações
```
Title tag: [máx 60 caracteres | keyword principal + marca ou local]
Meta description: [máx 155 caracteres | benefício + CTA suave]
URL slug: /blog/[slug-em-kebab-case]
Keyword principal: [1 termo]
Keywords secundárias: [3-5 termos relacionados]
Persona-alvo: [qual persona e por quê]
```

### 2. Corpo do artigo

**H1** — atrativo, com keyword principal, máx 65 caracteres. Não repetir o title tag literalmente.

**Introdução** (2-3 parágrafos)
- Keyword principal nos primeiros 100 palavras (inserção natural)
- Conectar diretamente com a dor ou situação da persona-alvo
- Criar identificação imediata: o leitor deve sentir que o texto foi escrito para ele
- Não começar com "Você sabia que..." ou clichês semelhantes

**4 a 6 seções com H2**
- Usar keywords secundárias nos H2 de forma natural
- H3 para subtópicos quando necessário
- Parágrafos curtos: máximo 3-4 linhas por parágrafo
- Pelo menos 1 exemplo prático ou cenário do dia a dia em uma das seções
- Menção natural a um serviço da BR Pneus quando for o momento certo — nunca forçar

**Comprimento mínimo:** 1.200 palavras

### 3. CTA final
- Parágrafo de fechamento conectando o tema ao serviço da BR Pneus & Oficina
- Mencionar garantia BR Total ou parcelamento 18x se for relevante para o tema
- CTA direto: agendar pelo WhatsApp (0800 942 4402), visitar a unidade mais próxima, ou fazer diagnóstico gratuito

### 4. FAQ (estrutura para schema markup)
Gerar 4-5 perguntas frequentes reais sobre o tema:
```
**Pergunta 1:** [pergunta como o cliente digitaria no Google]
**Resposta:** [2-3 frases diretas e claras]
```
As perguntas devem cobrir dúvidas reais — não repetir o conteúdo do artigo, mas complementá-lo.

### 5. Notas editoriais (para o produtor que vai publicar)
```
Imagens sugeridas:
- [descrição de foto 1]
- [descrição de foto 2]
- [descrição de foto 3]

Links internos sugeridos:
- [página ou post relacionado]
- [página de serviço relevante]

Sugestão de post para divulgação nas redes:
[copy curto + CTA para usar no Instagram/Facebook ao publicar o artigo]
```

---

## Regras de linguagem

- Tom: como um amigo mecânico de confiança explicando sem enrolação
- Explicar todo termo técnico na primeira vez que aparecer (ex: "rodízio — que é a troca de posição dos pneus entre eixos")
- Não inventar dados técnicos: se não tiver certeza de um número, usar "geralmente", "em média", "especialistas recomendam"
- Se cidade foi informada, incluir 1-2 referências locais naturais (ex: "aqui no interior de São Paulo, com o calor de Araraquara...", "nas estradas vicinais da região...")
- Não usar expressões: "no mundo atual", "nos dias de hoje", "é sabido que", "é notório que"

---

## Onde salvar
```
output/posts/blog-[slug]-[YYYY-MM-DD].md
```
**Exemplo:** `output/posts/blog-quando-trocar-pneu-2026-04-07.md`
