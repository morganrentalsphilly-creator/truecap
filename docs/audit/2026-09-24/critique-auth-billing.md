# Impeccable critique — Assessment A · Auth & Billing (Operate mode)

Scope note: profile, billing and settings surfaces were reviewed from source only (no signed-in screenshots exist).

## 1. Design-specificity verdict

The first screen is unmistakably TrueCap: the dark underwriting panel with three product-specific trust items (`components/auth/auth-shell.tsx:15-31`), the "$0 today" trial box naming the reviewed plan (`components/auth/sign-up-form.tsx:179-215`), and the Pro card's "One address. Four answers." block (`components/marketing/pricing-toggle-plans.tsx:421-433`) could belong to no other product. The specificity is spent almost entirely on persuasion; the operate layer underneath (password rules, error placement, post-signup state, trial-budget visibility) is stock shadcn behaviour with toasts. It looks like TrueCap until you type; then it behaves like a kit.

## 2. Nielsen heuristics (25/40)

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of status | 3 | Sign-up success is a vanishing toast, not a state (`sign-up-form.tsx:143-161`); forgot-password gets it right (`forgot-password-form.tsx:72-87`) |
| 2 | Match real world | 3 | "owner-scoped saved data", "record a decision" (`auth-shell.tsx:29,38`), "personalized insights" (`app/auth/login/page.tsx:26`) |
| 3 | User control | 3 | Auth pages have no header/footer; the only exit is the logo; password update pushes an authenticated user back to login (`update-password-form.tsx:63`) |
| 4 | Consistency | 2 | rounded-md / xl / 2xl / full primary buttons, three shadows, raw amber/emerald palette |
| 5 | Error prevention | 2 | Client accepts 8-char passwords the local server rejects (`lib/auth-schema.ts:17` vs `supabase/config.toml:67-68`) |
| 6 | Recognition vs recall | 3 | Trial budget shown at sign-up and /pricing only; never inside the app |
| 7 | Flexibility | 3 | Google one-tap, `?next` threading, autocomplete, show/hide password; confirm-password field is redundant with the eye toggle |
| 8 | Minimalist | 2 | "no card" six times on two screens; seven badges before the Pro CTA at 375 |
| 9 | Error recovery | 2 | Toast-only, no `aria-invalid`, raw Supabase text for rate limits/policy (`app/actions/auth.ts:28`) |
| 10 | Help | 2 | No support/Privacy/Terms link on login, forgot, update pages; no password help |

## 3. Cognitive-load failures (5 of 8 → high)

- Single focus: sign-up stacks trial box + pending-deal notice + Google + form + legal before the CTA; pricing hero carries two CTAs plus the header's "Create account" pill.
- Chunking: Pro card at 375: Save $60/yr, Best value, Recommended, −17%, evaluation pill, four-answers box, CTA, then a terms paragraph.
- Visual hierarchy: at 375 the sign-up form's first field is at ~y 895 and the CTA at ~y 1240.
- Working memory: password rules unknown until after submit; the 3-deal/1-comparison budget must be remembered from the sign-up page.
- Progressive disclosure: pricing shows cards, DealCheck box, trust row, stage cards, product shots, value stack and an 18-row table in one scroll.

## 4. Priority issues

**P0 — Password policy is invisible and contradicted.** No rule text near either password field; zod validates `min(8)` (`lib/auth-schema.ts:17,36`); the local Supabase config requires 12 chars with lower/upper/digits (`supabase/config.toml:67-68`; production setting UNVERIFIED). `mapAuthError` maps only three messages and returns everything else raw (`app/actions/auth.ts:17-29`), so the rejection arrives as Supabase's own sentence in a toast. Fix: align the schema with the real policy, add a `<FormDescription>` under both password fields, map `Password should` errors to the field. Command: harden.

**P1 — Sign-up success has no state, and `?next` can bounce to login.** On success the form toasts and `router.push(next)` (`sign-up-form.tsx:143-161`). From pricing, `next=/dashboard/new`, a route that redirects unauthenticated users to login. With email confirmation on (the code's stated typical case, `sign-up-form.tsx:138-142`) a brand-new account lands on "Welcome back". The `registered=1` toast that was meant for this is never set anywhere (`login-form.tsx:76-81`). Fix: add a `sent` state mirroring `forgot-password-form.tsx:72-87`, with resend, and skip the push when `needsEmailConfirmation`. Command: onboard.

**P1 — The trial budget vanishes after sign-up.** "three Pro deal analyses and one full comparison" appears at sign-up and on /pricing, but no signed-in app surface renders remaining allowance (`dealsRemaining` is used only in pricing files). Fix: a one-line strip on `/dashboard/new` and the results toolbar: "Free trial: {allowance} · ends {date}". Command: onboard.

**P1 — Auth errors are toast-only and partly unmapped.** Wrong password → toast; fields never receive `aria-invalid`; `TOAST_LIMIT = 1`; rate limits fall through raw; the existing-email message "Unable to register with this email. Try signing in instead." (`auth.ts:95`) links nowhere. Fix: an inline `role="alert"` panel above the submit button, reusing the unconfirmed-email panel pattern (`login-form.tsx:259-283`); add a rate-limit branch to `mapAuthError`. Command: clarify.

**P2 — The phone's first screen is decoration.** A 96px gradient Building2 medallion (`auth-shell.tsx:109-112`, `lg:hidden`) plus the logo block push the login button to ~y 740 and the sign-up CTA to ~y 1240 at 375. At 1095 the logo is rendered twice (`auth-shell.tsx:46-52` and `64-70`). Fix: delete lines 109-112; add `lg:hidden` to the outer logo wrapper. Command: layout.

**P2 — Seven signals before the Pro CTA; "no card" ×6.** Save $60/yr (`pricing-toggle-plans.tsx:333-340`), ★ Best value (347-350), Recommended (356-359), −17% (401-404), evaluation pill (416-419), four-answers box (421-433), CTA, terms paragraph (559-563). The true charge "billed annually ($300)" is `text-xs` under a `text-5xl` "$25" (408-414). Fix: keep Recommended only; fold "−17%" into the Annual label; delete the evaluation pill; `text-xs` → `text-sm` on line 414. Command: quieter.

**P2 — Cancellation says one thing four ways; sign-up asserts a plan nobody reviewed.** "Cancels at period end" badge (`billing-panel.tsx:282`), "Status: cancellation scheduled" (311), disabled "Cancellation scheduled" button (343), "Your subscription will end on…" (352); nothing says saved deals stay readable. "Plan you reviewed: Pro · monthly" renders for every visitor, defaulting when no `?plan` exists (`sign-up-form.tsx:82-98, 199-204`). Command: clarify.

**P3 — Update-password contradicts itself on a dead link.** "Create new password / Choose a strong password…" (`app/auth/update-password/page.tsx:15-16`) sits above "You need a valid reset link…" (`update-password-form.tsx:78-92`). On success push to `next` or `/dashboard` instead of `/auth/login` (line 63). Command: clarify.

## 5. Persona red flags

- **Jordan**: the first screen is logo, medallion, headline and a box asserting "Plan you reviewed: Pro · monthly $29.99/month" — Jordan reviewed nothing. An 8-character password passes the form and fails the server in a toast the keyboard may cover.
- **Alex**: at 1095 the first screen is headline and two CTAs; the price arrives at ~y 840. "$25" leads while "$300" is 12px; the feature table is four screens down. Confirm-password plus an eye toggle is a redundant step.
- **Sam**: the tier renders only when `agentProConfigured`; when it does, its pill reuses Pro's string "21 days · 3 Pro deals + 1 comparison" (503-506) beneath an Agent Pro price, and at 375 it is `order-3`, below ~2,000px of Pro and Free.

## 6. Consistency drift against DESIGN.md

- **Buttons**: primitive `rounded-md h-11 md:h-9 font-medium`. Auth: `h-12 rounded-xl font-semibold` + custom shadow (`login-form.tsx:289`); pricing: `rounded-xl font-bold` + a different shadow (`pricing-plan-buttons.tsx:99,112`); profile: primitive + `rounded-xl`; crop dialog: `rounded-2xl` and a hard-coded second blue `bg-[#2f658f]` (`profile-form.tsx:743`); header: `rounded-full text-[13px]`. Google button is a raw `<button>` outside the primitive (`google-auth-button.tsx:130-135`).
- **Inputs/focus**: auth inputs override to `rounded-xl h-12 sm:text-sm` (`login-form.tsx:209`) — 14px inputs at 640–767px; eye toggles and the billing toggle declare `ring-2` against the system's 3px ring.
- **Headings**: `font-bold` H1 on auth and profile vs `font-extrabold` on pricing/settings; crop dialog title is `text-4xl`. Eyebrows exist despite the Don't list.
- **Google vs email hierarchy**: equal-weight full-width 48px rows; the code calls Google "highest-leverage" yet styles it as the outline option under a 250px trial box.
- **Labels/toasts**: "Email" vs "Email address"; "Couldn't resend" vs "Could not update password"; "Registration successful" vs "Account created".
- **Raw palette**: amber/emerald in `login-form.tsx:260-271`, `forgot-password-form.tsx:75-76`, `billing-panel.tsx:282,296,377,396`.
- **Header/footer**: none on auth pages; login/forgot/update carry no Terms, Privacy or support link.

## 7. Minor observations

- Stray commented-out JSX: `billing-panel.tsx:270, 313`.
- Fallback price label "17% off / year" when Stripe fails (`app/profile/page.tsx:54, 299`); the discount is phrased three ways.
- FAQ says "Cancel … in one click" (`page.tsx:90`); it is two.
- Arbitrary `text-[10px]/[11px]/[13px]` instead of the named steps.

## 8. Three questions for the founder

1. Is the no-card evaluation an account feature or a Pro feature? The Agent Pro card wears the "3 Pro deals" pill — does a trial account get client rosters?
2. What is the one thing a new account should see first: the deal they were saving, their remaining allowance, or the dashboard?
3. Is a 12-character, three-class password worth its abandonment for someone on a phone in front of a listing, or should Google be the primary path?
