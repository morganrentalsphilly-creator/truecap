"use client";

import { Menu, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
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
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  // -1 = nothing actively highlighted (keyboard arrow navigation).
  const [activeIndex, setActiveIndex] = useState(-1);
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
  const isOpen = suggestions.length > 0 || showNoResults || isLoadingSuggestions;

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      // A suggestion is highlighted — select it instead of submitting the
      // raw query. Prevent the form submit so both don't fire.
      event.preventDefault();
      const picked = suggestions[activeIndex];
      if (picked) goToSearch(picked.address);
    } else if (event.key === "Escape") {
      setSuggestions([]);
      setActiveIndex(-1);
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
        <form className="relative flex-1 max-w-xl" onSubmit={handleSearchSubmit} role="search">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          name="dashboard-saved-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search your saved deals by address…"
          aria-label="Search saved deals"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={SUGGESTIONS_LISTBOX_ID}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 && suggestions[activeIndex] ? `sugg-${suggestions[activeIndex]!.id}` : undefined}
          autoComplete="off"
          className="w-full h-10 pl-10 pr-4 rounded-lg bg-muted/60 border border-transparent focus:border-primary focus:bg-background outline-none text-base sm:text-sm transition"
        />

        {isOpen ? (
          <div
            id={SUGGESTIONS_LISTBOX_ID}
            role="listbox"
            aria-label="Saved deal matches"
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
