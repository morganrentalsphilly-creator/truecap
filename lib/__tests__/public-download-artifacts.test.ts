import { readFileSync } from "node:fs";
import path from "node:path";
import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const workbookPath = path.join(
  ROOT,
  "public/downloads/truecap-rental-property-analyzer.xlsx",
);
const packPath = path.join(
  ROOT,
  "public/downloads/truecap-market-intelligence-pack.pdf",
);

function workbookXml(): string {
  const files = unzipSync(new Uint8Array(readFileSync(workbookPath)));
  return Object.entries(files)
    .filter(([name]) => name.endsWith(".xml"))
    .map(([, bytes]) => strFromU8(bytes))
    .join("\n");
}

describe("public downloadable artifacts", () => {
  it("renders all-cash DSCR as the exact not-applicable label", () => {
    const xml = workbookXml();

    expect(xml).toContain('IF(B25&gt;0,(B11-B40)/B25,"N/A — no debt service")');
    expect(xml).toContain(
      "On an all-cash purchase, DSCR renders N/A — no debt service",
    );
    expect(xml).not.toContain("DSCR shows 0 on an all-cash purchase");
  });

  it("does not advertise unreleased tax or modeled-exit outputs in the workbook", () => {
    const xml = workbookXml();

    expect(xml).not.toMatch(/after-tax effects/i);
    expect(xml).not.toMatch(/tax strategy/i);
    expect(xml).not.toMatch(/exit scenarios/i);
    expect(xml).toContain(
      "scheduled loan balance, cash-flow and modeled-equity planning",
    );
  });

  it("keeps specialist recommendations out of the market pack and its generator", () => {
    const pdf = readFileSync(packPath).toString("latin1");
    const generator = readFileSync(
      path.join(ROOT, "scripts/build-market-intelligence-pack.ts"),
      "utf8",
    );

    expect(pdf).not.toMatch(/BRRRR/i);
    expect(pdf).not.toMatch(/Fits strategies/i);
    expect(pdf).toMatch(/Buy-and-hold screening note/i);
    expect(generator).not.toContain("s.bestStrategies");
    expect(generator).not.toContain("Fits strategies");
    expect(generator).toContain("Buy-and-hold screening note");
  });

  it("keeps the stale market pack out of active capture and links the reviewed playbook", () => {
    const spreadsheetPage = readFileSync(
      path.join(ROOT, "app/tools/rental-property-spreadsheet/page.tsx"),
      "utf8",
    );
    const capture = readFileSync(
      path.join(ROOT, "components/marketing/lead-magnet-capture.tsx"),
      "utf8",
    );
    const delivery = readFileSync(
      path.join(ROOT, "app/actions/lead-magnet-capture.ts"),
      "utf8",
    );

    expect(spreadsheetPage).toContain("N/A — no debt service");
    expect(spreadsheetPage).not.toContain("same spreadsheet math");
    expect(capture).toContain("The First Offer Playbook");
    expect(capture).not.toContain("state-by-state numbers");
    expect(delivery).toContain('const RESOURCE_PATH = "/playbook"');
    expect(delivery).not.toContain("Download the Market Intelligence Pack");
    expect(delivery).not.toContain("protects you from a bad buy");
  });
});
