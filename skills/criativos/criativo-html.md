# Skill: Criativo Visual em HTML

## Comando
`/criativo-html [tipo] [conteudo] [cidade-opcional]`

## O que faz
Gera o código HTML/CSS completo de peças visuais para a BR Pneus & Oficina — posts de redes sociais, banners promocionais, stories e slides de apresentação — usando a identidade visual da marca com qualidade profissional, prontos para exportar como imagem via screenshot.

---

## Parâmetros

| Parâmetro | Obrigatório | Opções |
|-----------|-------------|--------|
| `tipo` | Sim | `post-quadrado`, `post-retangular`, `story`, `banner-oferta`, `slide-apresentacao`, `card-depoimento`, `capa-destaque` |
| `conteudo` | Sim | O que o criativo comunica. Ex: "promoção pneus 18x", "depoimento cliente", "dia das mães", "inauguração Maringá" |
| `cidade` | Não | Personaliza o criativo com a unidade específica |

---

## Dimensões de Referência

| Tipo | Dimensões | Uso |
|------|-----------|-----|
| `post-quadrado` | 1080×1080px | Feed Instagram / Facebook |
| `post-retangular` | 1200×628px | Facebook / LinkedIn / link preview |
| `story` | 1080×1920px | Instagram / Facebook Stories |
| `banner-oferta` | 800×400px | Site / WhatsApp / email |
| `slide-apresentacao` | 1280×720px | Relatórios / franqueados / apresentações |
| `card-depoimento` | 1080×1080px | Feed Instagram — prova social |
| `capa-destaque` | 1200×400px | Capa do Facebook / faixa |

---

## Identidade Visual BR Pneus

```css
/* Cores obrigatórias */
--primary: #F5A623;       /* Amarelo/laranja — destaque, CTAs, títulos */
--dark: #1A1A1A;          /* Preto — fundo principal, texto sobre claro */
--white: #FFFFFF;         /* Branco — texto sobre escuro, fundo neutro */
--gray-light: #F5F5F5;    /* Cinza claro — fundo alternativo */
--gray-mid: #888888;      /* Cinza médio — texto secundário */

/* Fontes recomendadas (Google Fonts) */
--font-display: 'Montserrat', sans-serif;   /* Headlines */
--font-body: 'Open Sans', sans-serif;       /* Corpo de texto */

/* Hierarquia de tamanho (post 1080×1080) */
--headline: 64-80px;
--sub: 36-44px;
--body: 24-28px;
--small: 18-20px;
```

---

## Estrutura HTML Base

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: [LARGURA]px;
      height: [ALTURA]px;
      overflow: hidden;
      font-family: 'Open Sans', sans-serif;
      background: #1A1A1A;
    }
  </style>
</head>
<body>
  <!-- CONTEÚDO AQUI -->
</body>
</html>
```

---

## Templates por Tipo

---

### POST-QUADRADO — Promoção/Oferta (1080×1080)

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1080px; height: 1080px;
      background: #1A1A1A;
      font-family: 'Open Sans', sans-serif;
      display: flex; flex-direction: column;
      overflow: hidden; position: relative;
    }
    .topo {
      background: #F5A623;
      padding: 24px 48px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .logo-text {
      font-family: 'Montserrat', sans-serif;
      font-weight: 900; font-size: 28px;
      color: #1A1A1A; letter-spacing: -0.5px;
    }
    .cidade-tag {
      background: #1A1A1A;
      color: #F5A623;
      font-family: 'Montserrat', sans-serif;
      font-size: 18px; font-weight: 700;
      padding: 6px 16px; border-radius: 4px;
    }
    .corpo {
      flex: 1;
      display: flex; flex-direction: column;
      justify-content: center; align-items: center;
      padding: 48px; text-align: center;
      gap: 24px;
    }
    .eyebrow {
      color: #F5A623;
      font-family: 'Montserrat', sans-serif;
      font-size: 22px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 3px;
    }
    .headline {
      color: #FFFFFF;
      font-family: 'Montserrat', sans-serif;
      font-size: 76px; font-weight: 900;
      line-height: 1.05;
    }
    .headline span { color: #F5A623; }
    .sub {
      color: #CCCCCC;
      font-size: 28px; line-height: 1.4;
    }
    .cta-box {
      background: #F5A623;
      color: #1A1A1A;
      font-family: 'Montserrat', sans-serif;
      font-weight: 900; font-size: 30px;
      padding: 20px 48px; border-radius: 8px;
      text-transform: uppercase; letter-spacing: 1px;
    }
    .rodape {
      background: #111111;
      padding: 20px 48px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .tagline {
      color: #F5A623;
      font-family: 'Montserrat', sans-serif;
      font-size: 18px; font-style: italic;
    }
    .contato {
      color: #888888;
      font-size: 16px;
    }
  </style>
</head>
<body>
  <div class="topo">
    <div class="logo-text">BR Pneus &amp; Oficina</div>
    <div class="cidade-tag">[CIDADE]</div>
  </div>

  <div class="corpo">
    <div class="eyebrow">[CATEGORIA — ex: Promoção Especial]</div>
    <div class="headline">
      [HEADLINE PRINCIPAL]<br>
      <span>[DESTAQUE EM AMARELO]</span>
    </div>
    <div class="sub">[SUB-HEADLINE — 1 a 2 linhas]</div>
    <div class="cta-box">[CTA — ex: Parcele em 18x]</div>
  </div>

  <div class="rodape">
    <div class="tagline">Muito mais que pneus</div>
    <div class="contato">[WhatsApp] · [Endereço curto]</div>
  </div>
</body>
</html>
```

---

### STORY — Vertical (1080×1920)

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1080px; height: 1920px;
      background: #1A1A1A;
      display: flex; flex-direction: column;
      overflow: hidden;
    }
    .topo {
      background: #F5A623;
      padding: 40px 60px 32px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .logo-text {
      font-family: 'Montserrat', sans-serif;
      font-weight: 900; font-size: 36px; color: #1A1A1A;
    }
    .zona-visual {
      flex: 1;
      background: #111111;
      display: flex; align-items: center; justify-content: center;
      position: relative; overflow: hidden;
      min-height: 700px;
    }
    /* Placeholder para imagem ou ícone SVG */
    .visual-placeholder {
      width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      font-size: 200px;
    }
    .mensagem {
      padding: 80px 60px 60px;
      display: flex; flex-direction: column;
      gap: 32px;
    }
    .eyebrow {
      color: #F5A623;
      font-family: 'Montserrat', sans-serif;
      font-size: 28px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 4px;
    }
    .headline {
      color: #FFFFFF;
      font-family: 'Montserrat', sans-serif;
      font-size: 88px; font-weight: 900;
      line-height: 1.05;
    }
    .headline em { color: #F5A623; font-style: normal; }
    .body-text {
      color: #CCCCCC;
      font-size: 34px; line-height: 1.5;
    }
    .cta-swipe {
      margin-top: 24px;
      display: flex; align-items: center; gap: 16px;
    }
    .cta-btn {
      background: #F5A623;
      color: #1A1A1A;
      font-family: 'Montserrat', sans-serif;
      font-weight: 900; font-size: 32px;
      padding: 24px 56px; border-radius: 10px;
      text-transform: uppercase;
    }
    .cta-arrow {
      color: #F5A623; font-size: 48px;
    }
    .rodape {
      background: #111111;
      padding: 32px 60px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .tagline { color: #F5A623; font-size: 24px; font-style: italic; }
    .contato { color: #666; font-size: 22px; }
  </style>
</head>
<body>
  <div class="topo">
    <div class="logo-text">BR Pneus &amp; Oficina</div>
  </div>

  <div class="zona-visual">
    <div class="visual-placeholder">🚗</div>
    <!-- Substituir pelo elemento visual: foto, ícone SVG, gradiente -->
  </div>

  <div class="mensagem">
    <div class="eyebrow">[CATEGORIA]</div>
    <div class="headline">[HEADLINE]<br><em>[DESTAQUE]</em></div>
    <div class="body-text">[DESCRIÇÃO BREVE]</div>
    <div class="cta-swipe">
      <div class="cta-btn">[CTA]</div>
      <div class="cta-arrow">→</div>
    </div>
  </div>

  <div class="rodape">
    <div class="tagline">Muito mais que pneus</div>
    <div class="contato">[Cidade] · [WhatsApp]</div>
  </div>
</body>
</html>
```

---

### CARD-DEPOIMENTO — Prova Social (1080×1080)

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&family=Open+Sans:ital,wght@0,400;1,400&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1080px; height: 1080px;
      background: #F5A623;
      display: flex; flex-direction: column;
      overflow: hidden;
    }
    .topo {
      padding: 40px 60px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .logo-text {
      font-family: 'Montserrat', sans-serif;
      font-weight: 900; font-size: 28px; color: #1A1A1A;
    }
    .stars {
      font-size: 40px; letter-spacing: 4px;
      color: #1A1A1A;
    }
    .corpo {
      flex: 1;
      background: #1A1A1A;
      margin: 0 60px;
      border-radius: 16px 16px 0 0;
      padding: 64px 72px;
      display: flex; flex-direction: column;
      justify-content: center; gap: 40px;
    }
    .aspas {
      font-size: 120px; line-height: 0.8;
      color: #F5A623; font-family: Georgia, serif;
    }
    .depoimento {
      color: #FFFFFF;
      font-family: 'Open Sans', sans-serif;
      font-size: 34px; line-height: 1.6;
      font-style: italic;
    }
    .cliente {
      display: flex; align-items: center; gap: 20px;
    }
    .avatar {
      width: 64px; height: 64px;
      background: #F5A623; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Montserrat', sans-serif;
      font-weight: 900; font-size: 28px; color: #1A1A1A;
    }
    .cliente-info { display: flex; flex-direction: column; gap: 4px; }
    .cliente-nome {
      color: #F5A623;
      font-family: 'Montserrat', sans-serif;
      font-weight: 700; font-size: 24px;
    }
    .cliente-detalhe { color: #888; font-size: 20px; }
    .rodape {
      background: #1A1A1A;
      margin: 0 60px;
      border-radius: 0 0 16px 16px;
      padding: 20px 72px 40px;
      border-top: 1px solid #333;
    }
    .google-badge {
      display: flex; align-items: center; gap: 12px;
      color: #888; font-size: 20px;
    }
    .tagline-area {
      padding: 32px 60px;
      text-align: right;
      color: #1A1A1A;
      font-family: 'Montserrat', sans-serif;
      font-size: 20px; font-style: italic;
    }
  </style>
</head>
<body>
  <div class="topo">
    <div class="logo-text">BR Pneus &amp; Oficina</div>
    <div class="stars">★★★★★</div>
  </div>

  <div class="corpo">
    <div class="aspas">"</div>
    <div class="depoimento">
      [DEPOIMENTO COMPLETO DO CLIENTE — usar palavras exatas, não resumir]
    </div>
    <div class="cliente">
      <div class="avatar">[INICIAL DO NOME]</div>
      <div class="cliente-info">
        <div class="cliente-nome">[NOME DO CLIENTE]</div>
        <div class="cliente-detalhe">[Cidade] · [Serviço realizado]</div>
      </div>
    </div>
  </div>

  <div class="rodape">
    <div class="google-badge">
      ✓ Avaliação verificada no Google Meu Negócio · BR Pneus [Cidade]
    </div>
  </div>

  <div class="tagline-area">Muito mais que pneus</div>
</body>
</html>
```

---

### SLIDE-APRESENTACAO — Relatório / Franqueado (1280×720)

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1280px; height: 720px;
      background: #1A1A1A;
      display: grid;
      grid-template-columns: 380px 1fr;
      overflow: hidden;
    }
    .lateral {
      background: #F5A623;
      padding: 64px 48px;
      display: flex; flex-direction: column;
      justify-content: space-between;
    }
    .logo-lateral {
      font-family: 'Montserrat', sans-serif;
      font-weight: 900; font-size: 22px;
      color: #1A1A1A; line-height: 1.2;
    }
    .slide-numero {
      font-family: 'Montserrat', sans-serif;
      font-size: 80px; font-weight: 900;
      color: rgba(26,26,26,0.2); line-height: 1;
    }
    .lateral-label {
      font-family: 'Montserrat', sans-serif;
      font-size: 14px; font-weight: 700;
      color: #1A1A1A;
      text-transform: uppercase; letter-spacing: 3px;
    }
    .conteudo {
      padding: 64px 72px;
      display: flex; flex-direction: column;
      justify-content: center; gap: 28px;
    }
    .eyebrow {
      color: #F5A623;
      font-family: 'Montserrat', sans-serif;
      font-size: 16px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 4px;
    }
    .titulo {
      color: #FFFFFF;
      font-family: 'Montserrat', sans-serif;
      font-size: 52px; font-weight: 900;
      line-height: 1.1;
    }
    .titulo em { color: #F5A623; font-style: normal; }
    .corpo { color: #CCCCCC; font-size: 22px; line-height: 1.6; }
    .metricas {
      display: flex; gap: 48px; margin-top: 16px;
    }
    .metrica { display: flex; flex-direction: column; gap: 4px; }
    .metrica-valor {
      font-family: 'Montserrat', sans-serif;
      font-size: 48px; font-weight: 900;
      color: #F5A623;
    }
    .metrica-label { color: #888; font-size: 16px; }
  </style>
</head>
<body>
  <div class="lateral">
    <div class="logo-lateral">BR Pneus<br>&amp; Oficina</div>
    <div class="slide-numero">0[N]</div>
    <div class="lateral-label">[Mês/Período] · [Cidade ou Rede]</div>
  </div>

  <div class="conteudo">
    <div class="eyebrow">[Seção — ex: Resultados do Mês]</div>
    <div class="titulo">[Título principal<br>do <em>slide aqui</em>]</div>
    <div class="corpo">[Texto descritivo — 2-3 frases de contexto ou lista de bullets]</div>
    <div class="metricas">
      <div class="metrica">
        <div class="metrica-valor">[NUM]</div>
        <div class="metrica-label">[Métrica 1]</div>
      </div>
      <div class="metrica">
        <div class="metrica-valor">[NUM]</div>
        <div class="metrica-label">[Métrica 2]</div>
      </div>
      <div class="metrica">
        <div class="metrica-valor">[NUM]</div>
        <div class="metrica-label">[Métrica 3]</div>
      </div>
    </div>
  </div>
</body>
</html>
```

---

## Como Exportar como Imagem

**Método 1 — Screenshot no navegador:**
1. Salvar o arquivo HTML
2. Abrir no Chrome/Firefox
3. Inspecionar elemento → definir zoom para que o elemento fique exato (geralmente 100%)
4. Ctrl+Shift+P → "Capture screenshot" (Chrome DevTools)

**Método 2 — Puppeteer (automatizado):**
```bash
npx puppeteer screenshot arquivo.html --width 1080 --height 1080 --output post.png
```

**Método 3 — html2canvas (no navegador):**
Incluir `<script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>` e chamar `html2canvas(document.body)`

---

## Checklist de Qualidade Visual

Antes de publicar qualquer criativo HTML:
- [ ] Cores corretas: `#F5A623`, `#1A1A1A`, `#FFFFFF` apenas
- [ ] Nome completo: "BR Pneus & Oficina" (nunca abreviado)
- [ ] Tagline presente: "Muito mais que pneus"
- [ ] CTA claro e legível (tamanho e contraste)
- [ ] Endereço ou WhatsApp da unidade visível
- [ ] Fontes carregando (testar sem internet — ter fallback)
- [ ] Texto legível em mobile (se for ser visualizado em celular)
- [ ] Nenhuma informação de preço inventada

---

## Salvar em
`output/criativos/html-[tipo]-[conteudo]-[data].html`

---

## Referências Cruzadas
- Identidade visual completa: `CLAUDE.md` → seção Identidade Visual
- Especificações de materiais impressos: `skills/franquias/material-pdv.md`
- Prompts para imagens com IA: `skills/criativos/prompt-visual.md`
- Checklist de marca: `skills/conteudo/brand-checklist-marca.md`
