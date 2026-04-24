# Skill: Revisão de Material de Marca

## Comando
`/revisar-material [texto-ou-referencia-ao-arquivo]`

## O que faz
Analisa qualquer material de comunicação da BR Pneus & Oficina e gera um relatório completo de conformidade com a marca — nota, apontamentos priorizados por gravidade, versão corrigida e pontos positivos.

---

## Parâmetros

| Parâmetro | Obrigatório | Formato aceito |
|-----------|-------------|---------------|
| `texto-ou-referencia` | Sim | Texto colado diretamente, caminho de arquivo em `output/`, ou descrição do material |

**Exemplos de input válidos:**
- Texto colado: `"Venha na BR pneus e oficina e aproveite nossas promoções imperdíveis!"`
- Arquivo: `output/posts/instagram-promo-pneus-2026-07-15.md`
- Descrição: `"outdoor para a unidade de Americana com promoção de pneus aro 14, fundo azul, sem logo"`

---

## Estrutura do Output

---

### 1. Resumo Rápido

```
Tipo de material: [post, email, script, anúncio, flyer, outdoor, WhatsApp, etc.]
Canal: [Instagram, Facebook, Google Ads, email, WhatsApp, impresso, etc.]
Unidade referenciada: [cidade, se identificável]

NOTA DE CONFORMIDADE: XX/100

STATUS: ✅ APROVADO | ⚠️ APROVADO COM RESSALVAS | ❌ REPROVADO

Resumo em 1 frase: [ex: "Material com bom CTA mas nome da marca errado e tom agressivo — reprovado"]
```

**Critério de status:**
- ✅ Aprovado: nota 85–100, sem erros graves ou médios
- ⚠️ Aprovado com ressalvas: nota 60–84, sem erros graves, mas com erros médios
- ❌ Reprovado: nota abaixo de 60 OU qualquer erro grave presente

---

### 2. Análise Detalhada por Categoria

#### A. Nome da Marca — peso crítico (vale até 20 pontos)

**Checklist:**
- [ ] Nome escrito corretamente como "BR Pneus & Oficina" na primeira menção
- [ ] Sem abreviações proibidas (BRP, BR pneus, B.R. Pneus, BR Pneus e Oficina, etc.)
- [ ] Menções subsequentes usam "BR Pneus" (aceitável) — nunca outras variações

**Status:** ✅ Correto | ❌ Incorreto — [trecho com erro] → [como corrigir]

---

#### B. Tom de Voz — peso alto (vale até 25 pontos)

**Checklist:**
- [ ] Popular: linguagem do dia a dia, sem termos elitistas ou muito corporativos
- [ ] Direto: frases curtas, objetivo claro, sem prolixidade
- [ ] Confiável: sem exageros, promessas verificáveis, transmite segurança
- [ ] Acolhedor: sem pressão excessiva, sem agressividade comercial

**Para cada problema:** citar o trecho exato + explicar o desvio + sugerir reescrita

**Status:** ✅ Alinhado | ⚠️ Parcialmente alinhado | ❌ Fora do tom — [detalhamento]

---

#### C. Diferenciais e Informações — peso alto (vale até 20 pontos)

**Checklist:**
- [ ] Pelo menos 1 diferencial mencionado (preço/parcelamento, BR Total, mix de pneus, profissionais treinados)
- [ ] Parcelamento escrito como "em até 18x" (nunca apenas "18x" ou "18 vezes sem juros")
- [ ] Garantia escrita como "Garantia BR Total" com T maiúsculo em Total
- [ ] Preços com "a partir de" ou "consulte condições" — nunca valor fixo sem ressalva
- [ ] Sem promessas não verificáveis ("os mais baratos do Brasil", "entrega em X horas garantida")
- [ ] Sem menção negativa a concorrentes

**Status:** ✅ Correto | ❌ Incorreto — [detalhar cada item com problema]

---

#### D. CTA — peso alto (vale até 15 pontos)

**Checklist:**
- [ ] Possui CTA claro (agendar, chamar no WhatsApp, ligar, visitar, pedir orçamento)
- [ ] CTA é específico para o canal (link clicável no digital, número no impresso)
- [ ] Informações de contato presentes e corretas quando necessário
- [ ] CTA coerente com o objetivo do material

**Status:** ✅ Presente e correto | ⚠️ Presente mas fraco | ❌ Ausente ou incorreto

---

#### E. Linguagem e Escrita — peso médio (vale até 10 pontos)

**Checklist:**
- [ ] Sem erros gramaticais ou ortográficos
- [ ] Sem termos técnicos não explicados (jargão mecânico sem tradução)
- [ ] Sem gírias inapropriadas para o público-alvo
- [ ] Sem palavras/expressões proibidas da marca ("baratinho", "promoção imperdível", etc.)
- [ ] Linguagem adaptada ao canal (Instagram ≠ email formal ≠ outdoor)
- [ ] Uso de emojis adequado ao canal e frequência (0–2 por peça para materiais formais; até 3–4 para redes sociais)

**Status:** ✅ Correto | ⚠️ Melhorável | ❌ Incorreto — [listar cada problema]

---

#### F. Identidade Visual — peso médio (vale até 10 pontos, quando avaliável)

**Checklist:**
- [ ] Cores dentro da paleta (#F5A623, #1A1A1A, #FFFFFF)
- [ ] Logo BR Pneus & Oficina presente e legível (quando aplicável)
- [ ] Sem cores concorrentes como cor principal (azul, verde, vermelho)
- [ ] Contraste adequado para leitura
- [ ] Dimensões corretas para o canal

**Nota:** Este item vale 0 quando o material for apenas texto (não há informação visual para avaliar).

---

### 3. Lista de Correções Priorizadas

Para cada problema encontrado, gerar um bloco no formato:

```
[CORREÇÃO #N]
Gravidade: 🔴 Grave | 🟡 Médio | 🟢 Leve
Categoria: [Nome da marca / Tom / Diferenciais / CTA / Linguagem / Visual]
Trecho original: "[texto exatamente como está no material]"
Problema: [descrição clara do que está errado e por quê]
Correção sugerida: "[texto pronto para substituir]"
```

**Ordenar sempre do mais grave para o mais leve.**

---

### 4. Versão Corrigida Completa

> O material inteiro reescrito com **todas as correções aplicadas**, pronto para uso imediato.

- Manter a estrutura, formato e objetivo original
- Aplicar 100% das correções identificadas
- Destacar em **negrito** os trechos que foram alterados
- Ao final: "✅ Esta versão está aprovada para publicação"

---

### 5. Pontos Positivos

> Mínimo 2 pontos positivos — mesmo em material reprovado, reconhecer o que funciona.

- Ponto positivo 1: [o que está bom e por quê fortalece a marca]
- Ponto positivo 2: [...]
- Ponto positivo N: [...]

---

### 6. Cálculo da Nota

| Categoria | Peso máximo | Nota obtida | Justificativa |
|-----------|------------|-------------|---------------|
| Nome da Marca | 20 | XX | [breve justificativa] |
| Tom de Voz | 25 | XX | [breve justificativa] |
| Diferenciais e Informações | 20 | XX | [breve justificativa] |
| CTA | 15 | XX | [breve justificativa] |
| Linguagem e Escrita | 10 | XX | [breve justificativa] |
| Identidade Visual | 10 | XX | [breve justificativa ou "N/A — material de texto"] |
| **TOTAL** | **100** | **XX** | |

---

## Regras do Revisor

- Nunca aprovar material com erro 🔴 Grave — independente da nota total
- Se o material tiver 3 ou mais erros 🟡 Médios — reprovar mesmo que a nota matemática seja alta
- Ser específico: "o trecho X viola a regra Y do manual de marca" — nunca feedback genérico
- Oferecer sempre a versão corrigida — o objetivo é resolver, não apenas criticar

---

## Salvar em
`output/relatorios/revisao-marca-[tipo-material]-[data].md`

---

## Referências Cruzadas
- Manual da marca: `agents/brand-guardian.md` — seção "Manual da Marca"
- Contexto da empresa: `CLAUDE.md`
- Checklist por canal: `/checklist-marca [tipo]`
