---
name: meta-ads-feed
description: Gera anúncios completos para feed do Facebook e Instagram da BR Pneus & Oficina — texto principal com gancho, headline, CTA e briefing de criativo, em 3 variações com abordagens distintas (racional, emocional, urgência) e configuração de segmentação por persona. Use sempre que precisar de anúncio para Facebook, anúncio para Instagram, copy para Meta Ads feed, post patrocinado ou campanha de conversão nas redes sociais — mesmo que o pedido use termos como "impulsionar no Face", "fazer um anúncio no Instagram", "promover no Meta" ou "campanha paga no Face".
---

# Skill: Meta Ads — Anúncios de Feed

## Comando
```
/meta-ads-feed [objetivo] [servico-ou-oferta] [cidade] [persona-opcional]
```

## Parâmetros
- **objetivo** (obrigatório): `trafego`, `conversao`, `mensagens-whatsapp`, `cadastro`
- **servico-ou-oferta** (obrigatório): O que está sendo anunciado. Ex: "promoção pneus aro 14", "troca de óleo com desconto", "revisão completa antes das férias"
- **cidade** (obrigatório): Cidade-alvo
- **persona** (opcional): `Carlos`, `Ana`, `Roberto` ou `Giovana` — ver `knowledge/personas.md` para adaptar segmentação e linguagem

---

## Meta Ads ≠ Google Ads

No Meta, o usuário **não está procurando** o serviço — está no feed vendo fotos de amigos e conteúdo. O anúncio precisa **interromper o scroll** e despertar uma necessidade que ele nem sabia que tinha. Isso exige:
- Gancho visual e textual forte nos primeiros 2 segundos
- Storytelling emocional mais do que dados técnicos
- Criativo como protagonista (texto complementa a imagem, não o contrário)
- CTA que reduz o atrito ao máximo (WhatsApp é o canal ideal)

---

## Processo antes de criar

1. Ler `knowledge/personas.md` para adaptar o ângulo e os gatilhos por persona
2. Verificar se há data sazonal próxima em `knowledge/calendario-sazonal.md`
3. Definir o hook de cada variação antes de escrever o corpo — o hook é o que decide se a pessoa para o scroll

---

## Estrutura obrigatória do output

### 1. Configuração do Conjunto de Anúncios

```
Objetivo de campanha: [Tráfego | Conversões | Mensagens | Geração de Cadastros]
Nome do conjunto: BR Pneus | [Serviço] | [Cidade] | [Persona ou Público]

Público-alvo:
  Localização: Raio de [10–20 km] ao redor da loja em [Cidade]
  Idade: [25–55] (ajustar se persona específica informada)
  Gênero: [Todos | Masculino | Feminino] (ajustar por persona)
  
  Interesses detalhados:
    Automóveis (categoria)
    Manutenção de veículos
    [Marcas de carro populares na região]
    Motoristas de aplicativo (se persona Carlos)
    Família e segurança (se persona Ana)
    Gestão de frotas / transportadoras (se persona Roberto)
    Compras online, avaliações (se persona Giovana)
  
  Comportamentos:
    Proprietários de automóveis
    Usuários de celular Android/iOS (mobile-first)
  
  Exclusões: pessoas que já converteram nos últimos 30 dias

Posicionamentos: [Feed Facebook | Feed Instagram | Marketplace Facebook]
  NÃO usar stories aqui — usar skill /meta-ads-stories separadamente
Orçamento diário: R$[20–60]/dia conforme cidade e duração
Duração sugerida: [7–14 dias para promoção | contínuo para awareness]
```

---

### 2. Três Variações de Anúncio

Cada variação tem uma abordagem diferente — testar em paralelo para identificar qual ressoa com o público local.

---

**Variação A — Abordagem Racional (preço e condição)**

*Funciona bem para: Carlos (econômico prático) e Roberto (frotista)*

```
Texto principal (máx 125 chars para aparecer sem "ver mais"):
[Gancho com dado concreto ou economia. Ex: "Pneu aro 14 a partir de R$179 em [Cidade]. Parcele em 18x!"]

Texto expandido (total até 500 chars):
[Detalhar a oferta + condições + diferenciais da BR Pneus: maior mix, garantia BR Total, equipe treinada. Encerrar com CTA direto.]

Headline abaixo da imagem (máx 40 chars):
[Ex: "Pneus Baratos em [Cidade] — 18x"]

Descrição do link (máx 30 chars):
[Ex: "Parcele. Garanta já."]

Botão CTA: Enviar Mensagem | Saiba Mais | Ligar Agora

Sugestão de criativo:
- Imagem: pneu novo em fundo amarelo #F5A623 com preço em destaque
- Texto na imagem (máx 20% da área): "A PARTIR DE R$179 | ATÉ 18X"
- Formato: 1080x1080px (quadrado) ou 1080x1350px (vertical — mais imersivo)
- Logo no canto inferior direito
```

---

**Variação B — Abordagem Emocional (segurança e família)**

*Funciona bem para: Ana (mãe preocupada) e audiências gerais*

```
Texto principal (máx 125 chars):
[Gancho emocional. Ex: "Você levaria sua família numa viagem com o pneu assim? 🚗"]

Texto expandido (total até 500 chars):
[Conectar pneu/serviço com segurança da família → solução BR Pneus → prova de confiança (garantia, anos de experiência) → CTA gentil mas claro]

Headline abaixo da imagem (máx 40 chars):
[Ex: "Segurança que sua família merece"]

Descrição do link (máx 30 chars):
[Ex: "Garantia BR Total de 1 Ano"]

Botão CTA: Saiba Mais | Enviar Mensagem

Sugestão de criativo:
- Imagem: família feliz num carro (estilo lifestyle) ou pneu desgastado vs novo (comparação impactante)
- Texto na imagem: "SUA FAMÍLIA MERECE O MELHOR" em tipografia limpa
- Formato: 1080x1350px (vertical — melhor para feed mobile)
- Paleta: fundo escuro com texto em branco + detalhe amarelo
```

---

**Variação C — Abordagem Urgência (sazonal ou escassez)**

*Funciona bem para: campanhas com prazo definido, Black Friday, férias, promoções limitadas*

```
Texto principal (máx 125 chars):
[Gancho com urgência real. Ex: "ÚLTIMA SEMANA: pneus com condições especiais em [Cidade]. Não perca!"]

Texto expandido (total até 500 chars):
[Oferta clara + prazo + condições + por que agir agora (estoque, prazo, temporada) + CTA com urgência]

Headline abaixo da imagem (máx 40 chars):
[Ex: "Promoção Válida Até [Data]"]

Descrição do link (máx 30 chars):
[Ex: "Enquanto durar o estoque!"]

Botão CTA: Enviar Mensagem | Ligar Agora

Sugestão de criativo:
- Imagem: arte gráfica com fundo vermelho/amarelo intenso, contador regressivo se possível
- Texto na imagem: "SOMENTE ESTA SEMANA" em letras grandes
- Seta ou badge de desconto
- Formato: 1080x1080px
```

---

### 3. Briefing de Criativo (para o designer)

```
Formato(s): [imagem estática | carrossel (N cards) | vídeo 15-30s]
Dimensões principais: 1080x1080px (quadrado) + 1080x1350px (vertical)
Identidade visual: Amarelo #F5A623 | Preto #1A1A1A | Branco #FFFFFF
Texto na imagem: máximo 20% da área — verificar sempre antes de publicar
Elementos obrigatórios: logo BR Pneus & Oficina + tagline "Muito mais que pneus"
CTA visual: botão ou texto de ação visível no rodapé da imagem
Estilo: fotos reais da loja e equipe superam fotos de banco de imagens para este público
Referência: peças já aprovadas da marca (outdoor, flyer, posts anteriores)
```

---

## Regras de copy para Meta Ads

- A primeira linha do texto (antes do "ver mais") é o gancho — se não parar o scroll, o anúncio falha
- Emojis são bem-vindos com moderação (1–2 por anúncio, apenas onde fazem sentido)
- Nunca inventar preço exato — usar "a partir de" ou "preço especial"
- CTA do botão deve combinar com a ação esperada (se quero mensagem → "Enviar mensagem", não "Saiba Mais")
- Testar as 3 variações simultaneamente — nunca lançar apenas 1 criativo

---

## Onde salvar
```
output/campanhas/meta-feed-[servico]-[cidade]-[YYYY-MM-DD].md
```
**Exemplo:** `output/campanhas/meta-feed-trocaoleo-bauru-2026-04-07.md`
