---
name: post-dica
description: Gera post single (imagem única) com dica rápida de cuidado automotivo para redes sociais da BR Pneus & Oficina — com texto para a imagem, legenda completa e sugestão visual. Use sempre que precisar de um post rápido, dica do dia, conteúdo educativo curto para Instagram ou Facebook, ou qualquer post de imagem única com orientação para o motorista.
---

# Skill: Post de Dica Rápida

## Comando
```
/post-dica [assunto]
```

## Parâmetros
- **assunto** (obrigatório): tema da dica. Ex: "pressão do pneu", "quando trocar o óleo", "pneu na chuva", "calibragem antes de viajar"

---

## Processo antes de criar

1. Identificar qual persona tem mais aderência ao assunto (ver `knowledge/personas.md`)
2. Verificar se há contexto sazonal relevante no `knowledge/calendario-sazonal.md`
3. Definir o ângulo da dica: segurança, economia ou praticidade (os 3 pilares da marca)

---

## Estrutura obrigatória do output

### Parte 1 — Texto para a imagem

O texto na imagem deve ser lido em 3 segundos. Menos é mais.

```
Headline: [máx 6 palavras | impacto imediato — pode ser uma pergunta, alerta ou número]
Dica: [1-3 frases curtas e diretas | máx 30 palavras no total]
Rodapé: BR Pneus & Oficina | Muito mais que pneus
```

**Bons exemplos de headline:**
- "Seu pneu está calibrado?"
- "3 sinais de que precisa de alinhamento"
- "Chuva + pneu liso = perigo real"
- "Troca de óleo: quando fazer?"

**Evitar:** headlines genéricas, negativas sem solução, alarmismo exagerado

### Parte 2 — Legenda

```
Parágrafo de expansão: [80-120 palavras]
- Tom: amigo mecânico explicando de forma simples e sem jargão
- Expandir a dica com 1-2 informações adicionais que não cabem na imagem
- Explicar quando é hora de procurar um profissional (quando aplicável)
- Mencionar 1 diferencial da BR Pneus de forma natural (garantia, preço, mix de pneus)

CTA: [1-2 frases]
- Direcionar para WhatsApp (0800 942 4402), agendamento ou visita à unidade mais próxima

Pergunta de engajamento: [1 pergunta aberta no final]
- Ex: "E você, lembra quando fez a última revisão?" / "Qual desses sinais você já notou no seu carro?"

Hashtags: [15-20]
- Mix de volume alto + nicho + local + marca
```

### Parte 3 — Orientações visuais

```
Tipo de imagem/foto sugerida: [descrição do que funciona para esse tema]
Exemplo de uso de cor:
- Fundo escuro (#1A1A1A): texto em branco + destaque em amarelo (#F5A623)
- Fundo claro (#FFFFFF): texto preto + headline em amarelo/laranja
- Fundo amarelo (#F5A623): texto preto, visual de impacto

Formato:
- Padrão: 1080x1080px (quadrado — feed)
- Alternativo: 1080x1350px (retrato — mais espaço para texto, melhor alcance)

Elementos gráficos sugeridos: [ícone, seta, pneu, carro, check, alerta — o mais adequado ao tema]
```

---

## Regras de linguagem

- A dica deve ser **prática e aplicável imediatamente** — o leitor faz algo diferente depois de ler
- Evitar alarmismo exagerado ("você vai morrer se não fizer isso")
- A conexão com o serviço da BR Pneus deve parecer natural, não um anúncio forçado
- Não inventar números sem base (ex: "70% dos acidentes são por pneu") — usar "muitos", "grande parte", "especialistas recomendam" se não tiver dado confiável

---

## Onde salvar
```
output/posts/dica-[assunto-resumido]-[YYYY-MM-DD].md
```
**Exemplo:** `output/posts/dica-pressao-pneu-2026-04-07.md`
