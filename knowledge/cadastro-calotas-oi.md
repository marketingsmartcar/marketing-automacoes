# Cadastro de Calotas OI — Peg Pneus

## NF de Origem
**NF CHG 1.392.378** | 129 produtos | todos para **Peg Pneus Atacarejo (Araraquara)**

Arquivo completo: `knowledge/nf-calotas-chg-1392378.json`

---

## Regras de cadastro (obrigatórias)

| Campo | Valor |
|-------|-------|
| Empresa | **4 - Peg Pneus** |
| Grupo | **CALOTA RODA (ESTOQUE)** |
| Unidade | **UN** |
| Ideal | **4** |
| R$ Venda | **0,00** |
| Código | `CAL` + ref CHG (ex: `CAL042CBPTAU`) |
| Referência | igual ao Código |
| Aplicação | linha completa extraída do CHG (ex: `LINHA GM (EXCETO ONIX/ PRISMA 17/18)`) |
| Foto | baixar do CHG e fazer upload em "Fotos e Documentos" |

**Formato do código CHG de busca:** CB = cubo baixo, CA = cubo alto, CP = cubo padrão

---

## Seletores OI mapeados

```
Login:      #Login1_UserName / #Login1_Password / #Login1_btnEntrar
Novo prod:  #ctl00_cph_btnNovo  (abre nova aba)
Empresa:    #ddlUsuarioEmpresa   → valor "3098" (Peg Pneus)
Código:     #txtProdutoID
Descrição:  #txtDescricaoDoProduto
Aplicação:  #txtAplicacaoDoProduto
Grupo:      #ddlGrupoDeProduto   → CALOTA RODA (ESTOQUE)
Referência: #txtReferencia       ← PREENCHER DEPOIS DO GRUPO (AJAX limpa se preenchido antes)
Unidade:    #tab_tapProduto_ddlUnidade  → UN
Ideal:      #tab_tapProduto_txtIdeal   → 4
R$ Venda:   #txtPrecoDeVenda
Salvar:     #btnSalvar

Tab Fotos:  #__tab_tab_tabDocumento
File input: #tab_tabDocumento_ucProdutoDocumento_flp
Salvar foto:#btnSalvarDocumento  ("Incluir Documento no Produto/Serviço")
```

> ⚠️ O campo **Referência** deve ser preenchido DEPOIS da seleção do Grupo — o AJAX do grupo limpa o campo se preenchido antes.

---

## Busca no CHG

- URL: `https://loja.chg.com.br`
- Login: via cookies em `output/chg-cookies.json` (renovar com `node tools/chg-salvar-cookies.js` se expirar)
- Campo de busca: `#descricaoview` + botão `#Enviar`
- **Estratégia de busca:**
  1. Busca pelo código CHG numérico (ex: `0080648`)
  2. Se não encontrar → busca pela ref (ex: `057CBPTAU`)
  3. O GRID retornado pelo CHG é sempre a ref correta — usar esse valor, não o do JSON
- A foto vem como `data:image/jpg;base64,...` inline no HTML → salvar como JPG temp → upload OI

> ⚠️ Os refs no `nf-calotas-chg-1392378.json` podem ter erros de OCR (ex: item 5 tinha `015CPPTAU` mas era `057CBPTAU`). Sempre usar o GRID retornado pelo CHG como ref final.

---

## Status de cadastro

| Item | CHG código | Ref GRID real | Cadastrado |
|------|-----------|---------------|------------|
| 1  | 0030069 | 004CBPTAU | ✅ usuário |
| 2  | 0030193 | 030CPPTAU | ✅ usuário |
| 3  | 0030235 | 042CBPTAU | ✅ script  |
| 4  | 0030254 | 043CBPTAU | ✅ script  |
| 5  | 0080648 | 057CBPTAU | ✅ script  |
| 6–129 | — | — | ⏳ pendente |

---

## Script de cadastro

```bash
# Um produto (índice 1-based da NF):
node tools/cadastrar-calota-oi.js [índice]

# Lote completo (a partir do índice 6):
node tools/cadastrar-calotas-lote.js
```

---

## Parsing do CHG — Regras de Extração

### Fontes de dados (em ordem de prioridade)
1. **Título do produto** (linha principal) — ex: `CALOTA ARO 13 MODELO PALIO FIRE 04 APLICACAO LINHA FIAT PRATA CUBO BAIXO FIXACAO PARAFUSOS GRID 050CBPTAU`
2. **Bloco Características** — ex: `MODELO PALIO FIRE 2004 APLICACAO LINHA FIAT` — usado como fallback para ANO e MODELO quando o título é ambíguo
3. **JSON da NF** (`nf-calotas-chg-1392378.json`) — fallback final para ARO e MODELO

### Formato de Ano
- Título usa formato curto: `04`, `02/03`, `12/15`, `2000`
- Características usa formato longo: `2004`, `2000`
- **Usar o formato exatamente como aparece no título** (prioridade)
- Se o título não tem ano, pegar do Características (virá como 4 dígitos: ex: `2004`)

### Regex de modelo
- Para em: `XX/XX`, `XXXX` (4 dígitos), `XX` (2 dígitos), `APLICACAO`, `CUBO`
- **Atenção**: `\d{2}\/\d{2}` deve vir antes de `\d{2}` para não cortar "02" de "02/03"

### Nunca usar `?`
Se ARO ou MODELO não forem encontrados → script lança erro e pula o item (não cadastra)

---

## Problemas conhecidos e soluções

1. **Cookies CHG expiram** → rodar `node tools/chg-salvar-cookies.js` para renovar
2. **Alguns CHG codes não retornam resultado** → fallback automático para busca por ref
3. **Ref do JSON pode ter erro de OCR** → script usa o GRID retornado pelo CHG (fonte da verdade)
4. **Produto já cadastrado** → script verifica se o código já existe antes de cadastrar
5. **Ano de 2 dígitos no título (ex: `04`)** → regex `\d{2}\b` captura corretamente
6. **Modelo com `?`** → ocorria quando a regex não capturava modelo (bug corrigido com parada em 2 dígitos)
7. **Item 7 (CAL050CBPTAU)** → registrado com `?` no batch inicial; corrigido manualmente pelo usuário

---

## Status de cadastro

| Item | CHG código | Ref GRID real | Cadastrado |
|------|-----------|---------------|------------|
| 1  | 0030069 | 004CBPTAU | ✅ usuário |
| 2  | 0030193 | 030CPPTAU | ✅ usuário |
| 3  | 0030235 | 042CBPTAU | ✅ script  |
| 4  | 0030254 | 043CBPTAU | ✅ script  |
| 5  | 0080648 | 057CBPTAU | ✅ script  |
| 6  | 0081187 | 003CBPTAU | ✅ script  |
| 7  | 0081691 | 050CBPTAU | ✅ script (desc corrigida manualmente) |
| 8–129 | — | — | ⏳ pendente |

---

## Entrada da NF no OI (wfEntradaImportacaoXML.aspx)

**NF:** 1.392.378 | **Empresa:** 4 - Peg Pneus | **Data:** 24/09/2026

### Fluxo de entrada (por item)
1. Monitor SEFAZ → pesquisa CHG + 1392378 → clica "Entrada" → abre `wfEntradaImportacaoXML.aspx`
2. Na tela: clicar "Carregar pela Chave de Acesso" (chave já pré-preenchida pela URL)
3. Para cada item na aba "Itens":
   - Clicar "Buscar" na coluna Ação → ativa aba "Busca de Produtos"
   - Preencher **Referência** = `CAL` + código CHG (último token da "Descrição na Nota")
   - Selecionar **Grupo** = `CALOTA RODA (ESTOQUE)`
   - Clicar Buscar (`btnBuscarProdutoUC`) → 1 resultado → clicar "Abrir"
   - Preencher **R$ Venda**: custo < R$15 → R$35,00 | custo ≥ R$15 → R$45,00

### Seletores DOM mapeados
```
Aba Busca de Produtos — Referência: tabProduto_tapBusca_ucProdutoBusca_txtReferencia
Aba Busca de Produtos — Grupo:      tabProduto_tapBusca_ucProdutoBusca_ddlGrupoDeProduto
Botão Buscar:                       __doPostBack('tabProduto$tapBusca$ucProdutoBusca$btnBuscarProdutoUC','')
Buscar item N (ativação):           __doPostBack('tabProduto$tapProduto$grdXMLItem$ctl{N+1}$lkbBuscarProduto','')
R$ Venda item N:                    tabProduto_tapProduto_grdXMLItem_ctl{N+1}_txtPrecoDeVenda
```

### Script de automação
```bash
node tools/entrada-nf-calotas-todos.js        # processa todos os itens (usa browser aberto em porta 9222)
node tools/verificar-corrigir-entrada-nf.js   # diagnóstica e revincula itens que ficaram como "Cadastrar Produto e Importar"
```

### Status final — NF 1.392.378
- ✅ 130/130 itens vinculados e com R$ Venda preenchido
- ✅ Entrada efetuada no OI (Código 1547, 29/09/2026)
- ✅ PDF da NF anexado na aba Documentos
- Valor total: R$ 6.987,80 | Empresa: 4 - Peg Pneus
