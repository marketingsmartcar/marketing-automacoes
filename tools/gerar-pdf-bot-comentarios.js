'use strict';
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../knowledge/bot-comentarios-peg-pneus.json'), 'utf8'));

const categoryIcons = {
  preco: '💰',
  localizacao: '📍',
  horario: '⏰',
  servicos: '🔧',
  atacado_revenda: '🏭',
  estoque_disponibilidade: '📦',
  interesse_compra: '🛒',
  marcacao_amigos: '👥',
  elogios_feedback: '⭐',
  pagamento: '💳',
  frete_entrega: '🚚',
  garantia: '✅',
  contato_whatsapp: '📲',
  agendamento: '📅',
  negativos_reclamacao: '⚠️',
  duvidas_gerais: '❓',
};

function buildHtml() {
  const cats = Object.entries(data.categorias);

  const categorySections = cats.map(([key, cat]) => {
    const icon = categoryIcons[key] || '•';
    const resposta = data.respostas_sugeridas[key] || '';
    const isEscalar = resposta === 'ESCALAR_PARA_HUMANO';

    // Group gatilhos into columns
    const gatilhos = cat.gatilhos || [];
    const frases = cat.frases_completas || [];

    const gatilhoChips = gatilhos.map(g =>
      `<span class="chip">${g}</span>`
    ).join('');

    const frasesHtml = frases.map(f =>
      `<li>${f}</li>`
    ).join('');

    const respostaHtml = isEscalar
      ? `<div class="resposta escalate">⚠️ Escalar para atendente humano imediatamente</div>`
      : `<div class="resposta"><strong>Resposta automática sugerida:</strong><br>${resposta.replace(/\n/g, '<br>')}</div>`;

    return `
      <div class="category ${isEscalar ? 'category-danger' : ''}">
        <div class="category-header">
          <span class="category-icon">${icon}</span>
          <span class="category-title">${cat.label}</span>
          <span class="category-count">${gatilhos.length} gatilhos</span>
        </div>

        <div class="section-label">Palavras e variações detectadas:</div>
        <div class="chips">${gatilhoChips}</div>

        ${frases.length ? `
        <div class="section-label">Frases completas:</div>
        <ul class="frases">${frasesHtml}</ul>
        ` : ''}

        ${respostaHtml}
      </div>
    `;
  }).join('');

  const totalGatilhos = cats.reduce((acc, [, cat]) => acc + (cat.gatilhos || []).length, 0);
  const totalFrases = cats.reduce((acc, [, cat]) => acc + (cat.frases_completas || []).length, 0);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: #1a1a1a; background: #fff; }

  .cover {
    background: linear-gradient(135deg, #0d0d0d 0%, #1a2e1a 100%);
    color: #fff;
    padding: 60px 50px;
    min-height: 220px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    page-break-after: always;
  }
  .cover-logo {
    background: #44C52A;
    color: #fff;
    font-size: 22px;
    font-weight: 900;
    padding: 10px 20px;
    display: inline-block;
    margin-bottom: 20px;
    letter-spacing: 1px;
  }
  .cover h1 { font-size: 26px; font-weight: 800; margin-bottom: 8px; color: #44C52A; }
  .cover h2 { font-size: 14px; font-weight: 400; color: #ccc; margin-bottom: 24px; }
  .cover-stats { display: flex; gap: 30px; margin-top: 20px; }
  .cover-stat { text-align: center; }
  .cover-stat .num { font-size: 32px; font-weight: 900; color: #44C52A; }
  .cover-stat .lbl { font-size: 10px; color: #aaa; text-transform: uppercase; letter-spacing: 1px; }

  .toc { padding: 30px 40px; page-break-after: always; }
  .toc h2 { font-size: 16px; font-weight: 700; color: #0d0d0d; border-bottom: 3px solid #44C52A; padding-bottom: 8px; margin-bottom: 16px; }
  .toc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .toc-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #f8f8f8; border-radius: 6px; border-left: 3px solid #44C52A; }
  .toc-item .toc-icon { font-size: 14px; }
  .toc-item .toc-name { font-size: 10px; font-weight: 600; }
  .toc-item .toc-count { margin-left: auto; font-size: 9px; color: #666; background: #44C52A22; padding: 2px 6px; border-radius: 10px; }

  .content { padding: 20px 30px; }

  .category {
    border: 1px solid #e8e8e8;
    border-radius: 10px;
    margin-bottom: 20px;
    overflow: hidden;
    page-break-inside: avoid;
  }
  .category-danger { border-color: #ff4444; }

  .category-header {
    background: #0d0d0d;
    color: #fff;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .category-danger .category-header { background: #cc0000; }
  .category-icon { font-size: 16px; }
  .category-title { font-size: 12px; font-weight: 700; flex: 1; }
  .category-count { font-size: 9px; background: #44C52A; color: #fff; padding: 2px 8px; border-radius: 10px; }
  .category-danger .category-count { background: #ff6666; }

  .section-label {
    font-size: 9px;
    font-weight: 700;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    padding: 8px 16px 4px;
    background: #fafafa;
  }

  .chips {
    padding: 8px 16px 10px;
    background: #fafafa;
    border-bottom: 1px solid #eee;
    line-height: 1.8;
  }
  .chip {
    display: inline-block;
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 1px 6px;
    margin: 2px 2px;
    font-size: 8.5px;
    font-family: monospace;
    color: #333;
  }

  .frases {
    padding: 8px 16px 10px 30px;
    background: #fff;
    border-bottom: 1px solid #eee;
  }
  .frases li {
    font-size: 9.5px;
    color: #333;
    margin-bottom: 3px;
    font-style: italic;
  }

  .resposta {
    background: #f0faf0;
    border-top: 2px solid #44C52A;
    padding: 10px 16px;
    font-size: 9.5px;
    line-height: 1.6;
    color: #1a1a1a;
  }
  .resposta.escalate {
    background: #fff0f0;
    border-top: 2px solid #ff4444;
    color: #cc0000;
    font-weight: 700;
    font-size: 10px;
  }

  .footer {
    text-align: center;
    padding: 20px;
    color: #999;
    font-size: 8px;
    border-top: 1px solid #eee;
    margin-top: 20px;
  }

  @media print {
    .cover { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .category-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

<div class="cover">
  <div class="cover-logo">PEG PNEUS ATACAREJO</div>
  <h1>Bot de Resposta Automática</h1>
  <h2>Mapa completo de palavras, variações e frases para comentários no Instagram, Facebook e TikTok</h2>
  <div class="cover-stats">
    <div class="cover-stat">
      <div class="num">${cats.length}</div>
      <div class="lbl">Categorias</div>
    </div>
    <div class="cover-stat">
      <div class="num">${totalGatilhos}</div>
      <div class="lbl">Gatilhos</div>
    </div>
    <div class="cover-stat">
      <div class="num">${totalFrases}</div>
      <div class="lbl">Frases Completas</div>
    </div>
    <div class="cover-stat">
      <div class="num">2</div>
      <div class="lbl">Unidades</div>
    </div>
  </div>
</div>

<div class="toc">
  <h2>Índice de Categorias</h2>
  <div class="toc-grid">
    ${cats.map(([key, cat]) => `
      <div class="toc-item">
        <span class="toc-icon">${categoryIcons[key] || '•'}</span>
        <span class="toc-name">${cat.label}</span>
        <span class="toc-count">${(cat.gatilhos || []).length} gatilhos</span>
      </div>
    `).join('')}
  </div>
</div>

<div class="content">
  ${categorySections}
</div>

<div class="footer">
  Peg Pneus Atacarejo — O primeiro atacarejo de pneus do Brasil | Araraquara (16) 3322-5634 | Sorocaba (15) 3191-1031 | Gerado em ${new Date().toLocaleDateString('pt-BR')}
</div>

</body>
</html>`;
}

async function main() {
  const html = buildHtml();
  const htmlPath = path.join(__dirname, '../output/bot-comentarios-peg-pneus.html');
  const pdfPath  = path.join(__dirname, '../output/bot-comentarios-peg-pneus.pdf');

  fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log('HTML gerado:', htmlPath);

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    margin: { top: '15mm', bottom: '15mm', left: '12mm', right: '12mm' },
    printBackground: true,
  });
  await browser.close();

  const size = (fs.statSync(pdfPath).size / 1024).toFixed(0);
  console.log(`✅ PDF gerado: ${pdfPath} (${size} KB)`);
}

main().catch(e => { console.error(e); process.exit(1); });
