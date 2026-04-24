# Skill: Sequência de Emails de Boas-Vindas

## Comando
`/email-boas-vindas [trigger]`

## O que faz
Gera a sequência completa de onboarding por email para novos clientes da BR Pneus & Oficina — 4 emails com intervalos progressivos, cada um com objetivo distinto, variações de assunto para teste A/B e lógica condicional.

---

## Parâmetros

| Parâmetro | Obrigatório | Opções |
|-----------|-------------|--------|
| `trigger` | Sim | `primeiro-servico`, `cadastro-site`, `whatsapp`, `indicacao` |

- **primeiro-servico** — Cliente acabou de realizar o primeiro serviço na loja
- **cadastro-site** — Se cadastrou no site/landing page sem comprar ainda
- **whatsapp** — Primeiro contato veio via WhatsApp (sem visita ainda)
- **indicacao** — Veio por indicação de outro cliente

---

## Estrutura do Output

### Email 1 — Bem-vindo (envio: imediato após o trigger)

**Assuntos (3 variações para teste A/B):**
- A: `Bem-vindo à BR Pneus, {{nome}}! 🚗`
- B: `{{nome}}, você tomou a decisão certa`
- C: `A família BR Pneus tem um novo membro!`

**Preview text:** `Obrigado pela confiança — aqui começa uma parceria duradoura.`

**Corpo:**
- Saudação personalizada: "Oi, {{nome}}! Bem-vindo à família BR Pneus & Oficina!"
- Agradecimento pela confiança (1 frase, calorosa)
- Apresentação da marca em 3–4 frases: origem, missão, diferenciais principais (preço, garantia BR Total, parcelamento em até 18x)
- O que o cliente pode esperar: atendimento proativo, lembrete de revisão, canais de suporte
- CTA principal: salvar o número de WhatsApp da unidade `{{unidade_whatsapp}}`
- Rodapé: tagline "Muito mais que pneus" + link de descadastro

**Tom:** acolhedor, pessoal, animado — como dar as boas-vindas a um amigo

---

### Email 2 — Conheça nossos serviços (envio: 3 dias após Email 1)

> Enviar apenas se o Email 1 foi aberto. Se não abriu: reenviar Email 1 com assunto alternativo antes de avançar.

**Assuntos (3 variações):**
- A: `{{nome}}, a BR Pneus é muito mais que pneus`
- B: `Você sabia que a gente faz tudo isso pelo seu carro?`
- C: `Tudo que seu carro precisa, num só lugar`

**Preview text:** `De alinhamento a injeção eletrônica — conheça o que preparamos para você.`

**Corpo:**
- Abertura: "{{nome}}, você já conhece nossos pneus — mas a BR Pneus & Oficina é muito mais que isso."
- Apresentação dos serviços de forma narrativa (não lista fria): como cada serviço ajuda no dia a dia do motorista
- Destaque para o serviço mais relevante ao trigger:
  - `primeiro-servico` com pneu → destacar alinhamento + balanceamento
  - `primeiro-servico` com revisão → destacar pneus com maior mix do mercado
  - `cadastro-site` → destacar o serviço mais pesquisado na página de origem
  - `indicacao` → destacar o que o cliente indicador costuma usar
- Diferencial: Garantia BR Total (1 ano em produtos e serviços)
- CTA: "Agende seu próximo serviço — e aproveite a condição especial de novo cliente"
- Link: WhatsApp da unidade `{{unidade_whatsapp}}`

**Tom:** educativo, útil — "somos seus parceiros no cuidado do carro"

---

### Email 3 — Dica + Prova Social (envio: 7 dias após Email 1)

> Enviar independente de abertura dos emails anteriores (exceto se o cliente descadastrou).

**Assuntos (3 variações):**
- A: `1 dica rápida para durar mais com seus pneus, {{nome}}`
- B: `O que {{X}} mil motoristas já descobriram sobre a BR Pneus`
- C: `{{nome}}, essa dica pode te poupar dinheiro`

**Preview text:** `Cuidado simples, economia real — veja o que nossos clientes falam.`

**Corpo:**
- Dica prática de cuidado automotivo (3–4 frases, relacionada ao trigger ou serviço principal)
  - Ex: "Calibrar os pneus todo mês aumenta em até 30% a vida útil deles — e ainda economiza combustível"
- Bloco de depoimentos (estrutura para inserir 2–3 depoimentos reais):
  ```
  ⭐⭐⭐⭐⭐ "{{depoimento_1}}" — {{cliente_1}}, {{cidade_1}}
  ⭐⭐⭐⭐⭐ "{{depoimento_2}}" — {{cliente_2}}, {{cidade_2}}
  ```
- Prova social: "Mais de {{X}} mil atendimentos realizados pela rede BR Pneus & Oficina"
- CTA duplo: avaliar no Google | seguir no Instagram
- Links: `{{link_google_maps_unidade}}` | `{{link_instagram}}`

**Tom:** confiável, social proof — "você fez a escolha certa"

---

### Email 4 — Oferta de Retorno (envio: 14 dias após Email 1)

**Assuntos (3 variações):**
- A: `{{nome}}, preparamos algo especial para você`
- B: `Faz 2 semanas — aqui está sua condição exclusiva`
- C: `Oferta só para quem é novo na família BR Pneus`

**Preview text:** `Válida por 7 dias — não deixa passar, {{nome}}.`

**Corpo:**
- Abertura: "{{nome}}, faz 2 semanas que você conheceu a BR Pneus & Oficina!"
- Oferta exclusiva de retorno (sugestões — escolher uma conforme o contexto):
  - Desconto em serviço relacionado ao primeiro serviço
  - Check-up gratuito na próxima visita
  - Parcelamento estendido em condição especial
- Validade: 7 dias (urgência real, não falsa)
- Instrução clara: "Use o código **BEM-VINDO** ao agendar pelo WhatsApp"
- CTA: "Agendar agora" → link WhatsApp da unidade com mensagem pré-preenchida
- Rodapé: link de descadastro

**Tom:** generoso, com urgência genuína — "queremos te ver de volta"

---

## Lógica Condicional do Fluxo

```
[Email 1 enviado]
    ↓ esperar 2 dias
[Abriu Email 1?]
    ├── SIM → enviar Email 2 no dia 3
    └── NÃO → reenviar Email 1 (assunto alternativo) → esperar 1 dia
              ├── Abriu agora? SIM → enviar Email 2
              └── NÃO → pular Email 2, enviar Email 3 no dia 7
[Email 3 enviado no dia 7 — independente]
[Email 4 enviado no dia 14 — independente]
[Após Email 4: mover para fluxo de nutrição regular]
```

---

## Para Cada Email — Especificações Técnicas

- **Versão texto puro** (fallback para clientes sem HTML)
- **Sugestão de layout:** header com logo BR Pneus, blocos visuais por seção, botão CTA em `#F5A623`, rodapé com endereço da unidade e link de descadastro
- **Mobile-first:** botões com mínimo 44px de altura, fonte mínima 16px, imagens com alt text
- **Métricas esperadas por email:**
  - Email 1: taxa de abertura ~45–55%, CTR ~8–12%
  - Email 2: taxa de abertura ~30–40%, CTR ~5–10%
  - Email 3: taxa de abertura ~25–35%, CTR ~4–8%
  - Email 4: taxa de abertura ~20–30%, CTR ~6–12% (oferta)

---

## Salvar em
`output/emails/boas-vindas-[trigger]-[data].md`

---

## Referências Cruzadas
- Contexto de marca: `CLAUDE.md`
- Personas: `knowledge/personas.md`
- Fluxo completo: usar `/fluxo-automacao novo-cliente` para o contexto multicanal
