#!/usr/bin/env node
/**
 * test-gemini.js
 * Testa a conexão com a API do Gemini
 * Uso: node tools/test-gemini.js
 */

const fs = require('fs');
const path = require('path');

// Carregar .env manualmente (sem dependência extra)
function loadEnv() {
  const envPath = path.resolve('.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ Arquivo .env não encontrado na raiz do projeto.');
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
  }
}

async function testGemini() {
  loadEnv();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'COLE_SUA_CHAVE_AQUI') {
    console.error('❌ GEMINI_API_KEY não configurada.\n');
    console.log('👉 Abra o arquivo .env no VSCode e substitua COLE_SUA_CHAVE_AQUI pela sua chave.');
    console.log('   Obtenha sua chave gratuita em: https://aistudio.google.com/app/apikey\n');
    process.exit(1);
  }

  console.log('🔑 Chave encontrada. Testando conexão com Gemini...\n');

  try {
    // Teste simples: listar modelos disponíveis
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    if (!res.ok) {
      const err = await res.json();
      console.error('❌ Erro na API:', err.error?.message || res.statusText);
      process.exit(1);
    }

    const data = await res.json();
    const models = (data.models || []).map(m => m.name).filter(n => n.includes('gemini'));

    console.log('✅ Conexão com Gemini OK!\n');
    console.log('📋 Modelos disponíveis:');
    models.slice(0, 8).forEach(m => console.log(`   - ${m}`));
    if (models.length > 8) console.log(`   ... e mais ${models.length - 8}`);

    // Verificar se Imagen está disponível
    const temImagen = data.models?.some(m => m.name.includes('imagen-4'));
    console.log(`\n🖼️  Imagen (geração de imagem): ${temImagen ? '✅ disponível' : '⚠️  não encontrado nesta conta'}`);

    if (!temImagen) {
      console.log('\n   ℹ️  A geração de imagens pelo Gemini/Imagen requer acesso especial.');
      console.log('   Alternativa: usar Gemini Flash para gerar prompts e Midjourney/DALL-E para as imagens.');
    }

    console.log('\n🎉 Tudo pronto! Execute:');
    console.log('   node tools/gemini-generate-image.js "seu prompt" nome-arquivo tipo\n');

  } catch (err) {
    console.error('❌ Erro de conexão:', err.message);
    process.exit(1);
  }
}

testGemini();
