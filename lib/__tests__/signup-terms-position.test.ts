import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Go-to-market audit row P2-41. "By creating an account, you agree to the
 * Terms and acknowledge the Privacy Policy." sat inside the email form, 495px
 * below the Google sign-up button, so a visitor who signed up with Google
 * never passed it. It now sits above that button, once, with the same words.
 * No field, no checkbox: the position is the whole change.
 */
describe("the Terms and Privacy sentence on /auth/sign-up", () => {
  const form = readFileSync(join(process.cwd(), "components/auth/sign-up-form.tsx"), "utf8");
  const sentence = form.indexOf('data-signup-terms=""');
  const google = form.indexOf("<GoogleAuthButton");
  const emailForm = form.indexOf("<Form {...form}>");

  it("comes before the Google button, which comes before the email form", () => {
    expect(sentence).toBeGreaterThan(-1);
    expect(google).toBeGreaterThan(sentence);
    expect(emailForm).toBeGreaterThan(google);
  });

  it("keeps its words and both links, and is not repeated", () => {
    const text = form
      .slice(sentence, google)
      .replace(/\{" "\}/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ");
    expect(text).toContain(
      "By creating an account, you agree to the Terms and acknowledge the Privacy Policy .",
    );
    const block = form.slice(sentence, google);
    expect(block).toContain('href="/terms"');
    expect(block).toContain('href="/privacy"');
    expect(form.match(/By creating an account, you agree to the/g)).toHaveLength(1);
  });

  it("adds no consent field", () => {
    expect(form).not.toMatch(/type="checkbox"/);
    expect(form).not.toMatch(/name="(terms|consent|agree)/i);
  });

  it("leaves the no-card line beside the email submit button", () => {
    const line = form.indexOf("No card is requested and no subscription starts today.");
    expect(line).toBeGreaterThan(emailForm);
    expect(line).toBeLessThan(form.indexOf('type="submit"'));
  });
});
