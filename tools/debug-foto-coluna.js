#!/usr/bin/env node
'use strict';
/**
 * debug-foto-coluna.js
 * Verifica quais produtos de pneu têm ícone de foto na coluna td[8] do OI.
 * Usa Chrome porta 9222 (já logado). Salva resultados em debug/foto-coluna-resultado.json
 */
require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_OI  = 'https://sistemaoficinainteligente.com.br';
const GRUPOS_PNEU = [
  'PNEU IMPORTADO',
  'PNEU NACIONAL',
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const OI_EMAIL = process.env.OI_EMAIL;
const OI_SENHA  = process.env.OI_SENHA;

(async () => {
  if (!OI_EMAIL || !OI_SENHA) {
    console.error('❌ OI_EMAIL ou OI_SENHA não definidos no .env');
    process.exit(1);
  }

  let browser;
  // Tenta Chrome porta 9222 primeiro
  try {
    const res = await fetch('http://localhost:9222/json/version');
    const data = await res.json();
    browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl, defaultViewport: null });
    console.log('✅ Conectado ao Chrome existente (porta 9222)');
  } catch (e) {
    // Fallback: lança novo browser headless
    console.log('ℹ️  Chrome 9222 não disponível, lançando browser headless...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-blink-features=AutomationControlled'],
      defaultViewport: { width: 1280, height: 900 },
    });
  }

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
  await page.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });
  page.on('dialog', async d => { try { await d.dismiss(); } catch (e) {} });

  // Login se necessário
  await page.goto(`${BASE_OI}/wfProdutoBusca.aspx`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(1500);
  if (page.url().includes('Entrar') || page.url().includes('Login')) {
    console.log('Fazendo login...');
    await page.goto(`${BASE_OI}/Entrar.aspx?sair=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(2000);
    await page.type('#Login1_UserName', OI_EMAIL, { delay: 40 });
    await page.type('#Login1_Password', OI_SENHA, { delay: 40 });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
      page.click('#Login1_btnEntrar'),
    ]);
    await sleep(2000);
    console.log('Login URL:', page.url());
    await page.goto(`${BASE_OI}/wfProdutoBusca.aspx`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(1500);
  }

  try {
    await page.goto(`${BASE_OI}/wfProdutoBusca.aspx`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(1500);

    if (page.url().includes('Entrar') || page.url().includes('CoreExterno')) {
      console.error('❌ Sessão expirada ou bloqueada após login.');
      await browser.close().catch(() => {}); process.exit(1);
    }

    // Lista todos os grupos de pneu disponíveis
    const todosGrupos = await page.evaluate((prefixos) => {
      const s = document.getElementById('ctl00_cph_ddlGrupoDeProduto');
      return Array.from(s?.options || [])
        .map(o => ({ value: o.value, text: o.text.trim() }))
        .filter(o => prefixos.some(p => o.text.toUpperCase().startsWith(p)));
    }, GRUPOS_PNEU);

    console.log(`Grupos de pneu encontrados: ${todosGrupos.length}`);
    todosGrupos.forEach(g => console.log(`  - ${g.text}`));

    const resultado = {
      comFoto: [],
      semFoto: 0,
      gruposVerificados: 0,
    };

    for (const grupo of todosGrupos) {
      console.log(`\n→ Verificando: ${grupo.text}`);
      resultado.gruposVerificados++;

      // Seleciona o grupo
      await page.evaluate((val) => {
        const s = document.getElementById('ctl00_cph_ddlGrupoDeProduto');
        if (s) { s.value = val; s.dispatchEvent(new Event('change', { bubbles: true })); }
      }, grupo.value);
      await sleep(800);

      // Clica em buscar
      await page.evaluate(() => {
        const btn = document.querySelector('#ctl00_cph_btnBuscar, input[id*="btnBuscar"]');
        if (btn) btn.click();
      });
      await sleep(3500);

      // Verifica coluna td[8] (coluna &nbsp; do header = câmera/foto)
      const produtosComFoto = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('#ctl00_cph_grd tr')).slice(1); // pula header
        const found = [];
        for (const tr of rows) {
          const tds = Array.from(tr.querySelectorAll('td'));
          if (tds.length < 9) continue;
          const td8 = tds[8]; // coluna &nbsp; (câmera)
          const html8 = td8.innerHTML.trim();
          if (!html8 || html8 === '&nbsp;' || html8 === ' ' || html8 === '') continue;

          // Tem algo! Captura dados do produto
          const link = tr.querySelector('a[onclick*="ProdutoID"], a[href*="ProdutoID"]');
          const src = (link?.href || '') + (link?.getAttribute('onclick') || '');
          const pid = src.match(/ProdutoID=([^&'"]+)/)?.[1];
          const eid = src.match(/EmpresaID=([^&'"]+)/)?.[1];
          const desc = tds[2]?.innerText?.trim() || '';

          found.push({
            desc,
            produtoId: pid ? decodeURIComponent(pid) : null,
            empresaId: eid ? decodeURIComponent(eid) : null,
            td8Html: html8.slice(0, 200),
          });

          if (found.length >= 10) break; // limita por grupo
        }
        return found;
      });

      const totalLinhas = await page.evaluate(() =>
        document.querySelectorAll('#ctl00_cph_grd tr').length - 1
      );

      resultado.semFoto += totalLinhas - produtosComFoto.length;

      if (produtosComFoto.length > 0) {
        console.log(`  ✅ ${produtosComFoto.length} produto(s) COM foto neste grupo!`);
        produtosComFoto.forEach(p => {
          console.log(`     ${p.desc} — td8: ${p.td8Html.slice(0, 80)}`);
        });
        resultado.comFoto.push(...produtosComFoto.map(p => ({ ...p, grupo: grupo.text })));
      } else {
        console.log(`  ○ ${totalLinhas} produtos, nenhum com ícone de foto`);
      }

      // Se já encontrou alguns, pode parar cedo
      if (resultado.comFoto.length >= 10) {
        console.log('\n⏹️  10+ produtos com foto encontrados, parando busca.');
        break;
      }
    }

    // Salva resultado
    const dir = path.join('debug');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'foto-coluna-resultado.json'), JSON.stringify(resultado, null, 2));

    console.log('\n=== RESULTADO ===');
    console.log(`Grupos verificados: ${resultado.gruposVerificados}`);
    console.log(`Produtos COM foto:  ${resultado.comFoto.length}`);
    console.log(`Produtos sem foto:  ${resultado.semFoto}`);

    if (resultado.comFoto.length > 0) {
      console.log('\nPrimeiros produtos com foto:');
      resultado.comFoto.slice(0, 5).forEach(p =>
        console.log(`  [${p.grupo}] ${p.desc}`)
      );
    } else {
      console.log('\n⚠️  NENHUM produto de pneu tem foto cadastrada no OI.');
      console.log('    Os produtos de pneu não possuem fotos — precisamos de outra fonte.');
    }

  } finally {
    await page.close().catch(() => {});
    // disconnect se conectado a existente, close se lançado por nós
    try { browser.disconnect(); } catch (e) {}
    try { await browser.close(); } catch (e) {}
  }
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
