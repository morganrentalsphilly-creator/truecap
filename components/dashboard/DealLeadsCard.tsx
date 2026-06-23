import { createServerSupabaseClient } from "@/lib/supabase/server";

type LeadRow = {
  id: string;
  lead_email: string;
  lead_name: string | null;
  message: string | null;
  deal_address: string | null;
  created_at: string;
};

/**
 * Leads captured from the agent's co-branded shared deal pages (T6).
 *
 * Server component — fetches the signed-in user's OWN leads (owner-only RLS on
 * deal_leads, so this returns nothing for anyone else's rows). Renders NOTHING
 * until at least one lead exists, per the "invisible until useful" principle —
 * which also makes it degrade silently while the deal_leads migration is
 * pending (the query errors → null → no card).
 */
export async function DealLeadsCard({ limit = 8 }: { limit?: number }) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("deal_leads")
    .select("id, lead_email, lead_name, message, deal_address, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data || data.length === 0) return null;
  const leads = data as LeadRow[];

  return (
    <section className="mx-auto mt-2 max-w-7xl px-4 pb-8 sm:px-6">
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Leads from your shared deals
          </h2>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
            {leads.length}
          </span>
        </div>
        <ul className="divide-y divide-border">
          {leads.map((lead) => (
            <li
              key={lead.id}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
            >
              <div className="min-w-0">
                <a
                  href={`mailto:${lead.lead_email}`}
                  className="font-semibold text-foreground hover:underline"
                >
                  {lead.lead_name || lead.lead_email}
                </a>
                {lead.lead_name ? (
                  <span className="ml-2 text-xs text-muted-foreground">{lead.lead_email}</span>
                ) : null}
                {lead.deal_address ? (
                  <div className="text-xs text-muted-foreground">re: {lead.deal_address}</div>
                ) : null}
                {lead.message ? (
                  <p className="mt-1 max-w-xl text-sm text-muted-foreground">&ldquo;{lead.message}&rdquo;</p>
                ) : null}
              </div>
              <time className="shrink-0 text-xs text-muted-foreground" dateTime={lead.created_at}>
                {new Date(lead.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </time>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
