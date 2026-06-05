'use strict';
/**
 * IDs dos arquivos e pastas no Google Drive
 * Atualizar sempre que adicionar/remover arquivos
 */

const PASTA_RAIZ = '19Xou0JBmu_U6yjR1C7Lz8nO-mp5mkLeI';

// Pastas de conteúdo das lojas (BR Pneus)
const PASTAS_BR = {
  'Araraquara Loja 1': '1ZyKjqY8yn22Unb-N13CLQhaxuIJUgKz_',
  'Araraquara Loja 2': '1pNEnVJcpepEAbUhuCjzytd82tq8cLWa3',
  'Americana':         '15OfBsgcgH7n3wFbf2-L3aPBv4EZrt1Ug',
  'São Carlos':        '1ekFbkGjc4_yHx6PUfC-1ykOz-ngQ1YS6',
  'Maringá':           '1oQK0e2lELt3FSRZKo1UfqtIzWiERO2KO',
};

// Pastas de conteúdo das lojas (Peg Pneus)
const PASTAS_PEG = {
  'Peg Pneus Araraquara': '1eQSEOBFCtnvjJQiEROuc6DDLmbjFC9tZ',
  'Peg Pneus Sorocaba':   '1D8zvQM4jW_XywWE5IRlVa8HHLfAcvkQn',
  'Sazonais Peg':         '11pfy9zvFioSDhuztqglpB50JqM16e-Ab',
};

// Campanha Arraia — Junho 2026
const ARRAIA = {
  artes_br:  '1esrrmqnGK0bjZD6TAjxhe6N8bKnA3xTQ', // pasta BR Pneus 1080x1920
  artes_peg: '1OnCLs5CzcbHcdkOw-UbM57h7UPuSpF_e', // pasta Peg Pneus 1080x1920
  videos_br:  '1DCT88iiD692PDXVaB966nLvUCfkHRXbn', // ARRAIA/Videos/BR Pneus
  videos_peg: '1Ej_Hl0Wg3zSHB3V1U_joA-SsOnAhfZVQ', // ARRAIA/Videos/Peg Pneus
};

// Vídeos Sazonais — Junho 2026
const SAZONAIS = {
  br:  '1MDS-_yrPOXiNOYewyiXjEOjVhncO2619', // Videos Sazonais/BR Pneus
  peg: '11pfy9zvFioSDhuztqglpB50JqM16e-Ab',  // Videos Sazonais/Peg Pneus
};

module.exports = { PASTA_RAIZ, PASTAS_BR, PASTAS_PEG, ARRAIA, SAZONAIS };
