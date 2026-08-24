import "server-only";

/**
 * Server-owned cohort gate for the dark advocacy decision contract.
 *
 * The public build-time feature flag controls code activation; this private
 * allowlist controls who may receive it. Both must pass. Never forward the
 * configured list to a Client Component.
 */

const MAX_COHORT_MEMBERS = 100;
const INTERNAL_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseAdvocacyInternalEmails(raw: string | null | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(
        (value) =>
          value.length >= 3 &&
          value.length <= 254 &&
          INTERNAL_EMAIL_PATTERN.test(value)
      )
      .slice(0, MAX_COHORT_MEMBERS)
  );
}

export function isAdvocacyInternalUser(email: string | null | undefined): boolean {
  if (!email) return false;
  return parseAdvocacyInternalEmails(
    process.env.TRUECAP_ADVOCACY_INTERNAL_EMAILS
  ).has(email.trim().toLowerCase());
}
