import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("rendered SEO healthcheck contract", () => {
  it("fails on linked non-sitemap targets that do not return 200", () => {
    const source = readFileSync(
      join(process.cwd(), "scripts/seo/healthcheck.mjs"),
      "utf8",
    );

    expect(source).toContain("} else if (inboundFrom.has(path)) {");
    expect(source).toContain('"non-canonical internal link"');
    expect(source).toContain(
      "public internal anchors must point directly to a 200 destination",
    );
  });

  // The source pins above passed while checkPage threw a ReferenceError on
  // every page ("types is not defined"): the link graph never ran, orphans
  // read "unknown", and the weekly job still exited like any run with
  // findings. Running the script is the only check that catches that class.
  it(
    "runs end to end against a two-page site: the link graph completes and no page errors",
    async () => {
      const page = (title, ld, href) =>
        `<!doctype html><html><head><title>${title}</title>` +
        `<meta name="description" content="${title} — a page the healthcheck test serves.">` +
        `<script type="application/ld+json">${JSON.stringify(ld)}</script></head>` +
        `<body><main><h1>${title}</h1><a href="${href}">next</a></main></body></html>`;
      const pages = {
        "/": page(
          "Home page",
          { "@context": "https://schema.org", "@graph": [{ "@type": "Organization", name: "T" }, { "@type": "WebSite", name: "T" }] },
          "/blog/sample",
        ),
        "/blog/sample": page("Sample post", { "@context": "https://schema.org", "@type": "BlogPosting", headline: "S" }, "/"),
      };
      const sitemap =
        '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
        Object.keys(pages).map((path) => `<url><loc>https://usetruecap.com${path}</loc></url>`).join("") +
        "</urlset>";
      const server = createServer((req, res) => {
        const path = new URL(req.url ?? "/", "http://x").pathname;
        if (path === "/sitemap.xml") {
          res.writeHead(200, { "content-type": "application/xml" }).end(sitemap);
        } else if (path === "/robots.txt") {
          res.writeHead(200, { "content-type": "text/plain" }).end("User-agent: *\nAllow: /\n");
        } else if (pages[path]) {
          res.writeHead(200, { "content-type": "text/html" }).end(pages[path]);
        } else {
          res.writeHead(404, { "content-type": "text/html" }).end("<html><body>not found</body></html>");
        }
      });
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const address = server.address();
      const origin = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
      const dir = mkdtempSync(join(tmpdir(), "healthcheck-e2e-"));
      try {
        // Confine the script's network to the local site: its production-only
        // probes (the foreign deployment, the preview alias) see a failed
        // fetch, which it already treats as "gone".
        const preload = join(dir, "offline.mjs");
        writeFileSync(
          preload,
          `const real = globalThis.fetch;\n` +
            `globalThis.fetch = (input, init) => {\n` +
            `  const url = new URL(typeof input === "string" ? input : input.url);\n` +
            `  return url.origin === ${JSON.stringify(origin)} ? real(input, init) : Promise.reject(new TypeError("offline: " + url.origin));\n` +
            `};\n`,
        );
        const out = join(dir, "report.json");
        const child = spawn(
          process.execPath,
          ["--import", preload, join(process.cwd(), "scripts/seo/healthcheck.mjs"), "--json", out, "--base", origin],
          { stdio: ["ignore", "ignore", "pipe"] },
        );
        let stderr = "";
        child.stderr.on("data", (chunk) => (stderr += chunk));
        await new Promise((resolve) => child.on("close", resolve));

        const report = JSON.parse(readFileSync(out, "utf8"));
        const crawlErrors = report.findings.filter((f) => f.check === "crawl error");
        expect(crawlErrors, stderr).toEqual([]);
        expect(report.linkGraph.ran, report.linkGraph.reason).toBe(true);
        expect(report.linkGraph.orphans).toEqual([]);
        const home = report.pages.find((p) => p.path === "/");
        expect(home?.schemaTypes).toEqual(["Organization", "WebSite"]);
        expect(report.pages.find((p) => p.path === "/blog/sample")?.schemaTypes).toEqual(["BlogPosting"]);
      } finally {
        server.close();
        rmSync(dir, { recursive: true, force: true });
      }
    },
    30_000,
  );
});
