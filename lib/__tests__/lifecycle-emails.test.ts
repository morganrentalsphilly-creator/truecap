import { describe, it, expect } from "vitest";
import {
  selectDueLifecycleEmail,
  selectDueLifecycleEmails,
  expiredDripKeys,
  contentKeyFor,
  daysBetween,
  DRIP_CATCH_UP_GRACE_DAYS,
  MAX_DRIP_DAY,
  type LifecycleUserState,
} from "@/lib/lifecycle-emails";

const NOW = new Date("2026-06-20T12:00:00Z");
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY).toISOString();

function user(overrides: Partial<LifecycleUserState> = {}): LifecycleUserState {
  return {
    userId: "u1",
    email: "investor@example.com",
    signupAt: daysAgo(0),
    confirmed: true,
    lastActivityAt: null,
    plan: "free",
    sentKeys: [],
    ...overrides,
  };
}

describe("daysBetween", () => {
  it("counts whole days and is robust to bad input", () => {
    expect(daysBetween(daysAgo(3), NOW)).toBe(3);
    expect(daysBetween("not-a-date", NOW)).toBe(0);
  });
});

describe("selectDueLifecycleEmail", () => {
  it("sends welcome first once the account is confirmed", () => {
    const due = selectDueLifecycleEmail(user(), NOW);
    expect(due?.kind).toBe("welcome");
    expect(due?.key).toBe("welcome");
  });

  it("sends nothing before confirmation", () => {
    expect(selectDueLifecycleEmail(user({ confirmed: false }), NOW)).toBeNull();
  });

  it("sends the earliest unsent drip day that is due", () => {
    const due = selectDueLifecycleEmail(
      user({ signupAt: daysAgo(3), sentKeys: ["welcome"] }),
      NOW
    );
    expect(due?.kind).toBe("drip");
    expect(due?.dripDay).toBe(1);
  });

  it("advances the drip as earlier days are logged", () => {
    const due = selectDueLifecycleEmail(
      user({ signupAt: daysAgo(5), sentKeys: ["welcome", "drip_1"] }),
      NOW
    );
    expect(due?.dripDay).toBe(2);
  });

  it("does not send a drip day that is not yet due", () => {
    // signed up today, welcome already sent -> no drip day <= 0, no nudge, no winback
    expect(selectDueLifecycleEmail(user({ sentKeys: ["welcome"] }), NOW)).toBeNull();
  });

  const allDrips = Array.from({ length: 30 }, (_, i) => `drip_${i + 1}`);

  it("sends the Pro nudge to free users after the drip completes", () => {
    const due = selectDueLifecycleEmail(
      user({ signupAt: daysAgo(31), sentKeys: ["welcome", ...allDrips] }),
      NOW
    );
    expect(due?.kind).toBe("pro_nudge");
  });

  it("never sends the Pro nudge to paid users", () => {
    const due = selectDueLifecycleEmail(
      user({ plan: "paid", signupAt: daysAgo(31), sentKeys: ["welcome", ...allDrips] }),
      NOW
    );
    expect(due).toBeNull();
  });

  it("sends win-back once a user goes inactive", () => {
    const sent = [
      "welcome",
      ...Array.from({ length: 30 }, (_, i) => `drip_${i + 1}`),
      "pro_nudge",
    ];
    const due = selectDueLifecycleEmail(
      user({ signupAt: daysAgo(60), lastActivityAt: daysAgo(25), sentKeys: sent }),
      NOW
    );
    expect(due?.kind).toBe("winback");
    expect(due?.key).toBe("winback_21d");
  });

  it("never repeats an email already logged (idempotent)", () => {
    const sent = [
      "welcome",
      ...Array.from({ length: 30 }, (_, i) => `drip_${i + 1}`),
      "pro_nudge",
      "winback_21d",
    ];
    const due = selectDueLifecycleEmail(
      user({ signupAt: daysAgo(60), lastActivityAt: daysAgo(25), sentKeys: sent }),
      NOW
    );
    expect(due).toBeNull();
  });
});

describe("drip catch-up guard (window = day + grace)", () => {
  const drips = (n: number) => Array.from({ length: n }, (_, i) => `drip_${i + 1}`);

  it("fresh user: day 1 is in-window and sends", () => {
    const due = selectDueLifecycleEmail(
      user({ signupAt: daysAgo(1), sentKeys: ["welcome"] }),
      NOW
    );
    expect(due?.kind).toBe("drip");
    expect(due?.dripDay).toBe(1);
  });

  it("mid-window user on cadence keeps advancing day by day", () => {
    const due = selectDueLifecycleEmail(
      user({ signupAt: daysAgo(10), sentKeys: ["welcome", ...drips(9)] }),
      NOW
    );
    expect(due?.dripDay).toBe(10);
  });

  it("day N still sends at the window boundary (age = N + grace)…", () => {
    const due = selectDueLifecycleEmail(
      user({
        signupAt: daysAgo(1 + DRIP_CATCH_UP_GRACE_DAYS),
        sentKeys: ["welcome"],
      }),
      NOW
    );
    expect(due?.dripDay).toBe(1);
  });

  it("…and one day past the boundary it skips to the next in-window day", () => {
    const due = selectDueLifecycleEmail(
      user({
        signupAt: daysAgo(2 + DRIP_CATCH_UP_GRACE_DAYS),
        sentKeys: ["welcome"],
      }),
      NOW
    );
    // day 1 expired (age > 1 + grace); day 2 is the earliest in-window day.
    expect(due?.dripDay).toBe(2);
  });

  it("a user who completed the drip on cadence still gets the final day", () => {
    const due = selectDueLifecycleEmail(
      user({ signupAt: daysAgo(MAX_DRIP_DAY), sentKeys: ["welcome", ...drips(29)] }),
      NOW
    );
    expect(due?.dripDay).toBe(MAX_DRIP_DAY);
  });

  it("past-window April-style user (mid-drip, age 85) receives NO further drip days", () => {
    // Signed up long before the drip went live; days 1..24 were already
    // blasted daily. Every remaining day is past-window: the next email
    // must not be a drip (free users fall through to the one-time nudge).
    const due = selectDueLifecycleEmail(
      user({ signupAt: daysAgo(85), sentKeys: ["welcome", ...drips(24)] }),
      NOW
    );
    expect(due?.kind).toBe("pro_nudge");
  });

  it("past-window PAID April-style user gets nothing at all", () => {
    const due = selectDueLifecycleEmail(
      user({ plan: "paid", signupAt: daysAgo(85), sentKeys: ["welcome", ...drips(24)] }),
      NOW
    );
    expect(due).toBeNull();
  });

  it("paid users never receive drip days even in-window (Pro-conversion drip)", () => {
    const due = selectDueLifecycleEmail(
      user({ plan: "paid", signupAt: daysAgo(3), sentKeys: ["welcome"] }),
      NOW
    );
    expect(due).toBeNull();
  });

  it("welcome still goes to paid users", () => {
    const due = selectDueLifecycleEmail(user({ plan: "paid" }), NOW);
    expect(due?.kind).toBe("welcome");
  });
});

describe("expiredDripKeys", () => {
  const drips = (n: number) => Array.from({ length: n }, (_, i) => `drip_${i + 1}`);

  it("is empty for a fresh user (nothing expired yet)", () => {
    expect(expiredDripKeys(user({ signupAt: daysAgo(3) }), NOW)).toEqual([]);
    expect(
      expiredDripKeys(user({ signupAt: daysAgo(1 + DRIP_CATCH_UP_GRACE_DAYS) }), NOW)
    ).toEqual([]);
  });

  it("reports day 1 once its window has passed", () => {
    expect(
      expiredDripKeys(
        user({ signupAt: daysAgo(2 + DRIP_CATCH_UP_GRACE_DAYS), sentKeys: ["welcome"] }),
        NOW
      )
    ).toEqual(["drip_1"]);
  });

  it("April-style user: every unsent day is expired, sent days are excluded", () => {
    const expired = expiredDripKeys(
      user({ signupAt: daysAgo(85), sentKeys: ["welcome", ...drips(24)] }),
      NOW
    );
    expect(expired).toEqual(["drip_25", "drip_26", "drip_27", "drip_28", "drip_29", "drip_30"]);
  });

  it("very old account with no drips sent expires all 30 days", () => {
    expect(expiredDripKeys(user({ signupAt: daysAgo(400) }), NOW)).toHaveLength(MAX_DRIP_DAY);
  });

  it("applies to paid users too (time-based, so a downgrade can't resurrect stale days)", () => {
    const expired = expiredDripKeys(
      user({ plan: "paid", signupAt: daysAgo(85), sentKeys: ["welcome", ...drips(24)] }),
      NOW
    );
    expect(expired).toEqual(["drip_25", "drip_26", "drip_27", "drip_28", "drip_29", "drip_30"]);
  });

  it("is empty for unconfirmed users", () => {
    expect(
      expiredDripKeys(user({ confirmed: false, signupAt: daysAgo(85) }), NOW)
    ).toEqual([]);
  });

  it("already-retired keys (present in sentKeys) are not reported again", () => {
    const expired = expiredDripKeys(
      user({
        signupAt: daysAgo(85),
        sentKeys: ["welcome", ...drips(24), "drip_25", "drip_26", "drip_27", "drip_28", "drip_29", "drip_30"],
      }),
      NOW
    );
    expect(expired).toEqual([]);
  });
});

describe("selectDueLifecycleEmails + contentKeyFor", () => {
  it("maps a batch and resolves content keys", () => {
    const due = selectDueLifecycleEmails(
      [
        user({ userId: "a", sentKeys: [] }), // welcome
        user({ userId: "b", signupAt: daysAgo(2), sentKeys: ["welcome"] }), // drip_1
        user({ userId: "c", confirmed: false }), // nothing
      ],
      NOW
    );
    expect(due.map((d) => d.userId)).toEqual(["a", "b"]);
    expect(contentKeyFor(due[0]!)).toBe("welcome");
    expect(contentKeyFor(due[1]!)).toBe("day-01");
  });
});
