# Skill: Prompt para Imagens com IA

## Comando
`/prompt-visual [tipo-imagem] [descricao] [estilo-opcional]`

## O que faz
Gera prompts otimizados para ferramentas de geração de imagem com IA (Midjourney, DALL-E, Stable Diffusion, Gemini Image) para criar visuais profissionais alinhados com a identidade e o tom de voz da BR Pneus & Oficina.

---

## Parâmetros

| Parâmetro | Obrigatório | Opções |
|-----------|-------------|--------|
| `tipo-imagem` | Sim | `foto-servico`, `foto-equipe`, `foto-loja`, `foto-produto`, `foto-cliente`, `ilustracao-educativa`, `background-post`, `foto-cidade` |
| `descricao` | Sim | O que deve aparecer na imagem |
| `estilo` | Não | `fotografico`, `ilustrativo`, `minimalista`, `vibrante` (padrão: `fotografico`) |

---

## Diretrizes Visuais da BR Pneus

Toda imagem gerada deve transmitir:
- **Confiança e profissionalismo** — não amador, não improvisado
- **Acessibilidade** — público classe B/C, não élite/luxo
- **Autenticidade** — real, humano, sem parecer stock photo genérico
- **Calor humano** — equipe sorrindo, atendimento próximo
- **Modernidade** — loja limpa, equipamentos modernos, bem iluminado

Elementos visuais que funcionam:
- Mecânicos com uniforme laranja/amarelo e fundo escuro ou branco
- Pneus novos em contraste com superfícies limpas
- Close em mãos trabalhando — humaniza e mostra cuidado
- Antes e depois lado a lado
- Carro sendo atendido em loja moderna e organizada

Elementos a EVITAR:
- Oficinas sujas, escuras ou bagunçadas
- Pessoas com expressões sérias ou tensas
- Stock photos genéricas de carros/mecânicos sem identidade
- Visual de luxo ou supercarro (foge do perfil do público)
- Cores frias (azul escuro, roxo) — não combinam com a marca

---

## Paleta de Cores para Prompts

```
Cores principais a mencionar nos prompts:
→ "warm amber and black color scheme" (amarelo âmbar + preto = BR Pneus)
→ "bright orange-yellow accents" (destaques no amarelo da marca)
→ "clean white background" (fundos limpos e profissionais)
→ Evitar: "blue tones", "purple", "cold lighting"
```

---

## Prompts por Tipo de Imagem

---

### FOTO-SERVICO

**Alinhamento / Balanceamento:**
```
[Midjourney / DALL-E]
Professional automotive technician performing 3D wheel alignment on a modern passenger car in a clean, well-lit tire shop. The mechanic is focused and wearing a uniform. Warm amber and black color accents on signage. Workshop is organized and modern. Shot with a 35mm lens, natural lighting with warm tones. Photorealistic, high detail. --ar 1:1

[Português / Gemini]
Mecânico profissional realizando alinhamento 3D em um carro de passeio, em uma oficina automotiva moderna e bem iluminada. Ambiente organizado, limpo. Mecânico concentrado usando uniforme. Iluminação quente. Fotorrealista, alta qualidade.
```

**Troca de Pneus:**
```
[Midjourney / DALL-E]
Close-up of a tire technician's hands mounting a new tire on a car rim, in a modern tire shop. New tire gleaming, clean workshop floor, warm lighting. The technician's uniform has amber/orange color elements. Photorealistic, sharp focus on hands and tire. --ar 4:5

[Variação — antes e depois:]
Split image showing a worn, nearly bald tire on the left versus a brand new tire on the right, mounted on the same silver rim. Clean white studio background. Sharp lighting from above. Commercial photography style.
```

**Troca de Óleo:**
```
Automotive technician carefully pouring fresh motor oil into a car engine in a clean, modern workshop. The oil is golden-amber colored, catching the light. Focused expression on the technician. Professional lighting, photorealistic.
```

**Revisão / Diagnóstico:**
```
Professional mechanic using a tablet/diagnostic tool connected to a car's OBD port in a modern automotive workshop. Clean environment, focused technician. Warm workshop lighting. The mechanic is explaining results to an approving customer. Photorealistic.
```

---

### FOTO-EQUIPE

**Equipe completa:**
```
A team of 4-6 professional automotive technicians standing together in front of a modern tire shop, all wearing matching amber/orange and black uniforms. They are smiling, approachable and confident. The shop behind them is clean and modern. Warm natural lighting. Photorealistic portrait style. --ar 16:9
```

**Mecânico individual:**
```
Friendly male automotive technician in his 30s, wearing a clean amber and black uniform, smiling confidently at the camera in a modern tire shop. Background shows organized shelves with new tires. Warm professional lighting. Photorealistic headshot-style portrait. --ar 1:1
```

**Atendimento ao cliente:**
```
Friendly automotive shop receptionist (woman, approachable, 25-35 years old) smiling and explaining something to a customer at a modern service desk. The shop interior is clean and bright. Brazilian-style setting, warm and professional atmosphere. Photorealistic. --ar 16:9
```

---

### FOTO-LOJA

**Fachada externa:**
```
Modern tire shop storefront in a Brazilian mid-size city. Clean facade with amber/yellow and black signage. Well-lit entrance, organized display of tires visible. Daytime, sunny lighting. Wide angle shot. Inviting and professional appearance. Photorealistic. --ar 16:9
```

**Interior da loja:**
```
Interior of a modern, clean tire shop in Brazil. Reception area with comfortable seating, TV screen, organized shelves displaying various tires. Warm lighting, amber and black color accents. Clean floor, professional signage. No customers visible — focusing on the clean, organized environment. Photorealistic. --ar 16:9
```

**Sala de espera:**
```
Comfortable waiting area in a modern Brazilian auto shop. Clean seating, TV, small coffee station. Warm amber accents in decor. Clean floor. The space feels welcoming and professional, not like a typical grimy garage. Photorealistic interior photography. --ar 4:3
```

---

### FOTO-PRODUTO

**Pneu novo:**
```
Brand new car tire on a clean white background, studio lighting from above. The tire treads are sharp and detailed. The rubber looks fresh and high-quality. Product photography style. --ar 1:1 --style raw

[Variação editorial:]
New car tire standing upright on a dark surface with dramatic side lighting, creating strong shadows that highlight the tread pattern. Commercial product photography, moody and professional.
```

**Variedade de pneus:**
```
Lineup of 4-5 different car tires of various sizes displayed neatly in a row against a clean dark background. Studio lighting highlights the different tread patterns and sizes. Commercial display photography. --ar 16:9
```

---

### FOTO-CLIENTE

**Cliente satisfeito:**
```
Happy Brazilian man (35-45 years old, everyday appearance, working class) smiling and giving thumbs up next to his car outside a modern tire shop. He looks relieved and satisfied. Natural daylight, photorealistic candid style. --ar 1:1

[Mulher com família:]
Happy Brazilian woman (30-40 years old) standing next to her family SUV outside a modern tire shop, smiling confidently. She looks reassured and satisfied. Her children (blurred in background) wait near the car. Warm afternoon lighting. Photorealistic.
```

---

### ILUSTRACAO-EDUCATIVA

**Calibragem de pneus:**
```
Clean flat design illustration showing a tire pressure gauge checking a car tire, with a clear visual indicator of correct PSI. Simple icons showing what happens with over and under-inflation. Warm amber and dark color palette. Modern infographic style. --ar 1:1

[Estilo mais realista:]
Clear educational diagram showing correct tire pressure checking technique. Split image: left shows deflated tire, right shows properly inflated tire. Simple bold text labels. Brazilian Portuguese labels. Amber and black color scheme.
```

**Desgaste de pneu:**
```
Educational side-by-side comparison illustration: left panel shows a worn, dangerous tire tread, right panel shows a new, safe tire tread. Simple bold design with clear visual difference. Red/danger colors for worn, green/safe colors for new. Infographic style. --ar 16:9
```

---

### BACKGROUND-POST

**Fundo abstrato para texto:**
```
Abstract dark background suitable for text overlay. Dark charcoal base (#1A1A1A equivalent) with subtle amber/orange light rays or bokeh coming from bottom right. Clean, professional, not distracting. Suitable for overlaying white text and a logo. --ar 1:1

[Variação com textura:]
Dark automotive workshop background, slightly out of focus (bokeh effect). Tools and tires blurred in the background. Warm amber lighting accent. Professional atmosphere. Good for text overlay. --ar 16:9
```

---

### FOTO-CIDADE

**Cidade do interior de SP/PR:**
```
Aerial or street-level view of a typical mid-sized Brazilian inland city ([CIDADE NAME]) with a car driving on a main avenue. Sunny day, Brazilian urban landscape. Suitable for localized marketing content. --ar 16:9

[Com carro:]
Family car driving through a typical Brazilian inland city street, warm afternoon light. The city looks clean and everyday. The car is a common passenger sedan (not luxury). Photorealistic. --ar 16:9
```

---

## Modificadores de Qualidade

Adicionar ao final de qualquer prompt para melhorar o resultado:

```
Qualidade/Fotorrealismo (Midjourney):
--v 6.1 --style raw --q 2

Fotografia (Midjourney):
shot on Sony A7R, 85mm lens, natural lighting, photorealistic

Evitar defeitos (todos):
no text, no watermarks, no logos, no distorted hands, no extra fingers

Formato específico:
--ar 1:1 (quadrado) | --ar 9:16 (story) | --ar 16:9 (paisagem) | --ar 4:5 (retrato)
```

---

## Prompts Negativos (Negative Prompts)

Para Stable Diffusion / ComfyUI — adicionar como negative prompt:

```
ugly, poorly lit, dirty workshop, cluttered, amateur photo, stock photo, 
watermark, text overlay, logo, cartoon, anime, 3D render (if photorealistic), 
luxury car, sports car, extra fingers, distorted faces, blurry main subject,
cold blue lighting, generic stock photo appearance
```

---

## Adaptação por Persona

| Persona | Tipo de imagem ideal | Tom visual |
|---------|---------------------|-----------|
| **Carlos** (econômico prático) | Mecânico trabalhando, preço em destaque, carro comum | Direto, prático |
| **Ana** (mãe preocupada) | Família + carro, mulher satisfeita, ambiente seguro | Caloroso, tranquilizador |
| **Roberto** (frotista) | Múltiplos carros, equipe eficiente, profissional | Corporativo, ágil |
| **Giovana** (conectada) | Visual moderno, clean, equipe jovem | Atual, estético |

---

## Salvar em
`output/criativos/prompt-[tipo]-[descricao]-[data].md`

---

## Referências Cruzadas
- Identidade visual da marca: `CLAUDE.md` → seção Identidade Visual
- Templates HTML para usar com imagens geradas: `skills/criativos/criativo-html.md`
- Checklist de marca: `skills/conteudo/brand-checklist-marca.md`
- Personas para adequar o visual: `knowledge/personas.md`
