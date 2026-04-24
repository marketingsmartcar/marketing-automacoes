---
name: meta-tags
description: Gera title tags, meta descriptions, URL slugs, H1 e Open Graph tags otimizadas para páginas do site da BR Pneus & Oficina. Use sempre que precisar otimizar o título da página no Google, escrever descrição para aparecer nos resultados de busca, criar URL amigável ou configurar meta tags de SEO — mesmo que o pedido use termos como "título da página no Google", "o que aparece na busca", "descrição do site" ou "otimizar página de serviço".
---

# Skill: Meta Tags Otimizadas

## Comando
```
/meta-tags [tipo-pagina] [servico-ou-tema] [cidade]
```

## Parâmetros
- **tipo-pagina** (obrigatório): `home`, `servico`, `produto`, `blog`, `contato`, `unidade`, `landing-page`
- **servico-ou-tema** (obrigatório): O serviço ou tema da página. Ex: "alinhamento 3D", "troca de óleo", "pneus importados"
- **cidade** (obrigatório): Cidade/unidade alvo (verificar lista em `agents/seo-specialist.md`)

---

## Processo antes de gerar

1. Identificar a keyword principal da página: geralmente "[serviço] + [cidade]" ou "[produto] + [cidade]"
2. Confirmar o diferencial que deve aparecer na description (parcelamento 18x, garantia BR Total, melhor preço)
3. Verificar se já existem meta tags para esta página — nunca duplicar entre páginas

---

## Estrutura obrigatória do output

### 1. Title Tag — 3 variações

Regras inegociáveis:
- Máximo 60 caracteres (incluindo espaços)
- Keyword principal o mais à esquerda possível
- Incluir cidade
- Incluir o nome da marca no final (separado por `|` ou `–`)
- Cada variação com abordagem diferente: com preço, com benefício, com CTA

**Formato base recomendado:**
```
[Keyword Principal] em [Cidade] | BR Pneus & Oficina
```

**Variação 1:** foco na keyword + cidade
**Variação 2:** foco no benefício principal (parcelamento, garantia, preço)
**Variação 3:** foco no CTA (agendar, comprar, visitar)

```
Variação 1: [texto | X caracteres]
Variação 2: [texto | X caracteres]
Variação 3: [texto | X caracteres]
```

### 2. Meta Description — 3 variações

Regras inegociáveis:
- Máximo 155 caracteres (incluindo espaços)
- Incluir keyword principal de forma natural
- Incluir pelo menos 1 diferencial da marca
- Incluir CTA ativo (agende, ligue, visite, confira)
- Gerar curiosidade/vontade de clicar — não apenas descrever o serviço

```
Variação 1: [texto | X caracteres]
Variação 2: [texto | X caracteres]
Variação 3: [texto | X caracteres]
```

### 3. URL Slug

```
Slug sugerido: /[secao]/[keyword-com-hifens]-[cidade]
Exemplo: /servicos/alinhamento-3d-sao-carlos
```

Regras:
- Sem acentos, sem caracteres especiais, sem underscores
- Separar palavras com hifens
- Apenas letras minúsculas
- Incluir keyword principal
- Incluir cidade quando for página local
- Manter curto (máximo 5–6 palavras)

### 4. H1 Sugerido

```
H1: [texto]
```

Regras:
- Único por página (nunca dois H1 na mesma página)
- Complementar ao title tag — não repetir palavra por palavra
- Incluir keyword principal
- Pode ser ligeiramente mais longo que o title (sem limite rígido, mas manter relevante)
- Deve responder imediatamente à intenção de busca

### 5. Open Graph Tags

```html
<meta property="og:title" content="[título para compartilhamento — pode ser igual ao title tag]" />
<meta property="og:description" content="[descrição para redes sociais — pode ser igual à meta description]" />
<meta property="og:type" content="[website | article | business.business]" />
<meta property="og:image" content="[descrever imagem ideal: 1200x630px, o que mostrar]" />
```

### 6. Notas de implementação

```
Onde colocar: dentro de <head>...</head> no HTML da página
Prioridade: alta — meta tags são lidas antes do conteúdo pelos crawlers
Teste após publicar: usar Google Search Console > Inspeção de URL para validar
```

---

## Regras críticas

- **Title tag e meta description NUNCA devem ser iguais** — cada página exige texto único
- **Nunca duplicar meta tags entre páginas** — conteúdo duplicado prejudica o ranking
- **Priorizar clareza sobre criatividade** — o usuário precisa entender exatamente o que encontrará
- **Não inventar preços ou condições** na meta description — usar expressões como "melhores preços", "condições especiais"
- **Testar o comprimento** — use um contador de caracteres para garantir que não ultrapassa o limite

---

## Onde salvar
```
output/relatorios/meta-tags-[tipo]-[servico-resumido]-[cidade]-[YYYY-MM-DD].md
```
**Exemplo:** `output/relatorios/meta-tags-servico-alinhamento-saocarlos-2026-04-07.md`
