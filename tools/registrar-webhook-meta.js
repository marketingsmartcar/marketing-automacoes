/**
 * Registra as subscriptions de webhook nas páginas BR e PEG.
 * Rode UMA VEZ após configurar o webhook no painel Meta.
 *
 * Usage: node tools/registrar-webhook-meta.js
 */

require("dotenv").config();

const GRAPH = "https://graph.facebook.com/v19.0";

const PAGES = [
  {
    label: "BR Pneus",
    pageId: process.env.META_PAGE_ID_BR,
    token: process.env.META_PAGE_TOKEN_BR,
  },
  {
    label: "Peg Pneus ARQ",
    pageId: process.env.META_PAGE_ID_PEG_ARQ,
    token: process.env.META_PAGE_TOKEN_PEG_ARQ,
  },
];

const FIELDS = ["feed", "messages"];

async function subscribe(label, pageId, token) {
  console.log(`\n→ Registrando ${label} (${pageId})...`);

  const url = `${GRAPH}/${pageId}/subscribed_apps`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscribed_fields: FIELDS.join(","),
      access_token: token,
    }),
  });
  const data = await res.json();

  if (data.success) {
    console.log(`  ✅ ${label}: campos [${FIELDS.join(", ")}] registrados`);
  } else {
    console.log(`  ❌ ${label}: ${JSON.stringify(data.error ?? data)}`);
  }
}

(async () => {
  console.log("=== Registrando subscriptions Meta Webhook ===");
  for (const { label, pageId, token } of PAGES) {
    if (!pageId || !token) {
      console.log(`  ⚠️  ${label}: pageId ou token ausente no .env`);
      continue;
    }
    await subscribe(label, pageId, token);
  }
  console.log("\nPronto. Verifique o painel Meta → App → Webhooks para confirmar.");
})();
