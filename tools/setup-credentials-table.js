'use strict';
require('dotenv').config();

const URL = process.env.NEXUSZ_SUPABASE_URL;
const KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY;

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
};

// Criar tabela via RPC exec_sql (ou direto se já existir)
async function criarTabela() {
  const sql = `
    create table if not exists public.admin_credentials (
      id         uuid primary key default gen_random_uuid(),
      descricao  text not null,
      email      text,
      usuario    text,
      senha      text,
      info       text,
      link       text,
      ordem      integer default 0,
      created_at timestamptz default now()
    );
    alter table public.admin_credentials enable row level security;
    do $$ begin
      if not exists (
        select 1 from pg_policies
        where tablename = 'admin_credentials' and policyname = 'Admin full access'
      ) then
        create policy "Admin full access"
          on public.admin_credentials for all
          using (true) with check (true);
      end if;
    end $$;
  `;
  const res = await fetch(`${URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sql }),
  });
  if (!res.ok) {
    // Tentar via pg endpoint
    console.log('  RPC exec_sql não disponível, tentando via query direta...');
    return false;
  }
  return true;
}

const DADOS = [
  // Lojas — Sites
  { descricao: 'Loja 4 — Site',               usuario: 'brpneussaocarlos.com.br',  senha: '(16) 3376-0011',            info: 'Lojas — Sites',   ordem: 10 },
  { descricao: 'Loja 5 — Site',               usuario: 'brpneusmaringa.com.br',    senha: '(44) 3142-2525',            info: 'Lojas — Sites',   ordem: 11 },
  { descricao: 'Loja 6 — Site',               usuario: 'brpneusjau.com.br',        senha: '(14) 3141-0341',            info: 'Lojas — Sites',   ordem: 12 },
  { descricao: 'Loja 7 — Site',               usuario: 'brpneussorocaba.com.br',   senha: '(15) 3199-3808',            info: 'Lojas — Sites',   ordem: 13 },
  { descricao: 'Loja 8 — Site',               usuario: 'brpneusibitinga.com.br',   senha: '(16) 3503-2501',            info: 'Lojas — Sites',   ordem: 14 },
  { descricao: 'Peg Pneus Araraquara — Site', usuario: 'pegpneusatarecejo.com',    senha: '0800 000 4494',             info: 'Lojas — Sites',   ordem: 15 },
  { descricao: 'Peg Pneus Sorocaba — Site',   usuario: 'pegpneussorocaba.com.br',  senha: '0800 000 4494',             info: 'Lojas — Sites',   ordem: 16 },
  // Deskrio
  { descricao: 'Deskrio — Admin',             email: 'reinaldo@gmail.com',         senha: 'Reinaldo123',               info: 'Deskrio Peg Pneus AQ/Sorocaba', ordem: 20 },
  { descricao: 'Deskrio — Atendente 1',       email: 'atendente1@gmail.com',       senha: 'Carol1234',                 info: 'Deskrio Peg Pneus AQ/Sorocaba', ordem: 21 },
  { descricao: 'Deskrio — Atendente 2',       email: 'atendente2@gmail.com',       senha: 'Carolina1234',              info: 'Deskrio Peg Pneus AQ/Sorocaba', ordem: 22 },
  { descricao: 'Deskrio — Atendente 3',       email: 'atendente3@gmail.com',       senha: 'Luciana1234',               info: 'Deskrio Peg Pneus AQ/Sorocaba', ordem: 23 },
  { descricao: 'Deskrio — Atendente 4',       email: 'atendente4@gmail.com',       senha: 'CaiqueM123',                info: 'Deskrio Peg Pneus AQ/Sorocaba', ordem: 24 },
  // VOIP
  { descricao: 'VOIP — BR Pneus (3111)',      usuario: '12123@12123BrPneus',       link: 'https://comuniquesbctelecom.my3cx.com.br:5001/#/app/call_reports/call_reports', info: 'Telefonia VOIP', ordem: 30 },
  { descricao: 'VOIP — Peg Pneus (1006)',     usuario: '12123@12123PegPneus',      info: 'Telefonia VOIP',              ordem: 31 },
  { descricao: 'VOIP — PABX Smartcar',        email: 'marketsmartcar@gmail.com',   senha: '#SA37dcAQ730',              info: 'Telefonia VOIP', link: 'https://pabx-smartcar.my3cx.com.br/#/login', ordem: 32 },
  // E-mails Smartcar
  { descricao: 'Email — Agendamento',                   email: 'agendamento.smartcarbusiness@gmail.com', senha: 'Smart456*',            info: 'E-mails Smartcar', ordem: 40 },
  { descricao: 'Email — RH e Financeiro',               email: 'rhfinanceiro.smartcar@gmail.com',        senha: 'smartcar2024',         info: 'E-mails Smartcar', ordem: 41 },
  { descricao: 'Email — RH Financeiro Jaú',             email: 'rhfinanceiro.brjau@gmail.com',           senha: 'rhfinanceiro2023',     info: 'E-mails Smartcar', ordem: 42 },
  { descricao: 'Email — Google Ads e Facebook',         email: 'marketing.smartcar1@gmail.com',          senha: 'adfG123456$',          info: 'E-mails Smartcar', ordem: 43 },
  { descricao: 'Email — Negócios',                      email: 'smartcar.negocio@gmail.com',             senha: 'unDJU@2026',           info: 'E-mails Smartcar', ordem: 44 },
  { descricao: 'Email — Supervisão',                    email: 'supervisao2.smartcar@gmail.com',         senha: 'Super567**',           info: 'E-mails Smartcar', ordem: 45 },
  { descricao: 'Email — Manutenção Equipamentos',       email: 'manutecao.smartcar@gmail.com',           senha: 'Felipe@13',            info: 'E-mails Smartcar', ordem: 46 },
  { descricao: 'Email — Telemarketing',                 email: 'telemarketing.redesmartcar@gmail.com',   senha: 'smartcar2022',         info: 'E-mails Smartcar', ordem: 47 },
  { descricao: 'Email — Centro Distribuição',           email: 'estoqueredesmartcar@gmail.com',          senha: 'zXkLP@2025',           info: 'E-mails Smartcar', ordem: 48 },
  { descricao: 'Email — Currículos Araraquara',         email: 'vagasararaquara23@gmail.com',            senha: 'Lojas10152200',        info: 'E-mails Smartcar', ordem: 49 },
  { descricao: 'Email — Currículos Americana',          email: 'vagasamericana23@gmail.com',             senha: 'Lojas10152200',        info: 'E-mails Smartcar', ordem: 50 },
  { descricao: 'Email — Currículos Jaú',                email: 'vagasjau23@gmail.com',                   senha: 'Lojas10152200',        info: 'E-mails Smartcar', ordem: 51 },
  { descricao: 'Email — Currículos São Carlos',         email: 'vagassaocarlos23@gmail.com',             info: 'E-mails Smartcar',      ordem: 52 },
  { descricao: 'Email — Currículos Maringá',            email: 'vagasmaringa23@gmail.com',               senha: 'Lojas10152200',        info: 'E-mails Smartcar', ordem: 53 },
  { descricao: 'Email — Comercial Jaú',                 email: 'comercial.redebrpneus3@gmail.com',       senha: 'BRjau159357@*',        info: 'E-mails Smartcar', ordem: 54 },
  { descricao: 'Email — Comercial Sorocaba',            email: 'comercial.redebrpneus4@gmail.com',       senha: 'BRsorocaba@*',         info: 'E-mails Smartcar', ordem: 55 },
  { descricao: 'Email — Currículos RH',                 email: 'rhsmartcar.vagas@gmail.com',             senha: 'e101522@',             info: 'E-mails Smartcar', ordem: 56 },
  { descricao: 'Email — Reuniões BR Pneus',             email: 'reuniaobrpneus@gmail.com',               senha: 'SabAn@2025',           info: 'E-mails Smartcar', ordem: 57 },
  { descricao: 'Email — BR Ibitinga',                   email: 'brpneusibitinga@gmail.com',              senha: 'BRpneusibitinga@2025', info: 'E-mails Smartcar', ordem: 58 },
  { descricao: 'Email — Franquias',                     email: 'franquiasbrpneus@gmail.com',             senha: 'autobrpneus1978',      info: 'E-mails Smartcar', ordem: 59 },
  // Lojas — Comercial
  { descricao: 'Comercial — PIN App Lock Celulares',   usuario: '314631',                                info: 'Lojas — Comercial', ordem: 60 },
  { descricao: 'Comercial — Notebook Peg Pneus AQ',   email: 'pegpneus2024@outlook.com',               senha: 'Zachi2024',            info: 'Lojas — Comercial', ordem: 61 },
  { descricao: 'Comercial — PIN Notebook Peg',         usuario: 'Peg2024$',                              info: 'Lojas — Comercial', ordem: 62 },
  { descricao: 'Comercial — BR Araraquara Loja',       email: 'comercial.redebrpneus1@gmail.com',       senha: 'BRaqa1593579@*',       info: 'Lojas — Comercial', ordem: 63 },
  { descricao: 'Comercial — BR São Carlos Loja',       email: 'comercial.redebrpneus2@gmail.com',       senha: 'BRsc1593579@*',        info: 'Lojas — Comercial', ordem: 64 },
  { descricao: 'Comercial — Senha PC Vendas Loja 1',   usuario: 'Brpneus123',                            info: 'Lojas — Comercial', ordem: 65 },
  { descricao: 'Comercial — BR SC Caixa/Financeiro',   email: 'smartcarbrpneussc@gmail.com',            senha: 'smartcar2022',         info: 'Lojas — Comercial', ordem: 66 },
  { descricao: 'Comercial — Pneu Z Araraquara',        email: 'comercialpneuzararaquara@gmail.com',     senha: 'PZaqa159357@*',        info: 'Lojas — Comercial', ordem: 67 },
  { descricao: 'Comercial — Pneu Z Americana',         email: 'pneuzamericana@gmail.com',               senha: 'PZame1593579@*',       info: 'Lojas — Comercial', ordem: 68 },
  { descricao: 'Comercial — Pneu Z Caixa/Financeiro',  email: 'smartcarpneuz@gmail.com',                senha: 'smartcar2022',         info: 'Lojas — Comercial', ordem: 69 },
  { descricao: 'Comercial — Pneu Z Maringá',           email: 'pneuzmaringa@gmail.com',                 senha: 'PZma159357@*',         info: 'Lojas — Comercial', ordem: 70 },
  { descricao: 'Comercial — Pneu Z Maringá Caixa',     email: 'pneuzmaringa01@gmail.com',               senha: 'smartcar2022',         info: 'Lojas — Comercial', ordem: 71 },
  // Redes Sociais
  { descricao: 'Social — Facebook Smartcar',           email: 'smartcar.negocio@gmail.com',             senha: 'IsIMe@2025',           info: 'Redes Sociais', ordem: 80 },
  { descricao: 'Social — Facebook BR Pneus',           email: 'reuniaobrpneus@gmail.com',               senha: 'sGwCviTg8DYECMw',      info: 'Redes Sociais', ordem: 81 },
  { descricao: 'Social — Instagram Escola Mecânico',   usuario: 'escola_do_mecanico_SaoCarlos',          senha: 'INGSbo2010',           info: 'Redes Sociais', ordem: 82 },
  { descricao: 'Social — Instagram BR Pneus',          usuario: 'brpneus_autocenter',                    senha: 'AnJr*2025',            info: 'Redes Sociais', ordem: 83 },
  { descricao: 'Social — Instagram Família BR (Fabio)',usuario: 'aFamiliaBR_Pneus',                      senha: 'YJWFg@2025',           info: 'Redes Sociais', ordem: 84 },
  { descricao: 'Social — Instagram/Google Peg Pneus',  email: 'pegpneusatacarejo@gmail.com',            senha: 'Pegpneus@2024',        info: 'Redes Sociais', ordem: 85 },
  { descricao: 'Social — LinkedIn Smartcar',           email: 'smartcar.negocio@gmail.com',             senha: 'LinLinkedin@2023',     info: 'Redes Sociais', ordem: 86 },
  { descricao: 'Social — TikTok Peg Pneus',            email: 'pneuspegpneusatacarejo@gmail.com',       senha: 'Pegpneus@2024',        info: 'Redes Sociais', ordem: 87 },
  { descricao: 'Social — TikTok Smartcar',             usuario: 'Smartcar.negocio (Google)',              info: 'Redes Sociais',         ordem: 88 },
  // Google / YouTube
  { descricao: 'Google — Canal YouTube BR Pneus',      email: 'marketingbrpneussmartcar@gmail.com',     senha: 'marketingBR2024@*',    info: 'Google / YouTube', ordem: 90 },
  { descricao: 'Google — Conta Google Peg Pneus',      email: 'pegpneusatacarejo@gmail.com',            senha: 'Pegpneus@2024',        info: 'Google / YouTube', ordem: 91 },
  { descricao: 'Google — Conta Designi',               email: 'smartcar.negocio@gmail.com',             senha: 'unDJU@2025',           info: 'Google / YouTube', ordem: 92 },
  { descricao: 'Google — Futura IM / Conta Brdid',     email: 'smartcar.negocio@gmail.com',             senha: 'unDJU@2026',           info: 'Google / YouTube', ordem: 93 },
  { descricao: 'Google — Hostgator',                   email: 'smartcar.negocio@gmail.com',             senha: 'wEamwpVsfv8EP6n',      info: 'Google / YouTube', ordem: 94 },
  // Ferramentas
  { descricao: 'Plataforma — Deskfy Escola Mecânico',  email: 'escoladomecanico@gmail.com',             senha: 'escoladomecanico1234', info: 'Ferramentas', ordem: 100 },
  { descricao: 'Plataforma — Spotify / Photoshop',     email: 'spotify.brpneus@gmail.com',              senha: 'BRpneusararaquara@2023',info: 'Ferramentas', ordem: 101 },
  { descricao: 'Plataforma — Conta Algar',             usuario: 'BRpneuararaquara@2024',                 senha: '43895061/0001-77',     info: 'Ferramentas', ordem: 102 },
  { descricao: 'Plataforma — Reclame Aqui',            usuario: 'brpneusautomotivos',                    senha: 'Contato@BR159',        info: 'Ferramentas', ordem: 103 },
  { descricao: 'Plataforma — Integrazap',              email: 'marketing.sites.brpneus@gmail.com',      senha: 'IntegraBRAra159357',   info: 'Ferramentas', ordem: 104 },
  { descricao: 'Plataforma — FastCommerce',            usuario: 'Nicolas (pegpneus)',                    senha: 'BRpneus@2024',         info: 'Ferramentas', ordem: 105 },
  { descricao: 'Plataforma — Domínio Pneu Z',          usuario: 'FAZAC26',                               senha: 'aTrNJ@2025',           info: 'Ferramentas', ordem: 106 },
  { descricao: 'Plataforma — Hotmart',                 email: 'reuniaobrpneus@gmail.com',               senha: 'BRpneusararaquara@2024',info: 'Ferramentas', ordem: 107 },
  { descricao: 'Plataforma — Chatrio Peg Tele 1',      email: 'tele1pzma@gmail.com',                    senha: 'Tele123@',             info: 'Ferramentas', ordem: 108 },
  { descricao: 'Plataforma — Chatrio Peg Tele 2',      email: 'tele2pzma@gmail.com',                    info: 'Ferramentas',            ordem: 109 },
  { descricao: 'Plataforma — Chatrio Peg Tele 3',      email: 'tele3pzma@gmail.com',                    info: 'Ferramentas',            ordem: 110 },
  { descricao: 'Plataforma — Painel LED',              usuario: 'cfcentro',                              senha: 'aE2#tG7?rX1%mI7-rI7&dM3@', info: 'Ferramentas', link: 'https://us.vnnox.com', ordem: 111 },
  // Titan Email
  { descricao: 'Titan — Nota Fiscal',                  email: 'notafiscal@brpneusautomotivo.com.br',    senha: 'NF@BR159',             info: 'Titan Email', ordem: 120 },
  { descricao: 'Titan — Contato',                      email: 'contato@brpneusautomotivo.com.br',       senha: 'Contato@BR159',        info: 'Titan Email', ordem: 121 },
  { descricao: 'Titan — Vendas',                       email: 'vendas@brpneusautomotivo.com.br',        senha: 'Vendas@BR159',         info: 'Titan Email', ordem: 122 },
  { descricao: 'Titan — RH',                           email: 'recursoshumanos@brpneusautomotivo.com.br',senha: 'Rh@BR159',            info: 'Titan Email', ordem: 123 },
  { descricao: 'Titan — Financeiro',                   email: 'financeiro@brpneusautomotivo.com.br',    senha: 'Financeiro@BR159',     info: 'Titan Email', ordem: 124 },
  { descricao: 'Titan — Pós Venda',                    email: 'posvenda@brpneusautomotivo.com.br',      senha: 'Posvenda@BR159',       info: 'Titan Email', ordem: 125 },
  // Documentos
  { descricao: 'Docs — AQ Centro',          email: 'documentosararaquaracentro@gmail.com', senha: 'smartcar2022', info: 'Documentos', ordem: 130 },
  { descricao: 'Docs — AQ Vila',            email: 'documentosararaquaravila@gmail.com',   senha: 'smartcar2022', info: 'Documentos', ordem: 131 },
  { descricao: 'Docs — Americana',          email: 'documentosbramericana@gmail.com',      senha: 'smartcar2022', info: 'Documentos', ordem: 132 },
  { descricao: 'Docs — São Carlos',         email: 'documentosbrsaocarlos@gmail.com',      senha: 'smartcar2022', info: 'Documentos', ordem: 133 },
  { descricao: 'Docs — Maringá',            email: 'documentosmaringasm@gmail.com',        senha: 'smartcar2022', info: 'Documentos', ordem: 134 },
  { descricao: 'Docs — Jaú',                email: 'documentosjauldf@gmail.com',           senha: 'smartcar2022', info: 'Documentos', ordem: 135 },
  { descricao: 'Docs — Ibitinga',           email: 'documentosibitinga@gmail.com',         senha: 'smartcar2022', info: 'Documentos', ordem: 136 },
  { descricao: 'Docs — Peg Pneus',          email: 'documentospegpneus@gmail.com',         senha: 'smartcar2022', info: 'Documentos', ordem: 137 },
  { descricao: 'Docs — BR Centro',          email: 'brpneuscentro@gmail.com',              senha: 'Smartcar@25',  info: 'Documentos', ordem: 138 },
  { descricao: 'Docs — BR Vila',            email: 'brpneusvila@gmail.com',                senha: 'Smartcar@25',  info: 'Documentos', ordem: 139 },
  { descricao: 'Docs — BR Vila 02',         email: 'brpneusvila02@gmail.com',              senha: 'Smartcar2024', info: 'Documentos', ordem: 140 },
  { descricao: 'Docs — BR São Carlos 02',   email: 'brpneussaocarlos02@gmail.com',         senha: 'Smartcar@25',  info: 'Documentos', ordem: 141 },
  { descricao: 'Docs — BR Americana',       email: 'brpneusamericana@gmail.com',           senha: 'Smartcar@25',  info: 'Documentos', ordem: 142 },
  { descricao: 'Docs — BR Americana 02',    email: 'brpneusamericana02@gmail.com',         senha: 'Smartcar@25',  info: 'Documentos', ordem: 143 },
  { descricao: 'Docs — BR Maringá',         email: 'brpneusmaringa@gmail.com',             senha: 'Smartcar@25',  info: 'Documentos', ordem: 144 },
  { descricao: 'Docs — BR Jaú',             email: 'brpneusjau4@gmail.com',               senha: 'Smartcar2022@',info: 'Documentos', ordem: 145 },
  { descricao: 'Docs — BR Ibitinga',        email: 'ibitingabrpneus@gmail.com',           senha: 'Smartcar2022@',info: 'Documentos', ordem: 146 },
  { descricao: 'Docs — BR SC 03',           email: 'brpneussaocarlos3@gmail.com',         senha: 'Smartcar2022@',info: 'Documentos', ordem: 147 },
  { descricao: 'Docs — BR Centro 02',       email: 'brpnerscentro02@gmail.com',           senha: 'Smartcar@25',  info: 'Documentos', ordem: 148 },
  { descricao: 'Docs — Pós Venda 1963',     email: 'Posv1963@gmail.com',                  senha: 'Smartcar2025@',info: 'Documentos', ordem: 149 },
  { descricao: 'Docs — Email Microsoft Computadores', email: 'smartcarnegocios@gmail.com', senha: 'smartcar123', info: 'Documentos', ordem: 150 },
  // Workspace Smartcar
  { descricao: 'Workspace — Pós Vendas',            email: 'pos.venda@smartcarnegocios.com.br',          senha: 'rTqVB@2025', info: 'Workspace Smartcar', ordem: 160 },
  { descricao: 'Workspace — RH',                    email: 'rh@smartcarnegocios.com.br',                 senha: 'nBvCX@2025', info: 'Workspace Smartcar', ordem: 161 },
  { descricao: 'Workspace — Financeiro',            email: 'financeiro@smartcarnegocios.com.br',         senha: 'vBnJH@2025', info: 'Workspace Smartcar', ordem: 162 },
  { descricao: 'Workspace — Marketing',             email: 'marketing@redesmartcar.com.br',              senha: 'Mkt@2025',   info: 'Workspace Smartcar', ordem: 163 },
  { descricao: 'Workspace — Supervisores',          email: 'supervisao.comercial@redesmartcar.com.br',   senha: 'zXkLP@2025', info: 'Workspace Smartcar', ordem: 164 },
  { descricao: 'Workspace — Caixas',                email: 'caixa@smartcarnegocios.com.br',              senha: 'fGyDS@2025', info: 'Workspace Smartcar', ordem: 165 },
  { descricao: 'Workspace — Peg Pneus',             email: 'comercial.peg@smartcarnegocios.com.br',      senha: 'pLcNM@2025', info: 'Workspace Smartcar', ordem: 166 },
  { descricao: 'Workspace — Supervisão Técnica',    email: 'supervisao.tecnica@smartcarnegocios.com.br', senha: 'Felipe@13',  info: 'Workspace Smartcar', ordem: 167 },
  { descricao: 'Workspace — CD Estoque',            email: 'estoque.cd@smartcarnegocios.com.br',         senha: 'hJkFD@2025', info: 'Workspace Smartcar', ordem: 168 },
  { descricao: 'Workspace — Agendamento 1',         email: 'agendamento1@smartcarnegocios.com.br',       senha: 'XjKqW@2026', info: 'Workspace Smartcar', ordem: 169 },
  { descricao: 'Workspace — Agendamento 2',         email: 'agendamento2@smartcarnegocios.com.br',       senha: 'XjKqW@2026', info: 'Workspace Smartcar', ordem: 170 },
  { descricao: 'Workspace — Estoque Loja 1,2,3,4',  email: 'estoque1@smartcarnegocios.com.br',           senha: 'vRzQy@2026', info: 'Workspace Smartcar', ordem: 171 },
  { descricao: 'Workspace — Estoque Loja 5,6,7',    email: 'estoque2@smartcarnegocios.com.br',           senha: 'vRzQy@2026', info: 'Workspace Smartcar', ordem: 172 },
  { descricao: 'Workspace — Comercial Loja 1 e 2',  email: 'comercial1@smartcarnegocios.com.br',         senha: 'xSwZa@2026', info: 'Workspace Smartcar', ordem: 173 },
  { descricao: 'Workspace — Comercial Loja 3 e 4',  email: 'comercial2@smartcarnegocios.com.br',         senha: 'xSwZa@2026', info: 'Workspace Smartcar', ordem: 174 },
  { descricao: 'Workspace — Comercial Loja 5 e 6',  email: 'comercial3@smartcarnegocios.com.br',         senha: 'xSwZa@2026', info: 'Workspace Smartcar', ordem: 175 },
  { descricao: 'Workspace — Comercial Loja 7',      email: 'comercial4@smartcarnegocios.com.br',         senha: 'xSwZa@2026', info: 'Workspace Smartcar', ordem: 176 },
  { descricao: 'Workspace — Vnox Painel LED',       usuario: 'brpneus',                                  senha: 'Brpneus1234+',info: 'Workspace Smartcar', ordem: 177 },
];

async function main() {
  console.log('\n🔑 Setup tabela admin_credentials...\n');

  // 1. Criar tabela via SQL direto (Supabase permite via service role)
  const createRes = await fetch(`${URL}/rest/v1/`, {
    headers: { ...headers, 'X-Client-Info': 'setup' },
  });

  // Tentar inserir diretamente (a tabela pode já existir se o SQL foi rodado)
  console.log('📋 Inserindo', DADOS.length, 'credenciais...');

  // Normalizar todos os objetos com as mesmas chaves
  const dadosNorm = DADOS.map(d => ({
    descricao: d.descricao,
    email:     d.email    ?? null,
    usuario:   d.usuario  ?? null,
    senha:     d.senha    ?? null,
    info:      d.info     ?? null,
    link:      d.link     ?? null,
    ordem:     d.ordem    ?? 0,
  }));

  // Inserir em lotes de 50
  const LOTE = 50;
  let inseridos = 0;
  for (let i = 0; i < dadosNorm.length; i += LOTE) {
    const lote = dadosNorm.slice(i, i + LOTE);
    const res = await fetch(`${URL}/rest/v1/admin_credentials`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify(lote),
    });
    if (!res.ok) {
      const body = await res.text();
      if (body.includes('relation "public.admin_credentials" does not exist')) {
        console.error('\n❌ Tabela não existe. Execute primeiro o SQL no Supabase:');
        console.error('   supabase/migrations/20260511_credentials.sql');
        process.exit(1);
      }
      console.error(`❌ Erro no lote ${i}: ${res.status} ${body}`);
      continue;
    }
    inseridos += lote.length;
    process.stdout.write(`  ✅ ${inseridos}/${dadosNorm.length}\r`);
  }

  console.log(`\n✅ ${inseridos} credenciais inseridas com sucesso!\n`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
