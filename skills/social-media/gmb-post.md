---
name: gmb-post
description: Gera posts otimizados para o perfil do Google Meu Negócio de uma unidade específica da BR Pneus & Oficina, com keywords locais, CTA e configurações de SEO local. Use sempre que precisar de post para Google Meu Negócio, publicação no perfil do Google, atualização de novidade ou oferta no GMB — mesmo que o pedido use termos como "posta no Google", "atualiza o perfil do Google", "cria um post de oferta no GMB" ou "novidade no Google Meu Negócio".
---

# Skill: Post para Google Meu Negócio

## Comando
```
/gmb-post [tipo] [servico-ou-oferta] [cidade]
```

## Parâmetros
- **tipo** (obrigatório): `novidade`, `oferta`, `evento` ou `servico`
- **servico-ou-oferta** (obrigatório): O que está sendo divulgado. Ex: "troca de óleo com desconto", "alinhamento 3D", "novos pneus importados disponíveis"
- **cidade** (obrigatório): Cidade da unidade (verificar lista de unidades ativas no `CLAUDE.md`)

---

## Por que o GMB é diferente das outras redes

Antes de escrever, considerar o contexto específico do Google Meu Negócio:
- O usuário está **pesquisando ativamente** um serviço local — não é descoberta passiva como Instagram
- A intenção é alta: quem vê o post já está considerando visitar a loja
- Posts somem em 6 meses — precisam ser renovados frequentemente
- Keywords locais no texto ajudam no ranqueamento orgânico do perfil
- Fotos reais da loja e do serviço aumentam muito o desempenho

---

## Processo antes de escrever

1. Verificar no `CLAUDE.md` se a cidade tem unidade ativa
2. Identificar a keyword local principal: "[serviço] em [cidade]" (ex: "troca de pneus em Maringá")
3. Pensar no contexto de busca: o que o cliente digitou antes de ver este post?

---

## Estrutura obrigatória do output

### 1. Texto do post GMB

**Limite:** máx 1.500 caracteres (ideal entre 300–500 para melhor leitura mobile)

**Estrutura interna do texto:**

- **Frase 1 (keyword local):** Abrir com a keyword principal de forma natural — ex: "Procurando troca de óleo em São Carlos com ótimo preço?"
- **Frases 2–3 (descrição):** O que está sendo oferecido, com 1–2 diferenciais da marca (parcelamento 18x, garantia BR Total, maior mix de pneus)
- **Frase final (CTA):** Ação específica e direta

```
[Texto completo do post aqui]
```

**Botão CTA:** [Ligar | Solicitar orçamento | Saiba mais | Acessar site] — indicar qual se aplica

### 2. Sugestão de foto

```
O que fotografar: [descrição específica e acionável]
Ângulo sugerido: [ex: "foto de frente da loja com painel de preços visível"]
Dica de qualidade: [luz natural, carro em evidência, equipe sorrindo — o que funciona melhor]
```

### 3. SEO local (para configurar o perfil)

```
Keywords locais incluídas no texto: [listar quais foram usadas]
Categorias do GMB relevantes: [ex: "Oficina mecânica", "Loja de pneus", "Serviço de alinhamento"]
Atributos que devem estar atualizados: [ex: "Aceita cartões", "Estacionamento gratuito", "Acessibilidade para cadeirantes"]
```

### 4. Frequência recomendada

```
Frequência ideal: mínimo 2 posts por semana por unidade
Sequência sugerida: alternar entre os 4 tipos (novidade > oferta > servico > evento)
Validade do post: posts de oferta devem ter data de término — indicar no texto
```

---

## Regras de linguagem e conteúdo

- Tom: informativo e direto — o usuário está com intenção de compra, não precisa ser convencido com emoção
- Keyword local deve aparecer de forma natural, não forçada
- Não inventar preço, condição ou prazo — usar "preço especial", "consulte na loja"
- Para tipo `oferta`, sempre indicar prazo de validade (ex: "válido até 30/04") ou "enquanto durar o estoque"
- Para tipo `evento`, incluir data, hora e endereço completo
- Mencionar pelo menos 1 diferencial da marca em todo post

---

## Onde salvar
```
output/posts/gmb-[cidade]-[tipo]-[YYYY-MM-DD].md
```
**Exemplo:** `output/posts/gmb-saocarlos-oferta-2026-04-07.md`
