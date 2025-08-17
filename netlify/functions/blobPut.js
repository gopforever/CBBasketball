import { getStoreWithFallback } from "./_store.js";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  try {
    const { key, data } = JSON.parse(event.body || "{}");
    if (!key || !data) {
      return { statusCode: 400, body: "Missing key or data" };
    }
    const store = getStoreWithFallback("cbb-leagues");
    await store.set(key, data, { metadata: { updatedAt: Date.now() } });
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true })
    };
  } catch (e) {
    console.error("blobPut error:", e);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: String(e?.message || e), stack: e?.stack || null })
    };
  }
}
