import { describe, expect, it } from "vitest";

import { calculateAnalysis } from "@/lib/calc-analysis";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import {
  LISTING_UPDATE_CONTRACT_VERSION,
  normalizeListingUpdateObservation,
  type ListingUpdateProvider,
} from "@/lib/listing-update-provider";
import {
  buildSavedDealWatchPersistenceCommand,
  evaluateSavedDealWatch,
  type EvaluateSavedDealWatchInput,
  type SavedDealWatchPolicy,
} from "@/lib/saved-deal-watch";
import { EMPTY_BUY_BOX } from "@/lib/buy-box";

function baseDeal(overrides: Partial<InvestmentFormValues> = {}): InvestmentFormValues {
  return {
    propertyType: "single-family",
    address: "1205 N 5th St, Philadelphia, PA 19122, USA",
    purchasePrice: 245_000,
    yearBuilt: 2010,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1500,
    monthlyRent: 2_100,
    units: [],
    downPaymentPct: 20,
    interestRate: 7,
    loanTermYears: 30,
    closingCostsPct: 3,
    propertyTaxPct: 1.1,
    insuranceInputMode: "percent",
    insurancePct: 0.5,
    insuranceMonthly: undefined,
    hoaMonthly: 0,
    utilitiesMonthly: 0,
    maintenancePct: 5,
    vacancyPct: 5,
    mgmtPct: 0,
    capexPct: 5,
    buildingValuePct: 80,
    depreciationYears: 27.5,
    includeInterestDeduction: true,
    taxRatePct: 24,
    expenseGrowthPct: 2,
    rentGrowthPct: 3,
    appreciationRatePct: 3,
    sellingCostPct: 6,
    ...overrides,
  } as InvestmentFormValues;
}

const maoPolicy: SavedDealWatchPolicy = {
  maxOfferTarget: { monthlyCashFlow: 0, dscr: 1.25 },
};

function input(args: {
  price?: number | null;
  rate?: number | null;
  trigger?: EvaluateSavedDealWatchInput["observation"]["trigger"];
  policy?: SavedDealWatchPolicy;
  previous?: EvaluateSavedDealWatchInput["previousCheckpoint"];
  values?: InvestmentFormValues;
  observedAt?: string;
}): EvaluateSavedDealWatchInput {
  return {
    dealId: "deal-1",
    title: "N 5th St",
    address: "1205 N 5th St, Philadelphia, PA",
    values: args.values ?? baseDeal(),
    policy: args.policy ?? maoPolicy,
    previousCheckpoint: args.previous,
    observation: {
      observedAt: args.observedAt ?? "2026-08-15T12:00:00.000Z",
      trigger: args.trigger ?? "listing_price",
      askingPrice: args.price,
      mortgageRatePct: args.rate,
      sourceId: "test-provider",
    },
  };
}

describe("evaluateSavedDealWatch", () => {
  it("creates an initial checkpoint without manufacturing an alert", () => {
    const result = evaluateSavedDealWatch(
      input({ price: 325_000, rate: 7, trigger: "initial" })
    );

    expect(result.previous).toBeNull();
    expect(result.event).toBeNull();
    expect(result.nextCheckpoint.dealId).toBe("deal-1");
    expect(result.current.analysisAvailable).toBe(true);
    expect(result.current.askingPrice).toBe(325_000);
    expect(result.current.decisionThresholds).toHaveLength(6);
    expect(
      result.current.decisionThresholds.every(
        (threshold) =>
          threshold.rechecked ||
          threshold.status === "unreachable" ||
          threshold.status === "not_applicable"
      )
    ).toBe(true);

    const command = buildSavedDealWatchPersistenceCommand("watch-1", result);
    expect(command.watchId).toBe("watch-1");
    expect(command.eventKind).toBeNull();
    expect(command.dedupeKey).toBeNull();
    expect(command.eventPayload).toBeNull();
  });

  it("emits a high-priority event when asking moves within canonical Max Offer", () => {
    const initial = evaluateSavedDealWatch(
      input({ price: 400_000, rate: 7, trigger: "initial" })
    );
    expect(initial.current.withinMaxOffer).toBe(false);
    expect(initial.current.maxOffer).not.toBeNull();

    const current = evaluateSavedDealWatch(
      input({
        price: initial.current.maxOffer!,
        rate: 7,
        previous: initial.nextCheckpoint,
      })
    );

    expect(current.event?.kind).toBe("newly_within_max_offer");
    expect(current.event?.priority).toBe("high");
    expect(current.current.withinMaxOffer).toBe(true);
    if (current.event?.kind === "newly_within_max_offer") {
      expect(current.event.previousGap).toBeGreaterThan(0);
      expect(current.event.currentGap).toBeLessThanOrEqual(0);
    }
    const command = buildSavedDealWatchPersistenceCommand("watch-1", current);
    expect(command.eventKind).toBe("newly_within_max_offer");
    expect(command.dedupeKey).toBe(current.event?.dedupeKey);
    expect(command.eventPayload).toBe(current.event);
  });

  it("emits a Buy Box crossing for a material listing-price improvement", () => {
    const policy: SavedDealWatchPolicy = {
      buyBoxCriteria: { ...EMPTY_BUY_BOX, maxPurchasePrice: 250_000 },
    };
    const initial = evaluateSavedDealWatch(
      input({ price: 260_000, rate: 7, trigger: "initial", policy })
    );
    expect(initial.current.buyBoxPass).toBe(false);

    const current = evaluateSavedDealWatch(
      input({ price: 245_000, rate: 7, policy, previous: initial.nextCheckpoint })
    );

    expect(current.event?.kind).toBe("newly_within_buy_box");
    if (current.event?.kind === "newly_within_buy_box") {
      expect(current.event.previousFailedLabels).toContain("Purchase price");
    }
  });

  it("attributes a Buy Box pass to financing only when rate alone clears it", () => {
    const values = baseDeal({ purchasePrice: 245_000 });
    const highRateCashFlow = calculateAnalysis({ ...values, interestRate: 8.5 }).netCashFlow;
    const lowRateCashFlow = calculateAnalysis({ ...values, interestRate: 5.5 }).netCashFlow;
    const threshold = (highRateCashFlow + lowRateCashFlow) / 2;
    const policy: SavedDealWatchPolicy = {
      buyBoxCriteria: { ...EMPTY_BUY_BOX, minCashFlowMonthly: threshold },
    };

    const initial = evaluateSavedDealWatch(
      input({ price: 245_000, rate: 8.5, trigger: "initial", policy, values })
    );
    expect(initial.current.buyBoxPass).toBe(false);

    const current = evaluateSavedDealWatch(
      input({
        // A rate-only observation intentionally omits price. The last known
        // price must carry forward rather than dropping to zero/saved noise.
        price: null,
        rate: 5.5,
        trigger: "mortgage_rate",
        policy,
        values,
        previous: initial.nextCheckpoint,
      })
    );

    expect(current.current.askingPrice).toBe(245_000);
    expect(current.event?.kind).toBe("rate_driven_buy_box_pass");
    if (current.event?.kind === "rate_driven_buy_box_pass") {
      expect(current.event.previousRatePct).toBe(8.5);
      expect(current.event.currentRatePct).toBe(5.5);
      expect(current.event.clearedChecks).toContain("Monthly cash flow");
    }
  });

  it("reports a material price-to-Max-Offer gap change without alerting on small noise", () => {
    const initial = evaluateSavedDealWatch(
      input({ price: 400_000, rate: 7, trigger: "initial" })
    );
    expect(initial.current.withinMaxOffer).toBe(false);

    const smallMove = evaluateSavedDealWatch(
      input({ price: 398_000, rate: 7, previous: initial.nextCheckpoint })
    );
    expect(smallMove.event).toBeNull();

    const materialMove = evaluateSavedDealWatch(
      input({ price: 390_000, rate: 7, previous: initial.nextCheckpoint })
    );
    expect(materialMove.event?.kind).toBe("material_price_gap_change");
    if (materialMove.event?.kind === "material_price_gap_change") {
      expect(materialMove.event.direction).toBe("improved");
      expect(materialMove.event.gapChangeDollars).toBeGreaterThanOrEqual(10_000);
    }
  });

  it("coalesces simultaneous crossings into one event using documented priority", () => {
    const policy: SavedDealWatchPolicy = {
      ...maoPolicy,
      buyBoxCriteria: { ...EMPTY_BUY_BOX, maxPurchasePrice: 250_000 },
    };
    const initial = evaluateSavedDealWatch(
      input({ price: 400_000, rate: 7, trigger: "initial", policy })
    );
    const crossingPrice = Math.min(initial.current.maxOffer ?? 0, 250_000);

    const current = evaluateSavedDealWatch(
      input({ price: crossingPrice, rate: 7, policy, previous: initial.nextCheckpoint })
    );
    expect(current.current.withinMaxOffer).toBe(true);
    expect(current.current.buyBoxPass).toBe(true);
    expect(current.event?.kind).toBe("newly_within_max_offer");
  });

  it("builds a stable dedupe key that ignores repeated poll timestamps", () => {
    const initial = evaluateSavedDealWatch(
      input({ price: 400_000, rate: 7, trigger: "initial" })
    );
    const price = initial.current.maxOffer!;
    const first = evaluateSavedDealWatch(
      input({ price, rate: 7, previous: initial.nextCheckpoint, observedAt: "2026-08-16T12:00:00Z" })
    );
    const retry = evaluateSavedDealWatch(
      input({ price, rate: 7, previous: initial.nextCheckpoint, observedAt: "2026-08-17T12:00:00Z" })
    );

    expect(first.event?.dedupeKey).toBe(retry.event?.dedupeKey);
  });

  it("ignores a checkpoint from another deal instead of creating a false transition", () => {
    const prior = evaluateSavedDealWatch(
      input({ price: 400_000, rate: 7, trigger: "initial" })
    ).nextCheckpoint;
    const result = evaluateSavedDealWatch({
      ...input({ price: 200_000, rate: 7, previous: { ...prior, dealId: "other-deal" } }),
    });
    expect(result.previous).toBeNull();
    expect(result.event).toBeNull();
  });
});

describe("listing update provider boundary", () => {
  it("normalizes a valid authorized-provider observation", () => {
    expect(
      normalizeListingUpdateObservation({
        dealId: "deal-1",
        providerId: "licensed-feed",
        providerListingId: "listing-99",
        observedAt: "2026-08-15T12:30:00-04:00",
        askingPrice: 299_000,
        availability: "active",
        sourceUrl: "https://provider.example/listing-99",
      })
    ).toEqual({
      contractVersion: LISTING_UPDATE_CONTRACT_VERSION,
      dealId: "deal-1",
      providerId: "licensed-feed",
      providerListingId: "listing-99",
      observedAt: "2026-08-15T16:30:00.000Z",
      askingPrice: 299_000,
      availability: "active",
      sourceUrl: "https://provider.example/listing-99",
    });
  });

  it("turns impossible provider prices into unavailable values, never zero", () => {
    const normalized = normalizeListingUpdateObservation({
      dealId: "deal-1",
      providerId: "licensed-feed",
      observedAt: "2026-08-15T12:30:00Z",
      askingPrice: 0,
      availability: "made-up-status",
    });
    expect(normalized?.askingPrice).toBeNull();
    expect(normalized?.availability).toBe("unknown");
  });

  it("rejects observations without stable identity or a valid timestamp", () => {
    expect(normalizeListingUpdateObservation({ providerId: "x", observedAt: "nope" })).toBeNull();
    expect(normalizeListingUpdateObservation(null)).toBeNull();
  });

  it("keeps provider adapters side-effect-specific through the typed contract", async () => {
    const provider: ListingUpdateProvider = {
      id: "fake-authorized-provider",
      async fetchUpdates(request) {
        return {
          observations: request.listings.map((listing) => ({
            contractVersion: LISTING_UPDATE_CONTRACT_VERSION,
            dealId: listing.dealId,
            providerId: this.id,
            providerListingId: listing.providerListingId ?? null,
            observedAt: "2026-08-15T12:00:00.000Z",
            askingPrice: null,
            availability: "unknown",
            sourceUrl: listing.listingUrl ?? null,
          })),
          nextCursor: null,
          fetchedAt: "2026-08-15T12:00:00.000Z",
        };
      },
    };
    const batch = await provider.fetchUpdates({ listings: [{ dealId: "deal-1" }] });
    expect(batch.observations[0]?.dealId).toBe("deal-1");
  });
});
