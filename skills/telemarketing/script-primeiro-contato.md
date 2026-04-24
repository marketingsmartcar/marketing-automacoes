# Skill: Script de Primeiro Contato

## Comando
`/script-primeiro-contato [origem-do-lead] [servico-de-interesse]`

## O que faz
Gera o roteiro completo para a primeira ligação com um lead novo que nunca teve contato com a BR Pneus & Oficina — com contexto para o operador, fluxo de conversa completo e bifurcações para as respostas mais prováveis do cliente.

---

## Parâmetros

| Parâmetro | Obrigatório | Opções |
|-----------|-------------|--------|
| `origem-do-lead` | Sim | `google-ads`, `meta-ads`, `site`, `whatsapp`, `indicacao`, `walk-in-phone` |
| `servico-de-interesse` | Sim | `pneus`, `revisao`, `alinhamento`, `troca-de-oleo`, `ar-condicionado`, `freios`, `geral` |

---

## Contexto por Origem (ler antes de ligar)

| Origem | Nível de Intenção | Janela para Ligar | O que provavelmente quer |
|--------|------------------|------------------|--------------------------|
| `google-ads` | 🔴 Alta — pesquisou ativamente | **Até 5 minutos** | Resolver agora — já está decidido, só escolhendo onde |
| `meta-ads` | 🟡 Média — viu o anúncio e se interessou | Até 30 minutos | Ainda avaliando se precisa — precisa ser convencido |
| `site` | 🟡 Média-alta — navegou e preencheu | Até 1 hora | Pesquisando — quer informação antes de decidir |
| `whatsapp` | 🔴 Alta — tomou iniciativa | **Imediatamente** | Quer resposta rápida — paciência baixa para demora |
| `indicacao` | 🟢 Alta com confiança | Até 2 horas | Já tem pré-disposição positiva — nome do indicador é ouro |
| `walk-in-phone` | 🔴 Altíssima | **Agora, está na linha** | Já ligou — ouvir e resolver |

**Persona mais provável por serviço:**
- Pneus → Carlos (econômico, olha preço) ou Roberto (frotista, olha agilidade)
- Revisão completa → Ana (mãe, olha segurança) ou Roberto
- Troca de óleo → Carlos (rotina, preço importa)
- Geral → qualquer persona — sondagem vai revelar

---

## Roteiro da Ligação

---

### ABERTURA — primeiros 20 segundos (DECISIVOS)

> Objetivo: criar conexão, verificar se é bom momento, gerar interesse

```
[sorriso na voz — sorrir fisicamente muda o tom]
[tom animado, não acelerado]

"Oi, [NOME]! Tudo bem? Aqui é o/a [OPERADOR], da BR Pneus & Oficina de [CIDADE]."

[Gancho por origem — usar o correspondente:]

[google-ads / site]:
"Vi que você demonstrou interesse em [SERVIÇO] aqui com a gente. 
Que bom que entrou em contato! Posso te ajudar com isso agora?"

[meta-ads]:
"Vi que você viu nossa oferta de [SERVIÇO] no Instagram/Facebook e demonstrou interesse.
Você está buscando isso pra o carro? [pausa breve]"

[whatsapp]:
"Você entrou em contato com a gente pelo WhatsApp perguntando sobre [SERVIÇO].
Queria te dar um retorno certinho! Tem um minutinho? [pausa]"

[indicacao]:
"O/A [NOME DO INDICADOR] falou muito bem de você e sugeriu que eu entrasse em contato.
Você está precisando de algum serviço pro carro? [pausa]"

[walk-in-phone]:
"Você ligou pra cá agora! Como posso te ajudar? [pausa — ESCUTAR]"
```

---

### BIFURCAÇÃO 1 — resposta do cliente na abertura

**✅ "Sim, pode falar" / "Tô precisando de..."**
→ Ir direto para **SONDAGEM**

**🕐 "Agora não é bom momento"**
```
"Sem problema! Qual o melhor horário pra eu te retornar?
Manhã ou tarde? [anotar horário específico]
Pode deixar, te ligo no horário certinho. Obrigado, [NOME]! Até mais!"
[Registrar no CRM com horário para retorno]
```

**🤔 "Quero só um orçamento"**
```
"Claro! Pra te passar o valor mais preciso, preciso de umas informações rapidinhas.
Me fala: qual o modelo e ano do seu carro?"
[→ ir para SONDAGEM — mesmo fluxo, mas com foco no preço]
```

**❌ "Não tenho interesse"**
→ Ir para **ENCERRAMENTO ELEGANTE**

---

### SONDAGEM — 1 a 2 minutos

> Objetivo: entender a necessidade real antes de oferecer qualquer coisa

```
"Pra eu te ajudar da melhor forma, posso te fazer umas perguntinhas rápidas?"

[pausa — esperar confirmação]
```

**Perguntas essenciais (adaptar por serviço):**

**Para QUALQUER serviço — sempre perguntar:**
1. `"Qual o modelo e ano do seu carro?"` → [anotar]
2. `"Você já sabe exatamente o que precisa ou quer que a gente dê uma olhada?"` → [anotar]
3. `"Tem alguma urgência ou pode ser essa semana?"` → [anotar — determina velocidade do fechamento]

**Específicas por serviço:**

| Serviço | Perguntas específicas |
|---------|----------------------|
| Pneus | "Sabe o aro do seu pneu?" / "Tem preferência de marca ou quer nossa recomendação?" / "É pra um pneu só ou o jogo?" |
| Revisão | "Faz quanto tempo que não faz revisão?" / "Tá sentindo alguma coisa diferente no carro?" / "Tem alguma luz acesa no painel?" |
| Alinhamento | "O carro tá puxando pra algum lado?" / "Quando foi o último alinhamento?" |
| Troca de óleo | "Sabe quando foi a última troca?" / "Qual tipo de óleo usa normalmente — mineral ou sintético?" |
| Freios | "O freio tá fazendo algum barulho?" / "Tá demorando mais pra freiar?" |
| Geral | "O que mais tá te preocupando no carro agora?" / "Tem alguma coisa que você já sabia que precisava fazer?" |

---

### BIFURCAÇÃO 2 — sinal do cliente na sondagem

**Sabe exatamente o que quer**
→ Pular perguntas desnecessárias, ir direto para **OFERTA**

**Não sabe / quer avaliação**
```
"Entendo! Nesse caso, o ideal é a gente fazer um diagnóstico rápido no seu carro.
A nossa equipe dá uma olhada e te fala exatamente o que precisa — sem compromisso de fazer tudo na hora.
Faz sentido pra você?"
→ ir para OFERTA com ênfase em diagnóstico
```

**Está pesquisando preço / comparando**
```
"Faz sentido comparar! Posso te passar uma estimativa pra você ter uma referência.
[após sondagem] → ir para OFERTA com foco em diferencial e condição
```

---

### OFERTA — 1 minuto

> Objetivo: apresentar a solução conectada ao que foi sondado — personalizada, não genérica

```
[tom confiante, não vendedor]

"Legal, [NOME]! Com base no que você me falou, o ideal seria [RECOMENDAÇÃO ESPECÍFICA].

Aqui na BR Pneus & Oficina de [CIDADE]:
```

**Escolher o diferencial mais relevante ao perfil sondado:**

| Se o cliente valoriza... | Usar este argumento |
|--------------------------|---------------------|
| Preço / parcela | "A gente tem os melhores preços da região — compramos direto dos fornecedores. E parcela em até 18x sem juros." |
| Segurança / garantia | "Tudo que a gente faz tem Garantia BR Total de 1 ano — tanto o produto quanto o serviço." |
| Praticidade / tempo | "O serviço é rápido — [ESTIMATIVA DE TEMPO] — e você agenda o horário que melhor encaixar na sua agenda." |
| Confiança / qualidade | "Nossa equipe é treinada e todos os serviços têm Garantia BR Total. Você sai daqui sabendo que tá em dia." |

```
[pausa de 2-3 segundos — deixar o cliente reagir]

"Quer que eu veja os melhores horários pra você essa semana?"
```

---

### AGENDAMENTO — 30 segundos

> Regra de ouro: **SEMPRE oferecer 2 opções** — nunca perguntar "quando quer vir?" em aberto

```
"Tenho disponibilidade [OPÇÃO 1 — ex: terça de manhã] ou [OPÇÃO 2 — ex: quinta à tarde].
Qual fica melhor pra você?"

[esperar resposta — não falar mais]

[Após confirmar:]
"Perfeito! Agendado pra [DIA] às [HORA] na BR Pneus de [CIDADE], na [ENDEREÇO CURTO].

Vou te mandar uma mensagenzinha no WhatsApp confirmando, tá bom?
Qualquer coisa, é só responder lá que a gente te atende.

[se serviço leva mais de 1h]:
Só te avisando que o serviço leva em torno de [TEMPO] — assim você já se organiza.

Foi um prazer, [NOME]! Te espero [DIA]. Tchau!"
```

---

### BIFURCAÇÃO 3 — reações ao agendamento

**"Vou pensar / não sei ainda"**
```
"Claro, [NOME], sem pressa! 
Uma coisa só pra você ter em mente: [argumento relevante ao que foi sondado — ex: pneu desgastado / carro sem revisão há X tempo].
Se precisar de alguma informação a mais, pode me chamar no WhatsApp.
Posso te mandar o contato?"
[→ enviar WhatsApp e reagendar para follow-up em 48h]
```

**"Não quero agendar agora"**
→ ir para **ENCERRAMENTO ELEGANTE**

---

### ENCERRAMENTO ELEGANTE

> Para quando o cliente definitivamente não quer agendar — sair bem para não fechar a porta

```
[tom compreensivo, sem frustração]

"Tudo certo, [NOME]! Sem compromisso nenhum.
Se um dia precisar, pode contar com a gente — é só ligar no 0800 942 4402 
ou chamar no WhatsApp de [CIDADE]: [NÚMERO].

Tenha um ótimo dia!"

[NÃO tentar mais uma oferta — já disse não]
[Registrar no CRM: "não tem interesse no momento" — retomar em 60 dias]
```

---

## Notas Pós-Ligação (registrar no CRM imediatamente)

- [ ] Nome completo e telefone confirmados
- [ ] Modelo e ano do veículo
- [ ] Serviço de interesse
- [ ] Resultado: agendou / quer retorno / sem interesse / não atendeu
- [ ] Se agendou: enviar confirmação por WhatsApp em até 5 minutos
- [ ] Horário e motivo se pediu para religar
- [ ] Observações do tom da conversa (cliente receptivo / resistente / com pressa)

---

## Salvar em
`output/scripts/primeiro-contato-[origem]-[servico]-[data].md`

---

## Referências Cruzadas
- Tom de voz da marca: `CLAUDE.md`
- Perfil das personas: `knowledge/personas.md`
- Objeções na sondagem/oferta: `/script-objecoes`
- Se não agendou: `/script-followup segunda-tentativa`
- Confirmação pré-visita: `/script-confirmacao vespera`
