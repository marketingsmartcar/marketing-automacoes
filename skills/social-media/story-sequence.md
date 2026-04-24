---
name: story-sequence
description: Gera o roteiro completo de uma sequência de stories para Instagram ou Facebook da BR Pneus & Oficina, com roteiro cena a cena, stickers de interação, orientações de gravação e fluxo narrativo. Use sempre que precisar de roteiro de stories, sequência de stories, série de frames para Instagram ou Facebook Stories — mesmo que o pedido use termos como "cria stories", "faz uma sequência", "roteiro para stories" ou "5 stories sobre X".
---

# Skill: Sequência de Stories

## Comando
```
/story-sequence [tema] [num-stories-opcional]
```

## Parâmetros
- **tema** (obrigatório): Assunto da sequência. Ex: "promoção pneus aro 14", "bastidores da oficina em Jaú", "antes e depois do alinhamento", "enquete sobre revisão"
- **num-stories** (opcional, padrão: 5): Quantidade de stories (mínimo 3, máximo 8)

---

## Processo antes de criar

1. Ler `knowledge/personas.md` para calibrar linguagem e o que vai gerar identificação
2. Verificar se há data sazonal próxima que pode ser integrada (`knowledge/calendario-sazonal.md`)
3. Definir o objetivo da sequência: informar, promover, engajar ou bastidores

---

## Fluxo narrativo obrigatório

Stories têm lógica de mini-narrativa — cada frame deve ter propósito:

| Posição | Função | Objetivo |
|---------|--------|----------|
| Story 1 | GANCHO | Parar o dedo — fazer a pessoa continuar assistindo |
| Stories 2–(N-2) | DESENVOLVIMENTO | Informação, demonstração, bastidor, prova |
| Story (N-1) | PROVA SOCIAL / DADO | Reforçar credibilidade antes do CTA |
| Story N (último) | CTA | Ação clara: WhatsApp, link, agendar, comentar |

---

## Estrutura obrigatória do output

Para CADA story, gerar o bloco completo:

---

**Story [número] — [nome descritivo da cena]**

- **Tipo:** imagem fixa | vídeo gravado | boomerang | texto animado | enquete | quiz | countdown | slider de emoji | caixa de pergunta
- **Duração:** [7s para imagem | 15s para vídeo | conforme o tipo]
- **Texto na tela:** [máx 30 palavras — story é rápido, texto deve ser lido em segundos]
- **Descrição do visual:** [o que mostrar na imagem ou o que filmar — específico e acionável]
- **Sticker/interação sugerida:** [enquete "Sim/Não" | quiz de múltipla escolha | slider de emoji | caixa de pergunta | countdown | nenhum]
  - Se enquete: `Pergunta: "[texto]" | Opção A: "[texto]" | Opção B: "[texto]"`
  - Se quiz: `Pergunta: "[texto]" | Resposta certa: "[texto]"`
- **Música sugerida:** [estilo ou nome se for tendência — opcional, indicar quando agrega]
- **Link/CTA:** [se aplicável: link para WhatsApp, link na bio, endereço da loja]

---

**Exemplo de estrutura para sequência de 5 stories sobre "Troca de Óleo":**

Story 1 (gancho): "Você sabe o que acontece com seu motor sem troca de óleo? 😱" + enquete "Sei sim / Não faço ideia"
Story 2 (desenvolvimento): Explicação visual rápida — consequências do óleo velho + texto curto na tela
Story 3 (desenvolvimento): Demonstração de processo — vídeo da troca sendo feita na oficina
Story 4 (prova social): Print ou reencenação de avaliação 5 estrelas de cliente + dado ("mais de X revisões por mês")
Story 5 (CTA): "Agende a sua agora pelo WhatsApp 👇" + link direto + countdown até fim da semana

---

## Orientações de gravação (ao final do roteiro)

Incluir bloco prático para quem vai produzir:

```
QUEM GRAVA: [mecânico / atendente / dono da unidade / qualquer pessoa]
CÂMERA: [frontal (selfie) | traseira (mostrar o ambiente) | ambas]
ORIENTAÇÃO: [vertical obrigatório | 9:16]
ILUMINAÇÃO: [luz natural pela janela | luz da oficina | evitar contraluz]
CENÁRIO: [recepção da loja | baia de serviço | área de pneus | externo]
APOIO: [pode segurar o celular | indicar tripé se o vídeo for longo]
TOM: [descontraído e natural — não precisa ser perfeito, autenticidade converte]
```

---

## Regras de conteúdo

- Gancho no Story 1 é inegociável — sem gancho forte, a sequência não tem sentido
- Texto na tela é obrigatório em todos os frames (muitos assistem sem som)
- Cada story deve ser autoexplicativo — o espectador pode entrar em qualquer frame
- Não usar jargão técnico sem explicar rapidamente
- Emojis são bem-vindos nos stories — usá-los com moderação (1–2 por frame)
- CTA no último frame SEMPRE — nunca terminar a sequência sem direcionar para ação

---

## Onde salvar
```
output/posts/stories-[tema-resumido]-[YYYY-MM-DD].md
```
**Exemplo:** `output/posts/stories-troca-de-oleo-2026-04-07.md`
