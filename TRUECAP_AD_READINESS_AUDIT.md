# TrueCap — Market-Readiness Audit ("Ready to advertise?")

**Method:** Walked the cold, logged-out funnel on the live site (usetruecap.com) exactly as a paid ad click would — landing → free analysis → paywall → signup → pricing — on desktop and at phone width, plus a technical health check (console + network). June 2026.

---

## Verdict: GO — advertise it.

The funnel is professional, functional, value-delivering, technically clean, and **already instrumented for conversion tracking** (the Google Ads tag and Sentry are live). Nothing here is a "the product isn't ready" blocker. Your instinct to check first was right — but the answer is yes.

The caveat is about *efficiency of spend*, not readiness: two or three cheap, high-leverage tweaks will meaningfully lift conversion before you pour money in. Do those, then scale.

---

## Green lights (why it's ready)

- **The hero converts.** "Stop losing deals to bad math" + "type the address, get a verdict in 60 seconds, no signup" is a clear, benefit-led promise with friction-killers right under the CTA ("No card · No signup · Cancel anytime") and a concrete live-looking preview (Strong Buy, Score 81). It reads instantly on desktop *and* mobile.
- **The free tier delivers a real "aha."** A cold visitor gets a plain-English verdict, the appreciation-play reframe, core metrics, the Cash Flow tab, and AI Deal Q&A — enough to trust the tool works before being asked for anything.
- **The fixes from our prior work are live.** The sample deal now scores 81 (not the old number), and a weak deal reads "Neutral — appreciation play," not a self-contradicting "Avoid." The output is coherent — exactly what you want a prospect to see.
- **Signup is low-friction:** Google one-tap, no card, "always free." Pricing is clear and well-anchored ($0 free, $16.67/mo annual, "pays for itself on the first deal").
- **Objections are pre-handled:** a competitor comparison table and a FAQ that hits the real cold-traffic worries (credit card, accuracy, mobile, cancel).
- **Technically clean + measurable:** zero console errors, every network request 200, and Google Ads conversion tracking (`AW-18159235338`) + Sentry already firing. You'll be able to see what your spend buys.

---

## Flags to fix (conversion optimization, not blockers)

| # | Severity | Finding | Recommended fix | Why it matters for ad ROI |
|---|----------|---------|-----------------|---------------------------|
| 1 | **Medium** | Social proof is thin — one testimonial, no counts, ratings, or logos | Add an "X deals analyzed" counter (you already compute this in `lib/stats/deals-analyzed-count.ts`), 2–3 more testimonials, and/or a simple trust bar | Cold paid traffic converts on trust signals more than features. Likely your single biggest conversion lever. |
| 2 | **Medium** | The Deal Score (the headline 0–100) is the *locked* Pro card — a cold visitor's eye lands top-left on a blurred score | Consider showing the score free (the dopamine "aha") and gating the depth (projections / tax / exit) instead. Test it. | The score is the most magnetic element; locking it can blunt activation. The plain-English verdict is already free, so the hero's promise is kept either way — this is a packaging A/B test. |
| 3 | **Low** | The comparison table shows competitors' prices ("$20/mo") but hides TrueCap's own as "See pricing" | Show "$16.67–20/mo" for TrueCap right in the table | You're price-competitive — hiding it next to a competitor's number looks evasive and adds a "what does it cost?" step. |
| 4 | **Low** | The comparison table is horizontally cramped on mobile (3rd/4th competitor columns sit off-screen) | A mobile-optimized comparison (stacked, or TrueCap-vs-one-competitor) | Most paid clicks are mobile, so the comparison's persuasion is weakest exactly where most traffic lands. |
| 5 | **Low** | "Templates are locked — sign in with a premium subscription" shows a locked Pro feature inside the free setup form | Hide it for free users (your own "invisible until useful" principle) | A locked control during first-run adds friction before any value is delivered. |
| 6 | **Low / verify** | The comparison names DealCheck & BiggerPockets with feature claims | Confirm each claim is currently accurate (the "verified June 2026" footnote helps) | Comparative advertising is fine, but inaccurate claims invite competitor/legal pushback that could disrupt a campaign. |

---

## Before you scale spend (the short list)

1. **Add social proof (#1).** Highest-leverage, cheap, and you already have the data for a deals-analyzed counter.
2. **Show your price in the comparison table (#3).** A five-minute edit that removes a conversion speed bump.
3. **A/B test a free Deal Score (#2).** Potentially a big activation lift; worth a controlled test, not a blind change.

Then advertise. You already have the measurement wired, so launch small, watch the Google Ads conversions and Sentry, and iterate on the landing from real funnel data rather than guesses.

**Bottom line:** This is a market-ready product with a coherent, professional, instrumented funnel. Spend with confidence — just front-load the social-proof and price-transparency tweaks so you're not paying to send traffic into a funnel that under-converts on trust.
