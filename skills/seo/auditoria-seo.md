---
name: auditoria-seo
description: Gera checklist completo de auditoria SEO para o site e presença digital de uma unidade ou da rede inteira da BR Pneus & Oficina, cobrindo SEO técnico, on-page, local, conteúdo, off-page e plano de ação priorizado. Use sempre que precisar fazer auditoria de SEO, diagnóstico do site, levantamento de problemas de ranqueamento, revisão de presença digital ou identificar o que está impedindo a loja de aparecer no Google — mesmo que o pedido use termos como "por que não apareço no Google", "o que está errado no site" ou "diagnóstico de SEO".
---

# Skill: Auditoria de SEO

## Comando
```
/auditoria-seo [cidade-ou-geral]
```

## Parâmetros
- **cidade-ou-geral** (obrigatório): Nome da cidade para auditoria de uma unidade específica, ou `geral` para auditoria da rede inteira

---

## Como usar este checklist

Este documento é um guia de auditoria — ao executar, para cada item indicar:
- ✅ **OK** — está bem implementado
- ⚠️ **Verificar** — precisa ser confirmado
- ❌ **Corrigir** — problema identificado, ação necessária
- ➖ **N/A** — não aplicável a este contexto

Ao final, priorizar os itens ❌ pelo impacto e esforço de correção.

---

## Estrutura obrigatória do output

### 1. SEO Técnico

Problemas técnicos bloqueiam o ranqueamento mesmo com bom conteúdo — corrigir primeiro.

| Item | Status | Observação/Ação |
|------|--------|-----------------|
| Velocidade de carregamento mobile (Core Web Vitals: LCP < 2.5s, CLS < 0.1, INP < 200ms) | | |
| Site responsivo / mobile-friendly | | |
| SSL/HTTPS ativo em todas as páginas | | |
| Sitemap XML existente e enviado ao Google Search Console | | |
| Robots.txt configurado corretamente (não bloqueando páginas importantes) | | |
| URLs amigáveis (sem parâmetros desnecessários, sem IDs numéricos) | | |
| Redirecionamentos 301 configurados para URLs antigas | | |
| Páginas 404 personalizadas e sem links quebrados | | |
| Canonical tags nas páginas com conteúdo similar | | |
| Imagens comprimidas (WebP ou JPEG otimizado) | | |
| Lazy loading em imagens fora do viewport | | |
| Sem conteúdo duplicado entre www e não-www (redirect configurado) | | |

**Ferramentas para verificar:** Google Search Console, PageSpeed Insights, Google Rich Results Test

---

### 2. SEO On-Page

Avaliar cada página principal do site da unidade:

**Páginas a auditar:**
- Home (página principal da unidade ou da rede)
- Página de cada serviço (alinhamento, troca de óleo, revisão, etc.)
- Página de contato / localização
- Blog (se existir)

Para cada página:

| Item | Status | Observação/Ação |
|------|--------|-----------------|
| Title tag presente, único e dentro de 60 caracteres | | |
| Title tag inclui keyword principal + cidade | | |
| Meta description presente, única e dentro de 155 caracteres | | |
| Meta description inclui CTA | | |
| H1 único por página | | |
| H1 inclui keyword principal | | |
| Hierarquia de headings respeitada (H1 > H2 > H3) | | |
| Keyword principal nos primeiros 100 palavras do corpo | | |
| Alt text em todas as imagens (com keyword quando relevante) | | |
| URLs otimizadas (sem acentos, sem caracteres especiais) | | |
| Links internos para páginas relacionadas | | |
| Conteúdo tem mínimo de 300 palavras (páginas de serviço) | | |
| Conteúdo tem mínimo de 1.200 palavras (blog) | | |
| Schema markup implementado (tipo correto para a página) | | |

---

### 3. SEO Local

Itens específicos para negócios com unidades físicas — maior impacto para a BR Pneus.

| Item | Status | Observação/Ação |
|------|--------|-----------------|
| Google Meu Negócio com perfil 100% completo | | |
| Nome no GMB: "BR Pneus & Oficina - [Cidade]" (sem abreviação) | | |
| Categoria principal correta: "Loja de pneus" | | |
| Categorias secundárias cadastradas | | |
| Fotos atualizadas (mínimo 20 fotos, últimas adicionadas há menos de 30 dias) | | |
| Avaliações: quantidade total e média | | |
| 100% das avaliações respondidas (especialmente negativas) | | |
| Posts GMB ativos (última publicação há menos de 7 dias) | | |
| Q&A com perguntas e respostas proativas | | |
| NAP consistente: GMB = Site = Facebook = Instagram | | |
| Schema LocalBusiness implementado no site | | |
| Página de destino localizada no site (menciona a cidade) | | |
| Presença em diretórios locais (Telelistas, etc.) | | |

---

### 4. Conteúdo

| Item | Status | Observação/Ação |
|------|--------|-----------------|
| Blog com posts nos últimos 30 dias | | |
| Há página específica para cada serviço oferecido | | |
| Há página específica para a unidade (com endereço, horário, fotos) | | |
| Conteúdo localizado (menciona a cidade de forma natural) | | |
| FAQ implementado em alguma página | | |
| Sem conteúdo duplicado entre páginas de diferentes unidades | | |
| Sem thin content (páginas com menos de 300 palavras sem propósito claro) | | |
| Conteúdo educativo que responde dúvidas reais do motorista | | |
| Cada serviço tem pelo menos 1 artigo de blog relacionado | | |

---

### 5. Off-Page

| Item | Status | Observação/Ação |
|------|--------|-----------------|
| Backlinks de sites automotivos ou locais | | |
| Menções da marca em sites de notícias ou blogs locais | | |
| Presença no Reclame Aqui com perfil monitorado | | |
| Perfis em diretórios automotivos nacionais | | |
| Redes sociais linkando para o site da unidade | | |
| Parcerias com negócios locais que linkam para o site | | |

---

### 6. Plano de Ação Priorizado

Após preencher o checklist, classificar os itens ❌ em três categorias:

**Correções URGENTES (Impacto Alto + Esforço Baixo)**
> Resolver em até 7 dias

| # | O que fazer | Por que é urgente | Quem executa | Prazo |
|---|-------------|-------------------|-------------|-------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

**Melhorias de MÉDIO PRAZO (Impacto Alto + Esforço Médio)**
> Resolver em 30–60 dias

| # | O que fazer | Impacto esperado | Quem executa | Prazo |
|---|-------------|-----------------|-------------|-------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

**Projetos de LONGO PRAZO (Impacto Alto + Esforço Alto)**
> Planejar e executar em 60–180 dias

| # | O que fazer | Resultado esperado | Responsável | Prazo |
|---|-------------|-------------------|------------|-------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

---

## Regras para a auditoria

- Nunca prometer resultados de posição específica no Google como consequência das correções
- Priorizar sempre o SEO local e o GMB — são os de maior impacto imediato para este negócio
- Indicar ferramentas gratuitas para verificação quando possível (Google Search Console, PageSpeed Insights)
- Ser específico e acionável nas recomendações — "melhorar o site" não é uma ação; "adicionar alt text nas 12 imagens sem descrição na página de alinhamento" é

---

## Onde salvar
```
output/relatorios/auditoria-seo-[cidade]-[YYYY-MM-DD].md
```
**Exemplo:** `output/relatorios/auditoria-seo-ibitinga-2026-04-07.md`
