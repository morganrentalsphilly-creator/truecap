"use client";

import { Menu, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { UserMenu } from "@/components/auth/user-menu";
import { Button } from "@/components/ui/button";
import { SheetTrigger } from "@/components/ui/sheet";
import { setPendingSavedListSearch } from "@/lib/dashboard-saved-search-bridge";

type TopbarProps = {
  displayName: string;
  email: string;
  initials: string;
  avatarSrc?: string;
  isPremium?: boolean;
  canAccessDashboard?: boolean;
};

type Suggestion = { id: string; address: string; propertyType: string };

const SUGGESTIONS_LISTBOX_ID = "dashboard-search-suggestions";

export function Topbar({
  displayName,
  email,
  initials,
  avatarSrc,
  isPremium = false,
  canAccessDashboard = true,
}: TopbarProps) {
  const router = useRouter();
  const searchFormRef = useRef<HTMLFormElement | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  // -1 = nothing actively highlighted (keyboard arrow navigation).
  const [activeIndex, setActiveIndex] = useState(-1);
  // Closed by Escape / an outside click / focus leaving the form, without
  // throwing away the fetched matches — typing again reopens the panel.
  const [isPanelDismissed, setIsPanelDismissed] = useState(false);
  const normalizedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(normalizedQuery);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [normalizedQuery]);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      return;
    }

    const controller = new AbortController();
    setIsLoadingSuggestions(true);

    fetch(`/api/dashboard/search-suggestions?q=${encodeURIComponent(debouncedQuery)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) return [];
        const payload = (await res.json()) as { suggestions?: Suggestion[] };
        return Array.isArray(payload.suggestions) ? payload.suggestions : [];
      })
      .then((items) => {
        setSuggestions(items);
      })
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name !== "AbortError") {
          setSuggestions([]);
        }
      })
      .finally(() => {
        setIsLoadingSuggestions(false);
      });

    return () => {
      controller.abort();
    };
  }, [debouncedQuery]);

  // Reset the keyboard highlight whenever the result set changes.
  useEffect(() => {
    setActiveIndex(-1);
  }, [suggestions]);

  const goToSearch = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setPendingSavedListSearch(trimmed);
    setSuggestions([]);
    setActiveIndex(-1);
    setIsPanelDismissed(true);
    // Route to the dashboard-shell variant so the sidebar + topbar stay
    // mounted. The bare `/saved-analyses` route uses the marketing layout
    // and would visually kick the user out of the dashboard.
    router.push("/dashboard/saved-analyses");
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    goToSearch(query);
  };

  const showNoResults =
    debouncedQuery.length >= 2 && !isLoadingSuggestions && suggestions.length === 0;
  const isOpen =
    !isPanelDismissed && (suggestions.length > 0 || showNoResults || isLoadingSuggestions);

  // The panel is a hand-rolled listbox, not a Radix popover, so it inherits
  // no dismiss behaviour — without this it stays pinned over the dashboard
  // until the user edits the query. pointerdown (capture) closes it before
  // the tap resolves; the containment check keeps selecting a suggestion
  // working, since the listbox lives inside the form. focusin covers the
  // keyboard path (Tab away). Deliberately NOT a modal layer: that would
  // put `pointer-events: none` on <body> and freeze the page behind it.
  useEffect(() => {
    if (!isOpen) return;
    const closeIfOutside = (event: Event) => {
      const target = event.target as Node | null;
      if (target && searchFormRef.current?.contains(target)) return;
      setIsPanelDismissed(true);
      setActiveIndex(-1);
    };
    document.addEventListener("pointerdown", closeIfOutside, true);
    document.addEventListener("focusin", closeIfOutside);
    return () => {
      document.removeEventListener("pointerdown", closeIfOutside, true);
      document.removeEventListener("focusin", closeIfOutside);
    };
  }, [isOpen]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      // Closes the panel but keeps the query — standard combobox behaviour.
      // Handled before the empty-suggestions bail-out so Escape also
      // dismisses the "No saved deals match" / "Searching…" states.
      setIsPanelDismissed(true);
      setActiveIndex(-1);
      return;
    }
    if (suggestions.length === 0) return;
    // The arrows RE-OPEN a panel closed by Escape / an outside click (standard
    // combobox: Down opens the list). Without this the highlight would move
    // inside a listbox that isn't rendered — an invisible selection that Enter
    // could then act on, and an aria-activedescendant pointing at nothing.
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsPanelDismissed(false);
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsPanelDismissed(false);
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
      // Enter only picks a suggestion while the list is actually VISIBLE;
      // otherwise it submits the query the user typed.
    } else if (event.key === "Enter" && isOpen && activeIndex >= 0) {
      // A suggestion is highlighted — select it instead of submitting the
      // raw query. Prevent the form submit so both don't fire.
      event.preventDefault();
      const picked = suggestions[activeIndex];
      if (picked) goToSearch(picked.address);
    }
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-20 flex h-16 shrink-0 items-center gap-3 px-4 sm:px-6 lg:sticky lg:inset-auto lg:top-0 lg:gap-4 lg:px-8 bg-background/80 backdrop-blur-xl border-b border-border">
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl border border-border bg-background/70 backdrop-blur lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <form ref={searchFormRef} className="relative flex-1 max-w-xl" onSubmit={handleSearchSubmit} role="search">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          name="dashboard-saved-search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            // Editing the query reopens a panel closed by Escape / an
            // outside click.
            setIsPanelDismissed(false);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search your saved deals by address…"
          aria-label="Search saved deals"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={SUGGESTIONS_LISTBOX_ID}
          aria-autocomplete="list"
          // Gated on isOpen as well: when the panel is closed the option
          // elements are unmounted, so pointing at one would be a dangling
          // IDREF on a combobox reporting aria-expanded={false}.
          aria-activedescendant={isOpen && activeIndex >= 0 && suggestions[activeIndex] ? `sugg-${suggestions[activeIndex]!.id}` : undefined}
          autoComplete="off"
          className="w-full h-10 pl-10 pr-4 rounded-lg bg-muted/60 border border-transparent focus:border-primary focus:bg-background outline-none text-base sm:text-sm transition"
        />

        {isOpen ? (
          <div
            id={SUGGESTIONS_LISTBOX_ID}
            role="listbox"
            aria-label="Saved deal matches"
            // Keep focus in the input while picking with the mouse (the
            // aria-activedescendant pattern). Without this, Safari moves
            // focus to <body> on mousedown, the focus-out dismiss unmounts
            // the row, and the click never lands on the suggestion.
            onMouseDown={(event) => event.preventDefault()}
            className="absolute top-[calc(100%+0.4rem)] left-0 right-0 max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-card shadow-lg z-30"
          >
            {suggestions.map((item, index) => (
              <button
                key={item.id}
                id={`sugg-${item.id}`}
                role="option"
                aria-selected={index === activeIndex}
                type="button"
                className={`w-full text-left px-3 py-2 transition ${index === activeIndex ? "bg-muted" : "hover:bg-muted/50"}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => goToSearch(item.address)}
              >
                <div className="text-sm font-medium text-foreground truncate">{item.address}</div>
                <div className="text-xs text-muted-foreground truncate">{item.propertyType}</div>
              </button>
            ))}
            {showNoResults ? (
              <div className="px-3 py-2 text-xs text-muted-foreground" role="status">
                No saved deals match “{debouncedQuery}”.
              </div>
            ) : null}
            {isLoadingSuggestions && suggestions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground" role="status">
                Searching…
              </div>
            ) : null}
          </div>
        ) : null}
        </form>

        <div className="flex items-center gap-2 ml-auto">
          {/* Mobile: the primary action ("analyze a new property" — the whole
              product promise) as a compact icon button, since the full CTA is
              md+ only and the topbar otherwise leads with searching EXISTING
              deals. 44px touch target. */}
          <Link
            href="/"
            prefetch={false}
            aria-label="New analysis"
            className="inline-flex size-11 items-center justify-center rounded-lg text-white transition hover:opacity-90 md:hidden"
            style={{ background: "var(--gradient-premium)", boxShadow: "var(--shadow-glow)" }}
          >
            <Sparkles className="h-5 w-5" />
          </Link>
          <Link
            href="/"
            prefetch={false}
            className="hidden md:inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: "var(--gradient-premium)", boxShadow: "var(--shadow-glow)" }}
          >
            <Sparkles className="h-4 w-4" />
            New Analysis
          </Link>

          <div className="pl-3 ml-1 border-l border-border">
            <UserMenu
              displayName={displayName}
              email={email}
              initials={initials}
              avatarSrc={avatarSrc}
              isPremium={isPremium}
              canAccessDashboard={canAccessDashboard}
              triggerClassName="hover:bg-muted"
            />
          </div>
        </div>
      </header>
      <div className="h-16 lg:hidden" aria-hidden="true" />
    </>
  );
}
