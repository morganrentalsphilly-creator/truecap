import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/s/test",
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

import {
  HIDDEN_ADDRESS_HEADING,
  HIDDEN_ADDRESS_NOTE,
  SharedDealShell,
} from "@/components/investcalc/shared-deal-shell";
import { calculateAnalysis } from "@/lib/calc-analysis";
import { buildPublicShareAnalysisPayload } from "@/lib/public-share-analysis-result";
import { SAMPLE_DEAL_VALUES } from "@/lib/sample-deal";

/**
 * A client report's address (2026-10 audit row P2-141; decided 2026-10-03:
 * "make the agent choose").
 *
 * The Share dialog reset "include the address" to off on every open, so a
 * client report sent with the defaults was headed "Property address hidden
 * by sharer". Now a Client link has no address default: the dialog asks show
 * or hide and makes no link until one is picked. A hidden address heads the
 * page "Rental analysis" with one line saying the sender kept it private.
 * Partner and Lender review links keep the unticked checkbox.
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const DIALOG = read("components/investcalc/share-link-button.tsx");
const PLACEHOLDER = "Property address hidden by sharer";

describe("the Share dialog's address choice for a Client link", () => {
  it("starts with nothing chosen, on every open and on every move to Client", () => {
    expect(DIALOG).toContain("const [addressChoice, setAddressChoice] = useState<boolean | null>(null);");
    // openShare, the reopen after sign-in, and the switch to Client.
    expect(DIALOG.split("setAddressChoice(null)").length - 1).toBe(3);
    expect(DIALOG).toContain('if (next === "client" && audience !== "client") setAddressChoice(null);');
    // Neither radio is pre-selected: each is checked only by its own answer.
    expect(DIALOG).toContain('name="share-client-address"');
    expect(DIALOG).toContain("checked={addressChoice === include}");
    expect(DIALOG).not.toMatch(/defaultChecked/);
  });

  it("makes no link until the agent picks show or hide", () => {
    expect(DIALOG).toContain('audience === "client" && addressChoice === null;');
    const prepare = DIALOG.slice(DIALOG.indexOf("const prepareShare = async"));
    const guard = prepare.indexOf("if (clientAddressChoiceMissing) return;");
    const mint = prepare.indexOf("createPublicShareAction({");
    expect(guard).toBeGreaterThan(-1);
    expect(mint).toBeGreaterThan(guard);
    expect(DIALOG).toContain("disabled={isPreparing || clientAddressChoiceMissing}");
    expect(DIALOG).toContain("Choose one to create the link. Neither is selected for you.");
  });

  it("sends exactly what was picked, and only an explicit yes shows the address", () => {
    expect(DIALOG).toContain("const includeAddress = addressChoice === true;");
    expect(DIALOG).toContain('addressVisibility: includeAddress ? "full" : "hidden"');
    expect(DIALOG).toContain("title: includeAddress ? values.address || undefined : undefined");
  });

  it("tells the agent what each answer does, in the share page's own words", () => {
    expect(DIALOG).toContain("Show the exact address");
    expect(DIALOG).toContain("Hide the exact address");
    expect(DIALOG).toContain(`The page is headed “${HIDDEN_ADDRESS_HEADING}”`);
    // What a hidden address removes is what the page really withholds.
    const page = read("app/s/[token]/page.tsx");
    expect(page).toContain("comps={addressVisible ? comps : null}");
    expect(read("components/investcalc/read-only-analysis-view.tsx")).toContain(
      "copyShareToken && addressIncluded ? (",
    );
  });

  it("leaves Partner and Lender review links as they were: one checkbox, off", () => {
    expect(DIALOG).toContain('type="checkbox"');
    expect(DIALOG).toContain("checked={includeAddress}");
    expect(DIALOG).toContain("Include the exact property address");
    expect(DIALOG).toContain("Off by default.");
  });
});

describe("the share page with the address hidden", () => {
  const result = calculateAnalysis(SAMPLE_DEAL_VALUES);
  const render = (addressIncluded: boolean) =>
    renderToStaticMarkup(
      <SharedDealShell
        shareSurface="opaque_share"
        values={
          addressIncluded
            ? SAMPLE_DEAL_VALUES
            : { ...SAMPLE_DEAL_VALUES, address: PLACEHOLDER }
        }
        analysis={buildPublicShareAnalysisPayload(result, true)}
        comps={null}
        agent={null}
        addressIncluded={addressIncluded}
      />,
    );

  it("is headed 'Rental analysis' with one line saying the sender kept the address private", () => {
    expect(HIDDEN_ADDRESS_HEADING).toBe("Rental analysis");
    expect(HIDDEN_ADDRESS_NOTE).toBe("The sender kept the property address private.");
    const html = render(false);
    expect(/<h1[^>]*>([^<]*)<\/h1>/.exec(html)?.[1]).toBe("Rental analysis");
    expect(html.split(HIDDEN_ADDRESS_NOTE).length - 1).toBe(1);
    // The placeholder the lead signature is bound to is never printed, and
    // neither is the address.
    expect(html).not.toContain(PLACEHOLDER);
    expect(html).not.toContain(SAMPLE_DEAL_VALUES.address);
  });

  it("is headed by the address when the sender chose to show it", () => {
    const html = render(true);
    expect(/<h1[^>]*>([^<]*)<\/h1>/.exec(html)?.[1]).toBe(SAMPLE_DEAL_VALUES.address);
    expect(html).not.toContain(HIDDEN_ADDRESS_NOTE);
  });

  it("keeps the hash-bound placeholder identical where the page signs and the lead action verifies", () => {
    // The heading changed; the value both sides hash did not. Existing links
    // and their lead forms keep working.
    const literal = `address: "${PLACEHOLDER}"`;
    expect(read("app/s/[token]/page.tsx")).toContain(literal);
    expect(read("app/actions/capture-deal-lead.ts")).toContain(literal);
  });
});
