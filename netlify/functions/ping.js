export async function handler() {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true, runtime: process.version, env: { site: !!process.env.NETLIFY_SITE_ID } })
  };
}
