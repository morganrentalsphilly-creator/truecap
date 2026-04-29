"use client";

import { Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { UserMenu } from "@/components/auth/user-menu";
import { setPendingSavedListSearch } from "@/lib/dashboard-saved-search-bridge";

type TopbarProps = {
  displayName: string;
  email: string;
  initials: string;
  avatarSrc?: string;
};

export function Topbar({ displayName, email, initials, avatarSrc }: TopbarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ id: string; address: string; propertyType: string }>>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
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
        const payload = (await res.json()) as { suggestions?: Array<{ id: string; address: string; propertyType: string }> };
        return Array.isArray(payload.suggestions) ? payload.suggestions : [];
      })
      .then((items) => {
        console.log("Suggestions:", items);
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

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    console.log("Search submit:", trimmed);
    if (!trimmed) return;
    setPendingSavedListSearch(trimmed);
    setSuggestions([]);
    router.push("/saved-analyses");
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-4 px-6 lg:px-8 bg-background/80 backdrop-blur-xl border-b border-border">
      <form className="relative flex-1 max-w-xl" onSubmit={handleSearchSubmit}>
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          name="dashboard-saved-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search deals, properties, markets…"
          className="w-full h-10 pl-10 pr-4 rounded-lg bg-muted/60 border border-transparent focus:border-primary focus:bg-background outline-none text-sm transition"
        />
        
        {suggestions.length > 0 ? (
          <div className="absolute top-[calc(100%+0.4rem)] left-0 right-0 rounded-lg border border-border bg-card shadow-lg overflow-hidden z-30">
            {suggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-muted/50 transition"
                onClick={() => {
                  setPendingSavedListSearch(item.address);
                  setSuggestions([]);
                  router.push("/saved-analyses");
                }}
              >
                <div className="text-sm font-medium text-foreground truncate">{item.address}</div>
                <div className="text-xs text-muted-foreground truncate">{item.propertyType}</div>
              </button>
            ))}
          </div>
        ) : null}
        {isLoadingSuggestions && debouncedQuery.length >= 2 ? (
          <div className="absolute top-[calc(100%+0.4rem)] left-0 right-0 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground z-30">
            Searching...
          </div>
        ) : null}
      </form>

      <div className="flex items-center gap-2 ml-auto">
        

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
            isPremium
            triggerClassName="hover:bg-muted"
          />
        </div>
      </div>
    </header>
  );
}
