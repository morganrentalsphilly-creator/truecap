import { describe, it, expect } from "vitest";
import { renderLifecycleEmail } from "@/lib/email/render-lifecycle";
import type { DueLifecycleEmail } from "@/lib/lifecycle-emails";

const SITE = "https://usetruecap.com";

const cases: Array<{ name: string; due: DueLifecycleEmail }> = [
  { name: "welcome", due: { userId: "u", email: "a@b.com", kind: "welcome", key: "welcome" } },
  { name: "drip day 1", due: { userId: "u", email: "a@b.com", kind: "drip", key: "drip_1", dripDay: 1 } },
  { name: "pro nudge", due: { userId: "u", email: "a@b.com", kind: "pro_nudge", key: "pro_nudge" } },
  { name: "win-back", due: { userId: "u", email: "a@b.com", kind: "winback", key: "winback_21d" } },
];

describe("renderLifecycleEmail", () => {
  for (const c of cases) {
    it(`renders the ${c.name} email to valid HTML + text`, async () => {
      const out = await renderLifecycleEmail(c.due, SITE);
      expect(out).not.toBeNull();
      expect(out!.subject.length).toBeGreaterThan(3);
      expect(out!.html).toContain("TrueCap");
      expect(out!.html).toContain("<html"); // real document rendered
      expect(out!.html).toContain(`${SITE}/settings`); // manage-preferences link present
      expect(out!.text.length).toBeGreaterThan(40);
    });
  }

  it("returns null for a drip day with no content file", async () => {
    const out = await renderLifecycleEmail(
      { userId: "u", email: "a@b.com", kind: "drip", key: "drip_99", dripDay: 99 },
      SITE
    );
    expect(out).toBeNull();
  });
});
