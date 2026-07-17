'use strict';
/**
 * Gera o JSON do SalesBot Kommo — Peg Pneus Atacarejo
 * Comentários completos com 3 variações por categoria, sempre direcionando para DM
 *
 * Uso: node tools/gerar-bot-kommo-peg.js
 * Saída: output/bot-kommo-peg-pneus.json
 */

const fs   = require('fs');
const path = require('path');

// ─── RESPOSTAS: 3 variações por categoria, sempre → DM ──────────────────────

const CATEGORIAS = [

  {
    id: 'preco',
    nome: 'Preço / Valor / Orçamento',
    palavras: [
      'quanto','valor','preço','preco','custa','custam','fica','sai','orçamento','orcamento',
      'cotação','cotacao','tabela','precinho','orça','orca','quanto é','quanto e',
      'quanto ta','quanto tá','me passa o preço','manda o preço','passa o preço',
      'qual o valor','qual o preço','qual o preco','me fala o preço','me fala o valor',
      'preço do pneu','valor do pneu','preço dos pneus','quanto o jogo','quanto o par',
      'quanto o kit','me diz o preço','qual valor','pede orçamento','quero orçamento',
      'faz orçamento','preço atacado','valor atacado','preço para revenda','preço no atacado',
    ],
    respostas: [
      'Oi! 😊 Os preços variam conforme a medida e a marca. Manda uma DM pra gente com o modelo do seu carro que passamos o valor certinho! 🚗',
      'Olá! Aqui praticamos os melhores preços do mercado 💚 Chama no direct com a medida do pneu que te mandamos uma proposta na hora!',
      'Boa pergunta! 🔥 Temos pneus para todos os bolsos. Entra no nosso direct que montamos o orçamento ideal pra você sem compromisso! ✅',
    ],
  },

  {
    id: 'localizacao',
    nome: 'Localização / Endereço',
    palavras: [
      'endereço','endereco','onde fica','onde é','onde e','onde ta','onde tá','onde esta','onde está',
      'localização','localizacao','como chegar','como chego','qual o endereço','qual a rua',
      'manda a localização','manda o maps','manda o google maps','tem em araraquara',
      'tem em sorocaba','fica onde','fica aonde','qual o bairro','tem estacionamento',
      'loja física','loja fisica','tem loja em',
    ],
    respostas: [
      'Estamos em 2 cidades! 📍 Chama no direct que te mandamos a localização completa com link do Google Maps 🗺️',
      'Boa! Temos unidades em Araraquara e Sorocaba 📍 Manda uma DM que te enviamos o endereço e como chegar com facilidade! 😊',
      'Vem nos visitar! 🚗💚 Entra no direct que te passamos o endereço, horário e tudo que precisa pra chegar até a gente!',
    ],
  },

  {
    id: 'horario',
    nome: 'Horário de Funcionamento',
    palavras: [
      'horário','horario','que horas','que horas abre','que horas fecha','funcionamento',
      'abre sábado','abre sabado','abre domingo','funciona sábado','funciona domingo',
      'abre hoje','tá aberto','ta aberto','está aberto','ta fechado','tá fechado',
      'qual o horário','até que horas','ate que horas','horário de atendimento',
      'ainda ta aberto','já fechou','ja fechou','funciona feriado','abre feriado',
    ],
    respostas: [
      'Funcionamos de Segunda a Sexta das 8h às 18h e Sábados das 8h às 12h 🕗 Qualquer dúvida é só chamar no direct! 😊',
      'Nosso horário: Seg–Sex 8h às 18h | Sáb 8h às 12h ✅ Manda uma DM se quiser confirmar se estamos abertos hoje!',
      'Estamos aqui pra você! ⏰ Segunda a Sexta 8h–18h e Sábado 8h–12h. Chama no direct para mais informações 💚',
    ],
  },

  {
    id: 'servicos',
    nome: 'Serviços',
    palavras: [
      'alinhamento','balanceamento','montagem','monta','instala','instalação','instalacao',
      'troca','troca de pneu','faz troca','mecanica','mecânica','suspensão','suspensao',
      'amortecedor','freio','óleo','oleo','troca de óleo','correia dentada','injeção','injacao',
      'ar condicionado','higienização','higienizacao','conserta furo','faz remendo',
      'inclui montagem','montagem grátis','balanceamento grátis','faz diagnóstico',
      'calibragem','geometria','alinhamento e balanceamento','alinhamento 3d',
    ],
    respostas: [
      'Sim! 🔧 A montagem e o balanceamento já estão inclusos na compra dos pneus aqui na Peg Pneus! Chama no direct para saber mais 😊',
      'Aqui você compra, monta e sai rodando! ✅ Temos serviço completo de montagem e balanceamento incluso. Manda uma DM pra gente!',
      'Que ótimo que perguntou! 💚 Fazemos montagem e balanceamento na hora. Entra no direct que te explicamos direitinho como funciona! 🚗',
    ],
  },

  {
    id: 'atacado',
    nome: 'Atacado / Revenda / Garagista',
    palavras: [
      'atacado','revenda','revendedor','garagista','frota','frotista','autocenter',
      'borracheiro','borracharia','compra em quantidade','compro bastante','compro muito',
      'compro em atacado','compro vários','desconto para revendedor','desconto para garagista',
      'preço para garagista','preço para revendedor','preço de atacado','vende no atacado',
      'quantidade mínima','quero ser revendedor','como ser revendedor','tenho oficina',
      'tenho frota','sou mecânico','sou borracheiro','preco atacado','valor atacado',
    ],
    respostas: [
      'Somos o primeiro atacarejo de pneus do Brasil! 🏭 Atendemos garagistas, frotas e revendedores com condições especiais. Chama no direct! 💚',
      'Perfeito! Temos preços de atacado para profissionais do setor automotivo 🔧 Manda uma DM que um consultor entra em contato rapidinho!',
      'Boa! Aqui você encontra preços de atacado para revenda e frota ✅ Entra no direct com a quantidade que precisa que montamos uma proposta! 🚗',
    ],
  },

  {
    id: 'estoque',
    nome: 'Estoque / Disponibilidade / Medida',
    palavras: [
      'tem estoque','tem disponível','disponível','tem esse pneu','tem essa medida','tem esse aro',
      'aro 13','aro 14','aro 15','aro 16','aro 17','aro 18','aro 20','aro 22',
      'tem aro','medida','que medidas tem','quais medidas',
      '175/70','185/65','195/65','205/55','205/60','215/50','225/45','235/65','265/70',
      'continental','pirelli','michelin','goodyear','firestone','bridgestone',
      'xbri','westlake','west lake','linglong','speedmax','dunlop','magnum',
      'tem da marca','quando chega','quando repõe','vai ter','tem mais',
      'pneu de moto','pneu de carro','pneu de caminhão','pneu para suv',
      'pneu rebaixado','pneu off road','pneu at','pneu mt','pneu agrícola',
    ],
    respostas: [
      'Temos o maior estoque da região com todas as medidas e marcas! 📦 Manda uma DM com a medida do seu pneu que verificamos a disponibilidade na hora! 😊',
      'Trabalhamos com as melhores marcas: Pirelli, Continental, Michelin, Goodyear e muito mais! 💚 Chama no direct com a sua medida!',
      'Boa pergunta! Nosso estoque é gigante 🔥 Entra no direct com o aro e a medida que te confirmamos se temos e já passamos o preço também! ✅',
    ],
  },

  {
    id: 'interesse',
    nome: 'Interesse / Quero Comprar',
    palavras: [
      'quero','quero comprar','tenho interesse','me interessa','interessei','vou comprar',
      'vou lá','vou aí','tô indo','preciso','preciso trocar','preciso de pneu',
      'quero trocar','quero um jogo','quero agendar','como faço para comprar',
      'como compro','amei','adorei','esse sim','perfeito','me chama','chama no zap',
      'fala no zap','quero informação','pode me chamar',
    ],
    respostas: [
      'Que ótimo! 🎉 Chama no direct que a gente te atende rapidinho e separa os pneus pra você! 💚',
      'Perfeito, te esperamos! 🚗✅ Manda uma DM com o modelo do seu carro que já montamos tudo certinho pra você!',
      'Boa! 🔥 Entra no nosso direct que te passamos todas as informações e condições especiais de pagamento! 😊',
    ],
  },

  {
    id: 'pagamento',
    nome: 'Pagamento / Parcelamento / Crediário',
    palavras: [
      'parcela','parcelamento','quantas vezes','em quantas vezes','parcelado','sem juros',
      'tem juros','pix','aceita pix','cartão','cartão de credito','cartão de débito',
      'aceita cartão','crediário','crediario','tem crediário','financiamento','formas de pagamento',
      'aceita boleto','à vista','a vista','desconto à vista','desconto no pix',
      'como posso pagar','18x','12x','aprovação na hora','aprovado na hora',
    ],
    respostas: [
      'Aceitamos Pix, cartão de crédito e débito, e temos crediário próprio com aprovação na hora! 💳 Manda um DM pra saber todas as condições! 😊',
      'Parcelamos e ainda temos crediário próprio sem burocracia! ✅ Chama no direct que explicamos todas as formas de pagamento disponíveis!',
      'Temos várias opções pra facilitar sua compra 💚 Pix, cartão, crediário e parcelamento! Entra no direct pra saber mais detalhes! 🔥',
    ],
  },

  {
    id: 'frete',
    nome: 'Frete / Entrega',
    palavras: [
      'entrega','frete','entrega em casa','entrega no meu endereço','faz entrega',
      'entrega para todo brasil','envia','envia para','manda pelos correios',
      'frete grátis','frete gratuito','quanto é o frete','prazo de entrega',
      'quanto tempo demora','entrega hoje','entrega amanhã','delivery','motoboy',
      'retira na loja','pode retirar',
    ],
    respostas: [
      'Para informações sobre entrega e frete, manda uma DM que te passamos todos os detalhes conforme sua localização! 🚚😊',
      'Temos opções de retirada na loja e entrega! 📦 Chama no direct com seu endereço que verificamos a melhor opção pra você!',
      'Boa pergunta! 😊 As condições de entrega variam conforme a região. Entra no direct que resolvemos rapidinho! 🚗✅',
    ],
  },

  {
    id: 'garantia',
    nome: 'Garantia / Qualidade',
    palavras: [
      'garantia','tem garantia','qual a garantia','é original','original','pneu original',
      'de qualidade','qualidade','dura quanto tempo','quanto dura','vida útil',
      'quantos km','km de durabilidade','nota fiscal','tem nota fiscal','emite nota',
      'produto novo','é novo','procedência','procedencia',
    ],
    respostas: [
      'Todos os nossos pneus são 100% originais com garantia do fabricante e nota fiscal! ✅ Chama no direct pra saber mais! 😊',
      'Trabalhamos só com produtos originais e de qualidade comprovada 💚 Garantia total! Manda uma DM com suas dúvidas!',
      'Pode ficar tranquilo! 🔥 Pneus originais, nota fiscal e garantia garantidos. Entra no direct pra mais detalhes! ✅',
    ],
  },

  {
    id: 'contato',
    nome: 'Contato / WhatsApp / Telefone',
    palavras: [
      'whatsapp','zap','wpp','whats','número','numero','qual o número','qual o whatsapp',
      'telefone','qual o telefone','contato','como entro em contato','como falo com vocês',
      'manda o número','me passa o número','ligar','posso ligar','direct','dm',
      'instagram','atende pelo whats','chama no whats','manda mensagem',
    ],
    respostas: [
      'Chama a gente aqui no direct mesmo! 📲 É a forma mais rápida de falar com nossa equipe 😊',
      'A forma mais rápida é pelo nosso direct aqui! ✉️ Manda uma DM que respondemos rapidinho! 💚',
      'Manda uma DM aqui pra gente! 🔥 Nossa equipe está sempre pronta pra te atender pelo direct! ✅',
    ],
  },

  {
    id: 'agendamento',
    nome: 'Agendamento',
    palavras: [
      'agendar','agendamento','marcar horário','marcar horario','como agendar','posso agendar',
      'quero agendar','tem vaga','tem horário disponível','espera muito','demora muito',
      'atende sem agendar','precisa agendar','pode ir na hora','atende na hora','fila',
    ],
    respostas: [
      'Pode vir quando quiser dentro do horário de funcionamento, não precisa agendar! 🚗 Manda um DM se quiser confirmar a melhor hora! 😊',
      'Atendemos na hora sem necessidade de agendamento prévio! ✅ Chama no direct pra saber o horário de menor movimento!',
      'Pode aparecer! 💚 Segunda a Sexta 8h–18h e Sábado 8h–12h. Manda uma DM se tiver qualquer dúvida antes de vir! 🔥',
    ],
  },

  {
    id: 'elogios',
    nome: 'Elogios / Feedback Positivo',
    palavras: [
      'ótimo','otimo','excelente','muito bom','top','melhor loja','recomendo','indico',
      'melhor','melhor da cidade','atendimento excelente','nota 10','5 estrelas',
      'amei a loja','muito satisfeito','voltarei','cliente fiel','sempre compro aqui',
      'preço justo','honesto','confiável','profissional','parabéns','parabens',
      'show','arrasou','mandou bem','que loja boa','super recomendo',
    ],
    respostas: [
      'Muito obrigado! 🙏💚 É uma satisfação enorme atender você! Conte sempre com a Peg Pneus — o primeiro atacarejo de pneus do Brasil! 🚗',
      'Que mensagem linda, obrigado de coração! 🙏🔥 Sua confiança é o que nos motiva todo dia! Até a próxima! 😊',
      'Obrigado pelo carinho! ❤️ Fica à vontade para mandar uma DM quando precisar de pneus! A gente cuida do seu carro sempre! 💚',
    ],
  },

  {
    id: 'marcacao',
    nome: 'Marcação de Amigos',
    palavras: [
      'olha isso','olha só','olha so','para você','pra você','para voce','pra voce',
      'vem cá','vem ca','vê isso','ve isso','toma nota','anota aí','anota ai',
      'fala pra ele','fala pra ela','era isso','achou','aqui tá','aqui ta',
    ],
    respostas: [
      'Obrigado pela indicação! 🙏💚 Qualquer dúvida é só chamar no direct! 😊',
      'Que legal indicar pra um amigo! 🔥 Se precisar de pneus, manda uma DM que cuidamos de tudo! ✅',
      'Obrigado por compartilhar! ❤️ Estamos aqui pelo direct pra qualquer dúvida! 🚗',
    ],
  },

  {
    id: 'duvidas',
    nome: 'Dúvidas Gerais',
    palavras: [
      'como funciona','o que é','o que voces fazem','quais serviços','o que vende',
      'vocês vendem','o que é atacarejo','como funciona o atacarejo','pessoa física pode comprar',
      'precisa de cnpj','cnpj','quais marcas','tem loja online','vende online',
      'há quanto tempo','quando abriu','tem site','é confiável','são de confiança',
    ],
    respostas: [
      'Somos o PRIMEIRO atacarejo de pneus do Brasil! 🏆 Qualquer dúvida é só chamar no direct que explicamos tudo! 💚',
      'Ótima pergunta! Chama no direct que respondemos com prazer 😊 Aqui qualquer pessoa pode comprar com preços de atacado! ✅',
      'Entra no nosso direct que te contamos tudo sobre a Peg Pneus! 🔥 Simples, rápido e sem burocracia! 🚗',
    ],
  },

  {
    id: 'reclamacao',
    nome: 'Reclamações (escalar para humano)',
    palavras: [
      'péssimo','pessimo','horrível','horrivel','ruim','não presta','nao presta',
      'enganou','fui enganado','reclamação','reclamacao','fui lesado','paguei errado',
      'cobrou a mais','problema','defeito','estourou','furou rapido','não durou','nao durou',
      'insatisfeito','insatisfeita','decepcionado','nunca mais','não volto','nao volto',
      'procon','reclame aqui',
    ],
    respostas: [
      'Sentimos muito por isso 😔 Por favor, manda uma DM com todos os detalhes que nossa equipe vai resolver com prioridade! 🙏',
      'Pedimos desculpas pela experiência 🙏 Chama no direct AGORA que um responsável vai te atender pessoalmente para resolver! ✅',
      'Isso não é o padrão da Peg Pneus 😔 Manda uma DM imediatamente que escalamos para nossa equipe de atendimento resolver urgente! 🙏',
    ],
  },

];

// ─── GERADOR DO JSON KOMMO ───────────────────────────────────────────────────

function uid(prefix = 'step') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildKommoBot() {
  const steps = [];
  let stepIndex = 0;

  // Step 0: Verificar se é comentário (gatilho raiz já configurado no trigger)
  // Cada categoria gera um bloco de condição + 3 mensagens em rotação

  for (const cat of CATEGORIAS) {
    const condId  = uid('cond');
    const msg1Id  = uid('msg');
    const msg2Id  = uid('msg');
    const msg3Id  = uid('msg');
    const endId   = uid('end');

    // Bloco condição — verifica palavras-chave
    steps.push({
      uid:  condId,
      type: 'condition',
      name: cat.nome,
      conditions: cat.palavras.map(p => ({
        field:    'message_text',
        operator: 'contains',
        value:    p,
      })),
      logic: 'or',
      next_true:  msg1Id,
      next_false: null, // será preenchido pelo próximo bloco
    });

    // 3 mensagens em rotação (random no bot)
    [cat.respostas[0], cat.respostas[1], cat.respostas[2]].forEach((texto, i) => {
      const ids = [msg1Id, msg2Id, msg3Id];
      steps.push({
        uid:     ids[i],
        type:    'message',
        subtype: 'text',
        text:    texto,
        next:    endId,
      });
    });

    // End block — encerra sessão do bot para este comentário
    steps.push({
      uid:  endId,
      type: 'finish',
    });

    stepIndex++;
  }

  // Encadear os next_false entre as condições
  const condSteps = steps.filter(s => s.type === 'condition');
  for (let i = 0; i < condSteps.length - 1; i++) {
    condSteps[i].next_false = condSteps[i + 1].uid;
  }
  // Última condição: se não bater em nada → resposta padrão
  const defaultMsgId = uid('msg');
  condSteps[condSteps.length - 1].next_false = defaultMsgId;

  steps.push({
    uid:     defaultMsgId,
    type:    'message',
    subtype: 'text',
    text:    'Oi! 😊 Obrigado pelo comentário! Para te ajudar melhor, manda uma DM pra gente que respondemos rapidinho! 💚🚗',
    next:    uid('end'),
  });

  return {
    version: '2.0',
    name:    'Bot Comentários — Peg Pneus Atacarejo',
    description: 'Responde automaticamente comentários do Instagram e Facebook com 3 variações por categoria, sempre direcionando para DM',
    triggers: [
      { type: 'comment_received', source: 'instagram' },
      { type: 'comment_received', source: 'facebook'  },
    ],
    rotation: 'random', // Kommo vai rotacionar as 3 respostas automaticamente
    first_step: condSteps[0].uid,
    steps,
    metadata: {
      total_categorias: CATEGORIAS.length,
      total_palavras:   CATEGORIAS.reduce((a, c) => a + c.palavras.length, 0),
      total_respostas:  CATEGORIAS.length * 3,
      gerado_em:        new Date().toISOString(),
    },
  };
}

// ─── SALVAR ──────────────────────────────────────────────────────────────────

const bot    = buildKommoBot();
const outDir = path.join(__dirname, '../output');
fs.mkdirSync(outDir, { recursive: true });

const outPath = path.join(outDir, 'bot-kommo-peg-pneus.json');
fs.writeFileSync(outPath, JSON.stringify(bot, null, 2), 'utf8');

console.log(`✅ Bot gerado: ${outPath}`);
console.log(`   Categorias: ${CATEGORIAS.length}`);
console.log(`   Palavras-gatilho: ${CATEGORIAS.reduce((a, c) => a + c.palavras.length, 0)}`);
console.log(`   Respostas (3 por cat): ${CATEGORIAS.length * 3}`);
console.log(`\n📋 Para importar no Kommo:`);
console.log(`   1. Acesse Automações → Bots`);
console.log(`   2. Clique em IMPORTAR`);
console.log(`   3. Selecione o arquivo: output/bot-kommo-peg-pneus.json`);
