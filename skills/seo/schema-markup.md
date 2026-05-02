---
name: schema-markup
description: Gera código JSON-LD de dados estruturados (schema markup) para páginas do site da BR Pneus & Oficina, melhorando a aparência nos resultados de busca com rich snippets. Use sempre que precisar implementar dados estruturados, schema markup, JSON-LD, rich results ou structured data — mesmo que o pedido use termos como "dados do Google", "estrelinhas no resultado", "código para o Google entender o site" ou "FAQ no Google".
---

# Skill: Schema Markup (Dados Estruturados)

## Comando
```
/schema-markup [tipo-pagina] [servico] [cidade]
```

## Parâmetros
- **tipo-pagina** (obrigatório): `home`, `servico`, `unidade`, `blog`, `faq`
- **servico** (obrigatório para tipo `servico` e `faq`): Nome do serviço ou tema. Ex: "troca de óleo", "alinhamento 3D"
- **cidade** (obrigatório): Cidade da unidade (verificar lista em `agents/seo-specialist.md`)

---

## Por que schema markup importa

Dados estruturados são código que você adiciona ao HTML para ajudar o Google a entender o conteúdo. Os benefícios para a BR Pneus:
- **Rich snippets:** estrelas de avaliação, horário, preço aparecem no resultado de busca
- **FAQ accordion:** perguntas se expandem direto na SERP (aumenta CTR)
- **Local Pack:** LocalBusiness schema reforça os dados do GMB
- **Taxa de clique:** resultados enriquecidos recebem até 30% mais cliques

---

## Estrutura obrigatória do output

Para cada tipo de página, gerar o JSON-LD completo e pronto para implementação:

---

### Para `unidade` — LocalBusiness Schema

```json
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": ["AutoRepair", "TireShop"],
  "name": "BR Pneus & Oficina - [Cidade]",
  "description": "[Descrição de 150–200 caracteres com keywords locais]",
  "url": "[URL da página da unidade]",
  "telephone": "[Telefone local]",
  "priceRange": "$$",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "[Rua, Número, Bairro]",
    "addressLocality": "[Cidade]",
    "addressRegion": "[SP|PR]",
    "postalCode": "[CEP]",
    "addressCountry": "BR"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "[latitude — deixar em branco se não souber]",
    "longitude": "[longitude — deixar em branco se não souber]"
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "08:00",
      "closes": "18:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": "Saturday",
      "opens": "08:00",
      "closes": "13:00"
    }
  ],
  "areaServed": {
    "@type": "City",
    "name": "[Cidade]"
  },
  "paymentAccepted": "Cash, Credit Card, Debit Card",
  "currenciesAccepted": "BRL",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "[média real — não inventar]",
    "reviewCount": "[total real — não inventar]"
  },
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Serviços BR Pneus & Oficina",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Troca de Pneus"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Alinhamento e Balanceamento"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Troca de Óleo"
        }
      }
    ]
  },
  "sameAs": [
    "[URL do Facebook]",
    "[URL do Instagram]",
    "[URL do Google Maps]"
  ]
}
</script>
```

> **Nota de implementação:** preencher latitude/longitude consultando o Google Maps. Preencher aggregateRating apenas com dados reais do GMB.

---

### Para `servico` — Service Schema

```json
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "[Nome do Serviço] em [Cidade]",
  "description": "[Descrição do serviço em 150–200 caracteres | o que é, para quem, benefício]",
  "provider": {
    "@type": "LocalBusiness",
    "name": "BR Pneus & Oficina - [Cidade]",
    "telephone": "[Telefone]",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "[Cidade]",
      "addressRegion": "[SP|PR]",
      "addressCountry": "BR"
    }
  },
  "areaServed": {
    "@type": "City",
    "name": "[Cidade]"
  },
  "serviceType": "[Tipo de serviço — ex: Automotive Repair]",
  "offers": {
    "@type": "Offer",
    "description": "Consulte preço especial na loja",
    "priceCurrency": "BRL",
    "availability": "https://schema.org/InStock"
  }
}
</script>
```

---

### Para `blog` — Article + Author Schema

```json
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "[Título do artigo | mesmo que o H1]",
  "description": "[Meta description do artigo]",
  "author": {
    "@type": "Organization",
    "name": "BR Pneus & Oficina",
    "url": "[URL do site]"
  },
  "publisher": {
    "@type": "Organization",
    "name": "BR Pneus & Oficina",
    "logo": {
      "@type": "ImageObject",
      "url": "[URL do logo]"
    }
  },
  "datePublished": "[YYYY-MM-DD]",
  "dateModified": "[YYYY-MM-DD]",
  "image": "[URL da imagem de destaque do artigo]",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "[URL completa do artigo]"
  }
}
</script>
```

---

### Para `faq` — FAQPage Schema

```json
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "[Pergunta 1 — exatamente como o usuário digitaria]",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "[Resposta completa em 2–3 frases | pode incluir HTML básico]"
      }
    },
    {
      "@type": "Question",
      "name": "[Pergunta 2]",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "[Resposta 2]"
      }
    }
  ]
}
</script>
```

> Adicionar quantas perguntas forem necessárias. Mínimo 4, ideal 6–8.

---

### Para `home` — Organization + WebSite Schema

```json
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "BR Pneus & Oficina",
  "url": "[URL da homepage]",
  "logo": "[URL do logo]",
  "description": "Rede de lojas de pneus e oficina mecânica com unidades em Araraquara, São Carlos, Americana (SP) e Maringá (PR). Maior mix de pneus, melhores preços, parcelamento em até 18x e garantia BR Total.",
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "0800-942-4402",
    "contactType": "customer service",
    "availableLanguage": "Portuguese"
  },
  "sameAs": [
    "[URL do Facebook]",
    "[URL do Instagram]",
    "[URL do TikTok]"
  ]
}
</script>
```

---

### Breadcrumb Schema (usar em todas as páginas internas)

```json
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "[URL da homepage]"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "[Nome da seção | ex: Serviços]",
      "item": "[URL da seção]"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "[Nome da página atual]",
      "item": "[URL da página atual]"
    }
  ]
}
</script>
```

---

## Instruções de implementação

```
Onde colocar: dentro de <head>...</head> ou antes de </body>
Preferência: dentro do <head> para garantir leitura pelo crawler
Validar em: https://search.google.com/test/rich-results (Rich Results Test do Google)
Monitorar em: Google Search Console > Melhorias > [tipo de schema]
```

**Regras absolutas:**
- Nunca inventar dados — `aggregateRating` somente com valores reais do GMB
- Nunca inventar preços — usar "Consulte preço na loja"
- JSON-LD deve ser válido — verificar abertura/fechamento de todas as chaves
- Cada página deve ter schema relevante para o seu tipo

---

## Onde salvar
```
output/relatorios/schema-[tipo]-[servico-resumido]-[cidade]-[YYYY-MM-DD].json
```
**Exemplo:** `output/relatorios/schema-servico-troca-de-oleo-jau-2026-04-07.json`
