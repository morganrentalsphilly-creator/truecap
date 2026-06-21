import { describe, it, expect } from "vitest";
import {
  selectDueLifecycleEmail,
  selectDueLifecycleEmails,
  contentKeyFor,
  daysBetween,
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
