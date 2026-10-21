// A loopback stand-in for Supabase Auth + PostgREST, enough to render the
// signed-in pages of a local production build with fixture data. It listens on
// 127.0.0.1:54321, the origin scripts/dev-isolated.sh points the app at, and
// on nothing else. Reads are served from the fixtures; writes are accepted and
// dropped, so a page that saves or deletes sees success and nothing changes.
//
//   node docs/overhaul-2026-10/tools/signed-in-loopback/mock-supabase.mjs [fixtures.json]
//
// The fixtures default to fixtures.json beside this file (gen-fixtures.vitest.ts
// writes it). A fixture file is refused unless every user is a .invalid address
// and every saved deal's address starts with "Fixture ", so a dump of real
// accounts or real properties cannot be served by mistake.
import http from "node:http";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const HOST = "127.0.0.1";
const PORT = 54321;
// Answered at GET /__loopback-mock so capture-signed-in.mjs can tell this
// stand-in from anything else that might hold the port.
const MOCK_MARKER = "truecap-signed-in-loopback";

const fixturesPath =
  process.argv[2] ?? fileURLToPath(new URL("fixtures.json", import.meta.url));
const { tables, users, rpc = {} } = JSON.parse(readFileSync(fixturesPath, "utf8"));
for (const u of users) {
  if (!String(u.email).endsWith(".invalid")) {
    throw new Error(`Refusing fixtures: user ${u.id} is not a .invalid address.`);
  }
}
for (const row of tables.saved_analyses ?? []) {
  if (!String(row.address ?? "").startsWith("Fixture ")) {
    throw new Error(`Refusing fixtures: saved deal ${row.id} has a non-fixture address.`);
  }
}

const log = (...a) => (process.env.MOCK_QUIET ? null : console.log(new Date().toISOString().slice(11, 19), ...a));

const b64url = (v) => Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString("base64url");
function jwtFor(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url({ alg: "HS256", typ: "JWT" });
  const payload = b64url({
    aud: "authenticated", role: "authenticated", sub: user.id, email: user.email,
    iat: now, exp: now + 3600 * 12, session_id: crypto.randomUUID(), aal: "aal1",
    app_metadata: { provider: "email" }, user_metadata: user.user_metadata ?? {},
  });
  const sig = crypto.createHmac("sha256", "loopback-mock").update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
}
function userFromToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    return users.find((u) => u.id === payload.sub) ?? null;
  } catch { return null; }
}
const authUser = (u) => ({
  id: u.id, aud: "authenticated", role: "authenticated", email: u.email,
  email_confirmed_at: "2026-09-01T00:00:00Z", confirmed_at: "2026-09-01T00:00:00Z",
  last_sign_in_at: new Date().toISOString(), app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: u.user_metadata ?? {}, identities: [], created_at: "2026-09-01T00:00:00Z",
  updated_at: new Date().toISOString(), is_anonymous: false,
});
function session(u) {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: jwtFor(u), token_type: "bearer", expires_in: 3600 * 12,
    expires_at: now + 3600 * 12, refresh_token: `refresh-${u.id}`, user: authUser(u),
  };
}

// ── PostgREST subset ─────────────────────────────────────────────────────
function parseValue(raw) {
  if (raw === "null") return null;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return raw;
}
function matches(row, column, expr) {
  const [op, ...rest] = expr.split(".");
  const raw = rest.join(".");
  const value = row[column];
  const str = (v) => (v == null ? v : String(v));
  switch (op) {
    case "eq": return str(value) === str(parseValue(raw)) || (typeof value === "boolean" && String(value) === raw);
    case "neq": return str(value) !== str(parseValue(raw));
    case "is": return raw === "null" ? value == null : String(value) === raw;
    case "not": {
      const [innerOp, ...innerRest] = raw.split(".");
      return !matches(row, column, `${innerOp}.${innerRest.join(".")}`);
    }
    case "in": {
      const list = raw.replace(/^\(|\)$/g, "").split(",").map((s) => s.replace(/^"|"$/g, ""));
      return list.includes(str(value));
    }
    case "gt": return value != null && value > parseValue(raw);
    case "gte": return value != null && value >= parseValue(raw);
    case "lt": return value != null && value < parseValue(raw);
    case "lte": return value != null && value <= parseValue(raw);
    case "like": case "ilike": {
      const re = new RegExp("^" + raw.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/%/g, ".*") + "$", op === "ilike" ? "i" : "");
      return value != null && re.test(String(value));
    }
    default: return true; // unknown operators do not filter
  }
}
const RESERVED = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);

function embed(table, row, select) {
  // `plans(*)`, `plan:plans(entitlements)`, `plans!inner(...)`: attach the
  // related row by the conventional foreign key.
  const out = { ...row };
  const re = /(?:(\w+):)?(\w+)(?:!\w+)?\(([^()]*)\)/g;
  let m;
  while ((m = re.exec(select ?? ""))) {
    const [, alias, rel] = m;
    const related = tables[rel] ?? [];
    const fk = `${rel.replace(/s$/, "")}_id`;
    let value = null;
    if (row[fk] != null) value = related.find((r) => r.id === row[fk] || r.slug === row[fk]) ?? null;
    else value = related.filter((r) => r[`${table.replace(/s$/, "")}_id`] === row.id);
    out[alias ?? rel] = value;
  }
  return out;
}

// Top-level select items with an alias over a JSON path
// (`cap_rate_raw:result_snapshot->>capRate`) are projected onto the row;
// plain columns are served from the full row, a superset of what was asked.
function splitTopLevel(select) {
  const out = []; let depth = 0; let cur = "";
  for (const ch of select ?? "") {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(cur); cur = ""; } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}
function project(row, select) {
  const out = { ...row };
  for (const item of splitTopLevel(select)) {
    const m = /^(\w+):(\w+)((?:->>?\w+)+)$/.exec(item);
    if (!m) continue;
    const [, alias, column, path] = m;
    let value = row[column];
    const steps = [...path.matchAll(/(->>?)(\w+)/g)];
    steps.forEach(([, arrow, key], i) => {
      value = value == null ? null : value[key];
      if (i === steps.length - 1 && arrow === "->>" && value != null) value = typeof value === "object" ? JSON.stringify(value) : String(value);
    });
    out[alias] = value ?? null;
  }
  return out;
}

function query(table, url) {
  let rows = (tables[table] ?? []).slice();
  for (const [key, expr] of url.searchParams) {
    if (RESERVED.has(key)) continue;
    if (key === "or" || key === "and") continue; // not needed for these fixtures
    rows = rows.filter((row) => matches(row, key, expr));
  }
  const order = url.searchParams.get("order");
  if (order) {
    const parts = order.split(",").map((p) => p.split("."));
    rows.sort((a, b) => {
      for (const [col, dir = "asc"] of parts) {
        if (a[col] === b[col]) continue;
        const r = a[col] > b[col] ? 1 : -1;
        return dir === "desc" ? -r : r;
      }
      return 0;
    });
  }
  const total = rows.length;
  const offset = Number(url.searchParams.get("offset") ?? 0);
  const limit = url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : undefined;
  rows = rows.slice(offset, limit != null ? offset + limit : undefined);
  const select = url.searchParams.get("select");
  return { rows: rows.map((r) => project(embed(table, r, select), select)), total, offset };
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,HEAD,OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Expose-Headers": "Content-Range, X-Total-Count",
};
function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json", ...cors, ...headers });
  res.end(body === undefined ? "" : JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const bodyText = Buffer.concat(chunks).toString();
  const body = bodyText ? (() => { try { return JSON.parse(bodyText); } catch { return bodyText; } })() : null;
  if (req.method === "OPTIONS") return send(res, 204);
  if (url.pathname === "/__loopback-mock") return send(res, 200, { mock: MOCK_MARKER });
  const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  const user = userFromToken(token);

  // ── Auth ──
  if (url.pathname.startsWith("/auth/v1/")) {
    const route = url.pathname.slice("/auth/v1/".length);
    log("auth", req.method, route, url.searchParams.get("grant_type") ?? "");
    if (route === "token") {
      const grant = url.searchParams.get("grant_type");
      if (grant === "password") {
        const u = users.find((x) => x.email === body?.email && x.password === body?.password);
        if (!u) return send(res, 400, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" });
        return send(res, 200, session(u));
      }
      if (grant === "refresh_token") {
        const u = users.find((x) => `refresh-${x.id}` === body?.refresh_token);
        return u ? send(res, 200, session(u)) : send(res, 400, { error_code: "refresh_token_not_found", msg: "Invalid Refresh Token" });
      }
    }
    if (route === "user") return user ? send(res, 200, authUser(user)) : send(res, 401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT" });
    if (route === "logout") return send(res, 204);
    if (route === ".well-known/jwks.json") return send(res, 200, { keys: [] });
    if (route === "settings") return send(res, 200, { external: { email: true }, disable_signup: false });
    return send(res, 404, { msg: `mock: no auth route ${route}` });
  }

  // ── PostgREST ──
  if (url.pathname.startsWith("/rest/v1/")) {
    const name = url.pathname.slice("/rest/v1/".length);
    if (name.startsWith("rpc/")) {
      const fn = name.slice(4);
      log("rpc", fn);
      return send(res, 200, rpc[fn] ?? null);
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      log("write", req.method, name, "(dropped)");
      const prefer = String(req.headers.prefer ?? "");
      if (prefer.includes("return=representation")) {
        const rows = Array.isArray(body) ? body : [body];
        const accept = String(req.headers.accept ?? "");
        return send(res, 201, accept.includes("vnd.pgrst.object") ? rows[0] : rows);
      }
      return send(res, req.method === "POST" ? 201 : 204);
    }
    const { rows, total, offset } = query(name, url);
    const accept = String(req.headers.accept ?? "");
    const prefer = String(req.headers.prefer ?? "");
    const headers = {};
    if (prefer.includes("count=")) {
      headers["Content-Range"] = rows.length ? `${offset}-${offset + rows.length - 1}/${total}` : `*/${total}`;
    }
    log("rest", req.method, name, url.search.slice(0, 140), `→ ${rows.length}/${total}`);
    if (req.method === "HEAD") { res.writeHead(200, { ...cors, ...headers }); return res.end(); }
    if (accept.includes("application/vnd.pgrst.object+json")) {
      if (rows.length !== 1) return send(res, 406, { code: "PGRST116", details: `The result contains ${rows.length} rows`, hint: null, message: "JSON object requested, multiple (or no) rows returned" }, headers);
      return send(res, 200, rows[0], headers);
    }
    return send(res, 200, rows, headers);
  }

  if (url.pathname.startsWith("/storage/v1/")) return send(res, 404, { message: "mock: no storage" });
  return send(res, 404, { message: `mock: no route ${url.pathname}` });
});
server.listen(PORT, HOST, () => log(`mock supabase on http://${HOST}:${PORT}`));
