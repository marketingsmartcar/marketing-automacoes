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

## 1b. Leads do Dia — Atualização Horária

**O que faz:** Busca os leads do **dia atual** no Deskrio (BR Pneus + Peg Pneus) e atualiza a aba "📅 Hoje" na planilha de leads com KPIs, tickets por loja e por atendente.

| Campo | Valor |
|-------|-------|
| Script | `tools/leads-hoje.js` |
| Planilha | `1so_-C0e_awN9vlXVueViIjgijNEYks7DIwkBbUPd0vw` (aba "📅 Hoje") |
| Agendamento | **Todo início de hora das 07h às 18h** (Seg–Sáb) — PM2: `leads-hoje` |
| Executa ao iniciar | Sim — roda imediatamente se horário estiver entre 07h e 18h |

**Como rodar manualmente:**
```bash
node tools/leads-hoje.js --agora   # executa uma vez agora
npm run leads:hoje                 # alias
```

**PM2:**
```bash
pm2 start tools/leads-hoje.js --name leads-hoje   # iniciar
pm2 restart leads-hoje                            # reiniciar
pm2 logs leads-hoje                               # ver logs
```

---

## 2. Coleta de Vendas Diárias → Planilha + Supabase

**O que faz:** Acessa o Oficina Inteligente (OI) via Puppeteer para cada uma das 9 lojas, coleta faturamento/lucro/OS/pneus do dia, grava na planilha Google Sheets, envia dashboard no WhatsApp e sincroniza no Supabase (NexusZ).

| Campo | Valor |
|-------|-------|
| Script principal | `tools/preencher-vendas-diarias.js` |
| Log | `output/relatorios/vendas-diarias.log` |
| Agendamento | **GitHub Actions** — todo dia às **20h BRT** (Seg–Sáb) |
| Workflow | `.github/workflows/vendas-diarias.yml` |

**⚠️ Mudança de horário (mai/2026):** de 7h matinal → **20h** (fim do expediente, dados do dia já fechados).

**7 Lojas ativas (ordem das colunas na planilha):**

| Chave | Label OI | Cidade |
|-------|----------|--------|
| BR1 | BR01 CENTRO | Araraquara (Loja 1) |
| BR2 | BR02 VILA | Araraquara (Loja 2) |
| BR3 | BR03 AMERICANA | Americana |
| BR4 | BR04 SAO CARLOS | São Carlos |
| BR5 | BR05 MARINGA | Maringá |
| PEG1 | PEG11 ARARAQUARA | Peg Pneus Araraquara |
| PEG2 | PEG12 SOROCABA | Peg Pneus Sorocaba |

> BR6 (Jaú) e BR7 (Ibitinga) removidas — lojas encerradas.

**Como rodar manualmente:**
```bash
node tools/preencher-vendas-diarias.js              # hoje (padrão)
node tools/preencher-vendas-diarias.js 2026-05-06   # data específica
```

**Regras importantes:**
- Coleta o dia passado como argumento (ou hoje, quando chamado às 20h)
- Tempo total: ~10-15 min para as 9 lojas
- Grava na planilha (`SPREADSHEET_ID = 1NFsBbu1…`) + Supabase + WhatsApp

**Coleta de Pneus Vendidos (`pneuVendidos`):**
- Abre "Selecione os Grupos de Produto..." → seleciona **22 grupos específicos** de pneu (PNEU IMPORTADO * e PNEU NACIONAL *)
- Clica "Fechar/Salvar Seleção" → clica "Vendas por Grupo ou Marca" → abre PDF
- Lê o total na linha **Total** do PDF (não soma linha a linha)
- Scraper: `tools/scraper-oi-browser.js` — constante `GRUPOS_PNEU` com os 22 grupos

**Revisão Semanal (todo Sábado às 20h):**
- Após a coleta do Sábado, o workflow executa `tools/retroativo-planilha.js --semana`
- Recoleta Seg–Sáb da semana atual do OI e sobrescreve planilha + Supabase
- Corrige automaticamente qualquer inconsistência da semana
- Duração: ~60–90 min

**Retroativo de um mês:**
```bash
node tools/retroativo-planilha.js --mes 5 --ano 2026   # maio 2026
node tools/retroativo-planilha.js                       # mês atual
```
Workflow manual disponível em: `.github/workflows/retroativo-planilha-mes.yml`
→ GitHub Actions → "Retroativo Planilha + Supabase (Mês)" → Run workflow → informar mês e ano

---

## 3. Monitor de Ads

**O que faz:** Verifica saldo de todas as contas de Meta Ads e Google Ads. Se houver saldo baixo ou zerado, envia alerta automático no WhatsApp com instruções de recarga.

| Campo | Valor |
|-------|-------|
| Script | `tools/monitor-ads.js` |
| Log | `logs/ads-monitor.log` |
| Agendamento | Tasks: `BRPneus-MonitorAds-08h00` até `BRPneus-MonitorAds-17h30` |

**Horários seg–sex:** 8h, 9h, 10h, 11h, 12h, 13h, 14h, 15h, 16h, 17h, 17h30
**Horários sábado:** 8h, 9h, 10h, 11h, 11h30

**Contas monitoradas:**
- Meta Ads: 6 contas (BR Pneus: Maringá, Americana, São Carlos, Araraquara + Peg Pneus: Sorocaba, Araraquara)
- Google Ads: 6 contas (BR Pneus: Americana, Araraquara, Maringá, São Carlos + Peg Pneus: Araraquara, Sorocaba)

> Jaú e Ibitinga removidas — lojas encerradas.

**⚠️ REGRA CRÍTICA DE RECARGA META:**
> **BR Pneus Araraquara → Pix nos FUNDOS** (não no Saldo)
> Todas as outras 5 contas Meta → Pix no **SALDO**

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
| Lembrete recarga chips Peg Pneus | Todo dia **1 de cada mês às 9h** | Grupo Automações + Financeiro SmartCar |

**Lembrete recarga Peg Pneus — detalhes:**
- Função: `agendarLembretePegPneus()` em `whatsapp-bot.js`
- Destinos: `GRUPO_ALERTAS_ID` + Financeiro SmartCar `(16) 99746-5826`
- Mensagem: lembrete listando os 3 chips da Peg Pneus para recarregar: (16) 3187-0163, (16) 99623-7396, (16) 98172-3275

**Comando `!senha`:**
- Uso: `!senha <setor>` em conversa privada com o bot
- Setores: `pos venda`, `rh`, `financeiro`, `marketing`, `supervisores`, `caixas`, `peg pneus`, `supervisao tecnica`, `cd`, `agendamento`, `estoque`, `comercial`
- Agendamento 1 e 2 têm a mesma senha; todos os estoques têm a mesma senha; todos os comerciais têm a mesma senha
- Só funciona em conversa privada (bloqueado em grupos por segurança)
- Senhas definidas em `SENHAS_SETORES` no topo de `whatsapp-bot.js`

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

## 6. Novo Colaborador / Aniversariante (Manual + Automático)

**Status:** ✅ Ativo — comandos `!colaborador` e `!aniversario` no bot WhatsApp + disparo automático diário às 8h

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

**Automático diário às 8h:**
- Script: `tools/checar-aniversarios.js`
- Lista: `data/aniversariantes.json` — formato `{ nome, data: "DD/MM", loja, marca, cargo?, foto? }`
- Se a pessoa tiver `foto` com caminho válido → gera arte (template + foto) e envia imagem
- Se não tiver foto → envia só mensagem de texto
- Destino: `WHATSAPP_GRUPO_ANIVERSARIOS_ID` (se setado) ou `WHATSAPP_GRUPO_AUTOMACAO_ID`
- Agendado via função `agendarAniversarios()` no bot (dispara todo dia às 8h)

**Adicionar aniversariante:**
```bash
# Editar data/aniversariantes.json — adicionar entrada no array:
{ "nome": "Nome", "data": "DD/MM", "loja": "BR Pneus Vila", "marca": "brpneus", "foto": null }
# foto: null = só texto | foto: "assets/colaboradores/nome.jpg" = arte gerada
```

**Testar manualmente:**
```bash
node tools/checar-aniversarios.js --listar     # ver todos cadastrados
node tools/checar-aniversarios.js --hoje       # ver quem faz aniversário hoje
```

**Comandos no bot:**
```
!aniversariantes      → cadastro em massa (fluxo completo abaixo)
!colaborador          → arte de novo colaborador (1 por vez)
!aniversario          → arte de aniversariante avulso (1 por vez)
```

**Fluxo `!aniversariantes`:**
1. Bot pergunta o mês (ex: `5` para Maio)
2. Usuário manda a lista: `Nome - Loja - Dia` (uma por linha)
3. Bot salva no JSON e começa a pedir fotos uma a uma
4. Para cada foto: gera arte e manda de volta como *documento* com nome `Nome_DD-MM.png`
5. Digitar `pular` pula a pessoa (sem foto); `cancelar` encerra o fluxo
6. Fotos salvas em `assets/colaboradores/` para reusar no disparo automático diário

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

**Importante:** O retroativo OI popula cada dia individualmente. A partir do dia seguinte, o script `coletar-vendas-diarias.js` (7h) grava automaticamente no Supabase (NexusZ) — sem planilha.

---

---

## 10. Editor Automático de Vídeos

**O que faz:** Monitora a pasta `#1 PARA EDITAR/{cidade}/` em busca de novos vídeos. Ao detectar um arquivo, executa automaticamente: corte em clips de 30s, overlay do logo (BR Pneus ou Peg Pneus conforme a cidade), ajuste de brilho/contraste, mix de música de fundo, legendas automáticas via Whisper (opcional). O original é arquivado em `SEM EDIÇÃO/` e o resultado vai para `#1 EDITADOS/{cidade}/`.

**Dois modos de edição (acionados via bot `!editar`):**
- **Com áudio** — mantém voz original + melhora qualidade (filtro de grave + normalização dinâmica), gera legendas curtas (máx 4 palavras/linha), cor da legenda: verde (Peg) ou amarelo (BR)
- **Sem voz** — muta áudio original, junta todos os clips com transições fade, coloca apenas música de fundo

| Campo | Valor |
|-------|-------|
| Script | `tools/video-editor/editor-automatico.js` |
| Comando | `npm run editor` |
| Pasta de entrada | `C:\...\Conteudo das lojas\#1 PARA EDITAR\{cidade}\` |
| Pasta de saída | `C:\...\Conteudo das lojas\#1 PARA EDITAR\#1 EDITADOS\{cidade}\` |
| Original arquivado | `C:\...\#1 PARA EDITAR\{cidade}\SEM EDIÇÃO\` |
| Agendamento | Manual (iniciar com `npm run editor` e deixar rodando) |

**Cidades monitoradas (subpastas de `#1 PARA EDITAR`):**
- `BR1 Centro`, `BR2 V. Xavier`, `BR3 Americana`, `BR4 S. Carlos`, `BR5 Maringá` → logo BR Pneus
- `PEG1 Araraquara`, `PEG2 Sorocaba` → logo Peg Pneus

**Como rodar:**
```bash
npm run editor                                    # modo automático (watcher contínuo)
node tools/video-editor/editor-automatico.js      # idem
node tools/video-editor/editor-automatico.js "C:\caminho\video.mp4"  # processar um vídeo manualmente
```

**Música de fundo:** colocar arquivo MP3 em `assets/audio/musica-fundo.mp3`. Se o arquivo não existir, etapa é pulada automaticamente.

**Legendas automáticas (opcional):** adicionar `OPENAI_API_KEY=sk-...` no `.env`. Se não configurado, legendas são puladas. Transcreve em português via Whisper-1.

**Modos de edição disponíveis via `!editar`:**

| Modo | Subtipo | Comportamento |
|------|---------|---------------|
| **Com áudio** | Clips individuais | Cada arquivo editado separado; vídeos >30s têm melhor trecho selecionado via `silencedetect`; legendas por Whisper |
| **Com áudio** | Juntar todos | Todos os clips concatenados e divididos em partes de 30s sequenciais |
| **Sem voz** | — | Cada clip processado individualmente com fade-in/fade-out de 0.5s e música de fundo |

**Seleção automática de melhor trecho (vídeos >30s):**
- Usa `silencedetect` do FFmpeg para detectar início da fala
- Recorta 30s a partir do primeiro trecho de fala detectado
- Se não detectar fala, usa o início do vídeo

**Regras importantes:**
- Logo centralizado no topo (10% da largura do vídeo, 15px da borda superior)
- **Logo Peg Pneus**: `Prancheta 1 cópia 2.png` (verde + preto, colorida) — mesmo posicionamento da BR Pneus
- Brilho: +0.05 · Contraste: 1.25 · Saturação: 1.35 (mais vibrante, menos desbotado)
- Volume da voz: 1.8× com filtros `highpass → lowpass → afftdn → dynaudnorm`
- Volume da música: 7% (com áudio) / 10% (sem voz)
- Cor da legenda: verde para Peg Pneus, amarelo para BR Pneus (formato ASS com PlayResX/Y corretos)
- Legenda compacta: máx 4 palavras por linha, FontSize = 2.8% da altura do vídeo
- Modo sem voz: fade-in/fade-out de 0.5s em **cada clip individual**
- **Pastas com timestamp**: cada sessão de edição cria subpasta `YYYY-MM-DD_HH-MM` dentro de `#1 EDITADOS/{cidade}/` e `SEM EDIÇÃO/`
- Se houver erro, tenta sem música; se ainda falhar, renderiza só vídeo+logo
- Não processa arquivos em `SEM EDIÇÃO/` ou `#1 EDITADOS/`

---

---

## 11. Coleta OI Colaboradores → NexusZ (Supabase)

**O que faz:** Acessa o Oficina Inteligente via Puppeteer, navega em "Gestão Periódica" de cada loja e coleta a tabela "Participação por Consultor" (faturamento, CMV, lucro bruto, itens, produto%, serviço%). Para cada colaborador, clica em "Grupo" para obter o breakdown por produto/serviço. Sincroniza no Supabase do NexusZ.

| Campo | Valor |
|-------|-------|
| Script principal | `tools/scraper-oi-colaboradores.js` |
| Módulo de sync | `tools/supabase-colaboradores-sync.js` |
| Tabela resumo | `oi_colaboradores_resumo` (NexusZ) |
| Tabela grupos | `oi_colaboradores_grupos` (NexusZ) |
| Migration SQL | `NexusZ/supabase/migrations/20260507120000_create_oi_colaboradores.sql` |
| Agendamento | **GitHub Actions** — todo dia às **8h BRT** (seg–dom) + recoleta mês anterior todo Domingo |
| Workflow | `.github/workflows/oi-colaboradores.yml` |
| Env vars necessárias | `OI_EMAIL`, `OI_SENHA`, `NEXUSZ_SUPABASE_URL`, `NEXUSZ_SUPABASE_SERVICE_ROLE_KEY` |

**Como rodar:**
```bash
npm run oi:colaboradores              # mês atual
node tools/scraper-oi-colaboradores.js --mes 5 --ano 2026
node tools/scraper-oi-colaboradores.js --data-inicio 01/05/2026 --data-fim 31/05/2026
```

**Lojas coletadas (7 lojas — mesmas das vendas diárias):**

| Chave | Label OI |
|-------|----------|
| BR1 | BR01 CENTRO |
| BR2 | BR02 VILA |
| BR3 | BR03 AMERICANA |
| BR4 | BR04 SAO CARLOS |
| BR5 | BR05 MARINGA |
| PEG1 | PEG11 ARARAQUARA |
| PEG2 | PEG12 SOROCABA |

**Lógica de cargo (detectado pelo nome entre parênteses):**
- `(MECANICO *)` → cargo = `MECANICO`
- `(VEND* | CONSULTOR*)` → cargo = `VENDEDOR`
- `(ESTOQUE*)` → cargo = `ESTOQUE`
- `(GERENTE*)` → cargo = `GERENTE`
- Outros → `OUTRO`

**Regras importantes:**
- NÃO marca "Mostrar O.S. = Sim" — desnecessário para mecânicos, evita timeout por página enorme
- Cada clique em "Grupo" dispara um `__doPostBack` do ASP.NET; o scraper detecta se abre em nova aba ou na mesma página
- Upsert no resumo (chave única: `loja_key + data_inicio + data_fim + nome`)
- Grupos: apaga o período/loja e reinsere (DELETE + INSERT)

**Visualização no NexusZ:**
- Aba "OI Colaboradores" em Relatórios > Consolidado do Mês
- Filtros por cargo e por loja; tabela expandível mostra grupos por colaborador
- Componente: `NexusZ/src/components/admin/reports/ConsolidadoColabOITab.tsx`

---

---

## 12. Coleta Social Media (Instagram + Facebook) → NexusZ

**O que faz:** Acessa a Meta Graph API v21.0 para cada conta (BR Instagram, BR Facebook, Peg Araraquara Instagram/Facebook, Peg Sorocaba Facebook), coleta seguidores, posts e métricas de engajamento (curtidas, comentários, compartilhamentos). Sincroniza no Supabase do NexusZ.

| Campo | Valor |
|-------|-------|
| Script | `tools/coletar-social-media.js` |
| Tabela snapshots | `social_account_snapshots` (NexusZ) |
| Tabela posts | `social_posts` (NexusZ) |
| Agendamento | **GitHub Actions** — toda hora das **08h às 19h BRT** (seg–sáb) |
| Workflow | `.github/workflows/social-media.yml` |
| Env vars necessárias | `META_IG_ID_BR`, `META_ACCESS_TOKEN_BR`, `META_PAGE_ID_BR`, `META_PAGE_TOKEN_BR`, `META_IG_ID_PEG_ARQ`, `META_ACCESS_TOKEN_PEG`, `META_PAGE_ID_PEG_ARQ`, `META_PAGE_TOKEN_PEG_ARQ`, `META_PAGE_ID_PEG_SOR`, `META_PAGE_TOKEN_PEG_SOR`, `NEXUSZ_SUPABASE_URL`, `NEXUSZ_SUPABASE_SERVICE_ROLE_KEY` |

**Contas coletadas:**

| Chave | Label | Plataforma |
|-------|-------|-----------|
| BR | BR Pneus & Oficina | Instagram + Facebook |
| PEG_ARQ | Peg Pneus Araraquara | Instagram + Facebook |
| PEG_SOR | Peg Pneus Sorocaba | Facebook (Instagram pendente — `META_IG_ID_PEG_SOR` não configurado) |

**Como rodar manualmente:**
```bash
npm run social        # alias
node tools/coletar-social-media.js
```

**Regras importantes:**
- Instagram coleta até 200 posts (paginado de 100 em 100)
- Facebook coleta até 200 posts
- Posts inseridos em lotes de 50; se o lote falhar, tenta um a um
- `sanitize()` remove caracteres de controle das captions (evita PGRST102 no Supabase)
- Upsert de snapshots por `(conta_key, plataforma, data)` — um por dia
- Upsert de posts por `post_id` — histórico completo acumulado
- **Tokens Facebook expiram** — renovar Page Access Tokens no Meta Business Manager quando código de erro 190 aparecer

**Visualização no NexusZ:**
- Menu: Marketing → Social Media
- Rota: `/admin/social-media`
- Componente: `NexusZ/src/pages/admin/AdminSocialMedia.tsx`
- Cards globais de seguidores + engajamento; tabs por conta; melhor/pior post; tabela completa

---

## 13. Monitor ADS → NexusZ (Dashboard Horário)

**O que faz:** Coleta saldo, spend e métricas de performance (CTR, CPC, impressões, cliques, conversões) de todas as contas Meta Ads e Google Ads e salva snapshots em `ads_snapshots` no Supabase. O dashboard NexusZ exibe os dados com semáforo de alertas e atualiza automaticamente a cada hora.

| Campo | Valor |
|-------|-------|
| Script | `tools/coletar-ads-supabase.js` |
| Tabela | `ads_snapshots` (NexusZ) |
| Agendamento | **GitHub Actions** — toda hora das **08h às 19h BRT** (seg–sáb) |
| Workflow | `.github/workflows/ads-monitor.yml` |
| Env vars necessárias | `META_ACCESS_TOKEN_BR`, `META_ACCESS_TOKEN_PEG`, `META_ACCOUNT_BR_*` (4), `META_ACCOUNT_PEG_*` (2), `GOOGLE_ADS_*` (5 vars), `GOOGLE_ACCOUNT_BR_*` (4), `GOOGLE_ACCOUNT_PEG_*` (2), `NEXUSZ_SUPABASE_URL`, `NEXUSZ_SUPABASE_SERVICE_ROLE_KEY` |

**Contas monitoradas (12 total):**
- Meta Ads: BR Pneus Maringá, Americana, São Carlos, Araraquara + Peg Pneus Sorocaba, Araraquara
- Google Ads: BR Pneus Americana, Araraquara, Maringá, São Carlos + Peg Pneus Araraquara, Sorocaba

**⚠️ REGRA CRÍTICA META:** BR Pneus Araraquara → Pix nos **FUNDOS**. Todas as outras 5 contas Meta → Pix no **SALDO**.

**Thresholds de alerta:**
- Meta: saldo < R$100 🔴 / < R$200 🟠 | CTR < 0,5% 🔴 / < 1% 🟡
- Google: saldo < R$50 🔴 / < R$100 🟠 | CTR < 1% 🔴 / < 2% 🟠 | CPC > R$10 🔴 / > R$5 🟠

**Como rodar manualmente:**
```bash
npm run ads:supabase             # Meta + Google
npm run ads:supabase:meta        # só Meta
npm run ads:supabase:google      # só Google
```

**Visualização no NexusZ:**
- Menu: ADS (ícone raio ⚡)
- Rota: `/admin/ads`
- Componente: `NexusZ/src/pages/admin/AdminAds.tsx`
- Cards por conta com Meta + Google lado a lado; semáforo de status; totais consolidados; refetch automático a cada hora

---

*Última atualização: 07/05/2026 — ADS Monitor Supabase: dashboard horário NexusZ; Social Media atualizado para coleta horária*
