# Skill: Material de Ponto de Venda

## Comando
`/material-pdv [tipo-material] [conteudo] [cidade]`

## O que faz
Gera o conteúdo textual completo e as especificações para materiais de ponto de venda — banners, displays, adesivos, totens e outros impressos usados dentro e na entrada da loja.

---

## Parâmetros

| Parâmetro | Obrigatório | Opções |
|-----------|-------------|--------|
| `tipo-material` | Sim | `banner-balcao`, `banner-externo`, `tabela-precos`, `quadro-servicos`, `adesivo-vitrine`, `display-mesa`, `cartaz-parede`, `totem` |
| `conteudo` | Sim | O que o material vai comunicar. Ex: `parcelamento-18x`, `garantia-br-total`, `promocao-pneus`, `servicos-completos`, `inauguracao`, `avaliacao-google` |
| `cidade` | Sim | Cidade da unidade |

---

## Referência de Tipos de Material

| Tipo | Onde fica | Distância de leitura | Tempo de atenção | Máx. de texto |
|------|-----------|---------------------|-----------------|--------------|
| `banner-balcao` | Balcão da recepção | 50 cm – 1 m | 10-30s | Moderado |
| `banner-externo` | Fachada, calçada ou estacionamento | 3-10 m | 3-5s (passando) | Mínimo |
| `tabela-precos` | Parede da recepção ou balcão | 1-2 m | 30-60s | Alto (informativo) |
| `quadro-servicos` | Parede da recepção | 1-2 m | 30-60s | Moderado |
| `adesivo-vitrine` | Vidro da porta ou vitrine | 1-5 m | 2-5s | Mínimo |
| `display-mesa` | Mesa da sala de espera | 30-60 cm | 1-3 min | Moderado-alto |
| `cartaz-parede` | Parede interna da loja ou espera | 1-3 m | 5-15s | Moderado |
| `totem` | Calçada ou entrada | 2-5 m | 3-5s | Mínimo |

---

## Estrutura do Output

---

### 1. Briefing da Peça

- **Objetivo:** o que queremos que o cliente FAÇA ou SINTA ao ver este material
- **Posicionamento:** onde exatamente na loja esta peça será exposta
- **Distância de leitura:** quantos metros o cliente vai estar quando ler
- **Tempo de atenção estimado:** quanto tempo o cliente vai olhar para a peça
- **Contexto do cliente:** ele está entrando? esperando? decidindo? passando?

---

### 2. Conteúdo Textual Completo

**Hierarquia de leitura — do mais para o menos importante:**

```
NÍVEL 1 — HEADLINE (1ª coisa que o olho vê)
Máximo 5 palavras. Tom: impactante, direto, promessa clara.
Tamanho: o maior da peça.

NÍVEL 2 — SUB-HEADLINE ou OFERTA (complementa a headline)
Máximo 10 palavras. Tom: benefício concreto.
Tamanho: 60-70% da headline.

NÍVEL 3 — CORPO / DETALHES (condições, lista de itens)
Máximo 30 palavras. Tom: informativo, claro.
Tamanho: 30-40% da headline.

NÍVEL 4 — CTA (o que fazer agora)
Máximo 5 palavras. Tom: ação direta.
Formato: destaque em botão, cor contrastante ou caixa.

NÍVEL 5 — DADOS DA UNIDADE (endereço, WhatsApp, logo)
Compacto. Sempre presente, mas não compete com o restante.
```

---

### 3. Conteúdo por Tipo e Tema — Exemplos

---

#### BANNER-EXTERNO + parcelamento-18x

**Briefing:**
- Objetivo: atrair motoristas que passam na rua para entrar ou ligar
- Distância de leitura: 5-8 metros (carro em movimento ou a pé)
- Tempo de atenção: 2-3 segundos
- Regra: se não dá pra ler em 3 segundos a pé, tem texto demais

**Conteúdo:**
```
HEADLINE (ENORME):
"PARCELA EM 18X"

SUB-HEADLINE (GRANDE):
"Pneus e serviços com o melhor preço"

DETALHES (MÉDIO):
"Garantia BR Total de 1 ano"

CTA (DESTAQUE):
"Entre!"

RODAPÉ (PEQUENO):
BR Pneus & Oficina [Cidade] | [Endereço curto] | [Número]
```

**Versão alternativa:**
```
HEADLINE: "PNEUS + SERVIÇOS"
SUB: "O melhor preço de [Cidade]"
DETALHE: "Parcela em 18x | Garantia 1 ano"
CTA: "Venha nos ver"
RODAPÉ: Logo + endereço + WhatsApp
```

---

#### BANNER-BALCAO + garantia-br-total

**Briefing:**
- Objetivo: reforçar o diferencial da garantia no momento em que o cliente está decidindo
- Distância de leitura: 50 cm – 1 m (cliente na frente do balcão)
- Tempo de atenção: 10-20 segundos

**Conteúdo:**
```
HEADLINE:
"Garantia BR Total"

SUB-HEADLINE:
"1 ano em produto e serviço"

CORPO:
"Tudo que fazemos aqui é garantido.
Se aparecer qualquer problema, a gente resolve."

CTA:
"Pergunte ao atendente sobre a garantia"

RODAPÉ:
BR Pneus & Oficina [Cidade]
```

**Versão alternativa:**
```
HEADLINE: "1 ANO DE GARANTIA"
SUB: "Em tudo que a gente faz"
CORPO: "Produto. Serviço. Mão de obra. Tudo garantido."
CTA: "Saiba mais no balcão"
```

---

#### ADESIVO-VITRINE + inauguracao

**Briefing:**
- Objetivo: comunicar que a loja é nova e está com condição especial
- Distância de leitura: 1-3 metros (de fora para dentro)
- Tempo de atenção: 3-5 segundos

**Conteúdo:**
```
HEADLINE (GRANDE):
"INAUGURAMOS!"

SUB:
"Oferta especial de inauguração"

DETALHE:
"[OFERTA] — válida até [DATA]"

CTA:
"Entre e aproveite"

RODAPÉ:
BR Pneus & Oficina [Cidade]
```

---

#### DISPLAY-MESA + avaliacao-google

**Briefing:**
- Objetivo: incentivar o cliente que está aguardando a deixar uma avaliação no Google
- Distância de leitura: 30-50 cm (cliente sentado na sala de espera)
- Tempo de atenção: até 2 minutos (cliente está parado)

**Conteúdo:**
```
HEADLINE:
"Gostou do atendimento?"

SUB:
"Sua avaliação no Google ajuda muita gente"

CORPO:
"Em 30 segundos você pode ajudar outros motoristas de [Cidade]
a encontrar um serviço de confiança.
É só escanear o QR Code ao lado."

[QR Code do Google Meu Negócio da unidade]

DETALHE:
"Sua opinião é muito importante pra gente 💛"

RODAPÉ:
BR Pneus & Oficina [Cidade]
```

---

#### QUADRO-SERVICOS + servicos-completos

**Briefing:**
- Objetivo: mostrar tudo que a loja faz para ampliar o ticket e o retorno
- Distância de leitura: 1-2 m (cliente em pé ou sentado na recepção)
- Tempo de atenção: 20-60 segundos

**Conteúdo:**
```
HEADLINE:
"Tudo que seu carro precisa, em um só lugar"

COLUNAS DE SERVIÇOS:

🔴 PNEUS                    🔧 MECÂNICA
Nacionais                   Revisão completa
Importados                  Troca de óleo e filtros
Semi-novos                  Sistema de freios
Maior mix do mercado        Suspensão

⚙️ GEOMETRIA                🌡️ CONFORTO
Alinhamento 3D              Ar-condicionado
Balanceamento               Higienização cabine
Rodízio de pneus

💉 ELETRÔNICA               ⛽ MOTOR
Injeção eletrônica          Correia dentada
Diagnóstico                 Embreagem
Limpeza de bicos            Filtros

SUB:
"Garantia BR Total de 1 ano | Parcela em até 18x"

RODAPÉ:
BR Pneus & Oficina [Cidade] — [Endereço] — [WhatsApp]
```

---

#### TABELA-PRECOS + servicos-basicos

> Use com cautela — preços mudam. Priorizar "preço especial" sem valor fixo quando possível.

**Conteúdo (sem valores fixos — usar linguagem de oferta):**
```
HEADLINE:
"Nossos preços especiais para [Cidade]"

TABELA:
| Serviço | Condição |
|---------|----------|
| Troca de óleo mineral | A partir de R$ [consulte] |
| Troca de óleo sintético | A partir de R$ [consulte] |
| Alinhamento | Preço especial — consulte |
| Balanceamento | Preço especial — consulte |
| Jogo de pneus | Parcela em até 18x |
| Revisão completa | Diagnóstico grátis |

RODAPÉ:
"Preços podem variar conforme modelo do veículo.
Parcelamento em até 18x | Garantia BR Total de 1 ano"
```

---

#### CARTAZ-PAREDE + promocao-pneus

**Conteúdo:**
```
HEADLINE (GRANDE):
"Pneu novo? A gente tem."

SUB:
"Maior mix do mercado em [Cidade]"

CORPO:
"Nacionais, importados e semi-novos.
A gente encontra o pneu certo pro seu carro
com o melhor preço."

CTA:
"Fala com a gente"

RODAPÉ:
💬 [WhatsApp] | 📍 [Endereço curto]
BR Pneus & Oficina [Cidade]
```

---

#### TOTEM + chamada-entrada

**Conteúdo:**
```
FRENTE:
"BR PNEUS & OFICINA"
[Cidade]

Pneus | Revisão | Alinhamento
Troca de óleo | Freios e mais

"ENTRE"

---

VERSO:
"Parcela em 18x"
"Garantia 1 ano"
[Logo]
[Endereço]
[WhatsApp]
```

---

### 4. Especificações Visuais

| Elemento | Orientação |
|----------|-----------|
| **Cores** | Fundo: `#1A1A1A` (preto) ou `#FFFFFF` (branco) / Destaque: `#F5A623` (amarelo BR Pneus) |
| **Hierarquia visual** | Headline: máximo tamanho / Sub: 60-70% / Corpo: 35-40% / CTA: destaque em caixa amarela |
| **Logo** | Sempre presente — posição inferior direita ou superior esquerda |
| **Fontes** | Optar por fontes sem serifa (Arial, Montserrat, Roboto) para melhor legibilidade à distância |
| **Imagens** | Fotos REAIS da unidade sempre que possível — nunca stock photo genérico de mecânica |
| **Contraste** | Texto claro em fundo escuro ou texto escuro em fundo claro — nunca cor-sobre-cor |

---

### 5. Instruções para o Franqueado

**Onde encomendar:**

| Tipo de peça | Formato ideal | Onde produzir |
|-------------|--------------|--------------|
| Banner externo | Lona 440g com ilhós | Gráfica local / Shopee |
| Banner balcão | Lona ou PVC rígido | Gráfica local |
| Adesivo vitrine | Adesivo transparente ou jateado | Gráfica ou plotagem |
| Display de mesa | PVC rígido dobrado ("display L") | Gráfica ou serviço de impressão |
| Cartaz parede | Papel cuchê 150g ou laminado | Gráfica local |
| Totem | Plástico corrugado ou PVC 3mm | Gráfica ou plotter |

**Custo estimado de produção:**
- Banner externo (80x150 cm): R$ 60-120
- Banner balcão (40x60 cm): R$ 30-60
- Adesivo vitrine (A3): R$ 20-50
- Display mesa (A5 dupla face): R$ 15-30
- Cartaz parede (A2): R$ 25-50

**Validade do material:**
- Materiais com oferta/data: validade da promoção + trocar ao encerrar
- Materiais institucionais (serviços, garantia): revisar a cada 6 meses ou ao atualizar serviços/preços
- Sinalização de inauguração: trocar após 30 dias da abertura

---

## Salvar em
`output/campanhas/pdv-[tipo]-[conteudo]-[cidade]-[data].md`

---

## Referências Cruzadas
- Identidade visual completa da marca: `CLAUDE.md` → seção Identidade Visual
- Banco de textos aprovados: `skills/conteudo/brand-banco-textos-aprovados.md`
- Material para inauguração: `/kit-inauguracao [cidade]`
- Checklist de marca para materiais impressos: `skills/conteudo/brand-checklist-marca.md` → tipo `outdoor`
