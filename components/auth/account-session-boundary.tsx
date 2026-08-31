"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { accountSessionIdentityChanged } from "@/lib/account-session-binding";
import { accountSessionVerificationRequiresReload } from "@/lib/account-session-binding";
import { getFreshSessionUser } from "@/lib/supabase/ensure-fresh-session";

const ExpectedAccountUserContext = createContext<string | null>(null);

/** Exact server-verified account that produced the currently rendered tree. */
export function useExpectedAccountUserId(): string | null {
  return useContext(ExpectedAccountUserContext);
}

/**
 * A dashboard tree must never silently morph from account A to account B
 * while retaining A's server-rendered deals, clients, or preferences. Supabase
 * broadcasts cross-tab auth changes; an identity change forces a document
 * navigation so every server component and entitlement is rebuilt for the new
 * account. INITIAL_SESSION/TOKEN_REFRESHED for the same id are deliberate
 * no-ops, so ordinary refreshes cannot form a reload loop.
 */
export function AccountSessionBoundary({
  expectedUserId,
  children,
}: {
  expectedUserId: string;
  children: ReactNode;
}) {
  const navigationStartedRef = useRef(false);
  const verificationRevisionRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    void (async () => {
      const { createBrowserSupabaseClient } =
        await import("@/lib/supabase/client");
      if (cancelled) return;
      const supabase = createBrowserSupabaseClient();
      const verifyRenderedAccount = async () => {
        const revision = ++verificationRevisionRef.current;
        const fresh = await getFreshSessionUser(supabase);
        if (
          cancelled ||
          revision !== verificationRevisionRef.current ||
          navigationStartedRef.current ||
          !accountSessionVerificationRequiresReload(expectedUserId, fresh)
        ) {
          return;
        }
        navigationStartedRef.current = true;
        window.location.reload();
      };
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        const observedUserId = session?.user?.id ?? null;
        if (!accountSessionIdentityChanged(expectedUserId, observedUserId)) {
          return;
        }
        // Do not call another Supabase auth method inside its callback. Queue
        // fresh verification after the callback returns; a later auth event
        // supersedes this revision before it can navigate.
        queueMicrotask(() => void verifyRenderedAccount());
      });
      unsubscribe = () => subscription.unsubscribe();
      void verifyRenderedAccount();
    })();

    return () => {
      cancelled = true;
      verificationRevisionRef.current += 1;
      unsubscribe?.();
    };
  }, [expectedUserId]);

  return (
    <ExpectedAccountUserContext.Provider value={expectedUserId}>
      {children}
    </ExpectedAccountUserContext.Provider>
  );
}
