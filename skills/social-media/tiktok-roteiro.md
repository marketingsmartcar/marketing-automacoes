---
name: tiktok-roteiro
description: Gera roteiros curtos e dinâmicos para TikTok da BR Pneus & Oficina, com gancho forte nos primeiros 3 segundos, texto na tela, sugestão de som e CTA final. Use sempre que precisar de roteiro para TikTok, script de vídeo curto, ideia para Reels adaptado para TikTok ou conteúdo para o perfil da marca no TikTok — mesmo que o pedido use termos como "cria um TikTok sobre X", "roteiro pra um vídeo curto" ou "faz um script pra gravar".
---

# Skill: Roteiro para TikTok

## Comando
```
/tiktok-roteiro [formato] [assunto]
```

## Parâmetros
- **formato** (obrigatório): Tipo de vídeo. Opções:
  - `mitos-e-verdades` — Mitos automotivos sendo desmentidos de forma dinâmica
  - `antes-depois` — Transformação visível de um serviço (ex: pneu careca → novo)
  - `dica-rapida` — Uma dica prática em 15–30 segundos
  - `bastidores` — Dia a dia real na oficina, humanizando a equipe
  - `trend` — Adaptação de trend viral para contexto automotivo
  - `humor` — Situação engraçada e relatável do cotidiano do motorista
  - `satisfatorio` — Vídeo satisfatório de serviço (montagem de pneu, corte de alinhamento, etc.)
- **assunto** (obrigatório): Tema específico. Ex: "mito do pneu careca na chuva", "alinhamento computadorizado 3D", "mecânico vs. cliente que acha que entende de carro"

---

## O que faz um TikTok funcionar (ler antes de criar)

TikTok é diferente de qualquer outra plataforma — entender isso é a base do roteiro:

- **Os primeiros 2–3 segundos decidem tudo.** Se o gancho não parar o scroll, o vídeo morre
- **Maioria assiste sem som** — texto na tela não é opcional, é obrigatório
- **Autenticidade supera produção.** Oficina real + mecânico real > vídeo editado com efeitos caros
- **A marca aparece de forma natural** — TikTok penaliza conteúdo que parece propaganda óbvia
- **Loop incentiva rewatch** — vídeos que terminam voltando ao início ganham mais alcance

---

## Processo antes de criar

1. Ler `knowledge/personas.md` para identificar a persona-alvo — no TikTok, a Giovana (conectada) e o Carlos (econômico prático) costumam ser os mais responsivos
2. Pensar no gancho antes de qualquer outra coisa — qual afirmação, pergunta ou visual vai parar o scroll?

---

## Estrutura obrigatória do output

### 1. Ficha técnica

```
Formato: [mitos-e-verdades | antes-depois | dica-rapida | bastidores | trend | humor | satisfatorio]
Duração: [15s | 30s | 60s] — indicar qual e por quê
Quem grava: [mecânico da oficina | atendente | dono da unidade | qualquer pessoa]
Tom: [descontraído e real | humor | demonstrativo | educativo]
```

### 2. Roteiro cena a cena

**GANCHO (cena 1 — primeiros 2–3 segundos):**
- O que falar (se houver fala): [texto exato]
- O que mostrar: [descrição do visual]
- Texto na tela: [exato — curto, impactante, em maiúsculas se necessário]
- Estratégia do gancho: [pergunta provocativa | afirmação polêmica | visual impactante | "você está fazendo isso errado" | curiosidade irresistível]

**DESENVOLVIMENTO (cenas intermediárias):**

Para cada cena:
```
Cena [número]
Duração: [Xs]
Fala (se houver): [texto — natural, como a pessoa falaria de verdade]
Visual: [o que filmar / mostrar]
Texto na tela: [legenda obrigatória — máx 8 palavras por frame]
Transição: [corte direto | zoom | virar câmera | efeito X]
```

**CTA FINAL (últimos 3 segundos):**
- Fala: [ex: "Segue pra mais dicas!" ou mencionar a BR Pneus de forma natural]
- Texto na tela: [CTA + @brpneus ou #BRPneus]
- Visual: [encerramento limpo — logo na tela ou produto em destaque]

### 3. Elementos técnicos

```
Som/música: [sugestão de estilo ou nome de trend — indicar "pesquise trend atual" se não souber]
Hashtags TikTok (5-8): #fyp #paravocê #carrosdetiktok #dicasautomotivas #brpneus #mecânica [+ nicho]
Efeitos sugeridos: [se aplicável — texto animado, duet, stitch, green screen]
```

### 4. Dicas de gravação

```
Orientação: vertical obrigatório (9:16)
Câmera: [frontal para fala direta | traseira para mostrar serviço | ambas para dinâmica]
Iluminação: luz natural pela janela ou teto da oficina — evitar sombra no rosto
Cenário: [recepção | baia de serviço | área de exposição de pneus | externo]
Qualidade mínima: celular comum com câmera decente já funciona — foco e iluminação > resolução
Autenticidade: não tentar parecer uma empresa grande — a oficina real converte mais
```

---

## Exemplos de ganchos por formato

- **mitos-e-verdades:** "Pneu careca freia melhor no seco? MENTIRA. E aqui está o motivo →"
- **antes-depois:** [close no pneu careca] → [som de montagem] → [close no pneu novo]
- **dica-rapida:** "Em 30 segundos você aprende a saber se seu pneu precisa ser trocado"
- **bastidores:** "Um dia normal na nossa oficina — começa às 7h e não para 👇"
- **humor:** "Quando o cliente diz que entende mais do carro do que o mecânico 😅"
- **satisfatorio:** [vídeo em câmera lenta do encaixe perfeito do pneu no aro]

---

## Onde salvar
```
output/posts/tiktok-[formato]-[assunto-resumido]-[YYYY-MM-DD].md
```
**Exemplo:** `output/posts/tiktok-mitos-e-verdades-pneu-chuva-2026-04-07.md`
