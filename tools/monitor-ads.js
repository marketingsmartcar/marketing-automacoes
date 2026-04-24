'use strict';

/**
 * monitor-ads.js — Monitor unificado de Ads (Meta + Google)
 * BR Pneus & Oficina + Peg Pneus
 *
 * Uso:
 *   node tools/monitor-ads.js           → Meta + Google
 *   node tools/monitor-ads.js --meta    → Só Meta Ads
 *   node tools/monitor-ads.js --google  → Só Google Ads
 *   node tools/monitor-ads.js --recarregar → Fluxo interativo de recarga
 */

require('dotenv').config();

const fs              = require('fs');
const path            = require('path');
const { createInterface } = require('readline');

// ─── Lock file — evita execuções simultâneas ───────────────────────────────────
const LOCK_FILE = path.join(__dirname, '..', 'logs', 'monitor.lock');

function adquirirLock() {
  try {
    fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true });
    // Se o lock existir e tiver mais de 10 minutos, é um lock travado — remover
    if (fs.existsSync(LOCK_FILE)) {
      const stat = fs.statSync(LOCK_FILE);
      const idadeMs = Date.now() - stat.mtimeMs;
      if (idadeMs > 10 * 60 * 1000) {
        fs.unlinkSync(LOCK_FILE);
      } else {
        console.log('⏳ Monitor já está rodando (lock ativo). Abortando para evitar duplicata.');
        process.exit(0);
      }
    }
    fs.writeFileSync(LOCK_FILE, String(process.pid));
    return true;
  } catch (_) {
    return true; // Se não conseguir criar lock, continua mesmo assim
  }
}

function liberarLock() {
  try { fs.unlinkSync(LOCK_FILE); } catch (_) {}
}

// Liberar lock ao sair (normal ou por erro)
process.on('exit', liberarLock);
process.on('SIGINT', () => { liberarLock(); process.exit(1); });
process.on('uncaughtException', (e) => { liberarLock(); console.error(e); process.exit(1); });

const args = process.argv.slice(2);
const MODO_META       = args.includes('--meta')       || (!args.includes('--google') && !args.includes('--recarregar'));
const MODO_GOOGLE     = args.includes('--google')     || (!args.includes('--meta')   && !args.includes('--recarregar'));
const MODO_RECARREGAR = args.includes('--recarregar');

// Detectar execução não-interativa (Agendador de Tarefas, CI, pipe, etc.)
const MODO_AUTO = !process.stdin.isTTY || args.includes('--auto');

// ─── Guia de recarga manual ────────────────────────────────────────────────────

const GUIA_META_SALDO = `
  ┌─ META ADS — Pix no SALDO ─────────────────────────────────────────────────┐
  │                                                                            │
  │  1. Acesse: https://business.facebook.com/                                 │
  │  2. Menu → Gerenciador de Anúncios → Conta desejada                        │
  │  3. Canto superior direito → ícone de "Cobrança" (💳)                      │
  │  4. Clique em "Saldo Pré-pago"                                             │
  │  5. "Adicionar Fundos" → selecione Pix                                     │
  │  6. Digite o valor e copie o código Pix ou escaneie o QR Code              │
  │  7. Aguarde confirmação (normalmente instantâneo)                           │
  │                                                                            │
  │  ⚠️  Este método adiciona saldo pré-pago à conta.                          │
  │     Os anúncios rodam enquanto houver saldo disponível.                    │
  └────────────────────────────────────────────────────────────────────────────┘`;

const GUIA_META_FUNDOS = `
  ┌─ META ADS — Pix nos FUNDOS (BR PNEUS ARARAQUARA) ─────────────────────────┐
  │                                                                            │
  │  ⚠️  ATENÇÃO: Esta conta usa FUNDOS, não Saldo Pré-pago!                   │
  │                                                                            │
  │  1. Acesse: https://business.facebook.com/                                 │
  │  2. Menu → Gerenciador de Anúncios → BR PNEUS ARARAQUARA                  │
  │  3. Canto superior direito → "Cobrança"                                    │
  │  4. Clique em "Métodos de Pagamento"                                       │
  │  5. Selecione "Pix" e clique em "Pagar Fatura"                             │
  │  6. Informe o valor da fatura em aberto                                    │
  │  7. Copie o código Pix ou escaneie o QR Code                               │
  │                                                                            │
  │  💡  Este método paga uma fatura gerada pelo Meta (pós-pago por fatura).   │
  └────────────────────────────────────────────────────────────────────────────┘`;

const GUIA_GOOGLE = `
  ┌─ GOOGLE ADS — Recarga / Pagamento ────────────────────────────────────────┐
  │                                                                            │
  │  1. Acesse: https://ads.google.com/                                        │
  │  2. Selecione a conta no menu superior                                     │
  │  3. Menu → Ferramentas (🔧) → Faturamento → Resumo                         │
  │  4. Clique em "Fazer um pagamento"                                         │
  │  5. Escolha o método: Pix, boleto ou cartão                                │
  │  6. Digite o valor e confirme                                              │
  │                                                                            │
  │  💡  O Google Ads cobra automaticamente do método cadastrado               │
  │     quando o saldo diário é atingido (sistema pós-pago por padrão).        │
  │     Recargas manuais via Pix ficam como saldo pré-pago na conta.           │
  └────────────────────────────────────────────────────────────────────────────┘`;

// ─── Readline helper ───────────────────────────────────────────────────────────

function pergunta(rl, texto) {
  return new Promise((resolve) => rl.question(texto, resolve));
}

// ─── Fluxo interativo de recarga ───────────────────────────────────────────────

async function fluxoRecarregar() {
  const { CONTAS_META } = require('./monitor-meta-ads');
  const { CONTAS_GOOGLE } = require('./monitor-google-ads');

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log('\n' + '═'.repeat(70));
  console.log('  💳  FLUXO DE RECARGA — BR PNEUS & PEG PNEUS');
  console.log('═'.repeat(70));
  console.log('\n  Qual plataforma deseja recarregar?\n');
  console.log('  [1] Meta Ads (Facebook/Instagram)');
  console.log('  [2] Google Ads');
  console.log('  [3] Ambas');
  console.log('  [0] Sair\n');

  const opcaoPlataforma = await pergunta(rl, '  Escolha: ');

  const fazerMeta   = ['1', '3'].includes(opcaoPlataforma.trim());
  const fazerGoogle = ['2', '3'].includes(opcaoPlataforma.trim());

  if (!fazerMeta && !fazerGoogle) {
    rl.close();
    return;
  }

  // ── Meta Ads ────────────────────────────────────────────────────────────────
  if (fazerMeta) {
    console.log('\n' + '─'.repeat(70));
    console.log('  META ADS — Selecione a conta:\n');

    CONTAS_META.forEach((c, i) => {
      const metodo = c.recarga === 'fundos' ? '⚠️  Pix nos Fundos' : '   Pix no Saldo';
      console.log(`  [${i + 1}] ${c.nome.padEnd(30)} ${metodo}`);
    });
    console.log(`  [0] Pular\n`);

    const opcaoConta = await pergunta(rl, '  Escolha a conta: ');
    const idx = parseInt(opcaoConta.trim()) - 1;

    if (idx >= 0 && idx < CONTAS_META.length) {
      const conta = CONTAS_META[idx];
      console.log(`\n  Conta selecionada: ${conta.nome}`);
      console.log(`  Método: ${conta.recarga === 'fundos' ? 'Pix nos FUNDOS' : 'Pix no SALDO'}\n`);

      if (conta.recarga === 'fundos') {
        console.log(GUIA_META_FUNDOS);
      } else {
        console.log(GUIA_META_SALDO);
      }

      const valor = await pergunta(rl, '\n  Qual valor deseja recarregar? R$ ');
      console.log(`\n  ✅  Siga os passos acima para recarregar R$ ${valor} na conta "${conta.nome}".`);
      console.log(`  📋  Guarde o comprovante Pix para sua gestão financeira.\n`);
    }
  }

  // ── Google Ads ──────────────────────────────────────────────────────────────
  if (fazerGoogle) {
    console.log('\n' + '─'.repeat(70));
    console.log('  GOOGLE ADS — Selecione a conta:\n');

    CONTAS_GOOGLE.forEach((c, i) => {
      const idFormatado = String(c.id).replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
      console.log(`  [${i + 1}] ${c.nome.padEnd(30)} ID: ${idFormatado}`);
    });
    console.log(`  [0] Pular\n`);

    const opcaoConta = await pergunta(rl, '  Escolha a conta: ');
    const idx = parseInt(opcaoConta.trim()) - 1;

    if (idx >= 0 && idx < CONTAS_GOOGLE.length) {
      const conta = CONTAS_GOOGLE[idx];
      const idFormatado = String(conta.id).replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
      console.log(`\n  Conta selecionada: ${conta.nome} (${idFormatado})\n`);
      console.log(GUIA_GOOGLE);

      const valor = await pergunta(rl, '\n  Qual valor deseja recarregar? R$ ');
      console.log(`\n  ✅  Siga os passos acima para recarregar R$ ${valor} na conta "${conta.nome}".`);
      console.log(`  📋  Guarde o comprovante para sua gestão financeira.\n`);
    }
  }

  rl.close();
  console.log('═'.repeat(70));
  console.log('  ✅  Fluxo de recarga concluído.');
  console.log('═'.repeat(70) + '\n');
}

// ─── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  if (!MODO_RECARREGAR) adquirirLock();

  if (MODO_RECARREGAR) {
    await fluxoRecarregar();
    return;
  }

  let metaResultados   = null;
  let googleResultados = null;
  let metaAlertas      = [];

  // Executar os monitores solicitados
  if (MODO_META) {
    try {
      const { monitorarTodas } = require('./monitor-meta-ads');
      const res = await monitorarTodas();
      metaResultados = res.resultados;
      metaAlertas = res.alertaRecarga || [];
    } catch (err) {
      console.error('\n⚠️  Meta Ads:', err.message);
    }
  }

  if (MODO_GOOGLE) {
    try {
      const { monitorarTodas } = require('./monitor-google-ads');
      const res = await monitorarTodas();
      googleResultados = res.resultados;
    } catch (err) {
      console.error('\n⚠️  Google Ads:', err.message);
    }
  }

  // ── Prompt de recarga após relatório ──────────────────────────────────────
  if (metaAlertas.length > 0) {
    console.log('\n' + '═'.repeat(70));
    console.log('  💳  CONTAS COM SALDO BAIXO — DESEJA RECARREGAR AGORA?');
    console.log('═'.repeat(70) + '\n');

    for (const r of metaAlertas) {
      const saldoBrl = (parseFloat(r.saldo || 0) / 100)
        .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const metodo = r.recarga === 'fundos' ? 'Pix nos FUNDOS ⚠️' : 'Pix no Saldo';
      console.log(`  • ${r.nome.padEnd(30)} Saldo: ${saldoBrl}   (${metodo})`);
    }

    // Pular prompt quando rodando via agendador/automação
    if (!MODO_AUTO) {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      const resp = await pergunta(rl, '\n  Ver instruções de recarga? [S/n]: ');
      rl.close();

      if (!resp.trim().toLowerCase().startsWith('n')) {
        for (const r of metaAlertas) {
          console.log(`\n  ── ${r.nome} ──`);
          if (r.recarga === 'fundos') {
            console.log(GUIA_META_FUNDOS);
          } else {
            console.log(GUIA_META_SALDO);
          }
        }
      }
    }
  }

  console.log('\n  💡  Para iniciar recarga manual:  node tools/monitor-ads.js --recarregar\n');
}

main().catch((err) => {
  console.error('Erro fatal:', err.message);
  process.exit(1);
});
