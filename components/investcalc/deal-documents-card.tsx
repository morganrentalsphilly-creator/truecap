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
  const [busyPath, setBusyPath] = useState<string | null>(null);

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
    setBusyPath(path);
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
      setBusyPath(null);
    }
  };

  const handleDelete = async (path: string) => {
    if (!userId) return;
    setBusyPath(path);
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
    } finally {
      setBusyPath(null);
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
          {docs.map((doc) => (
            <li key={doc.path} className="flex items-center gap-2 py-2">
              <span className="min-w-0 flex-1 truncate text-sm text-foreground" title={displayName(doc.name)}>
                {displayName(doc.name)}
              </span>
              <span className="shrink-0 text-[11px] text-muted-foreground">{formatSize(doc.size)}</span>
              <button
                type="button"
                aria-label={`Download ${displayName(doc.name)}`}
                onClick={() => handleDownload(doc.path)}
                disabled={busyPath === doc.path}
                className="shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                {busyPath === doc.path ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              </button>
              <button
                type="button"
                aria-label={`Delete ${displayName(doc.name)}`}
                onClick={() => handleDelete(doc.path)}
                disabled={busyPath === doc.path}
                className="shrink-0 text-muted-foreground/60 hover:text-destructive disabled:opacity-50"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
