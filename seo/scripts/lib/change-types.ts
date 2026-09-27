/**
 * Change types: the grouping key outcomes, lessons.md and the change-type
 * brake count by. The model names one per manifest change; every consumer
 * compares them through cleanChangeType, so "Title Meta" and "title-meta" are
 * one type everywhere (ledger entries, brakes, run flags, verify-static).
 *
 * CHANGE_TYPES is the list .claude/skills/seo-weekly/SKILL.md gives the model.
 * verify-static requires a manifest change to use one of them while any type
 * is demoted, so an edit cannot dodge its demotion by naming a blank or
 * made-up type.
 */

export const CHANGE_TYPES: readonly string[] = [
  "title-meta",
  "striking-distance",
  "refresh",
  "citations",
  "internal-links",
  "market-enrich",
  "new-article",
  "prune-noindex",
  "data-study",
];

/** change_type is a grouping key for outcomes and brakes: lowercase slug, never empty. */
export function cleanChangeType(value: unknown): string {
  const slug = String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "")
    .slice(0, 64);
  return slug || "unspecified";
}

/** A manifest changeType that names one of CHANGE_TYPES (after cleaning); a blank or missing one never does. */
export function isKnownChangeType(value: unknown): boolean {
  return typeof value === "string" && CHANGE_TYPES.includes(cleanChangeType(value));
}
