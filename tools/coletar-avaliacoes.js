'use strict';
/**
 * tools/coletar-avaliacoes.js
 *
 * Scrapa a nota média e total de avaliações de cada loja no Google
 * e salva na tabela google_ratings do Supabase (NexusZ).
 *
 * Uso:
 *   node tools/coletar-avaliacoes.js
 *
 * Pré-requisito Supabase — criar a tabela uma vez:
 *   CREATE TABLE google_ratings (
 *     id bigserial PRIMARY KEY,
 *     loja_key text NOT NULL,
 *     loja_nome text NOT NULL,
 *     nota_media numeric(3,1),
 *     total_avaliacoes integer,
 *     coletado_em timestamptz DEFAULT now()
 *   );
 */

require('dotenv').config();
const puppeteer = require('puppeteer');

const SUPABASE_URL = process.env.NEXUSZ_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXUSZ_SUPABASE_SERVICE_ROLE_KEY;

const LOJAS = [
  { key: 'BR_ARQ1', nome: 'BR Pneus Araraquara 1', placeId: process.env.GOOGLE_PLACE_ID_BR_ARARAQUARA1 },
  { key: 'BR_ARQ2', nome: 'BR Pneus Araraquara 2', placeId: process.env.GOOGLE_PLACE_ID_BR_ARARAQUARA2 },
  { key: 'BR_SAO',  nome: 'BR Pneus São Carlos',   placeId: process.env.GOOGLE_PLACE_ID_BR_SAO_CARLOS  },
  { key: 'BR_AME',  nome: 'BR Pneus Americana',    placeId: process.env.GOOGLE_PLACE_ID_BR_AMERICANA   },
  { key: 'BR_MAR',  nome: 'BR Pneus Maringá',      placeId: process.env.GOOGLE_PLACE_ID_BR_MARINGA     },
  { key: 'PEG_SOR', nome: 'Peg Pneus Sorocaba',    placeId: process.env.GOOGLE_PLACE_ID_PEG_SOROCABA   },
  { key: 'PEG_ARQ', nome: 'Peg Pneus Araraquara',  placeId: process.env.GOOGLE_PLACE_ID_PEG_ARARAQUARA },
].filter(l => l.placeId);

async function scrapeRating(browser, loja) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1280, height: 900 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'pt-BR,pt;q=0.9' });

    // Google Maps place page — mais estável que a URL de reviews
    const url = `https://www.google.com/maps/place/?q=place_id:${loja.placeId}&hl=pt-BR`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 40000 });
    await new Promise(r => setTimeout(r, 5000));

    const result = await page.evaluate(() => {
      let nota = null;
      let total = null;

      // Padrão 1: aria-label="X,X estrelas" em qualquer elemento
      for (const el of document.querySelectorAll('[aria-label]')) {
        const lbl = el.getAttribute('aria-label') || '';
        const m = lbl.match(/([1-5][,\.]\d)\s*estrelas?/i);
        if (m) {
          const val = parseFloat(m[1].replace(',', '.'));
          if (val >= 1 && val <= 5) { nota = val; break; }
        }
      }

      // Padrão 2: span/div com o número da nota grande (ex: "4,9")
      if (!nota) {
        for (const el of document.querySelectorAll('span, div')) {
          const t = (el.textContent || '').trim();
          if (/^[1-5][,\.]\d$/.test(t)) {
            const val = parseFloat(t.replace(',', '.'));
            if (val >= 1 && val <= 5) { nota = val; break; }
          }
        }
      }

      // Padrão 3: texto da página
      if (!nota) {
        const m = document.body.innerText.match(/\b([1-5][,\.]\d)\s*(?:\(|estrelas?|de\s*5)/i);
        if (m) nota = parseFloat(m[1].replace(',', '.'));
      }

      // Total de avaliações
      // Normaliza o texto substituindo nbsp e thin-space por espaço comum
      function normNum(s) { return s.replace(/[   ⁠]/g, '').replace(/\D/g, ''); }

      // Padrão 0: aria-label em qualquer elemento (ex: "6.016 avaliações", "3,5 mil avaliações")
      for (const el of document.querySelectorAll('[aria-label]')) {
        const lbl = el.getAttribute('aria-label') || '';
        // "X,X mil"
        const mMil = lbl.match(/(\d+[,\.]\d+)\s*mil\s*avalia/i);
        if (mMil) { total = Math.round(parseFloat(mMil[1].replace(',', '.')) * 1000); break; }
        // número inteiro
        const mAria = lbl.match(/([\d][\d\s  \.,]*)\s*avalia[çc][õo]es?/i);
        if (mAria) {
          const v = parseInt(normNum(mAria[1]));
          if (v >= 10) { total = v; break; }
        }
      }

      // Padrão 1: innerText completo da página
      const bodyText = document.body.innerText.replace(/[   ]/g, ' ');

      // "(3,5 mil)" ou "(1,2 mil)"
      if (!total) {
        const m = bodyText.match(/\(\s*(\d+[,\.]\d+)\s*mil\s*\)/i);
        if (m) total = Math.round(parseFloat(m[1].replace(',', '.')) * 1000);
      }

      // "3,5 mil avaliações" (sem parênteses)
      if (!total) {
        const m = bodyText.match(/(\d+[,\.]\d+)\s*mil\s*avalia/i);
        if (m) total = Math.round(parseFloat(m[1].replace(',', '.')) * 1000);
      }

      // "X mil avaliações" (inteiro, ex: "3 mil avaliações")
      if (!total) {
        const m = bodyText.match(/\b(\d+)\s*mil\s*avalia/i);
        if (m) total = parseInt(m[1]) * 1000;
      }

      // "3.500 avaliações" / "3 500 avaliações" / "3413 avaliações"
      if (!total) {
        const m = bodyText.match(/([\d][\d\s\.,]*)\s*avalia[çc][õo]es?/i);
        if (m) {
          const v = parseInt(normNum(m[1]));
          if (v >= 10) total = v;
        }
      }

      // "(6.016)" ou "(3 413)" — ignora < 200 (DDDs, CEPs curtos)
      if (!total) {
        const allParens = bodyText.match(/\([\d\s\. ,]+\)/g) || [];
        for (const p of allParens) {
          const v = parseInt(normNum(p));
          if (v >= 200) { total = v; break; }
        }
      }

      return { nota, total };
    });

    return result;
  } finally {
    await page.close();
  }
}

async function salvarSupabase(rows) {
  const headers = {
    apikey:         SUPABASE_KEY,
    Authorization:  `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer:         'return=minimal',
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/google_ratings`, {
    method:  'POST',
    headers,
    body:    JSON.stringify(rows),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase error (${res.status}): ${body}`);
  }
}

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

  const rows = [];

  try {
    for (const loja of LOJAS) {
      try {
        console.log(`  🔍 ${loja.nome}...`);
        const { nota, total } = await scrapeRating(browser, loja);

        if (nota) {
          rows.push({
            loja_key:          loja.key,
            loja_nome:         loja.nome,
            nota_media:        nota,
            total_avaliacoes:  total,
            coletado_em:       new Date().toISOString(),
          });
          console.log(`     ✅ ${nota} ★  (${total ?? '?'} avaliações)`);
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

  if (!rows.length) {
    console.log('⚠️  Nenhuma nota coletada — Supabase não atualizado');
    return;
  }

  try {
    await salvarSupabase(rows);
    console.log(`✅ ${rows.length} avaliação(ões) salvas no Supabase`);
  } catch (err) {
    console.error('❌ Erro ao salvar:', err.message);
    process.exit(1);
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
