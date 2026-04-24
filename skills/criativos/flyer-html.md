---
name: flyer-html
description: Gera flyer digital e imprimível em HTML no formato A5 no estilo BR Pneus & Oficina — com frente e verso, copy completa, layout estruturado e instruções de impressão. Use sempre que precisar de flyer, panfleto, material impresso, folheto ou panfleto digital — mesmo que o pedido use termos como "fazer flyer", "panfleto de promoção", "folheto de inauguração", "material para distribuir" ou "flyer para imprimir".
---

# Skill: Flyer em HTML

## Comando
```
/flyer-html [ocasiao] [cidade]
```

## Parâmetros
- **ocasiao** (obrigatório): Motivo do flyer. Opções:
  - `inauguracao` — Inauguração de nova unidade
  - `promocao-pneus` — Promoção de pneus com preços por aro
  - `promocao-servico` — Promoção de serviço específico
  - `servicos-completos` — Apresentação de todos os serviços da loja
  - `black-friday` — Promoção Black Friday
  - `sazonal` — Promoção sazonal (férias, período de chuvas, volta às aulas)
- **cidade** (obrigatório): Unidade para personalização

---

## Especificações Técnicas

| Parâmetro | Valor |
|-----------|-------|
| Formato | A5 retrato |
| Dimensões tela | 559×794px (escala 1:1 para impressão 72dpi) |
| Dimensões impressão | 148×210mm (A5) |
| Margem de segurança | 5mm (área segura para corte) |
| Resolução sugerida | Para impressão profissional: exportar como PDF via Chrome |

---

## Template HTML Completo

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Flyer [OCASIÃO] — BR Pneus & Oficina [CIDADE]</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  /* ── Estilos base ── */
  body {
    background: #444;
    padding: 40px;
    font-family: "Arial Black", Arial, sans-serif;
  }
  h2 { color: #F5A623; font-family: Arial, sans-serif; margin: 30px 0 10px; font-size: 14px; }

  /* ── Container A5 ── */
  .flyer {
    width: 559px;
    min-height: 794px;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .flyer-frente { background: linear-gradient(170deg, #1A1A1A 0%, #2A2A2A 100%); }
  .flyer-verso  { background: #F5A623; margin-top: 30px; }

  /* ── Barra topo ── */
  .barra-topo {
    background: #F5A623;
    padding: 14px 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }
  .barra-topo .badge {
    color: #000;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 2px;
  }
  /* Logo simulado */
  .logo {
    background: #000;
    color: #F5A623;
    padding: 4px 10px;
    font-size: 13px;
    font-weight: 900;
    border-radius: 2px;
    letter-spacing: -0.5px;
  }

  /* ── Corpo ── */
  .corpo { flex: 1; padding: 28px 32px 20px; display: flex; flex-direction: column; }

  /* Headline */
  .headline {
    color: #FFFFFF;
    font-size: 38px;
    font-weight: 900;
    text-transform: uppercase;
    line-height: 1.05;
    letter-spacing: -1px;
    margin-bottom: 8px;
  }
  .headline span { color: #F5A623; }

  .sub {
    color: #AAAAAA;
    font-size: 15px;
    font-weight: 400;
    margin-bottom: 22px;
    line-height: 1.4;
  }

  /* Box de oferta */
  .oferta-box {
    border: 2px solid #F5A623;
    border-radius: 6px;
    padding: 18px 22px;
    margin-bottom: 22px;
    background: rgba(245,166,35,0.06);
  }
  .oferta-box .oferta-label {
    color: #F5A623;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 8px;
  }
  .oferta-box .preco-destaque {
    color: #FFFFFF;
    font-size: 48px;
    font-weight: 900;
    line-height: 1;
  }
  .oferta-box .preco-destaque sup { font-size: 20px; vertical-align: super; }
  .oferta-box .preco-nota {
    color: #888;
    font-size: 11px;
    font-weight: 400;
    margin-top: 6px;
  }

  /* Cards de aro (mini) */
  .cards-aro-mini {
    display: flex;
    gap: 8px;
    margin-bottom: 22px;
    flex-wrap: wrap;
  }
  .card-aro-mini {
    flex: 1;
    min-width: 100px;
    background: #111;
    border: 1.5px solid #F5A623;
    border-radius: 5px;
    padding: 10px 8px;
    text-align: center;
  }
  .card-aro-mini .aro { color: #F5A623; font-size: 12px; font-weight: 900; letter-spacing: 1px; }
  .card-aro-mini .val { color: #FFF; font-size: 24px; font-weight: 900; }
  .card-aro-mini .val sup { font-size: 11px; vertical-align: super; }

  /* Benefícios */
  .beneficios { margin-bottom: 20px; }
  .beneficio {
    color: #CCCCCC;
    font-size: 14px;
    font-weight: 400;
    padding: 5px 0;
    border-bottom: 1px solid #2A2A2A;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .beneficio::before { content: '✓'; color: #F5A623; font-weight: 900; }

  /* CTA */
  .cta-btn {
    background: #F5A623;
    color: #000;
    font-size: 18px;
    font-weight: 900;
    text-transform: uppercase;
    text-align: center;
    padding: 14px;
    border-radius: 5px;
    letter-spacing: 1px;
    margin-bottom: 16px;
  }

  /* Contato */
  .contato-flyer {
    color: #888;
    font-size: 12px;
    font-weight: 400;
    line-height: 1.9;
    text-align: center;
  }
  .contato-flyer a { color: #F5A623; text-decoration: none; }

  /* Barra base frente */
  .barra-base {
    background: #F5A623;
    padding: 10px 20px;
    text-align: center;
    color: #000;
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 3px;
    flex-shrink: 0;
  }

  /* ──── VERSO ──── */
  .verso-topo {
    background: #1A1A1A;
    padding: 14px 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .verso-topo .v-titulo { color: #F5A623; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; }
  .verso-topo .logo-v   { background: #F5A623; color: #000; padding: 3px 10px; font-size: 12px; font-weight: 900; border-radius: 2px; }

  .verso-corpo { padding: 24px 28px; flex: 1; }

  .servicos-lista h3 {
    color: #000;
    font-size: 20px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 16px;
  }
  .servicos-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 20px;
  }
  .servico-item {
    background: #1A1A1A;
    color: #FFF;
    padding: 9px 12px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .info-box {
    background: #1A1A1A;
    border-radius: 6px;
    padding: 16px;
    margin-bottom: 16px;
    color: #EEE;
    font-size: 13px;
    font-weight: 400;
    line-height: 1.9;
  }
  .info-box strong { color: #F5A623; }

  /* QR Code placeholder */
  .qr-area {
    display: flex;
    gap: 16px;
    align-items: center;
    margin-top: 16px;
  }
  .qr-placeholder {
    width: 90px;
    height: 90px;
    border: 2px dashed #1A1A1A;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: #1A1A1A;
    text-align: center;
    flex-shrink: 0;
    font-family: Arial, sans-serif;
  }
  .qr-texto { color: #1A1A1A; font-size: 13px; font-weight: 400; line-height: 1.6; font-family: Arial, sans-serif; }

  .verso-base {
    background: #1A1A1A;
    padding: 10px;
    text-align: center;
    color: #F5A623;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 3px;
  }

  /* ── Impressão ── */
  @media print {
    body { background: #fff; padding: 0; }
    h2   { display: none; }
    .flyer { page-break-after: always; }
    .instrucoes { display: none; }
  }
</style>
</head>
<body>

<!-- ═══════════ FRENTE DO FLYER ═══════════ -->
<h2>FRENTE — Imprimir frente do flyer A5</h2>
<div class="flyer flyer-frente">

  <div class="barra-topo">
    <span class="badge">⚡ [OCASIÃO]</span>
    <span class="logo">BR Pneus &amp; Oficina</span>
  </div>

  <div class="corpo">
    <div class="headline">[HEADLINE<br><span>PRINCIPAL]</span></div>
    <div class="sub">[Subtítulo com detalhe da oferta ou evento — 1-2 linhas]</div>

    <!-- Cards de preço por aro (para promoção de pneus) -->
    <div class="cards-aro-mini">
      <div class="card-aro-mini"><div class="aro">ARO 13</div><div class="val"><sup>R$</sup>179</div></div>
      <div class="card-aro-mini"><div class="aro">ARO 14</div><div class="val"><sup>R$</sup>199</div></div>
      <div class="card-aro-mini"><div class="aro">ARO 15</div><div class="val"><sup>R$</sup>239</div></div>
      <div class="card-aro-mini"><div class="aro">ARO 16</div><div class="val"><sup>R$</sup>269</div></div>
    </div>

    <div class="beneficios">
      <div class="beneficio">Parcelamento em até 18x sem juros</div>
      <div class="beneficio">Garantia BR Total de 1 ano</div>
      <div class="beneficio">Maior mix de pneus da região</div>
      <div class="beneficio">Equipe treinada e certificada</div>
    </div>

    <div class="cta-btn">📱 Agende pelo WhatsApp</div>

    <div class="contato-flyer">
      📍 [ENDEREÇO COMPLETO], [CIDADE] · 📱 ([DDD]) [NÚMERO]<br>
      ☎️ 0800 942 4402 · @brpneus[cidade] · Seg–Sáb [HORÁRIO]
    </div>
  </div>

  <div class="barra-base">Muito mais que pneus</div>
</div>

<!-- ═══════════ VERSO DO FLYER ═══════════ -->
<h2>VERSO — Imprimir verso do flyer A5</h2>
<div class="flyer flyer-verso">

  <div class="verso-topo">
    <span class="v-titulo">Nossos Serviços</span>
    <span class="logo-v">BR Pneus &amp; Oficina</span>
  </div>

  <div class="verso-corpo">
    <div class="servicos-lista">
      <h3>O que a gente faz:</h3>
      <div class="servicos-grid">
        <div class="servico-item">🛞 Pneus</div>
        <div class="servico-item">⚙️ Alinhamento 3D</div>
        <div class="servico-item">⚖️ Balanceamento</div>
        <div class="servico-item">🔧 Troca de Óleo</div>
        <div class="servico-item">🏎️ Suspensão</div>
        <div class="servico-item">🛑 Freios</div>
        <div class="servico-item">💉 Injeção Eletrônica</div>
        <div class="servico-item">❄️ Ar Condicionado</div>
        <div class="servico-item">⛓️ Correia Dentada</div>
        <div class="servico-item">🔬 Diagnóstico</div>
      </div>
    </div>

    <div class="info-box">
      <strong>📍 [ENDEREÇO COMPLETO]</strong><br>
      [CIDADE], [ESTADO] · CEP [CEP]<br>
      📱 <strong>([DDD]) [NÚMERO]</strong><br>
      ☎️ 0800 942 4402 (ligação gratuita)<br>
      🕐 Seg–Sex: [HORÁRIO] · Sáb: [HORÁRIO]<br>
      💳 Parcelamos em até 18x no cartão
    </div>

    <div class="qr-area">
      <div class="qr-placeholder">
        Gerar QR Code em<br>qr-code-generator.com<br>apontando para<br>WhatsApp ou site
      </div>
      <div class="qr-texto">
        Aponte a câmera do celular para o QR Code e entre em contato direto pelo WhatsApp!
      </div>
    </div>
  </div>

  <div class="verso-base">Muito mais que pneus · brpneus.com.br</div>
</div>

<!-- Instruções de impressão -->
<div style="width:559px; background:#333; color:#ccc; padding:16px; margin-top:20px; font-family:Arial,sans-serif; font-size:13px;">
  <strong style="color:#F5A623;">Como imprimir:</strong><br>
  1. Chrome → Ctrl+P → Salvar como PDF<br>
  2. Tamanho do papel: A5 (148×210mm)<br>
  3. Orientação: Retrato · Margens: Mínimas<br>
  4. Para impressão gráfica: enviar PDF ao designer para ajuste CMYK<br>
  <br>
  <strong style="color:#F5A623;">Personalização:</strong>
  Substitua os textos entre [COLCHETES] pelos dados reais da unidade.
</div>

</body>
</html>
```

---

## Salvar em
```
output/criativos/flyer-[ocasiao]-[cidade]-[YYYY-MM-DD].html
```
**Exemplo:** `output/criativos/flyer-inauguracao-maringa-2026-04-09.html`

---

## Referências Cruzadas
- Material de PDV para a loja: `skills/franquias/material-pdv.md`
- Briefing para designer fazer versão profissional: `skills/criativos/briefing-designer.md`
- Post de redes sociais para a mesma campanha: `skills/criativos/post-visual-html.md`
