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

## 2. Coleta de Vendas Diárias → Supabase

**O que faz:** Acessa o Oficina Inteligente (OI) via Puppeteer para cada uma das 9 lojas, coleta faturamento/lucro/OS/pneus do dia e sincroniza no Supabase (NexusZ). **Não grava na planilha Google Sheets** (removido em mai/2026). **Não envia WhatsApp** (removido em mai/2026).

| Campo | Valor |
|-------|-------|
| Script principal | `tools/coletar-vendas-diarias.js` |
| Log | `output/relatorios/vendas-diarias.log` |
| Agendamento | **GitHub Actions** — todo dia às **20h BRT** (Seg–Sáb) |
| Workflow | `.github/workflows/vendas-diarias.yml` |

**4 Lojas ativas (jul/2026):**

| Chave | Label OI | Cidade |
|-------|----------|--------|
| BR1 | BR01 CENTRO | Araraquara (Loja 1) |
| BR3 | BR03 AMERICANA | Americana |
| BR4 | BR04 SAO CARLOS | São Carlos |
| PEG1 | PEG11 ARARAQUARA | Peg Pneus Araraquara |

> Lojas encerradas e removidas: BR2 (Araraquara Vila, jul/2026), BR5 (Maringá, jul/2026), PEG2 (Sorocaba, jun/2026), BR6 (Jaú, mai/2026), BR7 (Ibitinga, mai/2026).

**Como rodar manualmente:**
```bash
node tools/coletar-vendas-diarias.js              # ontem (padrão)
node tools/coletar-vendas-diarias.js 2026-05-06   # data específica
```

**Regras importantes:**
- Coleta o dia anterior por padrão; se cair num domingo, usa o sábado anterior
- Tempo total: ~10-15 min para as 9 lojas
- Apenas Supabase — Google Sheets não é mais atualizada

---

## 2b. Coleta de Vendas de Pneus Detalhada → Supabase

**O que faz:** Acessa a API OI (OrdemDeServicoJSON) para cada uma das 7 lojas, extrai os itens de pneu de cada OS do dia e grava na tabela `vendas_pneus` do Supabase com grupo/descricao/medida/marca/qtd/faturamento por produto. É a fonte de dados do menu "Vendas de Pneus" no NexusZ.

| Campo | Valor |
|-------|-------|
| Script | `tools/coletar-vendas-pneus.js` |
| Agendamento | Manual por enquanto — rodar após `coletar-vendas-diarias.js` |

**Como rodar:**
```bash
node tools/coletar-vendas-pneus.js                  # ontem (padrão)
node tools/coletar-vendas-pneus.js 2026-05-28        # data específica
node tools/coletar-vendas-pneus.js --inspecionar     # mostra itens sem gravar
```

**Regras importantes:**
- Usa a API REST OI diretamente (não Puppeteer) — muito mais rápido (~30s total)
- Filtra itens com `DescricaoDoItem` começando com "PNEU" (exclui serviços, peças, etc.)
- Exclui "PNEU USADO (RETIRADA PNEU)" — não é venda
- Medida extraída com regex do formato OI: `"PNEU NNN NN RR MARCA MODELO"`
- Marca = primeira palavra após as 3 dimensões da medida
- Grupo determinado por keywords na descrição + aspect ratio + marca nacional/importada
- Delete + insert por loja/dia — reexecução é segura
- Tokens: mesmos `OI_TOKEN_*` do `.env` (BR01 e BR03 usam token ALT)
- Lojas cobertas: BR01, BR03, BR04, PEG1 (4 lojas ativas — BR02, BR05, SOR1 encerradas)

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

**Contas monitoradas (jul/2026 — 8 contas ativas):**
- Meta Ads: 4 contas (BR Pneus: Americana, São Carlos, Araraquara + Peg Pneus: Araraquara)
- Google Ads: 4 contas (BR Pneus: Americana, Araraquara, São Carlos + Peg Pneus: Araraquara)

> Removidas: Jaú, Ibitinga (mai/2026), Maringá (jul/2026), Sorocaba (jun/2026).

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

## 9. Avaliações Google (nota média por loja)

**O que faz:** Scrapa a nota média e total de avaliações de cada loja no Google Business e salva na tabela `google_ratings` do Supabase. Os dados aparecem na tela **Social Media** do NexusZ.

| Campo | Valor |
|-------|-------|
| Script | `tools/coletar-avaliacoes.js` |
| Workflow | `.github/workflows/avaliacoes-google.yml` |
| Agendamento | Seg–Sáb às **17h BRT** (20:00 UTC) |
| Tabela Supabase | `google_ratings` |

**Como rodar manualmente:**
```bash
node tools/coletar-avaliacoes.js
# ou
npm run avaliacoes
```

**Pré-requisito (uma única vez):** rodar o SQL em `supabase/migrations/create_google_ratings.sql` no Supabase SQL Editor.

**Secrets necessários no GitHub Actions:**
`NEXUSZ_SUPABASE_URL`, `NEXUSZ_SUPABASE_SERVICE_ROLE_KEY`, todos os `GOOGLE_PLACE_ID_*`.

---

## 10. CPA — Custo por Lead (NexusZ AdminAds)

**O que faz:** Seção "💰 CPA" na página Dashboard ADS do NexusZ. Cruza automaticamente o gasto diário estimado de ADS (spend_7d ÷ 7) com os leads do dia da tabela `leads_diarios`. Exibe por loja: gasto Meta, gasto Google, total/dia e CPA em R$.

**Sem backend adicional** — usa dados já coletados pelas automações de ADS e Leads.

**Acesso:** NexusZ → Dashboard ADS → rolagem até seção "💰 CPA — Custo por Lead"

---

**Comportamento de recuperação (frame detachado):**
- Se o WhatsApp perder o frame Puppeteer durante um relatório, o bot faz `process.exit(1)` para deixar o PM2 reiniciar limpo
- O SIGTERM handler garante que o Chrome filho é encerrado antes do processo sair
- Na inicialização, se Chrome ainda estiver ativo (race condition pós-restart), o bot tenta novamente até 3× com 8s de espera entre tentativas
- Watchdog de 4 minutos na autenticação: se `ready` não disparar, reinicia automaticamente

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

> **08/05/2026 — Jaú (BR6) e Ibitinga (BR7) removidas da fila:** 16 entradas removidas de `data/stories-state.json` (`br_60s` + `historico`). Lojas encerradas — vídeos dessas unidades não devem ser readicionados.

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

## 5c. Stories Cloud — GitHub Actions (SISTEMA ATUAL a partir de Jul/2026)

**O que faz:** Substitui os sistemas 5 e 5b. Publica stories diários no IG e FB para BR Pneus sem depender do PC local. Plano mensal pré-gerado por `agendar-mes.js` e salvo no git.

| Campo | Valor |
|-------|-------|
| Script | `tools/stories/cloud-scheduler.js` |
| Workflow | `.github/workflows/stories-diarios.yml` |
| Horário | Todo dia às **06h BRT** (Seg–Sáb) |
| Estado | `data/stories-cloud-state.json` (commitado automaticamente pelo workflow) |
| Plano mensal | `data/stories-schedule.json` (commitado manualmente ao gerar novo mês) |

**Regras de postagem:**
- **3 vídeos das lojas** por dia (rotativos, cooldown 2 dias por vídeo)
- **1.png** sempre fixa (todo dia)
- **Arte rotativa** (2.png, 3.png… em sequência) — todo dia
- **Vídeo de campanha** (Seg/Qua/Sex) — ex: Férias, promoção do mês
- **Vídeo Sazonal** (Ter/Qui/Sáb) — se disponível na pasta Sazonais/BR Pneus
- Peg Pneus: **pausado** (`paused: true` em `cloud-scheduler.js`)

**Fontes de conteúdo (Google Drive):**

| Tipo | Pasta Drive | ID |
|------|-------------|-----|
| Lojas BR | `PASTAS_BR` (5 pastas) | ver `drive-config.js` |
| Artes | `Campanhas/Artes/1080x1920/` | `1zDVSGOj9OOyRTmwH3f2u06CCPJX5pAx9` |
| Vídeos campanha | `Campanhas/Videos/BR Pneus/` | `1DCT88iiD692PDXVaB966nLvUCfkHRXbn` |
| Sazonais | `Videos Sazonais/BR Pneus/` | `1MDS-_yrPOXiNOYewyiXjEOjVhncO2619` |

**Como atualizar o mês:**
```bash
# 1. Atualizar conteúdo no Drive (Campanhas/Artes e Campanhas/Videos/BR Pneus)
# 2. Gerar schedule:
node tools/stories/agendar-mes.js 2026-MM-01
# 3. Commitar e dar push:
git add -f data/stories-schedule.json && git commit -m "chore: schedule stories MM/2026" && git push
```

---

## 5b. Stories Arraia — Campanha Junho 2026 (ENCERRADO)

**O que faz:** Publicou stories da campanha Arraia em sequência para BR Pneus e Peg Pneus. Encerrou em 30/06/2026 — substituído pelo sistema 5c (cloud).

| Campo | Valor |
|-------|-------|
| Script | `tools/stories/arraia-scheduler.js` |
| PM2 | `arraia-scheduler` (ID 2) |
| Horário | Todo dia às **8h30** (após o stories-scheduler das 8h) |
| Estado | `data/arraia-state.json` |
| Encerra | Automaticamente em 01/07/2026 |

**Regras:**
- **Todo dia:** 1 arte PNG em sequência (1.png, 2.png, …) → IG + FB para BR e Peg
- **Seg/Qua/Sex:** 1 vídeo MP4 em sequência → IG + FB para BR e Peg
- Artes são convertidas de PNG para MP4 (7s estático) via ffmpeg antes do upload
- Índices salvos em `data/arraia-state.json` — reinicia do 1 ao esgotar

**Pastas:**

| Conta | Artes | Vídeos |
|-------|-------|--------|
| BR Pneus | `ARRAIA\Artes\BR Pneus 1080x1920\` (9 artes) | `ARRAIA\Videos\BR Pneus\` (3 vídeos) |
| Peg Pneus | `ARRAIA\Artes\Peg Pneus 1080x1920\` (8 artes) | `ARRAIA\Videos\Peg Pneus\` (3 vídeos) |

Base: `C:\Users\Nick\Desktop\Projetos\Artes\#1 Campanhas\Junho 2026\`

**Como rodar manualmente:**
```bash
node tools/stories/arraia-scheduler.js --agora
```

> ⚠️ **BR Pneus** com token bloqueado (01/06/2026): login em facebook.com necessário + `node tools/renovar-tokens-paginas.js`

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
server-artes       (ID 2) → servidor de artes NexusZ, porta 3098
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

**Lojas coletadas (4 lojas ativas — jul/2026):**

| Chave | Label OI |
|-------|----------|
| BR1 | BR01 CENTRO |
| BR3 | BR03 AMERICANA |
| BR4 | BR04 SAO CARLOS |
| PEG1 | PEG11 ARARAQUARA |

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

## 12b. Coleta Social Video (TikTok + YouTube) → NexusZ

**O que faz:** Coleta seguidores/inscritos de TikTok (via Apify — `clockworks/tiktok-profile-scraper`) e YouTube (via Google YouTube Data API v3) para BR e Peg. Salva na mesma tabela `social_account_snapshots` com `plataforma = 'tiktok'` e `plataforma = 'youtube'`. Os dados aparecem nos painéis TikTok e YouTube da tela Social Media do NexusZ.

| Campo | Valor |
|-------|-------|
| Script | `tools/coletar-social-video.js` |
| Tabela | `social_account_snapshots` (NexusZ) |
| Agendamento | **GitHub Actions** — **1x/dia às 08h BRT** (seg–sáb) |
| Workflow | `.github/workflows/social-video.yml` |
| Env vars necessárias | `YOUTUBE_API_KEY`, `YOUTUBE_CHANNEL_ID_BR` (opcional), `YOUTUBE_CHANNEL_ID_PEG` (opcional), `APIFY_TOKEN`, `NEXUSZ_SUPABASE_URL`, `NEXUSZ_SUPABASE_SERVICE_ROLE_KEY` |

**Contas coletadas:**

| Chave | TikTok | YouTube handle |
|-------|--------|---------------|
| BR | @brpneusoficina | @brpneusoficina |
| PEG | @pegpneusatacarejooficial | @pegpneusatacarejooficial |

**Como rodar manualmente:**
```bash
node tools/coletar-social-video.js
```

**Regras importantes:**
- **TikTok usa créditos Apify** — NÃO chamar via botão "Atualizar agora" no NexusZ (apenas 1x/dia via GitHub Actions). O botão de refresh na UI só dispara IG/FB.
- YouTube API tem cota de 10.000 unidades/dia; uma consulta = 1 unidade — sem risco de esgotar.
- Apify usa run síncrono (`run-sync-get-dataset-items`) — aguarda até 120s.
- Upsert por `(conta_key, plataforma, data)` — um snapshot por plataforma por dia.
- Se `YOUTUBE_CHANNEL_ID_*` não estiver no `.env`, usa handle `@brpneusoficina` / `@pegpneusatacarejooficial` diretamente.

**Setup inicial (fazer uma vez):**
1. Google Cloud → Criar projeto → Ativar "YouTube Data API v3" → Criar API Key → salvar em `YOUTUBE_API_KEY`
2. Criar conta em apify.com (plano free) → Settings → Integrations → API Token → salvar em `APIFY_TOKEN`
3. Adicionar `YOUTUBE_API_KEY` e `APIFY_TOKEN` como GitHub Secrets no repositório

---

## 13. Monitor ADS → NexusZ (Dashboard Horário)

**O que faz:** Coleta saldo, spend e métricas de performance (CTR, CPC, impressões, cliques, conversões) de todas as contas Meta Ads e Google Ads e salva snapshots em `ads_snapshots` no Supabase. **Também detecta e registra recargas automaticamente** em `ads_recargas`, eliminando a necessidade de entrada manual.

| Campo | Valor |
|-------|-------|
| Script | `tools/coletar-ads-supabase.js` |
| Tabelas | `ads_snapshots` + `ads_recargas` (NexusZ) |
| Agendamento | **GitHub Actions** — toda hora das **08h às 19h BRT** (seg–sáb) |
| Workflow | `.github/workflows/ads-monitor.yml` |
| Env vars necessárias | `META_ACCESS_TOKEN_BR`, `META_ACCESS_TOKEN_PEG`, `META_ACCOUNT_BR_*` (4), `META_ACCOUNT_PEG_*` (2), `GOOGLE_ADS_*` (5 vars), `GOOGLE_ACCOUNT_BR_*` (4), `GOOGLE_ACCOUNT_PEG_*` (2), `NEXUSZ_SUPABASE_URL`, `NEXUSZ_SUPABASE_SERVICE_ROLE_KEY` |

**Contas monitoradas (8 total — jul/2026):**
- Meta Ads: BR Pneus Americana, São Carlos, Araraquara + Peg Pneus Araraquara
- Google Ads: BR Pneus Americana, Araraquara, São Carlos + Peg Pneus Araraquara

**⚠️ REGRA CRÍTICA META:** BR Pneus Araraquara → Pix nos **FUNDOS**. Todas as outras 5 contas Meta → Pix no **SALDO**.

**Thresholds de alerta:**
- Meta: saldo < R$100 🔴 / < R$200 🟠 | CTR < 0,5% 🔴 / < 1% 🟡
- Google: saldo < R$50 🔴 / < R$100 🟠 | CTR < 1% 🔴 / < 2% 🟠 | CPC > R$10 🔴 / > R$5 🟠

**Como rodar manualmente:**
```bash
npm run ads:supabase             # Meta + Google + recargas
npm run ads:supabase:meta        # só Meta
npm run ads:supabase:google      # só Google
node tools/coletar-ads-supabase.js --recargas  # só recargas (Meta + Google)
```

**Detecção automática de recargas:**
- **Google Ads:** usa `account_budget_proposal` — cada aumento no `proposed_spending_limit_micros` equivale a uma recarga Pix; o ID da proposta (`proposal_XXXX`) é salvo em `descricao` para dedup perfeito. Data e valor individuais por pagamento. Histórico completo desde a criação da conta.
- **Meta Ads — TODAS as contas:** compara `balance + amount_spent` (total efetivo depositado, em centavos) com soma armazenada em `ads_recargas`; delta = nova recarga. Funciona para contas "fundos" (incluindo BR Araraquara onde `spend_cap = 0`) e "saldo".
- **Limitação Meta:** o endpoint `/transactions` retorna erro de permissão — não é possível obter transações individuais. O delta captura o valor correto mas a **data registrada é a hora da detecção** (± 1h do cron), não a data exata do Pix. Na primeira execução, todo o histórico acumulado vira um único registro.
- **Atenção São Carlos e Peg Sorocaba:** versão anterior usava `spend_cap` que pode divergir ~R$128 de `balance + amount_spent`. Essas contas não registram novas recargas até o total real superar o valor armazenado.

**Visualização no NexusZ:**
- Menu: ADS (ícone raio ⚡)
- Rota: `/admin/ads`
- Componente: `NexusZ/src/pages/admin/AdminAds.tsx`
- Cards por conta com Meta + Google lado a lado; semáforo de status; totais consolidados; seção de recargas com filtro por período; refetch automático a cada hora
- **Entrada manual removida** — recargas são coletadas exclusivamente de forma automática

---

---

## 14. Sistema de Notificações de Automações

**O que faz:** A cada início ou conclusão de automação, envia uma mensagem no grupo de automações com o status de **todas** as automações do dia em uma lista unificada.

| Campo | Valor |
|-------|-------|
| Script | `tools/notificar-automacao.js` |
| Estado | `data/automacao-status.json` (reset automático à meia-noite) |
| Destino | `WHATSAPP_GRUPO_AUTOMACAO_ID` (grupo Automações) |
| Endpoint | POST `localhost:3099/send` (bot precisa estar online) |

**Uso:**
```bash
node tools/notificar-automacao.js --nome "Vendas Diárias" --status inicio
node tools/notificar-automacao.js --nome "OI Colaboradores" --status fim
node tools/notificar-automacao.js --nome "Monitor ADS" --status erro --detalhe "token expirado"
node tools/notificar-automacao.js --nome "Social Media" --status inicio --silencioso
```

**Flag `--silencioso`:** Atualiza o arquivo de status mas **não envia WA** — usado em automações horárias (ADS, Social Media, Leads Hoje) para evitar spam. Erros sempre notificam, independente do flag.

**Automações com notificação:**

| Automação | Notifica | Workflow/Script |
|-----------|----------|----------------|
| Stories | Início + Fim | `story-scheduler.js` (PM2) |
| OI Colaboradores | Início + Fim | `oi-colaboradores.yml` |
| OI Retroativo Semana | Início + Fim | `oi-colaboradores.yml` (apenas Domingo) |
| Monitor ADS | Silencioso + Erro | `ads-monitor.yml` |
| Social Media | Silencioso + Erro | `social-media.yml` |
| Leads Hoje | Silencioso + Erro | `leads-hoje.js` (PM2) |
| Leads Planilha | Início + Fim | `relatorio-leads.yml` |
| Vendas Diárias | Início + Fim | `vendas-diarias.yml` |

**Mensagem gerada:**
```
🤖 Automações — terça-feira, 12/05/2026

✅ Stories — concluído às 08:12 (10min)
🔄 OI Colaboradores — em andamento desde 08:00
⏳ OI Retroativo Semana — aguardando (Domingo 08h)
✅ Monitor ADS — concluído às 08:05
✅ Social Media — concluído às 08:07
⏳ Leads Hoje — aguardando (07h–18h/hora)
⏳ Leads Planilha — aguardando (18h diário)
⏳ Vendas Diárias — aguardando (20h seg–sáb)
```

---

## 15. Retroativo Semanal OI Colaboradores (Domingo)

**O que faz:** Todo Domingo, após a coleta normal do mês atual, recoleta a semana passada (Segunda → Sábado) para confirmar e corrigir valores de colaboradores.

| Campo | Valor |
|-------|-------|
| Workflow | `.github/workflows/oi-colaboradores.yml` (step "Retroativo da semana") |
| Horário | Todo Domingo às **8h BRT** (junto com coleta normal) |
| Período | Segunda a Sábado da semana anterior |
| Script | `tools/scraper-oi-colaboradores.js --data-inicio DD/MM/YYYY --data-fim DD/MM/YYYY` |

> **Mudança mai/2026:** substituiu a recoleta do mês anterior (lenta, ~3h) pela recoleta da semana (rápida, ~20min) — objetivo é confirmar consistência dos dados recentes, não histórico completo.

---

---

## 16. Relatório Mensal — Planilha Google Sheets

**O que faz:** No dia 1 de cada mês, gera o relatório completo do mês anterior na planilha de leads. Lê tickets do Deskrio (BR Pneus + Peg Pneus), consolida por loja e por atendente, e escreve/formata a aba do mês na planilha.

| Campo | Valor |
|-------|-------|
| Script | `tools/relatorio-mensal-sheets.js` |
| Workflow | `.github/workflows/relatorio-mensal.yml` |
| Agendamento | **Dia 1 de cada mês às 07h BRT** (10h UTC) |
| Planilha | `1so_-C0e_awN9vlXVueViIjgijNEYks7DIwkBbUPd0vw` |

**Como rodar manualmente:**
```bash
node tools/relatorio-mensal-sheets.js          # mês atual
node tools/relatorio-mensal-sheets.js 4 2026   # mês/ano específico
```

**Dispatch manual (GitHub Actions):** Informar `mes` e `ano` opcionais. Se omitidos, usa o mês anterior.

**Secrets necessários:** `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_SHEETS_SPREADSHEET_ID`, `DESKRIO_API_TOKEN_BR`, `DESKRIO_API_TOKEN_PEG`, `DESKRIO_INSTANCE_BR`, `DESKRIO_INSTANCE_PEG`.

---

---

## 17. Geração de Artes de Colaboradores (sob demanda)

**O que faz:** Gera arte PNG personalizada para um colaborador (aniversário ou boas-vindas), faz upload para o Google Drive e salva o registro no Supabase. Acionado pelo menu "Artes Colaboradores" no NexusZ.

> **⚠️ Migrado para Supabase Edge Function em 2026-06-17.** O servidor PM2 `server-artes` (porta 3098) não é mais necessário para o NexusZ — a geração roda 100% na nuvem, sem dependência do computador local.

| Campo | Valor |
|-------|-------|
| **Edge Function** | `gerar-arte-colaborador` (Supabase) |
| Função (NexusZ) | `supabase/functions/gerar-arte-colaborador/index.ts` |
| Templates | Supabase Storage bucket `artes-templates` (6 PNGs) |
| Renderização | `@resvg/resvg-wasm` (SVG → PNG, sem sharp) |
| Tabela Supabase | `artes_colaboradores` |
| Acionamento | Sob demanda via NexusZ → /admin/artes |
| Tempo estimado | ~5-15s (síncrono, sem fila) |
| Scripts legados | `tools/gerar-arte-colaborador.js`, `tools/server-artes.js` (mantidos para uso CLI/bot WA) |

**Tipos disponíveis:** `aniversario` · `boasvinda`

**Modos de operação:**
- **Modo manual (padrão no NexusZ):** formulário com nome, cargo, loja e upload de foto — sem necessidade de colaborador cadastrado no RH
- **Modo colaborador:** body com `colaborador_id` → busca dados no Supabase automaticamente

**Como a geração funciona (edge function):**
1. Templates PNG são carregados do Supabase Storage (cache na memória do container)
2. A composição (template + foto + texto) é feita em SVG com clipPath para corte circular
3. `@resvg/resvg-wasm` renderiza o SVG para PNG
4. PNG enviado ao Google Drive via REST API + JWT da Service Account
5. Registro salvo em `artes_colaboradores`

**Secrets do Supabase necessários:**
- `GOOGLE_SERVICE_ACCOUNT_JSON` — JSON da Service Account (base64 ou raw JSON)
- `GOOGLE_DRIVE_ARTES_FOLDER_ID` — ID da pasta raiz no Drive (atualmente: `0ADYbsWZxLsqzUk9PVA`)
- `NEXUSZ_SUPABASE_URL` e `NEXUSZ_SUPABASE_SERVICE_ROLE_KEY` (já configurados)

**Para re-fazer upload dos templates no Storage:**
```bash
node tools/setup-artes-storage.js
```

**Bot WhatsApp / CLI:** Continua usando `tools/server-artes.js` + PM2 localmente se necessário para automações não-web.

**Detecção de duplicatas:** NexusZ verifica `artes_colaboradores` por nome + tipo antes de gerar — exibe thumb + link de download caso já exista, com botão "Gerar mesmo assim".

**Acesso público:** Cada arquivo enviado ao Drive recebe permissão pública de leitura automaticamente, para que o thumbnail apareça no NexusZ.

---

---

## 18. Vendas de Pneus — Coleta Horária

**O que faz:** Coleta vendas de pneus por item (grupo/descrição/medida/marca) via API OI (`OrdemDeServicoJSON`) para todas as 7 lojas e grava na tabela `vendas_pneus` do Supabase.

| Campo | Valor |
|-------|-------|
| Script | `tools/coletar-vendas-pneus.js` |
| Tabela Supabase | `vendas_pneus` (NexusZ) |
| Agendamento | **GitHub Actions** — **a cada 10 min** das **07h–19h BRT** (seg–sáb) + coleta hoje+ontem |
| Workflow | `.github/workflows/vendas-auto-update.yml` |
| Retroativo | `.github/workflows/collect-vendas-retroativo-range.yml` |
| Manual (botão NexusZ) | Edge Function `trigger-vendas-sync` → `collect-vendas-manual.yml` |

**Lojas coletadas:** BR01, BR03, BR04, PEG1 (4 lojas ativas — BR02, BR05, SOR1 encerradas)

**Como rodar retroativo:**
```bash
gh workflow run collect-vendas-retroativo-range.yml --field data_inicio=2026-06-01 --field data_fim=2026-06-30
```

**Visualização no NexusZ:** Menu "Vendas de Pneus" — tabelas Sintética/Intermediária/Analítica, gráficos, cards de metas/previsões por grupo.

---

## 5. Stories Automáticos — MIGRADO PARA GITHUB ACTIONS (01/06/2026)

**⚠️ PM2 `stories-scheduler` e `arraia-scheduler` foram REMOVIDOS em 01/06/2026.**
Ambos agora rodam via GitHub Actions sem precisar do PC ligado.

| Campo | Valor |
|-------|-------|
| Script cloud | `tools/stories/cloud-scheduler.js` |
| Workflow | `.github/workflows/stories-diarios.yml` |
| Horário | Todo dia às **8h BRT** (seg–sáb) |
| Estado/fila | `data/stories-cloud-state.json` (commitado no repo) |
| Vídeos | Google Drive — Service Account `br-pneus-sheets@claude-code-493711.iam.gserviceaccount.com` |

**O que posta por dia (campanha Julho/Férias 2026):**
- **Todo dia:** 3 vídeos aleatórios das lojas (BR Pneus) — cooldown 2 dias por vídeo
- **Todo dia:** Arte fixa 1.png + arte rotativa (2.png, 3.png…) da campanha Férias — IG + FB
- **Seg/Qua/Sex:** Vídeo de campanha Férias em sequência — IG + FB
- **Ter/Qui/Sáb:** Vídeo Sazonal BR em sequência — IG + FB
- **Peg Pneus:** pausado (`paused: true` em `cloud-scheduler.js`)

**Pastas no Google Drive** (ID raiz: `19Xou0JBmu_U6yjR1C7Lz8nO-mp5mkLeI`):

| Conta | Pasta | Conteúdo |
|-------|-------|----------|
| BR Pneus | `Conteudo das lojas/` (5 sub-pastas) | Vídeos regulares das lojas |
| Peg Pneus | `Conteudo das lojas/` (2 sub-pastas) + `Sazonais Peg/` | Vídeos regulares + sazonal |
| BR Pneus | `ARRAIA/Artes/BR Pneus 1080x1920/` | 9 artes PNG campanha |
| Peg Pneus | `ARRAIA/Artes/Peg Pneus 1080x1920/` | 8 artes PNG campanha |
| BR Pneus | `ARRAIA/Videos/BR Pneus/` | 3 vídeos MP4 (ig_* = versão IG) |
| Peg Pneus | `ARRAIA/Videos/Peg Pneus/` | 3 vídeos MP4 |
| BR Pneus | `Videos Sazonais/BR Pneus/` | 3 vídeos sazonais |

**Adicionar vídeo novo:** só colocar na pasta certa do Drive — detectado automaticamente na próxima execução.

**Renovar tokens Meta:**
```bash
node tools/renovar-tokens-paginas.js   # renova BR + Peg usando app Claude Code Peg Pneus
node tools/renovar-token-fb-br.js TOKEN  # renovar só BR (precisa token do app 973912085565078)
```
- **App BR Pneus:** `973912085565078` (usa app Peg `1702717160858852` para autenticar)
- **App Peg Pneus:** `1702717160858852` (Claude Code Peg Pneus)
- **Importante:** usuário da BR deve gerar token no Explorer usando o app **Claude Code Peg Pneus**

**PC necessário:** ❌ Não (GitHub Actions)

---

## 19. Estoque de Pneus — Coleta Horária (EM DESENVOLVIMENTO)

**O que faz:** Coleta estoque atual de pneus (descrição, grupo, quantidade, custo) via scraping HTTP do OI para todas as lojas e grava na tabela `estoque_pneus` do Supabase.

| Campo | Valor |
|-------|-------|
| Script | `tools/coletar-estoque-pneus.js` |
| Tabela Supabase | `estoque_pneus` (NexusZ) |
| Agendamento | **GitHub Actions** — **a cada 10 min** das **07h–19h BRT** (seg–sáb) |
| Workflow | `.github/workflows/estoque-pneus.yml` |
| Manual (botão NexusZ) | Edge Function `trigger-estoque-sync` |
| PC necessário | ❌ Não (HTTP puro — sem Puppeteer) |

**Estratégia técnica:**
- Login via HTTP POST com cookies ASP.NET (sem browser — contorna bloqueio de IP do GitHub Actions)
- Navega para `wfProdutoBusca.aspx` com filtros por grupo + "Com estoque"
- Para cada produto: chama `ProdutoJSON` API para obter R$ Custo
- Lojas: BR01, BR02, BR03, BR04, BR05, PEG1 (sem SOR1)

**Dados coletados por produto:** descrição, grupo, quantidade em estoque, R$ Custo

**Visualização no NexusZ:** Menu "Estoque de Pneus" — tabela por grupo, cards por loja, busca, barra de progresso em tempo real ao atualizar.

> ⚠️ **Status em 01/06/2026:** Script em desenvolvimento — login HTTP confirmado (302 OK), navegação para página de produtos sendo finalizada.

---

---

## 20. Agendamento de Posts — Instagram/Facebook/YouTube/TikTok (Supabase)

**O que faz:** Permite programar posts para Instagram, Facebook, YouTube e **TikTok** com até ~1 minuto de precisão. O pg_cron dispara a cada minuto e chama a Edge Function que publica todos os posts com `agendado_para <= now()` e `status = pendente`. Suporta publicar agora, salvar como rascunho ou agendar.

| Campo | Valor |
|-------|-------|
| Tabela Supabase | `scheduled_posts` (NexusZ — projeto `ubiuershczqjnoczcupa`) |
| Edge Function | `publish-scheduled-posts` **v20** (Deno, `verify_jwt: true`) |
| pg_cron job | `publish-scheduled-posts` — `* * * * *` (todo minuto) |
| UI no NexusZ | Menu **Marketing > Agendamento** → `/admin/agendamento` |
| PC necessário | ❌ Não (100% Supabase) |

**Contas suportadas:**

| conta_key | Plataformas |
|-----------|-------------|
| `BR` | Instagram + Facebook (BR Pneus) + YouTube + TikTok |
| `PEG_ARQ` | Instagram + Facebook (Peg Pneus Araraquara) + YouTube + TikTok |

**Credenciais necessárias (Supabase Edge Function Secrets):**
- Meta: `META_IG_ID_BR`, `META_PAGE_ID_BR`, `META_PAGE_TOKEN_BR` + `_PEG_ARQ`
- YouTube: `YOUTUBE_CLIENT_ID_BR`, `YOUTUBE_CLIENT_SECRET_BR`, `YOUTUBE_REFRESH_TOKEN_BR`, `YOUTUBE_CHANNEL_ID_BR` + `_PEG_ARQ`
- TikTok: `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REDIRECT_URI` (padrão: `https://nexusz.app.br/tiktok-callback`)

**Configurar no Dashboard Supabase:**
> Project → Edge Functions → publish-scheduled-posts → Secrets → Add cada variável acima

**TikTok OAuth — Tabela `social_tokens`:**
- Tokens OAuth do TikTok são armazenados na tabela `social_tokens` (conta_key + platform)
- Conexão feita via NexusZ → Agendamento → Novo Post → selecionar TikTok → "Conectar conta TikTok"
- Edge function `tiktok-oauth-init` (v1, verify_jwt: true) — gera URL de autorização
- Edge function `tiktok-oauth-callback` (v1, verify_jwt: false) — troca code por token e salva
- Callback URL registrada no TikTok Developer Portal: `https://nexusz.app.br/tiktok-callback`
- Token é renovado automaticamente na publicação (refresh_token com validade maior)
- DNS TXT de verificação: `tiktok-developers-site-verification=Wzt3FmIHMwc4Oo7HYGVxIs0M6pDzTF6p` no domínio raiz `nexusz.app.br`

**Tipos de conteúdo:**

| Tipo | Instagram | Facebook | YouTube | TikTok |
|------|-----------|----------|---------|--------|
| `IMAGE` | foto + user_tags + collaborators + location | foto | — | — |
| `VIDEO` | reel (poll até FINISHED) + collaborators + location | vídeo | vídeo | ✅ via PULL_FROM_URL |
| `SHORT` | — | — | YouTube Short (adiciona #Shorts) | — |
| `STORY` | story + link CTA | story + link | — | — |
| `CAROUSEL` | múltiplos containers → carrossel | attached_media | — | — |

**Recursos avançados:**
- **Localização:** nome do local → busca automática via API IG/FB → salva `location_id`
- **Tags de usuário:** `user_tags = "@user1, @user2"` → posicionados ao centro (x:0.5, y:0.5)
- **Colaboradores (collab):** `collaborators = "@conta"` → Instagram collab post
- **Link CTA story:** `link_url` → adicionado como link swipe-up no story
- **Primeiro comentário:** texto postado automaticamente após publicação (Meta apenas)
- **Publicar agora:** `agendado_para = now()`, `status = pendente` (processa no próximo cron)
- **Rascunho:** `status = rascunho` → não publicado até ser alterado para `pendente`

**Status do post:**
- `rascunho` → salvo, não agendado
- `pendente` → agendado, aguardando execução
- `publicando` → processamento em andamento (vídeos: aguardando encoding Meta)
- `publicado` → publicado com sucesso
- `erro` → falhou (mensagem em `erro_msg`)
- `cancelado` → cancelado pelo usuário

**Upload direto para Google Drive (v3):** Na tela de novo post, cada campo de mídia (vídeo/imagem principal, imagens do carrossel, capa/thumbnail) possui um botão **"Drive"**. Ao clicar, o usuário seleciona o arquivo localmente e ele é enviado ao Google Drive via edge function `upload-to-drive`. A URL pública (`drive.google.com/uc?id=...`) é preenchida automaticamente no campo — não é necessário copiar e colar link manualmente. Ainda é possível colar URLs externas normalmente.

**Regra importante:** A URL da mídia deve ser pública e permanente. O botão Drive faz isso automaticamente (permissão `reader: anyone`). Se usar URL externa, certifique-se de que é pública e permanente.

---

---

## 21. CRM WhatsApp — NexusZ (UazAPI free)

**O que faz:** Sistema de CRM para atendimento via WhatsApp integrado ao NexusZ. Recebe mensagens de clientes via webhook UazAPI, salva toda a conversa no Supabase e permite que a equipe responda diretamente pelo NexusZ. Toda mídia (áudio, imagem, vídeo, documento) — tanto recebida quanto enviada — é salva no Google Drive compartilhado do NexusZ.

| Campo | Valor |
|-------|-------|
| Instância UazAPI | `peg-araraquara` em `https://free.uazapi.com` |
| Token instância | `f8937fb2-3b88-4e26-83b2-3d2586eeef1c` (salvo no `.env` do NexusZ) |
| Webhook | Edge Function `crm-webhook-uazapi` (v10, `verify_jwt: false`) |
| Envio de mensagens | Edge Function `crm-send-message` (v2) |
| Upload de mídia | Edge Function `crm-upload-drive` (v1) |
| Tabelas Supabase | `crm_contatos`, `crm_conversas`, `crm_mensagens`, `crm_integracoes`, `crm_webhook_debug` |
| UI NexusZ | Menu CRM → `/crm` |
| PC necessário | ❌ Não |

**Fluxo de mensagem recebida:**
1. UazAPI envia webhook → `crm-webhook-uazapi`
2. Contato é criado/atualizado em `crm_contatos` (foto de perfil salva)
3. Conversa é criada/aberta em `crm_conversas`
4. Se for mídia: baixa do UazAPI → faz upload para Drive via `crm-upload-drive` → salva URL em `midia_url`
5. Mensagem salva em `crm_mensagens`
6. NexusZ atualiza em tempo real via realtime + polling 4s (mensagens) e 5s (conversas)

**Fluxo de envio:**
1. Usuário digita no NexusZ e clica enviar
2. Mensagem salva otimisticamente no Supabase
3. `crm-send-message` chama API UazAPI server-side (sem CORS)
4. Para mídia: upload para Drive via `crm-upload-drive` primeiro, depois envia URL para UazAPI

**Mídia no Google Drive:**
- Estrutura: `CRM WhatsApp / Recebidos|Enviados / YYYY-MM / [nome do contato]`
- Drive compartilhado: raiz `0ADYbsWZxLsqzUk9PVA`
- Auth: `FIREBASE_SERVICE_ACCOUNT` (mesmo da edge function `upload-to-drive`)
- Renderização: imagens via `uc?id=`, áudio/vídeo via `<iframe .../preview>` (player Google)

**Regra importante:** Só cria contato/conversa se o chatid **não** for grupo (`@g.us`) e tiver número de telefone válido.

**Formato webhook UazAPI free (confirmado):**
- `body.EventType` = `"messages"` | `"messages_update"` | `"connection"`
- `body.message.type` = `"text"` | `"media"`
- `body.message.mediaType` = `"ptt"` | `"image"` | `"video"` | `"document"` | `""`
- `body.message.content` = string (texto) ou objeto com `.URL`, `.mimetype`, `.mediaKey`
- Download de mídia: `POST /message/downloadMedia/{instance}?token={token}` com `{ messageid, chatid }`

---

---

## 22. CRM Aniversariantes e Reativação (GitHub Actions)

**O que faz:** Coleta dados de clientes das OS do OI, popula uma base dedupada (`clientes_oi`) no Supabase e envia diariamente via WhatsApp (UazAPI cloud) os aniversariantes do dia + clientes que completam 3, 6, 9 ou 12 meses sem comprar.

### Workflow diário
| Campo | Valor |
|-------|-------|
| Arquivo | `.github/workflows/crm-clientes-diario.yml` |
| Horário | **8h BRT** (11h UTC), segunda a sábado |
| Passo 1 | `node tools/coletar-clientes-oi.js` — coleta OS de hoje → upsert em `clientes_oi` |
| Passo 2 | `node tools/aniversariantes-crm.js` — consulta BD → envia relatório WA |
| Timeout | 10 min |

### Workflow retroativo (disparo manual)
| Campo | Valor |
|-------|-------|
| Arquivo | `.github/workflows/crm-clientes-retroativo.yml` |
| Quando rodar | Actions → "CRM Clientes — Retroativo (backfill histórico)" → Run workflow |
| Inputs | `dias` (padrão 90, máx recomendado 90 por execução), `data_inicio`, `data_fim` |
| Timeout | 30 min |
| Uso | Backfill do histórico anual: rodar 4× para cobrir 12 meses (3 meses por vez) |

### Scripts
| Script | Função |
|--------|--------|
| `tools/coletar-clientes-oi.js` | Lê `OrdemDeServicoJSON` de 4 lojas por data, extrai nome/celular/CPF/nascimento, upsert com MAX(ultima_compra) e MIN(primeira_compra) |
| `tools/aniversariantes-crm.js` | Consulta `clientes_oi` e envia WA via UazAPI free (cloud, sem PC) |

### Tabela Supabase
```sql
-- Executar via Supabase Dashboard → SQL Editor (NexusZ project)
-- Arquivo: supabase/migrations/create_clientes_oi.sql
```
Campos: `chave` (PK, ex: `cpf:12345678900` ou `tel:16991234567`), `nome`, `celular`, `cpf_cnpj`, `data_nascimento`, `ultima_compra`, `primeira_compra`, `ultima_loja`.

### Secrets necessários no GitHub
| Secret | Descrição |
|--------|-----------|
| `UAZAPI_TOKEN` | Token da instância UazAPI |
| `UAZAPI_INSTANCE` | Nome da instância (valor: `peg-araraquara`) |
| `WHATSAPP_GRUPO_CRM_ID` | ID do grupo WA que recebe o relatório CRM (formato `1203...@g.us`) |

Janela de reativação: ±7 dias em torno de cada marco (90/180/270/365 dias).

## 23. BI Aniversariantes OI — Puppeteer (Local)

**O que faz:** Acessa o BI CRM do Oficina Inteligente via Puppeteer (headless Chrome), aplica o filtro "Dia/Mês do Aniversário" para o dia atual em cada loja ativa, baixa o Excel gerado pelo sistema e envia o relatório pelo bot do WhatsApp para o grupo de automações.

| Campo | Valor |
|-------|-------|
| Script | `tools/bi-aniversariantes-oi.js` |
| Execução | Manual ou via Task Scheduler local |
| Dependências | `puppeteer`, `xlsx` (SheetJS), bot WA em `localhost:3099` |
| Lojas | BR01 (469), BR03 (2202), BR04 (1524), PEG1 (3098) |

**Variáveis de ambiente (`.env`):**
- `OI_EMAIL` / `OI_SENHA` — credenciais do OI
- `WHATSAPP_GRUPO_AUTOMACAO_ID` — grupo de destino

**Como rodar:**
```bash
node tools/bi-aniversariantes-oi.js            # aniversariantes de hoje
node tools/bi-aniversariantes-oi.js --dia=13 --mes=7   # data específica
```

**Fluxo por loja:**
1. Login no OI → navega para `wfCRMBI.aspx`
2. Seleciona loja em `#ctl00_cph_ddlUsuarioEmpresa` (AutoPostBack → `waitForNavigation`)
3. Marca "Somente com Venda" → clica "Carregar Base" (aguarda navegação até 3 min)
4. Seleciona filtro `Dia/Mês do Aniversário` → aguarda AJAX (2,5s) → preenche dia/mês via `page.type()`
5. Clica "Incluir Filtro" → aguarda navegação; fallback: poll até o contador `TotalFiltrado` mudar (até 60s)
6. Reconfigura CDP download → clica "Gerar Excel" via `page.evaluate` (evita "not clickable")
7. Poll 60s por `CRMExcel.xls` na pasta `output/debug-bi/` (sem `.crdownload` = download completo)
8. Renomeia → parseia com SheetJS (suporta BIFF8 nativo) → extrai nome + telefone SMS → monta relatório

**Observações técnicas:**
- NÃO roda no GitHub Actions (precisa do PC local + bot WA em localhost:3099)
- `protocolTimeout: 120000` — evita timeouts em páginas ASP.NET lentas
- Troca de loja usa `waitForNavigation` (AutoPostBack = reload completo, não AJAX)
- Após "Incluir Filtro" para lojas grandes (BR01=15k, BR04=16k): OI usa UpdatePanel AJAX lento; poll do contador garante espera correta
- SheetJS (xlsx) parseia BIFF8 — ExcelJS NÃO suporta `.xls` binário
- Coluna "Telefone SMS" (índice 10) contém o celular preferencial no relatório OI
- Debug: screenshots em `output/debug-bi/`, arquivos Excel em `output/debug-bi/aniv-{LOJA}-{ts}.xls`

---

*Última atualização: 13/07/2026 — Seção 23 validada: 130 aniversariantes extraídos em teste (BR01=37, BR03=33, BR04=51, PEG1=9); relatório enviado ao WA com sucesso. SheetJS substituiu ExcelJS; waitForNavigation na troca de loja.*
