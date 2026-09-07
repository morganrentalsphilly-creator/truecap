import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({ captureMessage: vi.fn(), captureException: vi.fn() }));

import { createFakeAdmin } from "./helpers/fake-supabase-admin";
import {
  claimTestimonialPrompt,
  getUsageCounts,
  listPublishedTestimonials,
  runPublishJob,
  selectFeedbackEmailAudience,
  submitTestimonial,
  unpublishTestimonialByToken,
} from "@/lib/testimonials/store";

const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";
const DEMO = "33333333-3333-4333-8333-333333333333";
const GOOD = "TrueCap made me stop guessing at rent and start checking the number before I offered.";
const NOW = new Date("2026-09-08T12:00:00Z");
const TOKEN = "a".repeat(48);

function setup(maxRows?: number) {
  return createFakeAdmin({
    maxRows,
    tables: {
      profiles: [
        { id: U1, first_name: "Alice", display_name: null, marketing_opt_out: false },
        { id: U2, first_name: null, display_name: "Bob Jones", marketing_opt_out: false },
        { id: DEMO, first_name: "Demo", display_name: null, marketing_opt_out: false },
      ],
      saved_analyses: [
        { id: "d1", user_id: U1, deleted_at: null, created_at: "2026-09-01T00:00:00Z" },
        { id: "d2", user_id: U1, deleted_at: null, created_at: "2026-09-02T00:00:00Z" },
        { id: "d3", user_id: U1, deleted_at: null, created_at: "2026-09-03T00:00:00Z" },
        { id: "d4", user_id: U2, deleted_at: null, created_at: "2026-09-03T00:00:00Z" },
        { id: "d5", user_id: DEMO, deleted_at: null, created_at: "2026-09-03T00:00:00Z" },
        { id: "d6", user_id: U1, deleted_at: "2026-09-04T00:00:00Z", created_at: "2026-09-03T00:00:00Z" },
      ],
      demo_accounts: [{ user_id: DEMO }],
      testimonials: [],
      testimonial_prompt_events: [],
      feedback_email_sends: [],
    },
    users: [
      { id: U1, email: "alice@example.com", email_confirmed_at: "2026-01-01" },
      { id: U2, email: "bob@example.com", email_confirmed_at: "2026-01-01" },
      { id: DEMO, email: "demo+screenshots@usetruecap.com", email_confirmed_at: "2026-01-01" },
    ],
  });
}

beforeEach(() => vi.clearAllMocks());

describe("prompt fires once per user and stores consent", () => {
  it("claims once, then reports already_shown", async () => {
    const fake = setup();
    expect(await claimTestimonialPrompt(fake.admin, U1, "pdf_export")).toBe("claimed");
    expect(await claimTestimonialPrompt(fake.admin, U1, "third_save")).toBe("already_shown");
    expect(fake.rows("testimonial_prompt_events")).toHaveLength(1);
  });

  it("reports unavailable when the migration is not applied", async () => {
    const fake = createFakeAdmin({ missingTables: ["testimonial_prompt_events"] });
    expect(await claimTestimonialPrompt(fake.admin, U1, "pdf_export")).toBe("unavailable");
  });

  it("stores the quote with consent, first name, role, market, and a 24h hold; one per user", async () => {
    const fake = setup();
    const result = await submitTestimonial(fake.admin, {
      userId: U2,
      quote: GOOD,
      role: "investor",
      market: "  Philadelphia,  PA ",
      consent: true,
      trigger: "third_save",
    });
    expect(result.ok).toBe(true);
    const row = fake.rows("testimonials")[0];
    expect(row).toMatchObject({ user_id: U2, quote: GOOD, first_name: "Bob", role: "investor", market: "Philadelphia, PA", consent: true, status: "pending" });
    expect(fake.rows("testimonial_prompt_events")[0]).toMatchObject({ user_id: U2, trigger: "third_save" });
    expect(fake.rows("testimonial_prompt_events")[0].submitted_at).toBeTruthy();
    const again = await submitTestimonial(fake.admin, { userId: U2, quote: GOOD, consent: true, trigger: "third_save" });
    expect(again).toEqual({ ok: false, reason: "already_submitted" });
  });

  it("refuses a quote with a URL before storing anything", async () => {
    const fake = setup();
    const result = await submitTestimonial(fake.admin, { userId: U1, quote: `${GOOD} https://x.co`, consent: true, trigger: "pdf_export" });
    expect(result).toEqual({ ok: false, reason: "contains_url" });
    expect(fake.rows("testimonials")).toHaveLength(0);
  });

  it("refuses a market that carries a URL, email, phone, or profanity (it renders verbatim on the public card)", async () => {
    const fake = setup();
    for (const [market, reason] of [
      ["cheapdeals.com", "contains_url"],
      ["bob@example.com", "contains_email"],
      ["215-555-0134", "contains_phone"],
      ["Shithole, PA", "profanity"],
    ] as const) {
      const result = await submitTestimonial(fake.admin, { userId: U1, quote: GOOD, market, consent: true, trigger: "pdf_export" });
      expect(result, market).toEqual({ ok: false, reason });
    }
    expect(fake.rows("testimonials")).toHaveLength(0);
  });

  it("drops a profile-derived first name that fails the public-string gate instead of storing it", async () => {
    const fake = setup();
    fake.rows("profiles").push({ id: "44444444-4444-4444-8444-444444444444", first_name: "www.cheapdeals.xyz", display_name: null, marketing_opt_out: false });
    const result = await submitTestimonial(fake.admin, { userId: "44444444-4444-4444-8444-444444444444", quote: GOOD, consent: true, trigger: "pdf_export" });
    expect(result.ok).toBe(true);
    expect(fake.rows("testimonials")[0]).toMatchObject({ first_name: null, quote: GOOD });
  });
});

describe("publish job", () => {
  it("publishes the eligible row and records why each ineligible row was skipped", async () => {
    const fake = setup();
    fake.rows("testimonials").push(
      // eligible: consented, 3 saved deals, hold elapsed
      { id: "t1", user_id: U1, quote: GOOD, first_name: "Alice", role: "investor", market: "Philadelphia, PA", consent: true, publish_after: "2026-09-07T00:00:00Z", status: "pending", published_at: null, created_at: "2026-09-06T00:00:00Z", unpublish_token: TOKEN },
      // not enough activity (1 saved deal, no export)
      { id: "t2", user_id: U2, quote: "The ceiling number changed what I offered on a duplex and I walked away from a bad one.", first_name: "Bob", role: null, market: null, consent: true, publish_after: "2026-09-07T00:00:00Z", status: "pending", published_at: null, created_at: "2026-09-06T00:00:00Z", unpublish_token: "b".repeat(48) },
      // demo account
      { id: "t3", user_id: DEMO, quote: "Demo account quote that must never be published no matter how good it sounds.", first_name: "Demo", role: null, market: null, consent: true, publish_after: "2026-09-07T00:00:00Z", status: "pending", published_at: null, created_at: "2026-09-06T00:00:00Z", unpublish_token: "c".repeat(48) },
      // hold not elapsed
      { id: "t4", user_id: U1, quote: "Another sentence from the same user that is long enough to pass the length rule easily.", first_name: "Alice", role: null, market: null, consent: true, publish_after: "2026-09-09T00:00:00Z", status: "pending", published_at: null, created_at: "2026-09-08T00:00:00Z", unpublish_token: "d".repeat(48) },
    );
    const summary = await runPublishJob(fake.admin, NOW);
    expect(summary).toMatchObject({ scanned: 3, published: 1, skipped: { not_enough_activity: 1, demo_account: 1 }, unavailable: false });
    const byId = Object.fromEntries(fake.rows("testimonials").map((r) => [r.id, r]));
    expect(byId.t1).toMatchObject({ status: "published" });
    expect(byId.t1.published_at).toBeTruthy();
    expect(byId.t2).toMatchObject({ status: "pending", skip_reason: "not_enough_activity" });
    expect(byId.t3).toMatchObject({ status: "pending", skip_reason: "demo_account" });
    expect(byId.t4).toMatchObject({ status: "pending" });
    expect(await listPublishedTestimonials(fake.admin, 10)).toMatchObject([{ id: "t1", firstName: "Alice", role: "investor", market: "Philadelphia, PA" }]);
  });

  it("re-checks market and first name at publish time and records the failing rule", async () => {
    const fake = setup();
    fake.rows("testimonials").push(
      { id: "t1", user_id: U1, quote: GOOD, first_name: "Alice", role: null, market: "see cheapdeals.com", consent: true, publish_after: "2026-09-07T00:00:00Z", status: "pending", published_at: null, created_at: "2026-09-06T00:00:00Z", unpublish_token: TOKEN },
      { id: "t2", user_id: U1, quote: `${GOOD} Truly.`, first_name: "https://cheapdeals.xyz", role: null, market: null, consent: true, publish_after: "2026-09-07T00:00:00Z", status: "pending", published_at: null, created_at: "2026-09-06T00:00:00Z", unpublish_token: "b".repeat(48) },
    );
    const summary = await runPublishJob(fake.admin, NOW);
    expect(summary).toMatchObject({ scanned: 2, published: 0, skipped: { contains_url: 2 } });
    for (const row of fake.rows("testimonials")) expect(row).toMatchObject({ status: "pending", skip_reason: "contains_url" });
    expect(await listPublishedTestimonials(fake.admin, 10)).toEqual([]);
  });

  it("does not publish without consent even when everything else holds", async () => {
    const fake = setup();
    fake.rows("testimonials").push({ id: "t1", user_id: U1, quote: GOOD, consent: false, publish_after: "2026-09-07T00:00:00Z", status: "pending", published_at: null, created_at: "2026-09-06T00:00:00Z", unpublish_token: TOKEN });
    const summary = await runPublishJob(fake.admin, NOW);
    expect(summary.published).toBe(0);
    expect(fake.rows("testimonials")[0].status).toBe("pending");
  });

  it("tolerates the table not existing yet", async () => {
    const fake = createFakeAdmin({ missingTables: ["testimonials"] });
    expect(await runPublishJob(fake.admin, NOW)).toMatchObject({ unavailable: true, published: 0 });
    expect(await listPublishedTestimonials(fake.admin, 3)).toEqual([]);
  });

  it("unpublishes by capability token, idempotently, and never deletes", async () => {
    const fake = setup();
    fake.rows("testimonials").push({ id: "t1", user_id: U1, quote: GOOD, consent: true, publish_after: "2026-09-07T00:00:00Z", status: "published", published_at: "2026-09-08T00:00:00Z", created_at: "2026-09-06T00:00:00Z", unpublish_token: TOKEN });
    expect(await unpublishTestimonialByToken(fake.admin, TOKEN)).toBe("unpublished");
    expect(await unpublishTestimonialByToken(fake.admin, TOKEN)).toBe("already_unpublished");
    expect(await unpublishTestimonialByToken(fake.admin, "nope")).toBe("not_found");
    expect(fake.rows("testimonials")).toHaveLength(1);
    expect(fake.rows("testimonials")[0]).toMatchObject({ status: "unpublished" });
  });
});

describe("real counts and the email audience", () => {
  it("counts saved deals by non-demo accounts only (deleted rows excluded)", async () => {
    const fake = setup();
    expect(await getUsageCounts(fake.admin)).toEqual({ dealsSaved: 4 });
  });

  it("selects users with a recent saved deal, excluding demo, prompted, opted-out, and already-emailed users", async () => {
    const fake = setup();
    fake.rows("testimonial_prompt_events").push({ user_id: U2, trigger: "pdf_export", shown_at: "2026-09-01" });
    expect(await selectFeedbackEmailAudience(fake.admin, NOW)).toEqual([{ userId: U1, email: "alice@example.com" }]);
    fake.rows("feedback_email_sends").push({ user_id: U1, form_token: TOKEN });
    expect(await selectFeedbackEmailAudience(fake.admin, NOW)).toEqual([]);
  });
});


describe("feedback audience pagination", () => {
  it("includes candidates beyond the first 1,000 matching deals", async () => {
    const fake = setup(1000);
    fake.rows("saved_analyses").unshift(...Array.from({ length: 1001 }, (_, i) => ({
      id: `a${String(i).padStart(4, "0")}`, user_id: "unconfirmed-user", deleted_at: null,
      created_at: "2026-09-01T00:00:00Z",
    })));
    expect(await selectFeedbackEmailAudience(fake.admin, NOW)).toEqual([
      { userId: U1, email: "alice@example.com" }, { userId: U2, email: "bob@example.com" },
    ]);
  });

  it.each(["demo_accounts", "testimonial_prompt_events", "feedback_email_sends", "profiles"])(
    "honors an exclusion after the first 1,000 matching %s rows", async (table) => {
      const fake = setup(1000);
      const column = table === "profiles" ? "id" : "user_id";
      const noise = Array.from({ length: 1001 }, (_, i) => ({
        [column]: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
        marketing_opt_out: true,
      }));
      fake.rows(table).unshift(...noise);
      if (table === "profiles") {
        fake.rows(table).find((row) => row.id === U2)!.marketing_opt_out = true;
      } else {
        fake.rows(table).push({ user_id: U2 });
      }
      expect(await selectFeedbackEmailAudience(fake.admin, NOW)).toEqual([{ userId: U1, email: "alice@example.com" }]);
    },
  );

  it("uses exact counts to continue when the API returns less than the requested page size", async () => {
    const fake = setup(1);
    fake.rows("testimonial_prompt_events").push({ user_id: "00000000-0000-4000-8000-000000000001" }, { user_id: U2 });
    expect(await selectFeedbackEmailAudience(fake.admin, NOW)).toEqual([{ userId: U1, email: "alice@example.com" }]);
  });

  it.each(["demo_accounts", "testimonial_prompt_events", "feedback_email_sends", "profiles"])(
    "fails closed instead of emailing when the %s exclusion cannot be read", async (table) => {
      const seed = setup();
      const fake = createFakeAdmin({ tables: seed.tables, users: seed.users, missingTables: [table] });
      await expect(selectFeedbackEmailAudience(fake.admin, NOW)).rejects.toMatchObject({ code: "42P01" });
    },
  );
});
