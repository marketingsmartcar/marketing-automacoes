---
name: email-newsletter
description: Gera a newsletter mensal completa da BR Pneus & Oficina para envio à base de clientes — com opções de assunto para A/B test, preview text, corpo estruturado em blocos e rodapé. Use sempre que precisar criar email marketing, newsletter, disparo para base de clientes, ou mensagem de relacionamento mensal, mesmo que o pedido use apenas "email do mês" ou "comunicação para clientes".
---

# Skill: Newsletter Mensal

## Comando
```
/email-newsletter [mes] [ano]
```

## Parâmetros
- **mes** (obrigatório): mês de referência. Ex: julho, novembro, março
- **ano** (obrigatório): ano. Ex: 2026

---

## Processo antes de escrever

1. Consultar `knowledge/calendario-sazonal.md` para identificar:
   - O tema sazonal do mês (férias, inverno, Black Friday, etc.)
   - Serviços com maior demanda no período
   - Datas comerciais que caem no mês
2. Definir o serviço/tema principal do mês (bloco de destaque)
3. Identificar qual persona tem mais aderência ao contexto do mês

---

## Estrutura obrigatória do output

### Metadados do email

```
Mês/Ano: [mês] de [ano]
Tema central: [assunto principal do mês]
Persona principal: [Carlos / Ana / Roberto / Giovana / todas]
Serviço em destaque: [serviço mais relevante para o período]
```

### Assunto do email — 3 opções para A/B test

Criar 3 variações com ângulos diferentes para testar qual converte melhor:
```
Opção A: [curiosidade ou pergunta — máx 50 caracteres]
Opção B: [benefício direto ou oferta — máx 50 caracteres]
Opção C: [urgência ou sazonalidade — máx 50 caracteres]
```

### Preview text

Texto exibido ao lado do assunto na caixa de entrada (complementa, não repete):
```
Preview text: [máx 90 caracteres | deve gerar curiosidade para abrir o email]
```

---

### Corpo do email

**Regra geral:** máximo 400 palavras no total. Email longo não é lido.

---

**Saudação**
```
Oi, {{nome}}! 👋
```

---

**Bloco 1 — Editorial (contexto do mês)**
- 3-4 frases sobre o momento/estação/contexto e como isso impacta o veículo do cliente
- Tom: acolhedor, como se viesse de um amigo que conhece o carro do cliente
- Basear no calendário sazonal do mês

```
[Texto do bloco 1 — 3-4 frases]
```

---

**Bloco 2 — Dica do Mês**
- 1 dica prática de cuidado automotivo ligada ao período
- 4-5 frases, linguagem simples, sem jargão
- Se houver post de blog sobre o tema, adicionar link: "Saiba mais no blog →"

```
🔧 Dica do Mês: [título da dica]
[Texto da dica — 4-5 frases]
[Link opcional: Ler artigo completo →]
```

---

**Bloco 3 — Promoção ou Serviço em Destaque**
- Serviço ou oferta principal do mês
- Destaque visual (usar caixa ou separador na montagem do email)
- CTA com botão

```
⭐ [Título do destaque do mês]
[Descrição do serviço ou oferta em 2-3 frases — sem inventar preço]
[Diferencial: parcelamento 18x / garantia BR Total / melhor preço — o mais adequado]

[BOTÃO: Agendar Agora →] → link para WhatsApp ou agendamento
```

---

**Bloco 4 — Novidade ou Institucional**
- Se houver novidade real: nova unidade, prêmio, conquista da rede
- Se não houver novidade real: sugerir tema institucional (ex: "Nosso compromisso com você", "Por que somos diferentes", "Conheça o BR Total")

```
📢 [Título da novidade ou tema institucional]
[Texto — 2-3 frases]
```

---

**Bloco 5 — CTA Final**
```
Sua unidade mais próxima está pronta para te atender!
📞 Ligue: 0800 942 4402
💬 WhatsApp: [link]
🗓️ Agende online: [link]

BR Pneus & Oficina — Muito mais que pneus.
```

---

### Rodapé padrão

```
Siga a gente nas redes: [Instagram] [Facebook]
[Endereço da sede ou "Encontre a unidade mais próxima"]
Você está recebendo este email porque é nosso cliente.
[Cancelar inscrição] | [Atualizar preferências]
```

---

## Variáveis de personalização disponíveis

| Variável | Descrição |
|----------|-----------|
| `{{nome}}` | Primeiro nome do cliente |
| `{{cidade}}` | Cidade onde o cliente é atendido |
| `{{ultima_visita}}` | Data da última visita à loja |
| `{{servico_realizado}}` | Último serviço realizado |

---

## Regras de linguagem

- Tom acolhedor e pessoal — parece que veio de uma pessoa, não de uma empresa
- Frases curtas, parágrafos de no máximo 2-3 linhas
- Nunca inventar preço ou prazo
- Cada bloco deve ter pelo menos 1 link ou CTA

---

## Onde salvar
```
output/emails/newsletter-[mes]-[ano].md
```
**Exemplo:** `output/emails/newsletter-julho-2026.md`
