# Skill: Fluxo de Automação Completo

## Comando
`/fluxo-automacao [jornada]`

## O que faz
Desenha um fluxo de automação de marketing completo com triggers, condições, ações e timing — pronto para implementar em qualquer ferramenta (RD Station, ActiveCampaign, Mailchimp, HubSpot, etc.) — com diagrama em texto, detalhamento de cada nó e métricas de acompanhamento.

---

## Parâmetros

| Parâmetro | Obrigatório | Opções |
|-----------|-------------|--------|
| `jornada` | Sim | `novo-cliente`, `pos-servico`, `carrinho-abandonado`, `lembrete-periodico`, `reativacao`, `indicacao`, `aniversario`, `sazonal` |

---

## Estrutura do Output (para todos os fluxos)

### 1. Visão Geral do Fluxo

```
Nome: [nome descritivo]
Objetivo: [meta principal em 1 frase]
Trigger de entrada: [o que inicia o fluxo]
Público-alvo: [segmento e critérios de entrada]
Canais: [email | WhatsApp | SMS | notificação interna]
Duração total: [tempo do início ao fim]
Meta de conversão: [o que define sucesso]
Condição de saída antecipada: [o que tira o contato do fluxo antes do fim]
```

---

### 2. Diagrama do Fluxo (em texto — formato de árvore de decisão)

Usar sempre esta notação:
- `[TRIGGER: ...]` — evento que inicia o fluxo
- `[ESPERA: Xh/dias]` — tempo de aguardo
- `[AÇÃO: ...]` — algo que acontece (envio, tag, notificação)
- `[CONDIÇÃO: ...]` — bifurcação com ├── SIM e └── NÃO
- `[FIM: ...]` — encerramento do fluxo com estado do contato

---

### 3. Detalhamento de Cada Nó

Para cada elemento do diagrama:

| Campo | Conteúdo |
|-------|---------|
| ID | Número sequencial (N01, N02...) |
| Tipo | trigger / espera / condição / ação / fim |
| Canal | email / WhatsApp / SMS / interno / nenhum |
| Conteúdo resumido | assunto + preview text, ou texto principal |
| Skill de conteúdo | referência ao arquivo de skill para gerar o conteúdo |
| Timing | quando dispara após o nó anterior |
| Condição de saída | o que faz o contato SAIR do fluxo neste ponto |

---

### 4. Condições de Saída Global (valem para todos os fluxos)

- Contato realizou a conversão → sai do fluxo imediatamente, entra no próximo ciclo
- Contato solicitou descadastro → sai de TODOS os fluxos, marcar opt-out na base
- Contato abriu reclamação → sai dos fluxos automáticos, criar task manual para atendimento
- Contato entrou em outro fluxo prioritário → pausar fluxo atual para evitar sobreposição

---

### 5. Métricas do Fluxo

| Métrica | Como Medir | Meta |
|---------|-----------|------|
| Taxa de entrada | Contatos que entraram / base elegível | - |
| Taxa de conclusão | Chegaram ao fim / entraram | > 40% |
| Taxa de conversão por etapa | Converteram naquela etapa / chegaram até ela | - |
| Canal de melhor performance | Comparar CTR email vs WhatsApp vs SMS | - |
| Pontos de maior drop-off | Etapas com maior saída sem conversão | - |
| Revenue atribuído | Valor gerado por contatos que passaram pelo fluxo | - |

---

### 6. Instruções de Implementação

- Tags/campos necessários no CRM para este fluxo
- Integrações externas necessárias
- Testes pré-ativação (testar com 5–10 contatos internos)
- Monitoramento semanal: o que verificar
- Quando revisar ou desativar o fluxo

---

## Fluxos por Jornada

---

### novo-cliente

**Trigger:** primeiro serviço realizado OU primeiro cadastro confirmado

```
[TRIGGER: Primeiro serviço realizado na loja]
    ↓
[AÇÃO N01: Enviar email-boas-vindas Email 1] → skill: /email-boas-vindas primeiro-servico
    ↓ [ESPERA: 2 dias]
[CONDIÇÃO N02: Abriu Email 1?]
    ├── SIM
    │   ↓ [ESPERA: 1 dia]
    │   [AÇÃO N03: Enviar email-boas-vindas Email 2] → skill: /email-boas-vindas
    │   ↓ [ESPERA: 3 dias]
    │   [CONDIÇÃO N04: Clicou em algum serviço?]
    │   ├── SIM → [AÇÃO N05: WhatsApp com oferta do serviço clicado] → skill: /whatsapp-template orcamento
    │   └── NÃO → [AÇÃO N06: Enviar Email 3 — prova social]
    │             ↓ [ESPERA: 4 dias]
    │             [AÇÃO N07: Enviar Email 4 — oferta de retorno]
    │             ↓ [ESPERA: 7 dias]
    │             [CONDIÇÃO N08: Converteu?]
    │             ├── SIM → [FIM: Entrar no fluxo pos-servico]
    │             └── NÃO → [FIM: Entrar no segmento lembrete-periodico]
    └── NÃO
        [AÇÃO N09: Reenviar Email 1 com assunto alternativo]
        ↓ [ESPERA: 2 dias]
        [CONDIÇÃO N10: Abriu agora?]
        ├── SIM → [voltar ao N03]
        └── NÃO → [AÇÃO N11: SMS direto com oferta simples] → skill: /sms-promocional
                  ↓ [ESPERA: 3 dias]
                  [CONDIÇÃO N12: Clicou no SMS?]
                  ├── SIM → [AÇÃO N05]
                  └── NÃO → [FIM: Segmento "não engajou no onboarding" — aguardar 30 dias]
```

**Duração total:** 21–28 dias  
**Meta:** 30–40% dos novos clientes realizam segundo serviço em até 60 dias

---

### pos-servico

**Trigger:** serviço marcado como "concluído" no sistema

```
[TRIGGER: Serviço concluído]
    ↓ [ESPERA: 24h]
[AÇÃO N01: Email agradecimento + dicas] → skill: /email-pos-servico [servico]
    ↓ [ESPERA: 24h]
[AÇÃO N02: Email pesquisa NPS] → skill: /email-pos-servico
    ↓ [ESPERA: aguardar resposta até 5 dias]
[CONDIÇÃO N03: Qual foi o NPS?]
    ├── 9–10 (Promotor)
    │   ↓ [ESPERA: 2 dias]
    │   [AÇÃO N04: Email pedido avaliação Google] → skill: /email-pos-servico
    │   ↓ [ESPERA: 7 dias]
    │   [AÇÃO N05: WhatsApp pedido de indicação] → skill: /whatsapp-template indicacao
    │   ↓ [FIM: Entrar no fluxo lembrete-periodico]
    ├── 7–8 (Neutro)
    │   ↓ [ESPERA: 3 dias]
    │   [AÇÃO N06: Email "O que podemos melhorar?"] — pergunta aberta
    │   ↓ [FIM: Entrar no fluxo lembrete-periodico]
    ├── 0–6 (Detrator)
    │   [AÇÃO N07: Alerta interno para gerente da unidade]
    │   [AÇÃO N08: WhatsApp manual do gerente pedindo desculpas] — atendimento humano
    │   ↓ [FIM: Fluxo automático pausado — acompanhamento manual]
    └── Sem resposta (5 dias)
        [AÇÃO N09: Email avaliação Google (fallback neutro)]
        ↓ [FIM: Entrar no fluxo lembrete-periodico]
```

**Duração total:** 7–12 dias  
**Meta:** NPS médio ≥ 8; taxa de avaliação Google ≥ 20% dos clientes atendidos

---

### carrinho-abandonado (orçamento abandonado)

**Trigger:** orçamento gerado mas sem agendamento após 48h

```
[TRIGGER: Orçamento gerado há 48h sem agendamento]
    ↓
[AÇÃO N01: WhatsApp de retomada] → skill: /whatsapp-template orcamento
    ↓ [ESPERA: 3 dias]
[CONDIÇÃO N02: Respondeu/agendou?]
    ├── SIM → [FIM: Entrar no fluxo confirmacao-agendamento]
    └── NÃO → [AÇÃO N03: Email reativação orcamento-abandonado] → skill: /email-reativacao orcamento-abandonado
              ↓ [ESPERA: 5 dias]
              [CONDIÇÃO N04: Agendou?]
              ├── SIM → [FIM: Entrar no fluxo confirmacao-agendamento]
              └── NÃO → [AÇÃO N05: SMS última chance] → skill: /sms-promocional
                        ↓ [ESPERA: 7 dias]
                        [CONDIÇÃO N06: Agendou?]
                        ├── SIM → [FIM: sucesso]
                        └── NÃO → [FIM: Segmento "orçamento perdido" — retentar em 30 dias]
```

**Duração total:** 15–18 dias  
**Meta:** recuperar 20–30% dos orçamentos abandonados

---

### lembrete-periodico

**Trigger:** data calculada com base no último serviço + intervalo recomendado

```
[TRIGGER: Data de lembrete calculada pelo CRM]
    ↓
[AÇÃO N01: Email Variação A — preventivo] → skill: /email-lembrete-revisao [servico] [periodo]
    ↓ [ESPERA: 3 dias]
[CONDIÇÃO N02: Abriu e clicou?]
    ├── SIM, clicou → [FIM: aguardar conversão — marcado como "lembrete atendido"]
    ├── SIM, só abriu → [ESPERA: 4 dias] → [AÇÃO N03: Email Variação B — praticidade]
    └── NÃO → [AÇÃO N03: Email Variação B — praticidade]
              ↓ [ESPERA: 5 dias]
              [CONDIÇÃO N04: Clicou?]
              ├── SIM → [FIM: aguardar conversão]
              └── NÃO → [AÇÃO N05: Email Variação C — oferta]
                        ↓ [ESPERA: 7 dias]
                        [CONDIÇÃO N06: Agendou?]
                        ├── SIM → [FIM: sucesso]
                        └── NÃO → [AÇÃO N07: WhatsApp lembrete-revisao] → skill: /whatsapp-template lembrete-revisao
                                  ↓ [ESPERA: 5 dias]
                                  [Respondeu?]
                                  ├── SIM → [FIM: sucesso]
                                  └── NÃO → [FIM: entrar no fluxo de reativação]
```

**Duração total:** 24–30 dias  
**Meta:** 25–35% dos lembretes convertem em agendamento

---

### reativacao

**Trigger:** cliente identificado como inativo (sem visita no período configurado)

Referência completa: ver skill `/email-reativacao` — este fluxo orquestra todos os touchpoints documentados lá.

```
[TRIGGER: Cliente inativo identificado pelo CRM]
    ↓ Dia 0
[AÇÃO N01: Email "sentimos sua falta"] → skill: /email-reativacao [segmento]
    ↓ [ESPERA: 3 dias]
[Respondeu/agendou?]
    ├── SIM → [FIM: sucesso — entrar no fluxo pos-servico]
    └── NÃO → [AÇÃO N02: WhatsApp personalizado] → skill: /whatsapp-template reativacao
              ↓ [ESPERA: 4 dias]
              [Respondeu?]
              ├── SIM → [FIM: sucesso]
              └── NÃO → [AÇÃO N03: Email com oferta irresistível]
                        ↓ [ESPERA: 7 dias]
                        [Agendou?]
                        ├── SIM → [FIM: sucesso]
                        └── NÃO → [AÇÃO N04: SMS última chance] → skill: /sms-promocional
                                  ↓ [ESPERA: 7 dias]
                                  [Agendou?]
                                  ├── SIM → [FIM: sucesso]
                                  └── NÃO → [FIM: "perdido definitivo" — campanhas sazonais apenas]
```

---

### aniversario

**Trigger:** data de aniversário do cliente (configurar para disparar 1 dia antes)

```
[TRIGGER: Véspera do aniversário do cliente]
    ↓
[AÇÃO N01: WhatsApp parabéns + oferta] → skill: /whatsapp-template aniversario
    ↓ [ESPERA: 1 dia — dia do aniversário]
[AÇÃO N02: Email de aniversário com oferta detalhada]
    ↓ [ESPERA: 7 dias]
[CONDIÇÃO N03: Resgatou a oferta?]
    ├── SIM → [FIM: sucesso — entrar no fluxo pos-servico após o serviço]
    └── NÃO → [AÇÃO N04: SMS lembrete "sua oferta vence em X dias"]
              ↓ [ESPERA: até o fim do mês de aniversário]
              [CONDIÇÃO N05: Resgatou?]
              ├── SIM → [FIM: sucesso]
              └── NÃO → [FIM: oferta expirada — registrar para análise]
```

---

### sazonal

**Trigger:** data configurada no calendário (ativar/desativar por período)

```
[TRIGGER: Data da campanha sazonal]
    ↓
[AÇÃO N01: SMS de abertura da campanha] → skill: /sms-promocional [tipo] [cidade]
    ↓ [ESPERA: 2 dias]
[AÇÃO N02: Email com oferta completa]
    ↓ [ESPERA: 3 dias]
[CONDIÇÃO N03: Abriu/clicou?]
    ├── SIM → [AÇÃO N04: WhatsApp de apoio com link de agendamento]
    └── NÃO → [AÇÃO N05: SMS de reforço "última chance"]
              ↓ [ESPERA: 2 dias]
              [AÇÃO N06: Email "últimas horas" se campanha com data fim]
[TRIGGER DE FIM: data fim da campanha]
    ↓
[FIM: todos os contatos saem do fluxo — análise de conversão]
```

---

## Salvar em
`output/emails/fluxo-[jornada]-[data].md`

---

## Referências Cruzadas
- Contexto de marca: `CLAUDE.md`
- Personas: `knowledge/personas.md`
- Calendário sazonal: `knowledge/calendario-sazonal.md`
- Skills de conteúdo referenciadas: todas as demais skills em `skills/crm-email/`
