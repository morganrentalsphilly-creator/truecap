/**
 * One cookie policy for every Supabase client factory.
 *
 * @supabase/ssr's DEFAULT_COOKIE_OPTIONS omits `secure`, so the 400-day
 * session cookie was written without the Secure attribute (verified on the
 * production wire: `Path=/; Max-Age=0; SameSite=lax`, no Secure). Without it
 * the browser is willing to send the session over plain http — any downgrade
 * to an http:// URL on the domain exposes the token.
 *
 * `httpOnly` is deliberately left at the library default (false): the browser
 * client reads this cookie through document.cookie, so forcing httpOnly would
 * break sign-in entirely. SameSite=lax already blocks cross-site sends.
 *
 * Every factory imports this so the policy cannot drift between the one that
 * MINTS the session (app/auth/callback) and the ones that refresh or clear it.
 */
export const SUPABASE_COOKIE_OPTIONS = {
  // Local development is served over http://localhost; a Secure cookie there
  // would silently never be stored and break the dev sign-in loop.
  secure: process.env.NODE_ENV === "production",
} as const;
