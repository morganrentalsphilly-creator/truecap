import { applyClientFinancing, describeClientFinancing, type ClientFinancing } from "@/lib/client-underwriting-preferences";
import { calculateAnalysis } from "@/lib/calc-analysis";
import { calculateMaoIrr } from "@/lib/mao-target-evaluation";
import { chooseMaoTargetFromBuyBox, describeMaoTarget, solveBuyBoxClearingPrice } from "@/lib/mao-targets";
import { buyBoxHasCriteria, deriveStateFromAddress, evaluateBuyBox, unresolvedBuyBoxChecks, type BuyBoxCheck, type NamedBuyBox } from "@/lib/buy-box";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";

export type ClientDealScreen = {
  clientId: string;
  clientName: string;
  buyBoxId: string | null;
  buyBoxName: string | null;
  status: "meets" | "misses" | "needs-verification" | "no-criteria";
  checks: BuyBoxCheck[];
  offerCeiling: number | null;
  ceilingExplanation: string;
  financingDescription: string;
};

/** Recompute explicitly from saved assumptions; never change the stored report. */
export function screenDealForClients(
  savedValues: InvestmentFormValues,
  clients: readonly { id: string; name: string; isArchived: boolean; financingAssumptions?: ClientFinancing | null }[],
  boxes: readonly NamedBuyBox[],
): ClientDealScreen[] {
  return clients.filter((client) => !client.isArchived).flatMap((client): ClientDealScreen[] => {
    if (client.financingAssumptions === null) return [{
      clientId: client.id, clientName: client.name, buyBoxId: null, buyBoxName: null,
      status: "needs-verification", checks: [], offerCeiling: null,
      ceilingExplanation: "Review this client's financing assumptions before screening.",
      financingDescription: "Financing needs review",
    }];
    const financing = client.financingAssumptions ?? { kind: "deal" as const };
    const values = applyClientFinancing(savedValues, financing);
    const financingDescription = describeClientFinancing(financing);
  const analysis = calculateAnalysis(values);
  const irr = boxes.some((box) => box.isActive && box.minIrrPct != null)
    ? calculateMaoIrr(values, analysis) : null;
  const isCashPurchase = analysis.monthlyPayment <= 0;
  const metrics = {
    capRatePct: analysis.capRate, cocPct: analysis.cocReturn,
    dscr: analysis.dscr, cashFlowMonthly: analysis.netCashFlow,
    purchasePrice: values.purchasePrice, propertyType: values.propertyType,
    state: deriveStateFromAddress(values.address), isCashPurchase,
    cashRequired: analysis.totalCashRequired,
    irrPct: irr?.primaryIrrPct ?? null, irrStatus: irr?.status ?? "none" as const,
  };
    const scoped = boxes.filter((box) => box.clientId === client.id && box.isActive && buyBoxHasCriteria(box));
    if (!scoped.length) return [{
      clientId: client.id, clientName: client.name, buyBoxId: null, buyBoxName: null,
      status: "no-criteria" as const, checks: [], offerCeiling: null,
      ceilingExplanation: "Set this client's Buy Box to screen the property.", financingDescription,
    }];
    // Keep every active box visible. Choosing only the best would conceal
    // conflicting strategies and which actual targets generated the ceiling.
    return scoped.map((box): ClientDealScreen => {
      const fit = evaluateBuyBox(box, metrics);
      const unknown = unresolvedBuyBoxChecks(fit.checks);
      const scopeMiss = fit.checks.some((check) =>
        check.pass === false && (check.id === "state" || check.id === "propertyType"));
      const target = chooseMaoTargetFromBuyBox(box, { isCashPurchase });
      const ceiling = !scopeMiss && !unknown.length && target
        ? solveBuyBoxClearingPrice(values, box, { isCashPurchase }) : null;
      return {
        clientId: client.id, clientName: client.name, buyBoxId: box.id, buyBoxName: box.name,
        status: fit.passes ? "meets" : fit.failedCount ? "misses" : "needs-verification",
        checks: fit.checks, offerCeiling: ceiling, financingDescription,
        ceilingExplanation: scopeMiss
          ? "A lower price cannot change the property's type or market."
          : unknown.length
            ? `Verify ${unknown.map((check) => check.label.toLowerCase()).join(", ")} before calculating a ceiling.`
            : !target ? "No applicable price or return target is selected."
              : ceiling == null ? "No supported price meets all selected financial targets."
                : describeMaoTarget(target),
      };
    });
  });
}
