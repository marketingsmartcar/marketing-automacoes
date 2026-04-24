---
name: kit-visual-campanha
description: Gera o pacote visual completo de uma campanha da BR Pneus & Oficina — todas as peças para todos os canais (Instagram, Stories, Facebook, banner site, WhatsApp, Google Ads) em um único arquivo HTML, com identidade visual coesa. Use sempre que precisar do kit completo de uma campanha, todas as artes de uma vez, peças para múltiplos canais ou pacote visual completo — mesmo que o pedido use termos como "kit de campanha", "todas as peças", "artes da campanha", "pacote de posts" ou "material completo".
---

# Skill: Kit Visual Completo para Campanha

## Comando
```
/kit-visual-campanha [campanha] [cidade]
```

## Parâmetros
- **campanha** (obrigatório): Nome/tema da campanha. Ex:
  - `black-friday-2026`
  - `dia-dos-pais-2026`
  - `ferias-julho-2026`
  - `inauguracao-maringa`
  - `mega-oferta-pneus-abril`
  - `revisao-antes-viagem`
- **cidade** (obrigatório): Unidade principal ou `rede` para todas as unidades

---

## O que está incluído no Kit

| # | Peça | Dimensão | Canal |
|---|------|----------|-------|
| 1 | **Post Feed Instagram e Facebook** (orgânico) | **1080×1350px** (4:5) | Instagram e Facebook Feed |
| 2 | **Post Patrocinado / Ads** (anúncio pago) | **1080×1080px** (1:1) | Instagram e Facebook Ads |
| 3 | Stories Card 1 (gancho) | 1080×1920px | Instagram/Facebook Stories |
| 4 | Stories Card 2 (oferta) | 1080×1920px | Instagram/Facebook Stories |
| 5 | Stories Card 3 (CTA) | 1080×1920px | Instagram/Facebook Stories |
| 6 | Banner Site Hero | 1920×600px | Site/Landing Page |
| 7 | Banner WhatsApp | 800×800px | Disparos WhatsApp |
| 8 | Google Ads Retângulo | 300×250px | Google Display |
| 9 | Google Ads Leaderboard | 728×90px | Google Display |

---

## Estrutura do Arquivo HTML

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Kit Visual — [CAMPANHA] — BR Pneus & Oficina [CIDADE]</title>
<style>
  /* ── Reset e base ── */
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: #2A2A2A;
    padding: 40px;
    font-family: "Arial Black", Arial, sans-serif;
  }

  /* ── Cabeçalho do kit ── */
  .kit-header {
    width: 100%;
    max-width: 1200px;
    background: #F5A623;
    padding: 24px 40px;
    border-radius: 8px;
    margin-bottom: 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .kit-header h1 { color: #000; font-size: 24px; font-weight: 900; text-transform: uppercase; }
  .kit-header p  { color: #1A1A1A; font-size: 14px; font-weight: 400; margin-top: 4px; }
  .kit-header .logo { background: #000; color: #F5A623; padding: 8px 20px; font-size: 18px; font-weight: 900; border-radius: 4px; }

  /* ── Seção de cada peça ── */
  .secao { margin-bottom: 60px; }
  .secao-titulo {
    color: #F5A623;
    font-size: 18px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 2px;
    padding: 12px 0;
    border-bottom: 2px solid #F5A623;
    margin-bottom: 16px;
    font-family: Arial, sans-serif;
  }
  .secao-info {
    color: #888;
    font-size: 13px;
    font-family: Arial, sans-serif;
    margin-bottom: 12px;
  }

  /* ── Variáveis visuais da campanha ── */
  /* Definir aqui as variáveis CSS da campanha para manter consistência */
  :root {
    --cor-destaque: #F5A623;    /* Amarelo BR Pneus */
    --cor-fundo: #1A1A1A;       /* Preto base */
    --cor-fundo-alt: #2A2A2A;   /* Preto alternativo */
    --cor-texto: #FFFFFF;       /* Branco principal */
    --cor-texto-sub: #AAAAAA;   /* Cinza subtítulo */
    --campanha-badge: "CAMPANHA";   /* Substituir pelo nome da campanha */
  }

  /* ── Componentes reutilizáveis ── */
  .barra-am { background: var(--cor-destaque); }
  .fundo-escuro { background: linear-gradient(150deg, var(--cor-fundo) 0%, var(--cor-fundo-alt) 100%); }

  .logo-badge {
    background: #000;
    color: var(--cor-destaque);
    padding: 5px 14px;
    font-size: 14px;
    font-weight: 900;
    border-radius: 3px;
    letter-spacing: -0.5px;
    display: inline-block;
  }
  .badge-campanha {
    background: var(--cor-destaque);
    color: #000;
    padding: 4px 14px;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 2px;
    border-radius: 2px;
    display: inline-block;
  }

  /* ── PEÇA 1: Post Feed Instagram/Facebook 1080×1350 (4:5 orgânico) ── */
  .post-ig {
    width: 1080px;
    height: 1350px;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .post-ig .barra-t { height: 65px; display: flex; align-items: center; justify-content: space-between; padding: 0 40px; flex-shrink: 0; }
  .post-ig .barra-b { height: 56px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; }
  .post-ig .corpo   { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 60px; text-align: center; }

  /* ── PEÇA 3-5: Stories 1080×1920 ── */
  .story {
    width: 1080px;
    height: 1920px;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .story .barra-t { height: 80px; display: flex; align-items: center; justify-content: space-between; padding: 0 50px; flex-shrink: 0; }
  .story .corpo   { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 80px; text-align: center; }
  .story .barra-b { height: 80px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; }

  /* ── PEÇA 6: Post Facebook 1200×630 ── */
  .post-fb {
    width: 1200px;
    height: 630px;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: stretch;
  }
  .post-fb .col-esq { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 50px 60px; }
  .post-fb .col-dir { flex: 0 0 400px; display: flex; align-items: center; justify-content: center; background: rgba(245,166,35,0.08); border-left: 3px solid var(--cor-destaque); }
  .post-fb .barra-v { width: 8px; background: var(--cor-destaque); flex-shrink: 0; }

  /* ── PEÇA 9: Google Ads 300×250 ── */
  .gads-rect {
    width: 300px;
    height: 250px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    font-size: 13px;
  }

  /* ── PEÇA 10: Google Ads 728×90 ── */
  .gads-leader {
    width: 728px;
    height: 90px;
    overflow: hidden;
    display: flex;
    align-items: center;
    padding: 0 16px;
    gap: 16px;
  }

  /* ── Tipografia ── */
  .h-xl  { font-size: 68px; font-weight: 900; text-transform: uppercase; line-height: 1; letter-spacing: -2px; color: #FFF; }
  .h-xl span { color: var(--cor-destaque); }
  .h-lg  { font-size: 52px; font-weight: 900; text-transform: uppercase; line-height: 1.05; color: #FFF; }
  .h-md  { font-size: 36px; font-weight: 900; text-transform: uppercase; line-height: 1.1; color: #FFF; }
  .h-sm  { font-size: 26px; font-weight: 900; text-transform: uppercase; color: var(--cor-destaque); }
  .sub   { font-size: 22px; font-weight: 400; color: #BBB; line-height: 1.4; margin: 12px 0 32px; }
  .sub-sm{ font-size: 16px; font-weight: 400; color: #999; line-height: 1.5; margin: 8px 0 20px; }

  /* ── Botão CTA ── */
  .btn-cta {
    display: inline-block;
    background: var(--cor-destaque);
    color: #000;
    font-size: 20px;
    font-weight: 900;
    text-transform: uppercase;
    padding: 16px 48px;
    border-radius: 5px;
    letter-spacing: 1px;
    text-decoration: none;
  }
  .btn-cta-sm {
    display: inline-block;
    background: var(--cor-destaque);
    color: #000;
    font-size: 13px;
    font-weight: 900;
    text-transform: uppercase;
    padding: 8px 20px;
    border-radius: 3px;
    letter-spacing: 1px;
    white-space: nowrap;
  }

  /* ── Cards de preço ── */
  .cards-precos { display: flex; gap: 16px; justify-content: center; margin-bottom: 32px; }
  .card-preco { background: #111; border: 2px solid var(--cor-destaque); border-radius: 8px; padding: 16px 20px; text-align: center; min-width: 140px; }
  .card-preco .aro { color: var(--cor-destaque); font-size: 14px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; }
  .card-preco .apm { color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
  .card-preco .val { color: #FFF; font-size: 42px; font-weight: 900; line-height: 1; }
  .card-preco .val sup { font-size: 16px; vertical-align: super; color: #CCC; }

  /* ── Contato ── */
  .contato { color: #888; font-size: 15px; font-weight: 400; line-height: 1.9; margin-top: 20px; }
</style>
</head>
<body>

<!-- ══ CABEÇALHO DO KIT ══ -->
<div class="kit-header">
  <div>
    <h1>Kit Visual — [CAMPANHA]</h1>
    <p>BR Pneus &amp; Oficina — [CIDADE] · Gerado em [DATA]</p>
  </div>
  <div class="logo">BR Pneus &amp; Oficina</div>
</div>

<!-- ══════════════════════════════════════════════════════════ -->
<!-- PEÇA 1 — POST FEED INSTAGRAM E FACEBOOK (1080×1350)        -->
<!-- ══════════════════════════════════════════════════════════ -->
<div class="secao">
  <div class="secao-titulo">1. Feed Instagram e Facebook — 1080×1350px (Screenshot este bloco)</div>
  <div class="secao-info">Canal: Instagram e Facebook · Uso: Feed orgânico · Formato: 4:5 retrato</div>

  <div class="post-ig fundo-escuro">
    <div class="barra-t barra-am">
      <span class="badge-campanha">[CAMPANHA]</span>
      <span class="logo-badge">BR Pneus &amp; Oficina</span>
    </div>
    <div class="corpo">
      <div class="h-xl">[HEADLINE<br><span>PRINCIPAL]</span></div>
      <div class="sub">[Subtítulo — detalhe da oferta ou benefício]</div>
      <div class="cards-precos">
        <div class="card-preco"><div class="aro">Aro 13</div><div class="apm">a partir de</div><div class="val"><sup>R$</sup>179</div></div>
        <div class="card-preco"><div class="aro">Aro 14</div><div class="apm">a partir de</div><div class="val"><sup>R$</sup>199</div></div>
        <div class="card-preco"><div class="aro">Aro 15</div><div class="apm">a partir de</div><div class="val"><sup>R$</sup>239</div></div>
        <div class="card-preco"><div class="aro">Aro 16</div><div class="apm">a partir de</div><div class="val"><sup>R$</sup>269</div></div>
      </div>
      <a href="#" class="btn-cta">📱 Agende pelo WhatsApp</a>
      <div class="contato">📍 [ENDEREÇO], [CIDADE] · 📱 ([DDD]) [NÚMERO]<br>Parcelamos em 18x · Garantia BR Total 1 ano</div>
    </div>
    <div class="barra-b barra-am" style="color:#000;">Muito mais que pneus</div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════════ -->
<!-- PEÇA 3 — STORY CARD 1: GANCHO (1080×1920)                 -->
<!-- ══════════════════════════════════════════════════════════ -->
<div class="secao">
  <div class="secao-titulo">3. Story Card 1 — Gancho 1080×1920px</div>
  <div class="secao-info">Canal: Instagram/Facebook Stories · Uso: Primeiro card de sequência</div>

  <div class="story fundo-escuro">
    <div class="barra-t barra-am">
      <span class="badge-campanha">[CAMPANHA] · 1/3</span>
      <span class="logo-badge">BR Pneus</span>
    </div>
    <div class="corpo">
      <div style="font-size:100px; margin-bottom:40px;">⚡</div>
      <div class="h-lg" style="font-size:72px; margin-bottom:20px;">[GANCHO<br>DO STORY]</div>
      <div class="sub" style="font-size:28px;">[Promessa — o que vem no próximo card]</div>
      <div style="color:#F5A623; font-size:22px; font-weight:900; text-transform:uppercase; letter-spacing:3px; margin-top:60px;">👆 VEJA O PRÓXIMO</div>
    </div>
    <div class="barra-b barra-am" style="color:#000; font-size:15px;">BR Pneus &amp; Oficina · [CIDADE]</div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════════ -->
<!-- PEÇA 5 — STORY CARD 3: CTA (1080×1920)                    -->
<!-- ══════════════════════════════════════════════════════════ -->
<div class="secao">
  <div class="secao-titulo">5. Story Card 3 — CTA 1080×1920px</div>
  <div class="secao-info">Canal: Instagram/Facebook Stories · Uso: Card final com ação</div>

  <div class="story" style="background:#F5A623;">
    <div class="barra-t" style="background:#1A1A1A;">
      <span style="color:#F5A623; font-size:16px; font-weight:900; text-transform:uppercase; letter-spacing:2px;">[CAMPANHA] · 3/3</span>
      <span class="logo-badge" style="background:#F5A623; color:#000;">BR Pneus</span>
    </div>
    <div class="corpo">
      <div class="logo-badge" style="font-size:28px; padding:14px 32px; margin-bottom:40px; background:#1A1A1A; color:#F5A623;">BR Pneus &amp; Oficina</div>
      <div style="color:#000; font-size:68px; font-weight:900; text-transform:uppercase; line-height:1; margin-bottom:24px;">AGENDE<br>AGORA!</div>
      <div style="color:#1A1A1A; font-size:24px; font-weight:400; line-height:2; margin-bottom:36px;">
        📱 [NÚMERO]<br>📍 [CIDADE]<br>🕐 Seg–Sáb
      </div>
      <a href="#" class="btn-cta" style="background:#1A1A1A; color:#F5A623; font-size:22px; padding:20px 60px;">Chamar no WhatsApp</a>
      <div style="color:#000; font-size:18px; font-weight:900; text-transform:uppercase; letter-spacing:3px; margin-top:40px;">Muito mais que pneus</div>
    </div>
    <div class="barra-b" style="background:#1A1A1A; color:#F5A623; font-size:15px;">Parcele em 18x · Garantia BR Total 1 ano</div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════════ -->
<!-- PEÇA 6 — POST FACEBOOK (1200×630)                         -->
<!-- ══════════════════════════════════════════════════════════ -->
<div class="secao">
  <div class="secao-titulo">6. Post Facebook — 1200×630px</div>
  <div class="secao-info">Canal: Facebook Feed · Uso: Post com ou sem link</div>

  <div class="post-fb fundo-escuro">
    <div class="barra-v"></div>
    <div class="col-esq">
      <span class="badge-campanha" style="margin-bottom:20px;">[CAMPANHA]</span>
      <div class="h-md" style="margin-bottom:12px;">[HEADLINE]<br><span style="color:#F5A623;">[DESTAQUE]</span></div>
      <div class="sub-sm">[Subtítulo com detalhe da oferta — 1-2 linhas]</div>
      <a href="#" class="btn-cta" style="font-size:16px; padding:12px 32px; margin-bottom:16px;">📱 Pedir Orçamento</a>
      <div style="color:#666; font-size:13px; font-weight:400;">📍 [ENDEREÇO], [CIDADE] · 📱 [NÚMERO]</div>
    </div>
    <div class="col-dir" style="flex-direction:column; gap:16px;">
      <div class="card-preco" style="min-width:160px;"><div class="aro">Aro 14</div><div class="apm">a partir de</div><div class="val"><sup>R$</sup>199</div></div>
      <div style="color:#666; font-size:12px; text-align:center; font-weight:400;">Parcelado em 18x</div>
      <span class="logo-badge" style="font-size:14px; text-align:center;">BR Pneus &amp; Oficina</span>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════════ -->
<!-- PEÇA 9 — GOOGLE ADS 300×250                               -->
<!-- ══════════════════════════════════════════════════════════ -->
<div class="secao">
  <div class="secao-titulo">9. Google Ads — 300×250px (Retângulo médio)</div>
  <div class="secao-info">Canal: Google Display Network · Uso: Banner lateral em sites parceiros</div>

  <div class="gads-rect fundo-escuro">
    <div style="background:#F5A623; padding:8px 12px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
      <span style="color:#000; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:1px;">[CAMPANHA]</span>
      <span style="background:#000; color:#F5A623; padding:2px 8px; font-size:10px; font-weight:900; border-radius:2px;">BR Pneus</span>
    </div>
    <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:16px; text-align:center;">
      <div style="color:#FFF; font-size:22px; font-weight:900; text-transform:uppercase; line-height:1.1; margin-bottom:8px;">[HEADLINE<br>CURTO]</div>
      <div style="color:#F5A623; font-size:32px; font-weight:900; line-height:1; margin-bottom:6px;"><sup style="font-size:14px; vertical-align:super; color:#AAA;">R$</sup>179</div>
      <div style="color:#888; font-size:10px; margin-bottom:14px; font-weight:400;">a partir de · aro 13</div>
      <a href="#" class="btn-cta-sm">Ver Oferta →</a>
    </div>
    <div style="background:#F5A623; padding:6px; text-align:center; color:#000; font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:2px; flex-shrink:0;">Muito mais que pneus</div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════════ -->
<!-- PEÇA 10 — GOOGLE ADS 728×90 (Leaderboard)                -->
<!-- ══════════════════════════════════════════════════════════ -->
<div class="secao">
  <div class="secao-titulo">10. Google Ads — 728×90px (Leaderboard)</div>
  <div class="secao-info">Canal: Google Display · Uso: Banner horizontal no topo de sites</div>

  <div class="gads-leader fundo-escuro" style="border-top:4px solid #F5A623;">
    <span style="background:#000; color:#F5A623; padding:4px 10px; font-size:12px; font-weight:900; border-radius:2px; flex-shrink:0;">BR Pneus</span>
    <div style="width:3px; height:50px; background:#F5A623; flex-shrink:0;"></div>
    <div style="flex:1; color:#FFF; font-size:18px; font-weight:900; text-transform:uppercase; line-height:1.1;">[HEADLINE CAMPANHA]</div>
    <div style="color:#F5A623; font-size:24px; font-weight:900; flex-shrink:0;"><sup style="font-size:12px; vertical-align:super; color:#AAA;">R$</sup>179</div>
    <div style="color:#888; font-size:11px; flex-shrink:0; font-weight:400; text-align:center; line-height:1.4;">a partir de<br>aro 13</div>
    <a href="#" class="btn-cta-sm" style="flex-shrink:0;">Agendar →</a>
  </div>
</div>

<!-- Instruções de exportação -->
<div style="background:#1A1A1A; border:2px solid #F5A623; border-radius:8px; padding:28px 32px; margin-top:20px; color:#CCC; font-family:Arial,sans-serif; font-size:14px; line-height:1.8; max-width:900px;">
  <div style="color:#F5A623; font-size:16px; font-weight:900; text-transform:uppercase; letter-spacing:2px; margin-bottom:12px;">Como Exportar Este Kit</div>
  <strong style="color:#FFF;">Método 1 — Chrome DevTools (mais preciso):</strong><br>
  1. Abra este HTML no Google Chrome<br>
  2. Pressione F12 para abrir o DevTools<br>
  3. No painel de Elements, clique com botão direito no div da peça desejada<br>
  4. Selecione "Capture node screenshot"<br>
  5. A imagem será salva automaticamente em PNG<br><br>
  <strong style="color:#FFF;">Método 2 — Extensão GoFullPage:</strong><br>
  Instalar extensão "GoFullPage" no Chrome → capturar a página inteira → recortar cada peça<br><br>
  <strong style="color:#FFF;">Personalização obrigatória antes de publicar:</strong><br>
  Substituir todos os campos entre [COLCHETES] pelos dados reais da campanha e da unidade.
</div>

</body>
</html>
```

---

## Salvar em
```
output/criativos/kit-visual-[campanha]-[cidade]-[YYYY-MM-DD].html
```
**Exemplo:** `output/criativos/kit-visual-black-friday-2026-araraquara-2026-04-09.html`

---

## Referências Cruzadas
- Peça individual de post: `skills/criativos/post-visual-html.md`
- Banner para o site: `skills/criativos/banner-site-html.md`
- Carrossel da campanha: `skills/criativos/carrossel-visual.md`
- Copy para o kit: `agents/copywriter-ads.md` → `/campanha-completa`
- Roteiro de vídeo para a campanha: `skills/video/reels-roteiro.md` → `data-comemorativa`
