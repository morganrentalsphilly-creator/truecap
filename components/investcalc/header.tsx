"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Crown,
  LayoutDashboard,
  LogIn,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import { AppLogo } from "@/components/brand/app-logo";
import { UserMenu } from "@/components/auth/user-menu";

type HeaderUser = Pick<User, "id" | "email" | "user_metadata">;

type ProfileHeaderData = {
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type HeaderEntitlements = {
  features?: string[];
  max_saved_deals?: number | null;
};

type ProfileUpdatedDetail = {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
};

function getDisplayName(user: HeaderUser): string {
  const metadataName =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    (user.user_metadata?.name as string | undefined)?.trim();
  if (metadataName) return metadataName;
  return user.email?.split("@")[0] ?? "Account";
}

function getAvatarInitials(displayName: string, email?: string): string {
  const normalized = displayName.trim();
  if (!normalized) {
    return (email ?? "U").slice(0, 2).toUpperCase();
  }
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return normalized.slice(0, 2).toUpperCase();
}

function getAvatarUrl(user: HeaderUser): string | undefined {
  const avatarFromMetadata =
    (user.user_metadata?.avatar_url as string | undefined)?.trim() ||
    (user.user_metadata?.picture as string | undefined)?.trim();
  return avatarFromMetadata || undefined;
}

function deriveAccessState(features: string[]) {
  const hasPremiumFeatures =
    features.includes("deal_score") ||
    features.includes("pdf_export") ||
    features.includes("template_manage") ||
    features.includes("tax_strategy") ||
    features.includes("projections") ||
    features.includes("exit_scenarios");
  return {
    isPremium: hasPremiumFeatures,
    hasDashboardAccess: features.includes("dashboard_access") && features.includes("save_deal"),
  };
}

export function Header({
  initialUser = null,
  initialEntitlements = null,
}: {
  initialUser?: HeaderUser | null;
  initialEntitlements?: HeaderEntitlements | null;
}) {
  const [user, setUser] = useState<HeaderUser | null>(initialUser);
  const [authLoaded, setAuthLoaded] = useState(Boolean(initialUser));
  const initialFeatures = initialEntitlements?.features ?? [];
  const initialAccess = deriveAccessState(initialFeatures);
  const [isPremium, setIsPremium] = useState(initialAccess.isPremium);
  const [hasDashboardAccess, setHasDashboardAccess] = useState(initialAccess.hasDashboardAccess);
  /** Avoid showing free-tier upsell UI until subscription check finishes for signed-in users. */
  const [isPremiumStatusReady, setIsPremiumStatusReady] = useState(false);
  const [profileData, setProfileData] = useState<ProfileHeaderData | null>(null);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [savedDealCount, setSavedDealCount] = useState(0);
  const currentUserIdRef = useRef<string | undefined>(initialUser?.id);
  const savedAnalysesChannelInstanceIdRef = useRef(
    `saved-analyses-count-instance:${Math.random().toString(36).slice(2)}`
  );

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let savedAnalysesChannel: ReturnType<typeof supabase.channel> | null = null;
    let savedAnalysesChannelUserId: string | undefined;
    let savedAnalysesChannelVersion = 0;
    const loadProfileById = async (uid?: string) => {
      if (!uid) {
        setProfileData(null);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("first_name, last_name, display_name, avatar_url")
        .eq("id", uid)
        .maybeSingle();
      setProfileData((data as ProfileHeaderData | null) ?? null);
    };
    const loadSavedCountById = async (uid?: string) => {
      if (!uid) {
        setSavedDealCount(0);
        return;
      }
      const { count } = await supabase
        .from("saved_analyses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", uid)
        .is("deleted_at", null);
      setSavedDealCount(count ?? 0);
    };
    const teardownSavedAnalysesSubscription = () => {
      if (!savedAnalysesChannel) return;
      void supabase.removeChannel(savedAnalysesChannel);
      savedAnalysesChannel = null;
      savedAnalysesChannelUserId = undefined;
    };
    const subscribeSavedAnalysesCount = (uid?: string) => {
      if (savedAnalysesChannel && uid && uid === savedAnalysesChannelUserId) return;
      teardownSavedAnalysesSubscription();
      if (!uid) return;
      savedAnalysesChannelUserId = uid;
      savedAnalysesChannel = supabase
        .channel(
          `${savedAnalysesChannelInstanceIdRef.current}:${uid}:${++savedAnalysesChannelVersion}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "saved_analyses",
            filter: `user_id=eq.${uid}`,
          },
          () => {
            void loadSavedCountById(uid);
          }
        )
        .subscribe();
    };
    const bootstrapUserId = currentUserIdRef.current;
    if (bootstrapUserId) {
      void loadProfileById(bootstrapUserId);
      void loadSavedCountById(bootstrapUserId);
      subscribeSavedAnalysesCount(bootstrapUserId);
      setIsPremiumStatusReady(true);
    }

    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      if (currentUser) {
        currentUserIdRef.current = currentUser.id;
        setUser(currentUser);
        void loadProfileById(currentUser.id);
        void loadSavedCountById(currentUser.id);
        subscribeSavedAnalysesCount(currentUser.id);
      } else if (!currentUserIdRef.current) {
        setUser(null);
        setIsPremium(false);
        setHasDashboardAccess(false);
        setIsPremiumStatusReady(true);
        void loadProfileById(undefined);
        void loadSavedCountById(undefined);
        subscribeSavedAnalysesCount(undefined);
      }
      setAuthLoaded(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;
      if (!nextUser && event !== "SIGNED_OUT" && currentUserIdRef.current) {
        setAuthLoaded(true);
        return;
      }
      currentUserIdRef.current = nextUser?.id;
      setUser(nextUser);
      if (!nextUser) {
        setIsPremium(false);
        setHasDashboardAccess(false);
      }
      setIsPremiumStatusReady(true);
      setAuthLoaded(true);
      void loadProfileById(nextUser?.id);
      void loadSavedCountById(nextUser?.id);
      subscribeSavedAnalysesCount(nextUser?.id);
    });

    const handleProfileUpdated = (event: Event) => {
      const detail = (event as CustomEvent<ProfileUpdatedDetail>).detail;
      if (!detail) return;
      setProfileData((prev) => ({
        first_name: detail.firstName ?? prev?.first_name ?? null,
        last_name: detail.lastName ?? prev?.last_name ?? null,
        display_name:
          `${detail.firstName ?? prev?.first_name ?? ""} ${detail.lastName ?? prev?.last_name ?? ""}`.trim() ||
          prev?.display_name ||
          null,
        avatar_url: detail.avatarUrl ?? prev?.avatar_url ?? null,
      }));
      setAvatarVersion((v) => v + 1);
    };
    const handleSavedAnalysesChanged = () => {
      void loadSavedCountById(currentUserIdRef.current);
    };
    window.addEventListener("profile-updated", handleProfileUpdated as EventListener);
    window.addEventListener("saved-analyses-changed", handleSavedAnalysesChanged);

    return () => {
      subscription.unsubscribe();
      teardownSavedAnalysesSubscription();
      window.removeEventListener("profile-updated", handleProfileUpdated as EventListener);
      window.removeEventListener("saved-analyses-changed", handleSavedAnalysesChanged);
    };
  }, []);

  const displayName = useMemo(() => {
    if (!user) return "";
    const profileName =
      profileData?.display_name?.trim() ||
      `${profileData?.first_name ?? ""} ${profileData?.last_name ?? ""}`.trim();
    return profileName || getDisplayName(user);
  }, [profileData, user]);
  const initials = useMemo(
    () => (user ? getAvatarInitials(displayName, user.email ?? undefined) : ""),
    [displayName, user]
  );
  const avatarUrl = useMemo(() => {
    if (!user) return undefined;
    return profileData?.avatar_url || getAvatarUrl(user);
  }, [profileData?.avatar_url, user]);
  const avatarSrc = useMemo(() => {
    if (!avatarUrl) return undefined;
    return `${avatarUrl}${avatarUrl.includes("?") ? "&" : "?"}v=${avatarVersion}`;
  }, [avatarUrl, avatarVersion]);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  return (
    <div className="sticky top-0 z-50">
    {/* Announcement bar — Pro upgrade prompt (free / non-premium only) */}
    {isPremiumStatusReady && !isPremium && !bannerDismissed && (
      <div className="bg-primary text-primary-foreground h-9 flex items-center justify-center px-4 relative">
        <div className="flex items-center gap-2 text-[12px] sm:text-[13px] font-medium">
          <Zap className="w-3.5 h-3.5 fill-current opacity-90 shrink-0" />
          <span className="hidden sm:inline">
            Unlock Deal Score, 10-Year Projections and Tax Strategy with
          </span>
          <span className="sm:hidden">Upgrade to</span>
          <Link href="/pricing">
          <span className="font-bold underline underline-offset-2 cursor-pointer hover:opacity-80 transition-opacity">
            Pro
          </span>
          </Link>
          <span className="hidden sm:inline opacity-70">&mdash; institutional-grade analysis in seconds.</span>
        </div>
        <button
          onClick={() => setBannerDismissed(true)}
          aria-label="Dismiss"
          className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity text-primary-foreground text-lg leading-none font-light"
        >
          &times;
        </button>
      </div>
    )}

    {/* Main nav */}
    <header className="bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
        <div className="flex items-center justify-start gap-0 sm:gap-3 min-w-0">
          <AppLogo priority subtitleClassName="hidden sm:block" />
        </div>


          {/* Center — Pro upsell pill (free / non-premium only, desktop) */}
          {isPremiumStatusReady && !isPremium && (
             <Link href="/pricing"
            >
            <div className="hidden xl:flex items-center gap-2 bg-muted/60 border border-border/70 rounded-full px-3.5 py-1.5">
              <span className="inline-flex items-center gap-1 bg-[var(--brand-orange)] text-white text-[10px] font-bold px-2 py-[3px] rounded-full uppercase tracking-wider">
                <Crown className="w-2.5 h-2.5" />
                Pro
              </span>
              <span className="text-[11px] text-muted-foreground font-medium tracking-[0.01em]">
                Deal Score
              </span>
              <span className="text-muted-foreground/40 text-[11px]">&bull;</span>
              <span className="text-[11px] text-muted-foreground font-medium tracking-[0.01em]">
                Projections
              </span>
              <span className="text-muted-foreground/40 text-[11px]">&bull;</span>
              <span className="text-[11px] text-muted-foreground font-medium tracking-[0.01em]">
                Tax Strategy
              </span>
            </div>
            </Link>
          )}


          

          {/* Right — Auth buttons */}
          {/* Right — Nav actions + user */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">

            {/* Blog moved out of the top nav — was competing with the
                Dashboard link visually for auth'd users. Still linked
                from the site footer Product column, the homepage hero
                "Related" rail, and from every blog post's related-posts
                footer, so discoverability is preserved. */}

            {user && hasDashboardAccess && (
              <div className="flex items-center gap-2 sm:mr-1">
                <Link href="/dashboard" prefetch={false}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:w-auto sm:h-9 sm:px-3.5 rounded-full text-[12px] sm:text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted gap-1.5 transition-all"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            </Link>
              </div>
            )}


               {/* Divider (desktop only) */}
               <div className="hidden sm:block w-px h-5 bg-border/60 mr-1" />

          {!authLoaded ? (
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse" aria-hidden />
          ) : user ? (
            <UserMenu
              displayName={displayName}
              email={user.email}
              initials={initials}
              avatarSrc={avatarSrc}
              isPremium={isPremium}
              canAccessDashboard={hasDashboardAccess}
            />
          ) : (
            <>
              <Button variant="ghost" 
              className="h-9 px-3 sm:px-4 rounded-full text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
             asChild>
                <Link href="/auth/login">
                  <LogIn className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Log in</span>
                  <span className="sm:hidden">Login</span>
                </Link>
              </Button>
              <Button
                asChild
                className={cn(
                  "h-9 px-4 sm:px-5 rounded-full text-[13px] font-semibold",
                  "bg-primary hover:bg-primary/90 text-primary-foreground",
                  "shadow-[0_2px_8px_0_rgba(82,72,212,0.35)] hover:shadow-[0_4px_12px_0_rgba(82,72,212,0.45)]",
                  "transition-all duration-200",
                )}
              >
                <Link href="/auth/sign-up">
                  <span className="hidden sm:inline">Sign Up Free</span>
                  <span className="sm:hidden">Sign Up</span>
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
    </div>
  );
}
