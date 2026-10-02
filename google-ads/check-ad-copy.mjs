#!/usr/bin/env node
/**
 * Checks google-ads/ad-copy.md against the code it was written from.
 *
 * Run from anywhere:  node google-ads/check-ad-copy.mjs
 * Exit code 0 when every check passes, 1 otherwise. It reads files only: it
 * sends nothing, writes nothing and needs no environment values.
 *
 * What it checks
 *   1. Length: headline 30, description 90, display path 15, sitelink text 25,
 *      sitelink description 35, callout 25.
 *   2. Shape: 3 to 15 headlines and 2 to 4 descriptions per ad group, no
 *      headline twice in one ad group.
 *   3. Landing pages: every agent ad group lands on /for-agents and every
 *      investor ad group on /for-investors; no Final URL or sitelink carries a
 *      query string, points at the homepage, or uses a retired /tools path
 *      (the keys of HISTORICAL_TOOL_REDIRECTS in lib/historical-tool-redirects.ts).
 *   4. Numbers: every dollar amount in the ad text is one of the four catalog
 *      prices in lib/public-pricing.ts, and all four appear; the trial length,
 *      the trial allowance, the roster size and the Buy Box cap match
 *      lib/product-access.ts and the two server actions that enforce them.
 *   5. Claims the kit must not make: a refund or guarantee, a tax or exit
 *      feature, the refinance and resale strategy models, a report described
 *      as ready for a lender, a superlative, a usage count, an exclamation
 *      mark, and (unless --allow-free is passed) the word "free".
 *
 * The forbidden words are assembled from parts on purpose: a plain search of
 * this folder for one of them should find a real claim, not this list.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const allowFree = process.argv.includes("--allow-free");

const LIMITS = {
  headline: 30,
  description: 90,
  path: 15,
  sitelinkText: 25,
  sitelinkDescription: 35,
  callout: 25,
};

const SITE = "https://usetruecap.com";
const LANDING = { agents: `${SITE}/for-agents`, investors: `${SITE}/for-investors` };

const failures = [];
const fail = (message) => failures.push(message);

// ── The code the copy was written from ──────────────────────────────

function numberConstant(source, name, file) {
  const match = source.match(new RegExp(`\\b${name}\\s*=\\s*([0-9][0-9_.]*)`));
  if (!match) {
    fail(`${file}: could not find ${name}; update this check before trusting it`);
    return Number.NaN;
  }
  return Number(match[1].replaceAll("_", ""));
}

const usd = (amount) => (Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`);

const pricing = read("lib/public-pricing.ts");
const prices = {
  proMonthly: numberConstant(pricing, "PUBLIC_PRO_MONTHLY_USD", "lib/public-pricing.ts"),
  proAnnual: numberConstant(pricing, "PUBLIC_PRO_ANNUAL_USD", "lib/public-pricing.ts"),
  agentProMonthly: numberConstant(pricing, "PUBLIC_AGENT_PRO_MONTHLY_USD", "lib/public-pricing.ts"),
  agentProAnnual: numberConstant(pricing, "PUBLIC_AGENT_PRO_ANNUAL_USD", "lib/public-pricing.ts"),
};
const priceLabels = Object.values(prices).map(usd);

const access = read("lib/product-access.ts");
const trial = {
  days: numberConstant(access, "PRODUCT_EVALUATION_DAYS", "lib/product-access.ts"),
  deals: numberConstant(access, "PRODUCT_EVALUATION_DEAL_LIMIT", "lib/product-access.ts"),
  comparisons: numberConstant(access, "PRODUCT_EVALUATION_COMPARISON_LIMIT", "lib/product-access.ts"),
};
const maxClients = numberConstant(read("app/actions/agent-clients.ts"), "MAX_CLIENTS", "app/actions/agent-clients.ts");
const maxBuyBoxes = numberConstant(read("app/actions/user-buy-boxes.ts"), "MAX_BUY_BOXES", "app/actions/user-buy-boxes.ts");

const redirects = read("lib/historical-tool-redirects.ts");
const redirectBlock = redirects.match(/HISTORICAL_TOOL_REDIRECTS\s*=\s*\{([\s\S]*?)\}\s*as const/);
const retiredPaths = redirectBlock
  ? [...redirectBlock[1].matchAll(/"([a-z0-9-]+)"\s*:/g)].map((m) => `/tools/${m[1]}`)
  : [];
if (retiredPaths.length === 0) {
  fail("lib/historical-tool-redirects.ts: could not read the retired /tools paths");
}

// ── Parse ad-copy.md ────────────────────────────────────────────────

const lines = read("google-ads/ad-copy.md").split("\n");
/** @type {{ name: string, campaign: string | null, finalUrl: string | null, path: string | null, headlines: string[], descriptions: string[] }[]} */
const adGroups = [];
/** @type {{ text: string, line1: string, line2: string, url: string }[]} */
const sitelinks = [];
/** @type {string[]} */
const callouts = [];

let campaign = null;
let group = null;
let nextBlock = null;
let inFence = false;
let inSitelinks = false;

for (const raw of lines) {
  const line = raw.trimEnd();
  if (inFence) {
    if (line.startsWith("```")) {
      inFence = false;
      nextBlock = null;
      continue;
    }
    if (line.trim() === "") continue;
    if (nextBlock === "headline" && group) group.headlines.push(line);
    else if (nextBlock === "description" && group) group.descriptions.push(line);
    else if (nextBlock === "callout") callouts.push(line);
    else fail(`ad-copy.md: text outside a known block: "${line}"`);
    continue;
  }
  if (line.startsWith("```")) {
    inFence = true;
    continue;
  }
  if (line.startsWith("## ")) {
    group = null;
    inSitelinks = false;
    const match = line.match(/^## Campaign: (agents|investors)\b/);
    campaign = match ? match[1] : null;
    continue;
  }
  if (line.startsWith("### ")) {
    inSitelinks = line === "### Sitelinks";
    group = null;
    if (line.startsWith("### Ad group ")) {
      group = { name: line.slice(4), campaign, finalUrl: null, path: null, headlines: [], descriptions: [] };
      adGroups.push(group);
    }
    if (line === "### Callouts") nextBlock = "callout";
    continue;
  }
  if (line === "Headlines") nextBlock = "headline";
  else if (line === "Descriptions") nextBlock = "description";
  else if (line === "Agents campaign only:") nextBlock = "callout";

  const finalUrl = line.match(/^- Final URL: `([^`]+)`$/);
  if (finalUrl && group) group.finalUrl = finalUrl[1];
  const path = line.match(/^- Display path: `([^`]+)`$/);
  if (path && group) group.path = path[1];

  if (inSitelinks && line.startsWith("|")) {
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.length === 4 && !/^-+$/.test(cells[0]) && cells[0] !== "Sitelink text") {
      sitelinks.push({ text: cells[0], line1: cells[1], line2: cells[2], url: cells[3].replaceAll("`", "") });
    }
  }
}

// ── Checks ──────────────────────────────────────────────────────────

const tooLong = (kind, text, limit) => {
  if (text.length > limit) fail(`${kind} is ${text.length} characters (limit ${limit}): "${text}"`);
};

function checkUrl(label, value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(`${label}: not a URL: ${value}`);
    return;
  }
  if (url.origin !== SITE) fail(`${label}: not on ${SITE}: ${value}`);
  if (url.search || url.hash) fail(`${label}: carries a query string or fragment: ${value}`);
  if (url.pathname === "/") fail(`${label}: lands on the homepage: ${value}`);
  if (retiredPaths.includes(url.pathname)) fail(`${label}: uses a retired /tools path: ${value}`);
}

if (adGroups.length === 0) fail("ad-copy.md: no ad groups found");

for (const adGroup of adGroups) {
  const where = adGroup.name;
  if (!adGroup.campaign) fail(`${where}: not under an agents or investors campaign heading`);
  if (!adGroup.finalUrl) fail(`${where}: no Final URL`);
  else {
    checkUrl(`${where} Final URL`, adGroup.finalUrl);
    if (adGroup.campaign && adGroup.finalUrl !== LANDING[adGroup.campaign]) {
      fail(`${where}: Final URL must be ${LANDING[adGroup.campaign]}, found ${adGroup.finalUrl}`);
    }
  }
  if (!adGroup.path) fail(`${where}: no display path`);
  else for (const part of adGroup.path.split("/")) tooLong(`${where} display path`, part, LIMITS.path);
  if (adGroup.headlines.length < 3 || adGroup.headlines.length > 15) {
    fail(`${where}: ${adGroup.headlines.length} headlines (3 to 15 allowed)`);
  }
  if (adGroup.descriptions.length < 2 || adGroup.descriptions.length > 4) {
    fail(`${where}: ${adGroup.descriptions.length} descriptions (2 to 4 allowed)`);
  }
  const seen = new Set();
  for (const headline of adGroup.headlines) {
    tooLong(`${where} headline`, headline, LIMITS.headline);
    if (seen.has(headline.toLowerCase())) fail(`${where}: headline appears twice: "${headline}"`);
    seen.add(headline.toLowerCase());
  }
  for (const description of adGroup.descriptions) tooLong(`${where} description`, description, LIMITS.description);
}

if (sitelinks.length === 0) fail("ad-copy.md: no sitelinks found");
for (const sitelink of sitelinks) {
  tooLong("sitelink text", sitelink.text, LIMITS.sitelinkText);
  tooLong("sitelink description", sitelink.line1, LIMITS.sitelinkDescription);
  tooLong("sitelink description", sitelink.line2, LIMITS.sitelinkDescription);
  checkUrl(`sitelink "${sitelink.text}"`, sitelink.url);
}
if (callouts.length === 0) fail("ad-copy.md: no callouts found");
for (const callout of callouts) tooLong("callout", callout, LIMITS.callout);

const adText = [
  ...adGroups.flatMap((adGroup) => [...adGroup.headlines, ...adGroup.descriptions]),
  ...sitelinks.flatMap((sitelink) => [sitelink.text, sitelink.line1, sitelink.line2]),
  ...callouts,
];

// Numbers.
for (const label of priceLabels) {
  if (!adText.some((text) => text.includes(label))) {
    fail(`catalog price ${label} (lib/public-pricing.ts) appears in no ad line: the kit was written from another price`);
  }
}
for (const text of adText) {
  for (const amount of text.match(/\$[0-9][0-9,.]*[0-9]|\$[0-9]/g) ?? []) {
    if (!priceLabels.includes(amount)) fail(`"${text}": ${amount} is not a catalog price (${priceLabels.join(", ")})`);
  }
  const days = text.match(/(\d+)-day/);
  if (days && Number(days[1]) !== trial.days) fail(`"${text}": the trial is ${trial.days} days`);
  const deals = text.match(/(\d+) Pro deals?/);
  if (deals && Number(deals[1]) !== trial.deals) fail(`"${text}": the trial covers ${trial.deals} Pro deals`);
  const comparisons = text.match(/(\d+) comparisons?/);
  if (comparisons && Number(comparisons[1]) !== trial.comparisons) {
    fail(`"${text}": the trial covers ${trial.comparisons} comparison`);
  }
  const clients = text.match(/(\d+)[ -]clients?/);
  if (clients && Number(clients[1]) !== maxClients) fail(`"${text}": the roster holds up to ${maxClients} clients`);
  const buyBoxes = text.match(/(\d+) Buy Boxes/);
  if (buyBoxes && Number(buyBoxes[1]) !== maxBuyBoxes) fail(`"${text}": an account keeps up to ${maxBuyBoxes} Buy Boxes`);
}

// Claims the kit must not make.
const word = (...parts) => parts.join("[- ]?");
const forbidden = [
  ["a refund or guarantee", new RegExp(`\\b(refund|guarantee|${word("money", "back")})`, "i")],
  ["a tax feature", /\btax(es)?\b/i],
  ["an exit feature", /\bexit/i],
  ["a refinance or resale strategy model", new RegExp(`\\b(b${"r".repeat(4)}|flip|${word("fix", "and", "flip")})`, "i")],
  ["a report described as ready for a lender", new RegExp(word("lender", "ready"), "i")],
  ["a superlative", /\b(best|fastest|easiest|smartest|leading|top[- ]rated|#1|number one|ultimate|most)\b/i],
  ["a usage or proof claim", /\b(trusted by|rated|reviews?|\d[\d,]*\+? (investors|agents|users|customers|deals analyzed))\b/i],
  ["an exclamation mark", /!/],
];
if (!allowFree) forbidden.push(['the word "free" (the open switch in ad-copy.md)', /\bfree\b/i]);
for (const text of adText) {
  for (const [what, pattern] of forbidden) {
    if (pattern.test(text)) fail(`"${text}": makes ${what}`);
  }
}

// ── Report ──────────────────────────────────────────────────────────

const longest = (list) => list.reduce((max, text) => Math.max(max, text.length), 0);
console.log(`ad groups: ${adGroups.length}`);
for (const adGroup of adGroups) {
  console.log(
    `  ${adGroup.name}: ${adGroup.headlines.length} headlines (longest ${longest(adGroup.headlines)}), ` +
      `${adGroup.descriptions.length} descriptions (longest ${longest(adGroup.descriptions)}), ${adGroup.finalUrl}`,
  );
}
console.log(`sitelinks: ${sitelinks.length}, callouts: ${callouts.length} (longest ${longest(callouts)})`);
console.log(`catalog prices: ${priceLabels.join(", ")}`);
console.log(`trial: ${trial.days} days, ${trial.deals} Pro deals, ${trial.comparisons} comparison; roster ${maxClients}; Buy Boxes ${maxBuyBoxes}`);
console.log(`retired /tools paths checked: ${retiredPaths.length}`);
console.log(`the word "free" in ad text: ${allowFree ? "allowed (--allow-free)" : "not allowed"}`);

if (failures.length > 0) {
  console.error(`\n${failures.length} problem(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("\nall checks passed");
