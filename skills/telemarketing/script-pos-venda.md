# Skill: Script de Pós-Venda

## Comando
`/script-pos-venda [servico-realizado] [objetivo]`

## O que faz
Gera roteiro de contato pós-serviço para pesquisa de satisfação, pedido de avaliação no Google e oportunidade de cross-sell educativo — transformando cada visita em um ponto de reconexão e fidelização.

---

## Parâmetros

| Parâmetro | Obrigatório | Opções |
|-----------|-------------|--------|
| `servico-realizado` | Sim | `pneus`, `revisao`, `troca-de-oleo`, `alinhamento`, `freios`, `ar-condicionado`, `suspensao`, `correia-dentada`, `embreagem`, `injecao`, `geral` |
| `objetivo` | Sim | `satisfacao`, `cross-sell`, `avaliacao-google`, `completo` |

---

## Quando Ligar

| Serviço | Momento ideal | Motivo |
|---------|--------------|--------|
| Pneus | 3-5 dias depois | Cliente já rodou com os pneus novos — tem opinião formada |
| Troca de óleo | 5-7 dias depois | Longe o suficiente para notar diferença no motor |
| Alinhamento | 2-3 dias depois | Já sentiu a diferença (ou o problema) na direção |
| Revisão completa | 7 dias depois | Tempo para processar a experiência como um todo |
| Freios / Suspensão / Correia | 5-7 dias depois | Segurança — confirmar que tudo está bem |
| Ar-condicionado | 3 dias depois | Se tinha cheiro ou problema, já apareceu |
| Injeção / Embreagem | 7 dias depois | Serviços complexos — dar tempo para notar resultado |

**REGRA:** Nunca ligar no mesmo dia — parece cobrador, não parceiro.

---

## OBJETIVO: SATISFAÇÃO — Pesquisa NPS

> Tom: genuinamente curioso, sem roteiro robotizado

```
[sorriso na voz — ligação deve soar como check-in de um amigo]

"Oi, [NOME]! Aqui é o/a [OPERADOR] da BR Pneus & Oficina de [CIDADE].
Você fez [SERVIÇO] aqui com a gente há uns dias —
queria saber rapidinho como ficou. Tem 1 minutinho? [pausa]"

[Se sim:]
"Ótimo! Simples assim: de 0 a 10, qual nota você daria
para a sua experiência aqui na BR Pneus? [pausa — escutar]"
```

**TABULAÇÃO DA NOTA:**

**9-10 (Promotor):**
```
"Que ótimo! Fico muito feliz em ouvir isso.
[NOME], você toparia compartilhar isso numa avaliação rápida no Google?
Leva uns 30 segundos e ajuda muito outras pessoas a encontrarem a gente.
[Se sim:] → ir para PEDIDO DE AVALIAÇÃO GOOGLE
[Se não quiser:] 'Sem problema! Já ajuda muito saber que ficou satisfeito.
Qualquer coisa que precisar, pode contar com a gente. Obrigado, [NOME]!'"
```

**7-8 (Neutro):**
```
"Que bom! Tem alguma coisa que a gente poderia ter feito melhor
para você dar um 10 na próxima vez? [pausa — escutar com atenção]"

[Anotar o feedback — não se defender]

"Obrigado por ser honesto, [NOME]. Esse tipo de feedback
é exatamente o que a gente precisa para melhorar.
Vou registrar aqui com a equipe. Pode contar que vamos levar a sério."

[Se mencionar algo resolvível:]
"Aliás, isso que você mencionou — posso verificar com a equipe
e te dou um retorno até [DATA]. Tudo bem?"
```

**0-6 (Detrator):**
```
[PARAR TUDO — tom sério, empático, foco total no cliente]

"[NOME], muito obrigado por me dizer isso.
Me desculpa pela experiência que você teve — não é o padrão que a gente quer oferecer.
Você pode me contar o que aconteceu? Quero entender exatamente. [pausa longa — não interromper]"

[Escutar completamente — anotar tudo]

"Entendo. Isso não deveria ter acontecido.
Vou levar isso diretamente para o gerente de [CIDADE] — [NOME DO GERENTE] — e
garantir que ele entre em contato com você pessoalmente hoje.

Você aceita que ele te ligue para resolver isso da melhor forma?"

[Se aceitar:] → Escalar para gerente imediatamente — registrar no CRM como URGENTE
[Se não aceitar:] → Registrar detalhadamente + acompanhar por email/WhatsApp
→ Não encerrar sem proposta de solução concreta
```

---

## OBJETIVO: AVALIAÇÃO GOOGLE

> Usar apenas com clientes que espontaneamente deram nota 9-10 ou demonstraram satisfação

```
[tom entusiasmado, nunca forçado]

"[NOME], você tem 30 segundinhos pra fazer uma coisa muito importante pra gente?
[pausa]

A nossa avaliação no Google ajuda muitas pessoas da [CIDADE] a encontrarem
um lugar de confiança pra cuidar do carro.
Se você topasse deixar um comentário rápido sobre a sua experiência aqui,
ia significar muito pra gente.

Posso te mandar o link direto no WhatsApp? Fica bem fácil — é só clicar e escrever
o que você sentiu. [pausa]"

[Se aceitar:]
"Mandando agora! É só clicar no link, dar uma nota de 1 a 5 estrelas
e escrever qualquer coisa — mesmo que curto, já ajuda muito.
Muito obrigado, [NOME]! Você é parte do sucesso da gente."

[Enviar via WhatsApp:]
"Oi, [NOME]! Obrigado por topar ajudar a gente 😊
Aqui está o link direto para avaliar a BR Pneus & Oficina [CIDADE] no Google:
[LINK DA UNIDADE]
Qualquer dúvida, é só falar. Obrigado!"

[Se não aceitar:]
"Sem problema nenhum! Já ajuda muito saber que ficou satisfeito.
Se um dia tiver uns minutinhos e quiser fazer, o link fica disponível quando quiser.
Obrigado, [NOME]!"
```

---

## OBJETIVO: CROSS-SELL

> Abordagem EDUCATIVA — nunca vendedora. A recomendação deve parecer cuidado, não pressão.

---

### Matriz de Cross-sell por Serviço Realizado

| Serviço Realizado | Próximo Serviço Natural | Gatilho Educativo | Prazo Sugerido |
|-------------------|------------------------|-------------------|----------------|
| Pneus (4 pneus) | Alinhamento + balanceamento | "Pneu novo sem alinhamento desgasta rápido" | Imediato / logo |
| Pneus (1-2 pneus) | Revisão de freios | "Pneu novo amplifica problemas de frenagem" | 30 dias |
| Troca de óleo | Filtro de ar + filtro de combustível | "Trocam juntos — economia de mão de obra" | Mesmo serviço |
| Alinhamento | Balanceamento (se não fez) | "Alinhamento sem balanceamento → vibração" | Imediato |
| Alinhamento | Revisão de suspensão | "Alinhamento que não segura = suspensão desgastada" | 60-90 dias |
| Revisão geral | Check-up em 6 meses | "Revisão completa → check-up de acompanhamento" | 6 meses |
| Freios | Fluido de freio | "Fluido de freio se degrada — troca a cada 2 anos" | 30-60 dias |
| Ar-condicionado | Higienização | "Após recarga, higienização mantém o ar limpo" | 30 dias |
| Suspensão | Alinhamento | "Suspensão nova exige realinhamento imediato" | Imediato |
| Correia dentada | Bomba d'água | "Trocam juntas — peça e mão de obra economizadas" | Mesmo serviço |
| Injeção / Bicos | Troca de filtro combustível | "Bico limpo + filtro novo = resultado duradouro" | Mesmo serviço |

---

### Roteiro de Cross-sell por Contexto

**Quando a recomendação é imediata (fazer junto ou logo após):**
```
[tom de parceiro, não de vendedor]

"[NOME], queria te dar um recado importante sobre o [SERVIÇO REALIZADO] que você fez.
É uma dica que a gente sempre passa pra garantir que o resultado dure mais.

[INSERIR GATILHO EDUCATIVO DA TABELA ACIMA]

Você chegou a fazer o [PRÓXIMO SERVIÇO] quando veio aqui? [pausa]"

[Se não fez:]
"A gente consegue encaixar isso numa visita rápida —
leva em torno de [TEMPO]. Quer que eu veja um horário essa semana?"

[Se fez em outro lugar:]
"Ótimo! É importante mesmo. Qualquer coisa, pode contar com a gente."
```

**Quando a recomendação é para daqui a semanas/meses:**
```
"[NOME], só queria te avisar de algo que vale colocar no radar
quando o [PRAZO] chegar.

[INSERIR GATILHO EDUCATIVO]

Não é urgente agora — mas quando chegar nessa época,
vale lembrar de trazer o carro pra gente dar uma olhada.
Posso te mandar um lembrete no WhatsApp lá na frente?"

[Se aceitar:]
"Perfeito! Vou colocar aqui pra te avisar em [MÊS/DATA].
Obrigado, [NOME]! Qualquer coisa, pode contar com a gente."
```

**Se o cliente perguntar o preço na hora:**
```
"Depende do modelo do seu carro e do que a gente vai encontrar —
mas posso te passar uma estimativa se quiser.
Tem o modelo e ano em mão?"

→ [Se sim: fazer estimativa ou agendar diagnóstico]
→ [Se não: "Sem problema! Quando você vier, a gente faz uma avaliação rápida
e já passa o valor antes de começar qualquer coisa."]
```

---

## OBJETIVO: COMPLETO (Satisfação + Cross-sell + Google)

> Sequência recomendada para serviços de alto valor (revisão, pneus, correia, freios)

```
PARTE 1 — Satisfação (2 minutos)
[→ seguir roteiro de SATISFAÇÃO]

[Se nota 9-10: ir para PARTE 2]
[Se nota 7-8: responder ao feedback → ir para PARTE 2 se clima permitir]
[Se nota 0-6: PARAR — escalar para gerente. Não tentar cross-sell nem pedir avaliação]

---

PARTE 2 — Cross-sell (1-2 minutos)
[→ seguir roteiro de CROSS-SELL por serviço realizado]

---

PARTE 3 — Avaliação Google (30 segundos)
[→ seguir roteiro de AVALIAÇÃO GOOGLE]
[Só executar se o cliente estiver positivo e receptivo]
```

> **Regra de ouro:** Nunca fazer cross-sell com cliente insatisfeito. Nunca pedir avaliação com nota abaixo de 9.

---

## Respostas para Situações Específicas

**"O carro voltou a fazer [BARULHO / PROBLEMA]"**
```
[tom urgente e empático]

"[NOME], obrigado por me avisar imediatamente!
Isso não deveria estar acontecendo — e a gente tem responsabilidade sobre isso.

Vou verificar com a equipe técnica agora mesmo
e te ligo de volta em até [1-2 horas] com uma resposta.

Se preferir, pode trazer o carro hoje que a equipe dá prioridade.
O que funciona melhor pra você?"

[Registrar como URGENTE no CRM + avisar gerente/técnico responsável]
```

**"Achei que o serviço estava caro"**
```
[tom tranquilo, sem se defender]

"Entendo, [NOME]. Preço é sempre um ponto importante.
Posso te perguntar: você chegou a comparar com algum outro lugar
antes de vir pra cá?"

[Se comparou e achou mais caro:]
"Pode ser que em outros lugares o preço seja menor —
mas a gente inclui [GARANTIA BR TOTAL / SERVIÇO INCLUÍDO] que
normalmente gera custo adicional em outros lugares.
De qualquer forma, o seu feedback é muito valioso.
Vou registrar aqui."

[Se não comparou:]
"Faz sentido! Se quiser comparar da próxima vez,
pode ligar antes que a gente passa uma estimativa honesta.
Obrigado por ser transparente, [NOME]!"
```

**"Vou indicar para amigos"**
```
[tom animado e sincero]

"Nossa, [NOME]! Isso é o melhor elogio que a gente pode receber.
Obrigado de verdade!

Se quiser, quando seu amigo vier, fala o nome dele
que a gente registra a indicação — e tem uma condição especial
pra quem vem por indicação.

Muito obrigado pela confiança, [NOME]!"
```

---

## Notas Pós-Ligação (registrar no CRM imediatamente)

- [ ] Nota NPS: [0-10]
- [ ] Classificação: Promotor / Neutro / Detrator
- [ ] Feedback qualitativo (anotar literalmente — não resumir)
- [ ] Avaliação Google: aceitou / não aceitou / link enviado
- [ ] Cross-sell apresentado: [QUAL]
- [ ] Resultado cross-sell: agendou / vai pensar / não tem interesse
- [ ] Escalonamento necessário: sim (motivo) / não
- [ ] Próximo contato: [DATA + MOTIVO]

---

## Salvar em
`output/scripts/pos-venda-[servico]-[objetivo]-[data].md`

---

## Referências Cruzadas
- Objeções durante o cross-sell: `/script-objecoes necessidade`
- Se surgir reclamação grave: `agents/brand-guardian.md` → seção de crise
- Follow-up após aceitar pensar no cross-sell: `/script-followup segunda-tentativa disse-que-ia-pensar`
- Envio de link Google via WhatsApp: `skills/crm-email/whatsapp-template.md` → tipo `avaliacao-google`
- Treinamento de empatia para ligações pós-venda: `/treinamento-televendas empatia-rapport`
