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
    return { statusCode: 500, body: "Error: " + e.message };
  }
}
