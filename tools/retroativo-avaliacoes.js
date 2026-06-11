'use strict';
/**
 * tools/retroativo-avaliacoes.js
 *
 * Coleta o histórico COMPLETO de avaliações individuais de cada loja no Google Maps.
 * Scrola o painel de reviews até o fim e salva tudo em google_reviews.
 * Duplicatas são ignoradas pelo índice UNIQUE da tabela.
 *
 * Uso: node tools/retroativo-avaliacoes.js
 *      node tools/retroativo-avaliacoes.js --loja BR_ARQ1
 */

require('dotenv').config();
const puppeteer = require('puppeteer');

const SUPABASE_URL = process.env.NEXUSZ_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY;

const TODAS_LOJAS = [
  { key: 'BR_ARQ1', nome: 'BR Pneus Araraquara 1', placeId: process.env.GOOGLE_PLACE_ID_BR_ARARAQUARA1 },
  { key: 'BR_ARQ2', nome: 'BR Pneus Araraquara 2', placeId: process.env.GOOGLE_PLACE_ID_BR_ARARAQUARA2 },
  { key: 'BR_SAO',  nome: 'BR Pneus São Carlos',   placeId: process.env.GOOGLE_PLACE_ID_BR_SAO_CARLOS  },
  { key: 'BR_AME',  nome: 'BR Pneus Americana',    placeId: process.env.GOOGLE_PLACE_ID_BR_AMERICANA   },
  { key: 'BR_MAR',  nome: 'BR Pneus Maringá',      placeId: process.env.GOOGLE_PLACE_ID_BR_MARINGA     },
  { key: 'PEG_SOR', nome: 'Peg Pneus Sorocaba',    placeId: process.env.GOOGLE_PLACE_ID_PEG_SOROCABA   },
  { key: 'PEG_ARQ', nome: 'Peg Pneus Araraquara',  placeId: process.env.GOOGLE_PLACE_ID_PEG_ARARAQUARA },
].filter(l => l.placeId);

// Filtro por --loja via argumento
const _lojaFlagIdx = process.argv.findIndex(a => a === '--loja');
const lojaArg = process.argv.find(a => a.startsWith('--loja='))?.split('=')[1]
             ?? (_lojaFlagIdx !== -1 ? process.argv[_lojaFlagIdx + 1] : undefined);
const LOJAS = lojaArg
  ? TODAS_LOJAS.filter(l => l.key.toLowerCase() === lojaArg.toLowerCase())
  : TODAS_LOJAS;

// ─── Scroll até carregar todos os reviews ────────────────────────────────────

async function scrollReviews(page) {
  // Seletores possíveis do container de scroll de reviews
  const SCROLL_SELECTORS = [
    '.m6QErb.DxyBCb',
    '.m6QErb[aria-label]',
    '[role="feed"]',
    '.section-layout-flex-column',
  ];

  let stuckRounds = 0;
  let prevCount = 0;

  while (stuckRounds < 4) {
    // Scrola o container de reviews (não o body)
    const scrolled = await page.evaluate((selectors) => {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.scrollHeight > el.clientHeight) {
          el.scrollTop = el.scrollHeight;
          return true;
        }
      }
      // Fallback: scroll via keyboard no último item
      const items = document.querySelectorAll('.jftiEf, [data-review-id]');
      if (items.length > 0) {
        items[items.length - 1].scrollIntoView({ behavior: 'instant', block: 'end' });
        return true;
      }
      return false;
    }, SCROLL_SELECTORS);

    if (!scrolled) break;

    // Aguarda novos itens carregarem
    await new Promise(r => setTimeout(r, 2000));

    const count = await page.evaluate(() =>
      document.querySelectorAll('.jftiEf, [data-review-id]').length
    );

    if (count === prevCount) {
      stuckRounds++;
    } else {
      stuckRounds = 0;
      prevCount = count;
      process.stdout.write(`\r     ↳ ${count} reviews carregados...`);
    }
  }

  return prevCount;
}

// ─── Abrir painel de reviews ──────────────────────────────────────────────────

async function abrirPainelReviews(page) {
  // 1) Aba "Avaliações" com role=tab
  try {
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button[role="tab"], [role="tab"]')];
      const tab = btns.find(b => /avalia/i.test(b.textContent || '') || /review/i.test(b.getAttribute('aria-label') || ''));
      if (tab) tab.click();
    });
    await new Promise(r => setTimeout(r, 2000));
  } catch (_) {}

  // 2) Fallback: qualquer link/botão/span com texto "avaliações" (ex: "4.267 avaliações")
  try {
    await page.evaluate(() => {
      const els = [...document.querySelectorAll('a, button, span, div')];
      const el = els.find(e => /\d[\d\s.,]*\s*avalia[çc][õo]es?/i.test(e.textContent || ''));
      if (el) el.click();
    });
    await new Promise(r => setTimeout(r, 2000));
  } catch (_) {}
}

// ─── Extrair reviews do DOM ───────────────────────────────────────────────────

function extractReviews() {
  const reviews = [];
  const containers = document.querySelectorAll('.jftiEf, [data-review-id]');

  for (const el of containers) {
    const author = (
      el.querySelector('.d4r55')?.textContent ||
      el.querySelector('.X43Kjb')?.textContent ||
      el.querySelector('[class*="author"]')?.textContent
    )?.trim();
    if (!author) continue;

    const imgEl = el.querySelector('img.NBa7we') || el.querySelector('button img') || el.querySelector('img');
    const photo = imgEl?.src?.startsWith('http') ? imgEl.src : null;

    let rating = null;
    for (const starEl of el.querySelectorAll('[aria-label]')) {
      const lbl = starEl.getAttribute('aria-label') || '';
      const m = lbl.match(/([1-5])\s*estrelas?/i) || lbl.match(/([1-5])\s*star/i);
      if (m) { rating = parseInt(m[1]); break; }
    }

    const textEl = el.querySelector('.wiI7pd:not(.CDe7pd .wiI7pd)');
    const text = textEl?.textContent?.trim() || null;

    const timeText = el.querySelector('.rsqaWe')?.textContent?.trim() || null;

    const replyEl = el.querySelector('.CDe7pd .wiI7pd');
    const replyText = replyEl?.textContent?.trim() || null;

    reviews.push({ author, photo, rating, text, timeText, replyText });
  }

  return reviews;
}

// ─── Salvar no Supabase ───────────────────────────────────────────────────────

async function inserirUmaLinha(row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/google_reviews`, {
    method: 'POST',
    headers: {
      apikey:          SUPABASE_KEY,
      Authorization:   `Bearer ${SUPABASE_KEY}`,
      'Content-Type':  'application/json',
      Prefer:          'return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (res.status === 409 || res.status === 201 || res.status === 200) return; // ok ou duplicata
  const body = await res.text().catch(() => '');
  throw new Error(`Supabase error (${res.status}): ${body}`);
}

async function salvarLote(rows) {
  // Tenta inserir o lote todo de uma vez
  const res = await fetch(`${SUPABASE_URL}/rest/v1/google_reviews`, {
    method: 'POST',
    headers: {
      apikey:          SUPABASE_KEY,
      Authorization:   `Bearer ${SUPABASE_KEY}`,
      'Content-Type':  'application/json',
      Prefer:          'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });

  if (res.ok) return;

  if (res.status === 409) {
    // Fallback: insere um a um ignorando duplicatas individualmente
    for (const row of rows) {
      await inserirUmaLinha(row);
    }
    return;
  }

  const body = await res.text().catch(() => '');
  throw new Error(`Supabase error (${res.status}): ${body}`);
}

// ─── Scrape completo por loja ─────────────────────────────────────────────────

async function scrapeLojaCompleto(browser, loja) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1280, height: 900 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'pt-BR,pt;q=0.9' });
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    const url = `https://www.google.com/maps/place/?q=place_id:${loja.placeId}&hl=pt-BR`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

    // Aguarda a página carregar completamente
    try {
      await page.waitForFunction(
        () => document.querySelector('.lyplG') || document.querySelector('[aria-label*="estrela"]'),
        { timeout: 15000 }
      );
    } catch (_) {}

    await new Promise(r => setTimeout(r, 2000));

    // Abre o painel de reviews
    await abrirPainelReviews(page);

    // Aguarda reviews aparecerem
    try {
      await page.waitForFunction(
        () => document.querySelectorAll('.jftiEf, [data-review-id]').length > 0,
        { timeout: 12000 }
      );
    } catch (_) {}

    const totalInicial = await page.evaluate(() =>
      document.querySelectorAll('.jftiEf, [data-review-id]').length
    );

    if (totalInicial === 0) {
      console.log('\n     ⚠️  Nenhum review encontrado na página');
      return 0;
    }

    // Scrola até carregar tudo
    const totalCarregados = await scrollReviews(page);
    process.stdout.write('\n');

    // Extrai todos os reviews do DOM
    const reviews = await page.evaluate(extractReviews);

    console.log(`     ✅ ${reviews.length} reviews extraídos (${totalCarregados} visíveis no DOM)`);

    if (!reviews.length) return 0;

    // Salva em lotes de 50
    const now = new Date().toISOString();
    const LOTE = 50;
    let salvos = 0;

    for (let i = 0; i < reviews.length; i += LOTE) {
      const lote = reviews.slice(i, i + LOTE).map(rv => ({
        loja_key:     loja.key,
        loja_nome:    loja.nome,
        author_name:  rv.author,
        profile_photo: rv.photo,
        rating:       rv.rating,
        review_text:  rv.text,
        time_text:    rv.timeText,
        reply_text:   rv.replyText,
        coletado_em:  now,
      }));

      await salvarLote(lote);
      salvos += lote.length;
      process.stdout.write(`\r     💾 Salvos: ${salvos}/${reviews.length}...`);
    }
    process.stdout.write('\n');

    return reviews.length;

  } finally {
    await page.close();
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ NEXUSZ_SUPABASE_URL / NEXUSZ_SUPABASE_SERVICE_ROLE_KEY não configurados no .env');
    process.exit(1);
  }
  if (!LOJAS.length) {
    if (lojaArg) {
      console.error(`❌ Loja "${lojaArg}" não encontrada. Chaves disponíveis: ${TODAS_LOJAS.map(l => l.key).join(', ')}`);
    } else {
      console.error('❌ Nenhum GOOGLE_PLACE_ID configurado no .env');
    }
    process.exit(1);
  }

  console.log(`\n⭐ Retroativo de avaliações — ${LOJAS.length} loja(s)\n`);
  console.log('  (pode levar vários minutos dependendo do volume de reviews)\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1280,900',
    ],
  });

  let totalGeral = 0;

  try {
    for (const loja of LOJAS) {
      console.log(`\n📍 ${loja.nome}`);
      try {
        const count = await scrapeLojaCompleto(browser, loja);
        totalGeral += count;
      } catch (err) {
        console.error(`   ❌ Erro: ${err.message}`);
      }
      // Pausa entre lojas para não ser bloqueado
      if (LOJAS.indexOf(loja) < LOJAS.length - 1) {
        console.log('   ⏳ Aguardando 5s antes da próxima loja...');
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\n✅ Concluído — ${totalGeral} reviews salvos (duplicatas ignoradas automaticamente)\n`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
