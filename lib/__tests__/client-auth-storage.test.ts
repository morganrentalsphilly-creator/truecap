import { describe, expect, it } from "vitest";
import { clearSensitiveKeysFromStorage } from "@/lib/client-auth-storage";

function makeStorage(entries: Record<string, string>) {
  const values = new Map(Object.entries(entries));
  return {
    get length() {
      return values.size;
    },
    key(index: number) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    has(key: string) {
      return values.has(key);
    },
  };
}

describe("clearSensitiveKeysFromStorage", () => {
  it("removes underwriting continuity data while preserving consent and UI preferences", () => {
    const storage = makeStorage({
      truecap_calc_form_draft_v1: "deal inputs",
      "truecap_saved_analysis_edit_draft::nonce": "saved deal",
      "truecap:one-time-pdf-draft-v2": "report inputs",
      "truecap:batch-triage:v2": "pasted properties",
      truecap_cookie_consent_v1: "accepted",
      truecap_deal_strategy: "buy-and-hold",
    });

    clearSensitiveKeysFromStorage(storage);

    expect(storage.has("truecap_calc_form_draft_v1")).toBe(false);
    expect(storage.has("truecap_saved_analysis_edit_draft::nonce")).toBe(false);
    expect(storage.has("truecap:one-time-pdf-draft-v2")).toBe(false);
    expect(storage.has("truecap:batch-triage:v2")).toBe(false);
    expect(storage.has("truecap_cookie_consent_v1")).toBe(true);
    expect(storage.has("truecap_deal_strategy")).toBe(true);
  });
});
