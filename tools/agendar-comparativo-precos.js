'use strict';
/**
 * tools/agendar-comparativo-precos.js
 *
 * Agenda o comparativo de preços (Pneu Store vs BR Pneus) toda segunda-feira às 8h.
 *
 * Uso:
 *   node tools/agendar-comparativo-precos.js           # agenda
 *   node tools/agendar-comparativo-precos.js --remover # remove o agendamento
 */

require('dotenv').config();

const { execSync } = require('child_process');
const fs           = require('path');
const path         = require('path');

const projectDir = process.cwd();
const nodePath   = process.execPath;
const scriptPath = path.join(projectDir, 'tools', 'comparar-precos-pneustore.js');
const logPath    = path.join(projectDir, 'logs', 'comparativo-precos.log');
const taskName   = 'BRPneus-ComparativoPrecos';
const wrapperBat = path.join(projectDir, 'tools', '_run-comparativo-precos.bat');

require('fs').mkdirSync(path.join(projectDir, 'logs'), { recursive: true });

function removerTarefa() {
  try {
    execSync(`schtasks /delete /tn "${taskName}" /f`, { stdio: 'pipe' });
    console.log(`✅ Tarefa "${taskName}" removida.`);
  } catch {
    console.log(`⚠️  Tarefa não encontrada (pode já ter sido removida).`);
  }
}

function agendarWindows() {
  require('fs').writeFileSync(
    wrapperBat,
    `@echo off\r\ncd /d "${projectDir}"\r\n"${nodePath}" "${scriptPath}" >> "${logPath}" 2>&1\r\n`
  );

  // Remover anterior
  try { execSync(`schtasks /delete /tn "${taskName}" /f`, { stdio: 'pipe' }); } catch {}

  const cmd = [
    'schtasks /create',
    `/tn "${taskName}"`,
    `/tr "\\"${wrapperBat}\\""`,
    `/sc WEEKLY`,
    `/d MON`,
    `/st 08:00`,
    `/f`,
  ].join(' ');

  execSync(cmd, { stdio: 'pipe' });

  console.log('');
  console.log('✅ Comparativo de Preços agendado!');
  console.log('');
  console.log('⏰ Frequência: toda segunda-feira às 08h00');
  console.log('');
  console.log('📊 O que roda:');
  console.log('   1. Scrape do site Pneu Store (menor preço por medida)');
  console.log('   2. Comparação com tabela BR Pneus (tab1/tab2/tab3)');
  console.log('   3. Excel salvo em output/relatorios/comparativo-precos-YYYY-MM-DD.xlsx');
  console.log('   4. Google Sheets atualizado automaticamente');
  console.log('');
  console.log(`📋 Log em: ${logPath}`);
  console.log('');
  console.log('🔧 Comandos úteis:');
  console.log('   npm run comparar-precos              → Rodar agora manualmente');
  console.log('   npm run comparar-precos:teste        → Testar com 5 medidas');
  console.log('   npm run comparar-precos:sheets       → Só atualizar o Sheets (sem scraping)');
  console.log('   npm run comparar-precos:agendar      → Reagendar');
  console.log('   schtasks /query /tn "BRPneus*" /fo LIST → Ver tarefas agendadas');
  console.log('');
}

if (process.argv.includes('--remover')) {
  removerTarefa();
} else {
  agendarWindows();
}
