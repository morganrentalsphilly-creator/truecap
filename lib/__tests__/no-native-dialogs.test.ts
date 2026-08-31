import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

/**
 * Every destructive or work-clearing guard uses the in-app ActionConfirm
 * dialogs, never window.confirm / window.prompt.
 *
 * Fourteen flows used native dialogs — bulk delete, Pass confirmations and
 * their reason prompts, client removal, the address-swap guard, the
 * new-analysis guard, "analyze another", and the leave-with-unsaved-changes
 * guard. Native dialogs render as unstyled OS chrome (the founder hit the
 * address-swap one as a bare iOS sheet), can't be focus-managed or themed,
 * and were invisible to the automation that drives every other dialog in the
 * product — the bulk-delete flow literally could not be exercised by the
 * browser tests until this migration.
 *
 * This scan is the completeness proof: if a new native dialog sneaks in
 * anywhere under app/, components/ or lib/, it fails and names the file.
 * (window.alert has no legitimate call site either.)
 */

describe("no native browser dialogs", () => {
  it("app, components and lib never call window.confirm/prompt/alert", () => {
    let output = "";
    try {
      output = execFileSync(
        "grep",
        [
          "-rn",
          "--include=*.ts",
          "--include=*.tsx",
          "-E",
          "window\\.(confirm|prompt|alert)\\(",
          "app",
          "components",
          "lib",
        ],
        { cwd: process.cwd(), encoding: "utf8" },
      );
    } catch (error) {
      // grep exits 1 when nothing matches — the passing case.
      const status = (error as { status?: number }).status;
      if (status !== 1) throw error;
    }
    const offenders = output
      .split("\n")
      .filter(Boolean)
      // This test file quotes the patterns it forbids.
      .filter((line) => !line.includes("no-native-dialogs.test.ts"));
    expect(
      offenders,
      `native dialogs found — migrate them to useActionConfirm():\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
