# Skill: Email Pós-Serviço

## Comando
`/email-pos-servico [servico-realizado]`

## O que faz
Gera a sequência de follow-up enviada após o cliente realizar um serviço na BR Pneus & Oficina: agradecimento com dicas específicas do serviço, pesquisa NPS e pedido de avaliação no Google — com cross-sell sutil integrado.

---

## Parâmetros

| Parâmetro | Obrigatório | Exemplos |
|-----------|-------------|---------|
| `servico-realizado` | Sim | `troca-de-pneu`, `alinhamento`, `balanceamento`, `revisao-completa`, `troca-de-oleo`, `ar-condicionado`, `freios`, `correia-dentada`, `injecao-eletronica` |

---

## Estrutura do Output

### Email 1 — Agradecimento + Dicas (envio: 24h após o serviço)

**Assuntos (3 variações):**
- A: `{{nome}}, obrigado pela confiança! Veja as dicas pós-{{servico}}`
- B: `Tudo certo com seu carro, {{nome}} — 2 dicas importantes`
- C: `Serviço concluído! Aqui está o que você precisa saber`

**Preview text:** `Garantia BR Total ativa. Cuide bem do serviço com essas dicas.`

**Corpo:**
- Agradecimento personalizado: "{{nome}}, obrigado por confiar na BR Pneus & Oficina {{unidade}}! Foi um prazer atender você."
- Resumo do serviço: "Realizamos {{servico}} no seu veículo em {{data_servico}}."
- Lembrete da Garantia BR Total: "Você tem 1 ano de garantia neste serviço. Qualquer dúvida, estamos aqui."
- **Dicas pós-serviço (específicas por serviço — gerar as aplicáveis):**
  - `troca-de-pneu`: "Nos primeiros 500 km, verifique a calibragem. Evite frenagens bruscas nas primeiras horas."
  - `alinhamento`: "Evite buracos e meio-fios nos primeiros 2 dias para o alinhamento assentar corretamente."
  - `balanceamento`: "Se sentir qualquer vibração no volante após 100 km, nos avise — pode precisar de ajuste."
  - `troca-de-oleo`: "Próxima troca recomendada: {{data_proxima_troca}} ou {{km_proxima_troca}} km."
  - `revisao-completa`: "Seu carro está em dia! Guarde o comprovante — próxima revisão em 12 meses ou 10.000 km."
  - `ar-condicionado`: "Deixe o ar ligado por 5 minutos com as janelas abertas nas primeiras utilizações."
  - `freios`: "Nos primeiros 100 km, faça frenagens progressivas para os freios assentarem."
  - `correia-dentada`: "Próxima troca recomendada: {{km_proxima_correia}} km. Anote para não esquecer!"
- CTA: "Teve algum problema ou dúvida? Fale conosco agora" → link WhatsApp direto `{{unidade_whatsapp}}`
- **Cross-sell sutil (1 frase, não intrusiva):**
  - Trocou pneu → "Na próxima visita, que tal checar o alinhamento? Pneu novo + alinhamento = máximo rendimento."
  - Alinhamento → "Enquanto estiver por aqui, vale checar a suspensão também — suspensão desregulada desfaz o alinhamento."
  - Troca de óleo → "Aproveite a próxima troca para uma revisão completa — é rápido e te dá paz de espírito."
  - Revisão completa → "Já que a revisão está em dia, que tal checar os pneus? Temos o maior mix da região."

**Tom:** cuidadoso, atencioso — "nos importamos com você depois que sai da loja"

---

### Email 2 — Pesquisa NPS (envio: 48h após o serviço)

**Assuntos (3 variações):**
- A: `{{nome}}, 30 segundos. Como foi na BR Pneus?`
- B: `Sua opinião vale muito para nós, {{nome}}`
- C: `Como foi a experiência? Uma pergunta rápida`

**Preview text:** `Leva menos de 1 minuto — e nos ajuda a melhorar sempre.`

**Corpo:**
- Abertura direta: "{{nome}}, como foi sua experiência na BR Pneus & Oficina {{unidade}}?"
- Pesquisa NPS simplificada:
  ```
  De 0 a 10, o quanto você recomendaria a BR Pneus para um amigo?

  [0] [1] [2] [3] [4] [5] [6] [7] [8] [9] [10]
  (botões clicáveis, cores: 0-6=vermelho, 7-8=amarelo, 9-10=verde)
  ```
- Pergunta aberta opcional (aparece após a nota): "Quer nos contar mais? (opcional)"
- Lógica de redirecionamento:
  - Nota 0–6 → página de desculpas + formulário de feedback + WhatsApp direto com gerente
  - Nota 7–8 → agradecimento + sugestão de melhoria
  - Nota 9–10 → agradecimento + convite para avaliar no Google (preparar Email 3)
- Agradecimento antecipado: "Obrigado por nos ajudar a ser ainda melhores!"

**Tom:** breve, respeitoso com o tempo do cliente — sem enrolação

---

### Email 3 — Pedido de Avaliação Google (envio: 5–7 dias após o serviço)

> **Critério de envio:** Enviar se NPS 9 ou 10 — OU se não respondeu a pesquisa (fallback neutro).
> **Não enviar:** se NPS 0–6 (cliente insatisfeito — priorizar atendimento, não avaliação).

**Assuntos (3 variações):**
- A: `{{nome}}, sua avaliação ajuda outros motoristas`
- B: `1 minuto para ajudar quem está buscando uma boa oficina`
- C: `Você gostou? Conta para o Google também 😊`

**Preview text:** `Só 3 cliques — e faz uma grande diferença para outros motoristas.`

**Corpo:**
- Abertura: "{{nome}}, você ficou satisfeito com o atendimento na BR Pneus & Oficina {{unidade}} — ficamos muito felizes!"
- Pedido gentil: "Sua opinião no Google ajuda outros motoristas a encontrar um serviço de qualidade."
- Passo a passo simples:
  1. Clique no botão abaixo
  2. Escolha a nota (esperamos merecer 5 estrelas!)
  3. Escreva o que achou — pode ser bem curtinho
- Botão CTA: "Avaliar no Google" → `{{link_google_maps_unidade}}`
- Tom de encerramento: "Obrigado por fazer parte da família BR Pneus & Oficina. Até a próxima!"
- Assinatura: equipe da unidade `{{unidade}}`

**Tom:** gentil, sem pressão — pedir como um favor, não uma obrigação

---

## Lógica Condicional do Fluxo

```
[Serviço realizado]
    ↓ 24h
[Email 1: Agradecimento + Dicas]
    ↓ 24h
[Email 2: NPS]
    ├── Respondeu NPS 9-10 → Email 3 em 5 dias (avaliação Google)
    ├── Respondeu NPS 7-8 → Apenas agradecimento, sem Email 3
    ├── Respondeu NPS 0-6 → Alerta interno para equipe + atendimento manual
    └── Não respondeu → Email 3 em 7 dias (fallback neutro)
[Após sequência: cliente entra no fluxo de lembrete de revisão]
```

---

## Especificações Técnicas

- **Versão texto puro** para cada email (fallback)
- **Mobile-first:** botões de NPS com mínimo 44px, espaçados para evitar toque errado
- **Métricas esperadas:**
  - Email 1 (agradecimento): abertura ~50–60%, CTR ~5%
  - Email 2 (NPS): abertura ~35–45%, taxa de resposta ~15–25%
  - Email 3 (avaliação): abertura ~40–50%, CTR para Google ~20–30%

---

## Salvar em
`output/emails/pos-servico-[servico]-[data].md`

---

## Referências Cruzadas
- Contexto de marca: `CLAUDE.md`
- Personas: `knowledge/personas.md`
- Fluxo completo pós-serviço: `/fluxo-automacao pos-servico`
