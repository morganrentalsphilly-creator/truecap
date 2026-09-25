/**
 * Loopback stand-in for the HUD FMR and FRED APIs used by the analyzer's
 * address enrichment. The app is pointed at it with
 * HUD_API_BASE_URL / FRED_API_BASE_URL (loopback-only overrides read by
 * app/actions/enrich-property.ts). It lets browser tests exercise the
 * provider paths no live API reproduces on demand: timeouts, 5xx, malformed
 * payloads, and the state-average / county / ZIP resolution ladder.
 *
 * HUD behaviour is keyed by the requested state so one server instance can
 * serve every scenario without control traffic:
 *   OH  two counties, Franklin is a SAFMR area (ZIP 43215 → $2,150 3BR)
 *   MI  one county, no small-area data (county figure only)
 *   TX  500 Internal Server Error
 *   GA  hangs longer than the action's 5 s timeout
 *   NV  200 with a body that is not JSON
 *   WA  200 with no counties or metros (no usable benchmark)
 * FRED behaviour is set in-process with setFredMode().
 */
import http from "node:http";
import type { AddressInfo } from "node:net";

export type FredMode = "ok" | "500" | "timeout" | "garbage" | "empty";

export type EnrichmentMockServer = {
  origin: string;
  port: number;
  setFredMode: (mode: FredMode) => void;
  requests: () => { method: string; path: string }[];
  close: () => Promise<void>;
};

const OH_COUNTIES = [
  {
    county_name: "Franklin County",
    town_name: "",
    fips_code: "3904999999",
    smallarea_status: "1",
    Efficiency: 950,
    "One-Bedroom": 1100,
    "Two-Bedroom": 1350,
    "Three-Bedroom": 1850,
    "Four-Bedroom": 2200,
  },
  {
    county_name: "Cuyahoga County",
    town_name: "",
    fips_code: "3903599999",
    smallarea_status: "0",
    Efficiency: 850,
    "One-Bedroom": 950,
    "Two-Bedroom": 1200,
    "Three-Bedroom": 1650,
    "Four-Bedroom": 1900,
  },
];

const MI_COUNTIES = [
  {
    county_name: "Wayne County",
    town_name: "",
    fips_code: "2616399999",
    smallarea_status: "0",
    Efficiency: 800,
    "One-Bedroom": 900,
    "Two-Bedroom": 1150,
    "Three-Bedroom": 1400,
    "Four-Bedroom": 1650,
  },
];

const OH_SAFMR_ROWS = [
  { zip_code: "43215", Efficiency: "1100", "One-Bedroom": "1300", "Two-Bedroom": "1600", "Three-Bedroom": "2150", "Four-Bedroom": "2500" },
  { zip_code: "43201", Efficiency: "900", "One-Bedroom": "1050", "Two-Bedroom": "1300", "Three-Bedroom": "1750", "Four-Bedroom": "2000" },
];

export const MOCK_FRED_RATE = "6.42";
export const MOCK_FRED_AS_OF = "2026-09-18";
/** State-average 3BR rent the typed-address path resolves for OH (mean of 1850, 1650). */
export const MOCK_OH_STATE_AVERAGE_3BR = 1750;
export const MOCK_MI_3BR = 1400;

export async function startEnrichmentMockServer(port = 3199): Promise<EnrichmentMockServer> {
  let fredMode: FredMode = "ok";
  const log: { method: string; path: string }[] = [];

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    log.push({ method: req.method ?? "GET", path: url.pathname });
    const json = (status: number, body: unknown) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };

    if (url.pathname === "/fred/series/observations") {
      switch (fredMode) {
        case "500":
          return json(500, { error_message: "mock outage" });
        case "timeout":
          return void setTimeout(() => json(200, { observations: [] }), 7_000);
        case "garbage":
          res.writeHead(200, { "content-type": "application/json" });
          return res.end("<html>not json</html>");
        case "empty":
          return json(200, { observations: [{ date: MOCK_FRED_AS_OF, value: "." }] });
        default:
          return json(200, { observations: [{ date: MOCK_FRED_AS_OF, value: MOCK_FRED_RATE }] });
      }
    }

    const stateMatch = url.pathname.match(/^\/hudapi\/public\/fmr\/statedata\/([A-Z]{2})$/);
    if (stateMatch) {
      if (req.headers.authorization !== "Bearer audit-hud-key") return json(401, { error: "unauthorized" });
      switch (stateMatch[1]) {
        case "OH":
          return json(200, { data: { year: 2026, counties: OH_COUNTIES, metroareas: [] } });
        case "MI":
          return json(200, { data: { year: 2026, counties: MI_COUNTIES, metroareas: [] } });
        case "TX":
          return json(500, { error: "mock outage" });
        case "GA":
          return void setTimeout(() => json(200, { data: { year: 2026, counties: [], metroareas: [] } }), 7_000);
        case "NV":
          res.writeHead(200, { "content-type": "application/json" });
          return res.end("{ this is not json");
        case "WA":
          return json(200, { data: { year: 2026, counties: [], metroareas: [] } });
        default:
          return json(404, { error: "no such state in the mock" });
      }
    }

    const entityMatch = url.pathname.match(/^\/hudapi\/public\/fmr\/data\/([^/]+)$/);
    if (entityMatch) {
      if (req.headers.authorization !== "Bearer audit-hud-key") return json(401, { error: "unauthorized" });
      if (entityMatch[1] === "3904999999") {
        return json(200, { data: { year: 2026, basicdata: OH_SAFMR_ROWS } });
      }
      // Non-SAFMR entity: HUD returns a single object, not an array.
      return json(200, { data: { year: 2026, basicdata: { county_name: "n/a" } } });
    }

    return json(404, { error: "unknown mock route", path: url.pathname });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });
  const address = server.address() as AddressInfo;
  return {
    origin: `http://127.0.0.1:${address.port}`,
    port: address.port,
    setFredMode: (mode) => {
      fredMode = mode;
    },
    requests: () => [...log],
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections?.();
        server.close(() => resolve());
      }),
  };
}
