---
name: remarketing-copy
description: Gera copies de remarketing para a BR Pneus & Oficina adaptadas ao estágio do funil em que o lead parou — visitou o site, viu o serviço, iniciou contato, pediu orçamento ou é cliente antigo. Inclui 3 abordagens por estágio (lembrete, incentivo, urgência) e sequência temporal de 14 dias. Use sempre que precisar de remarketing, reimpactar leads que não converteram, recuperar clientes inativos, ou criar anúncios para quem já demonstrou interesse — mesmo que o pedido use termos como "impactar quem visitou o site", "recuperar lead", "anúncio para quem já pesquisou" ou "reativar cliente antigo".
---

# Skill: Copies de Remarketing

## Comando
```
/remarketing-copy [estagio] [servico] [cidade]
```

## Parâmetros
- **estagio** (obrigatório): Em que ponto o lead parou. Opções:
  - `visitou-site` — Entrou no site mas não executou nenhuma ação
  - `viu-servico` — Visitou página de serviço específico, demonstrou interesse
  - `iniciou-contato` — Abriu o WhatsApp ou formulário mas não completou
  - `orcamento-sem-fechar` — Pediu orçamento mas não agendou/comprou
  - `cliente-antigo` — Já foi cliente, não voltou há 6+ meses
- **servico** (obrigatório): Serviço de interesse do lead
- **cidade** (obrigatório): Cidade-alvo

---

## Por que remarketing é diferente de aquisição

O lead de remarketing JÁ conhece a BR Pneus. Ele não precisa ser convencido de que a loja existe — ele precisa ser incentivado a tomar a decisão que ainda não tomou. Isso muda completamente a abordagem:

- Tom mais pessoal e menos formal ("Ei, notamos que você...")
- Menos explicação, mais motivação para agir
- Oferta ou benefício extra como acelerador de decisão
- Urgência é mais legítima aqui — o lead está "esquentando"

---

## Processo antes de criar

1. Identificar por que o lead provavelmente não converteu: preço? falta de tempo? indecisão? comparando concorrentes?
2. A abordagem deve endereçar a barreira mais provável, não apenas repetir o anúncio inicial

---

## Estrutura obrigatória do output

Para cada estágio, gerar **3 anúncios** + **configuração técnica** + **sequência temporal**:

---

### Estágio: `visitou-site`

*Perfil: visitou mas não clicou em nada — interesse genérico, indecisão, comparando opções*

**Anúncio 1 — Lembrete Suave:**
```
Texto principal: "Ei! Vimos que você passou por aqui. 😉 Ainda está pensando em [serviço]? 
A BR Pneus & Oficina em [Cidade] continua com as melhores condições do mercado. 
Pode contar com a gente!"
Headline: "Ainda Precisando de [Serviço] em [Cidade]?"
CTA: Saiba Mais
Tom: amigável, sem pressão
```

**Anúncio 2 — Incentivo:**
```
Texto principal: "Ficou interessado mas não agendou? A gente entende. 
Que tal um orçamento rápido sem compromisso? WhatsApp direto, resposta em minutos.
Parcele em até 18x e aproveite a garantia BR Total."
Headline: "Orçamento Grátis — Sem Compromisso"
CTA: Enviar Mensagem
Tom: facilitar o próximo passo, remover atrito
```

**Anúncio 3 — Urgência:**
```
Texto principal: "Não deixe o pneu/serviço para depois — pode sair mais caro! ⚠️ 
Manutenção preventiva economiza. Agende agora na BR Pneus [Cidade] e parcele em 18x."
Headline: "Antes que Fique Mais Caro — Agende Já"
CTA: Agendar | Enviar Mensagem
Tom: urgência genuína baseada em consequência, não manipulação
```

---

### Estágio: `viu-servico`

*Perfil: visitou a página de serviço específico — intenção alta, está comparando ou precisando de empurrão*

**Anúncio 1 — Lembrete personalizado:**
```
Texto principal: "Você estava vendo nosso serviço de [serviço específico]. 🔧 
A BR Pneus & Oficina em [Cidade] é especialista nisso há anos.
Equipe treinada, garantia BR Total e parcelamento em 18x. O que está esperando?"
Headline: "[Serviço] em [Cidade] — Especialistas com Garantia"
CTA: Saiba Mais | Enviar Mensagem
```

**Anúncio 2 — Diferencial específico do serviço:**
```
Texto principal: "Ainda pensando em [serviço]? 
[Incluir 1 informação específica sobre o serviço que agrega valor — ex: "Nosso alinhamento é 3D computadorizado, mais preciso que o convencional."]
Consulte condições e agende sem fila pelo WhatsApp."
Headline: "[Benefício específico do serviço] em [Cidade]"
CTA: Enviar Mensagem
```

**Anúncio 3 — Reduzir barreira de preço:**
```
Texto principal: "Preocupado com o preço de [serviço]? 
Temos as melhores condições em [Cidade]: melhores preços do mercado + parcela em até 18x.
Peça seu orçamento grátis agora — sem compromisso."
Headline: "Melhor Preço de [Serviço] em [Cidade]"
CTA: Enviar Mensagem
```

---

### Estágio: `iniciou-contato`

*Perfil: chegou a abrir o WhatsApp ou formulário mas não enviou — estava prestes a converter*

**Anúncio 1 — Retomada direta:**
```
Texto principal: "Parece que você quase entrou em contato com a gente. 😊
Pode mandar uma mensagem sem cerimônia — respondemos rapidinho e sem pressão.
Orçamento grátis para [serviço] em [Cidade]."
Headline: "Continue de Onde Parou — Fale Conosco"
CTA: Enviar Mensagem
```

**Anúncio 2 — Facilitador:**
```
Texto principal: "Quer um orçamento rápido de [serviço] em [Cidade]?
É só clicar em 'Enviar Mensagem' abaixo e falar com nossa equipe.
Sem formulário, sem espera. WhatsApp direto com quem pode te ajudar."
Headline: "1 Mensagem — Orçamento Imediato"
CTA: Enviar Mensagem (vincular ao WhatsApp da unidade)
```

**Anúncio 3 — Urgência com benefício:**
```
Texto principal: "Essa semana temos condições especiais para [serviço] em [Cidade].
Não perca: parcele em 18x com garantia BR Total de 1 ano.
Chama no WhatsApp agora!"
Headline: "Condições Especiais Essa Semana em [Cidade]"
CTA: Enviar Mensagem
```

---

### Estágio: `orcamento-sem-fechar`

*Perfil: pediu orçamento mas não fechou — está comparando ou esperando o momento certo*

**Anúncio 1 — Reforço de valor:**
```
Texto principal: "Ainda considerando nosso orçamento de [serviço]? 
Lembra que incluímos parcelamento em 18x e garantia BR Total de 1 ano?
Se tiver dúvida, pode chamar — estamos aqui para ajudar."
Headline: "Seu Orçamento + 18x + Garantia de 1 Ano"
CTA: Enviar Mensagem
```

**Anúncio 2 — Incentivo adicional:**
```
Texto principal: "Que tal fecharmos? Para quem pediu orçamento, temos uma condição especial essa semana.
[Incluir condição genérica — não inventar desconto específico: "consulte condições atuais"]
Chama no WhatsApp e menciona o orçamento que você pediu."
Headline: "Condição Especial para Fechar Esta Semana"
CTA: Enviar Mensagem
```

**Anúncio 3 — Urgência com consequência:**
```
Texto principal: "Seu orçamento de [serviço] ainda está disponível — mas os preços podem mudar. 
Quanto antes você agendar, mais seguro fica o valor que combinamos.
Fala com a gente!"
Headline: "Garanta o Preço do Seu Orçamento"
CTA: Enviar Mensagem
```

---

### Estágio: `cliente-antigo`

*Perfil: já comprou/usou o serviço, não voltou há mais de 6 meses — reativação de base*

**Anúncio 1 — Reconexão:**
```
Texto principal: "Faz um tempinho que não te vemos por aqui! 
Seu carro está em dia com a revisão? A BR Pneus & Oficina em [Cidade] está com novidades.
Que tal um check-up?"
Headline: "Sentimos sua Falta — Venha nos Visitar"
CTA: Saiba Mais | Enviar Mensagem
```

**Anúncio 2 — Lembrete de manutenção:**
```
Texto principal: "Se faz mais de 6 meses desde sua última visita, provavelmente é hora de verificar o [serviço que usou].
Prevenção é sempre mais barata que correção. Agende na BR Pneus [Cidade]."
Headline: "Hora de uma Revisão — BR Pneus [Cidade]"
CTA: Enviar Mensagem
```

**Anúncio 3 — Oferta exclusiva de reativação:**
```
Texto principal: "Clientes que já conhecem a qualidade BR Pneus merecem condições especiais.
Consulte nossas promoções para quem já é da família. 
Chama no WhatsApp e menciona que já foi cliente!"
Headline: "Condições Especiais Para Quem Já Conhece a Gente"
CTA: Enviar Mensagem
```

---

## Configuração Técnica por Estágio

| Estágio | Janela de remarketing | Frequência máxima | Exclusões obrigatórias |
|---------|----------------------|-------------------|----------------------|
| visitou-site | 30 dias | 3x/semana | Quem converteu (últimos 30 dias) |
| viu-servico | 14 dias | 4x/semana | Quem converteu |
| iniciou-contato | 7 dias | 5x/semana | Quem completou o contato |
| orcamento-sem-fechar | 14 dias | 4x/semana | Quem fechou o orçamento |
| cliente-antigo | Audiência de 180–365 dias atrás | 2x/semana | Quem comprou nos últimos 90 dias |

---

## Sequência Temporal Sugerida (14 dias)

```
Dias 1–3:   Lembrete suave → baixa pressão, relembrar o interesse
Dias 4–7:   Incentivo/oferta → benefício adicional para decidir
Dias 8–14:  Urgência → "última chance", prazo, escassez real
Dia 15+:    Parar os anúncios de remarketing direto
            → migrar para conteúdo educativo se ainda não converteu
            → recolocar na audiência de remarketing após 60 dias
```

---

## Onde salvar
```
output/campanhas/remarketing-[estagio]-[servico]-[cidade]-[YYYY-MM-DD].md
```
**Exemplo:** `output/campanhas/remarketing-viu-servico-pneus-maringa-2026-04-07.md`
