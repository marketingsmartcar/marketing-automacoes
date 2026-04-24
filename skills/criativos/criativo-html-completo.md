# Skill: Criativo HTML Completo (Multi-Fonte de Imagem)

## Comando
`/criativo-html [template] [cidade] [dados-json]`

## O que faz
Gera uma arte visual completa em HTML com imagem de qualquer fonte — foto própria, SVG, emoji, URL ou Gemini AI. Pronta para visualizar no VSCode (Live Preview) e exportar como PNG via Puppeteer.

## Templates Disponíveis

| Template | Dimensão | Uso |
|----------|----------|-----|
| `promo-servico` | 1080×1350px (Feed 4:5) | Promoção de serviço com preço em destaque |
| `promo-pneus` | 1080×1350px (Feed 4:5) | Tabela de pneus por aro com preços |
| `stories` | 1080×1920px (Stories 9:16) | Stories Instagram/Facebook com oferta |
| `ads` | 1080×1080px (Ads 1:1) | Anúncio patrocinado quadrado |

## Cidades Disponíveis
`araraquara` | `americana` | `sao-carlos` | `maringa` | `jau` | `ibitinga` | `bauru`

---

## Fontes de Imagem (campo "imagem" no JSON)

### 📁 Foto própria (melhor opção — autêntica)
```json
"imagem": "local:produtos/pastilha-freio.png"
"imagem": "local:fachadas/fachada-araraquara-l1.png"
"imagem": "local:servicos/servico-alinhamento.png"
```
Coloque as fotos em `assets/imagens/[pasta]/`.

### 🎨 SVG da biblioteca (offline, zero custo)
```json
"imagem": "svg:pneu"
"imagem": "svg:freio,200"
"imagem": "svg:carro"
```
SVGs disponíveis: `pneu` `chave` `velocimetro` `escudo` `freio` `oleo` `carro` `caminhao` `moto` `check` `estrela` `whatsapp` `telefone` `pin` `seta`

### 😀 Emoji (ultra-rápido, zero custo)
```json
"imagem": "emoji:🛞,120"
"imagem": "emoji:🔧,100"
"imagem": "emoji:🚗,140"
```
Formato: `emoji:[emoji],[tamanho-em-px]`

### 🌐 URL externa (banco de imagens)
```json
"imagem": "https://images.unsplash.com/photo-xxx.jpg"
```
Útil para fotos de stock de pneus, carros, oficina.

### 🤖 Gemini AI (geração por IA — requer API key e quota)
```json
"imagem": "gemini:car brake disc and brake pads automotive parts"
"imagem": "gemini:premium car tire new isolated white background"
"imagem": "gemini:motor oil bottle and oil filter parts"
```

### Sem campo "imagem"
Gera um placeholder SVG editável indicando onde colocar a imagem.

---

## Como o Creative Designer deve usar

### Passo 1 — Montar o JSON com dados + fonte de imagem
```json
{
  "servico":     "Nome do serviço",
  "preco":       "79",
  "centavos":    "90",
  "complemento": "+ Instalação",
  "cta":         "GARANTA JÁ!",
  "imagem":      "svg:freio"
}
```

### Passo 2 — Executar
```bash
node tools/gerar-criativo-html.js [template] [cidade] '[json]'
```

### Passo 3 — Informar ao usuário
```
🎨 Arte gerada!
📁 Arquivo: output/criativos/[arquivo].html
📐 Tamanho: [dimensão]

👀 PARA VISUALIZAR: Ctrl+Shift+V no arquivo aberto no VSCode
📥 PARA EXPORTAR PNG: node tools/export-html-to-png.js output/criativos/[arquivo].html
```

---

## Exemplos Completos

### Pastilha de Freio — SVG (zero custo, offline):
```bash
node tools/gerar-criativo-html.js promo-servico araraquara \
  '{"servico":"Pastilha de Freio","preco":"79","centavos":"90","complemento":"+ Instalação","imagem":"svg:freio"}'
```

### Pastilha de Freio — Emoji:
```bash
node tools/gerar-criativo-html.js promo-servico araraquara \
  '{"servico":"Pastilha de Freio","preco":"79","centavos":"90","imagem":"emoji:🛞,140"}'
```

### Pastilha de Freio — Foto própria:
```bash
node tools/gerar-criativo-html.js promo-servico araraquara \
  '{"servico":"Pastilha de Freio","preco":"79","centavos":"90","imagem":"local:produtos/pastilha-freio.png"}'
```

### Promoção de Pneus — SVG:
```bash
node tools/gerar-criativo-html.js promo-pneus maringa \
  '{"pneus":[{"aro":"13","preco":"179"},{"aro":"14","preco":"199"},{"aro":"15","preco":"239"},{"aro":"16","preco":"269"}],"imagem":"svg:pneu"}'
```

### Stories — Emoji grande:
```bash
node tools/gerar-criativo-html.js stories jau \
  '{"headline":"PNEUS EM PROMOÇÃO","oferta":"A partir de R$179","imagem":"emoji:🛞,200"}'
```

### Ads — Gemini AI:
```bash
node tools/gerar-criativo-html.js ads araraquara \
  '{"headline":"PNEU NOVO É NA BR PNEUS","oferta":"A partir de R$179 em até 18x","imagem":"gemini:premium car tire side view"}'
```

### Campanha multi-cidade com SVG:
```bash
for city in araraquara americana sao-carlos maringa jau ibitinga; do
  node tools/gerar-criativo-html.js promo-pneus $city '{"imagem":"svg:pneu"}'
done
```

---

## Listar imagens e SVGs disponíveis
```bash
node tools/image-resolver.js --list
```

## Saída
Arquivos em `output/criativos/`:
- `feed-promo-servico-[cidade]-[data].html`
- `feed-promo-pneus-[cidade]-[data].html`
- `stories-promo-[cidade]-[data].html`
- `ads-promo-[cidade]-[data].html`

Imagens geradas pelo Gemini salvas automaticamente em `assets/imagens/gemini/`.
