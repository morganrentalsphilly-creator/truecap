/**
 * "Your screening record" — replaces the Portfolio Value / Monthly Cash Flow
 * stat pair, which headlined a portfolio number most users don't have (they
 * are shopping, not holding) and rendered a negative cash flow in the
 * success/green treatment.
 *
 * HONESTY NOTE — why only two stats. The brief specified three, the third
 * being "total gap between asking prices and computed max offers on deals
 * you passed on", and instructed: ship the first two and omit the third
 * rather than estimating. That is what this does.
 *   • "Deals saved" is labelled SAVED, not screened. Anonymous analyzer runs
 *     are counted only in a global counter row with no per-user attribution,
 *     so a per-user "screened" figure does not exist in the data.
 *   • "Clear your targets" counts deals whose solved max offer is at or above
 *     the asking price — i.e. the price works — over the rows on this screen.
 *   • The passed-on gap total would need an unbounded extra query plus a
 *     solve per archived row. Omitted rather than approximated.
 *
 * PRESENTATION ONLY.
 */

import type { DashboardDeal } from "@/lib/dashboard-deal-mapping";

export function ScreeningRecord({
  deals,
  totalSavedDeals,
}: {
  deals: DashboardDeal[];
  totalSavedDeals: number;
}) {
  // "Works at asking" = the solved max offer meets or beats what they're
  // asking. Only deals with BOTH numbers can be judged.
  const judged = deals.filter((d) => d.maxOffer != null && d.purchasePrice != null);
  const clearing = judged.filter((d) => (d.maxOffer as number) >= (d.purchasePrice as number));

  return (
    <section
      aria-labelledby="screening-record-heading"
      className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
    >
      <h2 id="screening-record-heading" className="text-base font-extrabold text-foreground">
        Your screening record
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Deals saved
          </dt>
          <dd className="mt-0.5 font-mono text-2xl font-extrabold tabular-nums text-foreground">
            {totalSavedDeals.toLocaleString("en-US")}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Work at asking
          </dt>
          <dd className="mt-0.5 font-mono text-2xl font-extrabold tabular-nums text-foreground">
            {judged.length === 0 ? "—" : `${clearing.length}/${judged.length}`}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        {judged.length === 0
          ? "Once your deals have a max offer, this shows how many work at the asking price."
          : `${clearing.length} of ${judged.length} deals shown here have a max offer at or above their asking price. Passing on the rest is the product working.`}
      </p>
    </section>
  );
}
