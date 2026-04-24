# Skill: Programa de Fidelidade

## Comando
`/programa-fidelidade [tipo]`

## O que faz
Gera a estrutura completa de um programa de fidelidade para a BR Pneus & Oficina — mecânica, recompensas, comunicação, viabilidade financeira e plano de implementação.

---

## Parâmetros

| Parâmetro | Obrigatório | Opções |
|-----------|-------------|--------|
| `tipo` | Sim | `pontos`, `carimbo`, `nivel`, `indicacao`, `completo` |

- **pontos** — Sistema de pontos por valor gasto, resgatáveis em serviços
- **carimbo** — Cartão fidelidade digital: a cada X serviços, ganha 1 grátis
- **nivel** — Níveis progressivos (bronze → prata → ouro) com benefícios crescentes
- **indicacao** — Programa de indicação: indique e ganhe (focado em aquisição)
- **completo** — Gera todos os modelos para comparação e escolha

---

## Estrutura do Output

---

### 1. Conceito do Programa

**Nome (3 sugestões alinhadas com a marca BR Pneus & Oficina):**
- Sugestão 1: "BR Total+" — extensão natural do programa de garantia BR Total
- Sugestão 2: "Clube BR Pneus" — senso de pertencimento e comunidade
- Sugestão 3: "BR Fidelidade" — direto e claro para o público classe B/C

**Proposta de valor (1 frase):** "Quanto mais você cuida do seu carro com a BR Pneus, mais você ganha."

**Mecânica resumida (1 frase por modelo):**
- Pontos: "A cada R$ 1 gasto, você acumula 1 ponto — e troca por serviços gratuitos."
- Carimbo: "Faça 10 trocas de óleo e ganhe a 11ª grátis."
- Nível: "Suba de Bronze a Ouro e desbloqueie benefícios exclusivos a cada visita."
- Indicação: "Indique um amigo — vocês dois ganham desconto na próxima visita."

**Público-alvo principal:** clientes regulares (1–2 visitas/ano) e VIPs (3+ visitas/ano)

---

### 2. Mecânica Detalhada

---

#### Modelo PONTOS

**Como acumula:**
| Ação | Pontos |
|------|--------|
| R$ 1 gasto em qualquer serviço | 1 ponto |
| Troca de pneu (jogo completo) | +50 pontos bônus |
| Revisão completa | +30 pontos bônus |
| Avaliação 5 estrelas no Google | +20 pontos (1x por semestre) |
| Indicação convertida | +100 pontos por indicado |
| Aniversário | +50 pontos |

**Como resgata:**
| Pontos | Recompensa |
|--------|-----------|
| 100 pontos | Calibragem + lavagem simples grátis |
| 300 pontos | Alinhamento simples grátis |
| 500 pontos | Balanceamento (4 rodas) grátis |
| 800 pontos | Troca de óleo (óleo + filtro) grátis |
| 1.500 pontos | Revisão completa com 50% de desconto |
| 3.000 pontos | Jogo de 4 pneus com desconto especial |

**Validade:** pontos expiram após 12 meses sem atividade  
**Regras:** pontos não são transferíveis, não têm valor monetário, não acumulam em promoções com desconto especificado  
**Termos simplificados:** "Você acumula, você decide quando resgatar — simples assim."

---

#### Modelo CARIMBO

**Como funciona:**
- Cada serviço elegível = 1 carimbo
- Ao completar 10 carimbos → 1 serviço grátis (de igual ou menor valor ao menor serviço dos 10)

**Serviços elegíveis:**
- Troca de óleo ✅
- Alinhamento ✅
- Balanceamento ✅
- Troca de pneu (unitário) ✅
- Revisão completa ✅ (vale 2 carimbos)
- Higienização de ar condicionado ✅
- Troca de filtro ✅

**Serviço gratuito:** cliente escolhe entre os serviços básicos elegíveis  
**Validade do cartão:** 24 meses para completar os 10 carimbos  
**Digital:** QR code por cliente no sistema, sem cartão físico necessário  
**Simplicidade:** ponto forte — qualquer cliente entende imediatamente

---

#### Modelo NÍVEL

**Critérios e benefícios:**

| Nível | Critério de Entrada | Critério de Manutenção |
|-------|--------------------|-----------------------|
| Bronze | 1ª visita | Qualquer visita nos últimos 12 meses |
| Prata | 3 visitas no ano | 3 visitas a cada 12 meses |
| Ouro | 6 visitas no ano | 5 visitas a cada 12 meses |

**Benefícios por nível:**

| Benefício | Bronze | Prata | Ouro |
|-----------|--------|-------|------|
| Garantia BR Total | ✅ 1 ano | ✅ 1 ano | ✅ 1 ano |
| Parcelamento até 18x | ✅ | ✅ | ✅ |
| Agendamento prioritário | ❌ | ✅ | ✅ |
| Desconto em serviços | ❌ | 5% | 10% |
| Check-up gratuito (anual) | ❌ | ❌ | ✅ |
| Atendimento VIP | ❌ | ❌ | ✅ |
| Brinde de aniversário | ❌ | Pequeno | Premium |
| Acesso a ofertas exclusivas | ❌ | ✅ | ✅ |
| Lembrete personalizado | ✅ | ✅ | ✅ proativo |

**Comunicação por nível:**
- Subiu de nível → mensagem de parabéns + explicação dos novos benefícios
- Em risco de rebaixar → lembrete gentil ("você está perto de manter seu nível Prata")
- Rebaixou → mensagem empática + incentivo para voltar a subir

---

#### Modelo INDICAÇÃO

**Mecânica:**
- Cliente indica um amigo → amigo vem, realiza serviço
- **Quem indicou ganha:** desconto ou bônus na próxima visita
- **Quem foi indicado ganha:** benefício exclusivo de primeiro serviço

**Recompensas sugeridas (escolher um combo):**

| Opção | Indicador Ganha | Indicado Ganha |
|-------|----------------|----------------|
| A | 10% na próxima visita | 10% no primeiro serviço |
| B | R$ 20 em crédito | Check-up gratuito |
| C | Carimbo duplo na próxima visita | Alinhamento grátis na 1ª visita |

**Como rastrear:**
- Código único por cliente: "Seu código de indicação: BRPNEUS-{{codigo}}"
- Link de indicação personalizado: bit.ly/brp-indica-{{codigo}}
- O indicado informa o código ao chegar na loja OU usa o link para agendar

**Templates de mensagem para o cliente indicar (pronto para compartilhar no WhatsApp):**
```
Oi! Você cuida do seu carro? Eu faço tudo na BR Pneus & Oficina e recomendo muito!
Se quiser ir pela primeira vez, usa meu código {{codigo}} e já ganha uma condição especial.
Chama eles no WhatsApp: {{unidade_whatsapp}}
```

**Meta por unidade:** 10–15 indicações convertidas por mês  
**Custo estimado:** baixo (desconto em serviços — custo marginal reduzido)

---

### 3. Recompensas por Faixa de Custo

| Custo para a empresa | Exemplos de Recompensa |
|---------------------|----------------------|
| Zero (R$ 0) | Prioridade no agendamento, acesso a vagas exclusivas, atendimento VIP, lembrete personalizado |
| Baixo (R$ 5–20) | Brinde simbólico (aromatizante, chaveiro da marca), crédito em visita futura, calibragem grátis |
| Médio (R$ 30–80) | Alinhamento grátis, balanceamento, troca de filtro, desconto 10–15% em serviços |
| Alto (R$ 100–300+) | Troca de óleo completa grátis, revisão com desconto de 50%, jogo de pneus com condição especial |

---

### 4. Comunicação do Programa

**Lançamento — Material necessário:**
- Post de lançamento para Instagram (briefing para `/fluxo-automacao`)
- Email de lançamento para toda a base
- WhatsApp para clientes ativos
- Material no PDV: display de balcão, cartaz A4, card no espelho retrovisor

**Script para a equipe explicar ao cliente (30 segundos):**
```
"[Nome], você sabia que agora você acumula [pontos/carimbos] aqui na BR Pneus? 
É bem simples: [explicação rápida da mecânica]. 
Já vou cadastrar você! É grátis e você começa a ganhar hoje mesmo."
```

**FAQ do programa (10 perguntas para treinar equipe e publicar no site):**
1. Como eu me cadastro no programa?
2. O que são os pontos/carimbos e como acumulo?
3. Onde vejo quantos pontos/carimbos tenho?
4. Como faço para resgatar?
5. Os pontos expiram?
6. Posso transferir para outra pessoa?
7. Vale para todas as unidades da BR Pneus?
8. Quais serviços participam?
9. E se eu perder o acesso ao app/cadastro?
10. Tenho algum problema com o programa, o que faço?

---

### 5. Viabilidade Financeira

| Métrica | Estimativa |
|---------|-----------|
| Custo médio de recompensa por cliente ativo | R$ 15–40/ano |
| Aumento esperado de recorrência | +1 visita/ano por cliente no programa |
| Ticket médio por visita | Usar dados reais da unidade |
| ROI estimado | Cada R$ 1 investido em recompensas → R$ 4–8 em revenue adicional |
| Break-even | 3–6 meses após lançamento |

**Métricas para acompanhar mensalmente:**
- Clientes cadastrados no programa
- Clientes ativos (resgataram ou acumularam no mês)
- Custo total de recompensas resgatadas
- Aumento de recorrência vs. antes do programa
- NPS dos participantes vs. não-participantes

---

### 6. Implementação

**Ferramenta sugerida (por orçamento):**
- Custo zero: planilha Google Sheets + WhatsApp manual (para MVP, até 200 clientes)
- Baixo custo: CRM simples com campo customizável (Pipedrive, RD Station)
- Ideal: módulo de fidelidade integrado ao sistema de gestão da loja

**Cronograma de lançamento (4 semanas):**

| Semana | Atividade |
|--------|----------|
| 1 | Definir mecânica final, configurar no sistema, criar materiais de PDV |
| 2 | Treinar equipe de todas as unidades (script, FAQ, cadastro) |
| 3 | Lançamento suave: apenas clientes VIP e Regulares por WhatsApp |
| 4 | Lançamento completo: email para toda a base + posts no Instagram |

**Piloto sugerido:**
- Testar em 1–2 unidades por 60 dias antes de expandir para a rede
- Unidades sugeridas para piloto: Araraquara (matriz) + 1 unidade de menor porte
- Critério de sucesso do piloto: +15% de recorrência nos clientes cadastrados

---

## Salvar em
`output/emails/programa-fidelidade-[tipo]-[data].md`

---

## Referências Cruzadas
- Contexto de marca: `CLAUDE.md`
- Personas: `knowledge/personas.md`
- Templates de comunicação: `/whatsapp-template indicacao` e `/email-boas-vindas`
- Fluxo de indicação: `/fluxo-automacao indicacao`
