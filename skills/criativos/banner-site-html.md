---
name: banner-site-html
description: Gera banners HTML responsivos para o site da BR Pneus & Oficina — hero banner, banner de promoção, CTA flutuante e popup de exit intent. Use sempre que precisar de banner para o site, pop-up de oferta, barra de urgência, CTA flutuante ou hero banner — mesmo que o pedido use termos como "banner pro site", "popup de desconto", "barra de cima", "hero do site" ou "banner de promoção".
---

# Skill: Banner para Site em HTML

## Comando
```
/banner-site-html [tipo-banner] [conteudo] [cta]
```

## Parâmetros
- **tipo-banner** (obrigatório): Tipo. Opções:
  - `hero` — Banner principal do topo (1920×600px, responsivo)
  - `promo` — Banner de promoção inline (adaptável)
  - `cta-flutuante` — Barra fixa no topo ou base da página
  - `popup-saida` — Pop-up de exit intent com oferta especial
  - `barra-urgencia` — Faixa fina de urgência com countdown ou prazo
- **conteudo** (obrigatório): O que comunicar. Ex: "mega oferta pneus parcelados em 18x", "alinhamento grátis na troca de 4 pneus"
- **cta** (obrigatório): Ação desejada: `agendar` / `whatsapp` / `orcamento` / `ligar` / `ver-oferta`

---

## Requisitos Técnicos

- HTML único, CSS responsivo com `@media` queries
- Zero dependências externas
- Animações CSS puras (sem JavaScript externo)
- CTA com `href="#"` — franqueado substitui pelo link real
- Botão WhatsApp com `href="https://wa.me/[NÚMERO]"` em comentário

---

## Templates por Tipo

### `hero` (1920×600px responsivo)

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Hero Banner — BR Pneus & Oficina</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  .hero {
    width: 100%;
    min-height: 600px;
    background: linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 60%, #1A1A1A 100%);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 60px 120px;
    position: relative;
    overflow: hidden;
    font-family: "Arial Black", Arial, sans-serif;
  }

  /* Faixa decorativa diagonal */
  .hero::before {
    content: '';
    position: absolute;
    top: 0; right: 0;
    width: 40%;
    height: 100%;
    background: #F5A623;
    clip-path: polygon(20% 0%, 100% 0%, 100% 100%, 0% 100%);
    opacity: 0.08;
  }

  /* Barra de urgência no topo */
  .barra-urgencia {
    position: absolute;
    top: 0; left: 0; right: 0;
    background: #F5A623;
    color: #000;
    text-align: center;
    padding: 10px;
    font-size: 15px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  .hero-content {
    flex: 1;
    max-width: 700px;
    padding-top: 40px;
    animation: fadeInLeft 0.6s ease-out;
  }

  @keyframes fadeInLeft {
    from { opacity: 0; transform: translateX(-30px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  .badge {
    display: inline-block;
    background: #F5A623;
    color: #000;
    font-size: 13px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 3px;
    padding: 6px 20px;
    border-radius: 3px;
    margin-bottom: 20px;
  }

  .hero h1 {
    color: #FFFFFF;
    font-size: 64px;
    font-weight: 900;
    text-transform: uppercase;
    line-height: 1;
    letter-spacing: -2px;
    margin-bottom: 16px;
  }
  .hero h1 span { color: #F5A623; }

  .hero .sub {
    color: #CCCCCC;
    font-size: 22px;
    font-weight: 400;
    line-height: 1.5;
    margin-bottom: 36px;
  }

  .cta-group { display: flex; gap: 16px; flex-wrap: wrap; }

  .btn-primary {
    background: #F5A623;
    color: #000;
    font-size: 20px;
    font-weight: 900;
    text-transform: uppercase;
    padding: 18px 48px;
    border-radius: 6px;
    text-decoration: none;
    letter-spacing: 1px;
    transition: transform 0.2s, box-shadow 0.2s;
    display: inline-block;
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(245,166,35,0.4); }
    50%       { box-shadow: 0 0 0 12px rgba(245,166,35,0); }
  }
  .btn-primary:hover { transform: translateY(-2px); }

  .btn-secondary {
    background: transparent;
    color: #FFFFFF;
    font-size: 18px;
    font-weight: 700;
    border: 2px solid #FFFFFF;
    padding: 16px 40px;
    border-radius: 6px;
    text-decoration: none;
    display: inline-block;
  }

  .confianca {
    margin-top: 28px;
    color: #999;
    font-size: 14px;
    font-weight: 400;
  }
  .confianca strong { color: #F5A623; }

  /* Lado direito — placeholder de imagem */
  .hero-visual {
    flex: 0 0 380px;
    height: 400px;
    background: #2A2A2A;
    border: 2px dashed #F5A623;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #F5A623;
    font-size: 14px;
    text-align: center;
    padding: 20px;
  }

  /* Responsivo */
  @media (max-width: 900px) {
    .hero { flex-direction: column; padding: 80px 40px 60px; min-height: auto; }
    .hero h1 { font-size: 42px; }
    .hero-visual { flex: none; width: 100%; height: 250px; margin-top: 40px; }
  }
  @media (max-width: 480px) {
    .hero { padding: 80px 24px 40px; }
    .hero h1 { font-size: 34px; }
    .btn-primary { font-size: 16px; padding: 14px 32px; }
  }
</style>
</head>
<body>

<div class="hero">
  <!-- Barra urgência — remover se não houver prazo -->
  <div class="barra-urgencia">⚡ Oferta válida até [DATA] · Parcele em 18x · Garantia BR Total 1 ano</div>

  <div class="hero-content">
    <div class="badge">Mega Oferta</div>
    <h1>PNEUS A PARTIR<br>DE <span>R$ 179</span></h1>
    <p class="sub">Nacionais, importados e semi-novos.<br>Parcelado em até 18x sem juros. Em [CIDADE].</p>

    <div class="cta-group">
      <!-- Substituir href pelo link real do WhatsApp: https://wa.me/55[NÚMERO] -->
      <a href="#" class="btn-primary">📱 Pedir Orçamento</a>
      <a href="#" class="btn-secondary">Ver Serviços</a>
    </div>

    <div class="confianca">
      <strong>★★★★★ 4.8 no Google</strong> · +500 clientes atendidos em [CIDADE]
    </div>
  </div>

  <!-- SUBSTITUIR por imagem real: pneu, carro ou equipe -->
  <div class="hero-visual">
    [IMAGEM] Pneu novo<br>ou carro sendo atendido<br>1:1 ratio sugerido<br>Fundo escuro
  </div>
</div>

</body>
</html>
```

---

### `cta-flutuante` — Barra fixa

```html
<!-- Adicionar dentro do <head> do site -->
<style>
  .barra-cta {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    background: #F5A623;
    color: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 24px;
    padding: 14px 24px;
    font-family: "Arial Black", Arial, sans-serif;
    z-index: 9999;
    animation: slideUp 0.4s ease-out;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.3);
  }
  @keyframes slideUp {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
  .barra-cta .texto {
    font-size: 18px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .barra-cta .btn {
    background: #000;
    color: #F5A623;
    padding: 10px 32px;
    border-radius: 4px;
    font-size: 16px;
    font-weight: 900;
    text-decoration: none;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .barra-cta .fechar {
    position: absolute;
    right: 16px;
    cursor: pointer;
    font-size: 20px;
    color: #000;
    background: none;
    border: none;
    font-weight: 900;
  }
</style>

<div class="barra-cta" id="barracta">
  <span class="texto">🔥 Pneus a partir de R$179 · Parcela em 18x</span>
  <a href="#" class="btn">Agendar Agora →</a>
  <button class="fechar" onclick="document.getElementById('barracta').style.display='none'">✕</button>
</div>
```

---

### `popup-saida` — Exit Intent

```html
<!-- CSS do popup -->
<style>
  .overlay-popup {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.85);
    z-index: 99999;
    align-items: center;
    justify-content: center;
  }
  .overlay-popup.ativo { display: flex; }

  .popup-card {
    background: #1A1A1A;
    border: 3px solid #F5A623;
    border-radius: 12px;
    padding: 48px 56px;
    max-width: 560px;
    width: 90%;
    text-align: center;
    font-family: "Arial Black", Arial, sans-serif;
    position: relative;
    animation: popIn 0.3s ease-out;
  }
  @keyframes popIn {
    from { transform: scale(0.85); opacity: 0; }
    to   { transform: scale(1); opacity: 1; }
  }

  .popup-fechar {
    position: absolute;
    top: 16px; right: 20px;
    color: #999;
    font-size: 24px;
    cursor: pointer;
    background: none;
    border: none;
    font-weight: 900;
  }
  .popup-badge {
    background: #F5A623;
    color: #000;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 3px;
    text-transform: uppercase;
    padding: 5px 20px;
    border-radius: 20px;
    display: inline-block;
    margin-bottom: 20px;
  }
  .popup-h1 {
    color: #FFF;
    font-size: 40px;
    font-weight: 900;
    text-transform: uppercase;
    line-height: 1.1;
    margin-bottom: 12px;
  }
  .popup-h1 span { color: #F5A623; }
  .popup-sub { color: #BBB; font-size: 17px; font-weight: 400; margin-bottom: 32px; line-height: 1.5; }
  .popup-btn {
    display: block;
    background: #F5A623;
    color: #000;
    font-size: 20px;
    font-weight: 900;
    text-transform: uppercase;
    padding: 18px;
    border-radius: 6px;
    text-decoration: none;
    letter-spacing: 1px;
    margin-bottom: 12px;
  }
  .popup-nao {
    color: #666;
    font-size: 13px;
    cursor: pointer;
    background: none;
    border: none;
    font-family: Arial, sans-serif;
  }
</style>

<div class="overlay-popup" id="popupSaida">
  <div class="popup-card">
    <button class="popup-fechar" onclick="fecharPopup()">✕</button>
    <div class="popup-badge">Oferta Exclusiva</div>
    <div class="popup-h1">Espera!<br>Tem uma <span>condição especial</span><br>pra você.</div>
    <p class="popup-sub">
      Nos dê 30 segundos no WhatsApp e te passamos<br>
      o melhor preço de [CIDADE] em pneus e serviços.
    </p>
    <!-- Substituir pelo link WhatsApp real -->
    <a href="#" class="popup-btn">📱 Chamar no WhatsApp Agora</a>
    <button class="popup-nao" onclick="fecharPopup()">Não, obrigado. Prefiro pagar mais caro.</button>
  </div>
</div>

<script>
  // Exit intent: detectar mouse saindo pela parte superior
  document.addEventListener('mouseleave', function(e) {
    if (e.clientY < 5) {
      document.getElementById('popupSaida').classList.add('ativo');
    }
  }, { once: true });

  function fecharPopup() {
    document.getElementById('popupSaida').style.display = 'none';
  }
</script>
```

---

### `barra-urgencia` — Faixa de countdown

```html
<style>
  .barra-urgencia {
    background: #F5A623;
    color: #000;
    text-align: center;
    padding: 12px 16px;
    font-family: "Arial Black", Arial, sans-serif;
    font-size: 15px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 2px;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .barra-urgencia #contador { color: #000; font-size: 18px; }
</style>

<div class="barra-urgencia">
  🔥 Oferta válida até <strong>[DATA]</strong> · Restam:
  <span id="contador">00:00:00</span> · Parcele em 18x
</div>

<script>
  // Definir data fim — substituir por data real
  const dataFim = new Date('[ANO]-[MÊS]-[DIA]T23:59:59');
  function atualizarContador() {
    const agora = new Date();
    const diff = dataFim - agora;
    if (diff <= 0) { document.getElementById('contador').textContent = 'ENCERRADO'; return; }
    const h = Math.floor(diff/3600000);
    const m = Math.floor((diff%3600000)/60000);
    const s = Math.floor((diff%60000)/1000);
    document.getElementById('contador').textContent =
      String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  }
  atualizarContador();
  setInterval(atualizarContador, 1000);
</script>
```

---

## Salvar em
```
output/criativos/banner-[tipo]-[resumo]-[YYYY-MM-DD].html
```
**Exemplo:** `output/criativos/banner-hero-mega-oferta-pneus-2026-04-09.html`

---

## Referências Cruzadas
- Copy para o banner: `skills/trafego-pago/landing-page-copy.md`
- Post de redes sociais complementar: `skills/criativos/post-visual-html.md`
- Kit completo de campanha: `skills/criativos/kit-visual-campanha.md`
