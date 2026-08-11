"use client";

/**
 * Agent Pro white-label embed generator — settings card. SELF-HIDING: the
 * calculator options load only for a user with the `embed_whitelabel`
 * entitlement (the action returns options for anyone, but the snippet action
 * gates, so we probe entitlement by attempting a snippet on first pick and
 * hide on ENTITLEMENT_REQUIRED). Renders null until we know the user qualifies,
 * matching the invisible-until-useful principle.
 *
 * Pick a calculator → get a ready-to-paste <iframe> under your brand.
 */

import { useEffect, useState, useTransition } from "react";
import { Check, Code2, Copy } from "lucide-react";
import {
  getWhitelabelEmbedSnippetAction,
  listWhitelabelEmbedOptions,
  type EmbedOption,
} from "@/app/actions/whitelabel-embed";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function WhitelabelEmbedCard() {
  const { toast } = useToast();
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [options, setOptions] = useState<EmbedOption[]>([]);
  const [slug, setSlug] = useState<string>("");
  const [snippet, setSnippet] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isBusy, startBusy] = useTransition();

  // Probe eligibility once: try to generate a snippet for the first embeddable
  // calculator. ENTITLEMENT_REQUIRED → not Agent Pro → hide the whole card.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const opts = await listWhitelabelEmbedOptions();
        if (cancelled || opts.length === 0) {
          if (!cancelled) setEligible(false);
          return;
        }
        const probe = await getWhitelabelEmbedSnippetAction({ slug: opts[0]!.slug });
        if (cancelled) return;
        if (probe.ok) {
          setEligible(true);
          setOptions(opts);
          setSlug(opts[0]!.slug);
          setSnippet(probe.snippet);
        } else if (probe.code === "BRANDING_REQUIRED" || probe.code === "NOT_CONFIGURED") {
          // Entitled, but not ready — still show the card so the user knows the
          // feature exists and what's missing.
          setEligible(true);
          setOptions(opts);
          setSlug(opts[0]!.slug);
          setSnippet(null);
        } else {
          setEligible(false); // ENTITLEMENT_REQUIRED / SIGN_IN_REQUIRED / error
        }
      } catch {
        if (!cancelled) setEligible(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (eligible !== true) return null;

  const regenerate = (nextSlug: string) => {
    setSlug(nextSlug);
    setSnippet(null);
    setCopied(false);
    startBusy(async () => {
      const r = await getWhitelabelEmbedSnippetAction({ slug: nextSlug });
      if (r.ok) {
        setSnippet(r.snippet);
      } else {
        toast({ title: "Couldn't build the embed", description: r.message, variant: r.code === "BRANDING_REQUIRED" ? "default" : "destructive" });
      }
    });
  };

  const copy = () => {
    if (!snippet) return;
    void navigator.clipboard
      .writeText(snippet)
      .then(() => {
        setCopied(true);
        toast({ title: "Embed code copied", description: "Paste it into your site's HTML." });
        setTimeout(() => setCopied(false), 2500);
      })
      .catch(() => toast({ title: "Couldn't copy", variant: "destructive" }));
  };

  return (
    <section aria-label="White-label embed" className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Code2 className="size-4 text-primary" />
        <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">White-label embed</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Put a TrueCap calculator on your own site under your brand — no &ldquo;Powered by TrueCap&rdquo;.
        Uses the name, logo, and color from your Branding page.
      </p>

      <div className="mt-3 space-y-3">
        <div className="space-y-1">
          <label htmlFor="wl-embed-calc" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Calculator
          </label>
          <select
            id="wl-embed-calc"
            value={slug}
            onChange={(e) => regenerate(e.target.value)}
            disabled={isBusy}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            {options.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.title}
              </option>
            ))}
          </select>
        </div>

        {snippet ? (
          <div className="space-y-2">
            <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 text-[11px] leading-relaxed text-foreground">
              <code>{snippet}</code>
            </pre>
            <Button type="button" size="sm" onClick={copy} disabled={isBusy} className="gap-1.5">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy embed code"}
            </Button>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            Add your company or contact name on the{" "}
            <a href="/settings/branding" className="font-semibold text-primary hover:underline">
              Branding page
            </a>{" "}
            first — that&rsquo;s the brand your embed will wear.
          </p>
        )}
      </div>
    </section>
  );
}
