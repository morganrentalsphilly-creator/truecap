# TrueCap marketing pages — Impeccable critique, Assessment A

Evidence: baseline JPEGs under `artifacts/audit/baseline{,-extra}/anon/`, source on `audit/full-site`. Nothing was edited.

## 1. Design-specificity verdict

The system is authored, not templated: one electric blue, ink on cool paper, DM Mono for the Offer Ceiling, real engine output as the hero asset, and copy that says "walk-away price" instead of "insights". The home first screen at 1095 and 375 is the best thing in the group — headline, one input, one button, "Free. No account." — and it reads as TrueCap and nothing else. Below the hero the specificity leaks: every section opens with an uppercase kicker, every second headline has a blue-span flourish, and the persona/comparison pages fall back to the icon-card grid that any SaaS ships. The result is a product with a recognisable first screen and a category-interchangeable second screen. The biggest trust risk is not visual but structural: the site tells three different feature stories (home table, pricing cards, pricing table) and sends agents to a page that never mentions them.

## 2. Nielsen heuristics (Persuade; #7 n/a → max 36)

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of status | 2 | No `aria-current`/active state in `MarketingNav` (`marketing-nav.tsx:49-60`); hero submit feedback is good (`hero-address-form.tsx:219-233`) |
| 2 | Match real world | 3 | Plain voice, but "Unlimited preliminary core screens", "Lender · partner report modes" (`pricing/page.tsx:123,137`), "propertyType" (`for-house-hackers/page.tsx:55`), "evaluation" (`pricing-plan-buttons.tsx:101`) |
| 3 | User control | 2 | Seven pages have no site header — only a 12px "← TRUECAP" (`about:78-84`, `methodology:92-98`, `for-buy-and-hold:86-91`, `for-house-hackers:79-84`, `glossary:374-379`, `vs/dealcheck:130-135`) |
| 4 | Consistency | 1 | 12 labels for one CTA, 3 button radii, 2 wordmarks, 2 feature tables that disagree (§6) |
| 5 | Error prevention | 3 | Never-disabled submit, listing-link validation (`hero-address-form.tsx:100-112`) |
| 6 | Recognition | 2 | Footer "Agents" → `/pricing#plans` with no agent content (`site-footer.tsx:88`); feature names change between home and pricing |
| 7 | Flexibility | n/a | — |
| 8 | Minimalist | 2 | Four badges on one Pro card (`pricing-toggle-plans.tsx:333-358,416-418`); 45-chip cloud (`glossary/page.tsx:391-404`); 33 identical state cards (`states/page.tsx:80-101`) |
| 9 | Error recovery | 3 | Hero error names problem + recovery + sample fallback (`hero-address-form.tsx:40-41,197-215`) |
| 10 | Help | 3 | Methodology/glossary/FAQ exist; no inline definition of DSCR on persuade pages (`marketing-hero.tsx:73-74`) |

**Total 21/36 = 58% — Acceptable.**

## 3. Cognitive-load checklist — 4 fail (high)

- **Chunking** — FAIL: 18-row ungrouped pricing table (`pricing/page.tsx:120-141`), 45 ungrouped glossary chips, 162 market links.
- **Minimal choices** — FAIL: pricing hero offers Analyze / See Pro plans / legend / two cards / four badges before any decision.
- **Working memory** — FAIL: the same feature is "Downside sensitivity checks" (`landing-sections.tsx:931`), "Offer Ceiling · downside sensitivity" (`pricing:128`) and "Downside Stress Test" (`pricing-value-stack.tsx:18`); the reader reconciles.
- **Single focus** — FAIL on pricing only; home hero passes.
- Grouping, hierarchy, one-thing-at-a-time, progressive disclosure: pass.

## 4. Priority issues

**P1 — Agents have no landing page (local build).** `/for-agents` `permanentRedirect("/pricing")` whenever Agent Pro isn't configured (`app/for-agents/page.tsx:92`); the baseline `for_agents.jpg` is byte-identical to `pricing.jpg`. The footer still advertises "Agents" (`site-footer.tsx:88`) and the pricing page hides every agent surface when unconfigured. The already-written waitlist branch (`for-agents:156-163,457-461`) is dead code behind the redirect. Fix: delete line 92 so the waitlist state renders, or remove the footer link until `isAgentProConfigured()`. Command: `clarify`.

**P1 — Three feature stories.** The home ladder is derived from the entitlements catalog (`landing-sections.tsx:912-935`); the pricing table is hand-typed (`pricing/page.tsx:120-141`) and adds "Sale + rent comps 1 free / 50 / mo", "Deal pipeline + tags (CRM)", "Due-diligence checklist + document vault", "Priority support" — none appear on home or in PRODUCT.md's Pro list (UNVERIFIED whether shipped). Cells disagree: home "Decision memo/report: One exact deal / Unlimited" vs pricing "First decision / ✓". Fix: build `FEATURE_COMPARISON` from `ladderCellsForFeature` exactly as home does; one label per feature. Command: `clarify`.

**P1 — Ad landing pages ship without the site header.** `/for-buy-and-hold`, `/for-house-hackers`, `/vs/dealcheck`, `/methodology`, `/about`, `/glossary` render only "← TRUECAP" while `/reviews`, `/playbook`, `/glossary/[slug]` mount `<Header>` (`reviews/page.tsx:84`). Fix: add `<Header initialUser={null} initialEntitlements={null} />` above `<main>` in each. Command: `harden`.

**P1 — The proof asset is illegible in the founder's first screen.** The hero renders the desktop verdict screenshot at 480px (`marketing-hero.tsx:188-194`), i.e. ~44% scale at 1095 and ~31% at 375; only "$236,000" survives. Same shot repeated at full width on `/vs`, `/for-buy-and-hold`, `/vs/dealcheck`. Fix: use `viewport="mobile"` below `lg` (mobile shots exist), or crop to the Offer Ceiling tile + two metric tiles. Command: `bolder`.

**P2 — Pricing card layout.** (a) Free card stretches to Pro's height, ~600px blank at ≥lg (grid at `pricing-toggle-plans.tsx:285` has default `items-stretch`); (b) legend reads "Pro / Free" (`:270-277`) while cards render Free-left/Pro-right at lg; (c) "SAVE $60/YR", "★ BEST VALUE", "RECOMMENDED", "21 DAYS · 3 PRO DEALS…" — four pills, one card; (d) on phones the 18-row table becomes 18 cards (`pricing/page.tsx:510-540`) → 9,406px page. Fix: `lg:items-start`; swap legend order; keep one badge; reuse the home `table-fixed` 3-col pattern below `sm`. Command: `layout`.

**P2 — One action, twelve names, three shapes.** "Analyze" (`header.tsx:518`), "Analyze a deal free" (`hero-address-form.tsx:227`), "Analyze a property free" (`landing-sections.tsx:159,416`; `pricing:291`), "Run a free analysis" (`for-buy-and-hold:122`), "Run a free house-hack analysis" (`for-house-hackers:113`), "Try the TrueCap free analyzer" (`vs/dealcheck:160`), "Try TrueCap free" (`vs`), "Run a deal free →" (`markets/page.tsx:124`), "Open the analyzer" (`methodology:661`), "Try the free analyzer" (`for-buy-and-hold:303`), "Run a deal now" (`vs/dealcheck`), "Open TrueCap" (`glossary:494`). Shapes: `rounded-full h-9` (`header.tsx:498`), `rounded-xl h-12/h-14` (`hero-address-form.tsx:220`), `rounded-lg h-10` (`playbook:225`) vs DESIGN.md `rounded-md h-11/h-9`. Fix: one label ("Analyze a deal free") and the `Button` primary variant everywhere. Command: `polish`.

**P2 — The system breaks its own three named rules.** Kickers on 20+ sections (`marketing-hero.tsx:52-55`, `landing-sections.tsx:119-121,186-188,362-364,441-443,836-838,944-946`, `pricing:256-260,403-405,441-443`, `reviews:89-91`, `playbook:148-150,183-185`, `states:67-69,89-91`, `vs/dealcheck:140-143`, `safe-market-page.tsx:471-474`). Blue-span emphasis (One Signal Rule) in 11 headlines (`landing-sections.tsx:125,192,405,841,950`, `pricing:271`, `for-buy-and-hold:102`, `for-house-hackers:94`, `for-agents:128`, `vs/dealcheck:146-148`, `vs/page.tsx:408`). Green/orange as emphasis (Sign Rule): `landing-sections.tsx:149`, `for-buy-and-hold:201-206`, `for-house-hackers:190-195`, `for-agents:302-307`, `vs/dealcheck:323`, `glossary:444`, `playbook:197`, `pricing-toggle-plans.tsx:347`. Command: `quieter`.

## 5. Persona red flags

- **Jordan (phone, from an ad):** lands on `/for-house-hackers` with no header and a workflow whose step 1 is "Open Templates (Pro)…" (`for-house-hackers:171`); "DSCR" in the hero metric line is never defined (`marketing-hero.tsx:73-74`); the proof screenshot is 5px text; the pricing page is 25 phone-screens long.
- **Alex (comparing tools):** `/vs` promises "Honest feature matrices" (`vs/page.tsx:412-413`) but `/vs/dealcheck` is a prose table with no check/cross cells; `/methodology` says "Math is published and versioned" then "The calc-analysis library is internal proprietary code" (`methodology:117,634`); home vs pricing tables disagree.
- **Sam (agent):** every path — footer "Agents", `/for-agents`, pricing — ends on a page whose only agent sentence is one FAQ answer (`pricing/page.tsx:114-116`); the home "For agents" persona card is in an unmounted component (`landing-sections.tsx:1127-1132`; `<Personas>` is imported nowhere).

## 6. Consistency drift vs DESIGN.md

- **Buttons:** DESIGN says `rounded-md`, 44/36px. Site uses `rounded-full` (header, nav sheet, plan toggle), `rounded-xl` (hero, landing, pricing, persona pages), `rounded-lg` (playbook). Primary CTAs carry a blue glow `shadow-[0_12px_28px_rgba(0,112,196,0.28)]` (`hero-address-form.tsx:220`, `landing-sections.tsx:158`).
- **Inputs:** hero `h-12 rounded-xl sm:h-14` (`hero-address-form.tsx:189`) vs DESIGN `h-9/min-h-11 rounded-md`; playbook email capture a third shape.
- **Focus:** components add `focus-visible:ring-2` (`hero-address-form.tsx:220,248`) on top of the global 3px ring — double ring UNVERIFIED without rendering.
- **Numbers:** market sample stats "−$473/mo", "0.71" set in sans `font-extrabold text-foreground` (`safe-market-page.tsx:263`) — breaks the Ledger Rule and the Sign Rule. Pricing amounts correctly `font-mono`.
- **Status colours:** orange used for a positive note, green for emphasis in eight places.
- **Header/footer:** header wordmark is an image reading "Truecap." (`app-logo.tsx:29`), footer is text "TrueCap." with blue period (`site-footer.tsx:162`). Seven pages lack the header. Footer and single `<Disclaimer/>` are consistent everywhere.
- **Capitalisation/tone:** Title Case feature names in the value stack (`pricing-value-stack.tsx:17-22`) vs sentence case everywhere else; "evaluation" (`pricing-plan-buttons.tsx:101`, `for-agents:150,455`) vs "free trial" (`pricing-toggle-plans.tsx:561`) — the voice term map retires "evaluation".

## 7. Minor observations

- "Still have a question? Email us ." — visible gap before the period from `px-1` on the link (`landing-sections.tsx:767`).
- "Data as of 2026; verify locally…" (`lib/markets/indexability.ts:77`) — an as-of date, which voice.md retires.
- `/vs` says "38 side-by-side comparisons" (`vs/page.tsx:412`); PRODUCT.md says 41 — UNVERIFIED which is current.
- Every trial promise depends on a founder-owed migration; the code fails closed — UNVERIFIED in production.
- Reviews "Three things you can check" cards: links sit at different heights (no `mt-auto`).
- Playbook asks for an email to send the playbook the reader just finished (`playbook:212`).
- No lorem/TODO/undefined text found in the group.

## 8. Three questions for the founder

1. Agent Pro is unsellable in a build without its Stripe price, yet "Agents" sits in every footer — should the tier be invisible until it is real, or should the waitlist page you already wrote render?
2. Which Free/Pro table is the truth — the catalog-derived one on the home page or the hand-typed one on pricing that lists comps, a CRM, a document vault and priority support?
3. You judge the design by the first screen at 1095, and that screen's proof is a screenshot at 44% scale. Would you rather show one legible number — the Offer Ceiling against the asking price — than the whole cockpit?
