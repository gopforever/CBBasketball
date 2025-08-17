import { getStore } from "@netlify/blobs";

export async function handler() {
  try {
    const store = getStore("cbb-leagues");
    const list = await store.list();
    const mapped = (list?.blobs || []).map(b => ({
      key: b.key,
      size: b.size,
      updatedAt: b?.metadata?.updatedAt || null
    }));
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mapped)
    };
  } catch (e) {
    console.error("blobList error:", e);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: String(e?.message || e) })
    };
  }
}
