# College Basketball GM (Personal)

## Deploy (Netlify)
1. Create a new site from this folder or drag-drop in the Netlify UI.
2. No build command. Publish directory: `.`
3. Functions dir: `netlify/functions` (auto-detected).
4. Node version is pinned via `netlify.toml` to Node 20.

## Cloud Saves
- Uses Netlify Blobs via Functions (`blobPut`, `blobGet`, `blobList`).
- If Functions 500, check Function logs and ensure Node 20. 
- If needed, add `NETLIFY_SITE_ID` and `NETLIFY_AUTH_TOKEN` envs, and pass to `getStore`.

## Local Dev (optional)
- `netlify dev` (requires Netlify CLI) to run functions locally.
