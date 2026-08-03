import { describe, expect, it } from "vitest";
import {
  escapeHtml,
  sanitizeAddressText,
  MAX_EMAIL_ADDRESS_TEXT,
} from "@/lib/html-escape";

describe("escapeHtml", () => {
  it("escapes angle brackets so markup can't be injected", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;"
    );
  });

  it("escapes quotes so an attribute can't be broken out of", () => {
    expect(escapeHtml(`" onmouseover="evil()`)).toBe(
      "&quot; onmouseover=&quot;evil()"
    );
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it("escapes ampersands first so entities aren't double-encoded", () => {
    // & must be replaced before < / >, or "&lt;" would become "&amp;lt;".
    expect(escapeHtml("<")).toBe("&lt;");
    expect(escapeHtml("Smith & Sons")).toBe("Smith &amp; Sons");
    expect(escapeHtml("&amp;")).toBe("&amp;amp;");
  });

  it("neutralises the exact payload from the finding", () => {
    const payload =
      '</strong><a href="https://evil.example/verify">Confirm your TrueCap account</a>';
    const escaped = escapeHtml(payload);
    expect(escaped).not.toContain("<a");
    expect(escaped).not.toContain("</strong>");
    expect(escaped).not.toContain('href="');
  });

  it("treats null/undefined as empty string", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml("")).toBe("");
  });
});

describe("sanitizeAddressText", () => {
  it("keeps a normal street address intact", () => {
    expect(sanitizeAddressText("1234 N 5th St, Philadelphia, PA 19122")).toBe(
      "1234 N 5th St, Philadelphia, PA 19122"
    );
  });

  it("keeps accented characters and address punctuation", () => {
    expect(sanitizeAddressText("12 Rue de l'Église #3B (rear)")).toBe(
      "12 Rue de l'Église #3B (rear)"
    );
  });

  it("strips every markup delimiter, not just angle brackets", () => {
    const dirty = `<a href="x">click</a>` + "`;{}\\";
    const clean = sanitizeAddressText(dirty);
    for (const ch of ["<", ">", '"', "`", "{", "}", "\\", "="]) {
      expect(clean).not.toContain(ch);
    }
  });

  it("collapses whitespace and trims", () => {
    expect(sanitizeAddressText("  10   Main   St \n")).toBe("10 Main St");
  });

  it("caps length", () => {
    const long = "A".repeat(500);
    expect(sanitizeAddressText(long)).toHaveLength(MAX_EMAIL_ADDRESS_TEXT);
  });

  it("returns empty when nothing usable survives, so the template falls back", () => {
    expect(sanitizeAddressText("<>")).toBe("");
    expect(sanitizeAddressText("<b>")).toBe(""); // one leftover char isn't an address
    expect(sanitizeAddressText(undefined)).toBe("");
    expect(sanitizeAddressText("   ")).toBe("");
  });

  it("sanitize + escape together are inert as email HTML", () => {
    const attack =
      '</strong><a href="https://evil.example">Verify your TrueCap billing now</a>';
    const rendered = escapeHtml(sanitizeAddressText(attack));
    expect(rendered).not.toMatch(/[<>"]/);
  });
});
