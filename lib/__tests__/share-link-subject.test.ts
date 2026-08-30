import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  defaultValues,
  type InvestmentFormValues,
} from "@/lib/investcalc-schema";
import {
  shareLinkSubjectFingerprint,
  type ShareLinkSubject,
} from "@/lib/share-link-subject";
import { isCurrentShareAuthRequest } from "@/lib/share-auth-lifecycle";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const subject: ShareLinkSubject = {
  values: {
    ...defaultValues,
    address: "123 Private Street, Philadelphia, PA",
    purchasePrice: 245_000,
    monthlyRent: 2_450,
  } as InvestmentFormValues,
  savedDealId: "11111111-1111-4111-8111-111111111111",
  maoTarget: { monthlyCashFlow: 350 },
  maoTargetSource: "selected-targets" as const,
  adoptedDecisionBasis: null,
  priceIsEstimated: false,
  context: "analysis" as const,
  analyzerStrategyKey: "buy-hold" as const,
  isAuthenticated: true,
  authenticatedUserId: USER_A,
  authSessionEpoch: 1,
};

describe("share-link subject identity", () => {
  it("is stable and never contains the raw private subject", () => {
    const first = shareLinkSubjectFingerprint(subject);
    const clone = shareLinkSubjectFingerprint(
      JSON.parse(JSON.stringify(subject)) as typeof subject,
    );

    expect(first).toBe(clone);
    expect(first).toMatch(/^[a-f0-9]{16}$/);
    expect(first).not.toContain(subject.values!.address);
    expect(first).not.toContain(USER_A);
  });

  const changes: Array<[string, Partial<ShareLinkSubject>]> = [
    [
      "property values",
      { values: { ...subject.values!, address: "456 New Deal Road" } },
    ],
    ["saved deal", { savedDealId: "22222222-2222-4222-8222-222222222222" }],
    ["offer target", { maoTarget: { monthlyCashFlow: 500 } }],
    ["target source", { maoTargetSource: "starter-criteria" as const }],
    ["price provenance", { priceIsEstimated: true }],
    ["audience context", { context: "client-report" as const }],
    ["analysis strategy", { analyzerStrategyKey: "brrrr" as const }],
    ["authentication state", { isAuthenticated: false }],
    ["authenticated owner", { authenticatedUserId: USER_B }],
    ["authentication epoch", { authSessionEpoch: 2 }],
  ];

  it.each(changes)("changes when %s changes", (_label, patch) => {
    expect(shareLinkSubjectFingerprint({ ...subject, ...patch })).not.toBe(
      shareLinkSubjectFingerprint(subject),
    );
  });

  it("invalidates subject-bound UI and guards every mutation continuation", () => {
    const source = readFileSync(
      join(process.cwd(), "components/investcalc/share-link-button.tsx"),
      "utf8",
    );

    expect(source).toContain("shareLinkSubjectFingerprint({");
    expect(source).toContain("authenticatedUserId: authIdentity.userId");
    expect(source).toContain("authSessionEpoch: authIdentity.epoch");
    expect(source).toContain("supabase.auth.onAuthStateChange");
    expect(source).toContain("getFreshSessionUser(supabase)");
    expect(source).toContain("expectedUserId");
    expect(source).toContain('authIdentity.status === "checking"');
    expect(source).toContain('authIdentity.status === "unavailable"');
    expect(source).toContain("Verifying your signed-in account…");
    expect(source).toContain("Retry session verification");
    expect(source).toContain(
      "setAuthVerificationRetry((current) => current + 1)",
    );
    expect(source).toContain("activeShareSubjectRef.current = shareSubjectFingerprint");
    expect(source).toContain("useLayoutEffect(() => {");
    expect(source).toContain('setShareUrl("")');
    expect(source).toContain("setIncludeAddress(false)");
    expect(source).toContain(
      'setAudience(context === "client-report" ? "client" : "investment-partner")',
    );
    expect(source).toContain("activeShareSubjectRef.current = null");

    for (const requestRef of [
      "createRequestRef",
      "revokeRequestRef",
      "olderSharesRequestRef",
      "firstSharesRequestRef",
    ]) {
      expect(source).toContain(`${requestRef}.current = requestToken`);
      expect(source).toContain(`${requestRef}.current = null`);
      expect(source).toContain(`${requestRef}.current === requestToken`);
    }
    expect(
      source.match(/if \(!requestStillOwnsSubject\(\)\) return;/g)?.length,
    ).toBeGreaterThanOrEqual(6);

    const prepareStart = source.indexOf("const prepareShare = async");
    const prepareEnd = source.indexOf("const copy = async", prepareStart);
    const prepare = source.slice(prepareStart, prepareEnd);
    expect(prepare).toContain("const includeAddressAtSubmit = includeAddress");
    expect(prepare).toContain("const audienceAtSubmit = audience");
    expect(prepare).toContain("addressVisibility: includeAddressAtSubmit");
    expect(prepare).toContain("audience: audienceAtSubmit");
    const createAwait = prepare.indexOf("await createPublicShareAction({");
    expect(
      prepare.indexOf("if (!requestStillOwnsSubject()) return;", createAwait),
    ).toBeGreaterThan(createAwait);

    expect(source).toContain("<fieldset disabled={isPreparing}>");
    expect(source).toContain("disabled={isPreparing}");
  });

  it("does not paint a deferred account-A list response after switching to account B", async () => {
    let resolveList!: (value: string[]) => void;
    const deferredList = new Promise<string[]>((resolve) => {
      resolveList = resolve;
    });
    let currentUserId: string | null = USER_A;
    let currentAuthEpoch = 7;
    let currentSubject = "subject-a";
    let painted: string[] | null = null;

    const completion = deferredList.then((rows) => {
      if (
        isCurrentShareAuthRequest({
          expectedUserId: USER_A,
          authEpochAtSubmit: 7,
          subjectAtSubmit: "subject-a",
          currentUserId,
          currentAuthEpoch,
          currentSubject,
        })
      ) {
        painted = rows;
      }
    });

    currentUserId = USER_B;
    currentAuthEpoch = 8;
    currentSubject = "subject-b";
    resolveList(["account-a-private-link"]);
    await completion;

    expect(painted).toBeNull();
  });

  it("opens into explicit verification UI and offers a real retry after a transient outage", () => {
    const source = readFileSync(
      join(process.cwd(), "components/investcalc/share-link-button.tsx"),
      "utf8",
    );
    const openStart = source.indexOf("const openShare = () =>");
    const openEnd = source.indexOf("const prepareShare = async", openStart);
    const openHandler = source.slice(openStart, openEnd);
    const dialogStart = source.indexOf("<DialogContent");
    const dialog = source.slice(dialogStart);

    expect(openHandler).toContain("setOpen(true)");
    expect(openHandler).not.toContain('authIdentity.status !== "ready"');
    expect(dialog).toContain(") : !authReady ? (");
    expect(dialog).toContain("Verifying your signed-in account…");
    expect(dialog).toContain(
      "Session verification is temporarily unavailable. No share data was loaded or changed.",
    );
    expect(dialog).toContain("Retry session verification");
    expect(dialog).toContain(
      "setAuthVerificationRetry((current) => current + 1)",
    );
  });
});
