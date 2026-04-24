---
name: pesquisa-keywords
description: Gera mapeamento completo de palavras-chave para uma categoria de serviço/produto da BR Pneus & Oficina em uma cidade específica, com keywords transacionais, informacionais, cauda longa, negativas e análise competitiva. Use sempre que precisar de pesquisa de palavras-chave, levantamento de keywords locais, lista de termos para otimizar, ou planejamento de SEO — mesmo que o pedido use termos como "quais palavras usar no site", "termos que o cliente busca" ou "keywords para a loja de pneus".
---

# Skill: Pesquisa de Palavras-Chave

## Comando
```
/pesquisa-keywords [categoria] [cidade]
```

## Parâmetros
- **categoria** (obrigatório): Área de foco. Opções: `pneus`, `alinhamento`, `troca-de-oleo`, `revisao`, `freios`, `suspensao`, `ar-condicionado`, `injecao-eletronica`, `geral` (todas as categorias)
- **cidade** (obrigatório): Cidade-alvo da pesquisa (verificar unidades ativas em `agents/seo-specialist.md`)

---

## Processo antes de gerar

1. Confirmar que a cidade tem unidade ativa
2. Mapear os serviços oferecidos relevantes para a categoria escolhida (`CLAUDE.md`)
3. Pensar no perfil do público-alvo local: classe B/C, motoristas do dia a dia, frotistas (`knowledge/personas.md`)
4. Considerar sazonalidade: há pico de demanda para esta categoria neste período? (`knowledge/calendario-sazonal.md`)

---

## Estrutura obrigatória do output

### 1. Keywords Transacionais (alta intenção de compra)

O usuário está pronto para comprar ou contratar — prioridade máxima.

Para cada keyword, gerar a tabela:

| Keyword exata | Variações comuns | Intenção | Página de destino ideal | Prioridade | Dificuldade |
|---------------|-----------------|----------|------------------------|-----------|-------------|

- **Variações:** singular/plural, com/sem acento, abreviações, erros ortográficos comuns
- **Intenção:** o que a pessoa realmente quer (comprar, comparar preço, agendar)
- **Página de destino:** home, página de serviço específica, landing page de promoção
- **Prioridade:** Alta (busca frequente + alta conversão), Média, Baixa
- **Dificuldade:** Fácil (poucos concorrentes locais bem otimizados), Média, Difícil

**Mínimo 15 keywords transacionais**

Exemplos de base para adaptar com a cidade:
- "pneu barato [cidade]", "loja de pneus [cidade]"
- "troca de pneu [cidade]", "pneu aro 14 [cidade]"
- "alinhamento e balanceamento [cidade]", "troca de óleo [cidade]"
- "oficina mecânica [cidade]", "revisão de carro [cidade]"

### 2. Keywords Informacionais (topo de funil / blog)

O usuário está pesquisando, aprendendo ou comparando — geram tráfego e autoridade.

Para cada keyword:

| Keyword (em formato de pergunta) | Resposta em 1 frase (para featured snippet) | Tipo de conteúdo ideal | Funil |
|----------------------------------|---------------------------------------------|----------------------|-------|

- **Tipos:** artigo de lista, guia completo, tutorial passo a passo, comparativo, FAQ
- **Funil:** topo (descoberta), meio (consideração), fundo (decisão)

**Mínimo 10 keywords informacionais**

Exemplos:
- "quando trocar o pneu do carro"
- "de quanto em quanto tempo fazer alinhamento"
- "como saber se o pneu está bom"
- "o que é revisão preventiva"
- "vale a pena parcelar compra de pneu"

### 3. Keywords de Cauda Longa

Frases específicas com menor volume, menor concorrência e maior taxa de conversão.

| Keyword long-tail | Por que ranquear | Conteúdo ideal |
|-------------------|-----------------|----------------|

**Mínimo 10 keywords long-tail**

Exemplos:
- "onde trocar pneu aro 16 barato em [cidade]"
- "oficina mecânica que parcela em [cidade]"
- "alinhamento 3D computadorizado [cidade]"
- "quanto custa troca de óleo [modelo de carro] [cidade]"

### 4. Keywords Negativas (para Google Ads)

Termos que devem ser excluídos das campanhas pagas para evitar cliques irrelevantes.

| Keyword negativa | Por que excluir |
|-----------------|-----------------|

**Mínimo 15 keywords negativas**

Exemplos a considerar: "usado", "recapado", "como fazer em casa", "reforma", "curso", "vaga", "emprego", "gratuito", "grátis", "DIY"

### 5. Análise Competitiva

Não se trata de nomear concorrentes, mas de identificar gaps e oportunidades:

**Tipos de concorrentes locais:**
- Outras lojas de pneus independentes
- Oficinas mecânicas genéricas
- Concessionárias (para revisão)
- Hipermercados com serviço de pneu
- Franquias nacionais do setor

**Oportunidades identificadas:**
- Keywords que concorrentes locais provavelmente não otimizam
- Formatos de conteúdo ausentes (vídeo, FAQ, guias locais)
- Perguntas sem resposta na SERP local

**Recomendação de priorização:**
- Top 5 keywords para atacar imediatamente (melhor custo-benefício)
- Top 5 keywords para médio prazo (mais esforço, maior retorno)

---

## Regras de qualidade

- Sempre adaptar keywords com o nome exato da cidade (não "interior de SP" genericamente)
- Incluir variações com e sem acento (Google entende ambas, mas usuários digitam das duas formas)
- Considerar termos em linguagem informal do público-alvo ("borracharia", "trocar o pneu do carro")
- Não sugerir keywords para serviços que a BR Pneus não oferece

---

## Onde salvar
```
output/relatorios/keywords-[categoria]-[cidade]-[YYYY-MM-DD].md
```
**Exemplo:** `output/relatorios/keywords-pneus-araraquara-2026-04-07.md`
