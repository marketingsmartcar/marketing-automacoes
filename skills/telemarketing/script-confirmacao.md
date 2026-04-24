# Skill: Script de Confirmação de Agendamento

## Comando
`/script-confirmacao [antecedencia]`

## O que faz
Gera roteiros e templates para confirmação de serviços agendados — reduzindo no-shows e facilitando reagendamentos de forma positiva, sem pressão.

---

## Parâmetros

| Parâmetro | Obrigatório | Opções |
|-----------|-------------|--------|
| `antecedencia` | Sim | `vespera`, `mesmo-dia`, `whatsapp-automatico` |

---

## Por que a Confirmação é Tão Importante

| Ação | Impacto no No-show |
|------|--------------------|
| Nenhuma confirmação | Base: 30-40% de no-show |
| Ligação na véspera | Reduz ~25-30pp |
| WhatsApp no mesmo dia | Reduz mais ~10-15pp |
| Ambos combinados | No-show abaixo de 10% |

**A confirmação não é burocracia — é a segunda venda.** O cliente agendou no entusiasmo da ligação. A confirmação reforça o compromisso e remove o atrito de aparecer.

---

## Roteiro: VÉSPERA (ligação 24h antes)

> Tom: animado e prestativo — o cliente vai ser bem recebido amanhã

```
[sorriso na voz, tom breve e animado]

"Oi, [NOME]! Aqui é o/a [OPERADOR] da BR Pneus & Oficina de [CIDADE].
Tô ligando rapidinho pra confirmar seu [SERVIÇO] de amanhã às [HORA].
Tá tudo certo pra você aparecer? [pausa — esperar confirmação]"
```

**✅ SE CONFIRMA:**
```
"Ótimo, [NOME]! Já tô anotando sua confirmação.

Só pra facilitar:
📍 A gente fica em [ENDEREÇO] — perto de [REFERÊNCIA, se houver]
🕐 Seu horário é [HORA] — pode chegar 5 minutinhos antes se quiser
⏱️ O serviço leva em torno de [TEMPO ESTIMADO]
🅿️ Estacionamento: [tem gratuito / pode deixar o carro aqui / orientação]

Se precisar de qualquer coisa antes, é só responder no WhatsApp.
Te esperamos amanhã, [NOME]! Até lá 😊"
```

**🔄 SE PRECISA REAGENDAR:**
```
[tom compreensivo, sem que o cliente se sinta culpado]
"Sem problema, [NOME]! Essas coisas acontecem.
Vamos achar outro horário que encaixe melhor?

Tenho disponibilidade [OPÇÃO 1] ou [OPÇÃO 2].
Qual fica melhor?"

[Após confirmar novo horário:]
"Perfeito! Reagendado pra [DIA] às [HORA].
Vou mandar uma confirmação no WhatsApp agora. Obrigado, [NOME]!
Te espero [DIA] 😊"

[Registrar no CRM: motivo do reagendamento + novo horário]
```

**❌ SE CANCELA:**
```
[tom gentil — nunca cobrar, nunca fazer o cliente sentir culpa]
"Entendo, [NOME]! Não tem problema.
Se quiser agendar de novo quando tiver uma oportunidade melhor,
pode chamar direto no nosso WhatsApp: [NÚMERO].
Estamos sempre por aqui. Tenha um ótimo dia!"

[Registrar no CRM: motivo do cancelamento se informou + agendar follow-up para 7-10 dias]
```

**📵 SE NÃO ATENDE:**
```
→ Deixar caixa postal (se disponível):
"Oi, [NOME]! Aqui é [OPERADOR] da BR Pneus [CIDADE].
Liguei pra confirmar seu [SERVIÇO] de amanhã às [HORA].
Se precisar alterar, é só me ligar ou responder no WhatsApp. Até amanhã!"

→ Enviar WhatsApp imediatamente (usar template de véspera abaixo)
```

---

## Roteiro: MESMO DIA (ligação 2-3h antes)

> Tom: mais direto — cliente está na rotina do dia, ligação deve ser breve

```
[tom direto e animado]

"Oi, [NOME]! [OPERADOR] da BR Pneus de [CIDADE].
Daqui a [2-3 horas] é seu horário aqui com a gente — [SERVIÇO] às [HORA].
Tá vindo? [pausa]"
```

**✅ Confirmou:**
```
"Ótimo! Te esperamos às [HORA] na [ENDEREÇO CURTO]. 
Qualquer coisa, responde no WhatsApp. Até já!"
```

**🔄 Precisa de mais tempo / vai atrasar:**
```
"Tranquilo! Pode ir até [HORA LIMITE] — se atrasar muito, me avisa que a gente ajusta.
Até daqui a pouco!"
```

**❌ Cancela / não vai mais:**
```
"Tudo certo, [NOME]! Liberamos o horário.
Se quiser agendar de novo, é só chamar no WhatsApp.
Obrigado por avisar!"

[Registrar + agendar contato para 5 dias depois]
```

---

## Templates: WHATSAPP AUTOMÁTICO

> Para envio automático via ferramenta de automação (CRM, ChatBot, WhatsApp API)

---

**Template 1 — Confirmação 24h antes:**

```
Oi, {{nome}}! 😊 Aqui é a equipe BR Pneus & Oficina {{unidade}}.

Passando pra confirmar seu agendamento de amanhã:

🔧 Serviço: {{servico}}
📅 Data: {{data}}
🕐 Horário: {{hora}}
📍 Endereço: {{endereco}}
⏱️ Tempo estimado: {{tempo_estimado}}

Tudo certo? Responde aqui:
✅ *1* — Confirmado, estarei lá!
🔄 *2* — Preciso reagendar
❌ *3* — Preciso cancelar

Qualquer dúvida, é só falar! Te esperamos 🚗
```

**Template 2 — Lembrete no mesmo dia (2h antes):**

```
Oi, {{nome}}! Seu horário na BR Pneus está chegando 🚗

🕐 Daqui a pouco: {{servico}} às {{hora}}
📍 {{endereco}}

Te esperamos! Qualquer imprevisto, responde aqui.
```

**Template 3 — Confirmação para serviços de mais de 1h (aviso antecipado):**

```
Oi, {{nome}}! BR Pneus {{unidade}} aqui 😊

Confirmando seu {{servico}} amanhã, {{data}} às {{hora}}.

ℹ️ Lembretes importantes:
• O serviço leva em torno de {{tempo_estimado}}
• Você pode deixar o carro conosco e buscar depois
• Temos {{estrutura_loja}} enquanto aguarda
• {{informacao_adicional_se_houver}}

Tá tudo certo? Responde 1 pra confirmar ou 2 pra reagendar.

Até amanhã! 🚗
```

---

## Estratégia Anti No-Show

**Sequência ideal por tipo de serviço:**

| Serviço | Ligação véspera | WhatsApp véspera | WhatsApp dia |
|---------|----------------|-----------------|-------------|
| Rápido (até 30min) | Opcional | ✅ | ✅ (1h antes) |
| Médio (30min-1h) | ✅ | ✅ | ✅ (2h antes) |
| Longo (acima de 1h) | ✅ obrigatório | ✅ | ✅ (3h antes) |

**O que fazer após no-show (cliente não apareceu):**
```
[Ligar no mesmo dia, 30 min após o horário marcado]
[tom preocupado, não chateado]

"Oi, [NOME]! Aqui é o/a [OPERADOR] da BR Pneus.
Você tinha horário agendado hoje às [HORA] e queria saber se tá tudo bem.
Aconteceu alguma coisa? [pausa]"

[Se teve imprevisto:]
"Que bom que tá bem! Sem problema — a gente reagenda quando você puder.
Tenho horário [OPÇÃO 1] ou [OPÇÃO 2]. Qual encaixa?"

[Se esqueceu:]
"Acontece! Quer que eu reserve um novo horário agora?"

[Se desistiu:]
→ ENCERRAMENTO ELEGANTE + registrar motivo no CRM
```

---

## Salvar em
`output/scripts/confirmacao-[antecedencia]-[data].md`

---

## Referências Cruzadas
- Agendamento feito em: `/script-primeiro-contato`
- Template WhatsApp oficial: `skills/crm-email/whatsapp-template.md` → tipo `confirmacao-agendamento`
- Após no-show: `/script-followup segunda-tentativa nao-atendeu`
