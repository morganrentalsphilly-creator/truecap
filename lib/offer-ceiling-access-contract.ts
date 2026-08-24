import type {
  OfferCeilingPresentation,
  OfferCeilingRangePreview,
} from "@/lib/offer-ceiling-contract";

/**
 * The only Offer Ceiling shapes that may cross the server/browser boundary.
 *
 * An exact response is intentionally different from a preview response: a
 * Free caller never receives an exact price, achieved-at-ceiling metrics, or
 * inverse-solver result and therefore cannot recover the paid answer from
 * hidden props or component state.
 */
export type OfferCeilingExactResult = {
  presentation: OfferCeilingPresentation;
  achieved: {
    netCashFlow: number;
    /** Added to persisted captures so a recorded PDF can reproduce the exact
     * achieved-at-ceiling block without invoking a newer solver. Older public
     * shares may not carry it, so readers must fail closed when they require
     * the field. */
    cocReturn?: number;
    capRate: number;
    dscr: number;
  };
  makePriceWork: {
    currentMeets: boolean;
    requiredMonthlyRent: {
      value: number;
      /** Additive for recorded report fidelity; absent on older shares. */
      alreadyMet?: boolean;
      unreachable: boolean;
    } | null;
    requiredInterestRate: {
      value: number;
      /** Additive for recorded report fidelity; absent on older shares. */
      alreadyMet?: boolean;
      unreachable: boolean;
    } | null;
  };
  /** Exact one-variable boundaries, formatted on the server. */
  decisionBreakpoints: string[];
};

export type OfferCeilingAccessPayload =
  | {
      access: "exact";
      /** Null means the entitled solve was attempted but no supported price
       * clears every selected target. */
      exact: OfferCeilingExactResult | null;
    }
  | {
      access: "preview";
      /** A coarse $25k interval only. It contains no exact midpoint or
       * achieved-at-ceiling metrics. */
      range: OfferCeilingRangePreview | null;
    };
