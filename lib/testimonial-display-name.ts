export type TestimonialDisplayNameFormat =
  | "full_name"
  | "first_name_last_initial"
  | "initials"
  | "anonymous";

/**
 * Apply the submitter's approved attribution format before a name can be
 * copied into a public proof record. The raw name remains visible only in the
 * admin review queue. Missing non-anonymous input fails closed to null.
 */
export function formatTestimonialDisplayName(
  rawName: string | null | undefined,
  format: TestimonialDisplayNameFormat,
): string | null {
  if (format === "anonymous") return "Anonymous";
  const name = rawName?.trim().replace(/\s+/g, " ");
  if (!name) return null;
  if (format === "full_name") return name;

  const parts = name.split(" ");
  if (format === "first_name_last_initial") {
    const last = parts.at(-1);
    return parts.length > 1 && last
      ? `${parts[0]} ${Array.from(last)[0]?.toLocaleUpperCase()}.`
      : (parts[0] ?? null);
  }

  const initials = parts
    .map((part) => Array.from(part)[0]?.toLocaleUpperCase())
    .filter((part): part is string => Boolean(part));
  return initials.length > 0 ? `${initials.join(".")}.` : null;
}
