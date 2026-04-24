# Skill: Campanha de Reativação de Clientes Inativos

## Comando
`/email-reativacao [segmento]`

## O que faz
Gera uma sequência completa e multicanal para reativar clientes que pararam de visitar a BR Pneus & Oficina — com touchpoints progressivos via email, WhatsApp e SMS, ajustando o tom e a oferta conforme o grau de inatividade.

---

## Parâmetros

| Parâmetro | Obrigatório | Opções |
|-----------|-------------|--------|
| `segmento` | Sim | `inativo-6meses`, `perdido-12meses`, `orcamento-abandonado` |

- **inativo-6meses** — Sem visita há 6–12 meses (cliente que "sumiu")
- **perdido-12meses** — Sem visita há 12+ meses (cliente que foi embora)
- **orcamento-abandonado** — Pediu orçamento, nunca agendou (oportunidade quente perdida)

---

## Estrutura do Output

### Touchpoint 1 — Email "Sentimos sua falta" (Dia 0)

**Assuntos por segmento:**

*inativo-6meses:*
- A: `{{nome}}, faz tempo que não te vemos por aqui`
- B: `Tá tudo bem com o carro, {{nome}}?`
- C: `Sentimos sua falta na BR Pneus {{unidade}}`

*perdido-12meses:*
- A: `{{nome}}, faz mais de 1 ano — o carro está bem?`
- B: `Olha quem a gente não vê há muito tempo...`
- C: `{{nome}}, a BR Pneus evoluiu muito — vem conhecer`

*orcamento-abandonado:*
- A: `{{nome}}, você ainda precisa de {{servico_orcamento}}?`
- B: `Seu orçamento ainda está disponível, {{nome}}`
- C: `Condição especial para o serviço que você consultou`

**Preview text:** `A gente não esqueceu de você. Veja o que preparamos.`

**Corpo:**

*inativo-6meses / perdido-12meses:*
- Abertura amigável, zero cobrança: "{{nome}}, faz tempo que não te vemos na BR Pneus & Oficina {{unidade}}! Esperamos que você e seu carro estejam bem."
- Novidade desde a última visita (escolher 1–2 relevantes):
  - Novo serviço disponível
  - Melhoria no atendimento
  - Conquista (prêmio, avaliação, número de clientes)
  - Programa de fidelidade lançado
- Pergunta genuína: "O {{veiculo}} continua rodando firme? Se precisar de qualquer coisa, estamos aqui."
- CTA suave: "Bora dar uma passada? Só pra ver como você está 😊"
- Link: WhatsApp da unidade `{{unidade_whatsapp}}`
- Tom: amigável, saudade genuína — zero pressão, zero cobrança

*orcamento-abandonado:*
- Abertura: "{{nome}}, vi aqui que você consultou sobre {{servico_orcamento}} conosco."
- Reconexão: "Não sei se conseguiu resolver em outro lugar ou se ainda está buscando — mas se ainda precisar, estamos aqui."
- Manter o orçamento: "Posso verificar a condição atual para você — o preço pode até ter melhorado."
- CTA: "Responda este email ou chame no WhatsApp — sem compromisso"

---

### Touchpoint 2 — WhatsApp Personalizado (Dia 3)

> Enviar apenas se não agendou após o Email 1.

**Template por segmento (máx 500 chars, tom pessoal):**

*inativo-6meses:*
```
Oi, {{nome}}! Aqui é {{nome_atendente}} da BR Pneus & Oficina {{unidade}}. 
Faz uns {{periodo}} que você não passa por aqui — tudo bem com o carro? 
Se precisar de qualquer serviço, tenho uma condição especial preparada pra você 🚗
Quer que eu verifique o que está no prazo para o seu veículo? É só falar!
```

*perdido-12meses:*
```
Oi, {{nome}}! Tudo bem? Sou {{nome_atendente}} da BR Pneus & Oficina {{unidade}}.
Faz mais de 1 ano que não te vemos! A gente evoluiu bastante — novos serviços, mesma qualidade.
Tenho uma oferta de retorno preparada especialmente pra você. Posso contar mais detalhes?
```

*orcamento-abandonado:*
```
Oi, {{nome}}! Aqui é {{nome_atendente}} da BR Pneus & Oficina {{unidade}}.
Vi que você consultou sobre {{servico_orcamento}} — conseguiu resolver ou ainda está buscando?
Se quiser, atualizo o orçamento pra você hoje. Pode ser que a condição ficou ainda melhor 😊
```

**Regras de envio do WhatsApp:**
- Horário: 9h–18h, segunda a sábado
- Tom: pessoal, como se fosse o atendente que conhece o cliente
- Não enviar se já houve resposta ao email (cliente engajado)
- Se não responder em 3 dias → avançar para Touchpoint 3

---

### Touchpoint 3 — Email com Oferta Irresistível (Dia 7)

**Assuntos por segmento:**

*inativo-6meses:*
- A: `{{nome}}, temos um presente para você voltar`
- B: `Oferta exclusiva — só para quem a gente sente falta`
- C: `{{nome}}, 10 dias para aproveitar isso`

*perdido-12meses:*
- A: `{{nome}}, essa oferta é a nossa forma de dizer: sentimos sua falta`
- B: `Volta pra família BR Pneus — e veja o que preparamos`
- C: `Oferta de reativação — a mais generosa que fazemos`

*orcamento-abandonado:*
- A: `{{nome}}, melhoramos a condição do seu orçamento`
- B: `Novo orçamento para {{servico_orcamento}} — agora com benefício`
- C: `Última chance para a condição especial que separamos para você`

**Preview text:** `Válida por 10 dias. Preparamos algo especial para te reconquistar.`

**Corpo:**
- Abertura direta: "{{nome}}, queremos muito te ver de volta na BR Pneus & Oficina!"
- Oferta exclusiva de reativação (sugestões — escalar conforme o segmento):
  - *inativo-6meses*: desconto moderado ou serviço complementar grátis
  - *perdido-12meses*: diagnóstico gratuito + desconto generoso no próximo serviço, ou check-up completo gratuito
  - *orcamento-abandonado*: condição melhorada no serviço consultado + facilidade de agendamento
- Validade clara: "Esta oferta expira em {{data_validade}} — 10 dias a partir de hoje."
- Urgência genuína sem pressão excessiva: "Vagas limitadas por semana."
- CTA principal: "Agendar com código VOLTEI" → link WhatsApp com mensagem pré-preenchida
- CTA secundário: responder o email diretamente
- Rodapé: link de descadastro + "Não quer mais receber mensagens? Clique aqui e respeitamos."

---

### Touchpoint 4 — SMS de Última Chance (Dia 14)

> Enviar apenas se não houve resposta a nenhum touchpoint anterior.

**Mensagem por segmento (MÁXIMO 160 caracteres — contar exatamente):**

*inativo-6meses (156 chars):*
```
BR Pneus {{unidade}}: {{nome}}, sua oferta exclusiva vence HOJE! Agende pelo link: {{link_curto}} Resp SAIR p/ cancelar
```

*perdido-12meses (158 chars):*
```
BR Pneus {{unidade}}: {{nome}}, ultima chance da oferta de retorno. Valida so hoje: {{link_curto}} Resp SAIR p/ cancelar
```

*orcamento-abandonado (156 chars):*
```
BR Pneus {{unidade}}: {{nome}}, seu orcamento vence hoje! Condicao especial. Agende: {{link_curto}} Resp SAIR p/ cancelar
```

**Regras do SMS:**
- Horário de envio: 10h–18h em dias úteis
- SEMPRE incluir identificação do remetente
- SEMPRE incluir opção de descadastro
- NUNCA ultrapassar 160 caracteres (SMS duplo = custo dobrado)

---

## Lógica do Fluxo Completo

```
[Trigger: cliente identificado como inativo]
    ↓ Dia 0
[Touchpoint 1: Email "Sentimos sua falta"]
    ↓ esperar 3 dias
[Respondeu/agendou?]
    ├── SIM → encerrar fluxo de reativação, entrar no pós-serviço
    └── NÃO → Touchpoint 2: WhatsApp personalizado
              ↓ esperar 4 dias
              [Respondeu/agendou?]
              ├── SIM → encerrar fluxo
              └── NÃO → Touchpoint 3: Email com oferta
                        ↓ esperar 7 dias
                        [Agendou?]
                        ├── SIM → encerrar fluxo
                        └── NÃO → Touchpoint 4: SMS última chance
                                  ↓
                                  [Após 7 dias sem resposta]
                                  → Mover para segmento "perdido definitivo"
                                  → Parar comunicação de marketing
                                  → Manter na base para campanhas sazonais anuais
```

---

## Condições de Saída

- Cliente agendou/comprou → sai do fluxo imediatamente
- Cliente pediu descadastro → sai de TODOS os fluxos, marcar como opt-out na base
- Cliente reclamou → sai dos fluxos de marketing, criar task para atendimento manual
- Chegou ao fim sem resposta → segmento "perdido definitivo" — apenas campanhas sazonais 1x/ano

---

## Métricas de Sucesso

| Métrica | Meta |
|---------|------|
| Taxa de abertura Email 1 | 25–35% |
| Taxa de resposta WhatsApp | 10–20% |
| Taxa de abertura Email 3 (oferta) | 20–30% |
| Taxa de clique SMS | 5–10% |
| **Taxa de reativação total** | **8–15% do segmento** |
| Revenue recuperado por campanha | Calcular: clientes reativados × ticket médio |
| Custo por reativação vs CAC novo cliente | Meta: reativação deve custar 3–5x menos |

---

## Salvar em
`output/emails/reativacao-[segmento]-[data].md`

---

## Referências Cruzadas
- Contexto de marca: `CLAUDE.md`
- Personas: `knowledge/personas.md`
- Fluxo completo: `/fluxo-automacao reativacao`
