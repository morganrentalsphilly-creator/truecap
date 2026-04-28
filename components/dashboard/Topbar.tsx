import { Search, Bell, Sparkles, FileDown } from "lucide-react";
import Link from "next/link";
import { UserMenu } from "@/components/auth/user-menu";

type TopbarProps = {
  displayName: string;
  email: string;
  initials: string;
  avatarSrc?: string;
};

export function Topbar({ displayName, email, initials, avatarSrc }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-4 px-6 lg:px-8 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="relative flex-1 max-w-xl">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search deals, properties, markets…"
          className="w-full h-10 pl-10 pr-4 rounded-lg bg-muted/60 border border-transparent focus:border-primary focus:bg-background outline-none text-sm transition"
        />
        <kbd className="hidden md:inline-flex absolute right-3 top-1/2 -translate-y-1/2 items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded border border-border bg-background text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <button
          type="button"
          className="hidden md:inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold border border-border bg-background hover:bg-muted transition disabled:opacity-60"
        >
          <FileDown className="h-4 w-4" />
          Export PDF
        </button>

        <Link
          href="/"
          prefetch={false}
          className="hidden md:inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold text-white transition hover:opacity-90"
          style={{ background: "var(--gradient-premium)", boxShadow: "var(--shadow-glow)" }}
        >
          <Sparkles className="h-4 w-4" />
          New Analysis
        </Link>

        <button className="relative h-10 w-10 grid place-items-center rounded-lg hover:bg-muted transition">
          <Bell className="h-[18px] w-[18px] text-muted-foreground" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
        </button>

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
