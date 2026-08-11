import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Enter your email").email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
  /** Turnstile token — present only when the deployment has captcha configured
   *  (components/auth/captcha-widget). Passed through to Supabase Auth, which
   *  ignores it while its captcha setting is off. */
  captchaToken: z.string().max(4096).optional(),
});

export const signUpSchema = z
  .object({
    email: z.string().min(1, "Enter your email").email("Enter a valid email"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password is too long"),
    confirmPassword: z.string().min(1, "Confirm your password"),
    captchaToken: z.string().max(4096).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Enter your email").email("Enter a valid email"),
  captchaToken: z.string().max(4096).optional(),
});

export const updatePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password is too long"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * Same-origin allowlist for a post-auth return path (?next): SITE-RELATIVE
 * paths only, no open redirects. Returns the normalized path, or null when the
 * value is not a safe internal path.
 *
 * ── Why this is not a one-liner ──────────────────────────────────────────────
 * Three weaker designs have already been tried here and all of them leak:
 *
 * 1. Prefix matching (`startsWith("/") && !startsWith("//")`). The WHATWG URL
 *    parser treats a backslash exactly like a slash in the authority position,
 *    so `/\evil.com` (reachable as `?next=/%5Cevil.com`) passes both tests yet
 *    resolves to https://evil.com/ — and `router.push` hard-navigates there,
 *    immediately after the victim typed their password on the real login page.
 *    Same family: `/\/evil.com`, `/%09/evil.com` (tab/LF/CR are stripped by the
 *    parser *before* it looks for the authority).
 *
 * 2. Origin comparison alone (`new URL(raw, BASE).origin === BASE`). The parser
 *    resolves dot-segments BEFORE you get to read `.origin`, so `/..//evil.com`
 *    (also `/.//evil.com`, `/a/../..//evil.com`) is same-origin at check time
 *    but has pathname `//evil.com` — a protocol-relative URL that the browser
 *    re-resolves to https://evil.com/ on the actual redirect. Checking the
 *    input without re-checking the OUTPUT just moves the bug.
 *
 * 3. Testing only the raw string. `%2F%2F` / `%5C` variants can be decoded by
 *    an intermediate hop, so a value whose decoded form is an authority is
 *    rejected here even though the encoded form is inert.
 *
 * ── What this does instead ───────────────────────────────────────────────────
 * For the raw value AND every percent-decoding of it (decoding is applied
 * repeatedly to a fixpoint), all of the following must hold:
 *   - one leading "/" followed by a non-"/" character (bare "/" is allowed —
 *     it is the default return path and is used all over the app),
 *   - no backslash anywhere, no scheme prefix (javascript:, data:, http:),
 *   - after resolving dot-segments against a throwaway base, the ORIGIN
 *     survives AND the recombined `pathname + search + hash` still satisfies
 *     the leading-slash / no-double-slash / no-backslash test,
 *   - the value that is actually RETURNED is re-resolved one final time and
 *     must still be same-origin.
 * Control characters, whitespace and invisible/bidi Unicode are rejected in
 * the raw value outright (the parser strips several of them, which is exactly
 * how `/%09/evil.com` becomes an authority).
 *
 * The single source for the validation the auth forms, google-auth-button, the
 * OAuth callback route and the auth server actions all apply. Do not
 * re-implement a local variant at a call site — route through this.
 */
const NEXT_PATH_BASE = "https://truecap.invalid";

/** Defensive cap; every legitimate return path in the app is far shorter. */
const NEXT_PATH_MAX_LENGTH = 2048;

/**
 * C0 controls + space, DEL + C1 controls + NBSP, and the invisible /
 * line-separator / bidi Unicode that gets used to smuggle an authority past a
 * naive check. Applied to the RAW value only: a `%20` inside a query value is
 * legitimate, a literal tab in front of the authority is not.
 */
const UNSAFE_RAW_CHARS =
  /[\u0000-\u0020\u007f-\u00a0\u1680\u2000-\u200f\u2028\u2029\u202a-\u202f\u205f\u2060-\u2064\u2066-\u206f\u3000\ufeff]/;

/** `javascript:`, `data:`, `http:` … — anything with a scheme is not a path. */
const SCHEME_PREFIX = /^[A-Za-z][A-Za-z0-9+.\-]*:/;

/**
 * Exactly one leading slash followed by a non-slash character, no backslashes,
 * no scheme. `"/"` on its own is the one allowed short form.
 */
function isSiteRelativeShape(value: string): boolean {
  if (value.length === 0) return false;
  if (value.charCodeAt(0) !== 47 /* "/" */) return false;
  if (value.includes("\\")) return false;
  if (SCHEME_PREFIX.test(value)) return false;
  if (value.length === 1) return true; // bare "/"
  return value.charCodeAt(1) !== 47; // kills "//host", "///host", …
}

/**
 * Resolve dot-segments, then re-apply the shape test to the RESOLVED value —
 * this is the step that kills `/..//evil.com`. Returns the site-relative path
 * that is safe to hand to router.push / NextResponse.redirect, or null.
 */
function normalizedSiteRelativePath(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value, NEXT_PATH_BASE);
  } catch {
    return null;
  }
  if (url.origin !== NEXT_PATH_BASE) return null;

  const path = `${url.pathname}${url.search}${url.hash}`;
  if (!isSiteRelativeShape(path)) return null;

  // Re-resolve what we are about to return. Belt-and-braces against any future
  // parser quirk that survives the shape test.
  try {
    if (new URL(path, NEXT_PATH_BASE).origin !== NEXT_PATH_BASE) return null;
  } catch {
    return null;
  }
  return path;
}

/**
 * The raw value plus each successive percent-decoding of it, up to a fixpoint.
 * A decode that throws (a bare `%`, e.g. the legitimate `?q=100%25` once
 * decoded) is not an error — it just means no further decoding is possible, so
 * we stop with the variants collected so far.
 */
function decodeVariants(raw: string): string[] {
  const variants = [raw];
  let current = raw;
  for (let depth = 0; depth < 4; depth += 1) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(current);
    } catch {
      break;
    }
    if (decoded === current) break;
    variants.push(decoded);
    current = decoded;
  }
  return variants;
}

export function internalNextPathOrNull(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  if (raw.length === 0 || raw.length > NEXT_PATH_MAX_LENGTH) return null;
  if (UNSAFE_RAW_CHARS.test(raw)) return null;

  // Every decoding layer must independently be a safe site-relative path, so a
  // value whose verdict changes once decoded (`/%2F%2Fevil.com`, `/%5Cevil.com`,
  // `/%09/evil.com`) is rejected rather than trusted on its encoded form.
  for (const variant of decodeVariants(raw)) {
    if (!isSiteRelativeShape(variant)) return null;
    if (normalizedSiteRelativePath(variant) === null) return null;
  }

  // Return the normalization of the RAW value: percent-encoding is preserved,
  // dot-segments are resolved, and the result has already been shape-tested.
  return normalizedSiteRelativePath(raw);
}

/** Same as {@link internalNextPathOrNull}, falling back to "/" when unsafe. */
export function safeInternalNextPath(raw: unknown): string {
  return internalNextPathOrNull(raw) ?? "/";
}

export type LoginInput = z.infer<typeof loginSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
