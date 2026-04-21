"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  BookmarkCheck,
  BookMarked,
  Crown,
  FileText,
  Loader2,
  LogIn,
  LogOut,
  SlidersHorizontal,
  UserCircle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { signOutAction } from "@/app/actions/auth";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import { cn } from "@/lib/utils";

type HeaderUser = Pick<User, "id" | "email" | "user_metadata">;

type ProfileHeaderData = {
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type SubscriptionPlanRow = {
  slug?: string | null;
  entitlements?: { features?: string[] } | null;
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

export function Header({ initialUser = null }: { initialUser?: HeaderUser | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [user, setUser] = useState<HeaderUser | null>(initialUser);
  const [authLoaded, setAuthLoaded] = useState(Boolean(initialUser));
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
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
    const loadPremiumStatusById = async (uid?: string) => {
      if (!uid) {
        setIsPremium(false);
        setIsPremiumStatusReady(true);
        return;
      }
      setIsPremiumStatusReady(false);
      try {
        const { data } = await supabase
          .from("subscriptions")
          .select("status, plans(slug, entitlements)")
          .eq("user_id", uid)
          .in("status", ["active", "trialing", "past_due"])
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const plan = (data?.plans as SubscriptionPlanRow | null | undefined) ?? null;
        const features = plan?.entitlements?.features ?? [];
        const hasProSlug = !!plan?.slug && plan.slug !== "free";
        const hasPremiumFeatures =
          features.includes("save_deal") ||
          features.includes("pdf_export") ||
          features.includes("template_manage");
        setIsPremium(hasProSlug || hasPremiumFeatures);
      } finally {
        setIsPremiumStatusReady(true);
      }
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
      void loadPremiumStatusById(bootstrapUserId);
      void loadSavedCountById(bootstrapUserId);
      subscribeSavedAnalysesCount(bootstrapUserId);
    }

    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      if (currentUser) {
        currentUserIdRef.current = currentUser.id;
        setUser(currentUser);
        void loadProfileById(currentUser.id);
        void loadPremiumStatusById(currentUser.id);
        void loadSavedCountById(currentUser.id);
        subscribeSavedAnalysesCount(currentUser.id);
      } else if (!currentUserIdRef.current) {
        setUser(null);
        void loadProfileById(undefined);
        void loadPremiumStatusById(undefined);
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
      setAuthLoaded(true);
      void loadProfileById(nextUser?.id);
      void loadPremiumStatusById(nextUser?.id);
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

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    await signOutAction();
    setIsSigningOut(false);
    setUser(null);
    toast({ title: "Signed out", description: "See you next time." });
    router.push("/");
    router.refresh();
  };

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
          <span className="font-bold underline underline-offset-2 cursor-pointer hover:opacity-80 transition-opacity">
            Pro
          </span>
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
          <Link
            href="/"
            className="flex flex-col items-center justify-start  gap-0 sm:gap-0 min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
             <div className="flex items-center justify-start w-full w-[100px] h-[30px] overflow-hidden">
        <Image
          src="/high-resolution-color-logo.png"
          alt="TrueCap"
          width={100}
          height={30}
         
        />
      </div>
            <div className="min-w-0">
              
              <p className="hidden sm:block text-xs text-muted-foreground mt-0.5 truncate">
                Professional real estate investment calculator
              </p>
            </div>
          </Link>
        </div>


          {/* Center — Pro upsell pill (free / non-premium only, desktop) */}
          {isPremiumStatusReady && !isPremium && (
            <div className="hidden lg:flex items-center gap-2 bg-muted/60 border border-border/70 rounded-full px-3.5 py-1.5">
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
          )}


          

          {/* Right — Auth buttons */}
          {/* Right — Nav actions + user */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
         
            {user && isPremium && (
              <div className="hidden sm:flex items-center gap-2 mr-1">
                <Link href="/compare" prefetch={false}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-full text-[12px] sm:text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted gap-1.5 transition-all"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Compare</span>
              </Button>
            </Link>

            <Link href="/saved-analyses" prefetch={false} className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-full text-[12px] sm:text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted gap-1.5 transition-all"
              >
                <BookMarked className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Saved</span>
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold leading-none">
                  {savedDealCount}
                </span>
              </Button>
            </Link>
              </div>
            )}


               {/* Divider (desktop only) */}
               <div className="hidden sm:block w-px h-5 bg-border/60 mr-1" />

          {!authLoaded ? (
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse" aria-hidden />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 px-2 sm:px-3 rounded-full border border-transparent hover:border-border"
                >
                  <div className="relative leading-none ">
                    <Avatar className="size-8 ring-1 ring-border">
                      <AvatarImage key={avatarSrc ?? "header-avatar"} src={avatarSrc} alt={displayName} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    {isPremium && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 leading-none transform-none rounded-full bg-[var(--brand-orange)] text-white border border-card flex items-center justify-center !shrink-0">
                        <Crown className="!w-[10px] !h-[10px] !shrink-0" />
                      </span>
                    )}
                  </div>
                  <div className="hidden sm:flex flex-col items-start leading-tight ml-1">
                    <span className="text-xs font-semibold text-foreground max-w-[120px] truncate">
                      {displayName}
                    </span>
                    <span className="text-[11px] text-muted-foreground max-w-[120px] truncate">
                      {user.email}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="flex items-center gap-2 py-2">
                  <div className="relative">
                    <Avatar className="size-8 ring-1 ring-border">
                      <AvatarImage key={(avatarSrc ?? "menu-avatar") + "-menu"} src={avatarSrc} alt={displayName} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    {isPremium && (
                      <span className="absolute -top-1 -right-1 size-4 rounded-full bg-[var(--brand-orange)] text-white border border-card flex items-center justify-center">
                        <Crown className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                {isPremium && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/compare" prefetch={false} className="cursor-pointer">
                        <ArrowLeftRight className="w-4 h-4" />
                        Compare
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/saved-analyses" prefetch={false} className="cursor-pointer">
                        <BookmarkCheck className="w-4 h-4" />
                        Saved Analyses
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/templates" prefetch={false} className="cursor-pointer">
                        <FileText className="w-4 h-4" />
                        Templates
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
                {/* <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                </DropdownMenuItem> */}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  variant="destructive"
                  disabled={isSigningOut}
                  onSelect={(event) => {
                    event.preventDefault();
                    void handleSignOut();
                  }}
                >
                  {isSigningOut ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                  {isSigningOut ? "Signing out..." : "Sign out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
