---
name: tabela-precos-visual
description: Gera tabela de preços visual e atraente em HTML no estilo BR Pneus & Oficina — pneus por aro, serviços mecânicos, pacotes combinados ou comparativo de marcas. Use sempre que precisar de tabela de preços visual, card de preços, comparativo de serviços, pricing visual ou tabela para redes sociais — mesmo que o pedido use termos como "tabela de preços", "quanto custa", "card de serviços", "preços dos pneus" ou "tabela para o site".
---

# Skill: Tabela de Preços Visual

## Comando
```
/tabela-precos-visual [categoria] [cidade]
```

## Parâmetros
- **categoria** (obrigatório): O que precificar. Opções:
  - `pneus-por-aro` — Preços de pneus por aro (estilo outdoor BR Pneus)
  - `servicos-mecanicos` — Serviços com faixa de preço em cards visuais
  - `pacotes` — Pacotes combinados (pneu + alinhamento + balanceamento, etc.)
  - `comparativo-marcas` — Comparativo de marcas de pneu por aro e faixa
- **cidade** (obrigatório): Unidade para contato e personalização

---

## Aviso importante sobre preços

> Nunca publicar preços fixos sem confirmar com a unidade. Sempre incluir "a partir de" e rodapé de disclaimer. Preços de referência (R$179, R$199, R$239, R$269) são do outdoor existente — usar somente se confirmados pela unidade.

---

## Templates por Categoria

### `pneus-por-aro` — Estilo outdoor

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Tabela Pneus por Aro — BR Pneus [CIDADE]</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #222; padding: 40px; font-family: "Arial Black", Arial, sans-serif; }

  .container {
    width: 1080px;
    background: linear-gradient(150deg, #1A1A1A 0%, #2A2A2A 100%);
    border-radius: 10px;
    overflow: hidden;
  }

  /* Cabeçalho */
  .cabecalho {
    background: #F5A623;
    padding: 20px 50px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .cabecalho .titulo { color: #000; font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
  .cabecalho .logo   { background: #000; color: #F5A623; padding: 6px 16px; font-size: 20px; font-weight: 900; border-radius: 3px; }

  /* Área principal */
  .principal { padding: 50px; }

  .sub-titulo {
    color: #AAA;
    font-size: 18px;
    font-weight: 400;
    text-align: center;
    margin-bottom: 40px;
    letter-spacing: 2px;
    text-transform: uppercase;
  }

  /* Cards de aro */
  .grid-aros { display: flex; gap: 20px; justify-content: center; margin-bottom: 40px; }

  .card-aro {
    flex: 1;
    background: #111;
    border: 2px solid #F5A623;
    border-radius: 10px;
    padding: 30px 20px;
    text-align: center;
    transition: transform 0.2s;
    position: relative;
  }
  .card-aro:hover { transform: translateY(-4px); }

  /* Badge "mais vendido" */
  .card-aro.destaque::before {
    content: 'MAIS VENDIDO';
    position: absolute;
    top: -14px;
    left: 50%;
    transform: translateX(-50%);
    background: #F5A623;
    color: #000;
    font-size: 10px;
    font-weight: 900;
    padding: 3px 14px;
    border-radius: 10px;
    letter-spacing: 1px;
    white-space: nowrap;
  }

  .aro-numero { color: #F5A623; font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 6px; }
  .aro-icone  { font-size: 48px; margin: 10px 0; }
  .a-partir   { color: #666; font-size: 13px; font-weight: 400; text-transform: uppercase; letter-spacing: 1px; }
  .preco      { color: #FFF; font-size: 60px; font-weight: 900; line-height: 1; margin: 4px 0; }
  .preco sup  { font-size: 22px; vertical-align: super; color: #CCC; }
  .parcelado  { color: #888; font-size: 13px; font-weight: 400; margin-top: 8px; }
  .parcelado strong { color: #F5A623; }

  /* Informações adicionais */
  .info-row {
    display: flex;
    justify-content: center;
    gap: 30px;
    padding: 24px 50px;
    border-top: 1px solid #333;
    flex-wrap: wrap;
  }
  .info-item { text-align: center; }
  .info-item .label { color: #555; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 400; margin-bottom: 4px; }
  .info-item .valor { color: #CCC; font-size: 15px; font-weight: 700; }

  /* Marcas */
  .marcas-row {
    padding: 16px 50px;
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
  }
  .marcas-row .label { color: #555; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; flex-shrink: 0; font-weight: 400; }
  .marca-tag {
    background: #2A2A2A;
    color: #AAA;
    padding: 5px 14px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 700;
    border: 1px solid #333;
  }

  /* Rodapé */
  .rodape {
    background: #F5A623;
    padding: 14px 50px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .rodape .contato { color: #000; font-size: 15px; font-weight: 700; }
  .rodape .tagline { color: #000; font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; }

  /* Disclaimer */
  .disclaimer { color: #444; font-size: 11px; font-weight: 400; text-align: center; padding: 10px 50px 20px; font-family: Arial, sans-serif; }
</style>
</head>
<body>

<div class="container">

  <div class="cabecalho">
    <span class="titulo">⚡ Mega Oferta de Pneus</span>
    <span class="logo">BR Pneus &amp; Oficina</span>
  </div>

  <div class="principal">
    <div class="sub-titulo">Nacionais · Importados · Semi-novos · Parcelado em 18x</div>

    <div class="grid-aros">
      <div class="card-aro">
        <div class="aro-numero">Aro 13</div>
        <div class="aro-icone">🛞</div>
        <div class="a-partir">a partir de</div>
        <div class="preco"><sup>R$</sup>179</div>
        <div class="parcelado">ou <strong>~R$10/mês</strong> em 18x</div>
      </div>
      <div class="card-aro destaque">
        <div class="aro-numero">Aro 14</div>
        <div class="aro-icone">🛞</div>
        <div class="a-partir">a partir de</div>
        <div class="preco"><sup>R$</sup>199</div>
        <div class="parcelado">ou <strong>~R$11/mês</strong> em 18x</div>
      </div>
      <div class="card-aro">
        <div class="aro-numero">Aro 15</div>
        <div class="aro-icone">🛞</div>
        <div class="a-partir">a partir de</div>
        <div class="preco"><sup>R$</sup>239</div>
        <div class="parcelado">ou <strong>~R$14/mês</strong> em 18x</div>
      </div>
      <div class="card-aro">
        <div class="aro-numero">Aro 16</div>
        <div class="aro-icone">🛞</div>
        <div class="a-partir">a partir de</div>
        <div class="preco"><sup>R$</sup>269</div>
        <div class="parcelado">ou <strong>~R$15/mês</strong> em 18x</div>
      </div>
    </div>

    <div class="info-row">
      <div class="info-item">
        <div class="label">Parcelamento</div>
        <div class="valor">Até 18x sem juros</div>
      </div>
      <div class="info-item">
        <div class="label">Garantia</div>
        <div class="valor">BR Total — 1 ano</div>
      </div>
      <div class="info-item">
        <div class="label">Alinhamento</div>
        <div class="valor">3D Computadorizado</div>
      </div>
      <div class="info-item">
        <div class="label">Mix</div>
        <div class="valor">Nac. · Import. · Semi-novo</div>
      </div>
    </div>

    <div class="marcas-row">
      <span class="label">Marcas:</span>
      <span class="marca-tag">Continental</span>
      <span class="marca-tag">Pirelli</span>
      <span class="marca-tag">Bridgestone</span>
      <span class="marca-tag">Michelin</span>
      <span class="marca-tag">Goodyear</span>
      <span class="marca-tag">Firestone</span>
      <span class="marca-tag">XBRI</span>
    </div>
  </div>

  <div class="rodape">
    <span class="contato">📍 [ENDEREÇO], [CIDADE] · 📱 ([DDD]) [NÚMERO]</span>
    <span class="tagline">Muito mais que pneus</span>
  </div>

  <div class="disclaimer">
    * Preços a partir de, sujeitos a alteração sem aviso prévio. Consulte disponibilidade na sua unidade. Parcelamento sujeito a condições do estabelecimento.
  </div>

</div>

</body>
</html>
```

---

### `pacotes` — Três planos lado a lado

Estrutura de cards: **Básico / Completo / Premium**

```
Card BÁSICO (fundo escuro, borda sutil):
  Nome: "Pacote Básico"
  Inclui: Pneu aro 14 + Balanceamento
  Preço: a partir de R$[X]
  Economia: vs. separado

Card COMPLETO (fundo amarelo — DESTAQUE com tag "Mais Escolhido"):
  Nome: "Pacote Completo"
  Inclui: Pneu aro 14 + Alinhamento 3D + Balanceamento
  Preço: a partir de R$[X]
  Economia: vs. separado

Card PREMIUM (fundo escuro, borda dourada):
  Nome: "Pacote Total"
  Inclui: 4 pneus + Alinhamento 3D + Balanceamento + Troca de óleo
  Preço: a partir de R$[X]
  Economia: vs. separado
```

*Gerar como HTML com mesma estrutura base, adaptando os cards.*

---

### `servicos-mecanicos` — Cards por serviço

Grade de cards, 2 colunas × N linhas:
- Fundo alternado: preto e amarelo
- Cada card: ícone + nome do serviço + faixa de preço + "Agendar"
- Ordenar por popularidade (pneus, alinhamento, óleo, freios, etc.)

---

## Instruções de Exportação

```
Para usar como post de redes sociais (1080×1080):
1. Abrir no Chrome, F12 → device mode → definir 1080×1080
2. Screenshot do nó da div.container

Para usar em site:
Remover width fixo — o layout é flexível por natureza

Para imprimir (PDV):
Chrome → Ctrl+P → PDF → Ajustar escala → Imprimir
```

---

## Salvar em
```
output/criativos/tabela-precos-[categoria]-[cidade]-[YYYY-MM-DD].html
```
**Exemplo:** `output/criativos/tabela-precos-pneus-por-aro-jau-2026-04-09.html`

---

## Referências Cruzadas
- Material de tabela de preços para PDV físico: `skills/franquias/material-pdv.md` → `tabela-precos`
- Post de promoção com preços: `skills/criativos/post-visual-html.md` → `promocao-pneus`
- Briefing para designer fazer versão impressa: `skills/criativos/briefing-designer.md`
