import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("guest analysis signup continuity", () => {
  it("arms save intent for Google, email signup, and login with a safe return", () => {
    const prompt = read("components/marketing/signup-prompt-card.tsx");
    const dashboard = read("components/investcalc/analysis-dashboard.tsx");
    const googleButton = read("components/auth/google-auth-button.tsx");
    expect(prompt).toContain("setPendingSaveIntent()");
    expect(prompt).toContain("onPrepareSaveIntent?.()");
    expect(prompt).toContain('href="/auth/sign-up?next=/"');
    expect(prompt).toContain('href="/auth/login?next=/"');
    expect(prompt).toContain('onBeforeStart={() => beginSignup("google")}');
    expect(dashboard).toContain(
      "onPrepareAuthSave(activeMaoTarget ?? undefined, offerCeilingTargetSource)"
    );
    expect(googleButton).toContain("onBeforeStart?.()");
  });

  it("restores, runs, and persists before acknowledging the intent", () => {
    const calculator = read("components/investcalc/investcalc-page.tsx");
    expect(calculator).toContain("hasPendingSaveIntent()");
    expect(calculator).toContain("performSaveDeal({ autoAfterAuth: true })");
    expect(calculator).toContain("clearPendingSaveIntent()");
    expect(calculator).toContain("writeCalcDraftWithMaoTarget(");
    expect(calculator).toContain(
      'source ?? analysisMaoTargetSource ?? "selected-targets"'
    );
    expect(calculator).toContain("autoAfterAuth: duplicateCollision.autoAfterAuth");
    expect(calculator).toContain(
      "options.existingIdOverride ??"
    );
    expect(calculator).toContain(
      "options.autoAfterAuth || options.forceInsert ? null : savedDealId"
    );
    expect(calculator).toContain("isAutoSaveResuming");
    expect(calculator).toContain("if (saveInFlightRef.current) return false");
    expect(calculator).toContain("saveInFlightRef.current = false");
    expect(calculator).toContain("const cancelledAutoSave = Boolean(duplicateCollision?.autoAfterAuth)");
    expect(calculator).toContain('title: "Automatic save canceled"');
    expect(calculator).toContain("setIsAutoSaveResuming(false)");
    expect(calculator).toContain('trackEvent("analysis_saved_after_signup"');
    expect(calculator).not.toContain("Hit Save to keep it");
  });
});
