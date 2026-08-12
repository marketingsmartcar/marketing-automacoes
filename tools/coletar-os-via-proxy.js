#!/usr/bin/env node
/**
 * coletar-os-via-proxy.js
 *
 * Coleta OS do Gestão Periódica via proxy PHP no Hostgator (IP brasileiro).
 * Substitui o coletar-os-detalhadas.js (que usava Puppeteer, bloqueado nos runners cloud).
 *
 * Uso:
 *   node tools/coletar-os-via-proxy.js              # ontem
 *   node tools/coletar-os-via-proxy.js --date 2026-08-10
 *   node tools/coletar-os-via-proxy.js --date 2026-08-01 --ate 2026-08-10
 */

'use strict';
require('dotenv').config();
const https  = require('https');
const http   = require('http');
const { createClient } = require('@supabase/supabase-js');
const fs   = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.NEXUSZ_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXUSZ_SUPABASE_ANON_KEY;
const OI_EMAIL     = process.env.OI_EMAIL;
const OI_SENHA     = process.env.OI_SENHA;
const PROXY_URL    = process.env.OI_PROXY_URL || 'https://redesmartcar.com.br/oi-proxy.php';
const PROXY_SECRET = process.env.OI_PROXY_SECRET;

const LOJAS = [
  { key: 'BR01', label: 'BR Pneus Araraquara',  ddlValue: '469'  },
  { key: 'BR03', label: 'BR Pneus Americana',   ddlValue: '2202' },
  { key: 'BR04', label: 'BR Pneus São Carlos',  ddlValue: '1524' },
  { key: 'PEG1', label: 'Peg Pneus Araraquara', ddlValue: '3098' },
];

const DEBUG_DIR = path.join(__dirname, '..', 'debug', 'os-proxy');

// ── Argumentos ────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  let de = null, ate = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--date' || args[i] === '--de') de = args[++i];
    if (args[i] === '--ate') ate = args[++i];
  }
  if (!de) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    de = d.toISOString().slice(0, 10);
  }
  if (!ate) ate = de;
  return { de, ate };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function isoToDisplay(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function displayToISO(display) {
  if (!display) return null;
  const [d, m, y] = display.split('/');
  return `${y}-${m}-${d}`;
}

function parseBRL(str) {
  if (!str) return 0;
  const s = str.toString().replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function ensureDebugDir() {
  try { fs.mkdirSync(DEBUG_DIR, { recursive: true }); } catch {}
}

// ── Chamada ao proxy PHP ──────────────────────────────────────────────────────

function callProxy(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const url  = new URL(PROXY_URL);
    const lib  = url.protocol === 'https:' ? https : http;

    const opts = {
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname,
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent':     'OI-Proxy-Client/1.0',
      },
      rejectUnauthorized: false,
    };

    const req = lib.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ error: `JSON parse failed: ${data.slice(0, 200)}` }); }
      });
    });
    req.setTimeout(90000, () => { req.destroy(); reject(new Error('Proxy timeout')); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Parser do HTML da Gestão Periódica (portado do coletar-os-detalhadas.js) ─

function parseOSCards(html, lojaKey) {
  // Converte HTML para texto (remove tags)
  const texto = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(tr|td|th|div|p|li|h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, '')
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n');

  const result = [];
  const rawBlocks = texto.split(/\n(?=Ordem de Servi[çc]o N[.º°]*:?\s*\d)/);

  for (const block of rawBlocks) {
    const osNumMatch = block.match(/O\.?S\.?\s*N[.º°]*:?\s*(\d+)/i);
    if (!osNumMatch) continue;
    const osNum = parseInt(osNumMatch[1], 10);
    if (!osNum) continue;

    const dataMatch        = block.match(/Data:\s*(\d{2}\/\d{2}\/\d{4})/);
    const clienteMatch     = block.match(/Cliente:\s*(.+?)(?:\t|\n|$)/m);
    const tipoMatch        = block.match(/Tipo:\s*(.+?)(?:\t|\n|$)/m);
    const veiculoMatch     = block.match(/Ve[íi]culo:\s*(.+?)(?:\t|\n|$)/m);
    const placaMatch       = block.match(/Placa:\s*(.+?)(?:\t|\n|$)/m);
    const hodometroMatch   = block.match(/Hod[ôo]metro:\s*(\d+)/);
    const anoMatch         = block.match(/Ano:\s*(\d{4})/);
    const responsavelMatch = block.match(/Respons[áa]vel:\s*(.+?)(?:\t|\n|Pesquisa|$)/m);
    const pesquisaMatch    = block.match(/Pesquisa:\s*(.+?)(?:\t|\n|$)/m);
    const obsLines         = block.match(/Observa[çc][õo]es:\s*([\s\S]*?)(?=\n\nProdutos)/m);
    const horaInicioMatch  = block.match(/(?:Hora\s+de\s+)?(?:Abertura|In[íi]cio):\s*(\d{2}:\d{2})/i);
    const horaFimMatch     = block.match(/(?:Hora\s+de\s+)?(?:Fechamento|Fim):\s*(\d{2}:\d{2})/i);
    const totalOSMatch     = block.match(/TOTAL\s+O\.S\.\s+R\$\s+([\d.,]+)\s+LB:\s*([\d.,]+)%/i);
    const servicosMatch    = block.match(/SERVI[ÇC]OS\s+R\$\s+([\d.,]+)/i);
    const produtosMatch    = block.match(/PRODUTOS\s+R\$\s+([\d.,]+)/i);

    const itens = [];
    const prodStart = block.indexOf('Produtos e Serviços');
    const pagStart  = block.indexOf('Pagamentos da OS');
    if (prodStart !== -1) {
      const itemsSection = block.slice(prodStart + 'Produtos e Serviços'.length, pagStart !== -1 ? pagStart : undefined);
      for (const line of itemsSection.split('\n')) {
        const parts = line.split('\t');
        if (parts.length < 5) continue;
        const codigo = parts[0].trim();
        if (!codigo || codigo === 'Código' || codigo === 'TOTAL' || !codigo) continue;
        const descricao = parts[1]?.trim() || '';
        if (!descricao) continue;
        itens.push({
          loja_key:       lojaKey,
          data_os:        displayToISO(dataMatch?.[1]),
          codigo,
          descricao,
          grupo:          parts[2]?.trim() || null,
          quantidade:     parseBRL(parts[3]),
          valor_total:    parseBRL(parts[4]),
          desconto_total: parseBRL(parts[5]),
          tabela_total:   parseBRL(parts[6]),
          custo_total:    parseBRL(parts[7]),
          executor:       parts[8]?.trim() || null,
        });
      }
    }

    const dataOS = displayToISO(dataMatch?.[1]);
    if (!dataOS) continue;

    result.push({
      loja_key:        lojaKey,
      os_numero:       osNum,
      data_os:         dataOS,
      hora_inicio:     horaInicioMatch?.[1] || null,
      hora_fim:        horaFimMatch?.[1] || null,
      cliente:         clienteMatch?.[1]?.trim() || null,
      tipo:            tipoMatch?.[1]?.trim() || null,
      veiculo:         veiculoMatch?.[1]?.trim() || null,
      placa:           placaMatch?.[1]?.trim() || null,
      hodometro:       hodometroMatch ? parseInt(hodometroMatch[1]) : null,
      ano:             anoMatch ? parseInt(anoMatch[1]) : null,
      responsavel:     responsavelMatch?.[1]?.trim() || null,
      pesquisa:        pesquisaMatch?.[1]?.trim() || null,
      observacoes:     obsLines?.[1]?.trim() || null,
      total_servicos:  servicosMatch  ? parseBRL(servicosMatch[1]) : 0,
      total_produtos:  produtosMatch  ? parseBRL(produtosMatch[1]) : 0,
      total_os:        totalOSMatch   ? parseBRL(totalOSMatch[1]) : 0,
      lucro_bruto_pct: totalOSMatch   ? parseFloat(totalOSMatch[2].replace(',', '.')) : null,
      scraped_at:      new Date().toISOString(),
      itens,
    });
  }
  return result;
}

// ── Salvar no Supabase ────────────────────────────────────────────────────────

async function salvarNoSupabase(supabase, osCards) {
  if (!osCards.length) return;
  let ok = 0, erros = 0;
  for (const os of osCards) {
    const { itens, ...osData } = os;
    const { data: osRow, error: osErr } = await supabase
      .from('os_vendas')
      .upsert(osData, { onConflict: 'loja_key,os_numero', ignoreDuplicates: false })
      .select('id').single();
    if (osErr) { console.error(`    ❌ OS ${os.os_numero}: ${osErr.message}`); erros++; continue; }
    if (itens.length > 0) {
      await supabase.from('os_itens').delete().eq('os_vendas_id', osRow.id);
      const itensComId = itens.map(i => ({ ...i, os_vendas_id: osRow.id }));
      const { error: ie } = await supabase.from('os_itens').insert(itensComId);
      if (ie) console.error(`    ⚠️  Itens OS ${os.os_numero}: ${ie.message}`);
    }
    ok++;
  }
  console.log(`    💾 Supabase: ${ok} OS salvas, ${erros} erros`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { de, ate } = parseArgs();
  const deDisplay   = isoToDisplay(de);
  const ateDisplay  = isoToDisplay(ate);

  console.log(`\n🔄 Coleta OS via Proxy Hostgator — ${de} a ${ate}\n`);

  if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ Falta NEXUSZ_SUPABASE_URL / KEY'); process.exit(1); }
  if (!OI_EMAIL || !OI_SENHA)         { console.error('❌ Falta OI_EMAIL / OI_SENHA');        process.exit(1); }
  if (!PROXY_SECRET)                  { console.error('❌ Falta OI_PROXY_SECRET');             process.exit(1); }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  let totalOS = 0;

  for (const loja of LOJAS) {
    console.log(`\n  ━━━ ${loja.label} (${loja.key}) ━━━`);
    try {
      const resp = await callProxy({
        token: PROXY_SECRET,
        email: OI_EMAIL,
        senha: OI_SENHA,
        de:    deDisplay,
        ate:   ateDisplay,
        loja:  loja.ddlValue,
      });

      if (resp.error) {
        console.error(`    ❌ Proxy retornou erro: ${resp.error}`);
        if (resp.html_preview) console.error(`    Preview: ${resp.html_preview}`);
        continue;
      }

      if (!resp.html) {
        console.log(`    ⚠️  Sem HTML na resposta`);
        continue;
      }

      // Debug
      ensureDebugDir();
      fs.writeFileSync(path.join(DEBUG_DIR, `${loja.key}-${de}.html`), resp.html, 'utf8');

      const osCards = parseOSCards(resp.html, loja.key);
      console.log(`    📄 ${osCards.length} OS parseadas (HTML ${resp.size} bytes)`);

      if (osCards.length > 0) {
        await salvarNoSupabase(supabase, osCards);
        totalOS += osCards.length;
      } else if (!resp.has_data) {
        console.log(`    ℹ️  Sem OS para este período/loja`);
      } else {
        console.log(`    ⚠️  HTML tem dados mas parser não encontrou OS — salvo em debug/`);
      }
    } catch (e) {
      console.error(`    ❌ Erro: ${e.message}`);
    }

    await sleep(1500);
  }

  console.log(`\n✅ Concluído — ${totalOS} OS no total\n`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
