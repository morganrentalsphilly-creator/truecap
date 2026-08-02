# Off-domain outreach — the part no workflow can do for you

The 2026-08-02 baseline found **zero** third-party pages mentioning TrueCap,
while newer and smaller tools were already listed on the roundups TrueCap is
absent from. Nothing in `.github/workflows/seo-*.yml` fixes that. Submissions
need a human with an account and an email address.

Why it outranks writing another blog post: AI assistants recommend what
independent sources corroborate, and Google's category rankings are dominated
by aggregators. TrueCap can publish a 40th comparison page on its own domain
and still be invisible in "what should I use to underwrite a rental" — because
that answer gets assembled from AlternativeTo, G2, Reddit, and listicles, none
of which have heard of it.

## Before you start: always write the brand as "TrueCap (usetruecap.com)"

Four unrelated entities compete for the bare word: truecapcre.com,
true-cap.com, truecap.io, and TrueCap Advisory Services. A mention that says
only "TrueCap" may consolidate signal onto someone else's domain.

## Tier 1 — aggregators (highest leverage, all free, ~2 hours total)

These are listing decisions, not ranking contests. You submit, they publish.

- [ ] **AlternativeTo** — add TrueCap as an alternative to DealCheck, Mashvisor,
      Stessa, and BiggerPockets' calculator.
      <https://alternativeto.net/software/dealcheck>
- [ ] **G2** — create the product listing (free vendor profile).
- [ ] **Capterra / Software Advice** — same, one submission covers the Gartner
      network.
- [ ] **Product Hunt** — a launch is a permanent indexed page plus a real
      backlink, independent of whether the launch does numbers.
- [ ] **RealEstateStackHub** comparison page — pitch inclusion.
      <https://realestatestackhub.com/compare/rental-property-analysis-tools>

## Tier 2 — listicles (each is an email, ~1 hour each)

Search `best rental property calculator 2026`, `DealCheck alternatives`, and
`free real estate investment analysis tools`, then email the author of each
result that maintains its list. The pitch that works is a free, un-gated tool
their readers can use without signing up — which TrueCap genuinely is. Lead
with that, not with a link request.

## Tier 3 — community (ongoing, slow, real)

r/realestateinvesting and r/realestateagents rank highly for a lot of these
queries, and Reddit threads are heavily weighted in AI assistant answers.

The only version of this that works: answer underwriting questions with actual
worked numbers, and link the relevant free calculator when it's the direct
answer to what was asked. Roughly one link per five substantive comments. A
promotional account gets banned and the domain gets a reputation, which is
worse than doing nothing.

## Tracking

`.github/workflows/seo-visibility.yml` counts off-domain mentions every
Wednesday and logs them to `docs/seo/visibility/`. Anything landed here shows
up there within a week of being indexed — that's the feedback loop.

Check items off in this file as you go, so the next person (or the next
automated run reading this repo) knows what's already been tried.
