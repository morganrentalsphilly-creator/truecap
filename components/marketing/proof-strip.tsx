import Link from "next/link";
import { BookOpenCheck, Database, UserRound } from "lucide-react";

/**
 * Proof strip — three facts a visitor can verify by clicking, so it ALWAYS
 * renders (no quotes required). docs/site-overhaul.md Phase 5.5.
 */
const FACTS = [
  {
    icon: BookOpenCheck,
    label: "Methodology is public and versioned",
    href: "/methodology",
  },
  {
    icon: Database,
    label: "Assumptions labeled with sources: HUD, FRED, yours",
    href: "/methodology",
  },
  {
    icon: UserRound,
    label: "Built and used by a Philadelphia rental investor",
    href: "/about",
  },
] as const;

export function ProofStrip({ className = "" }: { className?: string }) {
  return (
    <ul
      aria-label="Verifiable facts"
      data-proof-strip=""
      className={`grid gap-3 text-sm sm:grid-cols-3 ${className}`.trim()}
    >
      {FACTS.map((fact) => (
        <li key={fact.label} className="flex items-start gap-2.5">
          <fact.icon aria-hidden className="mt-0.5 size-4 shrink-0 text-primary/60" />
          <Link
            href={fact.href}
            className="inline-flex min-h-11 items-center text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {fact.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
