"use client";

import { useState } from "react";
import Link from "next/link";
import { Crown, LayoutDashboard, Loader2, LogOut, Settings, UserCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type UserMenuProps = {
  displayName: string;
  email?: string | null;
  initials: string;
  avatarSrc?: string;
  isPremium?: boolean;
  canAccessDashboard?: boolean;
  triggerClassName?: string;
  align?: "start" | "center" | "end";
};

export function UserMenu({
  displayName,
  email,
  initials,
  avatarSrc,
  isPremium = false,
  canAccessDashboard = isPremium,
  triggerClassName,
  align = "end",
}: UserMenuProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      // Lazy import keeps supabase-js out of the header bundle that every
      // marketing page ships (UserMenu only renders for signed-in users,
      // and the header will already have this chunk warm for them).
      const { createBrowserSupabaseClient } = await import("@/lib/supabase/client");
      const supabase = createBrowserSupabaseClient();
      void supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    } catch {
      // Chunk load failed (offline/ad-block) — the server route below
      // still clears the session cookies, so proceed regardless.
    }
    window.location.replace("/auth/sign-out");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn("h-10 px-2 sm:px-3 rounded-full border border-transparent hover:border-border", triggerClassName)}
        >
          <div className="relative leading-none">
            <Avatar className="size-8 ring-1 ring-border">
              <AvatarImage key={avatarSrc ?? "user-avatar"} src={avatarSrc} alt={displayName} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {isPremium && (
              <span className="absolute -top-1 -right-1 !w-4 !h-4 !leading-none transform-none rounded-full bg-[var(--brand-orange)] text-white border border-card flex items-center justify-center !shrink-0">
                <Crown className="!w-[10px] !h-[10px] !shrink-0" />
              </span>
            )}
          </div>
          <div className="hidden sm:flex flex-col items-start leading-tight ml-1">
            <span className="text-xs font-semibold text-foreground max-w-[120px] truncate">{displayName}</span>
            {email ? (
              <span className="text-[11px] text-muted-foreground max-w-[120px] truncate">{email}</span>
            ) : null}
          </div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align={align} className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2 py-2">
          <div className="relative">
            <Avatar className="size-8 ring-1 ring-border">
              <AvatarImage key={(avatarSrc ?? "menu-avatar") + "-menu"} src={avatarSrc} alt={displayName} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {isPremium && (
              <span className="absolute -top-1 -right-1 !w-4 !h-4 !leading-none transform-none rounded-full bg-[var(--brand-orange)] text-white border border-card flex items-center justify-center !shrink-0">
                <Crown className="!w-[10px] !h-[10px] !shrink-0" />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
            {email ? <p className="text-xs text-muted-foreground truncate">{email}</p> : null}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {canAccessDashboard && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/dashboard" prefetch={false} className="cursor-pointer">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem asChild>
          <Link href="/profile" prefetch={false} className="cursor-pointer">
            <UserCircle className="w-4 h-4" />
            Profile
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/settings" prefetch={false} className="cursor-pointer">
            <Settings className="w-4 h-4" />
            Settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          disabled={isSigningOut}
          onSelect={(event) => {
            event.preventDefault();
            void handleSignOut();
          }}
        >
          {isSigningOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          {isSigningOut ? "Signing out..." : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
