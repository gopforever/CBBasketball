import { getStore as _get } from "@netlify/blobs";

export function getStoreWithFallback(name) {
  try {
    // Normal path (production on Netlify)
    return _get(name);
  } catch (e) {
    // Fallback: pass explicit env if available
    const siteID = process.env.NETLIFY_SITE_ID;
    const token = process.env.NETLIFY_AUTH_TOKEN;
    if (siteID && token) {
      return _get(name, { siteID, token });
    }
    throw e;
  }
}
