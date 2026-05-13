"use server";

/**
 * Server action: fetch a real-estate listing URL via ScrapingBee and return
 * structured property data the form can pre-fill.
 *
 * Supports Zillow, Redfin, Realtor.com, Trulia, Homes.com. Zillow blocks
 * direct scraping aggressively — ScrapingBee handles the proxy + JS render.
 *
 * Strategy:
 *   1. JSON-LD (works well for Redfin / Realtor.com).
 *   2. Zillow's __NEXT_DATA__ blob (recursive search for the property record).
 *   3. OG/meta tag fallback.
 */

const SCRAPINGBEE_ENDPOINT = "https://app.scrapingbee.com/api/v1/";

const ALLOWED_HOSTS = [
  "zillow.com",
  "redfin.com",
  "realtor.com",
  "trulia.com",
  "homes.com",
] as const;

export type ImportedListing = {
  address?: string;
  purchasePrice?: number;
  yearBuilt?: number;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  monthlyRent?: number;
  source: string;
};

export type ImportListingResult =
  | { ok: true; data: ImportedListing }
  | { ok: false; code: "CONFIG" | "INVALID_URL" | "UNSUPPORTED" | "FETCH_FAILED" | "NOT_FOUND"; message: string };

export async function importListingAction(rawUrl: unknown): Promise<ImportListingResult> {
  const apiKey = process.env.SCRAPINGBEE_API_KEY;
  if (!apiKey) {
    return { ok: false, code: "CONFIG", message: "Listing import is not configured on this server." };
  }

  if (typeof rawUrl !== "string" || rawUrl.trim().length === 0) {
    return { ok: false, code: "INVALID_URL", message: "Please paste a listing URL." };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { ok: false, code: "INVALID_URL", message: "That doesn't look like a valid URL." };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, code: "INVALID_URL", message: "URL must start with http:// or https://." };
  }

  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  const matchedHost = ALLOWED_HOSTS.find((h) => host === h || host.endsWith(`.${h}`));
  if (!matchedHost) {
    return {
      ok: false,
      code: "UNSUPPORTED",
      message: `${host} isn't supported yet. Try a Zillow, Redfin, or Realtor.com URL.`,
    };
  }

  // ScrapingBee request.
  // - render_js=false: huge speed win. Zillow ships __NEXT_DATA__ in the
  //   server-rendered HTML so we don't need a headless browser.
  // - For Zillow, stealth_proxy=true (residential IPs) bypasses bot
  //   detection more reliably than premium_proxy.
  const params = new URLSearchParams({
    api_key: apiKey,
    url: parsed.toString(),
    render_js: "false",
    country_code: "us",
    block_resources: "true",
  });
  if (matchedHost === "zillow.com") {
    params.set("stealth_proxy", "true");
  } else {
    params.set("premium_proxy", "true");
  }

  // 20s hard timeout — keeps the UX from hanging if ScrapingBee is slow.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);

  let html: string;
  try {
    const res = await fetch(`${SCRAPINGBEE_ENDPOINT}?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await safeReadShortBody(res);
      return {
        ok: false,
        code: "FETCH_FAILED",
        message: explainScrapingBeeError(res.status, detail),
      };
    }
    html = await res.text();
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      code: "FETCH_FAILED",
      message: aborted
        ? "Fetching took too long. Try again or paste the details manually."
        : "Network error reaching the listing. Try again.",
    };
  } finally {
    clearTimeout(timer);
  }

  const extracted = extractListing(html, matchedHost);
  const meaningfulKeys = Object.keys(extracted).filter(
    (k) => k !== "source" && extracted[k as keyof ImportedListing] !== undefined
  );
  if (meaningfulKeys.length === 0) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "We fetched the page but couldn't find structured property data. Fill in the form manually.",
    };
  }

  return { ok: true, data: { ...extracted, source: matchedHost } };
}

// -------------------- parsing --------------------

function extractListing(html: string, host: string): ImportedListing {
  const out: ImportedListing = { source: host };

  // 1. JSON-LD blocks
  for (const block of jsonLdBlocks(html)) {
    const items = Array.isArray(block) ? block : [block];
    for (const item of items) {
      const fields = fromJsonLd(item);
      mergeListing(out, fields);
    }
  }

  // 2. Zillow __NEXT_DATA__ — only run if Zillow and we're still missing key fields
  if (host === "zillow.com" && (out.purchasePrice === undefined || out.bedrooms === undefined)) {
    const nextData = matchNextData(html);
    if (nextData) {
      const fields = fromZillowNextData(nextData);
      mergeListing(out, fields);
    }
  }

  // 3. OG/meta fallback
  if (out.address === undefined || out.purchasePrice === undefined) {
    const fields = fromMetaTags(html);
    mergeListing(out, fields);
  }

  return out;
}

function mergeListing(into: ImportedListing, from: Partial<ImportedListing>) {
  for (const key of Object.keys(from) as (keyof ImportedListing)[]) {
    const v = from[key];
    if (v !== undefined && v !== null && v !== "" && into[key] === undefined) {
      // @ts-expect-error generic merge
      into[key] = v;
    }
  }
}

function* jsonLdBlocks(html: string): Generator<unknown> {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const text = m[1].trim();
      if (!text) continue;
      yield JSON.parse(text);
    } catch {
      // skip malformed blocks
    }
  }
}

function matchNextData(html: string): unknown {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

function fromJsonLd(item: unknown): Partial<ImportedListing> {
  if (!isObject(item)) return {};
  const out: Partial<ImportedListing> = {};

  // Address
  const address = item["address"];
  if (typeof address === "string") {
    out.address = address;
  } else if (isObject(address)) {
    const parts = [
      address.streetAddress,
      address.addressLocality,
      address.addressRegion,
      address.postalCode,
    ]
      .filter((p): p is string => typeof p === "string" && p.length > 0)
      .map((s) => s.trim());
    if (parts.length) out.address = parts.join(", ");
  }

  // Bedrooms / bathrooms
  const beds = item.numberOfRooms ?? item.numberOfBedrooms ?? item.bedrooms;
  if (typeof beds === "number" || (typeof beds === "string" && beds)) {
    const n = Number(beds);
    if (!isNaN(n) && n > 0) out.bedrooms = n;
  }
  const baths = item.numberOfBathroomsTotal ?? item.numberOfFullBathrooms ?? item.bathrooms;
  if (typeof baths === "number" || (typeof baths === "string" && baths)) {
    const n = Number(baths);
    if (!isNaN(n) && n > 0) out.bathrooms = n;
  }

  // sqft
  const floor = item.floorSize;
  if (isObject(floor) && (typeof floor.value === "number" || typeof floor.value === "string")) {
    const n = Number(floor.value);
    if (!isNaN(n) && n > 0) out.sqft = n;
  } else if (typeof item.floorSize === "number") {
    out.sqft = item.floorSize;
  }

  // Year built
  if (typeof item.yearBuilt === "number" || (typeof item.yearBuilt === "string" && item.yearBuilt)) {
    const n = Number(item.yearBuilt);
    if (!isNaN(n) && n > 1700 && n < 2100) out.yearBuilt = n;
  }

  // Price (Product/Offer pattern, or direct)
  const price = pickPrice(item.offers) ?? pickPrice(item);
  if (price !== undefined) out.purchasePrice = price;

  return out;
}

function pickPrice(node: unknown): number | undefined {
  if (!node) return undefined;
  if (typeof node === "number") return node > 0 ? node : undefined;
  if (typeof node === "string") {
    const n = Number(node.replace(/[^0-9.]/g, ""));
    return !isNaN(n) && n > 0 ? n : undefined;
  }
  if (isObject(node)) {
    if ("price" in node) return pickPrice(node.price);
    if ("lowPrice" in node) return pickPrice(node.lowPrice);
    if ("highPrice" in node) return pickPrice(node.highPrice);
  }
  return undefined;
}

function fromZillowNextData(root: unknown): Partial<ImportedListing> {
  // Recursively walk; first object that looks like a property record wins.
  const seen = new WeakSet<object>();
  const queue: unknown[] = [root];
  while (queue.length) {
    const node = queue.shift();
    if (!isObject(node)) {
      if (Array.isArray(node)) queue.push(...node);
      continue;
    }
    if (seen.has(node)) continue;
    seen.add(node);

    if (looksLikeZillowProperty(node)) {
      return zillowPropertyFields(node);
    }
    for (const v of Object.values(node)) queue.push(v);
  }
  return {};
}

function looksLikeZillowProperty(o: Record<string, unknown>): boolean {
  // Heuristic: has price + bedrooms + (streetAddress or address)
  const hasPrice = typeof o.price === "number" && (o.price as number) > 1000;
  const hasBeds = typeof o.bedrooms === "number";
  const hasAddress =
    typeof o.streetAddress === "string" ||
    (isObject(o.address) && typeof o.address.streetAddress === "string");
  return hasPrice && hasBeds && hasAddress;
}

function zillowPropertyFields(o: Record<string, unknown>): Partial<ImportedListing> {
  const out: Partial<ImportedListing> = {};
  if (typeof o.price === "number" && o.price > 0) out.purchasePrice = o.price;
  if (typeof o.bedrooms === "number" && o.bedrooms > 0) out.bedrooms = o.bedrooms;
  if (typeof o.bathrooms === "number" && o.bathrooms > 0) out.bathrooms = o.bathrooms;
  if (typeof o.livingArea === "number" && o.livingArea > 0) out.sqft = o.livingArea;
  if (typeof o.yearBuilt === "number" && o.yearBuilt > 1700) out.yearBuilt = o.yearBuilt;
  if (typeof o.rentZestimate === "number" && o.rentZestimate > 0) out.monthlyRent = o.rentZestimate;

  if (isObject(o.address)) {
    const a = o.address;
    const parts = [a.streetAddress, a.city, a.state, a.zipcode]
      .filter((p): p is string => typeof p === "string" && p.length > 0);
    if (parts.length) out.address = parts.join(", ");
  } else if (typeof o.streetAddress === "string") {
    const parts = [o.streetAddress, o.city, o.state, o.zipcode]
      .filter((p): p is string => typeof p === "string" && p.length > 0);
    if (parts.length) out.address = parts.join(", ");
  }
  return out;
}

function fromMetaTags(html: string): Partial<ImportedListing> {
  const out: Partial<ImportedListing> = {};
  const ogTitle = metaContent(html, "og:title") ?? metaContent(html, "twitter:title");
  if (ogTitle) {
    // Zillow titles often look like: "1700 W Erie Ave, Philadelphia, PA 19140 | MLS #..."
    const cleaned = ogTitle.split("|")[0]?.trim();
    if (cleaned && /\d/.test(cleaned)) out.address = cleaned;
  }
  const ogDescription = metaContent(html, "og:description");
  if (ogDescription && out.purchasePrice === undefined) {
    const m = ogDescription.match(/\$([0-9,]{4,})/);
    if (m) {
      const n = Number(m[1].replace(/,/g, ""));
      if (!isNaN(n) && n > 1000) out.purchasePrice = n;
    }
  }
  return out;
}

function metaContent(html: string, name: string): string | undefined {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escapeRegex(name)}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );
  const m = html.match(re);
  return m?.[1];
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

async function safeReadShortBody(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text.slice(0, 200);
  } catch {
    return "";
  }
}

function explainScrapingBeeError(status: number, _detail: string): string {
  // ScrapingBee status reference:
  // 401: bad API key. 402: out of credits. 403/404: blocked/not found.
  // 422: render failed. 429: rate-limited. 5xx: gateway/server issue.
  switch (status) {
    case 401:
      return "ScrapingBee API key is invalid. Double-check the value in Vercel settings.";
    case 402:
      return "ScrapingBee account is out of credits.";
    case 403:
    case 404:
      return "The listing site blocked the request or the page no longer exists. Try a different URL or paste details manually.";
    case 422:
      return "ScrapingBee couldn't render the page. Try again — Zillow sometimes throws a one-time challenge.";
    case 429:
      return "Hitting ScrapingBee's rate limit. Wait a minute and try again.";
    case 500:
    case 502:
    case 503:
    case 504:
      return "ScrapingBee couldn't reach the listing right now. Try again in a few seconds.";
    default:
      return `Couldn't fetch the listing (HTTP ${status}). Try again or paste details manually.`;
  }
}

