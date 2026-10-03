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
    // The rule is a FormDescription under the field. It used to carry a
    // hand-set id that the input named in a hand-set aria-describedby, which
    // kept a rejected password out of the field's description (audit row
    // P2-73). FormControl now lists both; form-control-described-by.test.tsx
    // holds that.
    expect(form).toMatch(/<FormDescription>\s*\{PASSWORD_POLICY_TEXT\}\s*<\/FormDescription>/);
    expect(form).toContain("{PASSWORD_POLICY_TEXT}");
    const schema = read("lib/auth-schema.ts");
    expect(schema).toContain('.min(12, "Password must be at least 12 characters")');
    expect(schema.match(/password: passwordSchema/g)).toHaveLength(2);
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
    // One AppLogo for every width (the photo aside that carried a second one
    // is gone), so no breakpoint can show the mark twice.
    expect(shell.match(/<AppLogo\b/g)).toHaveLength(1);
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
      for (const match of source.matchAll(/<(ScrollX|ArticleTable)([^>]*)>\s*<table([^>]*)>([\s\S]*?)<\/table>/g)) {
        const [, wrapper, props, tableProps, body] = match;
        const head = /<thead>([\s\S]*?)<\/thead>/.exec(body);
        if (!head) continue;
        const columns = (head[1].match(/<th\b/g) ?? []).length;
        // ArticleTable always cues, and pins unless stickyFirstColumn={false}.
        const pinned = wrapper === "ArticleTable" ? !/stickyFirstColumn=\{false\}/.test(props) : /stickyFirstColumn/.test(props);
        const cued = wrapper === "ArticleTable" || /\bcue\b/.test(props);
        if (columns === 2 && /min-w-\[/.test(tableProps)) offenders.push(`${slug.name}: two-column table keeps a min-width`);
        if (columns >= 3 && !pinned) offenders.push(`${slug.name}: ${columns}-column table without stickyFirstColumn`);
        if (columns >= 3 && !cued) offenders.push(`${slug.name}: ${columns}-column table without a scroll cue`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("ScrollX renders the cue only while the region overflows", () => {
    const scrollX = read("components/ui/scroll-x.tsx");
    // Design pass (2026-09-30): the caption is 14px Ink 2 (text-2xs is retired),
    // reads "Scroll for more" with no arrow suffix, and no gradient fade sits
    // over the figures. With the fade gone the caption is the only cue, so no
    // breakpoint hides it: it shows at any width where the region overflows,
    // and still only then. The ban covers Tailwind v4's gradient spellings
    // (bg-linear-*, bg-radial-*, bg-conic-*) and color stops, not only v3's
    // bg-gradient-*.
    expect(scrollX).toMatch(/\{scrollable \? \(\s*<p className="mt-1 text-sm text-muted-foreground">\s*Scroll for more\s*<\/p>/);
    expect(scrollX).not.toMatch(/bg-(?:gradient|linear|radial|conic)-|\bfrom-|text-2xs|→/);
    expect(scrollX).toContain("[&_table_td:first-child]:sticky");
  });
});

describe("free tool widgets", () => {
  it("clamp a negative mortgage rate instead of paying the borrower", () => {
    const widget = read("components/tools/mortgage-payment-widget.tsx");
    expect(widget).toContain("interestRate: Math.max(0, num(rateInput))");
  });

  it("render every hero result in the numeral token", async () => {
    const sans: string[] = [];
    const onKeyFigure: string[] = [];
    for (const file of readdirSync(join(process.cwd(), "components/tools"))) {
      if (!file.endsWith("-widget.tsx")) continue;
      const source = read(`components/tools/${file}`);
      // The widgets not yet on the design pass: the figure's own class string.
      for (const match of source.matchAll(/"([^"]*text-(?:4xl|5xl)[^"]*font-extrabold[^"]*)"/g)) {
        if (!/font-mono/.test(match[1])) sans.push(`${file}: ${match[1]}`);
      }
      // Any figure a widget sets at a key-figure size itself is DM Mono too.
      // On <LedgerTotal>/<LedgerFigure> the primitive brings font-mono, so
      // there the class string fails only if it overrides the family (cn
      // would let a later font-sans/-serif/-display win over font-mono).
      for (const match of source.matchAll(/"([^"]*\btext-key(?:-sm)?\b[^"]*)"/g)) {
        const tagStart = source.lastIndexOf("<", match.index);
        const tag = /^<([A-Za-z][\w.]*)/.exec(source.slice(tagStart))?.[1];
        const mono =
          tag === "LedgerTotal" || tag === "LedgerFigure"
            ? !/\bfont-(?:sans|serif|display)\b/.test(match[1])
            : /\bfont-mono\b/.test(match[1]);
        if (!mono) sans.push(`${file}: ${match[1]}`);
      }
      if (/<ToolResult\b/.test(source)) onKeyFigure.push(file);
    }
    expect(sans).toEqual([]);
    // The converted widgets set their result through the shared ToolResult
    // (design pass, 2026-09-30), whose figure is LedgerTotal at the key-figure
    // size. That LedgerTotal renders it in DM Mono is proven by the render
    // below, not by pinning ledger-parts.tsx's class order.
    expect(onKeyFigure).toContain("one-percent-rule-widget.tsx");
    expect(read("components/tools/tool-parts.tsx")).toContain(
      '<LedgerTotal className="text-key-sm sm:text-key">',
    );
    // Rendered, because cn (tailwind-merge) reads text-key-sm as a text color
    // and drops it beside a color class: the figure must keep both key-figure
    // steps, in DM Mono, with figure and unit in one text node (the e2e specs
    // match "1.05%" as one node), with or without a result.
    const { createElement } = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { ToolResult } = await import("@/components/tools/tool-parts");
    for (const pending of [false, true]) {
      const html = renderToStaticMarkup(
        createElement(ToolResult, { label: "Rent / price", figure: "1.05%", pending }),
      );
      const figureClass = /<span class="([^"]*)">1\.05%<\/span>/.exec(html)?.[1];
      expect(figureClass, `pending=${pending}: "1.05%" as one span`).toBeDefined();
      const tokens = (figureClass ?? "").split(/\s+/);
      for (const token of ["font-mono", "tabular-nums", "text-key-sm", "sm:text-key"]) {
        expect(tokens, `pending=${pending}`).toContain(token);
      }
    }
  });
});
