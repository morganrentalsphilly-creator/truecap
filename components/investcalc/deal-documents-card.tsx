"use client";

/**
 * Deal documents - per-deal file storage (inspection reports, leases,
 * photos, estoppels…). Uploads/lists/downloads/deletes go straight to a
 * PRIVATE Supabase Storage bucket from the browser client, so RLS
 * (path = {userId}/{dealId}/file) enforces ownership and large files
 * never round-trip through a server action. Downloads use short-lived
 * signed URLs. Renders for a saved deal; self-hides if the bucket isn't
 * provisioned yet.
 */
import { useLayoutEffect, useRef, useState } from "react";
import { Download, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { friendlyToastError } from "@/lib/friendly-error";
import { useToast } from "@/hooks/use-toast";
import {
  getFreshSessionUser,
  type FreshSessionUserResult,
} from "@/lib/supabase/ensure-fresh-session";
import {
  fetchStorageObjectWindow,
  isCurrentStorageOwnerRead,
} from "@/lib/storage-object-window";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const BUCKET = "deal-documents";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB - matches the bucket limit
const PAGE_SIZE = 100;
const ACCOUNT_CHANGED_DESCRIPTION =
  "This deal was opened under another signed-in account. Refresh the page before working with its documents.";

type DocItem = { name: string; path: string; size: number | null; createdAt: string | null };
type StorageListObject = {
  id: string | null;
  name: string;
  metadata: unknown;
  created_at?: string | null;
};
type DocumentRequest = { dealId: string; requestId: number };
type DocumentPageCursor = {
  ownerId: string;
  dealId: string;
  nextOffset: number;
  hasMore: boolean;
};
type FreshSessionFailure = Exclude<FreshSessionUserResult, { ok: true }>;

/** Strip the `${timestamp}-` upload prefix for display. */
function displayName(objectName: string): string {
  const m = objectName.match(/^\d+-(.*)$/);
  return m ? m[1]! : objectName;
}

function formatSize(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function safeFileName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 120) || "file";
}

function sessionFailureTitle(failure: FreshSessionFailure): string {
  if (failure.reason === "signed_out") return "Session expired";
  if (failure.reason === "identity_mismatch") return "Account changed";
  return "Couldn't verify session";
}

function sessionFailureDescription(
  failure: FreshSessionFailure,
  signedOutMessage: string,
): string {
  if (failure.reason === "signed_out") return signedOutMessage;
  if (failure.reason === "identity_mismatch") {
    return "Your signed-in account changed. Refresh this page and try again.";
  }
  return friendlyToastError(failure.error, {
    feature: "deal-documents-session",
    fallback: "We couldn't verify your session right now. Check your connection and try again.",
  });
}

export function DealDocumentsCard({ savedDealId }: { savedDealId: string }) {
  // A route can replace savedDealId without unmounting its parent. Keying the
  // stateful card prevents the previous deal's documents, errors, or busy
  // state from appearing for even one render while the new list is loading.
  return <DealDocumentsCardForDeal key={savedDealId} savedDealId={savedDealId} />;
}

function DealDocumentsCardForDeal({ savedDealId }: { savedDealId: string }) {
  const { toast } = useToast();
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeDealIdRef = useRef(savedDealId);
  const mountedRef = useRef(true);
  const documentRequestRef = useRef(0);
  const authIdentityRevisionRef = useRef(0);
  const documentOwnerIdRef = useRef<string | null>(null);
  const pageCursorRef = useRef<DocumentPageCursor | null>(null);
  const loadMoreInFlightRef = useRef(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [downloadFallback, setDownloadFallback] = useState<{
    path: string;
    label: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  // Which row is mid-flight AND which action, so the spinner replaces the
  // icon that was actually pressed (a slow delete used to show nothing).
  const [busy, setBusy] = useState<{ path: string; kind: "download" | "delete" } | null>(null);
  // Which row's delete-confirm popover is open. storage.remove() is a hard
  // object delete with no versioning, so it is confirm-first like every
  // other irreversible action in the app.
  const [confirmPath, setConfirmPath] = useState<string | null>(null);

  const prefixFor = (uid: string, dealId: string = savedDealId) => `${uid}/${dealId}`;

  const isActiveDeal = (dealId: string) =>
    mountedRef.current && activeDealIdRef.current === dealId;

  const isCurrentDocumentRequest = (request: DocumentRequest) =>
    isActiveDeal(request.dealId) &&
    documentRequestRef.current === request.requestId;

  const startDocumentRequest = (dealId: string = savedDealId): DocumentRequest | null => {
    if (!isActiveDeal(dealId)) return null;
    return { dealId, requestId: ++documentRequestRef.current };
  };

  const clearDocumentOwner = () => {
    documentOwnerIdRef.current = null;
    setUserId(null);
    setDocs([]);
    setDownloadFallback(null);
    pageCursorRef.current = null;
    setHasMore(false);
  };

  const documentOwnerChanged = (freshUserId: string): boolean => {
    const listedOwnerId = documentOwnerIdRef.current ?? userId;
    if (!listedOwnerId || listedOwnerId === freshUserId) return false;
    authIdentityRevisionRef.current += 1;
    documentRequestRef.current += 1;
    clearDocumentOwner();
    setLoadError(ACCOUNT_CHANGED_DESCRIPTION);
    return true;
  };

  const refresh = async (
    knownUserId?: string,
    existingRequest?: DocumentRequest,
  ): Promise<boolean> => {
    const request = existingRequest ?? startDocumentRequest();
    if (!request) return false;
    const authRevisionAtStart = authIdentityRevisionRef.current;
    try {
      const freshSession = knownUserId
        ? ({ ok: true, userId: knownUserId } as const)
        : await getFreshSessionUser(supabase);
      if (
        !isCurrentDocumentRequest(request) ||
        authIdentityRevisionRef.current !== authRevisionAtStart
      ) {
        return false;
      }
      if (!freshSession.ok) {
        if (freshSession.reason !== "unavailable") clearDocumentOwner();
        setLoadError(
          sessionFailureDescription(
            freshSession,
            "Sign in again to access this deal's documents.",
          ),
        );
        return false;
      }
      const uid = freshSession.userId;
      // Publish the pending owner before launching the private Storage read.
      // An auth event in this interval must invalidate the request even though
      // the pagination cursor does not exist until the response is accepted.
      documentOwnerIdRef.current = uid;
      setUserId(uid);
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(prefixFor(uid, request.dealId), {
          limit: PAGE_SIZE,
          offset: 0,
          sortBy: { column: "created_at", order: "desc" },
        });
      if (
        !isCurrentDocumentRequest(request) ||
        !isCurrentStorageOwnerRead({
          expectedOwnerId: uid,
          currentOwnerId: documentOwnerIdRef.current,
          startedAuthRevision: authRevisionAtStart,
          currentAuthRevision: authIdentityRevisionRef.current,
        })
      ) {
        return false;
      }
      if (error) {
        pageCursorRef.current = null;
        setHasMore(false);
        // Bucket not provisioned yet (migration pending) → hide quietly.
        if (/bucket not found/i.test(error.message)) {
          setUnavailable(true);
        } else {
          setLoadError(
            friendlyToastError(error, {
              feature: "deal-documents-list",
              fallback:
                "We couldn't load this deal's documents. Your files have not been removed.",
            }),
          );
        }
        return false;
      }
      const rows = data ?? [];
      const items: DocItem[] = rows
        // .list() can include a placeholder folder row with a null id - skip it.
        .filter((o) => o.id !== null)
        .map((o) => ({
          name: o.name,
          path: `${prefixFor(uid, request.dealId)}/${o.name}`,
          size: (o.metadata as { size?: number } | null)?.size ?? null,
          createdAt: o.created_at ?? null,
        }));
      setDocs(items);
      const cursor: DocumentPageCursor = {
        ownerId: uid,
        dealId: request.dealId,
        nextOffset: rows.length,
        hasMore: rows.length === PAGE_SIZE,
      };
      pageCursorRef.current = cursor;
      setHasMore(cursor.hasMore);
      setLoadError(null);
      return true;
    } catch (error) {
      if (isCurrentDocumentRequest(request)) {
        pageCursorRef.current = null;
        setHasMore(false);
        setLoadError(
          friendlyToastError(error, {
            feature: "deal-documents-list",
            fallback:
              "We couldn't load this deal's documents. Check your connection and try again.",
          }),
        );
      }
      return false;
    }
  };

  // Layout cleanup closes the route-commit -> passive-effect window. The keyed
  // card is unmounted for a different deal, and every old upload/list/signed
  // URL callback must observe mounted=false before the new workspace paints.
  useLayoutEffect(() => {
    mountedRef.current = true;
    const request: DocumentRequest = {
      dealId: savedDealId,
      requestId: ++documentRequestRef.current,
    };
    setLoaded(false);
    setUnavailable(false);
    setLoadError(null);
    setDownloadFallback(null);
    setDocs([]);
    setUserId(null);
    documentOwnerIdRef.current = null;
    pageCursorRef.current = null;
    loadMoreInFlightRef.current = false;
    setHasMore(false);
    setLoadingMore(false);
    setUploading(false);
    setBusy(null);
    setConfirmPath(null);
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mountedRef.current) return;
      const listedOwnerId = documentOwnerIdRef.current;
      if (!listedOwnerId || session?.user?.id === listedOwnerId) return;

      // A fallback signed URL must never outlive the account that minted it.
      // Invalidate every pending list/mutation continuation and remove private
      // filenames immediately when another tab signs out or switches users.
      authIdentityRevisionRef.current += 1;
      documentRequestRef.current += 1;
      loadMoreInFlightRef.current = false;
      clearDocumentOwner();
      setLoadError(
        session?.user
          ? ACCOUNT_CHANGED_DESCRIPTION
          : "Sign in again to access this deal's documents.",
      );
      setUploading(false);
      setLoadingMore(false);
      setBusy(null);
      setConfirmPath(null);
    });
    void (async () => {
      try {
        await refresh(undefined, request);
      } catch {
        if (isCurrentDocumentRequest(request)) {
          setLoadError("We couldn't verify your document access. Check your connection and try again.");
        }
      } finally {
        if (isCurrentDocumentRequest(request)) setLoaded(true);
      }
    })();
    return () => {
      mountedRef.current = false;
      authSubscription.unsubscribe();
      if (documentRequestRef.current === request.requestId) {
        documentRequestRef.current += 1;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedDealId, supabase]);

  const handleUpload = async (file: File) => {
    const dealIdAtStart = savedDealId;
    const authRevisionAtStart = authIdentityRevisionRef.current;
    if (!isActiveDeal(dealIdAtStart)) return;
    if (file.size > MAX_BYTES) {
      toast({ title: "File too large", description: "Max 10 MB per file.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      // Build the owner-scoped path from the freshly verified identity, not
      // from state captured when this card mounted. A sibling tab can refresh,
      // sign out, or switch accounts while a deal page remains open.
      const freshSession = await getFreshSessionUser(supabase);
      if (
        !isActiveDeal(dealIdAtStart) ||
        authIdentityRevisionRef.current !== authRevisionAtStart
      ) {
        return;
      }
      if (!freshSession.ok) {
        const description = sessionFailureDescription(
          freshSession,
          "Sign in again to upload documents.",
        );
        if (freshSession.reason !== "unavailable") {
          clearDocumentOwner();
          setLoadError(description);
        }
        toast({
          title: sessionFailureTitle(freshSession),
          description,
          variant: "destructive",
        });
        return;
      }
      const freshUserId = freshSession.userId;
      if (documentOwnerChanged(freshUserId)) {
        toast({
          title: "Account changed",
          description: ACCOUNT_CHANGED_DESCRIPTION,
          variant: "destructive",
        });
        return;
      }
      setUserId(freshUserId);
      const path = `${prefixFor(freshUserId, dealIdAtStart)}/${Date.now()}-${safeFileName(file.name)}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      if (
        !isActiveDeal(dealIdAtStart) ||
        authIdentityRevisionRef.current !== authRevisionAtStart
      ) {
        return;
      }
      if (error) {
        if (/bucket not found/i.test(error.message)) {
          setUnavailable(true);
          return;
        }
        toast({
          title: "Upload failed",
          description: friendlyToastError(error, {
            feature: "deal-documents",
            fallback: "We couldn't upload this file. Please try again.",
          }),
          variant: "destructive",
        });
        return;
      }
      const refreshRequest = startDocumentRequest(dealIdAtStart);
      if (!refreshRequest) return;
      const refreshed = await refresh(freshUserId, refreshRequest);
      if (!isCurrentDocumentRequest(refreshRequest)) return;
      if (refreshed) {
        toast({ title: "Document uploaded", description: displayName(safeFileName(file.name)) });
      } else {
        toast({
          title: "Uploaded, but the list couldn't refresh",
          description: "The file was stored. Retry the document list to confirm it here.",
          variant: "destructive",
        });
      }
    } catch (error) {
      if (
        !isActiveDeal(dealIdAtStart) ||
        authIdentityRevisionRef.current !== authRevisionAtStart
      ) {
        return;
      }
      toast({
        title: "Upload failed",
        description: friendlyToastError(error, {
          feature: "deal-documents",
          fallback: "We couldn't upload this file. Please try again.",
        }),
        variant: "destructive",
      });
    } finally {
      if (
        isActiveDeal(dealIdAtStart) &&
        authIdentityRevisionRef.current === authRevisionAtStart
      ) {
        setUploading(false);
      }
    }
  };

  const handleDownload = async (path: string, label: string) => {
    const dealIdAtStart = savedDealId;
    const authRevisionAtStart = authIdentityRevisionRef.current;
    if (!isActiveDeal(dealIdAtStart)) return;
    // Open synchronously while this click still has browser user activation.
    // If popups are blocked, render a normal link after the signed URL arrives.
    const pendingWindow = window.open("", "_blank");
    if (pendingWindow) pendingWindow.opener = null;
    setBusy({ path, kind: "download" });
    try {
      const freshSession = await getFreshSessionUser(supabase);
      if (
        !isActiveDeal(dealIdAtStart) ||
        authIdentityRevisionRef.current !== authRevisionAtStart
      ) {
        pendingWindow?.close();
        return;
      }
      if (!freshSession.ok) {
        const description = sessionFailureDescription(
          freshSession,
          "Sign in again to open documents.",
        );
        if (freshSession.reason !== "unavailable") {
          clearDocumentOwner();
          setLoadError(description);
        }
        toast({
          title: sessionFailureTitle(freshSession),
          description,
          variant: "destructive",
        });
        pendingWindow?.close();
        return;
      }
      const freshUserId = freshSession.userId;
      if (documentOwnerChanged(freshUserId)) {
        toast({
          title: "Account changed",
          description: ACCOUNT_CHANGED_DESCRIPTION,
          variant: "destructive",
        });
        pendingWindow?.close();
        return;
      }
      setUserId(freshUserId);
      if (!path.startsWith(`${prefixFor(freshUserId, dealIdAtStart)}/`)) {
        const refreshRequest = startDocumentRequest(dealIdAtStart);
        if (!refreshRequest) {
          pendingWindow?.close();
          return;
        }
        await refresh(freshUserId, refreshRequest);
        if (!isCurrentDocumentRequest(refreshRequest)) {
          pendingWindow?.close();
          return;
        }
        toast({
          title: "Account changed",
          description: "The document list was refreshed for the current account. Try again.",
          variant: "destructive",
        });
        pendingWindow?.close();
        return;
      }
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
      if (
        !isActiveDeal(dealIdAtStart) ||
        authIdentityRevisionRef.current !== authRevisionAtStart ||
        pageCursorRef.current?.ownerId !== freshUserId
      ) {
        pendingWindow?.close();
        return;
      }
      if (error || !data?.signedUrl) {
        toast({
          title: "Couldn't open document",
          description: friendlyToastError(error ?? new Error("createSignedUrl returned no signed URL"), {
            feature: "deal-documents",
            fallback: "We couldn't open this document. Please try again.",
          }),
          variant: "destructive",
        });
        pendingWindow?.close();
        return;
      }
      if (pendingWindow) {
        pendingWindow.location.replace(data.signedUrl);
      } else {
        // Do not retain or render the private signed URL. A fresh click must
        // re-verify the current account and mint a new 60-second URL.
        setDownloadFallback({ path, label });
        toast({
          title: "New tab blocked",
          description: "Use the Open document button in the Documents card.",
        });
      }
    } catch (error) {
      pendingWindow?.close();
      if (
        !isActiveDeal(dealIdAtStart) ||
        authIdentityRevisionRef.current !== authRevisionAtStart
      ) {
        return;
      }
      toast({
        title: "Couldn't open document",
        description: friendlyToastError(error, {
          feature: "deal-documents",
          fallback: "We couldn't open this document. Please try again.",
        }),
        variant: "destructive",
      });
    } finally {
      if (
        isActiveDeal(dealIdAtStart) &&
        authIdentityRevisionRef.current === authRevisionAtStart
      ) {
        setBusy(null);
      }
    }
  };

  const handleDelete = async (path: string, label: string) => {
    const dealIdAtStart = savedDealId;
    const authRevisionAtStart = authIdentityRevisionRef.current;
    if (!isActiveDeal(dealIdAtStart)) return;
    setConfirmPath(null);
    setBusy({ path, kind: "delete" });
    try {
      const freshSession = await getFreshSessionUser(supabase);
      if (
        !isActiveDeal(dealIdAtStart) ||
        authIdentityRevisionRef.current !== authRevisionAtStart
      ) {
        return;
      }
      if (!freshSession.ok) {
        const description = sessionFailureDescription(
          freshSession,
          "Sign in again to delete documents.",
        );
        if (freshSession.reason !== "unavailable") {
          clearDocumentOwner();
          setLoadError(description);
        }
        toast({
          title: sessionFailureTitle(freshSession),
          description,
          variant: "destructive",
        });
        return;
      }
      const freshUserId = freshSession.userId;
      if (documentOwnerChanged(freshUserId)) {
        toast({
          title: "Account changed",
          description: ACCOUNT_CHANGED_DESCRIPTION,
          variant: "destructive",
        });
        return;
      }
      setUserId(freshUserId);
      if (!path.startsWith(`${prefixFor(freshUserId, dealIdAtStart)}/`)) {
        const refreshRequest = startDocumentRequest(dealIdAtStart);
        if (!refreshRequest) return;
        await refresh(freshUserId, refreshRequest);
        if (!isCurrentDocumentRequest(refreshRequest)) return;
        toast({
          title: "Account changed",
          description: "The document list was refreshed for the current account. Try again.",
          variant: "destructive",
        });
        return;
      }
      const { error } = await supabase.storage.from(BUCKET).remove([path]);
      if (
        !isActiveDeal(dealIdAtStart) ||
        authIdentityRevisionRef.current !== authRevisionAtStart
      ) {
        return;
      }
      if (error) {
        toast({
          title: "Couldn't delete document",
          description: friendlyToastError(error, {
            feature: "deal-documents",
            fallback: "We couldn't delete this document. Please try again.",
          }),
          variant: "destructive",
        });
        return;
      }
      const refreshRequest = startDocumentRequest(dealIdAtStart);
      if (!refreshRequest) return;
      const refreshed = await refresh(freshUserId, refreshRequest);
      if (!isCurrentDocumentRequest(refreshRequest)) return;
      if (refreshed) {
        toast({ title: "Document deleted", description: label });
      } else {
        toast({
          title: "Deleted, but the list couldn't refresh",
          description: "Retry the document list to confirm the latest files.",
          variant: "destructive",
        });
      }
    } catch (error) {
      if (
        !isActiveDeal(dealIdAtStart) ||
        authIdentityRevisionRef.current !== authRevisionAtStart
      ) {
        return;
      }
      toast({
        title: "Couldn't delete document",
        description: friendlyToastError(error, {
          feature: "deal-documents",
          fallback: "We couldn't delete this document. Please try again.",
        }),
        variant: "destructive",
      });
    } finally {
      if (
        isActiveDeal(dealIdAtStart) &&
        authIdentityRevisionRef.current === authRevisionAtStart
      ) {
        setBusy(null);
      }
    }
  };

  const handleLoadMore = async () => {
    const dealIdAtStart = savedDealId;
    const authRevisionAtStart = authIdentityRevisionRef.current;
    const cursor = pageCursorRef.current;
    if (
      loadMoreInFlightRef.current ||
      !isActiveDeal(dealIdAtStart) ||
      !cursor ||
      cursor.dealId !== dealIdAtStart ||
      !cursor.hasMore
    ) {
      return;
    }

    loadMoreInFlightRef.current = true;
    setLoadingMore(true);
    try {
      const freshSession = await getFreshSessionUser(supabase);
      if (
        !isActiveDeal(dealIdAtStart) ||
        authIdentityRevisionRef.current !== authRevisionAtStart ||
        pageCursorRef.current !== cursor
      ) {
        return;
      }
      if (!freshSession.ok) {
        const description = sessionFailureDescription(
          freshSession,
          "Sign in again to load more documents.",
        );
        if (freshSession.reason !== "unavailable") {
          clearDocumentOwner();
          setLoadError(description);
        }
        toast({
          title: sessionFailureTitle(freshSession),
          description,
          variant: "destructive",
        });
        return;
      }

      if (documentOwnerChanged(freshSession.userId)) {
        toast({
          title: "Account changed",
          description: ACCOUNT_CHANGED_DESCRIPTION,
          variant: "destructive",
        });
        return;
      }

      setUserId(freshSession.userId);
      const request = startDocumentRequest(dealIdAtStart);
      if (!request || pageCursorRef.current !== cursor) return;
      // Storage exposes offset pagination but no stable cursor. Rebuild the
      // complete visible window from zero on every Load more click so a file
      // deleted before this request cannot shift an unseen object behind the
      // old offset and make it disappear permanently.
      const window = await fetchStorageObjectWindow<StorageListObject>({
        pageSize: PAGE_SIZE,
        targetCount: cursor.nextOffset + PAGE_SIZE,
        getKey: (object) => object.name,
        fetchPage: async (offset, limit) => {
          const { data, error } = await supabase.storage
            .from(BUCKET)
            .list(prefixFor(freshSession.userId, dealIdAtStart), {
              limit,
              offset,
              sortBy: { column: "created_at", order: "desc" },
            });
          if (error) throw error;
          return data ?? [];
        },
      });
      if (
        !isCurrentDocumentRequest(request) ||
        authIdentityRevisionRef.current !== authRevisionAtStart ||
        pageCursorRef.current !== cursor ||
        cursor.ownerId !== freshSession.userId ||
        cursor.dealId !== dealIdAtStart
      ) {
        return;
      }
      const nextItems: DocItem[] = window.rows
        .filter((object) => object.id !== null)
        .map((object) => ({
          name: object.name,
          path: `${prefixFor(freshSession.userId, dealIdAtStart)}/${object.name}`,
          size: (object.metadata as { size?: number } | null)?.size ?? null,
          createdAt: object.created_at ?? null,
        }));
      setDocs(nextItems);
      const nextCursor: DocumentPageCursor = {
        ownerId: cursor.ownerId,
        dealId: cursor.dealId,
        nextOffset: window.nextOffset,
        hasMore: window.hasMore,
      };
      pageCursorRef.current = nextCursor;
      setHasMore(nextCursor.hasMore);
    } catch (error) {
      if (
        !isActiveDeal(dealIdAtStart) ||
        authIdentityRevisionRef.current !== authRevisionAtStart
      ) {
        return;
      }
      if (
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof error.message === "string" &&
        /bucket not found/i.test(error.message)
      ) {
        setUnavailable(true);
        return;
      }
      toast({
        title: "Couldn't load more documents",
        description: friendlyToastError(error, {
          feature: "deal-documents-pagination",
          fallback: "We couldn't load more documents. Please try again.",
        }),
        variant: "destructive",
      });
    } finally {
      if (authIdentityRevisionRef.current === authRevisionAtStart) {
        loadMoreInFlightRef.current = false;
        if (isActiveDeal(dealIdAtStart)) setLoadingMore(false);
      }
    }
  };

  if (!loaded || unavailable) return null;

  return (
    <section aria-label="Deal documents" className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Paperclip className="size-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Documents</h3>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11 gap-1.5"
          disabled={uploading || !userId}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          Upload
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx,.csv,.txt"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUpload(file);
            e.target.value = ""; // allow re-selecting the same file
          }}
        />
      </div>

      {loadError ? (
        <div role="alert" className="mb-3 rounded-xl border border-destructive/25 bg-destructive/5 p-3">
          <p className="text-sm font-semibold text-foreground">Couldn&apos;t load documents</p>
          <p className="mt-1 text-xs text-muted-foreground">{loadError}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3 min-h-11"
            onClick={() => {
              void refresh();
            }}
          >
            Try again
          </Button>
        </div>
      ) : null}

      {downloadFallback ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/25 bg-primary/5 p-3">
          <p className="text-xs text-muted-foreground">Your browser blocked the new tab.</p>
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-primary hover:bg-primary/10"
            onClick={() => {
              const fallback = downloadFallback;
              setDownloadFallback(null);
              void handleDownload(fallback.path, fallback.label);
            }}
          >
            Open {downloadFallback.label}
          </button>
        </div>
      ) : null}

      {!loadError && docs.length === 0 ? (
        <p className="py-2 text-xs text-muted-foreground">
          No documents yet. Upload inspection reports, leases, or photos to keep them with the deal. Max
          10 MB each; private to your account.
        </p>
      ) : (
        <ul className="divide-y divide-border/70">
          {docs.map((doc) => {
            const label = displayName(doc.name);
            const isBusy = busy?.path === doc.path;
            return (
              <li key={doc.path} className="flex items-center gap-2 py-0.5">
                <span className="min-w-0 flex-1 truncate text-sm text-foreground" title={label}>
                  {label}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{formatSize(doc.size)}</span>
                {/* Both icons were bare 16px glyphs 8px apart, so a fat-finger
                    tap aimed at Download landed on a permanent delete.
                    min-h-11/min-w-11 gives each a real 44px target; the row's
                    py drops to 0.5 so the 44px band sets the row pitch and
                    neighbouring rows' targets never overlap. */}
                <button
                  type="button"
                  aria-label={`Download ${label}`}
                  onClick={() => handleDownload(doc.path, label)}
                  disabled={isBusy}
                  className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  {isBusy && busy.kind === "download" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                </button>
                <Popover
                  open={confirmPath === doc.path}
                  onOpenChange={(open) => setConfirmPath(open ? doc.path : null)}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label={`Delete ${label}`}
                      disabled={isBusy}
                      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center text-muted-foreground/60 hover:text-destructive disabled:opacity-50"
                    >
                      {isBusy && busy.kind === "delete" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-72">
                    <p className="text-sm font-semibold text-foreground">Delete this document?</p>
                    <p className="mt-1 break-words text-xs leading-snug text-muted-foreground">
                      <span className="font-semibold text-foreground">{label}</span>{" "}
                      is deleted from this deal for good — there&apos;s no undo, so you&apos;d have
                      to upload the file again.
                    </p>
                    <div className="mt-3 flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="min-h-11"
                        onClick={() => setConfirmPath(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="min-h-11"
                        onClick={() => void handleDelete(doc.path, label)}
                      >
                        Delete
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </li>
            );
          })}
        </ul>
      )}

      {!loadError && docs.length > 0 && hasMore ? (
        <div className="mt-3 flex justify-center">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-11 gap-1.5"
            disabled={loadingMore || uploading || busy !== null}
            onClick={() => void handleLoadMore()}
          >
            {loadingMore ? <Loader2 className="size-4 animate-spin" /> : null}
            {loadingMore ? "Loading documents…" : "Load more documents"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
