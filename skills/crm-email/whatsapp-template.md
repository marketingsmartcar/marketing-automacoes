# Skill: Templates de WhatsApp Business

## Comando
`/whatsapp-template [tipo] [servico-opcional]`

## O que faz
Gera templates de mensagem para WhatsApp Business API, prontos para cadastro e aprovação na Meta — com versão oficial (variáveis `{{1}}`...) e versão humanizada para envio manual pela equipe.

---

## Parâmetros

| Parâmetro | Obrigatório | Opções |
|-----------|-------------|--------|
| `tipo` | Sim | `boas-vindas`, `orcamento`, `confirmacao-agendamento`, `lembrete-agendamento`, `servico-pronto`, `pos-servico`, `promocao`, `reativacao`, `aniversario`, `lembrete-revisao`, `indicacao`, `todos` |
| `servico-opcional` | Não | Personaliza a mensagem para um serviço específico |

---

## Estrutura do Output

Para cada tipo, gerar **ambos os formatos** a seguir:

---

### Formato 1 — Template Oficial (WhatsApp Business API)

```
Nome do template: [snake_case_sem_acentos_max_512chars]
Categoria: [utility | marketing | authentication]
Idioma: pt_BR
Status esperado: pendente de aprovação Meta

HEADER (opcional):
  Tipo: [TEXT | IMAGE | DOCUMENT | VIDEO]
  Conteúdo: [texto do header, máx 60 chars]

BODY:
  [Mensagem com variáveis {{1}}, {{2}}, {{3}}... máx 1024 chars]
  Mapeamento de variáveis:
    {{1}} = [descrição, ex: nome do cliente]
    {{2}} = [descrição]
    ...

FOOTER (opcional):
  [Texto pequeno, máx 60 chars — ex: "BR Pneus & Oficina — Muito mais que pneus"]

BOTÕES (opcional, máx 3):
  Tipo 1 — Resposta rápida: [texto, máx 20 chars]
  Tipo 2 — URL: [texto, máx 20 chars] → [URL ou variável dinâmica]
  Tipo 3 — Ligar: [texto, máx 20 chars] → [número]
```

---

### Formato 2 — Versão Humanizada (para envio manual pela equipe)

Mensagem com linguagem natural, variáveis em `{{nome}}` etc., emojis estratégicos (1–2 por mensagem), indicações de quando personalizar manualmente.

---

## Templates por Tipo

---

### boas-vindas

**Categoria:** utility  
**Quando usar:** imediatamente após o primeiro cadastro ou primeiro serviço

**Template Oficial:**
```
Nome: br_pneus_boas_vindas
Body: Olá, {{1}}! 😊 Bem-vindo à BR Pneus & Oficina {{2}}!

Ficamos felizes em ter você aqui. Você tem:
✅ Garantia BR Total de 1 ano
✅ Parcelamento em até 18x
✅ Atendimento pelo WhatsApp sempre que precisar

Salva nosso contato para não perder nenhuma oferta!

Qualquer dúvida, estamos aqui.
— Equipe BR Pneus & Oficina {{2}}

Mapeamento: {{1}}=nome, {{2}}=unidade
Botões:
  [Ligar para a loja] → {{3}} (telefone unidade)
```

**Versão Humanizada:**
```
Oi, [NOME]! Bem-vindo(a) à família BR Pneus & Oficina [UNIDADE]! 🚗

Foi um prazer te atender! Aqui você tem garantia BR Total de 1 ano, 
parcelamento em até 18x e a gente sempre à disposição pelo WhatsApp.

Salva nosso número! Qualquer coisa é só chamar.

— [NOME DO ATENDENTE], BR Pneus [UNIDADE]
```

---

### confirmacao-agendamento

**Categoria:** utility  
**Quando usar:** assim que o agendamento é confirmado

**Template Oficial:**
```
Nome: br_pneus_confirmacao_agendamento
Body: Olá, {{1}}! ✅ Seu agendamento está confirmado.

📅 Data: {{2}}
🕐 Horário: {{3}}
🔧 Serviço: {{4}}
📍 Endereço: BR Pneus & Oficina {{5}} — {{6}}

Qualquer imprevisto, nos avise com antecedência pelo WhatsApp.
Te esperamos! 🚗

Mapeamento: {{1}}=nome, {{2}}=data, {{3}}=horario, {{4}}=servico, {{5}}=unidade, {{6}}=endereco
Botões:
  [Confirmar presença]
  [Reagendar] → URL: {{7}} (link agendamento)
  [Ligar] → {{8}} (telefone)
```

**Versão Humanizada:**
```
Oi, [NOME]! ✅ Agendamento confirmado!

📅 [DATA] às [HORÁRIO]
🔧 Serviço: [SERVIÇO]
📍 BR Pneus & Oficina [UNIDADE] — [ENDEREÇO]

Se precisar reagendar, só me avisa! Te esperamos 😊

— [NOME DO ATENDENTE]
```

---

### lembrete-agendamento

**Categoria:** utility  
**Quando usar:** 24h antes do agendamento (e opcional: 1h antes)

**Template Oficial:**
```
Nome: br_pneus_lembrete_agendamento
Body: Oi, {{1}}! Lembrete do seu agendamento amanhã 📅

🕐 Horário: {{2}}
🔧 Serviço: {{3}}
📍 BR Pneus & Oficina {{4}}

Precisa reagendar? Nos avise até as 18h de hoje.
Te esperamos!

Mapeamento: {{1}}=nome, {{2}}=horario, {{3}}=servico, {{4}}=unidade
Botões:
  [Confirmar]
  [Reagendar]
```

---

### servico-pronto

**Categoria:** utility  
**Quando usar:** quando o carro está pronto para retirada

**Template Oficial:**
```
Nome: br_pneus_servico_pronto
Body: {{1}}, seu carro está pronto! 🚗✅

🔧 Serviço realizado: {{2}}
📍 BR Pneus & Oficina {{3}} — {{4}}
🕐 Pode retirar até as {{5}}

Qualquer dúvida sobre o serviço, nossa equipe está aqui.
Garantia BR Total de 1 ano ativa!

Mapeamento: {{1}}=nome, {{2}}=servico, {{3}}=unidade, {{4}}=endereco, {{5}}=horario_limite
Botões:
  [Já estou indo]
  [Tenho uma dúvida]
```

---

### pos-servico

**Categoria:** utility  
**Quando usar:** 24–48h após o serviço

**Template Oficial:**
```
Nome: br_pneus_pos_servico
Body: Oi, {{1}}! Tudo bem após o {{2}} aqui na BR Pneus? 🔧

Esperamos que tenha ficado satisfeito(a)!

Lembrando: você tem Garantia BR Total de 1 ano. Qualquer problema, nos avise.

Uma pergunta rápida: de 0 a 10, o quanto você recomendaria a BR Pneus & Oficina {{3}} para um amigo?

Mapeamento: {{1}}=nome, {{2}}=servico, {{3}}=unidade
Botões:
  [😍 9 ou 10]
  [🙂 7 ou 8]
  [😕 0 a 6]
```

---

### promocao

**Categoria:** marketing  
**Quando usar:** campanhas promocionais (máx 2x/mês por cliente)

**Template Oficial:**
```
Nome: br_pneus_promocao
Body: {{1}}, oferta exclusiva BR Pneus & Oficina {{2}}! 🎉

{{3}}

⏰ Válido até {{4}}
📍 {{5}}

Parcela em até 18x! Agende agora:

Mapeamento: {{1}}=nome, {{2}}=unidade, {{3}}=descricao_oferta, {{4}}=data_validade, {{5}}=endereco
Botões:
  [Agendar agora] → URL: {{6}}
  [Ligar] → {{7}}
```

**Versão Humanizada:**
```
Oi, [NOME]! 🎉 Oferta especial só essa semana aqui na BR Pneus [UNIDADE]:

[DESCRIÇÃO DA OFERTA]

Até [DATA]. Parcela em até 18x! 
Agende pelo link: [LINK] ou chama aqui mesmo.

— [NOME DO ATENDENTE]
```

---

### reativacao

**Categoria:** marketing  
**Quando usar:** clientes inativos 6+ meses (usar com moderação)

**Template Oficial:**
```
Nome: br_pneus_reativacao
Body: Oi, {{1}}! Faz um tempinho que você não passa na BR Pneus & Oficina {{2}} 🚗

Sentimos sua falta! Preparamos uma condição especial para te receber de volta:

{{3}}

Válida por {{4}} dias. Aproveita!

Para cancelar o recebimento de mensagens, responda SAIR.

Mapeamento: {{1}}=nome, {{2}}=unidade, {{3}}=oferta_reativacao, {{4}}=dias_validade
Botões:
  [Quero aproveitar!] → URL: {{5}}
  [Ligar] → {{6}}
```

---

### aniversario

**Categoria:** marketing  
**Quando usar:** no dia do aniversário do cliente

**Template Oficial:**
```
Nome: br_pneus_aniversario
Body: Feliz aniversário, {{1}}! 🎂🎉

A equipe da BR Pneus & Oficina {{2}} deseja um dia incrível para você!

Como presente, temos uma surpresa especial esperando por você:
{{3}}

Válido durante o seu mês de aniversário. Use o código: ANIVER{{4}}

Mapeamento: {{1}}=nome, {{2}}=unidade, {{3}}=descricao_presente, {{4}}=codigo_unico
Botões:
  [Resgatar meu presente] → URL: {{5}}
```

---

### lembrete-revisao

**Categoria:** utility  
**Quando usar:** conforme ciclo de serviços (ver tabela em email-lembrete-revisao.md)

**Template Oficial:**
```
Nome: br_pneus_lembrete_revisao
Body: Oi, {{1}}! Tá na hora da {{2}} 🔧

Já faz {{3}} desde o seu último serviço na BR Pneus & Oficina {{4}}.

Especialistas recomendam {{2}} a cada {{5}}.
É rápido e garante mais segurança na estrada!

Quer agendar? A gente cuida de tudo.

Para cancelar lembretes, responda SAIR.

Mapeamento: {{1}}=nome, {{2}}=servico, {{3}}=periodo, {{4}}=unidade, {{5}}=intervalo_recomendado
Botões:
  [Agendar agora] → URL: {{6}}
  [Mais informações]
```

---

### indicacao

**Categoria:** marketing  
**Quando usar:** 7–14 dias após serviço com NPS 9–10

**Template Oficial:**
```
Nome: br_pneus_indicacao
Body: Oi, {{1}}! Ficamos muito felizes que você adorou o atendimento na BR Pneus & Oficina {{2}} 😊

Você toparia indicar a gente para um amigo ou familiar?

Como agradecimento, você ganha {{3}} na sua próxima visita quando seu indicado realizar o primeiro serviço!

É simples: encaminhe essa mensagem para quem você conhece que cuida do carro.

Mapeamento: {{1}}=nome, {{2}}=unidade, {{3}}=recompensa_indicacao
Botões:
  [Indicar um amigo] → URL compartilhável
  [Saiba mais]
```

---

## Regras Gerais de Envio

| Regra | Detalhe |
|-------|---------|
| Horário permitido | 8h–20h, segunda a sábado — nunca domingo |
| Frequência máxima (marketing) | 2 mensagens ativas/mês sem interação prévia |
| Frequência (utility) | Sem limite — desde que relevante ao contexto |
| Opt-out | Sempre honrar "SAIR" ou equivalente imediatamente |
| LGPD | Só enviar para contatos com consentimento explícito ou legítimo interesse pós-compra |
| Tom | Pessoal, nunca spam — se parecer broadcast, reescrever |

---

## Salvar em
`output/emails/whatsapp-[tipo]-[data].md`

---

## Referências Cruzadas
- Contexto de marca: `CLAUDE.md`
- Personas: `knowledge/personas.md`
- Fluxos de automação: `/fluxo-automacao pos-servico` ou `/fluxo-automacao novo-cliente`
