---
name: calendario-mensal
description: Gera o planejamento editorial completo de redes sociais para um mês inteiro da BR Pneus & Oficina, com tabela semanal por plataforma, mix de conteúdo equilibrado e datas sazonais integradas. Use sempre que precisar de calendário de posts, pauta do mês, grade editorial ou planejamento de conteúdo — mesmo que o pedido use palavras como "o que postar esse mês", "planeja as publicações de julho" ou "monta a grade de conteúdo".
---

# Skill: Calendário Editorial Mensal

## Comando
```
/calendario-mensal [mes] [ano] [unidade-opcional]
```

## Parâmetros
- **mes** (obrigatório): Mês do calendário. Ex: "julho", "agosto"
- **ano** (obrigatório): Ano. Ex: "2026"
- **unidade** (opcional): Cidade da unidade. Se informada, personaliza com ações locais, feriados municipais e contexto regional

---

## Processo antes de gerar

1. Ler `knowledge/calendario-sazonal.md` para identificar todas as datas relevantes do mês (feriados nacionais, datas comerciais, eventos sazonais automotivos)
2. Ler `knowledge/personas.md` para planejar a rotação de personas ao longo do mês
3. Se unidade informada: verificar se há feriados municipais, eventos locais ou sazonalidade regional específica
4. Definir o **tema central do mês** com base nas datas e no contexto (ex: "Julho — Férias com segurança nas estradas")

---

## Estrutura obrigatória do output

### 1. Resumo Estratégico do Mês

```
Tema central: [1 frase definindo o fio condutor do mês]
Datas-chave identificadas: [lista das datas relevantes encontradas no calendário sazonal]
Campanhas sugeridas: [2-3 campanhas temáticas para o mês]
Meta de publicações: [posts feed | reels/vídeos | stories/semana | posts GMB/semana]
```

### 2. Planejamento Semanal

Para cada semana (normalmente 4-5 semanas), gerar uma tabela completa:

**Semana [N] — [intervalo de datas]**

| Dia | Plataforma | Formato | Tipo | Tema / Assunto | Copy resumida (2 linhas) | Hashtags-chave | Persona-alvo | Obs. para o designer |
|-----|-----------|---------|------|---------------|--------------------------|----------------|-------------|----------------------|

**Formatos disponíveis:** post único, carrossel, Reels/vídeo curto, story, enquete, quiz, countdown, link, GMB

**Tipos:** educativo, promocional, institucional, entretenimento

**Regras da tabela:**
- Mínimo 20 posts no mês distribuídos de forma equilibrada entre plataformas
- Mínimo 4 Reels ou vídeos curtos no mês
- Mínimo 8 stories por semana (contar separado dos posts de feed)
- Mínimo 2 posts por semana no Google Meu Negócio
- Nunca colocar mais de 2 conteúdos promocionais consecutivos
- Distribuir as 4 personas ao longo do mês — não concentrar na mesma

**Mix obrigatório por mês:**
- 40% educativo — dicas práticas, explicações acessíveis, mitos e verdades
- 30% promocional — ofertas, promoções sazonais, condições de pagamento
- 20% institucional — bastidores, equipe, história da marca, depoimentos
- 10% entretenimento — memes automotivos leves, trends, enquetes divertidas

### 3. Observações Finais

**Ações de engajamento sugeridas** (escolher 3 para o mês):
- Enquete nos stories (ex: "Você faz revisão antes de viajar?")
- Quiz educativo (ex: "Você sabe quando trocar seu pneu?")
- Desafio/UGC (ex: "Mostre seu carro antes e depois da revisão")
- Caixa de perguntas sobre cuidados com carro
- Votação para novo serviço em destaque

**Sugestão de parceria local** (se unidade informada):
- 1 ideia de collab com negócio local (posto de gasolina, lava-rápido, seguradora)

**Posts recomendados para impulsionar:**
- Indicar 2-3 posts que devem receber verba de tráfego pago e justificar por quê

---

## Regras de linguagem e conteúdo

- Todo copy resumido na tabela já deve soar com o tom da BR Pneus: direto, popular e confiável
- Mencionar o diferencial da marca (parcelamento 18x, garantia BR Total, melhores preços) ao menos uma vez por semana
- Conteúdo educativo deve simplificar termos técnicos para público classe B/C
- Posts institucionais devem humanizar a marca (mostrar pessoas, bastidores reais, histórias)
- Conteúdo de entretenimento pode usar humor leve — nunca vulgar ou polêmico

---

## Onde salvar
```
output/posts/calendario-[mes]-[ano].md
```
**Exemplo:** `output/posts/calendario-agosto-2026.md`
