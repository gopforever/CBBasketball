import { getStoreWithFallback } from "./_store.js";

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  const key = event.queryStringParameters?.key;
  if (!key) return { statusCode: 400, body: "Missing key" };
  try {
    const store = getStoreWithFallback("cbb-leagues");
    const val = await store.get(key);
    if (!val) return { statusCode: 404, body: "Not found" };
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, data: val })
    };
  } catch (e) {
    console.error("blobGet error:", e);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: String(e?.message || e), stack: e?.stack || null })
    };
  }
}
