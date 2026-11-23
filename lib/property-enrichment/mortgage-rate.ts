import "server-only";

/**
 * The 30-year mortgage-rate benchmark (Freddie Mac's weekly survey, read from
 * FRED series MORTGAGE30US).
 *
 * ONE implementation for the two server callers:
 *   - the analyzer's pages, which pass the benchmark to the form as its
 *     starting rate so a new analysis opens on the current figure (audit A2:
 *     the rate used to arrive only after an address was picked, so a preview
 *     typed before the address ran on the 6.75% product fallback);
 *   - `enrichPropertyAction`, which still reports it with the rent benchmark.
 *
 * FRED prints once a week, so the figure is cached twice: in the module (a
 * warm serverless instance never refetches inside the TTL) and, for page
 * renders, in Next's Data Cache (`next.revalidate`), which outlives the
 * instance. A missing key, a timeout, a non-200 or a malformed observation
 * all return null; the caller then uses the product fallback and labels it
 * as one. Nothing here throws.
 */

export type MortgageRateBenchmark = {
  /** Percent, e.g. 7.28. */
  rate: number;
  /** FRED's observation date, "2026-11-19". */
  asOf: string;
};

/** Remote-call ceiling. Callers render or answer a user interaction. */
const DEFAULT_TIMEOUT_MS = 5_000;
const RATE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
/** Data Cache lifetime for page renders (seconds). */
const PAGE_REVALIDATE_SECONDS = 6 * 60 * 60;

type CachedRate = MortgageRateBenchmark & { fetchedAt: number };
let mortgageRateCache: CachedRate | null = null;

/**
 * Provider origin, overridable ONLY for automated tests and only to a
 * loopback origin, so a stray variable can never redirect a keyed request off
 * the machine (see e2e/support/enrichment-mock-server.ts).
 */
function fredBaseUrl(): string {
  const fallback = "https://api.stlouisfed.org";
  const raw = process.env.FRED_API_BASE_URL?.trim();
  if (!raw) return fallback;
  try {
    const url = new URL(raw);
    if (
      url.protocol === "http:" &&
      ["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname)
    ) {
      return url.origin;
    }
  } catch {
    /* fall through to the real provider */
  }
  console.warn("[enrichProperty] ignoring non-loopback provider override", {
    envName: "FRED_API_BASE_URL",
  });
  return fallback;
}

export async function fetchMortgageRateBenchmark(options?: {
  /**
   * "page": cache the provider response in Next's Data Cache, for server
   * renders. "action" (default): no-store, as the enrichment action always
   * did; the module cache still applies.
   */
  cache?: "page" | "action";
  timeoutMs?: number;
}): Promise<MortgageRateBenchmark | null> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    console.warn("[enrichProperty] FRED_API_KEY not set in environment");
    return null;
  }

  if (
    mortgageRateCache &&
    Date.now() - mortgageRateCache.fetchedAt < RATE_CACHE_TTL_MS
  ) {
    return { rate: mortgageRateCache.rate, asOf: mortgageRateCache.asOf };
  }

  const url = new URL(`${fredBaseUrl()}/fred/series/observations`);
  url.searchParams.set("series_id", "MORTGAGE30US");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", "1");

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let res: Response;
    try {
      res = await fetch(url.toString(), {
        signal: controller.signal,
        ...(options?.cache === "page"
          ? { next: { revalidate: PAGE_REVALIDATE_SECONDS } }
          : { cache: "no-store" as const }),
      });
    } catch (err) {
      const name = (err as Error | undefined)?.name;
      if (name === "AbortError") {
        console.warn("[enrichProperty] remote provider request timed out", {
          errorClass: "timeout",
          timeoutMs,
        });
      } else {
        console.warn("[enrichProperty] remote provider request failed", {
          errorClass: name ?? "network-error",
        });
      }
      return null;
    }
    if (!res.ok) {
      console.warn("[enrichProperty] FRED request failed", {
        provider: "fred",
        endpoint: "series-observations",
        status: res.status,
      });
      return null;
    }
    const json = (await res.json()) as {
      observations?: Array<{ value: string; date: string }>;
    };
    const latest = json.observations?.[0];
    if (!latest || latest.value === "." || isNaN(Number(latest.value))) {
      console.warn("[enrichProperty] FRED returned no valid observation", {
        provider: "fred",
        endpoint: "series-observations",
        errorClass: "invalid-observation",
      });
      return null;
    }
    const rate = Number(latest.value);
    console.log("[enrichProperty] FRED mortgage-rate observation refreshed", {
      provider: "fred",
      asOf: latest.date,
    });
    mortgageRateCache = { rate, asOf: latest.date, fetchedAt: Date.now() };
    return { rate, asOf: latest.date };
  } catch (err) {
    console.warn("[enrichProperty] FRED processing failed", {
      provider: "fred",
      errorClass: (err as Error | undefined)?.name ?? "processing-error",
    });
    return null;
  } finally {
    clearTimeout(timer);
  }
}
