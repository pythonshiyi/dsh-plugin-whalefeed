/**
 * dsh-plugin-whalefeed — node half.
 *
 * Provides optional host-backed persistence for whale-girl states so the same
 * profile can share whales across browsers/devices (not just one browser's
 * localStorage).
 *
 * Endpoints (same-origin, no CORS):
 *   GET  /dsh-whalefeed-states            -> { ok, states: { [sessionId]: state } }
 *   GET  /dsh-whalefeed-state?session=..  -> { ok, state: state|null }
 *   PUT  /dsh-whalefeed-state?session=..  -> { ok }  (body: { state })
 *
 * The store is a single JSON file in the Harness workspace/data directory.
 * The browser half keeps using localStorage as a fast cache and falls back to
 * it automatically when this host half is unavailable.
 */
import { readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const inject = ["webServer"];
const STORE_FILE = "dsh-plugin-whalefeed-store.json";
const ASSETS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");

function resolveStorePath(ctx) {
  try {
    const sp = ctx.get("sandboxPolicy");
    if (sp !== undefined && typeof sp.workspaceRoot === "string" && sp.workspaceRoot.length > 0) {
      return join(sp.workspaceRoot, STORE_FILE);
    }
  } catch {
    /* fall through */
  }
  try {
    return join(process.cwd(), STORE_FILE);
  } catch {
    return STORE_FILE;
  }
}

function readStore(file) {
  try {
    if (!existsSync(file)) return {};
    const raw = readFileSync(file, "utf8");
    const data = JSON.parse(raw);
    return data !== null && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function writeStore(file, store) {
  const tmp = file + ".tmp";
  writeFileSync(tmp, JSON.stringify(store, null, 2), "utf8");
  renameSync(tmp, file);
}

function sendJson(res, status, payload) {
  try {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.statusCode = status;
    res.end(JSON.stringify(payload));
  } catch {
    /* client may have disconnected */
  }
}

function queryParam(req, name) {
  try {
    const url = new URL(req.url || "/", "http://localhost");
    return url.searchParams.get(name);
  } catch {
    return null;
  }
}

async function readJsonBody(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1024 * 1024) break;
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function apply(ctx, _config) {
  const webServer = ctx.get("webServer");
  if (webServer === undefined || typeof webServer.register !== "function") return;
  const file = resolveStorePath(ctx);

  const routeStates = webServer.register({
    kind: "exact",
    path: "/dsh-whalefeed-states",
    handler: async (_req, res) => {
      try {
        sendJson(res, 200, { ok: true, states: readStore(file) });
      } catch (e) {
        sendJson(res, 500, { ok: false, error: "READ_FAILED", message: String((e && e.message) || e) });
      }
    },
  });

  const routeState = webServer.register({
    kind: "exact",
    path: "/dsh-whalefeed-state",
    handler: async (req, res) => {
      const session = queryParam(req, "session");
      if (!session) {
        sendJson(res, 400, { ok: false, error: "MISSING_SESSION", message: "Missing session query parameter" });
        return;
      }
      if (req.method === "PUT" || req.method === "POST") {
        const body = await readJsonBody(req);
        const state = body && body.state && typeof body.state === "object" ? body.state : null;
        if (!state) {
          sendJson(res, 400, { ok: false, error: "BAD_BODY", message: "Body must be { state: {...} }" });
          return;
        }
        try {
          const store = readStore(file);
          store[session] = state;
          writeStore(file, store);
          sendJson(res, 200, { ok: true });
        } catch (e) {
          sendJson(res, 500, { ok: false, error: "WRITE_FAILED", message: String((e && e.message) || e) });
        }
        return;
      }

      try {
        const store = readStore(file);
        const state = Object.prototype.hasOwnProperty.call(store, session) ? store[session] : null;
        sendJson(res, 200, { ok: true, state });
      } catch (e) {
        sendJson(res, 500, { ok: false, error: "READ_FAILED", message: String((e && e.message) || e) });
      }
    },
  });

  const routeAssets = webServer.register({
    kind: "prefix",
    path: "/dsh-whalefeed-assets",
    handler: async (req, res) => {
      try {
        const url = new URL(req.url || "/", "http://localhost");
        const prefix = "/dsh-whalefeed-assets/";
        const rawName = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : "";
        const name = basename(decodeURIComponent(rawName));
        if (!name.endsWith(".png") || name.includes("..")) {
          res.statusCode = 404;
          res.end("Not Found");
          return;
        }
        const file = join(ASSETS_DIR, name);
        if (!existsSync(file)) {
          res.statusCode = 404;
          res.end("Not Found");
          return;
        }
        const data = readFileSync(file);
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, max-age=3600");
        res.statusCode = 200;
        res.end(data);
      } catch {
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    },
  });

  // Return a disposer that removes all routes when the plugin row is disabled.
  return () => {
    try {
      routeStates();
    } catch {
      /* best effort */
    }
    try {
      routeState();
    } catch {
      /* best effort */
    }
    try {
      routeAssets();
    } catch {
      /* best effort */
    }
  };
}

export { apply, inject };
