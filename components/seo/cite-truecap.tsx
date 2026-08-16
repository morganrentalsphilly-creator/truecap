"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";

export function CiteTrueCap({
  title,
  updatedAt,
  canonical,
}: {
  title: string;
  updatedAt: string;
  canonical: string;
}) {
  const [copied, setCopied] = useState<"citation" | "link" | null>(null);
  const citation = useMemo(
    () => `TrueCap. “${title}.” Updated ${updatedAt}. ${canonical}.`,
    [canonical, title, updatedAt],
  );

  async function copy(value: string, kind: "citation" | "link") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      /* the visible text remains manually selectable */
    }
  }

  return (
    <aside aria-labelledby="cite-truecap-title" className="not-prose rounded-2xl border border-border bg-card p-5">
      <h2 id="cite-truecap-title" className="text-base font-extrabold text-foreground">Cite this data</h2>
      <p className="mt-1 text-xs text-muted-foreground">Publisher: TrueCap · Updated {updatedAt}</p>
      <p className="mt-3 select-all break-words rounded-lg bg-muted/50 p-3 text-sm leading-relaxed text-foreground">{citation}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => copy(citation, "citation")} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-bold text-foreground hover:border-primary/40">
          {copied === "citation" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied === "citation" ? "Copied" : "Copy citation"}
        </button>
        <button type="button" onClick={() => copy(canonical, "link")} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-bold text-foreground hover:border-primary/40">
          {copied === "link" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied === "link" ? "Copied" : "Copy link"}
        </button>
      </div>
    </aside>
  );
}
