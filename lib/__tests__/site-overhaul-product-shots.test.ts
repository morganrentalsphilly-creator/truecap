import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { PRODUCT_SHOTS } from "@/lib/product-shots.generated";
import { findProductShot } from "@/components/marketing/product-shot";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
// Encode the prohibited identity so the guard does not publish it itself.
const privateGivenName = String.fromCharCode(77, 111, 114, 103, 97, 110);
const privateHandle = String.fromCharCode(109, 111, 114, 103, 97, 110, 114, 101, 110, 116, 97, 108, 115, 112, 104, 105, 108, 108, 121);
const forbiddenGivenName = new RegExp(`\\b${privateGivenName}\\b`, "i");
const forbiddenHandle = new RegExp(privateHandle, "i");

/**
 * Phase 4 (docs/site-overhaul.md): every product image on the marketing site
 * is a REAL screenshot from the no-account sample flow. No placeholders, no
 * generated faces, or invented product proof.
 */
describe("product screenshots are real and wired", () => {
  it("ships the captured verdict, waterfall, and memo shots for both viewports", () => {
    for (const shot of ["verdict", "where-the-rent-goes", "memo"]) {
      for (const viewport of ["desktop", "mobile"] as const) {
        const entry = findProductShot(shot, viewport);
        expect(entry, `${shot}-${viewport}`).not.toBeNull();
        expect(entry!.width).toBeGreaterThan(300);
        expect(entry!.height).toBeGreaterThan(200);
        expect(entry!.source).toMatch(/\/analyze\?sample=1$|\/sample-decision-memo$/);
        // The files the module points at exist in public/.
        readFileSync(join(ROOT, "public", entry!.webp));
        readFileSync(join(ROOT, "public", entry!.png));
      }
    }
    expect(PRODUCT_SHOTS.every((s) => s.captured_at.length > 0)).toBe(true);
  });

  it("renders nothing for an unknown shot instead of a placeholder", () => {
    expect(findProductShot("does-not-exist")).toBeNull();
    const source = read("components/marketing/product-shot.tsx");
    expect(source).toContain("if (!entry) return null;");
    expect(source).not.toMatch(/placeholder\.(?:jpg|svg|png)/);
  });

  it("uses the hero screenshot as the preloaded LCP image with a live-sample link", () => {
    const hero = read("components/marketing/marketing-hero.tsx");
    expect(hero).toContain('findProductShot("verdict", "desktop")');
    expect(hero).toContain("priority");
    expect(hero).toContain('href="/analyze?sample=1"');
    expect(hero).toContain("Live sample →");
  });

  it("places a product shot on every listed marketing surface", () => {
    for (const path of [
      "app/pricing/page.tsx",
      "app/for-buy-and-hold/page.tsx",
      "app/for-house-hackers/page.tsx",
      "app/for-agents/page.tsx",
      "app/blog/page.tsx",
      "app/vs/page.tsx",
    ]) {
      expect(read(path), path).toContain("<ProductShot");
    }
  });

  it("renders no founder card; /about carries no Person node or personal name", () => {
    for (const path of [
      "app/page.tsx",
      "app/home-authed/page.tsx",
      "app/pricing/page.tsx",
      "app/reviews/page.tsx",
    ]) {
      expect(read(path), path).not.toContain("FounderCard");
    }
    // The founder is described, never named (their request, 2026-09-07).
    const about = read("app/about/page.tsx");
    expect(about).not.toContain('"@type": "Person"');
    expect(about).not.toMatch(forbiddenGivenName);
  });
});

/**
 * The founder is described, never named, anywhere in the public repository
 * (their request, 2026-09-07). Docs pasted from a local terminal are the
 * usual leak: a macOS home path carries the account name, and an OAuth or
 * marketing note carries a personal handle or mailbox. This sweep covers the
 * tracked text under docs/, scripts/, e2e/, .github/ and the root Markdown so
 * the rule is enforced rather than remembered.
 */
describe("no founder identity in tracked repo text", () => {
  const TEXT_EXT = new Set([".md", ".mdx", ".ts", ".tsx", ".mjs", ".js", ".json", ".yml", ".yaml", ".sh", ".sql", ".txt"]);
  const walk = (dir: string, out: string[] = []): string[] => {
    const absolute = join(ROOT, dir);
    if (!existsSync(absolute)) return out;
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const relative = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(relative, out);
      else if (TEXT_EXT.has(extname(entry.name))) out.push(relative);
    }
    return out;
  };
  const files = [
    ...walk("docs"),
    ...walk("scripts"),
    ...walk("e2e"),
    ...walk(".github"),
    ...readdirSync(ROOT).filter((name) => name.endsWith(".md")),
  ];


  it("keeps the private name out of customer surfaces and shared runtime code", () => {
    const runtimeFiles = ["app", "components", "emails", "lib"]
      .flatMap((root) => walk(root))
      .filter((path) => !path.includes("/__tests__/"));
    expect(runtimeFiles.length).toBeGreaterThan(100);
    for (const path of runtimeFiles) {
      // An unrelated financial institution is not the personal identity.
      const source = read(path).replaceAll(`J.P. ${privateGivenName}`, "financial institution");
      expect(source, path).not.toMatch(forbiddenGivenName);
      expect(source, path).not.toMatch(forbiddenHandle);
    }
    // The guard's source itself must not re-publish its prohibited patterns.
    const guard = read("lib/__tests__/site-overhaul-product-shots.test.ts");
    expect(guard).not.toMatch(forbiddenGivenName);
    expect(guard).not.toMatch(forbiddenHandle);
  });

  it("scans a non-trivial set of files", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it.each(files)("%s carries no home path, personal handle, or retired Person anchor", (path) => {
    const source = read(path);
    // A macOS/Linux home path names the local account (the founder's name).
    expect(source, `${path}: home path`).not.toMatch(/\/Users\/[A-Za-z0-9_.-]+/);
    expect(source, `${path}: home path`).not.toMatch(/\/home\/[A-Za-z0-9_.-]+\//);
    expect(source, `${path}: personal handle`).not.toMatch(forbiddenHandle);
    expect(source.replaceAll(`J.P. ${privateGivenName}`, "financial institution"), `${path}: personal name`)
      .not.toMatch(forbiddenGivenName);
    // The Person JSON-LD anchor that carried the first name was retired.
    expect(source, `${path}: retired anchor`).not.toContain(`about#${privateGivenName.toLowerCase()}`);
  });
});
