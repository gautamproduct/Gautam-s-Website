/*
  kumargautam.com/admin backend: a Cloudflare Worker.

  Holds the GoatCounter API token and the admin password server-side, so
  neither ever reaches the browser. The /admin page logs in here, gets a
  short-lived session token, and fetches aggregated stats with it.

  Secrets (Worker → Settings → Variables and Secrets, type "Secret"):
    ADMIN_PASSWORD   the password you type on /admin
    GC_TOKEN         GoatCounter API token with "Read statistics" permission
  Optional plain variables:
    GC_SITE          GoatCounter code (default "kumargautam")
    ALLOWED_ORIGIN   page origin allowed to call this (default "https://kumargautam.com")
*/

const SESSION_HOURS = 12;

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || "https://kumargautam.com";
    const cors = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    };
    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
      });

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (!env.ADMIN_PASSWORD || !env.GC_TOKEN) return json({ error: "Worker secrets not set" }, 500);

    const url = new URL(request.url);

    if (url.pathname === "/login" && request.method === "POST") {
      let body = {};
      try { body = await request.json(); } catch (_) {}
      if (!(await safeEqual(String(body.password || ""), env.ADMIN_PASSWORD))) {
        await new Promise((r) => setTimeout(r, 1000)); // slow down guessing
        return json({ error: "Wrong password" }, 401);
      }
      const exp = Date.now() + SESSION_HOURS * 3600 * 1000;
      return json({ token: `${exp}.${await sign(String(exp), env)}`, exp });
    }

    if (url.pathname === "/stats" && request.method === "GET") {
      if (!(await validSession(request, env))) return json({ error: "Not logged in" }, 401);
      const days = Math.min(Math.max(parseInt(url.searchParams.get("days") || "30", 10) || 30, 1), 365);
      try {
        return json(await collectStats(env, days));
      } catch (e) {
        return json({ error: String(e.message || e) }, 502);
      }
    }

    return json({ error: "Not found" }, 404);
  },
};

/* ---------- auth ---------- */

async function hmacKey(env) {
  // Changing either secret invalidates every existing session.
  const raw = new TextEncoder().encode(`${env.ADMIN_PASSWORD}\u0000${env.GC_TOKEN}`);
  return crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

async function sign(msg, env) {
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(env), new TextEncoder().encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function validSession(request, env) {
  const m = (request.headers.get("Authorization") || "").match(/^Bearer (\d+)\.([\w-]+)$/);
  if (!m || Number(m[1]) < Date.now()) return false;
  return safeEqual(m[2], await sign(m[1], env));
}

async function safeEqual(a, b) {
  // Compare digests so timing doesn't leak length or prefix matches.
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const p = new Uint8Array(x), q = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < p.length; i++) diff |= p[i] ^ q[i];
  return diff === 0;
}

/* ---------- GoatCounter ---------- */

async function gc(env, path, params) {
  const site = env.GC_SITE || "kumargautam";
  const res = await fetch(`https://${site}.goatcounter.com/api/v0${path}?${new URLSearchParams(params)}`, {
    headers: { Authorization: `Bearer ${env.GC_TOKEN}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`GoatCounter ${path} → HTTP ${res.status}`);
  return res.json();
}

async function collectStats(env, days) {
  // GoatCounter wants RFC 3339 times rounded to the hour.
  const end = new Date(Math.ceil(Date.now() / 3600000) * 3600000);
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() - (days - 1)));
  const iso = (d) => d.toISOString().replace(/\.\d{3}Z$/, "Z");
  const range = { start: iso(start), end: iso(end) };
  const list = (name) => gc(env, `/stats/${name}`, { ...range, limit: 20 }).then((r) => (r.stats || []).map((s) => ({ name: s.name || "(unknown)", count: s.count || 0 })));

  const [total, hits, toprefs, locations, browsers, systems, sizes] = await Promise.all([
    gc(env, "/stats/total", range),
    gc(env, "/stats/hits", { ...range, limit: 100, group: "day" }),
    list("toprefs"),
    list("locations"),
    list("browsers"),
    list("systems"),
    list("sizes"),
  ]);

  // Split hits into real pages and our custom event paths (see the tracking script on each page).
  const groups = { pages: [], time: [], visitCount: [], clicks: [], outbound: [] };
  const prefix = { "time/": "time", "visit-count/": "visitCount", "click/": "clicks", "outbound/": "outbound" };
  const perDay = {}; // pageview visitors per day, events excluded
  for (const h of hits.hits || []) {
    const p = String(h.path || "").replace(/^\//, "");
    const key = Object.keys(prefix).find((k) => p.startsWith(k));
    if (h.event && key) groups[prefix[key]].push({ name: p.slice(key.length), count: h.count || 0 });
    else if (!h.event) {
      groups.pages.push({ name: h.path, title: h.title || "", count: h.count || 0 });
      for (const s of h.stats || []) perDay[s.day] = (perDay[s.day] || 0) + (s.daily || 0);
    }
  }

  return {
    range: { start: range.start.slice(0, 10), end: range.end.slice(0, 10) },
    days,
    // "total" includes event visitors; pageview visitors are the rest.
    totals: { visits: Math.max((total.total || 0) - (total.total_events || 0), 0), events: total.total_events || 0 },
    daily: (total.stats || []).map((d) => ({ day: d.day, count: perDay[d.day] || 0 })),
    ...groups,
    referrers: toprefs,
    locations,
    browsers,
    systems,
    sizes,
    truncated: !!hits.more,
  };
}
