"use client";

/**
 * Lead-capture form shown on a co-branded /d/[encoded] share page (T6).
 *
 * A viewer of an agent's branded deal submits their contact; it is stored for
 * the agent via captureDealLeadAction (and emails the agent when
 * LEAD_NOTIFICATIONS_MODE=live). This is the monetization half of the Agent
 * Loop - the reason an agent pays for Pro.
 */

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, Check, Send } from "lucide-react";
import { captureDealLeadAction } from "@/app/actions/capture-deal-lead";
import { trackEvent } from "@/lib/analytics";

export function LeadCaptureForm({
  ownerId,
  dealId,
  valuesHash,
  sig,
  agentName,
  dealAddress,
  accentColor,
}: {
  ownerId: string;
  /** Signed attribution from the share payload ({ownerId, dealId, valuesHash}
   *  HMAC'd with SHARE_LINK_SECRET). The /d page verifies it before rendering
   *  this form; we forward it so the server action can verify it again on the
   *  write path instead of trusting a bare ownerId from the request body. */
  dealId?: string | null;
  valuesHash: string;
  sig?: string | null;
  agentName: string;
  dealAddress?: string;
  accentColor?: string | null;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  // Honeypot — hidden from humans; bots that fill it are silently dropped.
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    trackEvent("lead_form_shown", { owner_present: true });
  }, []);

  const accent = accentColor && /^#[0-9A-Fa-f]{6}$/.test(accentColor) ? accentColor : "var(--primary)";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError("");
    const res = await captureDealLeadAction({
      ownerId,
      dealId: dealId ?? undefined,
      valuesHash,
      sig: sig ?? undefined,
      email,
      name: name || undefined,
      message: message || undefined,
      dealAddress,
      website: website || undefined,
    });
    if (res.ok) {
      setStatus("done");
      trackEvent("lead_captured", { has_message: Boolean(message.trim()) });
    } else {
      setStatus("error");
      setError(res.message);
    }
  }

  if (status === "done") {
    return (
      <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-center sm:p-6">
        <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-[var(--metric-positive)]/15">
          <Check className="size-5 text-[var(--metric-positive)]" />
        </div>
        <p className="font-bold text-foreground">Thanks - {agentName} will be in touch.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your message was sent. Expect a reply at the email you provided.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 rounded-2xl border-2 p-5 sm:p-6" style={{ borderColor: accent }}>
      <h2 className="text-lg font-extrabold text-foreground">Interested in this deal?</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Send {agentName} a message and they will follow up with you directly.
      </p>
      {/* Honeypot: off-screen, not tabbable, not autofilled. Real users never
          see or fill it; bots that auto-fill every field trip it. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          aria-label="Your email"
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (optional)"
          aria-label="Your name"
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
        />
      </div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Anything you would like to ask? (optional)"
        rows={3}
        aria-label="Message"
        className="mt-3 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
      />
      {status === "error" ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        style={{ background: accent }}
      >
        {status === "sending" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Send to {agentName}
      </button>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        By sending, you agree to share your contact details with {agentName} so they can respond. Your
        info is not used for anything else.
      </p>
    </form>
  );
}
