# College Basketball GM (Personal) — v3

## What's new
- Functions fallback for Netlify Blobs using `NETLIFY_SITE_ID` + `NETLIFY_AUTH_TOKEN` if auto env is missing.
- `/ping` function to verify Functions runtime.
- Node 20 pinned in `netlify.toml`.
- `netlify/functions/package.json` ensures `@netlify/blobs` installs for Functions.

## Deploy
1. Drag-drop to Netlify or connect repo.
2. No build command. Publish dir: `.`
3. Functions dir auto-detected.
4. If Blobs still 500:
   - Add **Environment variables** (Site settings → Build & deploy → Environment):
     - `NETLIFY_SITE_ID` (from Site → Settings → Site details)
     - `NETLIFY_AUTH_TOKEN` (User settings → Applications → Personal access tokens)
   - Redeploy, then hit `/.netlify/functions/ping` to confirm runtime.
