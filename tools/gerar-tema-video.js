#!/usr/bin/env node
/**
 * gerar-tema-video.js
 * BR Pneus & Oficina — Gerador de Tema Semanal para Vídeos das Lojas
 *
 * Uso direto:
 *   node tools/gerar-tema-video.js
 *   node tools/gerar-tema-video.js output/criativos/tema-semana-18.png
 *
 * Como módulo:
 *   const { gerarImagemTema, getTemaDoAno, getSemanaAtual, TEMAS } = require('./tools/gerar-tema-video');
 */

const path     = require('path');
const fs       = require('fs');
const os       = require('os');
const { execSync } = require('child_process');

// ── Array de temas (26 temas = 6 meses de rotação) ────────────────────────────
const TEMAS = [
  {
    titulo: 'PNEU COM BOLHA OU HÉRNIA',
    cenario: 'Na área de montagem, pneu desmontado na bancada ou no chão',
    oQueGravar: 'A bolha visível na lateral do pneu, mostrando com a mão',
    acao: 'Apertar levemente a bolha com o polegar e apontar para ela',
    roteiro: '"Olha isso aqui — essa bolha no pneu é uma bomba-relógio. A qualquer momento pode estourar com o carro em movimento. Vem aqui na BR Pneus antes que aconteça algo sério."',
    gatilho: 'Medo e urgência — risco imediato à segurança da família',
  },
  {
    titulo: 'PARAFUSO SOLTO NA SUSPENSÃO',
    cenario: 'Carro elevado no elevador, mecânico embaixo com a câmera',
    oQueGravar: 'O parafuso com folga visível na suspensão, movendo com a mão',
    acao: 'Mexer o componente para mostrar a folga e depois reapertar',
    roteiro: '"Esse parafuso aqui tava solto — dava pra mexer com a mão. Se deixar assim, o carro pode perder o controle na estrada. Você sabia que o seu pode ter isso também?"',
    gatilho: 'Medo e culpa — o cliente não sabia e o risco era real',
  },
  {
    titulo: 'PNEU DESGASTANDO POR DENTRO',
    cenario: 'Pneu desmontado na bancada com a parte interna voltada para a câmera',
    oQueGravar: 'O desgaste irregular na borda interna, contrastando com a parte externa ok',
    acao: 'Passar o dedo na área desgastada e comparar com o lado bom',
    roteiro: '"Olha o desgaste por dentro — isso acontece quando o alinhamento tá errado. O pneu parece novo por fora, mas tá morto por dentro. Alinhamento resolve. Chama a gente."',
    gatilho: 'Economia — o cliente acha que o pneu está bom, mas está perdendo dinheiro',
  },
  {
    titulo: 'AMORTECEDOR VAZANDO ÓLEO',
    cenario: 'Carro no elevador, câmera focada no amortecedor traseiro ou dianteiro',
    oQueGravar: 'A mancha de óleo escorrendo pela haste do amortecedor',
    acao: 'Passar o dedo no óleo e mostrar para a câmera',
    roteiro: '"Tá vendo esse óleo aqui? O amortecedor tá vazando. Isso significa que o carro não absorve mais os buracos direito — e o desgaste no pneu acelera. Bora resolver?"',
    gatilho: 'Dano em cascata — um problema barato vira dois problemas caros',
  },
  {
    titulo: 'PASTILHA DE FREIO NO LIMITE',
    cenario: 'Roda desmontada na bancada ou no elevador com a pinça visível',
    oQueGravar: 'A pastilha de freio desgastada ao lado de uma nova para comparar',
    acao: 'Segurar as duas pastilhas lado a lado na câmera',
    roteiro: '"A nova tem quase 1 cm de material. Essa que saiu do carro? Menos de 2 mm. Essa diferença é a diferença entre frear a tempo ou não frear. Troca agora, não espera."',
    gatilho: 'Comparação visual — impacto imediato e concreto',
  },
  {
    titulo: 'CORREIA DENTADA GASTA',
    cenario: 'Bancada de serviços com a correia dentada removida do motor',
    oQueGravar: 'Os dentes desgastados ou trincados da correia, bem de perto',
    acao: 'Dobrar levemente a correia para mostrar as rachaduras',
    roteiro: '"Essa correia saiu de um carro que entrou aqui hoje. Tá trincada, os dentes tão gastos — se ela arrebenta, o motor pode fundir na hora. Verifique a quilometragem do seu."',
    gatilho: 'Terror de um conserto caro — a correia é barata, o motor não',
  },
  {
    titulo: 'CALIBRAGEM ERRADA E OS RISCOS',
    cenario: 'Na área de atendimento, pneu ainda no carro ou calibrador na mão',
    oQueGravar: 'O calibrador marcando uma pressão incorreta (muito acima ou abaixo do ideal)',
    acao: 'Mostrar o valor no calibrador e depois o valor correto na etiqueta da porta',
    roteiro: '"O certo pra esse carro é 32 libras. Tava com 24. Pneu murcho esquenta mais, gasta mais rápido e pode explodir. A calibração correta é de graça aqui na BR Pneus."',
    gatilho: 'Custo zero — ninguém precisa de motivo pra fazer algo gratuito',
  },
  {
    titulo: 'ROLAMENTO FAZENDO BARULHO',
    cenario: 'Carro no elevador, câmera no cubo da roda dianteira',
    oQueGravar: 'O mecânico girando a roda com a mão e o barulho sendo captado',
    acao: 'Girar a roda devagar e depois apontar o dedo para o cubo',
    roteiro: '"Tá ouvindo esse barulho? É o rolamento da roda. Se travar com o carro andando, a roda pode travar. Quanto mais esperar, mais caro fica. Não deixa pra depois."',
    gatilho: 'Urgência progressiva — o custo aumenta com o tempo',
  },
  {
    titulo: 'FOLGA NO VOLANTE',
    cenario: 'Dentro do carro, câmera filmando o volante de frente',
    oQueGravar: 'O mecânico virando o volante de um lado para o outro mostrando a folga antes das rodas girarem',
    acao: 'Mexer o volante nos dois sentidos e pausar para mostrar a zona morta',
    roteiro: '"Olha essa folga — rodo o volante aqui e o carro não reage. Isso é perigo nas curvas e nas ultrapassagens. Pode ser terminal de direção ou caixa de direção. Vem verificar."',
    gatilho: 'Imprevisibilidade no trânsito — medo de perder o controle',
  },
  {
    titulo: 'TROCA DE PNEU PASSO A PASSO',
    cenario: 'Na área de montagem, processo completo em um carro cliente',
    oQueGravar: 'Cada etapa: desmontagem, inspeção do aro, montagem, calibração',
    acao: 'Narrar cada passo enquanto realiza ou apontar para um colega realizando',
    roteiro: '"Aqui na BR Pneus a troca de pneu tem um processo. A gente limpa o aro, verifica o bico, calibra no ponto certo e ainda faz o balanceamento. Tudo isso no preço."',
    gatilho: 'Confiança e transparência — mostrar o cuidado gera credibilidade',
  },
  {
    titulo: 'ÓLEO DO MOTOR PRETO E VELHO',
    cenario: 'Na área de serviços, capô aberto de um carro cliente',
    oQueGravar: 'A vareta de óleo sendo retirada com óleo escuro e espesso',
    acao: 'Limpar a vareta no pano branco mostrando a cor do óleo',
    roteiro: '"Esse óleo aqui tá preto e grosso — já passou do prazo há muito tempo. Óleo velho não lubrifica, e o motor vai desgastando por dentro sem você ver. Troca de óleo a partir de R$ [consulte]."',
    gatilho: 'Desgaste invisível — o cliente não vê o motor se destruindo por dentro',
  },
  {
    titulo: 'PNEU CARECA E A AQUAPLANAGEM',
    cenario: 'Na área de montagem, pneu careca ao lado de um novo na mão',
    oQueGravar: 'Os sulcos do pneu novo comparados com o pneu careca sem sulco',
    acao: 'Passar o dedo nos sulcos do novo e na superfície lisa do careca',
    roteiro: '"Os sulcos do pneu servem pra jogar a água pra fora em dia de chuva. Quando some, o carro aquaplana — literalmente flutua sobre a água e você perde o controle. Não arrisca."',
    gatilho: 'Chuva e aquaplanagem — medo concreto e situação vivida por todos',
  },
  {
    titulo: 'ALINHAMENTO: ANTES E DEPOIS',
    cenario: 'Na bancada de alinhamento 3D com o carro conectado ao equipamento',
    oQueGravar: 'A tela mostrando os valores fora do padrão e depois os valores corrigidos',
    acao: 'Apontar para a tela mostrando os números vermelhos virando verdes',
    roteiro: '"Olha na tela — esses números em vermelho são os ângulos fora do padrão. Depois do alinhamento 3D, tudo verde. Isso aqui economiza pneu, combustível e protege a suspensão."',
    gatilho: 'Prova visual — os números na tela são irrefutáveis',
  },
  {
    titulo: 'MANGUEIRA DE RADIADOR ESTUFADA',
    cenario: 'Capô aberto, câmera focada na mangueira superior do radiador',
    oQueGravar: 'A mangueira com aspecto borrachudo, inchada ou com trinca na superfície',
    acao: 'Apertar a mangueira com a mão para mostrar a inconsistência',
    roteiro: '"Essa mangueira tá murcha e trincada — quando o motor aquecer, ela pode arrebentar e o carro esquenta na pista. Troca simples e barata que evita um baita problema."',
    gatilho: 'Custo de oportunidade — conserto pequeno vs. problema grande na estrada',
  },
  {
    titulo: 'DISCO DE FREIO RISCADO',
    cenario: 'Roda desmontada no elevador ou na bancada com o disco visível',
    oQueGravar: 'Os riscos profundos e marcas no disco de freio, com luz para aparecer bem',
    acao: 'Passar o dedo nas ranhuras e mostrar a profundidade para a câmera',
    roteiro: '"Esses riscos no disco significam que a pastilha acabou e começou a roer o metal. Freio riscado aumenta a distância de frenagem. Pastilha é R$ [consulte] — disco é bem mais."',
    gatilho: 'Prevenção financeira — trocar na hora certa custa menos',
  },
  {
    titulo: 'INJEÇÃO ELETRÔNICA: LUZ ACESA NO PAINEL',
    cenario: 'Dentro do carro com o painel ligado ou na bancada com o scanner conectado',
    oQueGravar: 'A luz de motor acesa no painel ou o código de falha no scanner',
    acao: 'Apontar para a luz e depois mostrar o scanner com o código',
    roteiro: '"Essa luz amarela no painel não é pra ignorar. Pode ser sensor, pode ser injetor, pode ser coisa simples. O diagnóstico aqui é gratuito — a gente lê e te fala o que é antes de cobrar."',
    gatilho: 'Mistério e ansiedade — a luz no painel gera ansiedade; diagnóstico gratuito remove a barreira',
  },
  {
    titulo: 'HIGIENIZAÇÃO DO AR-CONDICIONADO',
    cenario: 'Dentro do carro com o painel aberto ou na área de serviço com o evaporador exposto',
    oQueGravar: 'O filtro do ar sujo ao lado do filtro novo, ou o processo de higienização',
    acao: 'Segurar os dois filtros lado a lado e depois mostrar o spray sendo aplicado',
    roteiro: '"Esse filtro saiu hoje de um carro cliente. Tá cheio de mofo e bactéria. Esse ar tava entrando nos pulmões das crianças. Higienização resolve e o carro cheira novo de novo."',
    gatilho: 'Saúde da família — especialmente crianças e pessoas com rinite',
  },
  {
    titulo: 'PNEU DE CAMINHONETE: ESCOLHA CERTA PARA O USO',
    cenario: 'Na área de estoque ou exposição, três pneus de caminhonete diferentes lado a lado',
    oQueGravar: 'Os três tipos H/T, A/T e M/T com os desenhos de banda de rodagem visíveis',
    acao: 'Apontar para cada um explicando para qual uso é indicado',
    roteiro: '"H/T é pra quem roda só no asfalto. A/T é pra quem mistura asfalto com terra. M/T é pra quem vai pro off-road pesado. Escolha errada = desgaste mais rápido e mais gasto. Vem que a gente orienta."',
    gatilho: 'Educação + custo — errar na escolha custa caro',
  },
  {
    titulo: 'BALANCEAMENTO: O QUE É E POR QUE IMPORTA',
    cenario: 'Na máquina de balanceamento com uma roda girando',
    oQueGravar: 'A máquina identificando o ponto de desequilíbrio e o peso sendo colocado',
    acao: 'Apontar para o display da máquina e depois mostrar o peso colado no aro',
    roteiro: '"Essa roda tava vibrando porque tinha um desequilíbrio de 30 gramas — menos que uma moeda. O balanceamento corrige isso. Sem ele, o pneu treme, desgasta irregular e cansa o motorista."',
    gatilho: 'Precisão e ciência — o detalhe pequeno que faz grande diferença',
  },
  {
    titulo: 'COXIM DO MOTOR QUEBRADO',
    cenario: 'Capô aberto com o motor visível ou carro no elevador mostrando a parte inferior',
    oQueGravar: 'O coxim com a borracha trincada ou partida ao meio',
    acao: 'Mostrar a peça quebrada na mão e depois apontar para o motor tremendo',
    roteiro: '"Esse coxim aqui é o amortecedor do motor. Quando quebra, o motor vibra direto na estrutura do carro — você sente aquela trepidação estranha. Peça barata, conserto simples."',
    gatilho: 'Identificação do problema — o cliente finalmente entende o barulho estranho',
  },
  {
    titulo: 'JUNTA HOMOCINÉTICA COM GRAXA ESPALHADA',
    cenario: 'Carro no elevador, câmera na parte de baixo focando na junta homocinética',
    oQueGravar: 'A coifa rasgada com graxa espalhada pela junta e pelo eixo',
    acao: 'Apontar para a coifa rasgada e passar o dedo na graxa espalhada',
    roteiro: '"Tá vendo essa graxa espalhada aqui? A coifa rasgou e a sujeira entrou na junta. Se não trocar logo, a junta bate e o conserto fica 10 vezes mais caro. Coifa nova é simples."',
    gatilho: 'Escalada de custo — problema pequeno ignorado vira problema caro',
  },
  {
    titulo: 'FILTRO DE AR ENTUPIDO',
    cenario: 'Capô aberto ou bancada com o filtro de ar desmontado',
    oQueGravar: 'O filtro velho entupido de poeira ao lado do filtro novo',
    acao: 'Bater levemente o filtro velho para soltar a poeira, depois comparar cores',
    roteiro: '"O motor precisa respirar. Esse filtro entupido faz o carro consumir mais gasolina, perder potência e aumentar a emissão de fumaça. Filtro novo custa pouco e economiza no posto."',
    gatilho: 'Combustível — todo mundo sente no bolso o consumo alto',
  },
  {
    titulo: 'PNEU MOTO: SEGURANÇA EM DOIS PONTOS',
    cenario: 'Moto na área de montagem com o pneu traseiro visível',
    oQueGravar: 'O pneu da moto com desgaste central (rodagem urbana) ou lateral (curvas)',
    acao: 'Mostrar o perfil do pneu e o desgaste com a mão',
    roteiro: '"Na moto o equilíbrio depende de dois pneus só. Esse aqui tá com o centro careca — nas frenagens de emergência, ele escorrega. Pneu de moto não é onde se economiza."',
    gatilho: 'Vulnerabilidade — o motociclista sabe que qualquer queda pode ser fatal',
  },
  {
    titulo: 'TERMINAL DE DIREÇÃO COM FOLGA',
    cenario: 'Carro no elevador, câmera embaixo focando no terminal de direção',
    oQueGravar: 'O mecânico sacudindo a roda horizontalmente mostrando a folga no terminal',
    acao: 'Sacudir a roda de lado a lado e apontar para onde está a folga',
    roteiro: '"Tá vendo essa folga? O terminal de direção tá gasto. Isso faz o carro andar meio torto e dificulta o controle. Se arrebentar na estrada, você perde a direção. Troca antes."',
    gatilho: 'Perda total de controle — o pior cenário possível no trânsito',
  },
  {
    titulo: 'PROGRAMA BR TOTAL PLUS: O QUE É',
    cenario: 'Na recepção ou área de atendimento, colaborador com tablet ou folder',
    oQueGravar: 'O colaborador explicando os benefícios olhando para a câmera',
    acao: 'Contar nos dedos cada benefício do programa',
    roteiro: '"Com o BR Total Plus você tem: 40 mil km de meta, 6 meses de cobertura contra dano acidental, conserto de furo grátis e 1 ano de alinhamento e balanceamento inclusos. Vem conferir."',
    gatilho: 'Valor percebido — mostrar o conjunto de benefícios que vai além do pneu',
  },
  {
    titulo: 'REVISÃO COMPLETA ANTES DE VIAGEM',
    cenario: 'Carro no elevador com câmera mostrando o técnico verificando vários pontos',
    oQueGravar: 'O checklist de revisão sendo executado: pneus, freios, óleo, luzes, calibragem',
    acao: 'Ir de ponto em ponto marcando no papel ou tablet',
    roteiro: '"Antes de qualquer viagem longa, 30 minutos aqui na BR Pneus evitam horas parado na estrada. A gente verifica tudo e te fala o que precisa de atenção agora e o que pode esperar."',
    gatilho: 'Proteção da viagem — ansiedade de viajar com carro não revisado',
  },
  {
    titulo: 'EMBREAGEM NO LIMITE',
    cenario: 'Na bancada com a embreagem desmontada ou o carro no elevador',
    oQueGravar: 'O disco de embreagem com material gasto, comparado a um novo',
    acao: 'Segurar os dois discos lado a lado mostrando a diferença de espessura',
    roteiro: '"O disco novo tem espessura completa — o velho tá liso como uma moeda. Embreagem gasta patina na largada, perde força na subida e pode deixar o carro na mão. Faz a revisão."',
    gatilho: 'Performance e confiabilidade — carro que falha na hora errada é problema',
  },
];

// ── Utilitários de semana ──────────────────────────────────────────────────────

/**
 * Retorna o número da semana ISO (1-53) e o ano para uma data específica.
 * Usa o timezone America/Sao_Paulo para determinar a data atual.
 */
function getSemanaAtual() {
  // Data atual em São Paulo
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));

  // Calcular semana ISO: a semana que contém a primeira quinta-feira de janeiro é a semana 1
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = date.getUTCDay() || 7; // domingo = 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const semana = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);

  return { ano: now.getFullYear(), semana };
}

/**
 * Retorna o tema correspondente à semana do ano.
 * Rotaciona ciclicamente pelo array TEMAS.
 */
function getTemaDoAno(ano, semana) {
  const indice = (semana - 1) % TEMAS.length;
  return { ...TEMAS[indice], indice, semana, ano };
}

// ── Geração do HTML da arte ───────────────────────────────────────────────────

function gerarHtmlTema(tema, semana, ano) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>BR Pneus — Tema da Semana ${semana}</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,700;0,900;1,400&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #111111; }

    .arte {
      width: 1270px;
      height: 720px;
      font-family: 'Montserrat', sans-serif;
      background: #111111;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* ── TOPO ── */
    .topo {
      background: #F5A623;
      min-height: 96px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 48px;
      gap: 24px;
    }
    .topo-esquerda {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .topo-label {
      font-size: 16px;
      font-weight: 700;
      color: #1A1A1A;
      letter-spacing: 3px;
      text-transform: uppercase;
      opacity: 0.65;
    }
    .topo-titulo {
      font-size: 36px;
      font-weight: 900;
      color: #1A1A1A;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      line-height: 1.15;
    }
    .topo-semana {
      background: #1A1A1A;
      color: #F5A623;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 3px;
      padding: 8px 22px;
      border-radius: 4px;
      text-transform: uppercase;
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* ── CORPO 2 COLUNAS ── */
    .corpo {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      overflow: hidden;
    }

    .coluna {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 24px 36px;
      gap: 0;
    }
    .coluna:first-child {
      border-right: 1px solid rgba(245,166,35,0.12);
    }

    .campo {
      display: flex;
      flex-direction: column;
      gap: 5px;
      flex: 1;
    }
    .campo + .campo {
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px solid rgba(255,255,255,0.06);
    }

    .campo-label {
      font-size: 16px;
      font-weight: 700;
      color: #F5A623;
      letter-spacing: 2.5px;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .campo-texto {
      font-size: 22px;
      font-weight: 400;
      color: #EEEEEE;
      line-height: 1.55;
    }
    .campo-texto.roteiro {
      font-style: italic;
      color: #CCCCCC;
      font-size: 21px;
    }

    /* ── RODAPÉ ── */
    .rodape {
      height: 36px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-top: 1px solid rgba(245,166,35,0.2);
      background: #0D0D0D;
    }
    .rodape-texto {
      font-size: 14px;
      font-weight: 700;
      color: #444444;
      letter-spacing: 3px;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="arte">

    <div class="topo">
      <div class="topo-esquerda">
        <span class="topo-label">Conteúdo de Gravação da Semana</span>
        <span class="topo-titulo">${tema.titulo}</span>
      </div>
      <span class="topo-semana">Semana ${semana} · ${ano}</span>
    </div>

    <div class="corpo">

      <div class="coluna">
        <div class="campo">
          <div class="campo-label">🎬 Cenário</div>
          <div class="campo-texto">${tema.cenario}</div>
        </div>
        <div class="campo">
          <div class="campo-label">📹 O que gravar</div>
          <div class="campo-texto">${tema.oQueGravar}</div>
        </div>
        <div class="campo">
          <div class="campo-label">✋ Ação</div>
          <div class="campo-texto">${tema.acao}</div>
        </div>
      </div>

      <div class="coluna">
        <div class="campo">
          <div class="campo-label">💬 Roteiro</div>
          <div class="campo-texto roteiro">${tema.roteiro}</div>
        </div>
        <div class="campo">
          <div class="campo-label">⚡ Gatilho</div>
          <div class="campo-texto">${tema.gatilho}</div>
        </div>
      </div>

    </div>

    <div class="rodape">
      <span class="rodape-texto">BR Pneus &amp; Oficina</span>
    </div>

  </div>
</body>
</html>`;
}

// ── Função principal de geração de imagem ─────────────────────────────────────

/**
 * Gera a imagem PNG do tema de uma semana específica (ou da semana atual).
 *
 * @param {string} outputPath  Caminho de saída desejado para o PNG
 * @param {object} [opts]      Opcional: { semana, ano } para semana diferente da atual
 * @returns {Promise<string>}  Caminho absoluto do PNG gerado
 */
async function gerarImagemTema(outputPath, opts = {}) {
  const base = getSemanaAtual();
  const semana = opts.semana ?? base.semana;
  const ano    = opts.ano    ?? base.ano;
  const tema = getTemaDoAno(ano, semana);

  // Garante que o diretório de saída existe
  const absOutputPath = path.resolve(outputPath);
  const outputDir = path.dirname(absOutputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Gera o HTML
  const html = gerarHtmlTema(tema, semana, ano);

  // Salva o HTML num arquivo temporário com "whatsapp" no nome para que o
  // export-html-to-png.js detecte automaticamente 800×800px
  const tempHtml = path.join(
    os.tmpdir(),
    `br-pneus-tema-landscape-semana${semana}-${Date.now()}.html`
  );
  fs.writeFileSync(tempHtml, html, 'utf8');

  // Caminho para o script de exportação
  const exportScript = path.resolve(__dirname, 'export-html-to-png.js');

  console.log(`Gerando tema da semana ${semana}/${ano}: ${tema.titulo}`);
  console.log(`HTML temp: ${tempHtml}`);

  try {
    // Roda o exportador — ele vai salvar o PNG no mesmo local que o HTML temp
    execSync(`node "${exportScript}" "${tempHtml}"`, {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
    });
  } catch (err) {
    throw new Error(`Falha ao exportar PNG: ${err.message}`);
  }

  // O exportador salva o PNG substituindo .html por .png
  const tempPng = tempHtml.replace(/\.html$/i, '.png');

  if (!fs.existsSync(tempPng)) {
    throw new Error(`PNG temporário não encontrado: ${tempPng}`);
  }

  // Move o PNG para o destino final
  fs.copyFileSync(tempPng, absOutputPath);
  fs.unlinkSync(tempPng);
  fs.unlinkSync(tempHtml);

  console.log(`PNG salvo em: ${absOutputPath}`);
  return absOutputPath;
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = { gerarImagemTema, getTemaDoAno, getSemanaAtual, TEMAS };

// ── Entry point (execução direta) ─────────────────────────────────────────────

if (require.main === module) {
  const outputArg = process.argv[2] || 'output/criativos/tema-semana-atual.png';
  gerarImagemTema(outputArg)
    .then(p => {
      console.log('\nConcluido!');
      console.log('PNG:', p);
    })
    .catch(err => {
      console.error('Erro:', err.message);
      process.exit(1);
    });
}
