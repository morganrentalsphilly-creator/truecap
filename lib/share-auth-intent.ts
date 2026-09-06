export const SHARE_AUTH_INTENT_STORAGE_KEY = "truecap:share-auth-intent:v1";

const SHARE_AUTH_INTENT_MAX_AGE_MS = 30 * 60_000;

export type ShareAuthIntentContext = "analysis" | "client-report";

type StoredShareAuthIntent = {
  v: 1;
  returnPath: string;
  context: ShareAuthIntentContext;
  createdAt: number;
};

function isSafeLocalPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

/** The public homepage is only an anonymous entry surface. Once analysis
 * authentication succeeds, resume inside the canonical signed-in analyzer so
 * the stored draft and the share intent are evaluated against the same route. */
export function resolveShareAuthReturnPath(
  pathname: string,
  context: ShareAuthIntentContext,
): string {
  const safePath = isSafeLocalPath(pathname) ? pathname : "/";
  // A signed-in visitor never renders the public analyzer: "/" and "/analyze"
  // (Phase 2, docs/site-overhaul.md) are rewritten through /home-authed to the
  // in-app analyzer, so the return path must be where sign-in actually lands
  // or the intent's route check discards it there.
  if (
    context === "analysis" &&
    (safePath === "/" || safePath === "/home-authed" || safePath === "/analyze")
  ) {
    return "/dashboard/new";
  }
  return safePath;
}

export function serializeShareAuthIntent({
  returnPath,
  context,
  now = Date.now(),
}: {
  returnPath: string;
  context: ShareAuthIntentContext;
  now?: number;
}): string {
  if (!isSafeLocalPath(returnPath)) {
    throw new Error("Share return path must be a safe local path.");
  }

  return JSON.stringify({
    v: 1,
    returnPath,
    context,
    createdAt: now,
  } satisfies StoredShareAuthIntent);
}

export function parseShareAuthIntent(
  raw: string | null,
  {
    currentPath,
    now = Date.now(),
  }: {
    currentPath: string;
    now?: number;
  }
): { context: ShareAuthIntentContext } | null {
  if (!raw || !isSafeLocalPath(currentPath)) return null;

  try {
    const candidate = JSON.parse(raw) as Partial<StoredShareAuthIntent>;
    if (
      candidate.v !== 1 ||
      !candidate.returnPath ||
      !isSafeLocalPath(candidate.returnPath) ||
      candidate.returnPath !== currentPath ||
      (candidate.context !== "analysis" && candidate.context !== "client-report") ||
      typeof candidate.createdAt !== "number" ||
      !Number.isFinite(candidate.createdAt) ||
      candidate.createdAt > now ||
      now - candidate.createdAt > SHARE_AUTH_INTENT_MAX_AGE_MS
    ) {
      return null;
    }

    return { context: candidate.context };
  } catch {
    return null;
  }
}
