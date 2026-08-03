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
import { useEffect, useRef, useState } from "react";
import { Download, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { friendlyToastError } from "@/lib/friendly-error";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const BUCKET = "deal-documents";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB - matches the bucket limit

type DocItem = { name: string; path: string; size: number | null; createdAt: string | null };

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

export function DealDocumentsCard({ savedDealId }: { savedDealId: string }) {
  const { toast } = useToast();
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Which row is mid-flight AND which action, so the spinner replaces the
  // icon that was actually pressed (a slow delete used to show nothing).
  const [busy, setBusy] = useState<{ path: string; kind: "download" | "delete" } | null>(null);
  // Which row's delete-confirm popover is open. storage.remove() is a hard
  // object delete with no versioning, so it is confirm-first like every
  // other irreversible action in the app.
  const [confirmPath, setConfirmPath] = useState<string | null>(null);

  const prefixFor = (uid: string) => `${uid}/${savedDealId}`;

  const refresh = async (uid: string) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefixFor(uid), { limit: 100, sortBy: { column: "created_at", order: "desc" } });
    if (error) {
      // Bucket not provisioned yet (migration pending) → hide quietly.
      if (/bucket not found/i.test(error.message)) setUnavailable(true);
      return;
    }
    const items: DocItem[] = (data ?? [])
      // .list() can include a placeholder folder row with a null id - skip it.
      .filter((o) => o.id !== null)
      .map((o) => ({
        name: o.name,
        path: `${prefixFor(uid)}/${o.name}`,
        size: (o.metadata as { size?: number } | null)?.size ?? null,
        createdAt: o.created_at ?? null,
      }));
    setDocs(items);
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setLoaded(true);
        return;
      }
      setUserId(user.id);
      await refresh(user.id).catch(() => {});
      if (!cancelled) setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedDealId, supabase]);

  const handleUpload = async (file: File) => {
    if (!userId) return;
    if (file.size > MAX_BYTES) {
      toast({ title: "File too large", description: "Max 10 MB per file.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const path = `${prefixFor(userId)}/${Date.now()}-${safeFileName(file.name)}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
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
      await refresh(userId);
      toast({ title: "Document uploaded", description: displayName(safeFileName(file.name)) });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (path: string) => {
    setBusy({ path, kind: "download" });
    try {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
      if (error || !data?.signedUrl) {
        toast({
          title: "Couldn't open document",
          description: friendlyToastError(error ?? new Error("createSignedUrl returned no signed URL"), {
            feature: "deal-documents",
            fallback: "We couldn't open this document. Please try again.",
          }),
          variant: "destructive",
        });
        return;
      }
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (path: string, label: string) => {
    if (!userId) return;
    setConfirmPath(null);
    setBusy({ path, kind: "delete" });
    try {
      const { error } = await supabase.storage.from(BUCKET).remove([path]);
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
      await refresh(userId);
      // Mirrors the upload toast — the row vanishing was the only signal.
      toast({ title: "Document deleted", description: label });
    } finally {
      setBusy(null);
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
          className="h-8 gap-1.5"
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

      {docs.length === 0 ? (
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
                  onClick={() => handleDownload(doc.path)}
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
                        onClick={() => setConfirmPath(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
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
    </section>
  );
}
