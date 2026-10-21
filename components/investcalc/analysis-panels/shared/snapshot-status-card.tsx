"use client";

import { Loader2 } from "lucide-react";

/**
 * The panel's provenance line: which snapshot the figures come from. It is
 * metadata, so it sets in Geist Mono on a line, with the panel's name and a
 * spinner while a snapshot loads. Not a card: the panel sits inside the
 * ledger row's card already.
 */
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
    <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
      <p className="font-mono text-2xs text-muted-foreground">
        <span className="text-foreground">{title}</span>
        {" · "}
        {snapshotSource === "preview"
          ? "Preview, not saved"
          : snapshotSource === "recorded"
            ? "Recorded snapshot, unchanged"
          : snapshotSource === "local"
            ? "Live saved analysis"
          : snapshotSource === "cache"
            ? "Cached snapshot"
            : "Regenerated snapshot"}
      </p>
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
      ) : null}
    </div>
  );
}
