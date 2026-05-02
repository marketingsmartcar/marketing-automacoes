# Skill: /canva-gerar — Geração de Artes via Canva MCP
**Versão:** 1.0 — 2026-04-10
**Design base:** `DAHGdMRISHc` (4 páginas, 1080×1350px)
**Brand Kit:** `kAG4UEHKjAo`

---

## O que esta skill faz

Automatiza a criação de artes no Canva editando templates reais criados pelo usuário. Usa o MCP do Canva para abrir transação de edição, substituir textos pelos dados da unidade solicitada, salvar e exportar como PNG.

---

## Quando usar

- Pedido de arte para redes sociais com template Canva
- Geração em lote para múltiplas unidades
- Posts de serviço, promoção de pneus ou vagas
- Sempre que o usuário preferir Canva em vez de HTML

---

## Templates disponíveis

| # | Página | Tipo | Design ID | Campos editáveis |
|---|--------|------|-----------|-----------------|
| 1 | Página 1 | Promoção de Serviço | `DAHGdMRISHc` (p.1) | serviço, preço, cidade |
| 2 | Página 2 | Vaga de Emprego | `DAHGdMRISHc` (p.2) | cargo, cidade/estado |
| 3 | Página 3 | Promoção Pneus Moto | `DAHGdMRISHc` (p.3) | título, produto, preço |
| 4 | Página 4 | Promoção Pneus Caminhão | `DAHGdMRISHc` (p.4) | título, telefone, disclaimer |

> Mapeamento completo de `element_id` por campo: ver `knowledge/templates-canva.md`

---

## Fluxo de execução

```
1. start-editing-transaction  (design_id: DAHGdMRISHc)
2. perform-editing-operations (find_and_replace_text por element_id)
3. commit-editing-transaction
4. export-design              (format: png, pages: [página desejada])
```

> **IMPORTANTE:** Iniciar a transação e executar as operações na MESMA chamada ou imediatamente em seguida. Transações expiram rapidamente.

---

## Parâmetros do comando `/canva-gerar`

| Parâmetro | Obrigatório | Exemplos |
|-----------|------------|---------|
| `tipo` | Sim | `servico`, `vaga`, `moto`, `caminhao` |
| `cidade` | Sim | `Araraquara`, `Maringá`, `São Carlos`, etc. |
| `servico` | Para tipo=servico | `Alinhamento 3D`, `Troca de Óleo` |
| `preco` | Opcional | `R$179`, `A partir de R$89` |
| `produto` | Para tipo=moto/caminhao | `90/90-18 Speedmax`, `295/80-22.5 Pirelli` |
| `cargo` | Para tipo=vaga | `Mecânico`, `Balanceador`, `Atendente` |
| `todas` | Opcional | `true` para gerar para todas as unidades |

---

## Exemplos de uso

### Arte de serviço para Maringá:
```
/canva-gerar tipo=servico cidade=Maringá servico="Alinhamento 3D" preco="R$179"
```

### Vaga em São Carlos:
```
/canva-gerar tipo=vaga cidade="São Carlos" cargo="Mecânico"
```

### Promoção pneu moto para Araraquara:
```
/canva-gerar tipo=moto cidade=Araraquara produto="90/90-18 Speedmax" preco="R$189"
```

### Gerar para toda a rede:
```
/canva-gerar tipo=servico servico="Balanceamento" preco="R$39,90" todas=true
```

---

## Operações MCP por tipo de template

### Tipo: `servico` (Página 1)

```json
[
  {
    "type": "find_and_replace_text",
    "element_id": "PBlwf1b7B2wxKqvv-LBbsr3xNjyccD5VS",
    "find": "<texto atual do headline>",
    "replace": "<NOME DO SERVIÇO EM MAIÚSCULAS>"
  },
  {
    "type": "find_and_replace_text",
    "element_id": "PBlwf1b7B2wxKqvv-LBWwNhSjtymrtHdG",
    "find": "<texto atual do serviço>",
    "replace": "<Descrição do serviço>"
  },
  {
    "type": "find_and_replace_text",
    "element_id": "PBlwf1b7B2wxKqvv-LBHN69t4bHjqqJJJ-LBb5nqnRXZ9dQbjj",
    "find": "<preço atual>",
    "replace": "<R$XXX>"
  },
  {
    "type": "find_and_replace_text",
    "element_id": "PBlwf1b7B2wxKqvv-LB48BJnvrCfPyx0q-LBvXZCWz7D3kQyHl",
    "find": "<cidade atual>",
    "replace": "<Cidade>"
  }
]
```

### Tipo: `vaga` (Página 2)

```json
[
  {
    "type": "find_and_replace_text",
    "element_id": "PBPQXC21HYTTDCqD-LBysPhDNFKZnHgBf",
    "find": "<cargo atual>",
    "replace": "<CARGO EM MAIÚSCULAS>"
  },
  {
    "type": "find_and_replace_text",
    "element_id": "PBPQXC21HYTTDCqD-LBVwRL8QVvmqdSfF-LBZpRY6SHG9r9YMW",
    "find": "<cidade atual>",
    "replace": "<Cidade — UF>"
  }
]
```

### Tipo: `moto` (Página 3)

```json
[
  {
    "type": "find_and_replace_text",
    "element_id": "PBKBvNwCjfRQy1jy-LBr5C5YqVQyWhGBb",
    "find": "<título atual>",
    "replace": "<CATEGORIA>"
  },
  {
    "type": "find_and_replace_text",
    "element_id": "PBKBvNwCjfRQy1jy-LB67vlbc0k04V0mN",
    "find": "<produto atual>",
    "replace": "<Medida Marca Modelo>"
  },
  {
    "type": "find_and_replace_text",
    "element_id": "PBKBvNwCjfRQy1jy-LBkzWfps1xm33KQk",
    "find": "<preço atual>",
    "replace": "<R$XXX>"
  }
]
```

### Tipo: `caminhao` (Página 4)

```json
[
  {
    "type": "find_and_replace_text",
    "element_id": "PBNN5vB42szgswFJ-LBsb5nP9H6hKpmKP",
    "find": "<título atual>",
    "replace": "<CATEGORIA>"
  },
  {
    "type": "find_and_replace_text",
    "element_id": "PBNN5vB42szgswFJ-LBN1pzQRQG20Gpqk",
    "find": "<telefone atual>",
    "replace": "<(XX) XXXX-XXXX>"
  },
  {
    "type": "find_and_replace_text",
    "element_id": "PBNN5vB42szgswFJ-LBZhNsvmMTXWJzx8",
    "find": "<disclaimer atual>",
    "replace": "<*Condições na loja>"
  }
]
```

---

## Regras de execução

1. **Antes de editar:** usar `get-design-content` na página alvo para ler os textos atuais (necessário para `find`)
2. **Nunca inventar preços** — usar somente valores fornecidos pelo usuário ou expressão "consulte na loja"
3. **Telefone:** sempre usar o telefone correto da unidade (ver tabela em `knowledge/templates-canva.md`)
4. **Export:** sempre exportar como PNG, especificar a página correta
5. **Output:** salvar link do design exportado em `output/criativos/`
6. **Histórico:** registrar no rodapé de `knowledge/templates-canva.md`

---

## Dados das unidades (referência rápida)

| Cidade | Telefone | UF |
|--------|---------|-----|
| Araraquara | (16) 3190-2380 | SP |
| Americana | (16) 3397-5424 | SP |
| São Carlos | (16) 3376-0011 | SP |
| Maringá | (44) 3170-0441 | PR |

**0800 central:** 0800 942 4402

---

## Output esperado

Ao concluir, informar ao usuário:
- Link do design no Canva (para download manual se necessário)
- Página(s) editada(s)
- Campos alterados e valores aplicados
- Caminho do PNG exportado (se exportado com sucesso)
