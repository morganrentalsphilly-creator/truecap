/**
 * A Turnstile token works once (go-to-market audit, row P1-41).
 *
 * Supabase checks the captcha before the credentials and Cloudflare rejects a
 * replayed token, so the token is spent by the first server call that carries
 * it. The forms kept one token and sent it again: a wrong password followed by
 * the right one failed with "captcha protection: request disallowed
 * (timeout-or-duplicate)", and "Resend the confirmation email" sent the token
 * the sign-up had already used.
 *
 * The widget now exposes reset(); these cases cover the function behind it
 * (resetCaptcha). The source guards that every form calls reset() live in
 * captcha-coverage.test.ts, and the sentence a captcha rejection gets is in
 * auth-error-captcha.test.ts. Nothing here talks to Cloudflare: it is a fake.
 */
import { describe, expect, it, vi } from "vitest";
import { resetCaptcha } from "@/components/auth/captcha-widget";

/**
 * Turnstile as the forms see it: a widget that hands a token to a callback,
 * and hands over a NEW one some time after reset(). `issue()` plays the part
 * of the challenge finishing.
 */
function fakeTurnstile(onToken: (token: string | null) => void) {
  let issued = 0;
  let pending = 0;
  const resets: string[] = [];
  return {
    resets,
    api: {
      reset(widgetId: string) {
        resets.push(widgetId);
        pending += 1;
      },
    },
    /** The first token, as after render. */
    render() {
      issued += 1;
      onToken(`token-${issued}`);
      return "widget-1";
    },
    /** Finish every challenge reset() started. */
    issue() {
      while (pending > 0) {
        pending -= 1;
        issued += 1;
        onToken(`token-${issued}`);
      }
    },
  };
}

describe("resetCaptcha", () => {
  it("a second attempt carries a fresh token, never the spent one", () => {
    let token: string | null = null;
    const sent: Array<string | undefined> = [];
    const turnstile = fakeTurnstile((next) => {
      token = next;
    });
    const widgetId = turnstile.render();
    // What every form does: send the held token, then reset in `finally`.
    const attempt = () => {
      sent.push(token ?? undefined);
      resetCaptcha(turnstile.api, widgetId, (next) => {
        token = next;
      });
    };

    attempt();
    // Between the reset and the new challenge finishing there is no token, so
    // the forms' `captchaEnabled && !captchaUnavailable && !captchaToken`
    // keeps submit disabled: the spent token cannot go out again.
    expect(token).toBeNull();
    turnstile.issue();
    expect(token).toBe("token-2");
    attempt();
    turnstile.issue();
    attempt();

    expect(sent).toEqual(["token-1", "token-2", "token-3"]);
    expect(new Set(sent).size).toBe(sent.length);
    expect(turnstile.resets).toEqual(["widget-1", "widget-1", "widget-1"]);
  });

  it("reports null before it asks Turnstile for the new token", () => {
    const order: string[] = [];
    resetCaptcha(
      { reset: () => order.push("turnstile.reset") },
      "widget-1",
      (token) => order.push(`onToken(${token})`),
    );
    expect(order).toEqual(["onToken(null)", "turnstile.reset"]);
  });

  it.each([
    ["Turnstile never loaded", undefined, "widget-1"],
    ["the widget has not rendered", { reset: vi.fn() }, null],
  ])("still clears the token when %s", (_label, api, widgetId) => {
    const onToken = vi.fn();
    expect(() => resetCaptcha(api, widgetId, onToken)).not.toThrow();
    expect(onToken).toHaveBeenCalledExactlyOnceWith(null);
    if (api) expect(api.reset).not.toHaveBeenCalled();
  });

  it("swallows a reset on a widget Turnstile already removed", () => {
    const onToken = vi.fn();
    const api = {
      reset: () => {
        throw new Error("Nothing to reset found for provided container");
      },
    };
    expect(() => resetCaptcha(api, "widget-1", onToken)).not.toThrow();
    expect(onToken).toHaveBeenCalledExactlyOnceWith(null);
  });
});
