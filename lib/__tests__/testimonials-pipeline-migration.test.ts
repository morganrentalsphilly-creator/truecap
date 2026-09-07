import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const PIPELINE_TABLES = [
  "testimonials",
  "testimonial_prompt_events",
  "demo_accounts",
  "feedback_email_sends",
] as const;

/**
 * The testimonials row carries the founder's unpublish capability token and
 * the author's auth user_id, so no client role may ever select it. Supabase's
 * default privileges grant SELECT on every public table to anon/authenticated,
 * which means a row policy alone is a leak — the grant must be revoked too.
 */
describe("testimonials pipeline migration is service-role only", () => {
  const original = read("supabase/migrations/20260906180000_testimonials_pipeline.sql");
  const followUp = read("supabase/migrations/20260907120000_testimonials_service_role_only.sql");

  it("revokes the default anon/authenticated grants on every pipeline table", () => {
    for (const table of PIPELINE_TABLES) {
      expect(original, table).toContain(`alter table public.${table} force row level security;`);
      expect(original, table).toContain(
        `revoke all on table public.${table} from public, anon, authenticated;`,
      );
      expect(original, table).toContain(
        `grant select, insert, update on table public.${table} to service_role;`,
      );
    }
  });

  it("creates no policy that lets anon or authenticated read testimonials", () => {
    expect(original).not.toMatch(/create policy[\s\S]*?to\s+anon/i);
    expect(original).not.toMatch(/create policy[\s\S]*?to\s+authenticated/i);
    expect(original).not.toMatch(/create policy\s+testimonials_public_read/i);
    expect(original).toContain("drop policy if exists testimonials_public_read on public.testimonials;");
  });

  it("ships the same revoke as an idempotent follow-up for databases where the original already ran", () => {
    expect(followUp).toContain("to_regclass('public.' || t)");
    expect(followUp).toContain("revoke all on table public.%I from public, anon, authenticated");
    expect(followUp).toContain("grant select, insert, update on table public.%I to service_role");
    expect(followUp).toContain("drop policy if exists testimonials_public_read on public.testimonials");
    for (const table of PIPELINE_TABLES) expect(followUp).toContain(`'${table}'`);
    expect(followUp).not.toMatch(/create policy/i);
  });
});
