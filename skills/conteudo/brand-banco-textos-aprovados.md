# Skill: Banco de Textos Aprovados

## Comando
`/banco-textos-aprovados [categoria]`

## O que faz
Gera uma biblioteca de textos pré-aprovados e prontos para uso imediato pela equipe e franqueados — sem necessidade de revisão adicional, desde que as variáveis sejam preenchidas corretamente.

---

## Parâmetros

| Parâmetro | Obrigatório | Opções |
|-----------|-------------|--------|
| `categoria` | Sim | `taglines`, `bios`, `assinaturas`, `descricoes-servico`, `ctas`, `respostas-padrao`, `saudacoes`, `todos` |

---

## Instruções de Uso

Todos os textos nesta biblioteca estão marcados com **✅ APROVADO** — podem ser usados diretamente sem revisão adicional.

**Como usar as variáveis:**
- `{{nome}}` → nome do cliente
- `{{cidade}}` → cidade da unidade (ex: Araraquara, São Carlos)
- `{{unidade}}` → nome completo da unidade (ex: BR Pneus & Oficina Araraquara)
- `{{servico}}` → serviço realizado ou ofertado
- `{{telefone}}` → número da unidade com DDD
- `{{whatsapp}}` → link do WhatsApp da unidade
- `{{gerente}}` → nome do gerente da unidade
- `{{atendente}}` → nome do atendente

---

## Categorias

---

### TAGLINES ✅ APROVADO

**Tagline oficial:**
> "Muito mais que pneus"

---

**10 Variações aprovadas por contexto:**

| Contexto | Variação |
|----------|----------|
| Promoção de preço | "Muito mais que pneus: o melhor preço da cidade" |
| Serviços mecânicos | "Muito mais que pneus: revisão completa do jeito certo" |
| Segurança na viagem | "Muito mais que pneus: segurança para toda a família" |
| Garantia | "Muito mais que pneus: Garantia BR Total de 1 ano em tudo" |
| Parcelamento | "Muito mais que pneus: parcela em até 18x sem juros" |
| Sazonal (férias) | "Muito mais que pneus: seu carro pronto para a viagem" |
| Sazonal (chuva) | "Muito mais que pneus: prepare seu carro para as chuvas" |
| Fidelização | "Muito mais que pneus: somos seus parceiros no cuidado do carro" |
| Franquia/institucional | "Muito mais que pneus: qualidade em cada unidade da rede" |
| Encerramento de email | "Muito mais que pneus — essa é a BR Pneus & Oficina." |

---

**20 Frases de efeito prontas para headlines, subjects e aberturas:**

1. "Seu carro merece o melhor. Você também."
2. "Cuidar do carro não precisa ser complicado."
3. "Na BR Pneus & Oficina, a gente explica antes de fazer."
4. "Parcelado em até 18x — porque cuidar do carro cabe no bolso."
5. "Garantia BR Total: 1 ano de tranquilidade."
6. "Da calibragem à revisão completa — tudo em um lugar só."
7. "Profissionais treinados, serviço de verdade."
8. "Pneu bom, direção segura, família protegida."
9. "O maior mix de pneus da região está aqui."
10. "Não espere o carro reclamar — revise antes."
11. "Alinhado, calibrado e revisado. Assim que tem de ser."
12. "A oficina que você pode confiar desde a primeira visita."
13. "Tempo de serviço sem te deixar na mão."
14. "Compra direta com fornecedor = melhor preço para você."
15. "Feito certo na primeira vez. É o nosso padrão."
16. "O carro que te leva todo dia merece atenção todo dia."
17. "Troca de óleo em dia é economia garantida amanhã."
18. "Seu próximo pneu está na BR Pneus & Oficina."
19. "Segurança começa na calibragem — e a gente faz de graça."
20. "A confiança de uma rede, o atendimento de um parceiro."

---

### BIOS ✅ APROVADO

**Bio institucional (perfil principal da rede):**
> BR Pneus & Oficina — Muito mais que pneus 🚗
> Rede de franquias com unidades em SP e PR
> Pneus + serviços mecânicos completos | Parcela em até 18x | Garantia BR Total
> 📞 0800 942 4402

---

**Bio por unidade (template — preencher variáveis):**
> BR Pneus & Oficina {{cidade}} — Muito mais que pneus 🚗
> Pneus + revisão + alinhamento + muito mais | Parcela em até 18x | Garantia BR Total
> 📍 {{endereco}}
> 📲 {{whatsapp}}

---

**Bio por rede social:**

| Rede | Bio (respeitar limite de caracteres) |
|------|-------------------------------------|
| Instagram (150 chars) | `BR Pneus & Oficina {{cidade}} 🚗 Pneus + serviços completos \| 18x sem juros \| Garantia BR Total \| 📲 {{whatsapp}}` |
| Facebook (mais longa) | `BR Pneus & Oficina de {{cidade}} — a maior rede de pneus e serviços automotivos da região. Atendemos com o maior mix de pneus do mercado, serviços mecânicos completos, parcelamento em até 18x e Garantia BR Total de 1 ano em tudo que fazemos. Agende pelo WhatsApp ou venha nos visitar!` |
| TikTok (80 chars) | `BR Pneus & Oficina {{cidade}} 🚗 Dicas de carro + ofertas reais` |
| Google Meu Negócio | `BR Pneus & Oficina {{cidade}} — pneus, alinhamento, balanceamento, troca de óleo, revisão completa e muito mais. Maior mix de pneus da região, parcelamento em até 18x e Garantia BR Total de 1 ano. Atendimento de segunda a sábado.` |

---

### ASSINATURAS DE EMAIL ✅ APROVADO

**Template base:**
```
[Nome completo]
[Cargo] | BR Pneus & Oficina {{cidade}}
📞 {{telefone}} | 📲 WhatsApp: {{whatsapp}}
📍 {{endereco}}
Instagram: @brpneus{{cidade_slug}} | Site: [site]

"Muito mais que pneus"
```

**Por cargo:**

**Atendente:**
```
{{atendente}}
Consultor(a) de Atendimento | BR Pneus & Oficina {{cidade}}
📲 {{whatsapp}}
"Muito mais que pneus"
```

**Gerente de Unidade:**
```
{{gerente}}
Gerente de Unidade | BR Pneus & Oficina {{cidade}}
📞 {{telefone}} | 📲 {{whatsapp}}
📍 {{endereco}}
"Muito mais que pneus"
```

**Telemarketing:**
```
{{atendente}}
Atendimento ao Cliente | BR Pneus & Oficina
📞 0800 942 4402
"Muito mais que pneus"
```

**Marketing Central:**
```
{{nome}}
Marketing | BR Pneus & Oficina
📧 [email] | 📲 [whatsapp]
"Muito mais que pneus"
```

---

### DESCRICOES-SERVICO ✅ APROVADO

Para cada serviço, 3 versões de texto:

---

**PNEUS NOVOS**

Curta: "O maior mix de pneus da região — nacionais, importados e semi-novos. Parcela em até 18x."

Média: "Na BR Pneus & Oficina você encontra o maior mix de pneus da região: nacionais, importados e semi-novos para todos os bolsos. Compramos direto dos fabricantes — e esse preço repassamos para você. Parcela em até 18x sem juros."

Completa: "Troca de pneus é um investimento na sua segurança. Na BR Pneus & Oficina você encontra o maior mix de pneus da região: marcas nacionais, importadas e opções semi-novas para quem precisa de economia sem abrir mão de qualidade. Trabalhamos com compra direta dos fabricantes, o que nos permite praticar os melhores preços do mercado. Tudo parcelado em até 18x sem juros — e com Garantia BR Total de 1 ano incluída. Venha comparar."

---

**ALINHAMENTO COMPUTADORIZADO 3D**

Curta: "Alinhamento 3D preciso em ~45 minutos. Pneu dura mais, carro consome menos."

Média: "O alinhamento computadorizado 3D da BR Pneus & Oficina garante precisão milimétrica no ângulo das rodas. Resultado: pneus com vida útil até 30% maior e redução no consumo de combustível. Feito em ~45 minutos, com Garantia BR Total."

Completa: "Pneu desalinhado desgasta torto, aumenta o consumo de combustível e ainda compromete a dirigibilidade do veículo. O alinhamento computadorizado 3D da BR Pneus & Oficina usa tecnologia de última geração para ajustar com precisão milimétrica o ângulo de todas as rodas. O resultado é imediato: o carro deixa de 'puxar' para o lado, os pneus passam a durar até 30% mais e o consumo de combustível reduz. Recomendamos a cada 10.000 km ou 6 meses. Feito em aproximadamente 45 minutos, com profissionais treinados e Garantia BR Total de 1 ano."

---

**BALANCEAMENTO**

Curta: "Balanceamento das 4 rodas — fim da vibração no volante. Rápido e com garantia."

Média: "Vibração no volante? Pode ser desequilíbrio das rodas. O balanceamento na BR Pneus & Oficina corrige isso com precisão, aumentando a vida dos pneus e o conforto na direção. Com Garantia BR Total."

Completa: "O balanceamento é o processo que distribui o peso do pneu e da roda de forma uniforme. Quando está desregulado, você sente a vibração no volante — principalmente em velocidade. Na BR Pneus & Oficina, o balanceamento é feito com equipamento eletrônico de precisão em todas as 4 rodas. Além do conforto imediato, pneus bem balanceados duram mais e preservam os componentes de suspensão. Recomendamos sempre que trocar pneus ou a cada 10.000 km."

---

**TROCA DE ÓLEO E FILTROS**

Curta: "Troca de óleo + filtros em ~30 minutos. Motor protegido, carro com mais vida."

Média: "Trocar o óleo no prazo certo é o cuidado mais simples e mais importante para o motor do seu carro. Na BR Pneus & Oficina, fazemos em ~30 minutos com óleos de qualidade e Garantia BR Total."

Completa: "O óleo do motor é o sangue do carro — quando está velho ou sujo, desgasta peças e pode causar danos sérios. Na BR Pneus & Oficina, a troca de óleo e filtros é feita em ~30 minutos com óleos das melhores marcas (mineral, semissintético e sintético) adequados ao seu motor. Trabalhamos com o viscosidade recomendada pelo fabricante do veículo. Recomendamos a troca a cada 5.000–10.000 km, dependendo do tipo de óleo e do veículo. Tudo com Garantia BR Total de 1 ano."

---

**REVISÃO COMPLETA**

Curta: "Revisão completa — verificamos tudo antes de virar um problema maior."

Média: "A revisão completa da BR Pneus & Oficina checa os principais sistemas do seu carro: suspensão, freios, óleo, filtros, correia, pneus e mais. Uma hora que pode te poupar muito dinheiro."

Completa: "Prevenir é sempre mais barato do que remediar — e a revisão completa da BR Pneus & Oficina existe para isso. Nossos profissionais verificam os principais sistemas do veículo: suspensão, freios, sistema de óleo e filtros, correia dentada, pneus (calibragem, desgaste e estado), fluidos, iluminação e diagnóstico eletrônico. Ao final, você recebe um relatório completo do estado do carro e das recomendações de manutenção. Recomendamos revisão a cada 10.000 km ou 12 meses. Com Garantia BR Total de 1 ano."

---

**HIGIENIZAÇÃO DO AR CONDICIONADO**

Curta: "Ar condicionado com mofo ou cheiro ruim? Higienização completa com Garantia BR Total."

Média: "O ar condicionado do carro acumula bactérias e fungos que circulam dentro do habitáculo. A higienização na BR Pneus & Oficina elimina esses agentes e devolve o ar fresco e saudável para você e sua família."

Completa: "Com o tempo, o evaporador do ar condicionado acumula fungos, bactérias e alérgenos que circulam dentro do carro — e você nem percebe. A higienização do ar condicionado na BR Pneus & Oficina usa produtos específicos para eliminar esses agentes, devolvendo o funcionamento eficiente do sistema e o ar limpo dentro do veículo. Recomendamos a higienização anual, especialmente antes do verão. Ideal para quem tem crianças, idosos ou pessoas com rinite e asma no carro."

---

**REVISÃO DE SUSPENSÃO**

Curta: "Suspensão revisada = carro mais seguro, menos desgaste de pneus e mais conforto."

Média: "A suspensão conecta o carro com a pista. Quando está desgastada, o veículo perde estabilidade, os pneus desgastam irregularmente e a direção fica imprecisa. Revise na BR Pneus & Oficina."

Completa: "A suspensão é o sistema que absorve os impactos da pista e mantém as rodas em contato com o asfalto. Quando algum componente está desgastado — amortecedor, mola, bandeja, pivô ou barra estabilizadora — o carro fica instável, o pneu começa a desgastar torto e a direção perde precisão. Na BR Pneus & Oficina, revisamos todos os componentes da suspensão e indicamos o que realmente precisa de troca. Com profissionais treinados e Garantia BR Total de 1 ano."

---

**SISTEMA DE FREIOS**

Curta: "Freio com barulho ou mole? Verificamos na hora — segurança em primeiro lugar."

Média: "Freios funcionando corretamente salvam vidas. Na BR Pneus & Oficina revisamos pastilhas, discos, fluido de freio e o sistema completo. Recomendamos verificação a cada 20.000 km."

Completa: "O sistema de freios é o equipamento de segurança mais importante do veículo. Pastilhas desgastadas, discos com sulcos, fluido de freio velho ou linha com ar comprometem a frenagem e colocam vidas em risco. Na BR Pneus & Oficina, fazemos a revisão completa do sistema: pastilhas e sapatas, discos e tambores, fluido de freio (troca quando necessário), lonas e cilindros de roda. Diagnóstico honesto — indicamos o que precisa ser trocado e mostramos o motivo. Com Garantia BR Total."

---

**TROCA DE CORREIA DENTADA**

Curta: "Correia dentada: a peça que não pode arrebentar. Troque no prazo — a gente cuida."

Média: "A correia dentada sincroniza os movimentos internos do motor. Se arrebentar, pode causar danos gravíssimos ao motor. Troque no prazo recomendado: a cada 50.000–60.000 km, dependendo do veículo."

Completa: "A correia dentada é uma das peças mais críticas do motor — ela sincroniza o sistema de válvulas com o virabrequim. Se arrebentar enquanto o carro está em movimento, pode causar danos irreversíveis ao motor, com custo de reparo que chega a multiplicar o valor da troca preventiva. Na BR Pneus & Oficina, trocamos a correia dentada junto com os componentes relacionados (tensor, correia d'água) conforme a tabela do fabricante do veículo. Recomendamos a troca a cada 50.000–60.000 km ou conforme manual do veículo. Com Garantia BR Total."

---

**INJEÇÃO ELETRÔNICA / DIAGNÓSTICO**

Curta: "Motor irregular ou luz acesa no painel? Diagnóstico completo na BR Pneus & Oficina."

Média: "Motor falhando, consumo alto ou luz de check engine acesa podem indicar problema na injeção eletrônica. Na BR Pneus & Oficina, fazemos diagnóstico eletrônico completo para identificar a causa exata."

Completa: "A injeção eletrônica é o sistema que controla a quantidade exata de combustível que entra no motor. Quando há falhas — bicos sujos, sensores defeituosos ou módulo com problema — o motor falha, o consumo aumenta e o carro perde potência. A luz de check engine no painel é o aviso mais comum. Na BR Pneus & Oficina, conectamos o computador diagnóstico ao veículo para ler os códigos de falha e identificar com precisão o que está acontecendo. Sem achismos — só a causa real, com transparência e Garantia BR Total."

---

### CTAS ✅ APROVADO

**Biblioteca com 30+ CTAs aprovados:**

**Por canal:**

| Canal | CTA |
|-------|-----|
| WhatsApp | "Chama a gente no WhatsApp — é rápido e sem compromisso" |
| WhatsApp | "Manda uma mensagem no zap e a gente já agenda pra você" |
| WhatsApp | "Fala com a gente no WhatsApp: {{whatsapp}}" |
| Telefone | "Liga pra gente: {{telefone}}" |
| Visita | "Passa aqui na loja — a gente te recebe bem" |
| Instagram | "Manda uma DM — a gente responde na hora" |
| Site | "Saiba mais no site" |
| Google | "Nos encontre no Google: BR Pneus & Oficina {{cidade}}" |

**Por objetivo:**

| Objetivo | CTA |
|----------|-----|
| Agendar | "Agende seu horário pelo WhatsApp" |
| Agendar | "Garanta sua vaga — é só ligar ou mandar mensagem" |
| Agendar | "Quer agendar? Responde este email ou chama no zap" |
| Orçamento | "Peça seu orçamento agora — sem compromisso" |
| Orçamento | "Quanto custa? A gente verifica e te manda em minutos" |
| Orçamento | "Manda o modelo do carro que a gente calcula pra você" |
| Saber mais | "Tem dúvida? A gente explica tudo sem complicar" |
| Saber mais | "Quer saber mais sobre esse serviço? Chama a gente" |
| Comprar | "Aproveite a condição especial — é só agendar" |
| Comprar | "Oferta válida até [data] — garante a sua vaga" |

**Por tom:**

| Tom | CTA |
|-----|-----|
| Urgente | "Vagas limitadas esta semana — agende agora" |
| Urgente | "Oferta válida até [data] — aproveite" |
| Suave | "Quando quiser, a gente está aqui" |
| Suave | "Sem pressa — mas se precisar, é só chamar" |
| Informativo | "Quer saber se está na hora de revisão? A gente verifica" |
| Promocional | "Condição especial — só para quem agendar essa semana" |
| Pós-serviço | "Qualquer dúvida sobre o serviço, estamos aqui" |

---

### RESPOSTAS-PADRAO ✅ APROVADO

3 variações por situação para não parecer robótico:

**Pedido de preço (sem dar preço fixo):**
- V1: "Para passar o valor certinho, preciso verificar o modelo e ano do seu carro. Me conta aqui e te respondo em minutos!"
- V2: "Preço varia conforme o veículo! Me manda o modelo e ano que eu verifico aqui na tabela pra você."
- V3: "Boa pergunta! Depende do veículo. Me passa o modelo e ano que te dou a estimativa agora."

**Elogio do cliente:**
- V1: "Que notícia boa, {{nome}}! Fico muito feliz que tenha gostado. A nossa equipe trabalha muito para isso. Até a próxima!"
- V2: "Isso fez o nosso dia! Obrigado, {{nome}} — é por isso que a gente trabalha. Te esperamos na próxima!"
- V3: "Obrigado, {{nome}}! Feedback como esse é o melhor combustível pra equipe. Pode contar com a gente sempre."

**Reclamação do cliente:**
- V1: "{{nome}}, sinto muito pela sua experiência. Isso não representa nosso padrão. Pode me contar mais detalhes pelo privado? Quero resolver pessoalmente."
- V2: "Entendo sua insatisfação, {{nome}}, e peço desculpas. Me manda uma mensagem direta — vou verificar o que aconteceu e garantir que seja resolvido."
- V3: "Obrigado por nos dizer, {{nome}}. Isso nos ajuda a melhorar. Posso te chamar no privado para entender melhor e resolver?"

**Pergunta sobre garantia:**
- V1: "Todos os nossos serviços têm Garantia BR Total de 1 ano — tanto os produtos quanto o serviço realizado. Qualquer problema no período, a gente resolve sem custo."
- V2: "Garantia BR Total: 1 ano em produtos e serviços. Se aparecer qualquer problema dentro desse prazo, é só nos chamar que resolvemos."
- V3: "A BR Pneus & Oficina oferece Garantia BR Total de 1 ano em tudo que fazemos. Pode ficar tranquilo(a)!"

**Cliente comparando com concorrente:**
- V1: "Faz sentido comparar! A gente compra direto dos fornecedores, então nossos preços costumam surpreender. Me dá a chance de verificar a melhor condição pra você?"
- V2: "Entendo! A comparação é sempre bem-vinda. O nosso diferencial vai além do preço: Garantia BR Total e profissionais treinados. Posso verificar nossa condição?"
- V3: "Com certeza compare! E quando tiver os orçamentos, a gente bate mais uma olhada — às vezes a condição fica melhor do que parece."

---

### SAUDACOES ✅ APROVADO

**Por canal:**

| Canal | Saudação |
|-------|----------|
| WhatsApp (1º contato) | "Olá, {{nome}}! Aqui é {{atendente}}, da BR Pneus & Oficina {{cidade}}. Como posso ajudar? 😊" |
| WhatsApp (retorno) | "Oi, {{nome}}! Tudo bem? Sou {{atendente}}, da BR Pneus & Oficina. Vi sua mensagem — vou verificar aqui pra você!" |
| Email | "Olá, {{nome}}! Espero que esteja bem." |
| Telefone | "BR Pneus & Oficina de {{cidade}}, {{atendente}} falando. Boa [manhã/tarde/noite]! Em que posso ajudar?" |
| Presencial | "Olá! Bem-vindo à BR Pneus & Oficina de {{cidade}}! Posso ajudar você?" |
| Redes sociais | "Oi, {{nome}}! 😊" |

**Por período do dia:**

| Período | Saudação |
|---------|----------|
| Manhã (até 12h) | "Bom dia, {{nome}}!" |
| Tarde (12h–18h) | "Boa tarde, {{nome}}!" |
| Noite (após 18h) | "Boa noite, {{nome}}!" |
| Sem hora definida | "Olá, {{nome}}!" |

**Despedidas por situação:**

| Situação | Despedida |
|----------|----------|
| Pós-atendimento | "Qualquer coisa, estamos aqui. Até a próxima, {{nome}}!" |
| Pós-serviço | "Obrigado pela confiança! Carro pronto — dirija com segurança. Até a próxima!" |
| Pós-reclamação | "Obrigado pela paciência, {{nome}}. Estamos sempre trabalhando para melhorar. Até breve!" |
| Email marketing | "Até a próxima! — Equipe BR Pneus & Oficina {{cidade}}" |
| WhatsApp formal | "Estamos à disposição! — {{atendente}}, BR Pneus & Oficina" |

---

## Salvar em
`output/relatorios/banco-textos-[categoria]-[data].md`

---

## Referências Cruzadas
- Manual da marca: `agents/brand-guardian.md`
- Revisão de materiais: `/revisar-material`
- Guia para franqueados: `/guia-franqueado tom-de-voz`
