/**
 * Shared contract for the homepage hero → calculator address handoff.
 *
 * The hero (components/marketing/hero-address-form.tsx) dispatches a
 * window CustomEvent AND stashes a sessionStorage fallback; the calculator
 * (components/investcalc/investcalc-page.tsx) listens live and dedupes on
 * `token`. This lives in its own module so neither side has to import the
 * other's component just to share these few strings/types.
 *
 * Both surfaces are on the SAME page, so the live event is the primary
 * channel once the calculator is hydrated. sessionStorage and brief live
 * replays cover slower hydration, refresh, and restricted-storage races.
 */

export const HERO_ANALYZE_EVENT = "truecap:hero-analyze";
export const HERO_ANALYZE_STATUS_EVENT = "truecap:hero-analyze-status";
export const HERO_ANALYZE_STORAGE_KEY = "truecap_pending_hero_analyze";

export type HeroAnalyzeDetail = {
  /** Idempotency token — the calculator skips a payload it already handled. */
  token: string;
  address: string;
  state?: string;
  county?: string;
  zip?: string;
  /** True for "Try a sample deal" — calculator runs the full sample flow. */
  sample?: boolean;
};

/** Calculator acknowledgement for the hero's in-page handoff. */
export type HeroAnalyzeStatusDetail = {
  token: string;
  status: "received" | "needs-input" | "ready" | "cancelled";
};

export type ListingImportMissingField = {
  /** React Hook Form path used by the calculator's focus helper. */
  path: string;
  /** Investor-facing description of the one remaining input. */
  label: string;
};

type ListingImportSnapshot = {
  propertyType?: string;
  purchasePrice?: unknown;
  bedrooms?: unknown;
  monthlyRent?: unknown;
  units?: Array<{
    monthlyRent?: unknown;
    isOwnerOccupied?: boolean;
  }>;
};

function isMissingPositiveNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return true;
  const parsed = Number(value);
  return !Number.isFinite(parsed) || parsed <= 0;
}

/**
 * Describe only the inputs that still block a useful first underwriting run
 * after a listing URL supplied the address. Bedrooms are an alternative route
 * to an area-rent estimate, not an additional requirement, so the label says
 * that explicitly instead of implying both bedrooms and rent are required.
 */
export function getListingImportMissingFields(
  snapshot: ListingImportSnapshot,
): ListingImportMissingField[] {
  const missing: ListingImportMissingField[] = [];
  if (isMissingPositiveNumber(snapshot.purchasePrice)) {
    missing.push({ path: "purchasePrice", label: "asking price" });
  }

  if (
    snapshot.propertyType === "multi-family" ||
    snapshot.propertyType === "owner-occupant"
  ) {
    const units = snapshot.units ?? [];
    units.forEach((unit, index) => {
      if (unit?.isOwnerOccupied) return;
      if (isMissingPositiveNumber(unit?.monthlyRent)) {
        missing.push({
          path: `units.${index}.monthlyRent`,
          label: `monthly rent for unit ${index + 1}`,
        });
      }
    });
    return missing;
  }

  if (isMissingPositiveNumber(snapshot.monthlyRent)) {
    missing.push(
      isMissingPositiveNumber(snapshot.bedrooms)
        ? {
            path: "bedrooms",
            label: "bedrooms to estimate area rent, or monthly rent",
          }
        : { path: "monthlyRent", label: "monthly rent" },
    );
  }

  return missing;
}

type HeroAnalyzeStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

type HeroAnalyzeDeliveryChannel = {
  storage: HeroAnalyzeStorage;
  dispatch: (detail: HeroAnalyzeDetail) => void;
  schedule: (callback: () => void, delayMs: number) => unknown;
};

/**
 * Deliver a hero handoff immediately and replay it briefly while it remains
 * pending. If browser storage is unavailable, the delayed live events become
 * the fallback instead. The calculator dedupes all deliveries by `token`.
 */
export function dispatchHeroAnalyzeWithFallback(
  detail: HeroAnalyzeDetail,
  channel: HeroAnalyzeDeliveryChannel
) {
  let serialized: string | null = null;
  let stored = false;

  try {
    serialized = JSON.stringify(detail);
    channel.storage.setItem(HERO_ANALYZE_STORAGE_KEY, serialized);
    stored = true;
  } catch {
    // Private browsing and quota restrictions can disable sessionStorage.
    // The immediate and delayed live events below still deliver the handoff.
  }

  channel.dispatch(detail);

  const replayIfPending = () => {
    if (!stored || !serialized) {
      channel.dispatch(detail);
      return;
    }

    try {
      if (channel.storage.getItem(HERO_ANALYZE_STORAGE_KEY) !== serialized) return;
    } catch {
      // Storage became unavailable after the write. A token-deduped live
      // replay is safer than silently losing the user's action.
    }

    channel.dispatch(detail);
  };

  channel.schedule(replayIfPending, 250);
  channel.schedule(replayIfPending, 1_000);
}
