# Admin backend (Cloudflare Worker)

`worker.js` powers `kumargautam.com/admin`. It keeps the admin password and the
GoatCounter API token on Cloudflare, so neither is ever in this public repo or
the browser. This folder starts with `_`, so GitHub Pages does not publish it.

## One-time setup (free, ~5 minutes, no DNS changes)

1. **GoatCounter API token**: open kumargautam.goatcounter.com, go to
   your user menu, then **API**, then **New token**. Tick **Read statistics** and
   copy the token.
2. **Create the Worker**: sign up free at dash.cloudflare.com (you don't need
   to move your domain). Go to **Workers & Pages**, then **Create**, then
   **Create Worker**. Name it `kg-admin` and click **Deploy**.
3. **Paste the code**: click **Edit code**, replace everything with the contents
   of `worker.js`, then click **Deploy**.
4. **Add the secrets**: go to the Worker's **Settings**, then **Variables and
   Secrets**, then **Add**. Add both of these as type **Secret**:
   - `ADMIN_PASSWORD`: the password you'll type on /admin
   - `GC_TOKEN`: the token from step 1
5. **Connect the page**: copy the Worker URL
   (`https://kg-admin.<your-subdomain>.workers.dev`). Then either set
   `WORKER_URL` near the bottom of `admin/index.html`, or paste the URL into
   the extra field on the /admin login screen (it's remembered in that browser).

## Notes

- Sessions last 12 hours. Changing either secret signs everyone out.
- A wrong password waits 1 second before replying, to slow down guessing.
- Only `https://kumargautam.com` may call the Worker. Set the variable
  `ALLOWED_ORIGIN` to change that.
