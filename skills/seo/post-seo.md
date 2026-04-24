---
name: post-seo
description: Gera artigo de blog completo e otimizado para ranquear no Google para a BR Pneus & Oficina, com briefing SEO, estrutura de headings, FAQ schema, links internos e checklist de qualidade on-page. Use sempre que precisar de artigo otimizado para SEO, post de blog para ranquear no Google, conteúdo para trazer tráfego orgânico ou texto para posicionar a marca em buscas informacionais — mesmo que o pedido use termos como "artigo para o blog", "conteúdo para aparecer no Google" ou "texto sobre X para ranquear".
---

# Skill: Artigo de Blog Otimizado para SEO

## Comando
```
/post-seo [keyword-principal] [cidade-opcional]
```

## Parâmetros
- **keyword-principal** (obrigatório): Tema e keyword alvo do artigo. Ex: "quando trocar o pneu do carro", "o que é alinhamento 3D", "como economizar combustível"
- **cidade** (opcional): Se informada, otimiza para SEO local e inclui referências à unidade da cidade

---

## Diferença entre /post-seo e /post-blog

- `/post-blog` (do content-creator): foco em linguagem, engajamento, educação e CTA para o leitor
- `/post-seo` (deste agente): foco em estrutura técnica para ranquear + qualidade editorial integrada

Na prática, o output deste agente entrega ambos: SEO técnico E conteúdo de qualidade.

---

## Processo antes de escrever

1. Identificar a **intenção de busca** da keyword: informacional (aprender), navegacional (encontrar), transacional (comprar/contratar) ou local (encontrar perto)
2. Definir **keywords secundárias** que devem aparecer naturalmente ao longo do texto
3. Ler `knowledge/personas.md` para calibrar linguagem e profundidade do conteúdo
4. Verificar `knowledge/calendario-sazonal.md` para possível gancho sazonal
5. Se cidade informada, confirmar que há unidade ativa (`agents/seo-specialist.md`)

---

## Estrutura obrigatória do output

### 1. Briefing SEO

```
Keyword principal: [termo exato]
Intenção de busca: [informacional | transacional | local | mista]
Tipo de conteúdo ideal: [guia completo | lista de dicas | tutorial | comparativo | FAQ]
Keywords secundárias: [5–8 termos para distribuir pelo texto]
Comprimento alvo: [mínimo 1.200 palavras | ideal 1.800–2.500]
Persona-alvo: [qual das 4 personas e por quê]
```

### 2. Meta Informações

```
Title tag: [máx 60 chars | keyword + cidade se aplicável | marca]
Meta description: [máx 155 chars | benefício + CTA]
URL slug: /blog/[keyword-em-kebab-case]-[cidade-opcional]
H1: [diferente do title tag, mas com keyword | máx 65 chars]
```

### 3. Estrutura completa do artigo

**Introdução** (150–200 palavras)
- Keyword principal nos primeiros 100 palavras — inserção natural
- Conectar diretamente com a dor ou situação da persona-alvo
- Antecipar o que o artigo vai entregar (criar expectativa)
- Não começar com "Você sabia que...", "No mundo atual..." ou clichês

**5–7 seções com H2**
- Cada H2 com uma keyword secundária integrada de forma natural
- Cada seção: 150–250 palavras
- H3 para subtópicos quando necessário
- Parágrafos curtos: máximo 3–4 linhas
- Ao menos 1 lista (marcadores ou numerada) no artigo inteiro
- Ao menos 1 exemplo prático ou cenário do dia a dia

**Seção especial de SEO local** (somente se cidade informada):
```
Título sugerido: "Onde fazer [serviço] em [cidade]?"
Conteúdo: mencionar a BR Pneus & Oficina de forma natural
Incluir: endereço da unidade, telefone/WhatsApp, diferenciais (parcelamento, garantia BR Total)
```

**Conclusão com CTA** (100–150 palavras)
- Resumo dos pontos principais em 2–3 frases
- CTA claro: agendar pelo WhatsApp (0800 942 4402), visitar a unidade, ou fazer diagnóstico gratuito
- Mencionar garantia BR Total ou parcelamento 18x quando for relevante para o tema

### 4. FAQ Schema

Gerar 4–6 perguntas para a seção FAQ do artigo e para implementar como JSON-LD:

```
Pergunta 1: [como o usuário digitaria no Google — linguagem natural]
Resposta: [2–3 frases diretas | incluir keyword quando possível]

Pergunta 2: [...]
Resposta: [...]
```

As perguntas devem complementar o artigo — não repetir o que já foi dito, mas responder dúvidas adjacentes.

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "[Pergunta 1]",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "[Resposta 1]"
      }
    }
  ]
}
```

### 5. Elementos de SEO On-Page

```
Alt text para imagens (sugerir 3–4):
- Imagem 1: [descrição + keyword + cidade se aplicável]
- Imagem 2: [...]

Links internos sugeridos (3–5):
- Texto âncora: "[texto]" → Página: "[URL ou descrição da página]"
- [...]

Link externo sugerido (1–2 fontes autoritativas):
- [Detran, fabricante de pneu, ABNT, Inmetro, etc.]
- Justificativa: por que este link agrega autoridade ao artigo

Densidade de keyword:
- Keyword principal: aparecer ~3–5x no texto de forma natural
- Não forçar — fluxo de leitura natural é mais importante que densidade
```

### 6. Checklist de Qualidade On-Page

Aplicar antes de finalizar:

- [ ] Keyword principal no title tag, H1, primeiro parágrafo, URL e meta description
- [ ] Mínimo 1.200 palavras (contar sem os campos de meta informações)
- [ ] Keywords secundárias distribuídas nos H2s e ao longo do texto
- [ ] FAQ com estrutura JSON-LD de schema markup
- [ ] CTA com link direto para WhatsApp ou agendamento
- [ ] Alt text descrito para todas as imagens sugeridas
- [ ] 3–5 links internos para páginas de serviço ou outros artigos
- [ ] Parágrafos curtos (máx 4 linhas) e texto scannable
- [ ] Sem conteúdo duplicado de outros posts do blog
- [ ] Nenhum preço ou prazo inventado

---

## Regras de linguagem

- Tom: amigo mecânico de confiança explicando sem enrolação — nunca técnico demais
- Explicar todo termo técnico na primeira vez que aparecer
- Não usar: "no mundo atual", "nos dias de hoje", "é sabido que", "é notório que"
- Se cidade informada, incluir 1–2 referências locais naturais ao longo do texto

---

## Onde salvar
```
output/posts/blog-seo-[keyword-resumida]-[cidade]-[YYYY-MM-DD].md
```
**Exemplo:** `output/posts/blog-seo-quando-trocar-pneu-bauru-2026-04-07.md`
