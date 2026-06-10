# TrueCap branded email templates

Five HTML email templates for Supabase Auth, designed to match the TrueCap brand.
All templates are responsive, tested in the major email clients, and use only
inline styles so they render correctly in Gmail / Apple Mail / Outlook.

```
supabase/
├── confirm-signup.html   ← new account verification
├── reset-password.html   ← forgot-password flow
├── magic-link.html       ← passwordless sign-in
├── change-email.html     ← when a user updates their email
└── invite-user.html      ← admin-invited accounts
```

## Install

### 0. Custom SMTP — make auth emails send from hello@usetruecap.com (5 min)

Without this step the templates render branded but still arrive from
Supabase's shared sender (`noreply@mail.app.supabase.io`) with weak
deliverability and a tiny hourly send cap. Route them through Resend
instead — the domain is already verified there (the newsletter sends
from it).

1. Resend dashboard → **API Keys** → Create API key, name it
   `supabase-auth-smtp`, permission **Sending access** only (don't reuse
   the Full Access broadcast key — separate keys rotate independently).
2. Supabase Dashboard → your project → **Project Settings →
   Authentication** → **SMTP Settings** → enable **Custom SMTP**:

   | Field           | Value                      |
   |-----------------|----------------------------|
   | Host            | `smtp.resend.com`          |
   | Port            | `465`                      |
   | Username        | `resend`                   |
   | Password        | the new Resend API key     |
   | Sender email    | `hello@usetruecap.com`     |
   | Sender name     | `TrueCap`                  |

3. Save. Supabase raises the hourly auth-email limit once custom SMTP
   is on — set the rate limit field to something sane like 100/hour.

Every auth email then leaves through Resend as `TrueCap
<hello@usetruecap.com>` — same sender, SPF/DKIM, and reputation as the
rest of TrueCap's mail.

### 1. Paste the templates into Supabase

1. Open https://supabase.com/dashboard → your TrueCap project.
2. Go to **Authentication → Email Templates** (sidebar).
3. For each template above, open the matching tab in Supabase, replace the
   HTML body with the contents of the file, and click **Save**.

**Recommended subject lines** (set the "Subject heading" field at the top
of each Supabase template):

| Template          | Subject                                |
|-------------------|----------------------------------------|
| Confirm signup    | `Confirm your TrueCap account`         |
| Reset password    | `Reset your TrueCap password`          |
| Magic link        | `Your TrueCap sign-in link`            |
| Change email      | `Confirm your new TrueCap email`       |
| Invite user       | `You're invited to TrueCap`            |

### 2. Configure Site URL and Redirect URLs

Still in the Supabase Dashboard → **Authentication → URL Configuration**:

- **Site URL**: `https://usetruecap.com`
- **Redirect URLs** (add all of these):
  - `https://usetruecap.com/auth/callback`
  - `https://usetruecap.com/auth/callback?**` (wildcard for `?next=` etc.)
  - `http://localhost:3000/auth/callback` (for local dev)
  - `http://localhost:3000/auth/callback?**`

Without the wildcards Supabase will reject any callback URL that includes
query parameters, and the reset-password flow needs `?next=/auth/update-password`.

### 3. Make sure `NEXT_PUBLIC_SITE_URL` is set in Vercel

`lib/site-url.ts` reads `NEXT_PUBLIC_SITE_URL` to build the email
`redirectTo` URLs. In Vercel → Project → Settings → Environment Variables:

- `NEXT_PUBLIC_SITE_URL` = `https://usetruecap.com`

(Without this, the emails will link to the Vercel preview URL or `localhost`.)

## Test

After saving:

1. **Reset password** — go to `/auth/forgot-password`, enter your email, check
   inbox. The email should show the new branding and the button should land
   on `/auth/update-password` with a valid session.
2. **Sign up** — create a fresh account; confirmation email should arrive
   branded; clicking the button should sign you in.
3. **Change email** (optional) — only fires if you've enabled
   "Confirm email changes" in Supabase.

## Template variables used

These are the Supabase template variables the HTML uses. All are built in —
no extra config needed.

| Variable               | Meaning                                                          |
|------------------------|------------------------------------------------------------------|
| `{{ .ConfirmationURL }}` | Full verify URL with token + `redirect_to` baked in (the button) |
| `{{ .Token }}`           | One-time 6-character code, shown as a fallback below the button  |
| `{{ .SiteURL }}`         | Your configured Site URL (used in the logo link and footer)      |
| `{{ .Email }}`           | Current account email (Change Email template only)               |
| `{{ .NewEmail }}`        | Pending new email (Change Email template only)                   |

## How the app handles the link

The app's `/auth/callback` route (`app/auth/callback/route.ts`) accepts
**both** flows that Supabase emails can use:

1. **PKCE / hosted-verify flow** — `?code=…` → calls
   `exchangeCodeForSession` to mint a session, then redirects to `next`.
2. **Direct token-hash flow** — `?token_hash=…&type=…` → calls
   `verifyOtp` to mint a session, then redirects to `next`.

Either way, the user lands on `/auth/update-password` (for password resets)
or `/` (for new sign-ups) with their session active. The
`update-password` page client-side checks `getUser()`, and if no session
exists it shows a "request a new link" prompt instead of a blank form.

If the link is malformed or the token has been used/expired, the user is
redirected to `/auth/login?error=auth&reason=…` and a destructive toast
explains whether to retry or request a new email.
