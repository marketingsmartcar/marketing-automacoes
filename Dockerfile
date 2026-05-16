FROM node:20-slim

# Dependências de sistema para sharp (libvips bundled) e @napi-rs/canvas
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instala dependências Node (produção)
COPY package*.json ./
RUN npm ci --omit=dev

# Copia os arquivos necessários
COPY tools/ ./tools/
COPY assets/ ./assets/

# Pasta de output criada em runtime pelo gerar-arte.js
RUN mkdir -p output/criativos

EXPOSE 3099

CMD ["node", "tools/server-artes.js"]
