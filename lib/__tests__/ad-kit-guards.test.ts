/**
 * The Google Ads kit (google-ads/ad-copy.md) is written from the live
 * catalog: the four prices in lib/public-pricing.ts, the trial length and
 * allowance, the roster size and the Buy Box cap. google-ads/check-ad-copy.mjs
 * compares the kit with that code (lengths, landing pages, every number, and
 * the claims the kit must not make) and exits 1 on any mismatch. Report row
 * P0-20, founder answer 4: the kit was rewritten from the live prices and
 * trial terms after the old one advertised retired prices, a refund promise
 * and retired /tools URLs.
 *
 * The script was something the kit's README told a reader to run; this case
 * makes it a gate, so a price, trial or limit change that leaves the kit
 * behind fails CI instead of shipping in an ad. The script reads files only:
 * it sends nothing, writes nothing and needs no environment values.
 */
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

describe("the Google Ads kit matches the live catalog", () => {
  it("passes google-ads/check-ad-copy.mjs", () => {
    let output = "";
    let exitCode = 0;
    try {
      output = execFileSync(process.execPath, [join(ROOT, "google-ads/check-ad-copy.mjs")], {
        cwd: ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      const failed = error as { status?: number; stdout?: string; stderr?: string };
      exitCode = failed.status ?? 1;
      output = `${failed.stdout ?? ""}${failed.stderr ?? ""}`;
    }
    expect(exitCode, output).toBe(0);
    expect(output).toContain("all checks passed");
  });
});
