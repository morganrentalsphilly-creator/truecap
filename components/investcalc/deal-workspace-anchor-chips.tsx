"use client";

/**
 * Contents-scent row for the deal workspace (app/dashboard/saved-analyses/[id]):
 * on open, everything below the underwrite header sits under the fold with no
 * hint the checklist / documents / notes / scenarios exist. One compact row of
 * anchor chips under the header fixes that — each smooth-scrolls to its card.
 *
 * Label-only by design: the cards fetch their own data client-side (the page
 * only loads the deal row), so counts aren't cheaply available server-side and
 * we don't add queries for them. Chip order mirrors the card order on the page.
 *
 * Each chip only renders once its target card has actually mounted content.
 * Every card returns null until its client-side fetch resolves, and some stay
 * null permanently (ScenariosCard on MIGRATION_PENDING / NOT_FOUND,
 * DealDocumentsCard when the storage bucket is missing) — a chip pointing at a
 * zero-height div is a dead affordance. A MutationObserver per wrapper keeps
 * chips in sync with card presence, matching the page's own precedent of
 * gating anchor CTAs on target presence (the #owned-equity link) and the
 * codebase's "invisible until useful" principle. The whole nav renders nothing
 * until at least one card exists, so there's no empty row on first paint.
 */

import { useEffect, useState } from "react";
import { scrollBehavior } from "@/lib/utils";

const SECTIONS = [
  { id: "deal-scenarios", label: "Scenarios" },
  { id: "deal-due-diligence", label: "Due diligence" },
  { id: "deal-documents", label: "Documents" },
  { id: "deal-notes", label: "Notes" },
  { id: "deal-comments", label: "Comments" },
] as const;

export function DealWorkspaceAnchorChips() {
  const [hasContent, setHasContent] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const observers: MutationObserver[] = [];
    const sync = (id: string, wrapper: Element) => {
      const present = wrapper.childElementCount > 0;
      setHasContent((prev) =>
        prev[id] === present ? prev : { ...prev, [id]: present }
      );
    };
    for (const { id } of SECTIONS) {
      const wrapper = document.getElementById(id);
      if (!wrapper) continue;
      sync(id, wrapper);
      const observer = new MutationObserver(() => sync(id, wrapper));
      // Direct children only: each wrapper's sole child is the card root, so
      // "card rendered null" ⇔ "wrapper has no element children".
      observer.observe(wrapper, { childList: true });
      observers.push(observer);
    }
    return () => observers.forEach((observer) => observer.disconnect());
  }, []);

  const visibleSections = SECTIONS.filter((section) => hasContent[section.id]);
  if (visibleSections.length === 0) return null;

  return (
    <nav aria-label="On this page" className="mt-3 flex flex-wrap items-center gap-1.5">
      {visibleSections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          onClick={(event) => {
            const target = document.getElementById(section.id);
            if (!target) return; // fall back to the default jump
            event.preventDefault();
            target.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
          }}
          className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {section.label}
        </a>
      ))}
    </nav>
  );
}
