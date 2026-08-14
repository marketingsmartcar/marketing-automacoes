// PM2 Ecosystem — Marketing Automações
// Substitui o GitHub Actions enquanto a conta está suspensa.
// Todos os horários usam o timezone do sistema (Windows BRT = UTC-3).
//
// INICIAR TUDO:    pm2 start ecosystem.config.js
// PARAR TUDO:      pm2 stop all
// STATUS:          pm2 ls
// LOGS:            pm2 logs [nome]
// SALVAR:          pm2 save && pm2 startup
//
// GRUPOS:
//   A) API-only (sem Puppeteer) — podem virar Edge Functions futuramente
//   B) Puppeteer — devem ficar local
//   C) Utilitários

const CWD = 'C:\\Users\\Nick\\Downloads\\Marketing';

module.exports = {
  apps: [

    // ═══════════════════════════════════════════════════════
    // A) API-ONLY — não dependem de browser
    // ═══════════════════════════════════════════════════════

    {
      // Ads Monitor: Meta + Google Ads → Supabase, a cada 15 min 24/7
      name: 'ads-monitor',
      script: 'tools/coletar-ads-supabase.js',
      cwd: CWD,
      cron_restart: '*/15 * * * *',
      autorestart: false,
      watch: false,
      env_file: '.env',
    },

    {
      // Estoque Pneus: API OI ProdutoXML → Supabase, a cada 10 min seg-sáb 8h-19h
      name: 'estoque-pneus',
      script: 'tools/coletar-estoque-pneus.js',
      cwd: CWD,
      cron_restart: '*/10 8-19 * * 1-6',
      autorestart: false,
      watch: false,
      env_file: '.env',
    },

    {
      // Leads Sync: Deskrio → Supabase, toda hora seg-sáb 7h-18h
      // Consolida: collect-leads + leads-hoje + leads-sync-horario (todos rodam leads-hoje.js --agora)
      name: 'leads-sync',
      script: 'tools/leads-hoje.js',
      args: '--agora',
      cwd: CWD,
      cron_restart: '0 7-18 * * 1-6',
      autorestart: false,
      watch: false,
      env_file: '.env',
    },

    {
      // Social Media: Instagram + Facebook + YouTube → Supabase, toda hora seg-sáb 8h-19h
      name: 'social-media',
      script: 'tools/coletar-social-media.js',
      cwd: CWD,
      cron_restart: '0 8-19 * * 1-6',
      autorestart: false,
      watch: false,
      env_file: '.env',
    },

    {
      // YouTube coleta junto com social-media (deslocado 2 min para não colidir)
      name: 'social-youtube',
      script: 'tools/coletar-youtube.js',
      cwd: CWD,
      cron_restart: '2 8-19 * * 1-6',
      autorestart: false,
      watch: false,
      env_file: '.env',
    },

    {
      // Social Video: YouTube long-form + TikTok (Apify), 1x/dia 8h seg-sáb
      name: 'social-video',
      script: 'tools/coletar-social-video.js',
      cwd: CWD,
      cron_restart: '0 8 * * 1-6',
      autorestart: false,
      watch: false,
      env_file: '.env',
    },

    {
      // Relatório Leads: Deskrio → Google Sheets, toda hora seg-sáb 7h-18h
      name: 'relatorio-leads',
      script: 'tools/relatorio-mensal-sheets.js',
      cwd: CWD,
      cron_restart: '30 7-18 * * 1-6',  // deslocado 30 min do leads-sync
      autorestart: false,
      watch: false,
      env_file: '.env',
    },

    {
      // CRM Clientes passo 1: coleta OS do dia → atualiza clientes_oi
      name: 'crm-coletar',
      script: 'tools/coletar-clientes-oi.js',
      cwd: CWD,
      cron_restart: '0 8 * * 1-6',
      autorestart: false,
      watch: false,
      env_file: '.env',
    },

    {
      // CRM Clientes passo 2: aniversariantes + reativação (5 min após coleta)
      name: 'crm-aniversariantes',
      script: 'tools/aniversariantes-crm.js',
      cwd: CWD,
      cron_restart: '5 8 * * 1-6',
      autorestart: false,
      watch: false,
      env_file: '.env',
    },

    {
      // Verificar Token Google Ads: toda segunda 8h BRT
      // ATENÇÃO: sem GitHub, não abre Issue — apenas loga erro no PM2
      name: 'verificar-token-google',
      script: 'tools/verificar-token-google-ci.js',
      cwd: CWD,
      cron_restart: '0 8 * * 1',
      autorestart: false,
      watch: false,
      env_file: '.env',
    },

    {
      // Stories Diários: BR Pneus + Peg Pneus, seg-sáb 6h BRT
      // PRÉ-REQUISITO: ffmpeg instalado no PATH (choco install ffmpeg)
      // NOTA: sem push para git, estado fica local em data/stories-cloud-state.json
      name: 'stories-diarios',
      script: 'tools/stories/cloud-scheduler.js',
      cwd: CWD,
      cron_restart: '0 6 * * 1-6',
      autorestart: false,
      watch: false,
      env_file: '.env',
    },


    // ═══════════════════════════════════════════════════════
    // B) PUPPETEER — devem ficar local sempre
    // ═══════════════════════════════════════════════════════

    {
      // Avaliações Google: Places API (Puppeteer), seg-sáb 17h BRT
      name: 'avaliacoes-google',
      script: 'tools/coletar-avaliacoes.js',
      cwd: CWD,
      cron_restart: '0 17 * * 1-6',
      autorestart: false,
      watch: false,
      env_file: '.env',
    },

    {
      // Vendas Diárias: scraper OI → Supabase, seg-sáb 20h BRT
      name: 'vendas-diarias',
      script: 'tools/coletar-vendas-diarias.js',
      cwd: CWD,
      cron_restart: '0 20 * * 1-6',
      autorestart: false,
      watch: false,
      env_file: '.env',
    },

    {
      // OS Detalhadas (noturno): coleta detalhes + pagamentos do dia, seg-sáb 9h BRT
      name: 'coleta-os-detalhadas',
      script: 'tools/coletar-os-detalhadas.js',
      cwd: CWD,
      cron_restart: '0 9 * * 1-6',
      autorestart: false,
      watch: false,
      env_file: '.env',
    },

    {
      // OS Periódica: atualiza OS do dia a cada 30 min, seg-sáb 8h-18h
      name: 'coleta-os-periodica',
      script: 'tools/coletar-os-detalhadas.js',
      args: '--date today',  // script calcula hoje em BRT
      cwd: CWD,
      cron_restart: '*/30 8-18 * * 1-6',
      autorestart: false,
      watch: false,
      env_file: '.env',
    },

    {
      // OI Colaboradores: scraper OI → Supabase, todo dia 8h BRT
      // Domingos: roda retroativo da semana automaticamente (lógica dentro do script)
      name: 'oi-colaboradores',
      script: 'tools/scraper-oi-colaboradores.js',
      cwd: CWD,
      cron_restart: '0 8 * * *',
      autorestart: false,
      watch: false,
      env_file: '.env',
    },

    {
      // Sync RH Colaboradores: OI → NexusZ a cada 5 min, 24/7
      name: 'sync-rh-colaboradores',
      script: 'tools/sync-cadastro-funcionarios-oi.js',
      cwd: CWD,
      cron_restart: '*/5 * * * *',
      autorestart: false,
      watch: false,
      env_file: '.env',
    },

    {
      // Comparativo Preços: Puppeteer → Google Sheets, toda segunda 8:30h BRT
      name: 'comparativo-precos',
      script: 'tools/comparar-precos-pneustore.js',
      cwd: CWD,
      cron_restart: '30 8 * * 1',
      autorestart: false,
      watch: false,
      env_file: '.env',
    },

  ],
};
