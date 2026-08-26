"use client";

/**
 * Compact, sticky workspace navigation for a saved deal. It keeps the major
 * tools reachable without forcing a power user to repeatedly traverse the
 * full page, while retaining an always-available route back to the overview.
 *
 * Label-only by design: the cards fetch their own data client-side (the page
 * only loads the deal row), so counts aren't cheaply available server-side and
 * we don't add queries for them. Chip order mirrors the card order on the page.
 *
 * Each chip only renders once its target card has actually mounted content.
 * Every card returns null until its client-side fetch resolves, and some stay
 * null permanently (ScenariosCard on MIGRATION_PENDING,
 * DealDocumentsCard when the storage bucket is missing) — a chip pointing at a
 * zero-height div is a dead affordance. A MutationObserver per wrapper keeps
 * chips in sync with card presence, matching the page's own precedent of
 * gating anchor CTAs on target presence (the #owned-equity link) and the
 * codebase's "invisible until useful" principle. Overview is always available.
 */

import { useEffect, useMemo, useState } from "react";
import { cn, scrollBehavior } from "@/lib/utils";

const SECTIONS = [
  { id: "deal-overview", label: "Overview", always: true },
  { id: "deal-scenarios", label: "Scenarios" },
  { id: "deal-due-diligence", label: "Checklist" },
  { id: "deal-documents", label: "Files" },
  { id: "deal-notes", label: "Notes" },
  { id: "deal-comments", label: "Comments" },
] as const;

export function DealWorkspaceAnchorChips() {
  const [hasContent, setHasContent] = useState<Record<string, boolean>>({});
  const [activeId, setActiveId] = useState("deal-overview");

  useEffect(() => {
    const observers: MutationObserver[] = [];
    const sync = (id: string, wrapper: Element) => {
      const present = wrapper.childElementCount > 0;
      setHasContent((prev) =>
        prev[id] === present ? prev : { ...prev, [id]: present }
      );
    };
    for (const section of SECTIONS) {
      if ("always" in section && section.always) continue;
      const { id } = section;
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

  const visibleSections = useMemo(
    () =>
      SECTIONS.filter(
        (section) => ("always" in section && section.always) || hasContent[section.id]
      ),
    [hasContent]
  );

  useEffect(() => {
    let frame = 0;
    const syncActiveSection = () => {
      frame = 0;
      const atPageEnd =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 8;
      let next = visibleSections[0]?.id ?? "deal-overview";

      if (atPageEnd) {
        next = visibleSections.at(-1)?.id ?? next;
      } else {
        // h-16 Topbar + the sticky nav itself occupy roughly 116px. A target
        // becomes current once its heading reaches the workspace reading line.
        for (const section of visibleSections) {
          const target = document.getElementById(section.id);
          if (target && target.getBoundingClientRect().top <= 128) next = section.id;
        }
      }
      setActiveId((current) => (current === next ? current : next));
    };
    const scheduleSync = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(syncActiveSection);
    };

    syncActiveSection();
    window.addEventListener("scroll", scheduleSync, { passive: true });
    window.addEventListener("resize", scheduleSync);
    return () => {
      window.removeEventListener("scroll", scheduleSync);
      window.removeEventListener("resize", scheduleSync);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [visibleSections]);

  return (
    <nav
      aria-label="Deal workspace sections"
      className="sticky top-16 z-10 -mx-4 overflow-x-auto border-y border-border bg-background/95 px-4 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:-mx-6 sm:px-6"
    >
      <div className="flex w-max min-w-full items-center gap-1.5">
        {visibleSections.map((section) => {
          const isActive = activeId === section.id;
          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              aria-current={isActive ? "location" : undefined}
              onClick={(event) => {
                const target = document.getElementById(section.id);
                if (!target) return; // fall back to the default jump
                event.preventDefault();
                setActiveId(section.id);
                window.history.pushState(null, "", `#${section.id}`);
                target.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
              }}
              className={cn(
                "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border px-3 py-2 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {section.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
