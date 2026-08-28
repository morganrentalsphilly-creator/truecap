import type { MaoTarget } from "@/lib/max-allowable-offer";
import type { OfferCeilingTargetSource } from "@/lib/offer-ceiling-contract";
import { MAX_PURCHASE_PRICE } from "@/lib/investcalc-schema";

export type MaoTargetField =
  | "capRate"
  | "cocReturn"
  | "monthlyCashFlow"
  | "dscr"
  | "minIrrPct"
  | "maxCashRequired"
  | "maxPurchasePrice";

export const MAO_TARGET_BOUNDS: Record<
  MaoTargetField,
  { label: string; min: number; max: number; step: number }
> = {
  capRate: { label: "Target cap rate", min: 0, max: 100, step: 0.1 },
  // A negative CoC floor does not define a monotone purchase-price ceiling:
  // with fixed expenses, the ratio can improve as price rises. Reject it at
  // every target editor/trust boundary instead of returning a false
  // "unreachable" result from the inverse solver.
  cocReturn: { label: "Target cash-on-cash", min: 0, max: 1000, step: 0.1 },
  // These outer limits match the existing buy-box action contract. The UI's
  // step validation below still keeps ordinary edits on sensible increments,
  // while older valid buy-box seeds remain shareable and saveable.
  monthlyCashFlow: { label: "Minimum monthly cash flow", min: -1000000, max: 1000000, step: 25 },
  dscr: { label: "Minimum DSCR", min: 0, max: 100, step: 0.05 },
  // IRR is economically admissible only above -100%. The solver accepts a
  // negative floor but still requires one unique contribution-aware root.
  minIrrPct: {
    label: "Minimum 10-year pre-tax IRR",
    min: -99.9,
    max: 1000,
    step: 0.1,
  },
  // Total acquisition cash can exceed purchase price when closing costs,
  // reserves, loan fees, repairs, and furnishing are included.
  maxCashRequired: {
    label: "Maximum cash required",
    min: 0,
    max: 1_000_000_000,
    step: 500,
  },
  maxPurchasePrice: {
    label: "Maximum purchase price",
    min: 0,
    max: MAX_PURCHASE_PRICE,
    step: 500,
  },
};

export type MaoTargetInputResult =
  | { ok: true; target: MaoTarget }
  | { ok: false; error: string };

export const EMPTY_MAO_TARGET_ERROR =
  "Keep at least one target. The current Offer Ceiling has not changed.";

export function hasAnyMaoTarget(target: MaoTarget): boolean {
  return Object.values(target).some((value) => value !== undefined);
}

/**
 * Keep an explicit target meaningful when financing changes. DSCR has no
 * meaning on an all-cash purchase. If it was the only selected criterion,
 * return null so the product can ask the user to adopt a relevant target;
 * silently substituting break-even cash flow would invent a rule they did
 * not choose.
 */
export function normalizeMaoTargetForFinancing(
  target: MaoTarget | null,
  options: { isCashPurchase: boolean }
): MaoTarget | null {
  if (!target) return null;
  const next = { ...target };
  if (options.isCashPurchase) delete next.dscr;
  if (!hasAnyMaoTarget(next)) return null;
  return next;
}

/** Strictly normalize an untrusted persisted/share target. Unknown keys,
 * non-numbers, out-of-range values, and the empty target fail closed. */
export function normalizeMaoTarget(input: unknown): MaoTarget | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const record = input as Record<string, unknown>;
  const allowed = new Set<MaoTargetField>([
    "capRate",
    "cocReturn",
    "monthlyCashFlow",
    "dscr",
    "minIrrPct",
    "maxCashRequired",
    "maxPurchasePrice",
  ]);
  if (Object.keys(record).some((key) => !allowed.has(key as MaoTargetField))) return null;

  const target: MaoTarget = {};
  for (const field of allowed) {
    const value = record[field];
    if (value === undefined) continue;
    const bounds = MAO_TARGET_BOUNDS[field];
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < bounds.min ||
      value > bounds.max
    ) {
      return null;
    }
    target[field] = value;
  }
  return hasAnyMaoTarget(target) ? target : null;
}

/** Stable comparison key for persisted-dirty tracking and save race guards. */
export function maoTargetFingerprint(input: unknown): string {
  const target = normalizeMaoTarget(input);
  return JSON.stringify(
    target
      ? {
          capRate: target.capRate,
          cocReturn: target.cocReturn,
          monthlyCashFlow: target.monthlyCashFlow,
          dscr: target.dscr,
          minIrrPct: target.minIrrPct,
          maxCashRequired: target.maxCashRequired,
          maxPurchasePrice: target.maxPurchasePrice,
        }
      : null
  );
}

export function isMaoTargetDirty(
  current: unknown,
  persistedFingerprint: string | null
): boolean {
  return (
    persistedFingerprint !== null &&
    maoTargetFingerprint(current) !== persistedFingerprint
  );
}

/**
 * Validate one target edit without ever returning an empty target. An empty
 * target makes every analysis appear to pass and gives the inverse solver no
 * criteria, so the final criterion must remain until another valid one exists.
 */
export function applyMaoTargetInput(
  target: MaoTarget,
  field: MaoTargetField,
  rawValue: string
): MaoTargetInputResult {
  const bounds = MAO_TARGET_BOUNDS[field];
  const trimmed = rawValue.trim();

  if (!trimmed) {
    const next = { ...target };
    delete next[field];
    if (!hasAnyMaoTarget(next)) {
      return {
        ok: false,
        error: EMPTY_MAO_TARGET_ERROR,
      };
    }
    return { ok: true, target: next };
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < bounds.min || parsed > bounds.max) {
    return {
      ok: false,
      error: `${bounds.label} must be between ${bounds.min.toLocaleString()} and ${bounds.max.toLocaleString()}.`,
    };
  }

  const stepCount = (parsed - bounds.min) / bounds.step;
  if (Math.abs(stepCount - Math.round(stepCount)) > 1e-8) {
    return {
      ok: false,
      error: `${bounds.label} must use increments of ${bounds.step}.`,
    };
  }

  return { ok: true, target: { ...target, [field]: parsed } };
}

export type MaoTargetState = {
  target: MaoTarget | null;
  analysisKey: string;
  touched: boolean;
};

export type MaoTargetStateAction =
  | { type: "edit"; target: MaoTarget }
  | { type: "seed"; target: MaoTarget | null; analysisKey: string };

/**
 * Late buy-box data may improve the initial target, but it must never replace
 * a user's explicit edit. A genuinely new analysis clears that protection and
 * receives its own seed.
 */
export function reduceMaoTargetState(
  state: MaoTargetState,
  action: MaoTargetStateAction
): MaoTargetState {
  if (action.type === "edit") {
    return { ...state, target: action.target, touched: true };
  }

  if (action.analysisKey !== state.analysisKey) {
    return { target: action.target, analysisKey: action.analysisKey, touched: false };
  }

  if (state.touched) return state;
  return { ...state, target: action.target };
}

const PENDING_MAO_TARGET_KEY = "truecap_pending_mao_target_v1";
const PENDING_MAO_TARGET_TTL_MS = 24 * 60 * 60 * 1000;

function stableSerialize(value: unknown): string | null {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") return Number.isFinite(value) ? JSON.stringify(value) : null;
  if (Array.isArray(value)) {
    const items = value.map(stableSerialize);
    return items.some((item) => item === null) ? null : `[${items.join(",")}]`;
  }
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    const entries = Object.keys(object)
      .filter((key) => object[key] !== undefined)
      .sort()
      .map((key) => {
        const serialized = stableSerialize(object[key]);
        return serialized === null ? null : `${JSON.stringify(key)}:${serialized}`;
      });
    return entries.some((entry) => entry === null) ? null : `{${entries.join(",")}}`;
  }
  return null;
}

/**
 * Deterministic, address-inclusive binding for a pending target. It is kept
 * client-side and is intentionally not an analytics identifier or a hash.
 */
export function maoTargetAnalysisFingerprint(value: unknown): string | null {
  return stableSerialize(value);
}

type PendingMaoTargetOptions = {
  analysisFingerprint: string;
  source?: OfferCeilingTargetSource | null;
  now?: number;
};

export type PendingMaoTargetBinding = {
  target: MaoTarget;
  source: OfferCeilingTargetSource | null;
};

function normalizePendingTargetSource(
  value: unknown
): OfferCeilingTargetSource | null {
  return value === "buy-box" ||
    value === "screening-defaults" ||
    value === "starter-criteria" ||
    value === "selected-targets"
    ? value
    : null;
}

/** Cross-tab continuity for guest Save → OAuth/email confirmation → auto-save. */
export function writePendingMaoTarget(
  target: MaoTarget | null,
  options?: PendingMaoTargetOptions
): void {
  if (typeof window === "undefined") return;
  try {
    if (target && options?.analysisFingerprint) {
      window.localStorage.setItem(
        PENDING_MAO_TARGET_KEY,
        JSON.stringify({
          target,
          ...(options.source ? { source: options.source } : {}),
          savedAt: options.now ?? Date.now(),
          analysisFingerprint: options.analysisFingerprint,
        })
      );
    } else window.localStorage.removeItem(PENDING_MAO_TARGET_KEY);
  } catch {
    // Storage can be unavailable in hardened/private browsing. The form's
    // existing draft continuity remains functional; only custom targets fall
    // back to the canonical basis.
  }
}

export function readPendingMaoTarget(
  analysisFingerprint: string | null,
  now = Date.now()
): MaoTarget | null {
  return readPendingMaoTargetBinding(analysisFingerprint, now)?.target ?? null;
}

/** Restore the target together with the source label that was visible when
 * the guest chose Save. Older payloads remain readable with a null source and
 * callers can apply the conservative selected-targets fallback. */
export function readPendingMaoTargetBinding(
  analysisFingerprint: string | null,
  now = Date.now()
): PendingMaoTargetBinding | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PENDING_MAO_TARGET_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      target?: unknown;
      savedAt?: unknown;
      analysisFingerprint?: unknown;
      source?: unknown;
    };
    const savedAt = typeof parsed.savedAt === "number" ? parsed.savedAt : NaN;
    const fresh =
      Number.isFinite(savedAt) &&
      now >= savedAt &&
      now - savedAt < PENDING_MAO_TARGET_TTL_MS;
    const scopeMatches =
      typeof parsed.analysisFingerprint === "string" &&
      analysisFingerprint !== null &&
      parsed.analysisFingerprint === analysisFingerprint;
    const target = fresh && scopeMatches ? normalizeMaoTarget(parsed.target) : null;
    if (!target) window.localStorage.removeItem(PENDING_MAO_TARGET_KEY);
    return target
      ? { target, source: normalizePendingTargetSource(parsed.source) }
      : null;
  } catch {
    try {
      window.localStorage.removeItem(PENDING_MAO_TARGET_KEY);
    } catch {
      // Storage is unavailable; there is nothing else to recover.
    }
    return null;
  }
}

export function clearPendingMaoTarget(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PENDING_MAO_TARGET_KEY);
  } catch {
    // Storage can be unavailable in hardened/private browsing.
  }
}
