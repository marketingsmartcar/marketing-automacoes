---
name: copy-instagram
description: Gera publicação completa para Instagram da BR Pneus & Oficina — texto para criativo, legenda com gancho, CTA e hashtags segmentadas. Use sempre que precisar de post para Instagram, legenda de foto, copy de feed, texto de carrossel ou publicação para o perfil da marca — mesmo que o pedido use termos como "escreve uma legenda", "cria um post" ou "texto pro insta".
---

# Skill: Copy para Instagram

## Comando
```
/copy-instagram [tipo] [assunto] [cidade-opcional]
```

## Parâmetros
- **tipo** (obrigatório): `educativo`, `promocional`, `institucional` ou `entretenimento`
- **assunto** (obrigatório): Tema específico do post. Ex: "promoção pneus aro 14", "dica de revisão antes de viajar", "bastidores da equipe"
- **cidade** (opcional): Personaliza com referência local e hashtags geolocalizada

---

## Processo antes de escrever

1. Identificar a persona-alvo mais provável para este tipo de post (ler `knowledge/personas.md`)
2. Verificar se há data sazonal próxima que pode ser integrada ao tema (`knowledge/calendario-sazonal.md`)
3. Definir o gatilho principal da persona: economia, segurança, praticidade ou conveniência

---

## Estrutura obrigatória do output

### 1. Texto para o criativo (imagem ou vídeo)

Este texto vai sobre a arte — precisa ser impactante e legível em 2 segundos:

```
HEADLINE: [máx 6 palavras | letras maiúsculas | impacto imediato]
TEXTO DE SUPORTE: [máx 20 palavras | complementa o headline]
```

Se tipo `promocional`, adicionar:
```
DESTAQUE: [condição especial | ex: "até 18x sem juros" ou "Garanta já!"]
```

Rodapé da arte (sempre):
```
Logo BR Pneus & Oficina + tagline "Muito mais que pneus" + 0800 942 4402
```

### 2. Legenda

**Gancho** (primeira linha — CRUCIAL):
- Máx 125 caracteres — é o que aparece antes do "ver mais"
- Deve parar o scroll: pergunta provocativa, afirmação surpreendente, dado impactante ou situação relatável
- Não começar com "Olá!", "Oi, pessoal!" ou apresentação da marca

**Corpo da legenda** (100–180 palavras):

- **educativo:** dica prática explicada em linguagem acessível + por que isso importa para o motorista + conexão com o serviço da BR Pneus de forma natural
- **promocional:** benefício principal + condição da oferta (sem inventar preço — usar "preço especial", "consulte na loja") + urgência real (prazo, estoque) + como aproveitar
- **institucional:** história ou bastidor humanizado + conexão emocional com os valores da marca + convite para conhecer a equipe/loja
- **entretenimento:** situação relatável do cotidiano do motorista + humor leve + gancho para a marca de forma não forçada

**CTA** (sempre presente, variado — não repetir sempre o mesmo):
- "Chama a gente no WhatsApp 👇" / "Agenda agora pelo link na bio" / "Comenta aqui se você já passou por isso" / "Salva esse post pra não esquecer" / "Visita a unidade mais próxima"

**Pergunta de engajamento** (ao final, antes das hashtags):
- 1 pergunta direta que incentive comentários genuínos. Ex: "Quando foi a última vez que você fez a revisão do seu carro?"

### 3. Hashtags

Organizar em 3 blocos separados por linha:

**Bloco 1 — Marca (sempre iguais):**
`#BRPneus #MuitoMaisQuePneus #BRPneusEOficina #BRTotal #PneusBR`

**Bloco 2 — Nicho (5–7 tags | variar conforme o assunto):**
Exemplos: `#TrocaDePneu #AlinhamentoEBalanceamento #RevisaoAutomotiva #CuidadosComOCarro #OficinaDeConfianca #PneusBaratos #MelhorPreco`

**Bloco 3 — Local (3–5 tags | somente se cidade informada):**
Exemplos para Araraquara: `#Araraquara #OficinaAraraquara #PneusAraraquara #AraraquaraSP`

Total: 13–17 hashtags por post

### 4. Informações de publicação

```
Melhor dia/horário: [dia da semana + faixa horária ideal para este tipo de conteúdo]
Persona-alvo: [qual das 4 personas e por quê]
Formato sugerido: [post único | carrossel (N slides) | Reels com legenda]
Obs. para designer: [descrição do visual ideal para acompanhar este texto]
```

---

## Regras de linguagem

- Tom: popular, direto e confiável — como um amigo mecânico falando sem enrolação
- Linguagem acessível para público classe B/C: sem jargão técnico não explicado
- Frases curtas, parágrafos de 2–3 linhas no máximo
- Emojis: usar com moderação (2–4 por legenda, apenas onde fazem sentido)
- Nunca inventar preço, prazo de serviço ou condição não confirmada pelo usuário

---

## Onde salvar
```
output/posts/instagram-[tipo]-[assunto-resumido]-[YYYY-MM-DD].md
```
**Exemplo:** `output/posts/instagram-promocional-pneus-aro14-2026-04-07.md`
