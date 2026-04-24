---
name: carrossel-visual
description: Gera arquivo HTML único com todos os slides de um carrossel educativo ou promocional da BR Pneus & Oficina, empilhados para screenshot individual. Use sempre que precisar de carrossel para Instagram, sequência de slides, conteúdo educativo em múltiplos cards ou post deslizável — mesmo que o pedido use termos como "carrossel", "slides", "post sequência", "vários cards" ou "swipe post".
---

# Skill: Carrossel Visual Completo

## Comando
```
/carrossel-visual [tema] [num-slides-opcional]
```

## Parâmetros
- **tema** (obrigatório): Assunto do carrossel. Ex: "5-sinais-pneu-careca", "quando-fazer-alinhamento", "diferencias-br-pneus", "black-friday-2026"
- **num-slides** (opcional, padrão: `7`): Quantidade de slides — entre 5 e 10

---

## Estratégia de Carrossel

O carrossel é o formato de maior alcance orgânico no Instagram depois dos Reels. O algoritmo distribui para mais pessoas quando o usuário desliza (cada deslize conta como engajamento). Para maximizar deslizes:

- **Slide 1 (capa):** promessa clara — o usuário deve saber exatamente o que vai aprender
- **Slides 2 a N-1:** entregar um ponto valioso por slide — sem enrolação
- **Slide final:** sempre CTA — nunca terminar sem pedir uma ação
- **Gancho nos slides intermediários:** em vez de numerar "3 de 7", usar "➡ próxima: o erro fatal"

---

## Estrutura do Output

Arquivo HTML único contendo todos os slides empilhados verticalmente, separados visualmente. Cada slide é um bloco de **1080×1350px** (feed 4:5) independente, pronto para screenshot individual.

### Estrutura de Slides

**Slide 1 — Capa**
```
┌─────────────────────────────────┐
│ ██ BARRA #F5A623 (70px) ██████ │
│                        [LOGO]   │
│                                 │
│   TÍTULO DO CARROSSEL          │
│   em 1-2 linhas impactantes    │
│                                 │
│   "Deslize para aprender →"    │
│                                 │
│   ● ○ ○ ○ ○ ○ ○  (1/7)        │
│ ██ BARRA BASE (50px) ████████  │
└─────────────────────────────────┘
```

**Slides 2 a N-1 — Conteúdo**
```
┌─────────────────────────────────┐
│ ██ BARRA (40px) ████ 2/7 ████ │
│                                 │
│   EMOJI/ÍCONE GRANDE           │
│                                 │
│   TÍTULO DO PONTO              │
│   (1 linha, bold, amarelo)     │
│                                 │
│   Texto explicativo            │
│   máximo 30 palavras           │
│   claro e direto               │
│                                 │
│   ══════════════════ 28% ════  │  ← Barra progresso
│ ██ "próxima →" ████████████ ██│
└─────────────────────────────────┘
```

**Slide Final — CTA**
```
┌─────────────────────────────────┐
│ ██ BARRA AMARELA ██████████████│
│                                 │
│   [LOGO GRANDE CENTRALIZADO]   │
│                                 │
│   AGENDE SUA REVISÃO!          │
│                                 │
│   📱 WhatsApp: [NÚMERO]        │
│   📍 Endereço: [ENDEREÇO]      │
│   🕐 Horário: Seg-Sáb          │
│                                 │
│   Muito mais que pneus         │
│ ████████████████████████████ ██│
└─────────────────────────────────┘
```

---

## Template HTML Completo

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Carrossel — [TEMA] — BR Pneus & Oficina</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #333;
    padding: 40px;
    font-family: "Arial Black", Arial, sans-serif;
  }
  h2 {
    color: #F5A623;
    font-family: Arial, sans-serif;
    margin: 40px 0 12px;
    font-size: 16px;
    letter-spacing: 1px;
  }
  h2:first-of-type { margin-top: 0; }

  /* Container base de cada slide */
  .slide {
    width: 1080px;
    height: 1350px; /* Feed 4:5 */
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    margin-bottom: 4px;
  }

  /* Fundos alternados */
  .slide.escuro  { background: linear-gradient(150deg, #1A1A1A 0%, #2A2A2A 100%); }
  .slide.amarelo { background: #F5A623; }

  /* Barras */
  .barra-topo {
    height: 65px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 50px;
    flex-shrink: 0;
  }
  .slide.escuro  .barra-topo { background: #F5A623; }
  .slide.amarelo .barra-topo { background: #1A1A1A; }

  .barra-topo .num {
    font-size: 18px;
    font-weight: 900;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .slide.escuro  .barra-topo .num { color: #000; }
  .slide.amarelo .barra-topo .num { color: #F5A623; }

  .logo-sm {
    font-size: 16px;
    font-weight: 900;
    padding: 4px 12px;
    border-radius: 3px;
  }
  .slide.escuro  .logo-sm { background: #000; color: #F5A623; }
  .slide.amarelo .logo-sm { background: #F5A623; color: #000; }

  /* Corpo do slide */
  .corpo {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 50px 80px;
    text-align: center;
  }

  .icone { font-size: 90px; margin-bottom: 28px; line-height: 1; }

  .titulo-slide {
    font-size: 50px;
    font-weight: 900;
    text-transform: uppercase;
    line-height: 1.05;
    letter-spacing: -1px;
    margin-bottom: 24px;
  }
  .slide.escuro  .titulo-slide { color: #F5A623; }
  .slide.amarelo .titulo-slide { color: #000; }

  .texto-slide {
    font-size: 26px;
    font-weight: 400;
    line-height: 1.55;
  }
  .slide.escuro  .texto-slide { color: #CCCCCC; }
  .slide.amarelo .texto-slide { color: #1A1A1A; }
  .slide.amarelo .texto-slide strong { color: #000; font-weight: 900; }

  /* Barra de progresso */
  .progresso-barra {
    height: 6px;
    background: #333;
    border-radius: 3px;
    margin: 28px 0 10px;
    width: 300px;
    overflow: hidden;
  }
  .slide.amarelo .progresso-barra { background: rgba(0,0,0,0.2); }
  .progresso-fill { height: 100%; background: #F5A623; border-radius: 3px; }
  .slide.amarelo .progresso-fill { background: #000; }

  .proximo {
    font-size: 16px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    padding-bottom: 8px;
  }
  .slide.escuro  .proximo { color: #666; }
  .slide.amarelo .proximo { color: rgba(0,0,0,0.5); }

  /* Barra base */
  .barra-base {
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 14px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 3px;
  }
  .slide.escuro  .barra-base { background: #F5A623; color: #000; }
  .slide.amarelo .barra-base { background: #1A1A1A; color: #F5A623; }

  /* Capa específica */
  .capa-headline {
    color: #FFFFFF;
    font-size: 68px;
    font-weight: 900;
    text-transform: uppercase;
    line-height: 1;
    letter-spacing: -2px;
    margin-bottom: 16px;
  }
  .capa-headline span { color: #F5A623; }
  .capa-sub { color: #BBB; font-size: 22px; font-weight: 400; margin-bottom: 40px; }
  .capa-cta {
    border: 2px solid #F5A623;
    color: #F5A623;
    font-size: 18px;
    font-weight: 900;
    padding: 12px 40px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  /* Slide final CTA */
  .cta-headline {
    color: #000;
    font-size: 58px;
    font-weight: 900;
    text-transform: uppercase;
    line-height: 1;
    margin-bottom: 20px;
  }
  .cta-contato {
    color: #1A1A1A;
    font-size: 20px;
    font-weight: 400;
    line-height: 2;
    margin-bottom: 24px;
  }
  .cta-tagline {
    color: #000;
    font-size: 18px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 3px;
  }
</style>
</head>
<body>

<!-- ══════════════════════════════════════════════════ -->
<!-- SLIDE 1 — CAPA                                      -->
<!-- ══════════════════════════════════════════════════ -->
<h2>Slide 1 de 7 — Capa (screenshot este bloco)</h2>
<div class="slide escuro">
  <div class="barra-topo">
    <span class="num">1 / 7</span>
    <span class="logo-sm">BR Pneus &amp; Oficina</span>
  </div>
  <div class="corpo">
    <div class="capa-headline">[TÍTULO DO<br><span>CARROSSEL]</span></div>
    <div class="capa-sub">[Subtítulo — o que o usuário vai aprender]</div>
    <div class="capa-cta">Deslize para ver →</div>
  </div>
  <div class="barra-base">Muito mais que pneus</div>
</div>

<!-- ══════════════════════════════════════════════════ -->
<!-- SLIDE 2 — PONTO 1                                   -->
<!-- ══════════════════════════════════════════════════ -->
<h2>Slide 2 de 7 — Ponto 1</h2>
<div class="slide escuro">
  <div class="barra-topo">
    <span class="num">2 / 7</span>
    <span class="logo-sm">BR Pneus &amp; Oficina</span>
  </div>
  <div class="corpo">
    <div class="icone">🔍</div>
    <div class="titulo-slide">[TÍTULO DO PONTO 1]</div>
    <div class="texto-slide">[Texto explicativo do ponto — máximo 30 palavras. Direto e visual. Sem enrolação.]</div>
    <div class="progresso-barra"><div class="progresso-fill" style="width:28%"></div></div>
    <div class="proximo">próximo: [teaser do próximo ponto] →</div>
  </div>
  <div class="barra-base">Muito mais que pneus</div>
</div>

<!-- ══════════════════════════════════════════════════ -->
<!-- SLIDE 3 — PONTO 2 (fundo alternado amarelo)         -->
<!-- ══════════════════════════════════════════════════ -->
<h2>Slide 3 de 7 — Ponto 2</h2>
<div class="slide amarelo">
  <div class="barra-topo">
    <span class="num">3 / 7</span>
    <span class="logo-sm">BR Pneus &amp; Oficina</span>
  </div>
  <div class="corpo">
    <div class="icone">⚡</div>
    <div class="titulo-slide">[TÍTULO DO PONTO 2]</div>
    <div class="texto-slide">[Texto do ponto 2. <strong>Destaque palavras-chave</strong> com bold para facilitar leitura rápida.]</div>
    <div class="progresso-barra"><div class="progresso-fill" style="width:42%"></div></div>
    <div class="proximo">próximo: [teaser] →</div>
  </div>
  <div class="barra-base">Muito mais que pneus</div>
</div>

<!-- ══════════════════════════════════════════════════ -->
<!-- SLIDES 4, 5, 6 — Repetir padrão alternando cores   -->
<!-- Copiar bloco de slide escuro ou amarelo acima       -->
<!-- Atualizar: número, ícone, título, texto, progresso  -->
<!-- ══════════════════════════════════════════════════ -->

<!-- ══════════════════════════════════════════════════ -->
<!-- SLIDE FINAL — CTA                                   -->
<!-- ══════════════════════════════════════════════════ -->
<h2>Slide 7 de 7 — CTA Final</h2>
<div class="slide amarelo">
  <div class="barra-topo">
    <span class="num">7 / 7</span>
    <span class="logo-sm">BR Pneus &amp; Oficina</span>
  </div>
  <div class="corpo">
    <div class="logo-sm" style="font-size:26px; padding:12px 28px; margin-bottom:28px;">BR Pneus &amp; Oficina</div>
    <div class="cta-headline">AGENDE<br>AGORA!</div>
    <div class="cta-contato">
      📱 WhatsApp: [NÚMERO]<br>
      📍 [ENDEREÇO], [CIDADE]<br>
      🕐 Seg–Sex [HORÁRIO] · Sáb [HORÁRIO]
    </div>
    <div class="cta-tagline">Muito mais que pneus</div>
  </div>
  <div class="barra-base" style="background:#1A1A1A; color:#F5A623;">Garantia BR Total · Parcele em 18x</div>
</div>

</body>
</html>
```

---

## Carrosséis Prontos por Tema

| Tema | Slides sugeridos | Foco |
|------|-----------------|------|
| `sinais-pneu-careca` | 6 slides | Educativo: 5 sinais + CTA |
| `quando-alinhar` | 7 slides | Educativo: motivos + quando + benefícios |
| `diferenciais-br-pneus` | 6 slides | Institucional: 5 diferenciais + CTA |
| `revisao-antes-de-viajar` | 8 slides | Checklist: 7 pontos + CTA urgência |
| `mitos-pneus` | 8 slides | Entretenimento: 6 mitos + verdades + CTA |
| `campanha-sazonalidade` | 7 slides | Promocional: oferta + condições + CTA |

---

## Instrução de Exportação

```
1. Abra o HTML no Chrome
2. Para cada bloco/slide:
   a. Clique com botão direito no div.slide correspondente
   b. Inspecionar → localizar o elemento
   c. Botão direito no elemento no DevTools → "Capturar screenshot do nó"
3. Nomear: slide-01.png, slide-02.png ... slide-07.png
4. Publicar no Instagram como carrossel (ordem correta: 1→7)
```

---

## Salvar em
```
output/criativos/carrossel-[tema]-[YYYY-MM-DD].html
```
**Exemplo:** `output/criativos/carrossel-sinais-pneu-careca-2026-04-09.html`

---

## Referências Cruzadas
- Copy de cada slide: `skills/conteudo/psicologia-marketing.md`
- Versão em vídeo do mesmo tema: `skills/video/reels-roteiro.md` → formato `mitos-e-verdades`
- Legenda do post carrossel: `skills/social-media/copy-instagram.md`
