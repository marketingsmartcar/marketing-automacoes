# Skill: Adaptação de Tom de Voz

## Comando
`/adaptar-tom [transformacao] [texto]`

## O que faz
Reescreve um texto adaptando o tom de voz para ficar alinhado com a marca BR Pneus & Oficina, mantendo integralmente a mensagem, informações e objetivo originais.

---

## Parâmetros

| Parâmetro | Obrigatório | Opções |
|-----------|-------------|--------|
| `transformacao` | Sim | `formal-para-popular`, `tecnico-para-acessivel`, `agressivo-para-acolhedor`, `generico-para-marca`, `longo-para-curto`, `curto-para-completo` |
| `texto` | Sim | O conteúdo a ser adaptado (colado diretamente ou referência ao arquivo) |

---

## Descrição das Transformações

| Transformação | Problema que resolve | Exemplo de caso |
|---------------|---------------------|-----------------|
| `formal-para-popular` | Texto muito corporativo/institucional → tom BR Pneus acessível | Email escrito em linguagem de relatório sendo enviado para clientes classe C |
| `tecnico-para-acessivel` | Texto com jargão mecânico → linguagem do motorista comum | Post sobre "geometria de rodas" sem explicar o que é |
| `agressivo-para-acolhedor` | Copy muito push/pressão → tom consultivo e acolhedor | Anúncio com "COMPRE AGORA!!!" e múltiplas exclamações |
| `generico-para-marca` | Texto poderia ser de qualquer oficina → específico da BR Pneus | Post sem diferenciais, sem garantia, sem identidade de marca |
| `longo-para-curto` | Texto prolixo → versão enxuta mantendo o essencial | Email de 800 palavras que poderia ser 200 |
| `curto-para-completo` | Texto muito resumido → versão completa com diferenciais e CTA | Post de 1 frase sem contexto, sem CTA, sem diferencial |

---

## Estrutura do Output

---

### 1. Diagnóstico

```
Tom atual identificado: [descrever em 1-2 frases o problema principal]
Nível de mudança necessário: Leve | Moderado | Significativo
Elementos a preservar: [mensagem core, dados específicos, oferta, prazo, etc.]
Elementos a transformar: [listar o que precisa mudar]
```

**Orientação por nível de mudança:**
- **Leve:** ajustes pontuais, estrutura mantida, 20–30% do texto muda
- **Moderado:** reescrita de metade do conteúdo, estrutura parcialmente mantida
- **Significativo:** reescrita quase total, apenas os fatos e a mensagem central são preservados

---

### 2. Versão Adaptada

O texto completamente reescrito no tom BR Pneus & Oficina:
- Mesma mensagem e informações, tom diferente
- **Negrito** nos trechos que sofreram mudança significativa
- Tom: popular, direto, confiável, acolhedor
- Nome da marca correto em todas as menções
- CTA presente e claro (adicionar se estava ausente)

---

### 3. Comparativo Antes/Depois

Para os 3–5 trechos mais relevantes transformados:

| # | Antes | Depois | Princípio aplicado |
|---|-------|--------|-------------------|
| 1 | [trecho original exato] | [trecho reescrito] | [ex: "Popular — linguagem do dia a dia"] |
| 2 | ... | ... | ... |
| 3 | ... | ... | ... |

---

### 4. Dicas para Não Repetir o Problema

> 2–3 dicas práticas para quem criou o material original, com referências ao manual da marca.

**Dica 1:** [dica específica ao tipo de transformação feita]
- Referência: `agents/brand-guardian.md` — seção [nome da seção relevante]

**Dica 2:** [dica específica]

**Dica 3 (se aplicável):** [dica específica]

---

## Guias por Tipo de Transformação

---

### formal-para-popular

**Sinais de texto formal demais:**
- Frases com mais de 25 palavras
- Uso de "conforme", "mediante", "disponibilizar", "usufruir"
- Voz passiva ("é recomendado que...", "deve ser agendado...")
- Distância impessoal ("os clientes podem...", "o serviço oferece...")

**Como transformar:**
- Substituir "conforme" → "como combinado"
- Substituir "mediante apresentação" → "basta mostrar"
- Transformar voz passiva em ativa: "pode ser agendado" → "agende"
- Aproximar: "os clientes" → "você"
- Usar contrações coloquiais: "está" → "tá" (em contextos de redes sociais/WhatsApp)

**Antes:** "Disponibilizamos serviços de revisão completa mediante agendamento prévio, com garantia de até 12 meses conforme programa BR Total."
**Depois:** "A gente faz sua revisão completa com hora marcada e você ainda sai com Garantia BR Total de 1 ano. Só agendar!"

---

### tecnico-para-acessivel

**Termos técnicos mais comuns e suas traduções:**

| Termo técnico | Tradução acessível |
|---------------|-------------------|
| Geometria de rodas | Alinhamento das rodas |
| Convergência/divergência | Ângulo das rodas (se estão "apontando" pro lugar certo) |
| Amortecedor | Peça que absorve os impactos |
| Rolamento | Peça que permite a roda girar suavemente |
| Fluido de freio | Líquido do freio |
| Correia dentada | Correia do motor (a que não pode arrebentar) |
| Injeção eletrônica | Sistema que controla o combustível do carro |
| EGR / catalisador | Parte do sistema de emissões |
| Paralelo / balanceamento | Deixar as rodas equilibradas |

**Fórmula para explicar termos técnicos:**
`[Termo simples] — [o que é em 1 frase] — [por que importa para o motorista]`

**Antes:** "A descalibração da geometria direcional pode causar desgaste irregular dos pneus e comprometer a estabilidade direcional do veículo."
**Depois:** "Pneu desalinhado desgasta torto — você gasta mais rápido e o carro "puxa" para um lado. Vale checar a cada 6 meses."

---

### agressivo-para-acolhedor

**Sinais de texto agressivo demais:**
- Múltiplas exclamações seguidas (!!!)
- Palavras em CAPS LOCK excessivo
- "Não perca!", "Corra!", "Última chance!"
- Contagem regressiva forçada
- Pressão por escassez não verificável

**Como suavizar sem perder urgência:**
- "COMPRE AGORA!!!" → "Agende essa semana e garanta sua vaga"
- "Não perca essa oportunidade ÚNICA!" → "Oferta válida até [data] — aproveite enquanto tem vaga"
- "Corra antes que acabe!" → "As vagas são limitadas — garante a sua"
- "PREÇO IMPERDÍVEL" → "Condição especial — veja o quanto você economiza"

**Regra:** urgência real (data, vagas) é válida. Urgência artificial (ÚLTIMA CHANCE todo mês) desgasta a marca.

---

### generico-para-marca

**Checklist do que falta no texto genérico:**
- [ ] Nome da marca ausente ou incorreto
- [ ] Nenhum diferencial exclusivo mencionado
- [ ] Sem menção à Garantia BR Total
- [ ] Sem parcelamento em até 18x
- [ ] CTA genérico ("fale conosco") em vez de específico (WhatsApp, endereço)
- [ ] Poderia ser de qualquer oficina do Brasil

**O que adicionar para personalizar:**
1. Nome correto da marca (BR Pneus & Oficina) na primeira menção
2. Pelo menos 1 diferencial: preço, 18x, BR Total, maior mix
3. CTA específico com canal de contato real
4. Tagline "Muito mais que pneus" (opcional, mas reforça identidade)

---

### longo-para-curto

**Processo de condensação:**
1. Identificar a mensagem central (1 frase — o que o cliente precisa saber)
2. Identificar o diferencial principal (1 frase — por que a BR Pneus)
3. Identificar o CTA (1 frase — o que o cliente deve fazer)
4. Eliminar: repetições, rodeios, contexto desnecessário, explicações óbvias
5. Verificar: a mensagem condensada ainda tem nome da marca, diferencial e CTA?

**Referência de tamanhos por canal:**
| Canal | Tamanho ideal |
|-------|--------------|
| Post Instagram (legenda) | 150–250 palavras |
| Story | 1–2 frases visíveis |
| WhatsApp | Máx 3 parágrafos curtos |
| SMS | Máx 160 caracteres |
| Outdoor | Máx 7 palavras na headline |
| Google Ads (título) | Máx 30 caracteres |

---

### curto-para-completo

**O que adicionar a textos incompletos:**
1. **Contexto:** por que isso é relevante para o cliente agora?
2. **Diferencial:** o que torna a BR Pneus a escolha certa para isso?
3. **Prova:** dado, garantia, número que reforça credibilidade
4. **CTA:** o que o cliente deve fazer agora?

**Estrutura mínima de qualquer texto de marketing:**
```
[Gancho — conectar com a dor/desejo do cliente]
[Apresentação — o que a BR Pneus oferece]
[Diferencial — por que escolher a BR Pneus]
[CTA — próximo passo claro]
```

---

## Salvar em
`output/posts/adaptacao-tom-[transformacao]-[data].md`

---

## Referências Cruzadas
- Manual da marca: `agents/brand-guardian.md`
- Revisão completa: `/revisar-material`
- Banco de frases de referência: `/banco-textos-aprovados taglines`
