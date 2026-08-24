import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
}

const dueThisWeek = source("../../components/dashboard/due-this-week-card.tsx");
const brandingForm = source("../../components/settings/branding-form.tsx");
const topDeals = source("../../components/dashboard/TopDeals.tsx");
const compareDealPicker = source("../../components/investcalc/compare-deal-picker.tsx");

describe("client hydration determinism", () => {
  it("defers viewer-local deadline calculations until after mount", () => {
    expect(dueThisWeek).toContain(
      "const [todayISO, setTodayISO] = useState<string | null>(null)"
    );
    expect(dueThisWeek).toContain("setTodayISO(localTodayISO())");
    expect(dueThisWeek).toContain("if (!todayISO) return []");
    expect(dueThisWeek).not.toContain("const todayISO = localTodayISO();");
  });

  it("defers the viewer-local branding preview date until after mount", () => {
    expect(brandingForm).toContain('const [preparedDate, setPreparedDate] = useState("")');
    expect(brandingForm).toContain("setPreparedDate(todayShort())");
    expect(brandingForm).not.toContain("Prepared {todayShort()}");
  });

  it("pins initial dashboard number formatting to the product locale", () => {
    expect(topDeals).not.toContain(".toLocaleString()");
    expect(compareDealPicker).not.toContain(".toLocaleString()");
    expect(topDeals).toContain('.toLocaleString("en-US")');
    expect(compareDealPicker).toContain('.toLocaleString("en-US")');
  });
});
