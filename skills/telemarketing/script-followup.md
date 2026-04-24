# Skill: Script de Follow-up

## Comando
`/script-followup [tentativa] [contexto-anterior]`

## O que faz
Gera roteiros para ligações de acompanhamento de leads que foram contatados mas não agendaram — com abordagem diferente para cada tentativa e contexto, evitando soar insistente ou repetitivo.

---

## Parâmetros

| Parâmetro | Obrigatório | Opções |
|-----------|-------------|--------|
| `tentativa` | Sim | `segunda-tentativa`, `terceira-tentativa`, `retomada` |
| `contexto-anterior` | Sim | `nao-atendeu`, `pediu-para-ligar-depois`, `disse-que-ia-pensar`, `achou-caro`, `vai-pesquisar`, `nao-tem-tempo` |

---

## Regras Fundamentais do Follow-up

| Tentativa | Tom | Objetivo | Se não funcionar |
|-----------|-----|---------|-----------------|
| 2ª tentativa | Leve reconexão | Reengajar, oferecer nova perspectiva | Ir para 3ª |
| 3ª tentativa | Encerramento com porta aberta | Deixar impressão positiva + contato | Parar de ligar |
| Retomada (após pausa) | Quase primeiro contato | Reapresentar sem soar insistente | Avaliar se vale continuar |

**REGRA DE OURO:** Após 3 tentativas sem sucesso → PARAR de ligar.
Mover para fluxo de nutrição por email/WhatsApp (skill `/email-reativacao` do CRM Lifecycle).
Retomar ligação apenas com gatilho real: promoção específica, sazonalidade ou nova informação.

---

## Roteiros por Tentativa e Contexto

---

### SEGUNDA TENTATIVA

---

**Contexto: não-atendeu**

> O que está por trás: cliente pode não ter reconhecido o número, pode ter esquecido ou estar ocupado.
> O que NÃO fazer: não começar com "tô ligando de novo porque..." (soa cobrador)

```
[tom leve, não cobrador]

"Oi, [NOME]! Aqui é o/a [OPERADOR] da BR Pneus & Oficina de [CIDADE].
Tentei entrar em contato [ontem/semana passada] e não consegui te pegar.
Tô ligando num momento melhor agora? [pausa — esperar]"

[Se atendeu e é bom momento:]
→ Ir para sondagem/oferta (não reapresentar tudo — ir direto ao ponto)
"Você tinha demonstrado interesse em [SERVIÇO]. Ainda faz sentido pra você?"

[Se não é bom momento:]
"Sem problema! Qual horário é melhor pra te ligar?
[anotar horário específico — não "qualquer hora"]
Obrigado, [NOME]! Até logo."

[Se não atendeu novamente:]
→ WhatsApp personalizado em até 1 hora (ver template abaixo)
→ Registrar no CRM → agendar 3ª tentativa
```

**WhatsApp após não atender:**
```
"Oi, [NOME]! Aqui é [OPERADOR] da BR Pneus [CIDADE]. 
Tentei te ligar sobre [SERVIÇO] e não consegui.
Quando puder conversar, me chama aqui ou ligo no horário que preferir 😊
[NÚMERO COM DDD]"
```

---

**Contexto: pediu-para-ligar-depois**

> O que está por trás: cliente genuinamente tinha algo, ou pediu pra se livrar. A ligação agora vai revelar qual.
> O que NÃO fazer: recomeçar do zero como se nunca tivesse falado.

```
[tom natural, como retornando a um amigo]

"Oi, [NOME]! [OPERADOR] da BR Pneus.
Você me pediu pra retornar sobre [SERVIÇO] — fiz isso certinho! 
Agora é um bom momento pra gente conversar? [pausa]"

[Se sim:]
"Ótimo! Você ainda está precisando de [SERVIÇO]?"
→ Se sim: ir para OFERTA e AGENDAMENTO diretamente
→ Se mudou de contexto: nova sondagem rápida

[Se pedir para ligar depois novamente:]
[tom gentil, sem julgamento]
"Entendo, [NOME]! Pra não te incomodar, qual seria o melhor dia da semana pra você?
[anotar dia específico]
Agendado. Obrigado pela atenção!"
```

---

**Contexto: disse-que-ia-pensar**

> O que está por trás: precisa de mais informação, tem dúvida não falada, ou quer validar com alguém.
> O que NÃO fazer: repetir a mesma oferta da última vez.

```
[tom curioso, não pressão]

"Oi, [NOME]! [OPERADOR] da BR Pneus.
Na nossa última conversa você ficou de pensar sobre [SERVIÇO].
Surgiu alguma dúvida que eu possa te ajudar a esclarecer? [pausa longa — deixar falar]"

[Se tem dúvida real:] 
→ Responder a dúvida → ir para AGENDAMENTO

[Se continua "pensando":] 
"Faz sentido! [NOME], só uma coisa que pode te ajudar a decidir:
[DADO NOVO — ex: 'essa semana a gente tem mais disponibilidade de horário' 
ou 'temos uma condição especial válida até sexta']
Isso ajuda? Quer que eu veja um horário?"

[Se não quer mais:] 
→ ENCERRAMENTO ELEGANTE
```

---

**Contexto: achou-caro**

> O que está por trás: pode ser realmente fora do orçamento OU não entendeu o valor incluído.
> O que NÃO fazer: dar desconto imediatamente (desvaloriza o serviço e a marca).

```
[tom consultivo, não defensivo]

"Oi, [NOME]! [OPERADOR] da BR Pneus aqui.
Lembrei da nossa conversa e fiquei pensando numa coisa que pode fazer sentido pra você.
Tem um minutinho? [pausa]"

[Se sim:]
"Na nossa conversa sobre [SERVIÇO], você mencionou o preço.
Queria te fazer uma pergunta: o que você estava comparando — só o valor do serviço, 
ou incluindo a garantia e os serviços que acompanham?

Na BR Pneus, [SERVIÇO] já inclui [LISTA DO QUE ESTÁ INCLUSO + GARANTIA BR TOTAL].
Se comparar o pacote completo, normalmente sai mais em conta.

E se ajudar no planejamento, parcela em até 18x — fica em [SIMULAÇÃO SE POSSÍVEL].
Faz sentido reconsiderar?"
```

---

**Contexto: vai-pesquisar**

> O que está por trás: está avaliando concorrência — já decidiu que precisa do serviço.
> Oportunidade: ele já é um cliente quente, só está escolhendo onde.

```
[tom confiante, sem pressa]

"Oi, [NOME]! [OPERADOR] da BR Pneus.
Você tinha dito que ia pesquisar sobre [SERVIÇO]. Já teve a chance? [pausa]"

[Se ainda pesquisando / não decidiu:]
"Faz sentido comparar! Só queria garantir que você tem as informações certas da nossa parte.

Na BR Pneus: [DIFERENCIAL MAIS RELEVANTE].
E a gente tem Garantia BR Total de 1 ano — se aparecer qualquer problema, a gente resolve.

Se você conseguir uma condição melhor em outro lugar, traz pra gente — a gente tenta igualar.
Quer que eu reserva um horário provisório enquanto você decide?"

[Se foi para concorrente:]
[tom tranquilo, sem confronto]
"Que bom que resolveu! Se por algum motivo a experiência não for como esperava,
pode contar com a gente — porta sempre aberta. 
Obrigado, [NOME]! Tenha um bom dia."
```

---

**Contexto: nao-tem-tempo**

> O que está por trás: realmente ocupado OU usando como desculpa educada.
> O objetivo: não pressionar, mas mostrar que é mais rápido do que ele imagina.

```
[tom ágil, respeitando o tempo dele]

"Oi, [NOME]! [OPERADOR] da BR Pneus. Sei que você tá corrido —
vou ser super rápido, prometo: 30 segundos. Pode ser? [pausa]"

[Se sim:]
"Você havia demonstrado interesse em [SERVIÇO].
A gente faz em [TEMPO ESTIMADO] — você pode deixar o carro de manhã e pegar na hora do almoço.
Nessa semana tem [DISPONIBILIDADE].
Faz sentido encaixar? [pausa]"

[Se não tem mesmo:]
"Entendo! Qual seria a semana ideal pra você pensar nisso com mais calma?
[anotar semana] — te ligo lá. Valeu pelo tempo, [NOME]!"
```

---

### TERCEIRA TENTATIVA (última antes de pausar)

> Tom: encerrar bem, deixar porta aberta, nunca soar frustrated ou insistente.

```
[tom tranquilo, sem expectativa de venda]

"Oi, [NOME]! [OPERADOR] da BR Pneus.
Sei que já tentei entrar em contato algumas vezes e não quero incomodar.
Só liguei pra garantir que você tem nosso contato caso precise no futuro.

Posso te mandar nosso WhatsApp pra você salvar? Assim, quando precisar de [SERVIÇO],
é só chamar a qualquer momento — sem precisar pesquisar. [pausa]"

[Se aceitar:]
"Mandando agora: [NÚMERO]. É o WhatsApp da nossa unidade de [CIDADE].
Foi um prazer, [NOME]! Qualquer coisa, estamos por aqui."

[Se não aceitar:]
"Entendido! Nos encontramos quando precisar. Obrigado, [NOME], e tenha um ótimo dia!"

[Registrar no CRM: "3 tentativas — pausar ligações — mover para fluxo de email/WhatsApp"]
```

---

### RETOMADA (após pausa — 30+ dias sem contato)

> Abordar como se fosse quase um primeiro contato, mas reconhecer o histórico brevemente.

```
[tom renovado, não cobrador]

"Oi, [NOME]! Tudo bem? Aqui é o/a [OPERADOR] da BR Pneus & Oficina de [CIDADE].
A gente tinha conversado um tempo atrás sobre [SERVIÇO].
Sei que ficou pra um outro momento — queria saber se surgiu uma oportunidade pra você. [pausa]"

[Se há abertura:]
→ Retomar como novo primeiro contato — sondagem breve e ir para oferta

[Se não tem interesse:]
→ ENCERRAMENTO ELEGANTE

[Gatilhos que justificam a retomada:]
- Promoção específica acontecendo agora
- Sazonalidade (férias de julho, Black Friday, início das chuvas)
- Novo serviço disponível na unidade
- Passou tempo suficiente (6 meses) para a necessidade ser real novamente
```

---

## Notas Pós-Follow-up

- [ ] Atualizar CRM: resultado da tentativa, próximo passo, data
- [ ] Se 3ª tentativa sem sucesso: marcar como "nutrição" — passar para email/WhatsApp automático
- [ ] Se cliente pediu para não ligar mais: respeitar imediatamente, marcar como opt-out
- [ ] Nunca deixar sem registro — follow-ups sem registro se perdem

---

## Salvar em
`output/scripts/followup-[tentativa]-[contexto]-[data].md`

---

## Referências Cruzadas
- Para leads que nunca atenderam: `/script-primeiro-contato` (referência de sondagem)
- Objeções específicas: `/script-objecoes [objecao]`
- Fluxo de nutrição pós-3-tentativas: `skills/crm-email/email-reativacao.md`
- Personas: `knowledge/personas.md`
