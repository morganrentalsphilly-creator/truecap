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
    expect(source).toContain("pageCursorRef.current = null");
    expect(source).toContain("setHasMore(false)");
    expect(source).toContain("setLoadingMore(false)");
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
    const pendingOwner = source.lastIndexOf(
      "documentOwnerIdRef.current = uid",
      list,
    );
    const postListGuard = source.indexOf(
      "isCurrentStorageOwnerRead({",
      list,
    );
    const applyRows = source.indexOf("setDocs(items)", list);

    expect(list).toBeGreaterThan(-1);
    expect(pendingOwner).toBeGreaterThan(-1);
    expect(pendingOwner).toBeLessThan(list);
    expect(postListGuard).toBeGreaterThan(list);
    expect(applyRows).toBeGreaterThan(postListGuard);
  });

  it("anchors every document operation to the deal captured before awaiting auth", () => {
    expect(source.match(/const dealIdAtStart = savedDealId;/g)).toHaveLength(4);
    expect(source).toContain("if (!isActiveDeal(dealIdAtStart)) return;");
    expect(source).toContain("prefixFor(freshUserId, dealIdAtStart)");
    expect(source).toContain("startDocumentRequest(dealIdAtStart)");
  });

  it("uses typed fresh-session failures instead of treating every auth error as logout", () => {
    expect(source).toContain("getFreshSessionUser(supabase)");
    expect(source).toContain('freshSession.reason !== "unavailable"');
    expect(source).toContain('feature: "deal-documents-session"');
    expect(source).not.toContain("getFreshSessionUserId");

    const uploadStart = source.indexOf("const handleUpload = async");
    const uploadEnd = source.indexOf("const handleDownload = async", uploadStart);
    const loadMoreStart = source.indexOf("const handleLoadMore = async");
    const loadMoreEnd = source.indexOf("if (!loaded || unavailable)", loadMoreStart);
    expect(
      source
        .slice(uploadStart, uploadEnd)
        .match(/const freshSession = await getFreshSessionUser\(supabase\);/g),
    ).toHaveLength(1);
    expect(
      source
        .slice(loadMoreStart, loadMoreEnd)
        .match(/const freshSession = await getFreshSessionUser\(supabase\);/g),
    ).toHaveLength(1);
  });

  it("preserves real Storage and thrown errors for sanitized telemetry", () => {
    expect(source).not.toContain(
      'new Error("Deal document list request threw before completion.")',
    );
    expect(source).not.toContain(
      'new Error("Deal document pagination request failed.")',
    );
    expect(source).not.toContain(
      'new Error("Deal document pagination request threw before completion.")',
    );
    expect(source).toContain('feature: "deal-documents-list"');
    expect(source).toContain('feature: "deal-documents-pagination"');
  });

  it("rebuilds pagination within the freshly verified owner and captured deal", () => {
    expect(source).toContain("const PAGE_SIZE = 100");
    expect(source).toContain("type DocumentPageCursor");
    expect(source).toContain("ownerId: uid");
    expect(source).toContain("dealId: request.dealId");
    expect(source).toContain("nextOffset: rows.length");
    expect(source).toContain("hasMore: rows.length === PAGE_SIZE");

    const loadMore = source.indexOf("const handleLoadMore = async () =>");
    const verify = source.indexOf("await getFreshSessionUser(supabase)", loadMore);
    const ownerGuard = source.indexOf(
      "documentOwnerChanged(freshSession.userId)",
      verify,
    );
    const pageQuery = source.indexOf(
      "fetchStorageObjectWindow<StorageListObject>({",
      ownerGuard,
    );
    const restart = source.indexOf("fetchPage: async (offset, limit)", pageQuery);
    const offset = source.indexOf("offset,", restart);
    const responseGuard = source.indexOf(
      "pageCursorRef.current !== cursor",
      pageQuery,
    );
    const replace = source.indexOf("setDocs(nextItems)", responseGuard);

    expect(loadMore).toBeGreaterThan(-1);
    expect(verify).toBeGreaterThan(loadMore);
    expect(ownerGuard).toBeGreaterThan(verify);
    expect(pageQuery).toBeGreaterThan(ownerGuard);
    expect(restart).toBeGreaterThan(pageQuery);
    expect(offset).toBeGreaterThan(restart);
    expect(responseGuard).toBeGreaterThan(offset);
    expect(replace).toBeGreaterThan(responseGuard);
    expect(source).toContain("targetCount: cursor.nextOffset + PAGE_SIZE");
    expect(source).toContain("nextOffset: window.nextOffset");
    expect(source).toContain('"Load more documents"');
  });

  it("clears stale filenames before any mutation under a different account", () => {
    expect(source).toContain("const documentOwnerChanged = (freshUserId: string)");
    expect(source).toContain(
      "const listedOwnerId = documentOwnerIdRef.current ?? userId",
    );
    expect(source).toContain("clearDocumentOwner()");
    expect(source).toContain("setLoadError(ACCOUNT_CHANGED_DESCRIPTION)");
    expect(source.match(/documentOwnerChanged\(freshUserId\)/g)).toHaveLength(3);
    expect(source).toContain("documentOwnerChanged(freshSession.userId)");
  });

  it("invalidates private document state on auth changes and never renders a signed fallback URL", () => {
    expect(source).toContain("supabase.auth.onAuthStateChange");
    expect(source).toContain(
      "const listedOwnerId = documentOwnerIdRef.current",
    );
    expect(source).toContain("authIdentityRevisionRef.current += 1");
    expect(source).toContain("authSubscription.unsubscribe()");
    expect(source).toContain("clearDocumentOwner()");
    expect(source).toContain("pageCursorRef.current?.ownerId !== freshUserId");
    expect(source).toContain("setDownloadFallback({ path, label })");
    expect(source).not.toContain("downloadFallback.url");
    expect(source).toContain(
      "void handleDownload(fallback.path, fallback.label)",
    );
  });
});
