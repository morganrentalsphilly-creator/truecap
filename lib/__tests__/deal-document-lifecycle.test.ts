import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "components/investcalc/deal-documents-card.tsx"),
  "utf8",
);

describe("deal document lifecycle isolation", () => {
  it("remounts the stateful card and clears every deal-scoped view state", () => {
    expect(source).toContain(
      "<DealDocumentsCardForDeal key={savedDealId} savedDealId={savedDealId} />",
    );
    expect(source).toContain("setLoaded(false)");
    expect(source).toContain("setDocs([])");
    expect(source).toContain("setLoadError(null)");
    expect(source).toContain("setDownloadFallback(null)");
    expect(source).toContain("setUserId(null)");
    expect(source).toContain("setBusy(null)");
    expect(source).toContain("setConfirmPath(null)");
  });

  it("invalidates an unmounted or superseded list before applying its rows", () => {
    expect(source).toContain("useLayoutEffect");
    expect(source).toContain("mountedRef.current && activeDealIdRef.current === dealId");
    expect(source).toContain("documentRequestRef.current === request.requestId");
    expect(source).toContain("mountedRef.current = false");
    expect(source).toContain("documentRequestRef.current += 1");

    const list = source.indexOf(".list(prefixFor(uid, request.dealId)");
    const postListGuard = source.indexOf(
      "if (!isCurrentDocumentRequest(request)) return false;",
      list,
    );
    const applyRows = source.indexOf("setDocs(items)", list);

    expect(list).toBeGreaterThan(-1);
    expect(postListGuard).toBeGreaterThan(list);
    expect(applyRows).toBeGreaterThan(postListGuard);
  });

  it("anchors every document mutation to the deal captured before awaiting auth", () => {
    expect(source.match(/const dealIdAtStart = savedDealId;/g)).toHaveLength(3);
    expect(source).toContain("if (!isActiveDeal(dealIdAtStart)) return;");
    expect(source).toContain("prefixFor(freshUserId, dealIdAtStart)");
    expect(source).toContain("startDocumentRequest(dealIdAtStart)");
  });
});
