'use strict';

const { execSync } = require('child_process');
const path         = require('path');
const os           = require('os');

const frequencia = process.argv[2] || '9-17';

const projectDir = process.cwd();
const nodePath   = process.execPath;
const scriptPath = path.join(projectDir, 'tools', 'monitor-ads.js');
const logPath    = path.join(projectDir, 'logs', 'ads-monitor.log');
const taskName   = 'BRPneus-MonitorAds';

// ─── Configurações de agendamento ─────────────────────────────────────────────

const configs = {
  '1h':   { horarios: null,           intervalo: 'HOURLY',  desc: 'a cada hora' },
  '3h':   { horarios: null,           intervalo: 'HOURLY',  modulo: 3, desc: 'a cada 3 horas' },
  '6h':   { horarios: null,           intervalo: 'HOURLY',  modulo: 6, desc: 'a cada 6 horas' },
  '9-17': { horarios: ['09:00','17:00'], dias: 'MON,TUE,WED,THU,FRI,SAT', desc: '2x ao dia (9h e 17h, seg–sáb)' },
  '9-17-1730': { horarios: ['09:00','17:00','17:30'], dias: 'MON,TUE,WED,THU,FRI,SAT', desc: '3x ao dia (9h, 17h e 17h30, seg–sáb)' },
  '8-17-1730': { horarios: ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','17:30'], dias: 'MON,TUE,WED,THU,FRI,SAT', desc: '11x ao dia (8h–17h de hora em hora + 17h30, seg–sáb)' },
  '9-13-17': { horarios: ['09:00','13:00','17:00'], dias: 'MON,TUE,WED,THU,FRI,SAT', desc: '3x ao dia (9h, 13h e 17h, seg–sáb)' },
  '8-18': { horarios: ['08:00','12:00','15:00','18:00'], dias: 'MON,TUE,WED,THU,FRI,SAT', desc: '4x ao dia (8h, 12h, 15h, 18h, seg–sáb)' },
  '2x':   { horarios: ['08:00','18:00'], dias: 'MON,TUE,WED,THU,FRI,SAT', desc: '2x ao dia (8h e 18h, seg–sáb)' },
};

const cfg = configs[frequencia];

if (!cfg) {
  console.error(`❌ Frequência desconhecida: ${frequencia}`);
  console.error(`   Opções: ${Object.keys(configs).join(', ')}`);
  process.exit(1);
}

// ─── Windows — Agendador de Tarefas ───────────────────────────────────────────

function agendarWindows() {
  // Garantir que a pasta de logs existe
  try {
    require('fs').mkdirSync(path.join(projectDir, 'logs'), { recursive: true });
  } catch (_) {}

  const wrapper = path.join(projectDir, 'tools', '_run-monitor.bat');
  require('fs').writeFileSync(
    wrapper,
    `@echo off\r\ncd /d "${projectDir}"\r\n"${nodePath}" "${scriptPath}" >> "${logPath}" 2>&1\r\n`
  );

  // Remover tarefa anterior (se existir)
  try {
    execSync(`schtasks /delete /tn "${taskName}-9h"  /f 2>nul`, { stdio: 'pipe' });
    execSync(`schtasks /delete /tn "${taskName}-17h" /f 2>nul`, { stdio: 'pipe' });
    execSync(`schtasks /delete /tn "${taskName}"     /f 2>nul`, { stdio: 'pipe' });
  } catch (_) {}

  if (cfg.horarios) {
    // Criar uma tarefa por horário
    for (const horario of cfg.horarios) {
      const sufixo  = horario.replace(':', 'h');
      const nomeTask = `${taskName}-${sufixo}`;

      const cmd = [
        'schtasks /create',
        `/tn "${nomeTask}"`,
        `/tr "\\"${wrapper}\\""`,
        `/sc WEEKLY`,
        `/d ${cfg.dias}`,
        `/st ${horario}`,
        `/f`,
      ].join(' ');

      execSync(cmd, { stdio: 'pipe' });
      console.log(`  ✅ Tarefa criada: ${nomeTask} (${horario})`);
    }
  }

  console.log('');
  console.log('✅ Monitor de Ads agendado!');
  console.log('');
  console.log(`⏰ Frequência: ${cfg.desc}`);

  if (frequencia === '9-13-17') {
    console.log('   🕘 09:00 — segunda a sábado');
    console.log('   🕐 13:00 — segunda a sábado');
    console.log('   🕔 17:00 — segunda a sábado');
    console.log('   🚫 Domingo — não roda');
  } else if (frequencia === '9-17') {
    console.log('   🕘 09:00 — segunda a sábado');
    console.log('   🕔 17:00 — segunda a sábado');
    console.log('   🚫 Domingo — não roda');
  } else if (frequencia === '2x') {
    console.log('   🕗 08:00 — segunda a sábado');
    console.log('   🕕 18:00 — segunda a sábado');
  } else if (frequencia === '8-18') {
    console.log('   🕗 08:00 / 🕛 12:00 / 🕒 15:00 / 🕕 18:00 — segunda a sábado');
  }

  console.log('');
  console.log('📱 Se houver saldo baixo ou zerado → alerta no WhatsApp automático.');
  console.log(`📋 Log salvo em: ${logPath}`);
  console.log('');
  console.log('🔧 Comandos úteis:');
  console.log('   npm run ads              → Rodar agora manualmente');
  console.log(`   npm run ads:agendar:9-17 → Reagendar`);
  console.log('   schtasks /query /tn "BRPneus*" /fo LIST → Ver tarefas agendadas');
  console.log('   Painel de controle → Agendador de Tarefas → Biblioteca → BRPneus*');
  console.log('');
}

// ─── Linux / macOS — crontab ──────────────────────────────────────────────────

function agendarUnix() {
  const logPathUnix = '/tmp/br-pneus-ads.log';
  const cmd = `cd ${projectDir} && ${nodePath} ${scriptPath} >> ${logPathUnix} 2>&1`;

  let linhas = [];
  if (cfg.horarios) {
    for (const h of cfg.horarios) {
      const [hh, mm] = h.split(':');
      const dias = cfg.dias.replace(/MON/g, '1').replace(/TUE/g, '2').replace(/WED/g, '3')
        .replace(/THU/g, '4').replace(/FRI/g, '5').replace(/SAT/g, '6');
      linhas.push(`${mm} ${hh} * * ${dias} ${cmd}`);
    }
  }

  let crontab = '';
  try { crontab = execSync('crontab -l 2>/dev/null').toString(); } catch (_) {}
  crontab = crontab.split('\n').filter(l => !l.includes('monitor-ads')).join('\n');
  crontab = crontab.trim() + '\n' + linhas.join('\n') + '\n';

  require('fs').writeFileSync('/tmp/br-pneus-crontab', crontab);
  execSync('crontab /tmp/br-pneus-crontab');

  console.log(`✅ Monitor agendado! Frequência: ${cfg.desc}`);
  console.log(`   Log: ${logPathUnix}`);
  console.log('   Ver: crontab -l');
}

// ─── Entry point ──────────────────────────────────────────────────────────────

try {
  if (os.platform() === 'win32') {
    agendarWindows();
  } else {
    agendarUnix();
  }
} catch (err) {
  console.error('❌ Erro ao agendar:', err.message);
  if (os.platform() === 'win32') {
    console.log('\n   Tente rodar o terminal como Administrador.');
  }
  process.exit(1);
}
