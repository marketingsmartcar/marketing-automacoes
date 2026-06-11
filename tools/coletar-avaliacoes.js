'use strict';
/**
 * tools/coletar-avaliacoes.js
 *
 * Coleta nota média, total de avaliações E reviews individuais de cada loja
 * no Google Maps e salva nas tabelas google_ratings e google_reviews do Supabase.
 */

require('dotenv').config();
const puppeteer = require('puppeteer');

const SUPABASE_URL = process.env.NEXUSZ_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY;

const LOJAS = [
  {
    key: 'BR_ARQ1', nome: 'BR Pneus Araraquara 1',
    placeId: process.env.GOOGLE_PLACE_ID_BR_ARARAQUARA1,
    // URL direta para o painel de avaliações (mais confiável que place_id para esta loja)
    mapsUrl: 'https://www.google.com/maps/place/BR+PNEUS+ARARAQUARA+LOJA+1/@-21.7984819,-48.1722341,19z/data=!4m16!1m9!4m8!1m0!1m6!1m2!1s0x94b8f3ecc056244d:0xbba9d8939ec7368e!2sBR+PNEUS+ARARAQUARA+LOJA+1,+Av.+Genaro+Vonno,+10+-+Vila+Furlan,+Araraquara+-+SP,+14807-008!2m2!1d-48.1710432!2d-21.7984819!3m5!1s0x94b8f3ecc056244d:0xbba9d8939ec7368e!8m2!3d-21.7984819!4d-48.1710432!16s%2Fg%2F11ddzh8ydv?entry=ttu&hl=pt-BR',
  },
  { key: 'BR_ARQ2', nome: 'BR Pneus Araraquara 2', placeId: process.env.GOOGLE_PLACE_ID_BR_ARARAQUARA2 },
  { key: 'BR_SAO',  nome: 'BR Pneus São Carlos',   placeId: process.env.GOOGLE_PLACE_ID_BR_SAO_CARLOS  },
  { key: 'BR_AME',  nome: 'BR Pneus Americana',    placeId: process.env.GOOGLE_PLACE_ID_BR_AMERICANA   },
  { key: 'BR_MAR',  nome: 'BR Pneus Maringá',      placeId: process.env.GOOGLE_PLACE_ID_BR_MARINGA     },
  { key: 'PEG_SOR', nome: 'Peg Pneus Sorocaba',    placeId: process.env.GOOGLE_PLACE_ID_PEG_SOROCABA   },
  { key: 'PEG_ARQ', nome: 'Peg Pneus Araraquara',  placeId: process.env.GOOGLE_PLACE_ID_PEG_ARARAQUARA },
].filter(l => l.placeId);

// ─── Scrape rating + reviews ──────────────────────────────────────────────────

async function scrapeLoja(browser, loja) {
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

    const url = loja.mapsUrl ?? `https://www.google.com/maps/place/?q=place_id:${loja.placeId}&hl=pt-BR`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 40000 });

    // Aguarda nota aparecer
    let loaded = false;
    try {
      await page.waitForFunction(
        () => { const el = document.querySelector('.lyplG'); return el && el.textContent.trim().length > 0; },
        { timeout: 15000 }
      );
      loaded = true;
    } catch (_) {}

    if (!loaded) {
      await page.evaluate(() => window.scrollBy(0, 400));
      try {
        await page.waitForFunction(
          () => [...document.querySelectorAll('[aria-label]')].some(e => /avalia/i.test(e.getAttribute('aria-label') || '')),
          { timeout: 8000 }
        );
      } catch (_) {}
    }

    // Aguarda reviews carregarem
    try {
      await page.waitForFunction(
        () => document.querySelectorAll('.jftiEf, [data-review-id]').length > 0,
        { timeout: 8000 }
      );
    } catch (_) {}

    const result = await page.evaluate(() => {
      let nota = null;
      let total = null;

      // ── Nota ─────────────────────────────────────────────────────────────────
      for (const el of document.querySelectorAll('[aria-label]')) {
        const lbl = el.getAttribute('aria-label') || '';
        const m = lbl.match(/([1-5][,\.]\d)\s*estrelas?/i);
        if (m) {
          const val = parseFloat(m[1].replace(',', '.'));
          if (val >= 1 && val <= 5) { nota = val; break; }
        }
      }
      if (!nota) {
        for (const el of document.querySelectorAll('span, div')) {
          const t = (el.textContent || '').trim();
          if (/^[1-5][,\.]\d$/.test(t)) {
            const val = parseFloat(t.replace(',', '.'));
            if (val >= 1 && val <= 5) { nota = val; break; }
          }
        }
      }

      // ── Total ─────────────────────────────────────────────────────────────────
      function normNum(s) { return s.replace(/[   ⁠]/g, '').replace(/\D/g, ''); }

      // Seletores diretos do Maps para total de avaliações
      const TOTAL_SELS = ['.lyplG', '.jANrlb .fontBodySmall', '.DkEaL', '.gm2-body-2'];
      for (const sel of TOTAL_SELS) {
        if (total) break;
        const t = (document.querySelector(sel)?.textContent || '').trim();
        if (t) { const v = parseInt(normNum(t)); if (v >= 10) total = v; }
      }

      for (const el of document.querySelectorAll('[aria-label]')) {
        if (total) break;
        const lbl = el.getAttribute('aria-label') || '';
        const mMil = lbl.match(/(\d+[,\.]\d+)\s*mil\s*avalia/i);
        if (mMil) { total = Math.round(parseFloat(mMil[1].replace(',', '.')) * 1000); break; }
        const mAria = lbl.match(/([\d][\d\s  \.,]*)\s*avalia[çc][õo]es?/i);
        if (mAria) { const v = parseInt(normNum(mAria[1])); if (v >= 10) { total = v; break; } }
        // Formato inglês: "6,048 reviews"
        const mEn = lbl.match(/([\d][\d\s,]*)\s*review/i);
        if (mEn) { const v = parseInt(normNum(mEn[1])); if (v >= 10) { total = v; break; } }
      }
      if (!total) {
        const bodyText = document.body.innerText.replace(/[   ]/g, ' ');
        const mMil = bodyText.match(/\(\s*(\d+[,\.]\d+)\s*mil\s*\)/i);
        if (mMil) total = Math.round(parseFloat(mMil[1].replace(',', '.')) * 1000);
        if (!total) {
          const m = bodyText.match(/([\d][\d\s\.,]*)\s*avalia[çc][õo]es?/i);
          if (m) { const v = parseInt(normNum(m[1])); if (v >= 10) total = v; }
        }
        // Fallback: padrão (NÚMERO) com pelo menos 3 dígitos (ex: "(6.048)")
        if (!total) {
          const mP = bodyText.match(/\(([1-9][\d.,\s]{2,})\)/);
          if (mP) { const v = parseInt(normNum(mP[1])); if (v >= 10) total = v; }
        }
      }

      // ── Reviews individuais ───────────────────────────────────────────────────
      const reviews = [];
      const containers = document.querySelectorAll('.jftiEf, [data-review-id]');

      for (const el of containers) {
        // Author name
        const author = (
          el.querySelector('.d4r55')?.textContent ||
          el.querySelector('.X43Kjb')?.textContent ||
          el.querySelector('[class*="author"]')?.textContent
        )?.trim();
        if (!author) continue;

        // Profile photo
        const imgEl = el.querySelector('img.NBa7we') || el.querySelector('button img') || el.querySelector('img');
        const photo = imgEl?.src?.startsWith('http') ? imgEl.src : null;

        // Stars
        let rating = null;
        for (const starEl of el.querySelectorAll('[aria-label]')) {
          const lbl = starEl.getAttribute('aria-label') || '';
          const m = lbl.match(/([1-5])\s*estrelas?/i) || lbl.match(/([1-5])\s*star/i);
          if (m) { rating = parseInt(m[1]); break; }
        }

        // Review text — pode ter botão "mais" que trunca
        const textEl = el.querySelector('.wiI7pd:not(.CDe7pd .wiI7pd)');
        const text = textEl?.textContent?.trim() || null;

        // Time
        const timeText = el.querySelector('.rsqaWe')?.textContent?.trim() || null;

        // Reply (proprietário)
        const replyEl = el.querySelector('.CDe7pd .wiI7pd');
        const replyText = replyEl?.textContent?.trim() || null;

        reviews.push({ author, photo, rating, text, timeText, replyText });
        if (reviews.length >= 10) break;
      }

      return { nota, total, reviews };
    });

    return result;
  } finally {
    await page.close();
  }
}

// ─── Salvar Supabase ──────────────────────────────────────────────────────────

async function salvarSupabase(endpoint, rows, upsert = false) {
  const headers = {
    apikey:         SUPABASE_KEY,
    Authorization:  `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer:         upsert ? 'resolution=ignore-duplicates,return=minimal' : 'return=minimal',
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    method:  'POST',
    headers,
    body:    JSON.stringify(rows),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase error (${res.status}): ${body}`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ NEXUSZ_SUPABASE_URL / NEXUSZ_SUPABASE_SERVICE_ROLE_KEY não configurados');
    process.exit(1);
  }
  if (!LOJAS.length) {
    console.warn('⚠️  Nenhum GOOGLE_PLACE_ID configurado no .env');
    return;
  }

  console.log(`⭐ Coletando avaliações Google de ${LOJAS.length} loja(s)...`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  const ratingRows  = [];
  const reviewRows  = [];
  const now         = new Date().toISOString();

  try {
    for (const loja of LOJAS) {
      try {
        console.log(`  🔍 ${loja.nome}...`);
        const { nota, total, reviews } = await scrapeLoja(browser, loja);

        if (nota) {
          ratingRows.push({
            loja_key:         loja.key,
            loja_nome:        loja.nome,
            nota_media:       nota,
            total_avaliacoes: total,
            coletado_em:      now,
          });
          console.log(`     ✅ ${nota} ★  (${total ?? '?'} avaliações) | ${reviews.length} reviews`);

          for (const rv of reviews) {
            reviewRows.push({
              loja_key:    loja.key,
              loja_nome:   loja.nome,
              author_name: rv.author,
              profile_photo: rv.photo,
              rating:      rv.rating,
              review_text: rv.text,
              time_text:   rv.timeText,
              reply_text:  rv.replyText,
              coletado_em: now,
            });
          }
        } else {
          console.log(`     ⚠️  Nota não encontrada`);
        }
      } catch (err) {
        console.error(`     ❌ ${loja.nome}: ${err.message}`);
      }
    }
  } finally {
    await browser.close();
  }

  if (!ratingRows.length) {
    console.log('⚠️  Nenhuma nota coletada — Supabase não atualizado');
    return;
  }

  try {
    await salvarSupabase('google_ratings', ratingRows);
    console.log(`✅ ${ratingRows.length} nota(s) salva(s)`);
  } catch (err) {
    console.error('❌ Erro ao salvar ratings:', err.message);
    process.exit(1);
  }

  if (reviewRows.length) {
    try {
      // upsert com ignore-duplicates (UNIQUE index em loja_key+author+rating+text)
      await salvarSupabase('google_reviews', reviewRows, true);
      console.log(`✅ ${reviewRows.length} review(s) salvo(s) (duplicatas ignoradas)`);
    } catch (err) {
      // Falha em reviews não impede a execução
      console.warn('⚠️  Erro ao salvar reviews (não crítico):', err.message);
    }
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
