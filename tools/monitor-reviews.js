'use strict';

require('dotenv').config();

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─── Config ────────────────────────────────────────────────────────────────────

const LOJAS = [
  { nome: 'BR Pneus Araraquara 1', placeId: process.env.GOOGLE_PLACE_ID_BR_ARARAQUARA1 },
  { nome: 'BR Pneus Araraquara 2', placeId: process.env.GOOGLE_PLACE_ID_BR_ARARAQUARA2 },
  { nome: 'BR Pneus São Carlos',   placeId: process.env.GOOGLE_PLACE_ID_BR_SAO_CARLOS  },
  { nome: 'BR Pneus Americana',    placeId: process.env.GOOGLE_PLACE_ID_BR_AMERICANA   },
  { nome: 'BR Pneus Jaú',          placeId: process.env.GOOGLE_PLACE_ID_BR_JAU         },
  { nome: 'BR Pneus Ibitinga',     placeId: process.env.GOOGLE_PLACE_ID_BR_IBITINGA    },
  { nome: 'BR Pneus Maringá',      placeId: process.env.GOOGLE_PLACE_ID_BR_MARINGA     },
  { nome: 'Peg Pneus Sorocaba',    placeId: process.env.GOOGLE_PLACE_ID_PEG_SOROCABA   },
  { nome: 'Peg Pneus Araraquara',  placeId: process.env.GOOGLE_PLACE_ID_PEG_ARARAQUARA },
].filter(l => l.placeId);

const RATING_NEGATIVO = parseInt(process.env.REVIEWS_RATING_NEGATIVO || '3', 10);
const STATE_FILE = path.join(__dirname, '..', 'output', 'relatorios', 'reviews-state.json');

// ─── Estado ───────────────────────────────────────────────────────────────────

function carregarEstado() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return {}; }
}

function salvarEstado(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

// ID estável por review = hash de autor + nota + primeiras 60 letras do texto
function reviewHash(r) {
  const str = `${r.author}|${r.rating}|${r.text.slice(0, 60)}`;
  return crypto.createHash('md5').update(str).digest('hex').slice(0, 12);
}

// ─── Scraping ─────────────────────────────────────────────────────────────────

async function scrapeReviewsLoja(browser, loja) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'pt-BR,pt;q=0.9' });

    const url = `https://search.google.com/local/reviews?placeid=${loja.placeId}&hl=pt-BR`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2500));

    const reviews = await page.evaluate(() => {
      const results = [];

      document.querySelectorAll('[aria-label*="Avaliado com"]').forEach(starEl => {
        const label = starEl.getAttribute('aria-label') || '';
        const ratingMatch = label.match(/([\d,]+)\s*de\s*5/);
        if (!ratingMatch) return;
        const rating = Math.round(parseFloat(ratingMatch[1].replace(',', '.')));

        // Sobe na árvore para encontrar o bloco pai com o texto completo
        let container = starEl;
        for (let i = 0; i < 8; i++) {
          container = container.parentElement;
          if (!container) break;
          if ((container.innerText || '').length > 40) break;
        }

        const lines = (container?.innerText || '').split('\n')
          .map(l => l.trim()).filter(Boolean);

        // Extrai campos da estrutura de linhas
        const author = lines[0] || 'Anônimo';
        // Linha de data: contém "atrás", "semana", "mês", "ano", "dias"
        const dataLinha = lines.find(l => /atrás|semana|dia|mês|mes|ano|hora|minuto/i.test(l)) || '';
        // Texto da avaliação: tudo que não é autor, perfil, data ou emoji
        const textLines = lines.filter(l =>
          l !== author &&
          !/atrás|semana|dia|mês|mes|ano|hora|minuto|avalia|foto|local guide|passe o cursor|reagir/i.test(l) &&
          !/^[👍❤️🙏😊✨🎉]+\d*$/.test(l) &&
          l.length > 3
        );
        const text = textLines.join(' ').replace(/…Mais$/, '').trim();

        if (author) {
          results.push({ rating, author, date: dataLinha, text });
        }
      });

      return results;
    });

    return reviews;
  } finally {
    await page.close();
  }
}

// ─── Verificar reviews negativas novas ───────────────────────────────────────

async function verificarReviewsNegativas() {
  if (!LOJAS.length) {
    console.warn('⚠️  Nenhum GOOGLE_PLACE_ID configurado no .env');
    return [];
  }

  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox', '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  // Esconde detecção de headless
  await browser.defaultBrowserContext();
  const estado  = carregarEstado();
  const alertas = [];

  try {
    for (const loja of LOJAS) {
      try {
        console.log(`  🔍 ${loja.nome}...`);
        const reviews = await scrapeReviewsLoja(browser, loja);

        if (!reviews.length) {
          console.log(`     ⚠️  Sem reviews encontradas`);
          continue;
        }

        const seenHashes = new Set(estado[loja.nome]?.seenHashes || []);
        const isInicial  = seenHashes.size === 0;

        const novas = reviews.filter(r => {
          const h = reviewHash(r);
          return !seenHashes.has(h) && r.rating <= RATING_NEGATIVO;
        });

        // Atualiza estado com todos os hashes vistos (mantém últimos 200)
        const todosHashes = [
          ...new Set([...seenHashes, ...reviews.map(reviewHash)])
        ].slice(-200);
        estado[loja.nome] = { seenHashes: todosHashes, lastCheck: new Date().toISOString() };

        // Na primeira execução registra sem alertar (inicialização do estado)
        if (!isInicial) {
          novas.forEach(r => alertas.push({ loja: loja.nome, ...r }));
        }

        console.log(`     ✅ ${reviews.length} reviews | ${isInicial ? 'primeira execução (estado salvo)' : novas.length + ' novas negativas'}`);
      } catch (err) {
        console.error(`     ❌ ${loja.nome}: ${err.message}`);
      }

      // Pausa entre lojas para não parecer bot
      await new Promise(r => setTimeout(r, 3000 + Math.random() * 2000));
    }
  } finally {
    await browser.close();
  }

  salvarEstado(estado);
  return alertas;
}

// ─── Formatar alerta ──────────────────────────────────────────────────────────

function estrelas(n) {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

function gerarSugestaoResposta(rating, texto) {
  const t = (texto || '').toLowerCase();

  // Detecta temas comuns no texto da avaliação
  const temaAtendimento = /atendimento|atendente|mal|grosso|educad|demor|espera|fila/i.test(t);
  const temaPreco       = /caro|preço|cobr|salgad|abusivo|valor/i.test(t);
  const temaServico     = /serviço|qualidade|borracha|pneu|alinhament|balanc|óleo|troca|conserto/i.test(t);
  const temaPrazo       = /demor|prazo|hora|demorou|tempo|esperei/i.test(t);
  const semTexto        = !texto || texto.length < 5;

  let base = '';

  if (semTexto) {
    base = rating === 1
      ? `Prezado(a) {NOME}, lamentamos muito pela experiência insatisfatória. Gostaríamos de entender melhor o que aconteceu para corrigir. Por favor, entre em contato pelo nosso WhatsApp ou ligue 0800 942 4402 para que possamos resolver.`
      : `Prezado(a) {NOME}, agradecemos seu retorno. Sentimos que sua experiência poderia ter sido melhor. Entre em contato conosco pelo 0800 942 4402 e teremos prazer em ouvi-lo(a).`;
  } else if (temaAtendimento) {
    base = `Prezado(a) {NOME}, pedimos desculpas pela experiência com nosso atendimento — isso não reflete nossos padrões. Transmitiremos seu feedback à equipe. Por favor, fale conosco pelo 0800 942 4402 ou WhatsApp para que possamos compensar sua visita.`;
  } else if (temaPrazo) {
    base = `Prezado(a) {NOME}, entendemos sua frustração com o tempo de espera e pedimos desculpas. Estamos sempre buscando melhorar nossa agilidade. Ligue para nós pelo 0800 942 4402 para agendarmos seu próximo atendimento com prioridade.`;
  } else if (temaPreco) {
    base = `Prezado(a) {NOME}, agradecemos seu comentário. Trabalhamos para oferecer os melhores preços do mercado com compra direta dos fabricantes. Gostaria de conhecer nossas condições de parcelamento em até 18x? Entre em contato: 0800 942 4402.`;
  } else if (temaServico) {
    base = `Prezado(a) {NOME}, pedimos desculpas pela insatisfação com o serviço. Isso não é o padrão que prezamos. Por favor, entre em contato pelo 0800 942 4402 para que possamos analisar o caso e resolver da melhor forma.`;
  } else {
    base = `Prezado(a) {NOME}, lamentamos que sua experiência não tenha sido positiva. Valorizamos muito seu feedback e gostaríamos de entender melhor o ocorrido. Entre em contato pelo 0800 942 4402 ou no WhatsApp para resolvermos juntos.`;
  }

  return base.replace('{NOME}', '[nome do cliente]');
}

function formatarAlertaReview(alerta) {
  const stars = estrelas(alerta.rating);
  const quando = alerta.date ? `\n🕐 _${alerta.date}_` : '';
  const texto = alerta.text
    ? `\n💬 _"${alerta.text.slice(0, 400)}${alerta.text.length > 400 ? '...' : ''}"_`
    : '';

  const sugestao = gerarSugestaoResposta(alerta.rating, alerta.text);

  return (
    `⚠️ *Avaliação negativa — ${alerta.loja}*\n` +
    `${stars} *${alerta.rating} estrela${alerta.rating !== 1 ? 's' : ''}*\n` +
    `👤 *${alerta.author}*` +
    quando +
    texto +
    `\n\n💡 *Sugestão de resposta:*\n_"${sugestao}"_` +
    `\n\n_Responda em: business.google.com_`
  );
}

// ─── Status ───────────────────────────────────────────────────────────────────

function statusConfig() {
  const estado = carregarEstado();
  let out = `🔍 *Monitor de Avaliações Google*\n_(via Puppeteer — sem API key)_\n\n`;
  out += `Lojas monitoradas: *${LOJAS.length}/9*\n\n`;

  LOJAS.forEach(l => {
    const ult = estado[l.nome]?.lastCheck;
    const quando = ult
      ? new Date(ult).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      : 'nunca verificado';
    out += `  ✅ ${l.nome} _(${quando})_\n`;
  });

  const semId = [
    'BR Pneus Araraquara 1','BR Pneus Araraquara 2','BR Pneus São Carlos',
    'BR Pneus Americana','BR Pneus Jaú','BR Pneus Ibitinga','BR Pneus Maringá',
    'Peg Pneus Sorocaba','Peg Pneus Araraquara',
  ].filter(n => !LOJAS.find(l => l.nome === n));

  if (semId.length) {
    out += `\n*Sem Place ID:*\n` + semId.map(n => `  ⬜ ${n}`).join('\n');
  }

  out += `\n\n_Verificação automática a cada 2h._`;
  return out.trim();
}

module.exports = { verificarReviewsNegativas, formatarAlertaReview, statusConfig, LOJAS };

// ─── CLI standalone ───────────────────────────────────────────────────────────

if (require.main === module) {
  console.log('🔍 Verificando avaliações negativas em todas as lojas...\n');
  verificarReviewsNegativas()
    .then(alertas => {
      if (!alertas.length) return console.log('\n✅ Nenhuma avaliação negativa nova.');
      console.log(`\n⚠️  ${alertas.length} alerta(s):`);
      alertas.forEach(a => console.log('\n' + formatarAlertaReview(a)));
    })
    .catch(err => console.error('❌', err.message));
}
