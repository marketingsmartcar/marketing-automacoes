---
name: resposta-comentario
description: Gera templates de respostas para comentários e mensagens em redes sociais da BR Pneus & Oficina, mantendo o tom acolhedor e profissional da marca. Use sempre que precisar de templates de resposta, como responder clientes, respostas para comentários negativos ou positivos, como lidar com reclamações nas redes, ou gerenciar mensagens — mesmo que o pedido use termos como "como responder", "o que falar quando o cliente reclama" ou "templates de atendimento".
---

# Skill: Templates de Resposta a Comentários

## Comando
```
/resposta-comentario [tipo]
```

## Parâmetros
- **tipo** (obrigatório): Categoria do comentário. Opções:
  - `elogio` — Cliente elogiando serviço, atendimento ou experiência
  - `duvida-preco` — Perguntando preço de pneu, serviço ou condição de pagamento
  - `duvida-servico` — Perguntando sobre um serviço específico, prazo ou como funciona
  - `reclamacao` — Insatisfação com serviço, atendimento, prazo ou produto
  - `localizacao` — Perguntando endereço, horário de funcionamento ou como chegar
  - `agendamento` — Querendo marcar visita, orçamento ou serviço
  - `concorrente` — Comparando preço ou serviço com concorrente
  - `todos` — Gera templates para todas as categorias acima

---

## Contexto antes de gerar

Esta skill produz templates prontos para uso — mas quem for aplicar deve:
1. Sempre personalizar com o nome do cliente quando visível no comentário
2. Adaptar o template ao contexto específico do comentário (não usar no piloto automático)
3. Verificar se o cliente já foi respondido antes de responder novamente

---

## Estrutura obrigatória do output

Para cada tipo, gerar:

### Template principal

**[TIPO: Nome da Categoria]**

**Tom:** [descrever em 1 linha o tom específico para este tipo]  
**Tempo máximo de resposta:** [prazo recomendado]  
**Quando escalar para DM ou telefone:** [condição específica]  
**O que NUNCA dizer nesta situação:** [1–3 exemplos de resposta errada]

**Variação 1:**  
[texto da resposta — natural, sem parecer robótico]

**Variação 2:**  
[texto da resposta — abordagem ligeiramente diferente]

**Variação 3:**  
[texto da resposta — mais curta ou mais longa, conforme o contexto]

---

## Regras universais para todas as respostas

Estas regras se aplicam a qualquer template gerado por esta skill:

- **Velocidade:** responder stories em até 1 hora, posts de feed em até 3 horas, reclamações em até 30 minutos
- **Personalização:** chamar pelo nome quando visível — "Oi, João!" é melhor que "Olá!"
- **Preço:** nunca passar valor nos comentários públicos — sempre redirecionar para WhatsApp ou DM
- **Reclamação:** nunca ignorar, nunca discutir publicamente. Demonstrar empatia primeiro, depois resolver
- **Concorrência:** nunca citar concorrentes pelo nome — nem para criticar, nem para comparar
- **Escalada:** qualquer situação delicada (reclamação grave, cliente irritado, problema de produto) vai para DM imediatamente
- **Emojis:** usar com moderação — 1–2 por resposta no máximo
- **Encerramento:** toda resposta deve incluir um próximo passo claro para o cliente

---

## Templates por categoria

A seguir, o modelo de saída para cada tipo. Ao gerar, preencher com linguagem alinhada ao tom da BR Pneus & Oficina (popular, direto, acolhedor):

**Elogio** — reforçar o laço emocional, agradecer com calor, convidar para voltar  
**Dúvida de preço** — acolher, redirecionar para canal privado, não criar falsa expectativa  
**Dúvida de serviço** — responder o que for possível em público, aprofundar no privado  
**Reclamação** — empatia imediata, assumir responsabilidade de investigar, levar para DM  
**Localização** — resposta direta com endereço + horário + link do mapa quando possível  
**Agendamento** — entusiasmo, facilitar o caminho, linkar WhatsApp  
**Concorrente** — manter o foco nos diferenciais próprios, sem denegrir o outro

---

## Onde salvar
```
output/posts/respostas-[tipo]-[YYYY-MM-DD].md
```
**Exemplo:** `output/posts/respostas-reclamacao-2026-04-07.md`
