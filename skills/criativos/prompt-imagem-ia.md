---
name: prompt-imagem-ia
description: Gera prompts otimizados para ferramentas de IA generativa de imagem (Midjourney, DALL-E, Ideogram, Leonardo AI) para criar elementos visuais para uso em peças da BR Pneus & Oficina. Use sempre que precisar de prompt para gerar imagem com IA, background para post, cenário de oficina, mockup de pneu ou imagem para campanha — mesmo que o pedido use termos como "gerar imagem com IA", "prompt Midjourney", "imagem para o post", "background do criativo" ou "foto com IA".
---

# Skill: Prompts para IA Generativa de Imagem

## Comando
```
/prompt-imagem-ia [tipo-imagem] [descricao]
```

## Parâmetros
- **tipo-imagem** (obrigatório): Tipo de imagem. Opções:
  - `background-post` — Fundo para post de redes sociais (1:1)
  - `background-banner` — Fundo para banner do site (16:9)
  - `mockup-pneu` — Pneu/roda em composição estilizada
  - `cenario-oficina` — Cenário de oficina mecânica profissional
  - `carro-estrada` — Carro em viagem/estrada/cidade
  - `antes-depois` — Peça/componente desgastado vs novo
  - `sazonal` — Imagem temática sazonal
  - `hero-image` — Imagem principal impactante para site/LP
- **descricao** (obrigatório): Detalhes adicionais e contexto. Ex: "noturno com iluminação dramática", "família viajando", "mecânico trabalhando no elevador"

---

## Regras Fundamentais

> **NUNCA pedir texto na imagem** — IA gera texto errado. Texto é adicionado depois no HTML/Canva/Photoshop.
> **NUNCA pedir logo na imagem** — Logo é adicionado na etapa de composição.
> **Foco em**: cenário, produto, ambiente, pessoas — não na composição final.

---

## Paleta para Prompts (sempre incluir)

```
Cores a mencionar:
→ "warm amber and orange tones" (amarelo/laranja = BR Pneus)
→ "dark charcoal background #1A1A1A" (fundo padrão)
→ "warm dramatic studio lighting" (iluminação que valoriza)
→ "black and amber color scheme" (esquema da marca)

Cores a EVITAR (mencionar como negative):
→ "no blue tones", "no purple", "no cold lighting", "no green tones"
```

---

## Templates por Tipo de Imagem

### `background-post` (1:1 — 1080×1080)

**Prompt para Midjourney:**
```
/imagine dark automotive workshop interior with warm amber accent lighting, 
concrete floor, organized tool rack visible in background, 
bokeh effect making background blurred, dramatic side lighting,
warm orange-yellow ambient glow, professional photography style, 
suitable for text overlay, no people visible, no text, no logos,
8k resolution, photorealistic --ar 1:1 --v 6.1 --style raw --q 2
```

**Prompt para DALL-E:**
```
A dark automotive workshop background for social media post. The scene shows a 
clean, professional tire shop interior with warm amber and orange accent lighting. 
The background is slightly blurred (bokeh effect) with organized tire shelves visible.
The lighting is dramatic from the side, creating warm golden tones. Suitable for 
placing text on top. No text, no logos, no people visible. Ultra-realistic, 
professional photography, square format.
```

**Prompt para Gemini/Ideogram:**
```
Fundo escuro de oficina automotiva profissional com iluminação quente âmbar, 
efeito bokeh, prateleiras de pneus ao fundo desfocadas, chão de concreto limpo,
tons laranja e amarelo como destaque, atmosfera profissional e confiante,
sem texto, sem pessoas, adequado para colocar texto por cima, fotorrealista.
```

**Negative prompt (Stable Diffusion):**
```
text, watermark, logo, brand, dirty workshop, cluttered, amateur, 
blue tones, cold lighting, purple, neon lights, cartoon, 3D render
```

---

### `mockup-pneu` (1:1 ou 4:5)

**Prompt para Midjourney:**
```
/imagine brand new car tire standing upright on dark surface, 
dramatic overhead studio lighting creating strong shadows on tread pattern,
warm amber spotlight highlighting rubber texture, clean professional product photography,
tire gleaming with new rubber sheen, sharp tread details visible, 
black background with subtle warm gradient, commercial automotive photography,
no text, no logos --ar 1:1 --v 6.1 --style raw
```

**Variação — comparativo antes/depois:**
```
/imagine split image commercial photography: left side showing worn bald car tire 
with no tread (dark, moody, slightly red color grade),
right side showing brand new car tire with deep sharp treads (bright, warm amber lighting),
both tires on clean surface, professional studio photography,
dramatic contrast between worn and new, no text, no logos --ar 16:9 --v 6.1
```

**Prompt para DALL-E:**
```
A brand new car tire photographed in a professional product photography style.
The tire is standing upright on a clean dark surface with dramatic studio lighting
from above. The tread pattern is sharp and detailed, with the rubber looking fresh
and high-quality. Warm amber accent light highlights the tire texture. 
Black background. No text, no logos, commercial photography style.
```

---

### `cenario-oficina` (16:9 — para banner/YouTube)

**Prompt para Midjourney:**
```
/imagine modern professional Brazilian tire shop interior, 
clean organized workshop with car on hydraulic lift,
automotive technician in amber/orange uniform focused on wheel alignment,
warm professional lighting, modern equipment visible,
sense of expertise and care, photorealistic professional photography,
wide angle shot, no text visible, no logos --ar 16:9 --v 6.1 --style raw
```

**Variação com equipe:**
```
/imagine team of 3-4 professional automotive technicians in matching 
amber and black uniforms standing confidently in front of modern tire shop,
natural daylight, approachable and smiling, clean organized shop interior visible,
Brazilian mid-size city context, professional portrait photography --ar 16:9
```

**Prompt para Gemini (português):**
```
Oficina automotiva moderna e profissional, limpa e organizada, carro em elevador, 
mecânico com uniforme laranja/âmbar trabalhando, iluminação quente, 
equipamentos modernos, chão limpo, sem sujeira, atmosfera de confiança e profissionalismo,
fotorrealista, qualidade comercial.
```

---

### `carro-estrada` (16:9 ou 3:1)

**Prompt para Midjourney:**
```
/imagine family sedan car driving on a highway through Brazilian inland landscape,
golden hour lighting, warm orange sunset in background,
sharp car in foreground with motion blur on background suggesting speed,
safe confident driving mood, photorealistic automotive photography,
no text, no logos --ar 16:9 --v 6.1 --style raw
```

**Variação — cidade interior SP:**
```
/imagine common Brazilian passenger car (sedan, not luxury) driving through 
a clean mid-size Brazilian interior city avenue,
sunny afternoon light, normal urban scene, everyday relatable mood,
photorealistic candid style, suitable for local advertising --ar 16:9
```

---

### `sazonal` — Variações por época

**Férias de julho / estrada:**
```
/imagine family packing car trunk for road trip vacation, 
warm sunny afternoon, Brazilian family context,
emphasis on car tires and road readiness, safe and happy mood,
photorealistic, no text --ar 16:9
```

**Período de chuvas:**
```
/imagine car tire in contact with wet asphalt road in heavy rain,
water spray from tire visible, dramatic storm lighting,
sense of safety concern, suitable for tire safety messaging,
photorealistic, no text --ar 1:1
```

**Natal / Fim de ano:**
```
/imagine car parked in front of warmly lit Brazilian home at night,
subtle festive lights decoration, family arriving, 
warm inviting atmosphere, everyday relatable scene,
photorealistic --ar 16:9
```

---

### `hero-image` (16:9 — para site/LP)

**Prompt para Midjourney:**
```
/imagine wide professional shot of modern tire shop storefront exterior in Brazil,
clean amber and dark facade, organized tire display in window,
sunny day, welcoming atmosphere, wide angle establishing shot,
photorealistic architectural photography, no text visible, no logos --ar 16:9 --v 6.1
```

**Variação — cliente satisfeito:**
```
/imagine happy Brazilian man (35-45, everyday appearance, working class)
standing next to his car outside a modern tire shop,
smiling confidently, relieved and satisfied expression,
natural afternoon light, photorealistic candid style --ar 16:9
```

---

## Dicas de Uso

```
1. Gerar 4 variações e escolher a melhor
2. Usar a imagem como BACKGROUND — texto e logo adicionados por cima depois
3. Ajustar brilho/contraste no CapCut, Canva ou Lightroom se necessário
4. Para fundo de post: escurecer levemente (+contraste, -brilho) para texto ficar legível
5. Resolução mínima: 1024×1024 (Midjourney padrão já entrega isso)
6. Para impressão (outdoor, flyer): usar Midjourney v6.1 --q 2 para máxima qualidade
```

---

## Modificadores de Qualidade (Midjourney)

```
Qualidade máxima:    --v 6.1 --style raw --q 2
Fotorrealismo:       shot on Sony A7R IV, 85mm lens, f/2.8, natural lighting
Evitar defeitos:     no text, no watermarks, no logos, no extra fingers, no distortion
Formatos:           --ar 1:1 (post) | --ar 4:5 (retrato) | --ar 16:9 (banner) | --ar 3:1 (outdoor)
```

---

## Salvar em
```
output/criativos/prompt-ia-[tipo]-[resumo]-[YYYY-MM-DD].md
```
**Exemplo:** `output/criativos/prompt-ia-background-post-oficina-noturna-2026-04-09.md`

---

## Referências Cruzadas
- Usar imagem gerada como fundo de post: `skills/criativos/post-visual-html.md`
- Usar imagem como thumbnail de vídeo: `skills/video/youtube-longo.md`
- Versão anterior de prompts visuais (legada): `skills/criativos/prompt-visual.md`
- Briefing completo para designer: `skills/criativos/briefing-designer.md`
