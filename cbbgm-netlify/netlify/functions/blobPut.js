import { getStore } from "@netlify/blobs";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  try {
    const { key, data } = JSON.parse(event.body || "{}");
    if (!key || !data) {
      return { statusCode: 400, body: "Missing key or data" };
    }
    const store = getStore("cbb-leagues");
    await store.set(key, data, { metadata: { updatedAt: Date.now() } });
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true }),
    };
  } catch (e) {
    return { statusCode: 500, body: "Error: " + e.message };
  }
}
