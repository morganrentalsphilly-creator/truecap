"use client";

import { Loader2, TrendingUp } from "lucide-react";

export function SnapshotStatusCard({
  title,
  snapshotSource,
  isLoading,
}: {
  title: string;
  snapshotSource: "preview" | "recorded" | "local" | "cache" | "generated";
  isLoading: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">
            {snapshotSource === "preview"
              ? "Preview - not saved"
              : snapshotSource === "recorded"
                ? "Recorded snapshot - unchanged"
              : snapshotSource === "local"
                ? "Live saved analysis"
              : snapshotSource === "cache"
                ? "Cached snapshot"
                : "Regenerated snapshot"}
          </p>
        </div>
      </div>
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
    </div>
  );
}
