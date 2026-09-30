---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["app/home-authed/page.tsx"]
---

# Surface brief: the homepage (`/`)

Mode: Persuade. The visitor is a real estate agent with investor clients
(primary) or an investor buying for their own portfolio (secondary), usually
arriving on a phone from a paid ad. Success: they paste a listing into the
address field ("Analyze a deal free"), or open the sample deal.

Mirrors: `app/home-authed/page.tsx` renders the same sections in the same order
(`homepage-lockstep.test.ts`).

Proof on hand: the synthetic sample deal computed by the real engine
(`calculateSampleDealOutcome()`), the real decision memo screenshot, the
published methodology. No testimonials, counts or logos exist; the proof blocks
stay mounted and render nothing.

Constraints: the copy pass's strings (H1, subhead, CTA "Analyze a deal free",
investor cue in the first screen at desktop and 390px, "For investors" in the
header, title tag unchanged); one Disclaimer; founder unnamed; prices from the
catalog; no email capture; light only; WCAG 2.1 AA, 44px targets, 3px focus,
reduced motion.

Chosen direction (checkpoint 2, founder, 2026-09-30): the expandable ledger.
Memorable moment: the Offer Ceiling's double rule drawing in under $236,000.

Unresolved: none for the homepage build. The memo screenshot shows today's app
styling until `public/product/*` is regenerated at the end of the rollout.

## Direction contract

THESIS: The homepage is the sample deal's ledger. The hero shows it closed; the
walkthrough is the same ledger with every row opened to its source and
arithmetic. It refuses the category's screenshot-in-a-browser-frame hero and the
1·2·3 feature-steps waterfall.

OWN-WORLD: Newsprint paper, graphite ink, one Signal Blue for actions, green and
orange only for pass and miss. Archivo semi-condensed headlines, Archivo text,
DM Mono tabular figures right-aligned in fixed columns. Rules instead of boxes:
a heavy rule opens the ledger, soft rules between rows, a double rule under the
one total. White only in the fields you type into. Plan cards are the only cards.

STORY: The visitor sees a real verdict before any claim: $265,000 asking against
a $236,000 Offer Ceiling, and the target that binds. They open the rows and see
where every dollar comes from. They learn what their client receives, what each
plan costs, who built it, the eight questions agents ask, and paste a listing.

FIRST VIEWPORT: Header rule at the top. Desktop: a 5/7 grid; left, the H1 in
Archivo semi-condensed at 55px, the subhead at 46ch, the address field and
"Analyze a deal free" in one row, "See the sample deal", the risk line, the
investor cue on a soft rule; right and wider, the ledger: caption on a heavy
rule, Price, the banded binding row (cash flow after reserves), DSCR, "Meets the
Buy Box" No/Yes, then Offer Ceiling in DM Mono at 54px over a double rule, and a
link that opens every row. Phone: the same column order, the cue above the fold,
the ledger's caption at it.

FORM: The expandable ledger, position 5 on the ordered list in
docs/design-pass/checkpoint-2/structures.md; surface seed d7607ac2.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
