---
name: video-servico
description: Gera roteiro de vídeo educativo sobre um serviço específico da BR Pneus & Oficina — explicando o que é, por que importa, quando fazer e como funciona na BR Pneus. Funciona como conteúdo de topo de funil E ferramenta de venda. Use sempre que precisar explicar um serviço em vídeo, criar conteúdo educativo automotivo, mostrar como funciona um serviço ou gerar vídeo que converte visualização em agendamento — mesmo que o pedido use termos como "video sobre alinhamento", "explicar o serviço em video", "vídeo educativo mecânica" ou "mostrar o serviço funcionando".
---

# Skill: Vídeo Educativo sobre um Serviço

## Comando
```
/video-servico [servico] [formato]
```

## Parâmetros
- **servico** (obrigatório): Serviço a explicar. Opções:
  - `alinhamento-3d` / `balanceamento` / `troca-de-pneu`
  - `troca-de-oleo` / `revisao-suspensao` / `sistema-de-freios`
  - `injecao-eletronica` / `ar-condicionado` / `correia-dentada`
  - `embreagem` / `diagnostico-completo` / `limpeza-de-bico`
  - Ou descrever livremente qualquer serviço do catálogo BR Pneus
- **formato** (obrigatório): Como entregar o conteúdo:
  - `reels` — versão 30-60s para Instagram (resumo impactante)
  - `shorts` — versão 30-60s para YouTube (SEO + educativo)
  - `youtube` — versão completa 3-5min (autoridade + conversão)
  - `kit` — gera os 3 formatos de uma vez (Reels + Shorts + YouTube)

---

## Por que vídeo educativo vende

O cliente que entende o serviço tem **3x mais chance de aceitar o orçamento** sem pechinchar. Vídeo educativo sobre alinhamento faz o cliente chegar à loja já convencido de que precisa — e já confiando na marca que o educou.

Além disso: vídeos educativos têm longevidade. Um Reels sobre "o que é alinhamento 3D" gravado hoje gera visualizações e agendamentos por meses.

---

## Base de Informações por Serviço

*(Usar para preencher os roteiros — adaptar ao serviço selecionado)*

| Serviço | O que é | Frequência ideal | Sinais de que precisa | Consequência de não fazer |
|---------|---------|-----------------|----------------------|--------------------------|
| Alinhamento 3D | Ajuste dos ângulos das rodas para ficarem paralelas | A cada 10.000km ou ao trocar pneu | Puxar para um lado, desgaste irregular do pneu | Pneu dura 40% menos, combustível aumenta 5% |
| Balanceamento | Distribuição uniforme do peso da roda+pneu | A cada 10.000km junto com alinhamento | Vibração no volante ou no assoalho acima de 80km/h | Desgaste prematuro de pneu e suspensão |
| Troca de pneu | Substituição do pneu desgastado por novo | Quando sulco < 1,6mm ou a cada 40.000km | Sulco baixo, bolhas, cortes, 5 anos de uso | Aquaplaning, estouro, freagem comprometida |
| Troca de óleo | Substituição do lubrificante do motor | A cada 5.000–10.000km (conforme especificação) | Óleo escuro, baixo nível, motor barulhento | Desgaste interno do motor, superaquecimento |
| Revisão suspensão | Verificação e troca de amortecedores, buchas e pivôs | A cada 20.000km ou ao sentir sintomas | Batidas, oscilação em curva, dificuldade de controle | Perda de estabilidade, desgaste de pneus |
| Sistema de freios | Verificação e troca de pastilhas, discos e fluido | Pastilhas a cada 30.000km; fluido a cada 2 anos | Chiado, vibração ao frear, pedal mole | Risco de falha de freio |

*(Adicionar dados do serviço selecionado a partir deste modelo)*

---

## Estrutura do Output

### Formato: Reels (30-60s)

```
[CENA 1 — GANCHO] ⏱️ 0s–3s
📱 Câmera: Close na consequência de NÃO fazer o serviço (desgaste, sujeira, peça gasta)
🗣️ Fala: "[Consequência forte do não fazer — provoca medo ou curiosidade]"
📝 Texto na tela: "[Problema em destaque — ex: 'PNEU CARECA = RISCO DE VIDA ⚠️']"
🔊 Som: Trending de alerta ou beat chamativo

[CENA 2 — O QUE É] ⏱️ 3s–12s
📱 Câmera: Plano aberto mostrando o equipamento ou o serviço em andamento
🗣️ Fala: "[Serviço] é quando a gente [explicação em 1 frase simples e visual]."
📝 Texto na tela: "O QUE É: [definição em 5 palavras]"
✂️ Corte para close no detalhe do serviço

[CENA 3 — POR QUE IMPORTA] ⏱️ 12s–22s
📱 Câmera: Alternância entre mecânico falando + visual do serviço
🗣️ Fala: "Sem isso, [consequência 1] e [consequência 2]."
📝 Texto na tela: "Sem [serviço]: [consequência resumida]"
✂️ Corte seco

[CENA 4 — QUANDO FAZER] ⏱️ 22s–32s
📱 Câmera: Close nas mãos mostrando sinal de desgaste OU mecânico falando
🗣️ Fala: "Faça a cada [frequência]. Sinais de que tá na hora: [sinal 1] e [sinal 2]."
📝 Texto na tela: "⏰ A cada [frequência] | Sinais: [lista rápida]"

[CENA 5 — CTA] ⏱️ 32s–40s
📱 Câmera: Resultado final bonito (pneu novo, carro alinhado) + logo BR Pneus
🗣️ Fala: "Aqui na BR Pneus a gente faz com [diferencial]. Agenda pelo link na bio!"
📝 Texto na tela: "📱 AGENDA | BR Pneus & Oficina [Cidade]"
🔊 Som: Fade positivo
```

---

### Formato: Shorts (30-60s — otimizado para busca)

*Mesma estrutura do Reels, com adições de SEO:*

```
SEO do Short:
Título: "[O que é / Quando fazer / Quanto custa] [Serviço] — BR Pneus [Cidade]"
  Variação A: "O que é [Serviço] e quando fazer — guia rápido"
  Variação B: "Quanto custa [serviço] em 2026? — BR Pneus"
  Variação C: "[Serviço]: quando precisa e quando não precisa"

Descrição (50 palavras com keyword):
"[Keyword] é [definição em 1 frase]. Neste Short você aprende [o que vai aprender].
Agende na BR Pneus & Oficina: [WhatsApp] | [Cidade]"

Tags: [serviço], [serviço + carro], [quando fazer + serviço], [BR Pneus], [cidade]

Roteiro: idêntico ao Reels, com Call to Subscribe adicionado no final
```

---

### Formato: YouTube (3-5min — completo)

```
INTRO (0:00–0:30)
[Gancho: "Se você nunca entendeu o que realmente é [serviço], esse vídeo é pra você."]
[Roadmap: "Vou explicar o que é, como funciona, quando você precisa fazer e o que acontece se ignorar."]

CAPÍTULO 1: O QUE É (0:30–1:30)
Script:
"[Serviço] é o processo de [explicação simples em 2-3 frases].
Aqui na BR Pneus a gente usa [equipamento/diferencial] — que permite [benefício específico].
[Mostrar o equipamento funcionando durante a explicação]"

B-roll sugerido:
- [Cena 1 do serviço específico]
- [Cena 2 do serviço específico]
- [Detalhe do equipamento]

CAPÍTULO 2: POR QUE IMPORTA (1:30–2:30)
Script:
"Agora, por que isso é importante para você?
Quando [componente] está [problema], o que acontece é: [consequência 1], [consequência 2].
Isso não é só desconforto — é [impacto em segurança/economia].
[Dado ou comparação: ex: 'Pneu desalinhado desgasta 40% mais rápido — é dinheiro saindo pela roda']"

B-roll: mostrar o "problema" visualmente (pneu com desgaste irregular, barulho, etc.)

CAPÍTULO 3: QUANDO FAZER (2:30–3:30)
Script:
"Então, quando você deve fazer o [serviço]?
A regra geral é: [frequência em km ou tempo].
Mas tem sinais que mostram que tá na hora ANTES disso. Presta atenção:
[Sinal 1]: [como perceber visualmente ou auditivamente]
[Sinal 2]: [como perceber]
[Sinal 3]: [como perceber]
Se você identificou algum desses, não espera a próxima revisão."

B-roll: mostrar cada sinal de forma visual

CAPÍTULO 4: NA BR PNEUS (3:30–4:00)
Script:
"Aqui na BR Pneus & Oficina a gente faz o [serviço] com [diferenciais].
[Mencionar: equipamento específico se houver, garantia BR Total, parcelamento em 18x]
Não importa se você está em Araraquara, Jaú, São Carlos, Americana, Ibitinga ou Maringá —
todas as unidades têm o mesmo padrão de qualidade."

CONCLUSÃO + CTA (4:00–4:30)
"Então recapitulando: [serviço] = [benefício principal]. Faça a cada [frequência].
Qualquer dúvida, manda mensagem no WhatsApp que está na descrição.
Se esse vídeo te ajudou, se inscreve — tem mais conteúdo sobre cuidados com o carro toda semana.
Sou [nome] da BR Pneus & Oficina. Muito mais que pneus."
```

---

### Shot List por Serviço

**Para alinhamento 3D:**
```
[ ] Carro subindo no elevador (câmera lateral)
[ ] Mecânico acoplando sensores nas rodas (close nas mãos)
[ ] Tela do computador mostrando leitura antes (vermelho = desalinhado)
[ ] Mecânico ajustando os parâmetros
[ ] Tela mostrando resultado depois (verde = alinhado)
[ ] Carro descendo do elevador, saindo da loja
[ ] Close no pneu com desgaste irregular (antes) vs novo/uniforme (depois)
```

**Para troca de pneu:**
```
[ ] Pneu careca/desgastado sendo retirado (close no sulco)
[ ] Pneu novo sendo manuseado (mostrar sulcos profundos)
[ ] Desmontagem na máquina de monta-desmonta
[ ] Montagem do pneu novo
[ ] Balanceamento (pesos sendo colocados)
[ ] Pneu montado no carro, resultado final
[ ] Close comparativo: pneu antigo vs novo lado a lado
```

**Para troca de óleo:**
```
[ ] Óleo antigo sendo drenado (escuro/sujo)
[ ] Novo filtro de óleo
[ ] Óleo novo sendo despejado (âmbar/limpo — destaque na cor)
[ ] Verificação do nível com vareta
[ ] Etiqueta de controle da troca colada no para-brisa
```

**Para sistema de freios:**
```
[ ] Pastilha gasta ao lado de pastilha nova (comparativo)
[ ] Disco com ranhuramento excessivo
[ ] Mecânico medindo espessura da pastilha
[ ] Fluido de freio escuro vs limpo
[ ] Instalação da pastilha nova
[ ] Teste final de frenagem
```

---

### 3. Cross-sell no Final do Vídeo

Sugerir serviço complementar — aumenta ticket médio e retenção no canal:

| Serviço principal | Cross-sell natural | Por quê |
|---|---|---|
| Alinhamento | Balanceamento | Sempre se fazem juntos |
| Troca de pneu | Alinhamento + balanceamento | Pneu novo sem alinhar desgasta torto |
| Troca de óleo | Revisão de filtros | Mesmo processo |
| Freios | Suspensão | Sistemas interligados |
| Revisão completa | Diagnóstico eletrônico | Complementar |

**No vídeo (últimos 20 segundos):**
> "Aproveitando que você aprendeu sobre [serviço], dá uma olhada nesse vídeo sobre [cross-sell] — são serviços que andam juntos e fazem toda diferença."
> *(Apontar para card ou end screen no canto)*

---

## Exemplos de uso

```
/video-servico alinhamento-3d kit
/video-servico troca-de-pneu reels
/video-servico troca-de-oleo youtube
/video-servico sistema-de-freios shorts
/video-servico ar-condicionado reels
```

---

## Salvar em
```
output/posts/video-servico-[servico]-[formato]-[YYYY-MM-DD].md
```
**Exemplo:** `output/posts/video-servico-alinhamento-3d-youtube-2026-04-09.md`

---

## Referências Cruzadas
- Roteiro de Reels com outros formatos: `skills/video/reels-roteiro.md`
- SEO completo para YouTube Shorts: `skills/video/youtube-shorts.md`
- Artigo de blog educativo sobre o mesmo serviço: `skills/conteudo/` (agente Content Creator)
- Princípios psicológicos para ganchos educativos: `skills/conteudo/psicologia-marketing.md`
- Repurposagem do vídeo em post estático: `skills/social-media/repurposagem-conteudo.md`
