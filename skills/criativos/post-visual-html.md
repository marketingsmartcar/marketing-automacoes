---
name: post-visual-html
description: Gera arquivo HTML completo e autocontido que renderiza um post visual para redes sociais no estilo BR Pneus & Oficina, pronto para abrir no navegador e exportar como imagem via screenshot. Use sempre que precisar de post visual pronto para Instagram, arte para redes sociais, criativo HTML, card visual ou post de promoção de pneus — mesmo que o pedido use termos como "fazer post", "criar arte", "gerar criativo para instagram", "card de preço" ou "post de promoção".
---

# Skill: Post Visual em HTML

## Comando
```
/post-visual-html [tipo] [conteudo] [cidade]
```

## Parâmetros
- **tipo** (obrigatório): Tipo de post. Opções:
  - `promocao-pneus` — Post com preços por aro (estilo outdoor BR Pneus)
  - `promocao-servico` — Post promovendo serviço específico com condição
  - `dica` — Post de dica rápida visual com ícone/emoji
  - `institucional` — Post de diferencial, marca ou valor (fundo amarelo invertido)
  - `depoimento` — Card de depoimento real de cliente com aspas e estrelas
  - `antes-depois` — Comparativo visual lado a lado
  - `data-comemorativa` — Post temático para data especial
- **conteudo** (obrigatório): Detalhes específicos. Ex: "pneus a partir R$179 aro 13 a 16 parcelados em 18x", "troca de óleo com 10% desconto nessa semana"
- **cidade** (obrigatório): Unidade para endereço e personalização

---

## Regras Técnicas do HTML Gerado

Todo arquivo HTML deve:
- Ser **100% autocontido** — CSS dentro de `<style>` no `<head>`, zero dependências externas
- Usar apenas fontes do sistema: `"Arial Black", "Impact", Arial, sans-serif`
- Usar apenas as cores da marca: `#F5A623`, `#1A1A1A`, `#2A2A2A`, `#FFFFFF`, `#000000`
- Incluir comentário `<!-- SUBSTITUIR por logo real em produção -->` na área do logo
- Incluir instruções de exportação no `<body>` fora do container visual

**Dimensões por tipo de uso:**
- Se o usuário pedir "post" ou "post feed" → gerar **1080×1350px** (feed orgânico 4:5)
- Se o usuário pedir "post patrocinado", "ads" ou "anúncio" → gerar **1080×1080px**
- Se o usuário pedir "stories" ou "status" → gerar **1080×1920px**
- Se não especificar → PERGUNTAR: "É para feed orgânico (1080×1350) ou patrocinado (1080×1080)?"
- SEMPRE gerar com as dimensões exatas no CSS (`width` e `height` fixos no `.art-container`)

---

## Estrutura Visual Base

```
┌─────────────────────────────────────────┐
│ ████████ BARRA AMARELA #F5A623 ████████ │  ← height: 60-80px
│                              [BR PNEUS] │  ← Logo simulado, canto direito
│                                         │
│   HEADLINE PRINCIPAL                    │  ← Branco, bold, 52-72px
│   EM CAIXA ALTA                        │
│                                         │
│   Subtítulo ou complemento             │  ← Branco, 24-32px
│                                         │
│   ┌──────────┐  ┌──────────┐           │  ← Cards de preço (se promoção)
│   │  ARO 13  │  │  ARO 14  │           │
│   │ a partir │  │ a partir │           │
│   │  R$179   │  │  R$199   │           │
│   └──────────┘  └──────────┘           │
│                                         │
│   ┌─────────────────────────────┐      │
│   │   AGENDE AGORA PELO WHATS  │      │  ← CTA, fundo amarelo, texto preto
│   └─────────────────────────────┘      │
│                                         │
│   📍 Rua Exemplo, 123 — Araraquara    │  ← Contato, branco, 16px
│   📱 (16) 99999-9999                   │
│                                         │
│ ████████ BARRA AMARELA #F5A623 ████████ │  ← Faixa base
│              Muito mais que pneus       │  ← Tagline dentro da faixa
└─────────────────────────────────────────┘
```

---

## Templates HTML por Tipo

### Template: `promocao-pneus`

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Post Promoção Pneus — BR Pneus & Oficina [CIDADE]</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  /* Feed orgânico (padrão) — 1080x1350 (4:5) */
  .container-1080 {
    width: 1080px;
    height: 1350px;
    background: linear-gradient(160deg, #1A1A1A 0%, #2A2A2A 100%);
    font-family: "Arial Black", "Impact", Arial, sans-serif;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* Barra superior */
  .barra-topo {
    background: #F5A623;
    height: 70px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 40px;
    flex-shrink: 0;
  }
  .barra-topo .label {
    color: #000;
    font-size: 18px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 2px;
  }
  /* Logo simulado — SUBSTITUIR por <img> com logo real em produção */
  .logo {
    background: #000;
    color: #F5A623;
    padding: 6px 16px;
    font-size: 22px;
    font-weight: 900;
    letter-spacing: -1px;
    border-radius: 3px;
  }

  /* Corpo */
  .corpo {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 60px 20px;
    text-align: center;
  }

  .headline {
    color: #FFFFFF;
    font-size: 62px;
    font-weight: 900;
    text-transform: uppercase;
    line-height: 1.05;
    letter-spacing: -1px;
    margin-bottom: 12px;
  }
  .headline span { color: #F5A623; }

  .sub {
    color: #CCCCCC;
    font-size: 26px;
    font-weight: 400;
    margin-bottom: 40px;
    letter-spacing: 1px;
  }

  /* Cards de aro */
  .cards-aro {
    display: flex;
    gap: 20px;
    margin-bottom: 40px;
  }
  .card-aro {
    background: #111;
    border: 2px solid #F5A623;
    border-radius: 8px;
    padding: 20px 24px;
    text-align: center;
    min-width: 200px;
  }
  .card-aro .aro-label {
    color: #F5A623;
    font-size: 20px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 6px;
  }
  .card-aro .a-partir {
    color: #999;
    font-size: 14px;
    font-weight: 400;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .card-aro .preco {
    color: #FFFFFF;
    font-size: 52px;
    font-weight: 900;
    line-height: 1;
  }
  .card-aro .preco sup {
    font-size: 20px;
    vertical-align: super;
    color: #CCCCCC;
  }

  /* CTA */
  .cta-btn {
    background: #F5A623;
    color: #000;
    font-size: 24px;
    font-weight: 900;
    text-transform: uppercase;
    padding: 18px 60px;
    border-radius: 6px;
    letter-spacing: 2px;
    margin-bottom: 24px;
  }

  /* Contato */
  .contato {
    color: #AAAAAA;
    font-size: 17px;
    font-weight: 400;
    line-height: 1.8;
  }

  /* Barra base */
  .barra-base {
    background: #F5A623;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .barra-base .tagline {
    color: #000;
    font-size: 20px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 4px;
  }

  /* Instrução de uso — fora do container, não aparece no print */
  .instrucoes {
    width: 1080px;
    background: #333;
    color: #ccc;
    padding: 20px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    margin-top: 20px;
  }
</style>
</head>
<body style="background:#222; padding:40px;">

<!-- ========================================
     POST 1080x1080 — PROMOÇÃO DE PNEUS
     BR Pneus & Oficina — [CIDADE]
     ======================================== -->
<div class="container-1080">

  <!-- Barra topo -->
  <div class="barra-topo">
    <span class="label">⚡ Mega Oferta</span>
    <!-- SUBSTITUIR por logo real em produção -->
    <span class="logo">BR Pneus &amp; Oficina</span>
  </div>

  <!-- Corpo principal -->
  <div class="corpo">
    <div class="headline">PNEUS COM<br><span>OS MELHORES</span><br>PREÇOS</div>
    <div class="sub">Nacionais · Importados · Semi-novos · Parcelado em 18x</div>

    <!-- Cards de preço por aro -->
    <div class="cards-aro">
      <div class="card-aro">
        <div class="aro-label">Aro 13</div>
        <div class="a-partir">a partir de</div>
        <div class="preco"><sup>R$</sup>179</div>
      </div>
      <div class="card-aro">
        <div class="aro-label">Aro 14</div>
        <div class="a-partir">a partir de</div>
        <div class="preco"><sup>R$</sup>199</div>
      </div>
      <div class="card-aro">
        <div class="aro-label">Aro 15</div>
        <div class="a-partir">a partir de</div>
        <div class="preco"><sup>R$</sup>239</div>
      </div>
      <div class="card-aro">
        <div class="aro-label">Aro 16</div>
        <div class="a-partir">a partir de</div>
        <div class="preco"><sup>R$</sup>269</div>
      </div>
    </div>

    <div class="cta-btn">📱 Agende pelo WhatsApp</div>

    <div class="contato">
      📍 [ENDEREÇO COMPLETO], [CIDADE] &nbsp;|&nbsp; 📱 ([DDD]) [NÚMERO]<br>
      Parcelamos em 18x &nbsp;|&nbsp; Garantia BR Total 1 ano &nbsp;|&nbsp; 0800 942 4402
    </div>
  </div>

  <!-- Barra base -->
  <div class="barra-base">
    <span class="tagline">Muito mais que pneus</span>
  </div>

</div>

<!-- Instruções de exportação -->
<div class="instrucoes">
  <strong>Como exportar esta peça:</strong><br>
  1. Abra este arquivo no Chrome<br>
  2. Pressione F12 (DevTools) → clique no ícone de celular (toggle device)<br>
  3. Defina dimensões: 1080 x 1080<br>
  4. Clique com botão direito na div.container-1080 → "Capturar screenshot do nó"<br>
  5. Salve como PNG e publique no Instagram<br>
  <br>
  <strong>Personalização:</strong> Substitua [ENDEREÇO], [CIDADE], [DDD] e [NÚMERO] pelos dados reais da unidade.<br>
  Substitua os preços pelos preços reais da unidade (manter "a partir de").
</div>

</body>
</html>
```

---

## Adaptações por Tipo

### `promocao-servico`
- Substituir cards de aro por 1 card central grande com o serviço e condição
- Adicionar ícone/emoji do serviço (🔧 🛞 🔩)
- Fundo com leve degrade direcional mais dramático

### `dica`
- Emoji grande centralizado (80-100px via font-size)
- Headline: a dica em 1-2 linhas
- Subtítulo: contexto ou "salva pra não esquecer"
- Sem cards de preço
- Fundo amarelo (versão invertida) ou preto padrão

### `institucional`
- **Inversão de cores**: fundo #F5A623, texto preto e branco
- Diferencial em destaque com ícone
- Tom confiante, não promocional

### `depoimento`
- Aspas decorativas grandes em #F5A623
- Texto do depoimento em branco, tamanho 28-34px
- Nome do cliente + cidade + serviço realizado no rodapé
- Estrelas ★★★★★ em amarelo
- Badge "Google" ou "Cliente Verificado"

### `antes-depois`
- Layout dividido ao meio (50%/50%)
- Esquerda: fundo vermelho escuro (#3A0000) + label "ANTES" + descrição do problema
- Direita: fundo verde escuro (#003A00) + label "DEPOIS" + resultado
- Linha divisória central em amarelo
- Headline no topo unificando a peça

### `data-comemorativa`
- Adicionar elemento visual temático (emoji temático, cor de destaque secundária se justificada)
- Sempre manter base da identidade BR Pneus
- Integrar oferta especial da data

---

## Variações de Formato

**Feed orgânico (padrão):** `height: 1350px` — usar para todo post de feed Instagram/Facebook.
**Patrocinado/Ads:** `height: 1080px` — usar para anúncios pagos. Adicionar classe `ads` no container.
**Stories:** `height: 1920px` — texto centralizado, muito mais espaço vertical. Adicionar classe `stories`.

---

## Salvar em
```
output/criativos/post-[tipo]-[resumo]-[cidade]-[YYYY-MM-DD].html
```
**Exemplo:** `output/criativos/post-promocao-pneus-aro13a16-araraquara-2026-04-09.html`

---

## Referências Cruzadas
- Kit completo com todas as peças da campanha: `skills/criativos/kit-visual-campanha.md`
- Briefing para designer executar versão profissional: `skills/criativos/briefing-designer.md`
- Background gerado por IA para usar nesta peça: `skills/criativos/prompt-imagem-ia.md`
- Copy para a peça: `agents/copywriter-ads.md` → `/meta-ads-feed`
