import sourceManifest from "@/config/seo-sources.json";
import { FRESHNESS_DAYS } from "./config";
import type { FreshnessClass, SeoSource } from "./types";

/** Shared by the app, tests, and dependency-free source monitor. */
export const SEO_SOURCES = sourceManifest as readonly SeoSource[];

export function sourceById(id: string): SeoSource | null {
  return SEO_SOURCES.find((source) => source.id === id) ?? null;
}

export function sourcesDue(
  lastFetched: Readonly<Record<string, string | null>>,
  now = new Date(),
): SeoSource[] {
  return SEO_SOURCES.filter((source) => {
    const value = lastFetched[source.id];
    if (!value) return true;
    const fetchedAt = new Date(value).getTime();
    if (!Number.isFinite(fetchedAt)) return true;
    return now.getTime() - fetchedAt >= source.refreshIntervalDays * 86_400_000;
  });
}

export function freshnessDueAt(lastReviewedAt: string, freshnessClass: FreshnessClass): string {
  const date = new Date(lastReviewedAt);
  date.setUTCDate(date.getUTCDate() + FRESHNESS_DAYS[freshnessClass]);
  return date.toISOString();
}
