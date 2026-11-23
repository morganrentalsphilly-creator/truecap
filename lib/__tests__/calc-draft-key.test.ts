import { describe, expect, it } from "vitest";
import {
  CALC_FORM_DRAFT_KEY,
  adoptAnonymousCalcDraft,
  calcDraftKeyFor,
} from "@/lib/calc-draft-key";
import { clearSensitiveKeysFromStorage } from "@/lib/client-auth-storage";

function makeStorage(entries: Record<string, string> = {}) {
  const values = new Map(Object.entries(entries));
  return {
    get length() {
      return values.size;
    },
    key(index: number) {
      return [...values.keys()][index] ?? null;
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    },
    dump() {
      return Object.fromEntries(values);
    },
  };
}

describe("analyzer draft key (audit C7)", () => {
  it("gives each account its own key and anonymous visitors the original one", () => {
    expect(calcDraftKeyFor(null)).toBe(CALC_FORM_DRAFT_KEY);
    expect(calcDraftKeyFor(undefined)).toBe(CALC_FORM_DRAFT_KEY);
    expect(calcDraftKeyFor("  ")).toBe(CALC_FORM_DRAFT_KEY);
    expect(calcDraftKeyFor("user-a")).toBe(`${CALC_FORM_DRAFT_KEY}:user-a`);
    expect(calcDraftKeyFor("user-a")).not.toBe(calcDraftKeyFor("user-b"));
  });

  it("migrates the existing un-keyed draft to the signed-in account once", () => {
    const storage = makeStorage({ [CALC_FORM_DRAFT_KEY]: "legacy draft" });
    adoptAnonymousCalcDraft(storage, "user-a");
    expect(storage.dump()).toEqual({
      [`${CALC_FORM_DRAFT_KEY}:user-a`]: "legacy draft",
    });
    // A second call has nothing left to move and changes nothing.
    adoptAnonymousCalcDraft(storage, "user-a");
    expect(storage.dump()).toEqual({
      [`${CALC_FORM_DRAFT_KEY}:user-a`]: "legacy draft",
    });
  });

  it("never shows one account's draft to another", () => {
    const storage = makeStorage({
      [`${CALC_FORM_DRAFT_KEY}:user-a`]: "a's deal",
    });
    adoptAnonymousCalcDraft(storage, "user-b");
    expect(storage.getItem(calcDraftKeyFor("user-b"))).toBeNull();
    expect(storage.getItem(calcDraftKeyFor("user-a"))).toBe("a's deal");
  });

  it("lets work started anonymously follow the visitor into their account", () => {
    const storage = makeStorage({
      [CALC_FORM_DRAFT_KEY]: "typed before signing in",
      [`${CALC_FORM_DRAFT_KEY}:user-a`]: "older account draft",
    });
    adoptAnonymousCalcDraft(storage, "user-a");
    expect(storage.getItem(calcDraftKeyFor("user-a"))).toBe(
      "typed before signing in",
    );
    expect(storage.getItem(CALC_FORM_DRAFT_KEY)).toBeNull();
  });

  it("leaves an anonymous visitor's draft where it is", () => {
    const storage = makeStorage({ [CALC_FORM_DRAFT_KEY]: "anon" });
    adoptAnonymousCalcDraft(storage, null);
    expect(storage.dump()).toEqual({ [CALC_FORM_DRAFT_KEY]: "anon" });
  });

  it("is still cleared on sign-out, whichever key holds it", () => {
    const storage = makeStorage({
      [CALC_FORM_DRAFT_KEY]: "anon",
      [`${CALC_FORM_DRAFT_KEY}:user-a`]: "a's deal",
      truecap_cookie_consent_v1: "accepted",
    });
    clearSensitiveKeysFromStorage(storage);
    expect(storage.dump()).toEqual({ truecap_cookie_consent_v1: "accepted" });
  });
});
