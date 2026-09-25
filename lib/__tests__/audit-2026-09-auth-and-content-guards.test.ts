import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/**
 * 2026-09 production-readiness audit, Batches C (auth/billing) and D
 * (blog/tools/embeds). Each guard pins the behaviour the fix introduced, so a
 * refactor that quietly restores the old path fails here.
 */
describe("sign-up with email confirmation holds a sent state", () => {
  const form = read("components/auth/sign-up-form.tsx");

  it("does not navigate when there is no session yet", () => {
    const branch = form.indexOf("if (result.needsEmailConfirmation) {");
    expect(branch).toBeGreaterThan(-1);
    const body = form.slice(branch, form.indexOf("}", branch));
    expect(body).toContain("setConfirmationSentTo(values.email.trim())");
    expect(body).toContain("return;");
    expect(body).not.toContain("router.push");
  });

  it("offers a resend and a free path from the sent state", () => {
    expect(form).toContain("resendConfirmationAction(");
    expect(form).toMatch(/if \(confirmationSentTo\) \{[\s\S]*role="status"[\s\S]*Resend the confirmation email/);
    expect(form).toMatch(/if \(confirmationSentTo\) \{[\s\S]*href="\/analyze"/);
  });

  it("states the password rule where the field is and pins policy errors to it", () => {
    expect(form).toContain('id="password-policy"');
    expect(form).toContain("At least 8 characters.");
    expect(form).toContain('form.setError("password", { message: result.message })');
  });

  it("announces a rejected sign-up inline instead of toast-only", () => {
    expect(form).toMatch(/\{submitError \? \(\s*<div\s+role="alert"/);
    expect(form).not.toMatch(/title: "Sign up failed",\s*description: result\.message/);
  });

  it("claims a reviewed plan only when a plan CTA brought the visitor", () => {
    expect(form).toContain("const reviewedPlanFromQuery =");
    expect(form).toMatch(/\{reviewedPlanFromQuery \? \([\s\S]*Plan you reviewed/);
  });
});

describe("sign-in failures are announced inline", () => {
  it("renders a role=alert panel and no longer toasts the raw message", () => {
    const form = read("components/auth/login-form.tsx");
    expect(form).toMatch(/\{signInError \? \(\s*<div\s+role="alert"/);
    expect(form).not.toMatch(/title: "Sign in failed",\s*description: result\.message/);
  });

  it("maps rate limits and password-policy rejections to complete sentences", () => {
    const actions = read("app/actions/auth.ts");
    expect(actions).toContain("Too many attempts in a row. Wait a minute and try again.");
    expect(actions).toContain('m.startsWith("password should")');
  });
});

describe("billing and trial surfaces say one thing once", () => {
  it("the billing panel has a single cancellation status line", () => {
    const panel = read("components/profile/billing-panel.tsx");
    expect(panel).not.toContain("Cancels at period end");
    expect(panel).not.toContain("Cancellation scheduled\n");
    expect(panel).not.toContain("Your subscription will end on");
    expect(panel).toContain("Your saved deals stay readable after that");
  });

  it("the signed-in analyzer shows the trial budget only while an evaluation is active", () => {
    const strip = read("components/dashboard/trial-allowance-strip.tsx");
    expect(strip).toContain('if (!access || access.kind !== "evaluation") return null;');
    const page = read("app/dashboard/new/page.tsx");
    expect(page).toContain("getProductEvaluationAccessForUser(supabase, user.id)");
    expect(page).toContain("<TrialAllowanceStrip access={evaluationAccess} />");
  });

  it("the pricing card carries no evaluation pill beside the price", () => {
    const pricing = read("components/marketing/pricing-toggle-plans.tsx");
    expect(pricing).not.toContain("evaluationBadge");
    expect(pricing).not.toContain("★ Best value");
  });

  it("the auth shell shows one logo per breakpoint and no medallion", () => {
    const shell = read("components/auth/auth-shell.tsx");
    expect(shell).not.toContain("Building2");
    expect(shell).toMatch(/text-center sm:mb-12 lg:hidden">\s*<AppLogo/);
  });
});

describe("embed snippets are canonical-origin only", () => {
  it("the hub renders EmbedCodeBlock only when getSiteUrl() is the canonical host", () => {
    const hub = read("app/embed/page.tsx");
    expect(hub).toContain("const snippetsAvailable = snippetHost === CANONICAL_HOST;");
    expect(hub).toMatch(/\{snippetsAvailable \? \(\s*<EmbedCodeBlock/);
    expect(hub.match(/<EmbedCodeBlock/g)).toHaveLength(1);
  });
});

describe("article tables survive a 375px viewport", () => {
  it("two-column tables have no fixed minimum width; wider tables pin their first column and cue the scroll", () => {
    const offenders: string[] = [];
    for (const slug of readdirSync(join(process.cwd(), "app/blog"), { withFileTypes: true })) {
      if (!slug.isDirectory()) continue;
      let source = "";
      try {
        source = read(`app/blog/${slug.name}/page.tsx`);
      } catch {
        continue;
      }
      for (const match of source.matchAll(/<ScrollX([^>]*)>\s*<table([^>]*)>([\s\S]*?)<\/table>/g)) {
        const head = /<thead>([\s\S]*?)<\/thead>/.exec(match[3]);
        if (!head) continue;
        const columns = (head[1].match(/<th\b/g) ?? []).length;
        if (columns === 2 && /min-w-\[/.test(match[2])) {
          offenders.push(`${slug.name}: two-column table keeps a min-width`);
        }
        if (columns >= 3 && !/stickyFirstColumn/.test(match[1])) {
          offenders.push(`${slug.name}: ${columns}-column table without stickyFirstColumn`);
        }
        if (columns >= 3 && !/\bcue\b/.test(match[1])) {
          offenders.push(`${slug.name}: ${columns}-column table without a scroll cue`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("ScrollX renders the cue only while the region overflows", () => {
    const scrollX = read("components/ui/scroll-x.tsx");
    expect(scrollX).toMatch(/\{scrollable \? \(\s*<p className="mt-1 text-2xs text-muted-foreground sm:hidden">\s*Scroll for more/);
    expect(scrollX).toContain("[&_table_td:first-child]:sticky");
  });
});

describe("free tool widgets", () => {
  it("clamp a negative mortgage rate instead of paying the borrower", () => {
    const widget = read("components/tools/mortgage-payment-widget.tsx");
    expect(widget).toContain("interestRate: Math.max(0, num(rateInput))");
  });

  it("render every hero result in the numeral token", () => {
    const sans: string[] = [];
    for (const file of readdirSync(join(process.cwd(), "components/tools"))) {
      if (!file.endsWith("-widget.tsx")) continue;
      const source = read(`components/tools/${file}`);
      for (const match of source.matchAll(/"([^"]*text-(?:4xl|5xl)[^"]*font-extrabold[^"]*)"/g)) {
        if (!/font-mono/.test(match[1])) sans.push(`${file}: ${match[1]}`);
      }
    }
    expect(sans).toEqual([]);
  });
});
