"use client";

/**
 * Share-link button + inline popover.
 *
 * Mints an opaque, server-backed public URL and surfaces it with a
 * copy-to-clipboard button. Deal inputs never enter the URL.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Share2, Copy, Check, Loader2, LogIn, UserPlus } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import type { AnalyzerStrategyKey } from "@/lib/analyzer-strategy-persistence";
import type { MaoTarget } from "@/lib/max-allowable-offer";
import type { OfferCeilingTargetSource } from "@/lib/offer-ceiling-contract";
import type { OfferCeilingDecisionBasis } from "@/lib/offer-ceiling-decision-basis";
import {
  createPublicShareAction,
  listPublicSharesAction,
  revokePublicShareAction,
  type PublicShareListItem,
} from "@/app/actions/public-shares";
import { trackEvent } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";
import {
  parseShareAuthIntent,
  resolveShareAuthReturnPath,
  serializeShareAuthIntent,
  SHARE_AUTH_INTENT_STORAGE_KEY,
} from "@/lib/share-auth-intent";
import { isCurrentMountedMutation } from "@/lib/deal-workspace-mutation-lifecycle";
import { shareLinkSubjectFingerprint } from "@/lib/share-link-subject";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getFreshSessionUser } from "@/lib/supabase/ensure-fresh-session";
import { isCurrentShareAuthRequest } from "@/lib/share-auth-lifecycle";

const SHARE_AUDIENCE_LABEL = {
  "investment-partner": "Partner",
  client: "Client",
  "lender-review": "Lender review",
} as const;

type ShareAuthIdentity = {
  userId: string | null;
  epoch: number;
  status: "checking" | "ready" | "signed-out" | "unavailable";
};

type ShareIdentityVerification = "current" | "stale" | "unavailable";

interface ShareLinkButtonProps {
  values: InvestmentFormValues | null;
  /** Presentation hint only. The server action independently authenticates
   *  immediately before any service-role mint. */
  isAuthenticated: boolean;
  className?: string;
  /** Saved deal id, when sharing a saved analysis. Lets the public viewer pull
   *  this deal's stored sale/rent comps (verified against the owner). */
  savedDealId?: string | null;
  /** Exact acquisition criteria shown with the current Offer Ceiling. */
  maoTarget?: MaoTarget | null;
  /** The current price field holds an automated estimate (AVM/rent-multiple)
   *  the user never replaced — the share viewer must not call it "Asking". */
  priceIsEstimated?: boolean;
  /** Provenance shown beside that exact target. */
  maoTargetSource?: OfferCeilingTargetSource | null;
  /** Immutable rule identity paired with the target. */
  adoptedDecisionBasis?: OfferCeilingDecisionBasis | null;
  /** Agent Pro deal workspace context. This changes only the user-facing label
   *  and emits the already-declared, PII-safe client-report funnel event. */
  context?: "analysis" | "client-report";
  /** External consistency gate (for example, while account Buy Box targets
   *  are still resolving). */
  disabled?: boolean;
  disabledReason?: string;
  /** Best-effort draft persistence before leaving for authentication. */
  onPrepareAuth?: () => void;
  /** Exact calculator lens whose specialist outcome is being shared. */
  analyzerStrategyKey?: AnalyzerStrategyKey | null;
}

export function ShareLinkButton({
  values,
  isAuthenticated,
  className,
  savedDealId,
  maoTarget,
  maoTargetSource,
  adoptedDecisionBasis,
  priceIsEstimated = false,
  context = "analysis",
  disabled: externallyDisabled = false,
  disabledReason,
  onPrepareAuth,
  analyzerStrategyKey,
}: ShareLinkButtonProps) {
  const pathname = usePathname();
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [authIdentity, setAuthIdentity] = useState<ShareAuthIdentity>(() => ({
    userId: null,
    epoch: 0,
    status: isAuthenticated ? "checking" : "signed-out",
  }));
  const [authVerificationRetry, setAuthVerificationRetry] = useState(0);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [includeAddress, setIncludeAddress] = useState(false);
  const [audience, setAudience] = useState<
    "investment-partner" | "client" | "lender-review"
  >("investment-partner");
  // Creating the opaque row happens after the user confirms disclosure
  // choices. Keep its in-flight state visible like the neighboring actions.
  const [isPreparing, setIsPreparing] = useState(false);
  const [sessionAuthRequired, setSessionAuthRequired] = useState(false);
  // The dialog manages every owner-scoped link, including links attached to a
  // different or soft-deleted deal. Rows are labeled with property, audience,
  // disclosure, and time so no live capability becomes impossible to revoke.
  const [myShares, setMyShares] = useState<PublicShareListItem[] | null>(null);
  const [sharesListState, setSharesListState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [sharesReloadToken, setSharesReloadToken] = useState(0);
  const [nextSharesOffset, setNextSharesOffset] = useState<number | null>(null);
  const [isLoadingOlderShares, setIsLoadingOlderShares] = useState(false);
  const [createdShare, setCreatedShare] = useState<{
    id: string;
    dealId: string | null;
  } | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmingRevokeId, setConfirmingRevokeId] = useState<string | null>(
    null,
  );
  const [showAllShares, setShowAllShares] = useState(false);
  const firstSharesRequestRef = useRef<symbol | null>(null);
  const createRequestRef = useRef<symbol | null>(null);
  const revokeRequestRef = useRef<symbol | null>(null);
  const olderSharesRequestRef = useRef<symbol | null>(null);
  const activeShareSubjectRef = useRef<string | null>(null);
  const authIdentityRef = useRef<ShareAuthIdentity>(authIdentity);
  const authVerificationRef = useRef(0);
  const observedAuthUserIdRef = useRef<string | null | undefined>(undefined);
  const mountedRef = useRef(false);
  const copiedResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const { toast } = useToast();
  const authReady =
    authIdentity.status === "ready" && authIdentity.userId !== null;
  const needsSignIn =
    authIdentity.status === "signed-out" ||
    sessionAuthRequired ||
    (!isAuthenticated && !authReady);
  const returnPath = resolveShareAuthReturnPath(pathname, context);
  const encodedReturnPath = encodeURIComponent(returnPath);
  const shareSubjectFingerprint = shareLinkSubjectFingerprint({
    values,
    savedDealId,
    maoTarget,
    maoTargetSource,
    adoptedDecisionBasis,
    priceIsEstimated,
    context,
    analyzerStrategyKey,
    isAuthenticated,
    authenticatedUserId: authIdentity.userId,
    authSessionEpoch: authIdentity.epoch,
  });

  // Server-rendered `isAuthenticated` is only a presentation hint. Resolve the
  // exact browser identity before reading or mutating owner-wide share state,
  // then invalidate synchronously when another tab signs out or changes users.
  useLayoutEffect(() => {
    mountedRef.current = true;

    const clearAuthBoundShareState = () => {
      activeShareSubjectRef.current = null;
      firstSharesRequestRef.current = null;
      createRequestRef.current = null;
      revokeRequestRef.current = null;
      olderSharesRequestRef.current = null;
      if (copiedResetTimeoutRef.current !== null) {
        clearTimeout(copiedResetTimeoutRef.current);
        copiedResetTimeoutRef.current = null;
      }
      setOpen(false);
      setCopied(false);
      setShareUrl("");
      setIncludeAddress(false);
      setIsPreparing(false);
      setSessionAuthRequired(false);
      setMyShares(null);
      setSharesListState("idle");
      setNextSharesOffset(null);
      setIsLoadingOlderShares(false);
      setCreatedShare(null);
      setRevokingId(null);
      setConfirmingRevokeId(null);
      setShowAllShares(false);
    };

    const verifyBrowserIdentity = async (
      observedUserId?: string | null,
    ) => {
      const verificationToken = ++authVerificationRef.current;
      const fresh = await getFreshSessionUser(supabase);
      if (
        !mountedRef.current ||
        authVerificationRef.current !== verificationToken
      ) {
        return;
      }

      const current = authIdentityRef.current;
      if (
        fresh.ok &&
        (observedUserId === undefined || observedUserId === fresh.userId)
      ) {
        const identityChanged =
          current.userId !== null && current.userId !== fresh.userId;
        if (identityChanged) clearAuthBoundShareState();
        const next: ShareAuthIdentity = {
          userId: fresh.userId,
          epoch: identityChanged ? current.epoch + 1 : current.epoch,
          status: "ready",
        };
        observedAuthUserIdRef.current = fresh.userId;
        authIdentityRef.current = next;
        setAuthIdentity(next);
        return;
      }

      const nextStatus =
        !fresh.ok && fresh.reason === "signed_out"
          ? "signed-out"
          : "unavailable";
      const hadVerifiedIdentity = current.userId !== null;
      if (hadVerifiedIdentity) clearAuthBoundShareState();
      const next: ShareAuthIdentity = {
        userId: null,
        epoch: hadVerifiedIdentity ? current.epoch + 1 : current.epoch,
        status: nextStatus,
      };
      authIdentityRef.current = next;
      setAuthIdentity(next);
    };

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mountedRef.current) return;
      const observedUserId = session?.user?.id ?? null;
      if (observedAuthUserIdRef.current === observedUserId) return;
      observedAuthUserIdRef.current = observedUserId;

      authVerificationRef.current += 1;
      const current = authIdentityRef.current;
      const next: ShareAuthIdentity = {
        userId: null,
        epoch: current.epoch + 1,
        status: observedUserId ? "checking" : "signed-out",
      };
      authIdentityRef.current = next;
      clearAuthBoundShareState();
      setAuthIdentity(next);
      if (observedUserId) void verifyBrowserIdentity(observedUserId);
    });

    void verifyBrowserIdentity();
    return () => {
      mountedRef.current = false;
      authVerificationRef.current += 1;
      authSubscription.unsubscribe();
      activeShareSubjectRef.current = null;
      firstSharesRequestRef.current = null;
      createRequestRef.current = null;
      revokeRequestRef.current = null;
      olderSharesRequestRef.current = null;
    };
  }, [authVerificationRetry, isAuthenticated, supabase]);

  const invalidateForServerAuthMismatch = useCallback(() => {
    authVerificationRef.current += 1;
    observedAuthUserIdRef.current = undefined;
    const next: ShareAuthIdentity = {
      userId: null,
      epoch: authIdentityRef.current.epoch + 1,
      status: "checking",
    };
    authIdentityRef.current = next;
    activeShareSubjectRef.current = null;
    firstSharesRequestRef.current = null;
    createRequestRef.current = null;
    revokeRequestRef.current = null;
    olderSharesRequestRef.current = null;
    if (copiedResetTimeoutRef.current !== null) {
      clearTimeout(copiedResetTimeoutRef.current);
      copiedResetTimeoutRef.current = null;
    }
    setAuthIdentity(next);
    setCopied(false);
    setShareUrl("");
    setIncludeAddress(false);
    setIsPreparing(false);
    setSessionAuthRequired(false);
    setMyShares(null);
    setSharesListState("idle");
    setNextSharesOffset(null);
    setIsLoadingOlderShares(false);
    setCreatedShare(null);
    setRevokingId(null);
    setConfirmingRevokeId(null);
    setShowAllShares(false);
    setAuthVerificationRetry((current) => current + 1);
  }, []);

  const verifyExpectedBrowserIdentity = useCallback(
    async (
      expectedUserId: string,
      expectedAuthEpoch: number,
    ): Promise<ShareIdentityVerification> => {
      const identityStillMatches = () => {
        const current = authIdentityRef.current;
        return (
          mountedRef.current &&
          current.status === "ready" &&
          current.userId === expectedUserId &&
          current.epoch === expectedAuthEpoch
        );
      };
      if (!identityStillMatches()) return "stale";

      const fresh = await getFreshSessionUser(supabase);
      if (!identityStillMatches()) return "stale";
      if (!fresh.ok) {
        if (fresh.reason === "unavailable") return "unavailable";
        invalidateForServerAuthMismatch();
        return "stale";
      }
      if (fresh.userId !== expectedUserId) {
        invalidateForServerAuthMismatch();
        return "stale";
      }
      return "current";
    },
    [invalidateForServerAuthMismatch, supabase],
  );

  // The button is intentionally reused as the analyzer moves between deals.
  // Clear every generated capability and disclosure choice during the layout
  // commit so an A response cannot become B's visible share link.
  useLayoutEffect(() => {
    activeShareSubjectRef.current = shareSubjectFingerprint;
    firstSharesRequestRef.current = null;
    createRequestRef.current = null;
    revokeRequestRef.current = null;
    olderSharesRequestRef.current = null;
    if (copiedResetTimeoutRef.current !== null) {
      clearTimeout(copiedResetTimeoutRef.current);
      copiedResetTimeoutRef.current = null;
    }
    setOpen(false);
    setCopied(false);
    setShareUrl("");
    setIncludeAddress(false);
    setAudience(context === "client-report" ? "client" : "investment-partner");
    setIsPreparing(false);
    setSessionAuthRequired(false);
    setMyShares(null);
    setSharesListState("idle");
    setNextSharesOffset(null);
    setIsLoadingOlderShares(false);
    setCreatedShare(null);
    setRevokingId(null);
    setConfirmingRevokeId(null);
    setShowAllShares(false);
    return () => {
      if (activeShareSubjectRef.current !== shareSubjectFingerprint) return;
      activeShareSubjectRef.current = null;
      firstSharesRequestRef.current = null;
      createRequestRef.current = null;
      revokeRequestRef.current = null;
      olderSharesRequestRef.current = null;
      if (copiedResetTimeoutRef.current !== null) {
        clearTimeout(copiedResetTimeoutRef.current);
        copiedResetTimeoutRef.current = null;
      }
    };
  }, [context, shareSubjectFingerprint]);

  const prepareAuthNavigation = () => {
    try {
      window.sessionStorage.setItem(
        SHARE_AUTH_INTENT_STORAGE_KEY,
        serializeShareAuthIntent({ returnPath, context }),
      );
    } catch {
      // The analysis draft still restores even when tab storage is unavailable.
    }
    try {
      onPrepareAuth?.();
    } catch {
      // Draft continuity is best-effort and must never block authentication.
    }
  };

  // Always load the first owner-wide page. Scoping this list to the current
  // deal would strand links after a deal is soft-deleted or when the user is
  // working in another analysis.
  useEffect(() => {
    const expectedUserId = authIdentity.userId;
    if (!open || needsSignIn || !authReady || !expectedUserId) {
      setMyShares(null);
      setSharesListState("idle");
      setNextSharesOffset(null);
      return;
    }
    let cancelled = false;
    const requestToken = Symbol("share-list-first");
    const subjectAtSubmit = shareSubjectFingerprint;
    const authEpochAtSubmit = authIdentity.epoch;
    firstSharesRequestRef.current = requestToken;
    const requestStillOwnsSubject = () =>
      !cancelled &&
      isCurrentMountedMutation({
        requestToken,
        currentRequestToken: firstSharesRequestRef.current,
      }) &&
      isCurrentShareAuthRequest({
        expectedUserId,
        authEpochAtSubmit,
        subjectAtSubmit,
        currentUserId: authIdentityRef.current.userId,
        currentAuthEpoch: authIdentityRef.current.epoch,
        currentSubject: activeShareSubjectRef.current,
      });
    setMyShares(null);
    setSharesListState("loading");
    setNextSharesOffset(null);
    void (async () => {
      try {
        const verification = await verifyExpectedBrowserIdentity(
          expectedUserId,
          authEpochAtSubmit,
        );
        if (!requestStillOwnsSubject()) return;
        if (verification === "unavailable") {
          setSharesListState("error");
          return;
        }
        if (verification !== "current") return;

        const r = await listPublicSharesAction({
          offset: 0,
          expectedUserId,
        });
        if (!requestStillOwnsSubject()) return;
        if (r.ok) {
          setMyShares(r.shares);
          setNextSharesOffset(r.nextOffset);
          setSharesListState("ready");
        } else if (
          r.code === "SIGN_IN_REQUIRED" ||
          r.code === "SESSION_CHANGED"
        ) {
          invalidateForServerAuthMismatch();
        } else {
          setSharesListState("error");
        }
      } catch {
        if (requestStillOwnsSubject()) setSharesListState("error");
      } finally {
        if (firstSharesRequestRef.current === requestToken) {
          firstSharesRequestRef.current = null;
        }
      }
    })();
    return () => {
      cancelled = true;
      if (firstSharesRequestRef.current === requestToken) {
        firstSharesRequestRef.current = null;
      }
    };
  }, [
    authIdentity.epoch,
    authIdentity.userId,
    authReady,
    invalidateForServerAuthMismatch,
    open,
    needsSignIn,
    shareSubjectFingerprint,
    shareUrl,
    sharesReloadToken,
    verifyExpectedBrowserIdentity,
  ]);

  const loadOlderShares = async () => {
    const identityAtSubmit = authIdentityRef.current;
    const expectedUserId = identityAtSubmit.userId;
    if (
      identityAtSubmit.status !== "ready" ||
      !expectedUserId ||
      nextSharesOffset === null ||
      isLoadingOlderShares ||
      olderSharesRequestRef.current !== null
    ) {
      return;
    }
    const requestToken = Symbol("share-list-older");
    const subjectAtSubmit = shareSubjectFingerprint;
    const authEpochAtSubmit = identityAtSubmit.epoch;
    olderSharesRequestRef.current = requestToken;
    const requestStillOwnsSubject = () =>
      isCurrentMountedMutation({
        requestToken,
        currentRequestToken: olderSharesRequestRef.current,
      }) &&
      isCurrentShareAuthRequest({
        expectedUserId,
        authEpochAtSubmit,
        subjectAtSubmit,
        currentUserId: authIdentityRef.current.userId,
        currentAuthEpoch: authIdentityRef.current.epoch,
        currentSubject: activeShareSubjectRef.current,
      });
    setIsLoadingOlderShares(true);
    try {
      const verification = await verifyExpectedBrowserIdentity(
        expectedUserId,
        authEpochAtSubmit,
      );
      if (!requestStillOwnsSubject()) return;
      if (verification === "unavailable") {
        toast({
          title: "Couldn't verify your session",
          description: "Check your connection and try again.",
          variant: "destructive",
        });
        return;
      }
      if (verification !== "current") return;

      const result = await listPublicSharesAction({
        offset: nextSharesOffset,
        expectedUserId,
      });
      if (!requestStillOwnsSubject()) return;
      if (!result.ok) {
        if (
          result.code === "SIGN_IN_REQUIRED" ||
          result.code === "SESSION_CHANGED"
        ) {
          invalidateForServerAuthMismatch();
          return;
        }
        toast({
          title: "Couldn't load older links",
          description: result.message,
          variant: "destructive",
        });
        return;
      }
      setMyShares((current) => {
        const byId = new Map((current ?? []).map((share) => [share.id, share]));
        for (const share of result.shares) byId.set(share.id, share);
        return Array.from(byId.values());
      });
      setNextSharesOffset(result.nextOffset);
    } catch {
      if (!requestStillOwnsSubject()) return;
      toast({
        title: "Couldn't load older links",
        description: "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      if (olderSharesRequestRef.current === requestToken) {
        olderSharesRequestRef.current = null;
        setIsLoadingOlderShares(false);
      }
    }
  };

  const revokeShare = async (id: string, dealId: string | null) => {
    const identityAtSubmit = authIdentityRef.current;
    const expectedUserId = identityAtSubmit.userId;
    if (
      identityAtSubmit.status !== "ready" ||
      !expectedUserId ||
      revokeRequestRef.current !== null
    ) {
      return;
    }
    const requestToken = Symbol("share-revoke");
    const subjectAtSubmit = shareSubjectFingerprint;
    const authEpochAtSubmit = identityAtSubmit.epoch;
    revokeRequestRef.current = requestToken;
    const requestStillOwnsSubject = () =>
      isCurrentMountedMutation({
        requestToken,
        currentRequestToken: revokeRequestRef.current,
      }) &&
      isCurrentShareAuthRequest({
        expectedUserId,
        authEpochAtSubmit,
        subjectAtSubmit,
        currentUserId: authIdentityRef.current.userId,
        currentAuthEpoch: authIdentityRef.current.epoch,
        currentSubject: activeShareSubjectRef.current,
      });
    setRevokingId(id);
    try {
      const verification = await verifyExpectedBrowserIdentity(
        expectedUserId,
        authEpochAtSubmit,
      );
      if (!requestStillOwnsSubject()) return;
      if (verification === "unavailable") {
        toast({
          title: "Couldn't verify your session",
          description: "Check your connection and try again.",
          variant: "destructive",
        });
        return;
      }
      if (verification !== "current") return;

      const r = await revokePublicShareAction({
        id,
        dealId,
        expectedUserId,
      });
      if (!requestStillOwnsSubject()) return;
      if (r.ok) {
        // Only the exact row returned by the mint owns the current copy box.
        // Never clear a different live URL merely because an older row sorts
        // first in the management list.
        if (createdShare?.id === id) {
          if (copiedResetTimeoutRef.current !== null) {
            clearTimeout(copiedResetTimeoutRef.current);
            copiedResetTimeoutRef.current = null;
          }
          setShareUrl("");
          setCopied(false);
          setCreatedShare(null);
        }
        setMyShares((current) =>
          current
            ? current.map((s) =>
                s.id === id ? { ...s, revokedAt: new Date().toISOString() } : s,
              )
            : current,
        );
        toast({
          title: "Link revoked",
          description: "That share link no longer opens for anyone.",
        });
      } else if (
        r.code === "SIGN_IN_REQUIRED" ||
        r.code === "SESSION_CHANGED"
      ) {
        invalidateForServerAuthMismatch();
      } else {
        toast({
          title: "Couldn't revoke",
          description: r.message,
          variant: "destructive",
        });
      }
    } catch {
      if (!requestStillOwnsSubject()) return;
      toast({
        title: "Couldn't revoke",
        description: "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      if (revokeRequestRef.current === requestToken) {
        revokeRequestRef.current = null;
        setRevokingId(null);
        setConfirmingRevokeId(null);
      }
    }
  };

  // Authentication returns to the restored analysis. Reopen the disclosure
  // dialog once so the user can finish the Share action they already chose;
  // the stored intent contains no address or financial values.
  useEffect(() => {
    if (!authReady || !values) return;
    try {
      const raw = window.sessionStorage.getItem(SHARE_AUTH_INTENT_STORAGE_KEY);
      const intent = parseShareAuthIntent(raw, { currentPath: returnPath });
      if (!intent || intent.context !== context) {
        if (raw)
          window.sessionStorage.removeItem(SHARE_AUTH_INTENT_STORAGE_KEY);
        return;
      }
      window.sessionStorage.removeItem(SHARE_AUTH_INTENT_STORAGE_KEY);
      setShareUrl("");
      setCopied(false);
      setCreatedShare(null);
      setShowAllShares(false);
      setSessionAuthRequired(false);
      setIncludeAddress(false);
      setAudience(
        context === "client-report" ? "client" : "investment-partner",
      );
      setOpen(true);
    } catch {
      // Storage is optional; the user can still open Share manually.
    }
  }, [authReady, context, returnPath, values]);

  const openShare = () => {
    if (!values) return;
    if (copiedResetTimeoutRef.current !== null) {
      clearTimeout(copiedResetTimeoutRef.current);
      copiedResetTimeoutRef.current = null;
    }
    setShareUrl("");
    setCopied(false);
    setCreatedShare(null);
    setShowAllShares(false);
    setSessionAuthRequired(false);
    // Privacy choices are per-link intent. Never carry an earlier explicit
    // disclosure into the next share dialog.
    setIncludeAddress(false);
    setAudience(context === "client-report" ? "client" : "investment-partner");
    setOpen(true);
  };

  const prepareShare = async () => {
    const identityAtSubmit = authIdentityRef.current;
    const expectedUserId = identityAtSubmit.userId;
    if (
      !values ||
      identityAtSubmit.status !== "ready" ||
      !expectedUserId ||
      createRequestRef.current !== null
    ) {
      return;
    }
    const requestToken = Symbol("share-create");
    const subjectAtSubmit = shareSubjectFingerprint;
    const authEpochAtSubmit = identityAtSubmit.epoch;
    const valuesAtSubmit = values;
    const includeAddressAtSubmit = includeAddress;
    const audienceAtSubmit = audience;
    const maoTargetAtSubmit = maoTarget;
    const maoTargetSourceAtSubmit = maoTargetSource;
    const adoptedDecisionBasisAtSubmit = adoptedDecisionBasis;
    const analyzerStrategyAtSubmit = analyzerStrategyKey;
    const priceIsEstimatedAtSubmit = priceIsEstimated;
    const savedDealIdAtSubmit = savedDealId;
    createRequestRef.current = requestToken;
    const requestStillOwnsSubject = () =>
      isCurrentMountedMutation({
        requestToken,
        currentRequestToken: createRequestRef.current,
      }) &&
      isCurrentShareAuthRequest({
        expectedUserId,
        authEpochAtSubmit,
        subjectAtSubmit,
        currentUserId: authIdentityRef.current.userId,
        currentAuthEpoch: authIdentityRef.current.epoch,
        currentSubject: activeShareSubjectRef.current,
      });
    setIsPreparing(true);
    try {
      const verification = await verifyExpectedBrowserIdentity(
        expectedUserId,
        authEpochAtSubmit,
      );
      if (!requestStillOwnsSubject()) return;
      if (verification === "unavailable") {
        toast({
          title: "Couldn't verify your session",
          description: "Check your connection and try again.",
          variant: "destructive",
        });
        return;
      }
      if (verification !== "current") return;

      // Mint a server-backed share whose URL is
      // just a random token — no address, rent, or assumptions in the path.
      // Fail closed if storage is unavailable. Falling back to /d/<base64>
      // would put the address and financial snapshot into browser, referrer,
      // proxy, and telemetry URLs.
      const opaque = await createPublicShareAction({
        values: valuesAtSubmit,
        expectedUserId,
        title: includeAddressAtSubmit
          ? valuesAtSubmit.address || undefined
          : undefined,
        dealId: savedDealIdAtSubmit ?? undefined,
        maoTarget: maoTargetAtSubmit ?? undefined,
        maoTargetSource: maoTargetSourceAtSubmit ?? undefined,
        offerCeilingDecisionBasis:
          adoptedDecisionBasisAtSubmit ?? undefined,
        audience: audienceAtSubmit,
        addressVisibility: includeAddressAtSubmit ? "full" : "hidden",
        analyzerStrategyKey: analyzerStrategyAtSubmit ?? "buy-hold",
        ...(priceIsEstimatedAtSubmit ? { priceEstimated: true } : {}),
      });
      if (!requestStillOwnsSubject()) return;
      if (!opaque.ok) {
        if (opaque.code === "SIGN_IN_REQUIRED") {
          prepareAuthNavigation();
          invalidateForServerAuthMismatch();
          return;
        }
        if (opaque.code === "SESSION_CHANGED") {
          invalidateForServerAuthMismatch();
          return;
        }
        throw new Error(opaque.code);
      }
      setShareUrl(opaque.url);
      setCreatedShare({ id: opaque.id, dealId: opaque.dealId });
      setCopied(false);
      trackEvent("share_created", {
        audience: audienceAtSubmit,
        address_included: includeAddressAtSubmit,
      });
    } catch (err) {
      if (!requestStillOwnsSubject()) return;
      // Encoding failure used to be a silent no-op - user clicked Share
      // and nothing happened. Surface a toast so they know to try again,
      // and capture to Sentry so we know when this is happening.
      Sentry.captureException(err, {
        tags: { feature: "share-link-encode" },
      });
      toast({
        title: "Couldn't generate share link",
        description: "Try again - if it persists let us know.",
        variant: "destructive",
      });
    } finally {
      if (createRequestRef.current === requestToken) {
        createRequestRef.current = null;
        setIsPreparing(false);
      }
    }
  };

  const copy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      if (copiedResetTimeoutRef.current !== null) {
        clearTimeout(copiedResetTimeoutRef.current);
      }
      const subjectAtCopy = shareSubjectFingerprint;
      copiedResetTimeoutRef.current = setTimeout(() => {
        if (activeShareSubjectRef.current === subjectAtCopy) setCopied(false);
        copiedResetTimeoutRef.current = null;
      }, 2000);
      trackEvent("share_link_copied", { has_address: includeAddress });
      if (context === "client-report") {
        trackEvent("client_report_shared", { report_type: "analysis_link" });
      }
    } catch {
      // Fallback for browsers without clipboard API: select the input.
      const el = document.getElementById(
        "share-link-url",
      ) as HTMLInputElement | null;
      el?.select();
    }
  };

  const missingRequiredValues =
    !values || !values.purchasePrice || !values.address;
  const disabled = externallyDisabled || missingRequiredValues;
  const listedShares = myShares?.filter(
    (share) => share.id !== createdShare?.id,
  );
  const visibleShares = showAllShares
    ? listedShares
    : listedShares?.slice(0, 5);

  // This Button is NOT a DialogTrigger — the dialog is controlled so the
  // disclosure and auth choices can live inside it. Radix restores focus on
  // close to the trigger it holds in context, and with no trigger registered
  // that restore lands on <body>: a keyboard or screen-reader user who closes
  // the dialog is dropped at the top of the document, losing their place in
  // the analysis. Hold the trigger ourselves and return focus explicitly.
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        onClick={openShare}
        disabled={disabled || isPreparing}
        className={cn(
          "min-h-11 gap-1.5 rounded-xl text-xs sm:text-sm",
          className,
        )}
        title={
          externallyDisabled
            ? (disabledReason ?? "This action is temporarily unavailable.")
            : missingRequiredValues
              ? "Enter an address and price first"
              : !isAuthenticated
                ? "Sign in to create a share link"
                : context === "client-report"
                  ? "Share a read-only client report"
                  : "Share a read-only view of this deal"
        }
      >
        {isPreparing ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Preparing…</span>
          </>
        ) : (
          <>
            <Share2 className="w-3.5 h-3.5" />
            <span>
              {context === "client-report" ? "Client report" : "Share"}
            </span>
          </>
        )}
      </Button>

      {/* Dialog primitive (was a hand-rolled fixed overlay): inherits the
          standard fade+zoom, Escape-to-close, focus trap, scroll lock,
          overlay-click dismiss, and a built-in close button. Controlled open
          so disclosure and authentication choices stay inside the modal. */}
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            firstSharesRequestRef.current = null;
            createRequestRef.current = null;
            revokeRequestRef.current = null;
            olderSharesRequestRef.current = null;
            setIsPreparing(false);
            setRevokingId(null);
            setIsLoadingOlderShares(false);
            setConfirmingRevokeId(null);
            setShowAllShares(false);
          }
        }}
      >
        {/* sm:-prefixed, so the primitive's `max-w-[calc(100%-2rem)]` phone
            gutter survives tailwind-merge (an unprefixed max-w-* deletes it
            and the dialog goes edge-to-edge). */}
        <DialogContent
          className="sm:max-w-lg"
          onCloseAutoFocus={(event) => {
            // Escape, overlay click and the built-in close button all land
            // here. Take over from Radix's default (which has no trigger to
            // aim at) and put focus back on the button that opened this.
            event.preventDefault();
            triggerRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {context === "client-report"
                ? "Share client report"
                : "Share this analysis"}
            </DialogTitle>
            <DialogDescription>
              {needsSignIn
                ? "Sign in or create a free account to make a new share link. Anyone who receives the link can view it without signing in."
                : !authReady
                  ? authIdentity.status === "unavailable"
                    ? "We couldn't verify which account owns this share workspace. Refresh the page and try again."
                    : "Verifying the account that will own this share link…"
                : context === "client-report"
                  ? "Create a read-only link for the assigned client. The exact address stays hidden unless you explicitly include it."
                  : "Choose what to disclose, then create an opaque, expiring link. The exact address stays hidden by default."}
            </DialogDescription>
          </DialogHeader>

          {needsSignIn ? (
            <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
              <div>
                <p className="font-semibold text-foreground">
                  Sign in to create this link
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {savedDealId
                    ? "After authentication, you’ll return to this saved deal and can create and manage its links here."
                    : "After authentication, you’ll return here to create the link. Unattached links stay labeled by property and time so you can revoke them here later."}
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button asChild className="min-h-11 rounded-xl font-semibold">
                  <Link
                    href={`/auth/sign-up?next=${encodedReturnPath}`}
                    onClick={prepareAuthNavigation}
                  >
                    <UserPlus className="mr-2 h-4 w-4" aria-hidden />
                    Create free account
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="min-h-11 rounded-xl font-semibold"
                >
                  <Link
                    href={`/auth/login?next=${encodedReturnPath}`}
                    onClick={prepareAuthNavigation}
                  >
                    <LogIn className="mr-2 h-4 w-4" aria-hidden />
                    Sign in
                  </Link>
                </Button>
              </div>
            </div>
          ) : !authReady ? (
            <div
              role={authIdentity.status === "unavailable" ? "alert" : "status"}
              className="min-h-20 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-3">
                {authIdentity.status === "checking" ? (
                  <Loader2
                    className="h-4 w-4 shrink-0 animate-spin"
                    aria-hidden
                  />
                ) : null}
                <span>
                  {authIdentity.status === "unavailable"
                    ? "Session verification is temporarily unavailable. No share data was loaded or changed."
                    : "Verifying your signed-in account…"}
                </span>
              </div>
              {authIdentity.status === "unavailable" ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 min-h-11 w-full"
                  onClick={() =>
                    setAuthVerificationRetry((current) => current + 1)
                  }
                >
                  Retry session verification
                </Button>
              ) : null}
            </div>
          ) : !shareUrl ? (
            <div className="space-y-4">
              <fieldset disabled={isPreparing}>
                <legend className="text-sm font-semibold text-foreground">
                  Intended audience
                </legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {(
                    [
                      ["investment-partner", "Partner"],
                      ["client", "Client"],
                      ["lender-review", "Lender review"],
                    ] as const
                  ).map(([value, label]) => (
                    <label
                      key={value}
                      className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-sm focus-within:ring-2 focus-within:ring-ring"
                    >
                      <input
                        type="radio"
                        name="share-audience"
                        value={value}
                        checked={audience === value}
                        onChange={() => setAudience(value)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm focus-within:ring-2 focus-within:ring-ring">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={includeAddress}
                  disabled={isPreparing}
                  onChange={(event) => setIncludeAddress(event.target.checked)}
                />
                <span>
                  <span className="font-semibold text-foreground">
                    Include the exact property address
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                    Off by default. The shared page still includes underwriting
                    outputs and the financial assumptions needed to explain
                    them.
                  </span>
                </span>
              </label>

              <Button
                type="button"
                onClick={prepareShare}
                disabled={isPreparing}
                className="min-h-11 w-full rounded-xl font-semibold"
              >
                {isPreparing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Share2 className="mr-2 h-4 w-4" aria-hidden />
                )}
                {isPreparing ? "Creating secure link…" : "Create secure link"}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  id="share-link-url"
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label="Shareable URL"
                  className="min-h-11 flex-1 truncate rounded-md border border-input bg-background px-3 py-2 font-mono text-xs text-foreground"
                />
                <Button
                  type="button"
                  onClick={copy}
                  className="h-auto min-h-11 rounded-md bg-primary px-3 font-semibold text-primary-foreground"
                >
                  {copied ? (
                    <>
                      <Check className="mr-1 h-3.5 w-3.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-3.5 w-3.5" /> Copy
                    </>
                  )}
                </Button>
              </div>
              {createdShare ? (
                <div className="rounded-lg border border-border bg-muted/20 p-2">
                  {confirmingRevokeId !== createdShare.id ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-auto min-h-11 w-full"
                      onClick={() => setConfirmingRevokeId(createdShare.id)}
                    >
                      Revoke this link
                    </Button>
                  ) : (
                    <div
                      role="group"
                      aria-label="Confirm current share-link revocation"
                      className="p-1 text-xs"
                    >
                      <p className="font-semibold text-foreground">
                        Revoke this link?
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        It will stop opening immediately for everyone who has it.
                      </p>
                      <div className="mt-2 flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-auto min-h-11"
                          disabled={revokingId === createdShare.id}
                          onClick={() => setConfirmingRevokeId(null)}
                        >
                          Keep link
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          className="h-auto min-h-11"
                          disabled={revokingId === createdShare.id}
                          onClick={() =>
                            void revokeShare(
                              createdShare.id,
                              createdShare.dealId,
                            )
                          }
                        >
                          {revokingId === createdShare.id
                            ? "Revoking…"
                            : "Yes, revoke link"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {!needsSignIn && sharesListState === "loading" ? (
            <p
              role="status"
              className="rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground"
            >
              Loading your existing share links…
            </p>
          ) : null}

          {!needsSignIn && sharesListState === "error" ? (
            <div
              role="alert"
              className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs"
            >
              <p className="font-semibold text-foreground">
                Existing links could not be loaded
              </p>
              <p className="mt-1 leading-relaxed text-muted-foreground">
                You can still create a new link, but retry before assuming no
                older links are live.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-2 h-auto min-h-11 w-full text-xs"
                onClick={() => setSharesReloadToken((current) => current + 1)}
              >
                Retry loading links
              </Button>
            </div>
          ) : null}

          {!needsSignIn &&
          sharesListState === "ready" &&
          listedShares?.length === 0 ? (
            <p className="rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
              No other share links on this account.
            </p>
          ) : null}

          {!needsSignIn && listedShares && listedShares.length > 0 ? (
            /* min-w-0: the rows below use `truncate`, but truncate only takes
               effect once an ancestor is allowed to shrink. Without this the
               panel reported a 597px min-content width, sized the dialog's
               grid column, and stretched every unrelated sibling — the title,
               the audience radios, the submit button — to match. */
            <div className="min-w-0 rounded-xl border border-border bg-muted/20 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Manage all share links
              </p>
              <ul className="mt-2 space-y-2">
                {visibleShares?.map((s) => {
                  const revoked = Boolean(s.revokedAt);
                  const createdLabel = new Date(s.createdAt).toLocaleString([], {
                    dateStyle: "medium",
                    timeStyle: "medium",
                  });
                  const audienceLabel = s.audience
                    ? SHARE_AUDIENCE_LABEL[s.audience]
                    : "Shared view";
                  const addressLabel =
                    s.addressVisibility === "full"
                      ? "address included"
                      : "address hidden";
                  const expired =
                    !revoked && s.expiresAt
                      ? new Date(s.expiresAt).getTime() < Date.now()
                      : false;
                  return (
                    <li
                      key={s.id}
                      className="rounded-lg border border-border/70 bg-background p-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="min-w-0 flex-1 truncate text-foreground">
                          {s.propertyLabel ||
                            s.title ||
                            s.label ||
                            "Shared analysis"}
                          <span className="mt-0.5 block truncate text-muted-foreground">
                            {savedDealId && s.dealId === savedDealId
                              ? "this saved deal"
                              : s.dealId
                                ? "another saved deal"
                                : "unattached"} ·{" "}
                            {audienceLabel} · {addressLabel} · {createdLabel}
                            {revoked
                              ? " · revoked"
                              : expired
                                ? " · expired"
                                : s.lastViewedAt
                                  ? " · viewed"
                                  : ""}
                          </span>
                        </span>
                        {!revoked && !expired ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-auto min-h-11 rounded-lg px-3 text-xs"
                            disabled={revokingId === s.id}
                            aria-expanded={confirmingRevokeId === s.id}
                            aria-controls={`revoke-confirmation-${s.id}`}
                            aria-label={`Revoke ${audienceLabel.toLowerCase()} link for ${s.propertyLabel || s.title || s.label || "shared analysis"} created ${createdLabel}`}
                            onClick={() => setConfirmingRevokeId(s.id)}
                          >
                            Revoke
                          </Button>
                        ) : null}
                      </div>
                      {confirmingRevokeId === s.id && !revoked && !expired ? (
                        <div
                          id={`revoke-confirmation-${s.id}`}
                          role="group"
                          aria-label="Confirm share-link revocation"
                          className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3"
                        >
                          <p className="font-semibold text-foreground">
                            Revoke this link?
                          </p>
                          <p className="mt-1 leading-relaxed text-muted-foreground">
                            It will stop opening immediately for everyone who has
                            it.
                          </p>
                          <div className="mt-3 flex flex-wrap justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="h-auto min-h-11"
                              disabled={revokingId === s.id}
                              onClick={() => setConfirmingRevokeId(null)}
                            >
                              Keep link
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              className="h-auto min-h-11"
                              disabled={revokingId === s.id}
                              onClick={() => void revokeShare(s.id, s.dealId)}
                            >
                              {revokingId === s.id ? (
                                <>
                                  <Loader2
                                    className="h-4 w-4 animate-spin"
                                    aria-hidden
                                  />
                                  Revoking…
                                </>
                              ) : (
                                "Yes, revoke link"
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              {listedShares.length > 5 ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-2 h-auto min-h-11 w-full text-xs"
                  onClick={() => setShowAllShares((current) => !current)}
                >
                  {showAllShares
                    ? "Show 5 most recent links"
                    : `Show all ${listedShares.length} links`}
                </Button>
              ) : null}
              {showAllShares && nextSharesOffset !== null ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2 h-auto min-h-11 w-full text-xs"
                  disabled={isLoadingOlderShares}
                  onClick={() => void loadOlderShares()}
                >
                  {isLoadingOlderShares ? (
                    <>
                      <Loader2
                        className="mr-2 h-4 w-4 animate-spin"
                        aria-hidden
                      />
                      Loading older links…
                    </>
                  ) : (
                    "Load older links"
                  )}
                </Button>
              ) : null}
            </div>
          ) : null}

          <p className="text-[11px] text-muted-foreground">
            {needsSignIn ? (
              <>
                Existing links still open without an account. Creating a new
                link requires sign-in. {savedDealId
                  ? "Links safely attached to this saved deal can be managed here after sign-in."
                  : "Unattached links remain labeled and revocable here after sign-in."}
              </>
            ) : (
              <>
                The link captures the analysis inputs at this moment. When it is
                opened, TrueCap recalculates the results using the current
                compatible underwriting methodology and labels that
                recomputation. Anyone who receives the link can open it. Later
                edits to your deal are not included; create a new link to share
                changed inputs.{" "}
                This dialog manages share links across your account, including
                links from unsaved edits and deals you later remove. Older
                links remain available through Load older links.{" "}
                Links also expire automatically. {" "}
                Still treat one like a document you chose to share.
              </>
            )}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
