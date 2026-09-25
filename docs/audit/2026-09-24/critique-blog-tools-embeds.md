# Critique A — Blog, Free Tools and Embeds

## 1. Design-specificity verdict

These pages are recognisably TrueCap — Plus Jakarta headlines, ink-on-paper, one blue, mono formulas — and the widgets' first screen is the strongest thing in the group (input and verdict visible at 1,095px and on a phone). But the group is assembled, not designed: it has no site navigation, a 95–110ch desktop measure, phone tables that silently amputate their value columns, and a conversion module that renders after the legal footer. The visual system holds; the reading system and the wayfinding do not.

## 2. Nielsen heuristics (0–4)

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of status | 2 | No current-location cue on any article/tool (only "← TrueCap Blog"); rehab estimator shows "ESTIMATED REHAB COST $0" before any work item is picked. "Copied" feedback is good (`components/embed/embed-code-block.tsx:94–98`). |
| 2 | Match with real world | 2 | Internal vocabulary leaks: "released rental analyzer" (`components/marketing/tools-conversion-cta.tsx:27`), "projections appear when your access includes them" (`components/tools/mortgage-payment-widget.tsx:211`), "Property Tax (annual)" with a `%` suffix (`:144`). |
| 3 | User control | 2 | Single exit = 12px uppercase back link; desktop exit-intent capture mounts on every post (`components/marketing/related-blog-posts.tsx:79`). |
| 4 | Consistency | 1 | Three nav patterns, two input-label systems, three FAQ shells, three attribution names, ↗ vs →. |
| 5 | Error prevention | 2 | 1% widget guards empty/zero, but mortgage fields have no `min` (`:275–283`); a negative rate returns 0 P&I so "-6.75" shows a confident ~$489 payment. |
| 6 | Recognition vs recall | 2 | Phone tables hide columns with no cue; prefilled defaults are good. |
| 7 | Flexibility | 3 / n/a | Value hand-off into the analyzer (`components/analyzer-handoff-link.tsx`), one-click copy. |
| 8 | Minimalist | 2 | Article tail = 5 modules; tool tail = 4 analyzer CTAs; /embed renders nine 25-line code blocks at once. |
| 9 | Error recovery | 2 | `ToolNumberField` has `role="alert"` errors but 10 of 13 widgets never use it; search no-results state is good (`app/search/page.tsx:193–219`). |
| 10 | Help | 3 | Explainers, FAQ, glossary links, "How to embed" steps. |

## 3. Cognitive-load checklist failures (5 = high)

- Single focus — tool page: four routes to /analyze (`app/tools/1-percent-rule-calculator/page.tsx:149–158, 343–374, 382–385, 279–297`).
- Visual hierarchy — blog index: `ProductShot` (`app/blog/page.tsx:843–848`) fills the first screen before any post; /tools: a 7-line explainer card (`app/tools/page.tsx:95–112`) precedes the first calculator.
- Minimal choices — article tail: `RelatedContent` + "Keep reading" + lead-magnet capture + "Related:" footer + post-footer CTA.
- Working memory — phone tables: reader must scroll sideways to pair a label with its value.
- Progressive disclosure — /embed shows all nine snippets expanded (`app/embed/page.tsx:144–176`).

## 4. Priority issues

**P0 — Data tables lose their numbers on phones.** Every article table is `min-w-[440–560px]` inside `overflow-x-auto` with no scroll cue (`is-a-duplex-a-good-investment/page.tsx:263,349,467,555,682,761`; `what-is-a-good-dscr/page.tsx:220,466`). At 375 the duplex "Input/Value" table shows only labels; the thesis table reads "Metric | Dup" with both comparison columns invisible; the DSCR-band table drops its "What it means to a lender" column. Fix: two-column tables → drop `min-w-*`, `whitespace-nowrap text-right` on the value cell; three-plus columns → sticky first column plus a `sm:hidden` "Scroll for more →" caption and a right-edge fade. Command: `adapt`.

**P1 — Desktop reading measure is ~95ch (articles) and ~110ch (tools).** `prose prose-slate max-w-none` (`what-is-a-good-dscr/page.tsx:191`; `1-percent-rule-calculator/page.tsx:165`) removes prose's 65ch cap; the column is 720px or 848px at 16px. The first body line at 1440 runs 96 characters. `DESIGN.md` claims "≈70ch" — the doc is wrong. Command: `typeset`.

**P1 — The article CTA renders after the site footer.** `<SiteFooter />` then `<BlogStickyCta />` (`what-is-a-good-dscr/page.tsx:714–716`); the card is full-bleed under the © row. Fix: move `<BlogStickyCta />` inside `<main>` between the FAQ and `RelatedContent`, or make it truly sticky. Command: `clarify`.

**P1 — No site navigation on Read or Operate pages.** Articles, tools, /tools, /embed, /changelog carry only an uppercase back link; /blog/topics uses a breadcrumb; only /search mounts `<Header />`. Fix: mount `components/investcalc/header.tsx` on every page in this group. Command: `clarify`.

**P1 — Embed hub can hand partners a permanent wrong-origin snippet.** `app/embed/page.tsx:47,168–173` renders `EmbedCodeBlock` with whatever `getSiteUrl()` returns; the baseline capture shows `src="https://truecap-pink.vercel.app/embed/…"` (a build made with the stale `.env`). `tool-embed-invite.tsx:55–62` guards `host !== CANONICAL_HOST`; the hub does not. Production output UNVERIFIED. Command: `harden`.

**P2 — Widget vocabulary drift and number formatting.** Labels are Title Case `text-sm font-medium` in 10 widgets and uppercase `text-xs tracking-widest` in the 3 using `ToolNumberField`; inputs are raw `type="number"` while outputs read "$236,000"; hero results are sans `text-5xl font-extrabold`, not the DM Mono numeral token; "Fails" pill uses raw `bg-red-50`; rehab total is primary blue and defaults to "$0". Command: `harden`.

**P2 — CTA and related-link stacking.** Tool tail = blue block → embed invite → CTA card → Related → "Built with TrueCap" mini-footer → SiteFooter; three in-prose words link to /analyze while "cap rate" links to the glossary. Command: `quieter`.

**P2 — Index first screens don't show the inventory.** /blog leads with a product screenshot and eight topic chips; /tools leads with the explainer card and kicker "SCREEN A DEAL"; both use same-size icon+title+text cards with an ↗ glyph on internal links. Command: `layout`.

## 5. Persona red flags

- **Jordan (phone, from Google):** 7-line H1 on the duplex post; byline wraps to two 11px lines; no brand or nav; hidden table columns; first product CTA below the footer.
- **Alex (calculator only):** good first screen; inputs without separators; four CTAs after the result; copy like "when your access includes them"; rehab "$0" reads as a verdict.
- **Sam (embed):** possible wrong-origin snippet; three attribution names ("Powered by TrueCap", "Calculator by TrueCap", "Underwrite a full property in TrueCap"); "Preview ↗" opens the /tools page, not the iframe; "Send us a note" links to `/analyze?utm_source=embed-hub`; FAQ says "currently released".

## 6. Consistency drift vs DESIGN.md

- **Headings:** article H1 `text-3xl sm:text-4xl` vs documented headline `text-2xl sm:text-3xl`; the iframe repeats its H1 as an uppercase widget h2.
- **Kickers:** back-links above every H1; date and byline lines; "SCREEN A DEAL…", "BROWSE BY TOPIC", "HOW TO EMBED", "EMBED CODE (HTML)", "RELATED", "KEEP READING", widget h2s, "N GUIDES", search category, changelog pills.
- **Buttons:** primary CTA is `rounded-lg` with a blue glow (`seo-analyzer-cta.tsx:80`) in one place and `rounded-xl` white-on-blue elsewhere; ↗ vs →.
- **Inputs:** two label systems; `inputMode="numeric"` vs `"decimal"`.
- **Numbers:** raw inputs vs formatted outputs; sans hero results vs `font-mono` table cells; DSCR-band column wraps "1.0 –/1.15" at 1,095 and 375.
- **Status colours:** raw `bg-red-50`; raw `amber-500` archive box (`changelog/page.tsx:684`); blue rehab total.
- **FAQ/disclosure:** articles `rounded-xl p-4 sm:p-5` + native triangle; tools `rounded-lg p-4` + rotating "+"; embed `divide-y` rows.
- **Footer/disclaimer:** one `<Disclaimer />` via `SiteFooter` ✔, but tools add a second `<footer>`, articles a "Related:" `<footer>`, and the CTA renders after the footer.
- **Capitalisation/tone:** "1% Rule Calculator" / "Purchase Price" Title Case vs sentence-case H1s; "the team behind TrueCap" (`blog/page.tsx:837`) vs "built by a Philadelphia rental investor" (`blog-byline.tsx:30`); "released" in customer copy on ≥8 tool surfaces.

## 7. Minor observations

- Dead wrapper: `NewsletterSignup` (renders null) still mounted inside a padded div (`what-is-a-good-dscr/page.tsx:26,691–693`).
- Registry excerpts are 90–120-word abstracts; compacted on the index but shown in full in the three "Keep reading" cards.
- Lead-magnet inline + exit-intent on all posts is the group's only email capture; whether it is live is UNVERIFIED.

## 8. Three questions for the founder

1. Is a blog post a reading surface or a landing page? Today it is neither: no header, the CTA under the footer.
2. Does "no new top-level navigation" really mean 78 articles and 19 calculators ship with no navigation at all?
3. Which one attribution name — and which origin — do you want burned into a hundred partner sites before the next embed outreach?
