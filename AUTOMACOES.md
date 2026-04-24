# Automações — Grupo BR Pneus / Peg Pneus

Documento de referência para todas as automações ativas. Atualizar sempre que houver mudança de configuração.

---

## 1. Planilha de Leads

**O que faz:** Busca todos os tickets do mês no Deskrio (BR Pneus + Peg Pneus), atualiza a aba do mês atual com tickets por loja, por atendente e novos contatos.

| Campo | Valor |
|-------|-------|
| Script | `tools/relatorio-mensal-sheets.js` |
| Bat | `relatorio-leads.bat` |
| Planilha | `1so_-C0e_awN9vlXVueViIjgijNEYks7DIwkBbUPd0vw` |
| Log | `logs/relatorio-leads.log` |
| Agendamento | Diário às **18h** — Task: `BRPneus-RelatorioLeads` |

**Como rodar manualmente:**
```bash
node tools/relatorio-mensal-sheets.js          # mês atual
node tools/relatorio-mensal-sheets.js 4 2026   # mês/ano específico
```

**Regra importante:** o dia atual **é incluído**. Ao rodar no dia 24/04 às 18h, a planilha aparece com dados até 24/04.

---

## 2. Planilha de Vendas Diárias

**O que faz:** Acessa o Oficina Inteligente (OI) via Puppeteer para cada uma das 9 lojas, coleta faturamento/lucro/OS/pneus de 01/MM até ontem, preenche bloco diário na planilha e envia dashboard no WhatsApp.

| Campo | Valor |
|-------|-------|
| Script | `tools/preencher-vendas-diarias.js` |
| Bat | `vendas-diarias.bat` |
| Planilha | `1NFsBbu1MIG1Tl_XJc8VnhP8OVDupivbVxiYKpv8_mGw` |
| Aba | `Vendas diárias` (sheetId: `1220160954`) |
| Log | `output/relatorios/vendas-diarias.log` |
| Agendamento | Diário às **7h** — Task: `BR Pneus - Vendas Diarias` |

**9 Lojas (ordem das colunas na planilha):**

| Chave | Label OI | Cidade |
|-------|----------|--------|
| BR1 | BR01 CENTRO | Araraquara (Loja 1) |
| BR2 | BR02 VILA | Araraquara (Loja 2) |
| BR3 | BR03 AMERICANA | Americana |
| BR4 | BR04 SAO CARLOS | São Carlos |
| BR5 | BR05 MARINGA | Maringá |
| BR6 | BR06 JAU | Jaú |
| BR7 | BR08 IBITINGA | Ibitinga |
| PEG1 | PEG11 ARARAQUARA | Peg Pneus Araraquara |
| PEG2 | PEG12 SOROCABA | Peg Pneus Sorocaba |

**Como rodar manualmente:**
```bash
node tools/preencher-vendas-diarias.js              # ontem (padrão)
node tools/preencher-vendas-diarias.js 2026-04-23   # data específica
```

**Regras importantes:**
- Delay de **5 segundos** entre lojas (só margem de carregamento — login único, sem restrição)
- Tempo total: ~10-15 min para as 9 lojas
- Ao passar data específica, coleta acumulado de 01/MM até aquela data
- ⚠️ Existe tarefa duplicada (`BRPneus-VendasDiarias` e `BR Pneus - Vendas Diarias`) — verificar e limpar

**Coleta de Pneus Vendidos (`pneuVendidos`):**
- Abre "Selecione os Grupos de Produto..." → seleciona **22 grupos específicos** de pneu (PNEU IMPORTADO * e PNEU NACIONAL *)
- Clica "Fechar/Salvar Seleção" → clica "Vendas por Grupo ou Marca" → abre PDF
- Lê o total na linha **Total** do PDF (não soma linha a linha)
- Scraper: `tools/scraper-oi-browser.js` — constante `GRUPOS_PNEU` com os 22 grupos

---

## 3. Monitor de Ads

**O que faz:** Verifica saldo de todas as contas de Meta Ads e Google Ads. Se houver saldo baixo ou zerado, envia alerta automático no WhatsApp com instruções de recarga.

| Campo | Valor |
|-------|-------|
| Script | `tools/monitor-ads.js` |
| Log | `logs/ads-monitor.log` |
| Agendamento | Tasks: `BRPneus-MonitorAds-08h00` até `BRPneus-MonitorAds-17h30` |

**Horários (seg–sáb):** 8h, 9h, 10h, 11h, 12h, 13h, 14h, 15h, 16h, 17h, 17h30

**Contas monitoradas:**
- Meta Ads: 8 contas (BR Pneus: Ibitinga, Maringá, Americana, Jaú, São Carlos, Araraquara + Peg Pneus: Sorocaba, Araraquara)
- Google Ads: 7 contas (BR Pneus: Americana, Araraquara, Jaú, Maringá, São Carlos + Peg Pneus: Araraquara, Sorocaba)

**⚠️ REGRA CRÍTICA DE RECARGA META:**
> **BR Pneus Araraquara → Pix nos FUNDOS** (não no Saldo)
> Todas as outras 7 contas Meta → Pix no **SALDO**

**Comandos:**
```bash
npm run ads                       # Meta + Google
npm run ads:meta                  # só Meta
npm run ads:google                # só Google
node tools/agendar-monitor.js 8-17-1730   # reagendar tarefas
```

---

## 4. WhatsApp Bot

**O que faz:** Bot central que envia relatórios automáticos, alertas de ads, cobranças de vídeo e responde comandos manuais.

| Campo | Valor |
|-------|-------|
| Script | `tools/whatsapp-bot.js` |
| PM2 | `br-pneus-bot` (ID 0) |
| Porta API interna | `3099` |

**Grupos:**

| Variável | ID | Uso |
|----------|----|-----|
| `WHATSAPP_GRUPO_AUTOMACAO_ID` | `120363427073578887@g.us` | Alertas de ads, dashboards, notificações |
| `WHATSAPP_GRUPO_ID` | `5516997593460-1554117583@g.us` | Mensagens agendadas padrão |
| `WHATSAPP_GRUPO_VIDEOS_ID` | `120363049729728353@g.us` | Cobrança de vídeos para as lojas |

**Automações internas do bot:**

| Automação | Horário | Destino |
|-----------|---------|---------|
| Alertas de Ads | Seg–Sáb: 8h–17h (hora em hora) + 17h30 / Sáb: 8h e 11h | Grupo Automações |
| Cobrança de vídeos | Toda segunda às 8h | Grupo Vídeos |
| Verificação de tokens Meta | Diária às 7h | Grupo Automações |
| Relatório semanal de Ads | Toda segunda às 8h05 | Grupo Automações |

**Comandos úteis:**
```bash
pm2 restart br-pneus-bot   # reiniciar bot
pm2 logs br-pneus-bot      # ver logs em tempo real
```

**Fix quando porta 3099 trava:**
```bash
pm2 stop br-pneus-bot
# matar processo na porta 3099 (PowerShell):
# Get-NetTCPConnection -LocalPort 3099 | Stop-Process -Force
pm2 start br-pneus-bot
```

---

## 5. Stories Automáticos

**O que faz:** Publica stories diários no Instagram e Facebook para BR Pneus e Peg Pneus usando vídeos das pastas das lojas.

| Campo | Valor |
|-------|-------|
| Script | `tools/stories/story-scheduler.js` |
| PM2 | `stories-scheduler` (ID 2) |
| Horário | Todo dia às **8h** |
| Estado/fila | `data/stories-state.json` |
| Lock anti-duplicata | `.stories-running.lock` |

**Quantidade por conta:**

| Conta | Instagram | Facebook |
|-------|-----------|----------|
| BR Pneus | 3 stories | 3 stories |
| Peg Pneus Araraquara | 3 stories | 3 stories |
| Peg Pneus Sorocaba | — | 1 story |

**Regra de duração:**
- Vídeos **≤ 30s** → somente Facebook
- Vídeos **> 30s** → Instagram + Facebook

**Pasta de vídeos:** `C:\Users\Nick\Desktop\Projetos\Videos\Conteudo das lojas\`

**Scripts de emergência:**
```bash
node tools/stories/deletar-e-repostar.js     # apaga todos e reposta do zero
node tools/stories/completar-stories-hoje.js # completa posts faltantes (BR Pneus)
```

**Se stories duplicarem:**
1. `taskkill /F /PID <pid>` em todos os processos `story-scheduler.js`
2. `pm2 stop stories-scheduler`
3. Deletar lock: `.stories-running.lock`
4. Rodar `deletar-e-repostar.js`
5. `pm2 start stories-scheduler`

---

## 6. Novo Colaborador / Aniversariante

**Status:** ✅ Ativo — comandos `!colaborador` e `!aniversario` no bot WhatsApp

**Implementação:** Compositor de imagem via `sharp` — templates exportados do Canva como PNG, sobreposição de foto + texto em Node.js.

| Campo | Valor |
|-------|-------|
| Script gerador | `tools/gerar-arte.js` |
| Templates | `assets/templates/colaborador-*.png` e `aniversario-*.png` |
| Output | `output/criativos/` |
| Fonte | Montserrat (embutida via `@fontsource/montserrat` — sem instalação no sistema) |

**Designs Canva de origem:**

| Design | ID | Páginas |
|--------|----|---------|
| Novo Colaborador | `DAFwZrHbWww` | SmartCar (p1) / BR Pneus (p2) / Peg Pneus (p3) |
| Aniversariante | `DAGc8fb4XlE` | Peg Pneus (p1) / SmartCar (p2) / BR Pneus (p3) |

**Fluxo no bot WhatsApp (ambos os comandos):**
1. Enviar `!colaborador` ou `!aniversario` → bot exibe menu de empresa (1=BR Pneus, 2=Peg Pneus, 3=SmartCar)
2. Usuário escolhe a empresa → bot pede a foto
3. Colaborador: foto → nome → cargo → cidade → arte enviada
4. Aniversariante: foto → nome → arte enviada
5. Arte enviada **sempre** para o grupo Automações (`WHATSAPP_GRUPO_AUTOMACAO_ID`)

**Comandos no bot:**
```
!colaborador   → menu de empresa → foto → nome → cargo → cidade
!aniversario   → menu de empresa → foto → nome
```

**Comportamento da foto (colaborador):**
- Crop circular com detecção automática de rosto (`position: 'attention'` do Sharp)
- Nome com tamanho dinâmico: ≤7 chars=58px / ≤11=52px / ≤15=46px / ≤20=40px / >20=34px
- Textos em maiúsculas automáticas

**CLI manual:**
```bash
node tools/gerar-arte.js colaborador brpneus "João Silva" "Mecânico" "Araraquara" /path/foto.jpg
node tools/gerar-arte.js aniversario brpneus "Maria Santos" /path/foto.jpg
```

**Se os templates mudarem no Canva:** re-exportar via MCP (`export-design`) e salvar em `assets/templates/` com os mesmos nomes.

> Referência completa: `knowledge/templates-canva.md`

---

## 7. Agendamento Geral (Windows Task Scheduler)

```
BRPneus-RelatorioLeads       → diário 18h
BR Pneus - Vendas Diarias    → diário 7h
BRPneus-MonitorAds-08h00     → seg–sáb 8h
BRPneus-MonitorAds-09h00     → seg–sáb 9h
BRPneus-MonitorAds-10h00     → seg–sáb 10h
BRPneus-MonitorAds-11h00     → seg–sáb 11h
BRPneus-MonitorAds-12h00     → seg–sáb 12h
BRPneus-MonitorAds-13h00     → seg–sáb 13h
BRPneus-MonitorAds-14h00     → seg–sáb 14h
BRPneus-MonitorAds-15h00     → seg–sáb 15h
BRPneus-MonitorAds-16h00     → seg–sáb 16h
BRPneus-MonitorAds-17h00     → seg–sáb 17h
BRPneus-MonitorAds-17h30     → seg–sáb 17h30
```

**PM2 (sempre ativos):**
```
br-pneus-bot       (ID 0) → bot WhatsApp, porta 3099
stories-scheduler  (ID 2) → stories diários às 8h
```

---

## 8. Arquivos de Credenciais e Configuração

| Arquivo | Conteúdo |
|---------|----------|
| `.env` | Tokens Meta, Google, WhatsApp, IDs de grupos |
| `credentials/google-sheets-key.json` | Service account Google Sheets |

**Variáveis críticas no `.env`:**
- `OI_*` — credenciais do Oficina Inteligente por loja
- `META_PAGE_TOKEN_*` — tokens das páginas Meta (BR e Peg)
- `GOOGLE_SERVICE_ACCOUNT_KEY` — caminho do JSON da service account
- `WHATSAPP_GRUPO_AUTOMACAO_ID` — grupo principal de alertas
- `WHATSAPP_GRUPO_VIDEOS_ID` — grupo de cobrança de vídeos

---

---

## 9. Sync Vendas OI → NexusZ (Supabase)

**O que faz:** Após cada coleta do OI, grava os dados acumulados do mês por loja na tabela `vendas_diarias_oi` do Supabase do NexusZ. Os dados aparecem automaticamente na aba "Oficina Inteligente" dentro de Relatórios > Consolidado do Mês.

| Campo | Valor |
|-------|-------|
| Módulo de sync | `tools/supabase-vendas-sync.js` |
| Chamado por | `preencher-vendas-diarias.js` (ao final de cada coleta) |
| Script retroativo (via planilha) | `tools/retroativo-vendas-supabase.js` |
| Script retroativo (via OI direto) | `tools/retroativo-oi-supabase.js` |
| Tabela Supabase | `vendas_diarias_oi` (NexusZ) |
| Env vars necessárias | `NEXUSZ_SUPABASE_URL`, `NEXUSZ_SUPABASE_ANON_KEY` |

**Como rodar retroativo via OI (coleta direto do ERP, sem depender da planilha):**
```bash
node tools/retroativo-oi-supabase.js          # mês atual, dia 1 até hoje (~3h para mês completo)
node tools/retroativo-oi-supabase.js 4 2026   # mês/ano específico
```
Pula domingos automaticamente. Roda um login por dia → 9 lojas → sync Supabase. NÃO escreve na planilha.

**Como rodar retroativo via planilha (mais rápido, usa dados já coletados):**
```bash
node tools/retroativo-vendas-supabase.js          # mês atual
node tools/retroativo-vendas-supabase.js 4 2026   # mês/ano específico
```

**Importante:** O retroativo OI popula cada dia individualmente. A partir do dia seguinte, o script `preencher-vendas-diarias.js` (7h) grava automaticamente na planilha e no Supabase.

---

*Última atualização: 24/04/2026 — retroativo OI direto implementado; sync vendas OI → NexusZ ativo; dia atual incluído na planilha de leads; `!colaborador` e `!aniversario` implementados*
