/**
 * Funnel sequences (docs/funnel-leaks-plan.md Phase B): the scheduler's
 * rules, the trial-end offer window, and the rendered emails' compliance.
 */
import { describe, expect, it } from "vitest";
import {
  buildSequenceCtaUrl,
  renderSequenceEmail,
  resolveParagraph,
} from "@/lib/email/render-sequence";
import {
  MEMO_LEAD_STEPS,
  SEQUENCE_STEPS,
  STEP_GRACE_DAYS,
  TRIAL_STEPS,
  expiredSequenceKeys,
  isWithinTrialEndOfferWindow,
  selectDueSequenceStep,
  type SequenceId,
  type SequenceRecipientState,
} from "@/lib/funnel-sequences";
import { selectDueLifecycleEmail, type LifecycleUserState } from "@/lib/lifecycle-emails";
import { resolveTrialEndAnnualCoupon, trialEndOfferConfigured } from "@/lib/trial-end-offer";

const START = "2026-10-01T14:00:00.000Z";
const DAY_MS = 86_400_000;
const at = (days: number, hours = 0) =>
  new Date(Date.parse(START) + days * DAY_MS + hours * 3_600_000);

const state = (
  sequence: SequenceId,
  overrides: Partial<SequenceRecipientState> = {},
): SequenceRecipientState => ({
  sequence,
  startAt: START,
  sentKeys: [],
  unsubscribed: false,
  converted: false,
  ...overrides,
});

/** Run the daily cron for `days` days, recording each send like the log does. */
function simulate(sequence: SequenceId, days: number, base: Partial<SequenceRecipientState> = {}) {
  const sentKeys: string[] = [];
  const sentOn: Record<string, number> = {};
  for (let day = 0; day <= days; day++) {
    const step = selectDueSequenceStep(state(sequence, { ...base, sentKeys }), at(day));
    if (step) {
      sentKeys.push(step.key);
      sentOn[step.key] = day;
    }
  }
  return { sentKeys, sentOn };
}

describe("schedule", () => {
  it("matches the brief", () => {
    expect(MEMO_LEAD_STEPS).toEqual([
      { key: "L1", day: 2 },
      { key: "L2", day: 5 },
      { key: "L3", day: 9 },
      { key: "L4", day: 14 },
    ]);
    expect(TRIAL_STEPS.map((s) => [s.key, s.day])).toEqual([
      ["T0", 0], ["T1", 3], ["T2", 7], ["T3", 14], ["T4", 18], ["T5", 21], ["T6", 30],
    ]);
  });

  it("sends each step on its day when the cron runs daily", () => {
    expect(simulate("memo_lead", 40).sentOn).toEqual({ L1: 2, L2: 5, L3: 9, L4: 14 });
    expect(simulate("trial", 40).sentOn).toEqual({
      T0: 0, T1: 3, T2: 7, T3: 14, T4: 18, T5: 21, T6: 30,
    });
  });

  it("says which step is due for a given start time", () => {
    expect(selectDueSequenceStep(state("memo_lead"), at(1, 23))).toBeNull();
    expect(selectDueSequenceStep(state("memo_lead"), at(2))?.key).toBe("L1");
    expect(selectDueSequenceStep(state("trial"), at(0))?.key).toBe("T0");
    expect(
      selectDueSequenceStep(state("trial", { sentKeys: ["T0", "T1", "T2", "T3"] }), at(18))?.key,
    ).toBe("T4");
    // Nothing is due before the sequence starts or for an unparseable start.
    expect(selectDueSequenceStep(state("trial"), at(-1))).toBeNull();
    expect(selectDueSequenceStep(state("trial", { startAt: "nope" }), at(3))).toBeNull();
  });

  it("stops after the last step", () => {
    const { sentKeys } = simulate("trial", 30);
    expect(selectDueSequenceStep(state("trial", { sentKeys }), at(31))).toBeNull();
    expect(selectDueSequenceStep(state("trial", { sentKeys }), at(400))).toBeNull();
  });
});

describe("idempotency", () => {
  it("never repeats a step on re-runs", () => {
    for (const sequence of ["memo_lead", "trial"] as const) {
      const sentKeys: string[] = [];
      for (let day = 0; day <= 40; day++) {
        // Three overlapping runs a day; the log is updated after each send.
        for (let run = 0; run < 3; run++) {
          const step = selectDueSequenceStep(state(sequence, { sentKeys }), at(day, run));
          if (step) sentKeys.push(step.key);
        }
      }
      expect(sentKeys).toEqual(SEQUENCE_STEPS[sequence].map((s) => s.key));
      expect(new Set(sentKeys).size).toBe(sentKeys.length);
    }
  });

  it("sends at most one step per run", () => {
    // Day 7 with nothing sent: T0 and T1 are past their windows, T2 is due.
    expect(selectDueSequenceStep(state("trial"), at(7))?.key).toBe("T2");
  });

  it("does not welcome an account the legacy welcome already reached", () => {
    expect(selectDueSequenceStep(state("trial", { sentKeys: ["welcome"] }), at(0))).toBeNull();
    expect(expiredSequenceKeys(state("trial", { sentKeys: ["welcome"] }), at(5))).not.toContain("T0");
  });
});

describe("catch-up guard", () => {
  it("sends a step late only within the grace window", () => {
    expect(selectDueSequenceStep(state("memo_lead"), at(2 + STEP_GRACE_DAYS))?.key).toBe("L1");
    // One day later L1's window has closed: the run moves on to L2 (due that
    // day) and L1 is reported for retirement instead of being sent late.
    expect(selectDueSequenceStep(state("memo_lead"), at(3 + STEP_GRACE_DAYS))?.key).toBe("L2");
    expect(expiredSequenceKeys(state("memo_lead"), at(3 + STEP_GRACE_DAYS))).toEqual(["L1"]);
    expect(selectDueSequenceStep(state("trial", { sentKeys: ["T0"] }), at(6))).toBeNull();
  });

  it("never replays the sequence at an account older than it", () => {
    expect(selectDueSequenceStep(state("trial"), at(90))).toBeNull();
    expect(expiredSequenceKeys(state("trial"), at(90))).toEqual(TRIAL_STEPS.map((s) => s.key));
    // Once retired, the keys are in the log and stop being reported.
    const retired = TRIAL_STEPS.map((s) => s.key);
    expect(expiredSequenceKeys(state("trial", { sentKeys: retired }), at(90))).toEqual([]);
  });
});

describe("exits", () => {
  it("exits on conversion — lead to account, trial to paid", () => {
    for (const sequence of ["memo_lead", "trial"] as const) {
      expect(simulate(sequence, 40, { converted: true }).sentKeys).toEqual([]);
    }
    // Converting mid-sequence stops the remaining steps.
    const sentKeys = ["T0", "T1"];
    expect(selectDueSequenceStep(state("trial", { sentKeys, converted: true }), at(7))).toBeNull();
  });

  it("exits on unsubscribe", () => {
    for (const sequence of ["memo_lead", "trial"] as const) {
      expect(simulate(sequence, 40, { unsubscribed: true }).sentKeys).toEqual([]);
    }
  });

  it("does not resurrect missed steps after an exit is reversed", () => {
    // Unsubscribed through day 20: T0–T3 expire; only current steps remain.
    expect(expiredSequenceKeys(state("trial", { unsubscribed: true }), at(20))).toEqual([
      "T0", "T1", "T2", "T3",
    ]);
    expect(selectDueSequenceStep(state("trial"), at(20))?.key).toBe("T4");
  });
});

describe("FUNNEL_SEQUENCES replaces the legacy onboarding emails", () => {
  const user: LifecycleUserState = {
    userId: "u",
    email: "a@b.com",
    signupAt: START,
    confirmed: true,
    lastActivityAt: null,
    plan: "free",
    sentKeys: [],
  };
  it("selects no welcome, drip day, or pro nudge when onboarding is off", () => {
    for (const day of [0, 1, 5, 20, 31, 60]) {
      expect(selectDueLifecycleEmail(user, at(day), { onboarding: false })).toBeNull();
    }
    expect(selectDueLifecycleEmail(user, at(0))?.kind).toBe("welcome");
  });
  it("keeps win-back", () => {
    const inactive = { ...user, lastActivityAt: START };
    expect(selectDueLifecycleEmail(inactive, at(30), { onboarding: false })?.kind).toBe("winback");
  });
});

describe("trial-end annual offer", () => {
  const env = { FUNNEL_SEQUENCES: "on", TRIAL_END_ANNUAL_COUPON: "coupon_abc" };

  it("is open on days 18–23 only", () => {
    expect(isWithinTrialEndOfferWindow(START, at(17, 23))).toBe(false);
    expect(isWithinTrialEndOfferWindow(START, at(18))).toBe(true);
    expect(isWithinTrialEndOfferWindow(START, at(23, 23))).toBe(true);
    expect(isWithinTrialEndOfferWindow(START, at(24))).toBe(false);
    expect(isWithinTrialEndOfferWindow(null, at(20))).toBe(false);
    expect(isWithinTrialEndOfferWindow("2099-01-01T00:00:00Z", at(20))).toBe(false);
  });

  it("covers both emails that mention it", () => {
    // T4 can send on days 18–20 and T5 on days 21–23.
    for (const step of TRIAL_STEPS.filter((s) => s.key === "T4" || s.key === "T5")) {
      expect(isWithinTrialEndOfferWindow(START, at(step.day))).toBe(true);
      expect(isWithinTrialEndOfferWindow(START, at(step.day + STEP_GRACE_DAYS))).toBe(true);
    }
  });

  it("applies the coupon to Pro annual inside the window and nothing else", () => {
    const resolve = (planSlug: string, day: number, e: Record<string, string | undefined> = env) =>
      resolveTrialEndAnnualCoupon({ planSlug, trialStartedAt: START, now: at(day), env: e });
    expect(resolve("pro_annual", 19)).toBe("coupon_abc");
    expect(resolve("pro_annual", 17)).toBeNull();
    expect(resolve("pro_annual", 24)).toBeNull();
    expect(resolve("pro_monthly", 19)).toBeNull();
    expect(resolve("agent_pro_annual", 19)).toBeNull();
    expect(resolve("pro_annual", 19, { ...env, FUNNEL_SEQUENCES: "off" })).toBeNull();
    expect(resolve("pro_annual", 19, { FUNNEL_SEQUENCES: "on" })).toBeNull();
    expect(
      resolveTrialEndAnnualCoupon({ planSlug: "pro_annual", trialStartedAt: null, now: at(19), env }),
    ).toBeNull();
  });

  it("is only advertised when checkout can apply it", () => {
    expect(trialEndOfferConfigured(env)).toBe(true);
    expect(trialEndOfferConfigured({ FUNNEL_SEQUENCES: "on" })).toBe(false);
    expect(trialEndOfferConfigured({ TRIAL_END_ANNUAL_COUPON: "c" })).toBe(false);
  });
});

describe("sequence emails", () => {
  const SITE = "https://usetruecap.com";
  const UNSUB = "https://usetruecap.com/email/unsubscribe?token=abc";
  const POSTAL = "123 Example St, Philadelphia, PA 19103";
  const base = { siteUrl: SITE, unsubscribeUrl: UNSUB, postalAddress: POSTAL };

  const all = (["memo_lead", "trial"] as const).flatMap((sequence) =>
    SEQUENCE_STEPS[sequence].flatMap((step) =>
      (["investor", "agent"] as const).map((variant) => ({ sequence, stepKey: step.key, variant })),
    ),
  );

  it.each(all)("$stepKey ($variant) renders text + HTML with one CTA and a compliant footer", async (c) => {
    const out = await renderSequenceEmail({ ...base, ...c, tokens: {} });
    expect(out).not.toBeNull();
    expect(out!.subject.length).toBeLessThan(50);
    expect(out!.html).toContain("<html");
    // UTM-tagged CTA, present once in each part.
    const cta = new URL(out!.ctaUrl);
    expect(cta.origin).toBe(SITE);
    expect(cta.searchParams.get("utm_source")).toBe("lifecycle");
    expect(cta.searchParams.get("utm_medium")).toBe("email");
    expect(cta.searchParams.get("utm_campaign")).toBe(c.sequence);
    expect(cta.searchParams.get("utm_content")).toBe(c.stepKey.toLowerCase());
    expect(out!.text.split(out!.ctaUrl)).toHaveLength(2);
    // Footer: unsubscribe + postal address, in both parts.
    expect(out!.text).toContain(`Unsubscribe: ${UNSUB}`);
    // A memo lead has no account: no account line, no settings link.
    const isLead = c.sequence === "memo_lead";
    expect(out!.text.includes("because you have a TrueCap account")).toBe(!isLead);
    expect(out!.html.includes("/settings")).toBe(!isLead);
    expect(out!.text).toContain(POSTAL);
    expect(out!.html).toContain("Unsubscribe");
    expect(out!.html).toContain("123 Example St");
    // No unresolved tokens leak into the email.
    expect(out!.text).not.toMatch(/\{\{|\}\}/);
    expect(out!.html).not.toMatch(/\{\{|\}\}/);
  });

  it("personalizes with the recipient's own numbers when it has them", async () => {
    const sentence = "Rent is the assumption most likely to break this deal.";
    const withDeal = await renderSequenceEmail({
      ...base, sequence: "memo_lead", stepKey: "L1", variant: "investor",
      tokens: { address: "12 Main St", breaker_sentence: sentence },
    });
    expect(withDeal!.text).toContain("12 Main St");
    expect(withDeal!.text).toContain(sentence);
    const without = await renderSequenceEmail({
      ...base, sequence: "memo_lead", stepKey: "L1", variant: "investor", tokens: {},
    });
    expect(without!.text).not.toContain("You screened");
  });

  it("mentions the annual offer only when the offer token is set", async () => {
    const render = (tokens: Record<string, string>) =>
      renderSequenceEmail({ ...base, sequence: "trial", stepKey: "T4", variant: "investor", tokens });
    expect((await render({ trial_offer: "yes", offer_ends: "October 24" }))!.text).toContain(
      "50% off for your first year until October 24",
    );
    expect((await render({}))!.text).not.toContain("50% off");
    // Pro annual only: the agent variant never mentions it.
    const agent = await renderSequenceEmail({
      ...base, sequence: "trial", stepKey: "T4", variant: "agent",
      tokens: { trial_offer: "yes", offer_ends: "October 24" },
    });
    expect(agent!.text).not.toContain("50% off");
  });

  it("switches the CTA for a recipient with no saved deal", async () => {
    const render = (hasDeal: boolean) =>
      renderSequenceEmail({
        ...base, sequence: "trial", stepKey: "T3", variant: "investor",
        tokens: hasDeal ? { has_deal: "yes" } : {}, hasDeal,
      });
    expect(new URL((await render(true))!.ctaUrl).pathname).toBe("/dashboard/saved-analyses");
    expect(new URL((await render(false))!.ctaUrl).pathname).toBe("/sample-decision-memo");
  });

  it("drops a paragraph rather than sending it with a missing value", () => {
    expect(resolveParagraph("At {{address}}.", {})).toBeNull();
    expect(resolveParagraph("At {{address}}.", { address: "12 Main St" })).toBe("At 12 Main St.");
    expect(resolveParagraph({ if: "x", text: "shown" }, {})).toBeNull();
    expect(resolveParagraph({ unless: "x", text: "shown" }, {})).toBe("shown");
    expect(resolveParagraph({ unless: "x", text: "shown" }, { x: "1" })).toBeNull();
  });

  it("returns null for an unknown step", async () => {
    expect(
      await renderSequenceEmail({ ...base, sequence: "trial", stepKey: "T9", variant: "investor", tokens: {} }),
    ).toBeNull();
    expect(buildSequenceCtaUrl(SITE, "/pricing", "trial", "T4")).toBe(
      "https://usetruecap.com/pricing?utm_source=lifecycle&utm_medium=email&utm_campaign=trial&utm_content=t4",
    );
  });
});

describe("cron reads are never truncated", () => {
  it("pages through every row and fails closed on an error", async () => {
    const { fetchAllRows } = await import("@/lib/email/sequence-cron");
    const all = Array.from({ length: 2500 }, (_, i) => ({ id: i }));
    const calls: Array<[number, number]> = [];
    const rows = await fetchAllRows<{ id: number }>(async (from, to) => {
      calls.push([from, to]);
      return { data: all.slice(from, to + 1), error: null };
    });
    expect(rows).toHaveLength(2500);
    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
    expect(await fetchAllRows(async () => ({ data: null, error: { code: "x" } }))).toBeNull();
    // A failure on a later page discards the partial read.
    expect(
      await fetchAllRows(async (from) =>
        from === 0 ? { data: all.slice(0, 1000), error: null } : { data: null, error: {} },
      ),
    ).toBeNull();
  });
});
