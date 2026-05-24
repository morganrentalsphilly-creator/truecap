# Google OAuth Setup

The auth forms now show a "Continue with Google" button (login) and
"Sign up with Google" button (sign-up). This document is the
**one-time setup** you need to do in Google Cloud Console + Supabase
to make the button actually work.

Until you complete these steps, clicking the button will surface a
red toast saying something like _"Unsupported provider: provider is
not enabled"_ — that's the expected failure mode, the button is
working, the provider just isn't wired yet.

Estimated time: 10 minutes.

---

## Step 1 — Get your Supabase callback URL

You'll need this URL twice (once for Google, once to confirm in
Supabase).

1. Open Supabase → your TrueCap project → **Authentication → URL Configuration**.
2. Copy the **Site URL** (should be `https://usetruecap.com`).
3. The Google OAuth callback Supabase expects is:

```
https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback
```

You can find your project ref in the dashboard URL or by going to
**Project Settings → General → Reference ID**. It looks like a random
string of ~20 chars.

Example final URL:

```
https://abcdefghijklmnopqrst.supabase.co/auth/v1/callback
```

Keep this open in another tab. You'll paste it into Google in a moment.

---

## Step 2 — Create OAuth credentials in Google Cloud Console

1. Open <https://console.cloud.google.com/>.
2. Top-left, click the project picker → **New Project** → name it
   `TrueCap` → **Create**. (Or use an existing project if you have one.)
3. Search bar → **APIs & Services → OAuth consent screen**.
   - User type: **External** → **Create**.
   - App name: `TrueCap`
   - User support email: `morganrentalsphilly@gmail.com`
   - App domain (optional but recommended): `usetruecap.com`
   - Authorized domains: add `usetruecap.com` and `supabase.co`
   - Developer contact: `morganrentalsphilly@gmail.com`
   - **Save and Continue**.
4. **Scopes** screen: click **Add or Remove Scopes**, add the three default
   ones: `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`.
   **Save and Continue**.
5. **Test users**: add your own email so you can test before Google approves
   the consent screen. **Save and Continue → Back to Dashboard**.
6. Search bar → **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
   - Application type: **Web application**
   - Name: `TrueCap web`
   - **Authorized JavaScript origins** — add both:
     - `https://usetruecap.com`
     - `http://localhost:3000` (so dev works too)
   - **Authorized redirect URIs** — add the Supabase callback URL from
     Step 1 (the one ending in `/auth/v1/callback`).
   - **Create**.
7. A modal pops up with your **Client ID** and **Client secret**. Copy
   both — you'll paste them into Supabase next.

---

## Step 3 — Enable Google in Supabase

1. Supabase → your TrueCap project → **Authentication → Providers**.
2. Find **Google** in the list → click to expand → toggle **Enable**.
3. Paste the **Client ID** and **Client Secret** you just copied from
   Google Cloud Console.
4. Make sure **Skip nonce check** is OFF (it's the default).
5. **Save**.

That's it. Test the button on `/auth/login` — you should be
redirected to Google, see the consent screen, and bounce back to
`https://usetruecap.com/` signed in.

---

## Step 4 — Submit for verification (optional but recommended)

Google shows a scary "unverified app" warning until you go through
their verification flow. Until then, users see a warning screen they
have to click past, which kills conversion.

For the basic scopes we use (`email`, `profile`, `openid`), Google
verification is **free and usually takes 4-7 days**. To start:

1. Google Cloud Console → **OAuth consent screen** → **Publish App**.
2. Click **Prepare for verification** (only shows up after publishing).
3. Fill out:
   - Privacy policy URL: `https://usetruecap.com/privacy` (build this if
     you don't have it yet — Google requires it)
   - Terms of service URL: `https://usetruecap.com/terms`
   - App logo (120x120 PNG)
   - Authorized domains (already configured)
4. Submit. Google emails you when verification is approved.

Until verified, paid traffic from non-test-user accounts WILL see the
"This app isn't verified" warning. That's bad for conversion. So
either:
- Submit verification before scaling paid spend, OR
- Document the warning in your help / FAQ so users know it's safe to
  click "Advanced → Go to TrueCap (unsafe)".

---

## Troubleshooting

**Button shows "Google sign-in unavailable: Unsupported provider"**
→ Google isn't enabled in Supabase yet. Go to Step 3.

**Google redirects back with `?error=auth&reason=...`**
→ The Authorized Redirect URI in Google Cloud Console doesn't exactly
match the Supabase callback URL. They must be byte-identical, including
the trailing path. Re-check Step 2 step 6.

**Users see "This app isn't verified" warning**
→ Expected until you complete Step 4. Test users you added in Step 2.5
won't see it.

**Works on production but not localhost**
→ Add `http://localhost:3000` to Google's Authorized JavaScript origins
in Step 2 step 6.

**User has a Supabase email/password account AND tries to sign in with
Google using the same email**
→ Supabase will link them automatically as long as the Google email
matches the existing account's email. The user gets signed in either
way; their saved deals etc. carry over.
