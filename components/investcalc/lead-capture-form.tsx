"use client";

/**
 * Lead-capture form shown on a co-branded /d/[encoded] share page (T6).
 *
 * A viewer of an agent's branded deal submits their contact; it is stored for
 * the agent via captureDealLeadAction (and emails the agent when
 * LEAD_NOTIFICATIONS_MODE=live). This is the monetization half of the Agent
 * Loop - the reason an agent pays for Pro.
 *
 * What the form says must match what happens to the message (2026-10
 * go-to-market audit, row P1-67). It is always saved to the agent's dashboard.
 * It is emailed to the agent only while LEAD_NOTIFICATIONS_MODE is live, which
 * the server-rendered share shell reads and passes in as `agentEmailed`. So
 * the copy never promises a reply, says the agent was emailed only when that
 * is on, and shows the agent's own contact details, which the share page
 * already loads, so a client is not left waiting on a message nobody was told
 * about.
 */

import { useEffect, useRef, useState, type FormEvent } from "react";
import * as Sentry from "@sentry/nextjs";
import { Loader2, Check, Send } from "lucide-react";
import { captureDealLeadAction } from "@/app/actions/capture-deal-lead";
import { trackEvent } from "@/lib/analytics";

/** The agent's public contact details from their branding (lib/agent-share.ts). */
export type LeadFormAgentContact = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
};

type ContactLink = { key: string; href: string; label: string };

/**
 * Turns the saved contact fields into links. Each is checked again here even
 * though lib/branding-values.ts validates on save: a row saved before that
 * validation existed must not become a javascript: or data: link on a public
 * page.
 */
export function agentContactLinks(
  contact: LeadFormAgentContact | null | undefined,
): ContactLink[] {
  if (!contact) return [];
  const links: ContactLink[] = [];

  const phone = contact.phone?.trim() ?? "";
  const dial = phone.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  if (phone && phone.length <= 40 && dial.replace(/\D/g, "").length >= 7) {
    links.push({ key: "phone", href: `tel:${dial}`, label: phone });
  }

  const email = contact.email?.trim() ?? "";
  if (/^[^\s@<>"'`]+@[^\s@<>"'`]+\.[^\s@<>"'`]+$/.test(email)) {
    links.push({ key: "email", href: `mailto:${email}`, label: email });
  }

  const website = contact.website?.trim() ?? "";
  if (website) {
    try {
      const url = new URL(website);
      if (
        (url.protocol === "http:" || url.protocol === "https:") &&
        url.hostname.includes(".")
      ) {
        const path = url.pathname === "/" ? "" : url.pathname;
        links.push({
          key: "website",
          href: url.toString(),
          label: `${url.hostname.replace(/^www\./, "")}${path}`,
        });
      }
    } catch {
      /* not a URL: render nothing rather than a broken link */
    }
  }

  return links;
}

/**
 * The agent's contact line: who to reach and how, as links. Renders nothing
 * when the agent saved no usable phone, email or website.
 */
export function AgentContactLine({
  agentName,
  contact,
  lead,
  className = "",
}: {
  agentName: string;
  contact?: LeadFormAgentContact | null;
  /** The words before the name, e.g. "Or reach". */
  lead: string;
  className?: string;
}) {
  const links = agentContactLinks(contact);
  if (links.length === 0) return null;
  const who = contact?.name?.trim() || agentName;
  return (
    <p
      data-agent-contact=""
      className={`flex flex-wrap items-center gap-x-4 text-sm text-muted-foreground ${className}`.trim()}
    >
      <span>
        {lead} {who} directly:
      </span>
      {links.map((link) => (
        <a
          key={link.key}
          href={link.href}
          {...(link.key === "website"
            ? { target: "_blank", rel: "noopener noreferrer nofollow" }
            : {})}
          className="tc-link inline-flex min-h-11 items-center break-all font-medium"
        >
          {link.label}
        </a>
      ))}
    </p>
  );
}

/**
 * What the client reads after sending. It states what happened to the message
 * and never what the agent will do: TrueCap cannot promise someone else's
 * reply. "Emailed" is said only when the server reported that the
 * notification is on.
 */
export function LeadCaptureConfirmation({
  agentName,
  agentEmailed,
  contact,
}: {
  agentName: string;
  agentEmailed: boolean;
  contact?: LeadFormAgentContact | null;
}) {
  return (
    <div
      role="status"
      className="rounded-2xl border border-border bg-card p-5 text-center sm:p-6"
    >
      <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-[var(--metric-positive)]/15">
        <Check
          aria-hidden="true"
          className="size-5 text-[var(--metric-positive)]"
        />
      </div>
      <p className="font-bold text-foreground">
        {agentEmailed
          ? `Your message was sent to ${agentName}.`
          : `Your message is saved for ${agentName}.`}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {agentEmailed
          ? "TrueCap emails them each new message and keeps it on their dashboard. They can reply to the email you gave."
          : "It is on their TrueCap dashboard, where they can read it the next time they sign in. TrueCap has not emailed them."}
      </p>
      <AgentContactLine
        agentName={agentName}
        contact={contact}
        lead={agentEmailed ? "You can also reach" : "To reach them sooner, contact"}
        className="mt-2 justify-center"
      />
    </div>
  );
}

export function LeadCaptureForm({
  ownerId,
  shareSurface,
  dealId,
  valuesHash,
  sig,
  opaqueShareToken,
  agentName,
  dealAddress,
  accentColor,
  agentEmailed = false,
  contact = null,
}: {
  ownerId: string;
  shareSurface: "legacy_share" | "opaque_share" | "portal_share";
  /** Signed attribution from the share payload ({ownerId, dealId, valuesHash}
   *  HMAC'd with SHARE_LINK_SECRET). The /d page verifies it before rendering
   *  this form; we forward it so the server action can verify it again on the
   *  write path instead of trusting a bare ownerId from the request body. */
  dealId?: string | null;
  valuesHash: string;
  sig?: string | null;
  opaqueShareToken?: string;
  agentName: string;
  dealAddress?: string;
  accentColor?: string | null;
  /** True only when the server will also email this message to the agent
   *  (LEAD_NOTIFICATIONS_MODE=live, read in shared-deal-shell.tsx). Defaults
   *  to false so a caller that forgets it cannot overclaim. */
  agentEmailed?: boolean;
  contact?: LeadFormAgentContact | null;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  // Honeypot — hidden from humans; bots that fill it are silently dropped.
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState("");
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    trackEvent("lead_form_shown", { owner_present: true });
  }, []);

  const accent =
    accentColor && /^#[0-9A-Fa-f]{6}$/.test(accentColor)
      ? accentColor
      : "var(--primary)";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError("");
    try {
      const res = await captureDealLeadAction({
        shareSurface,
        ownerId,
        dealId: dealId ?? undefined,
        valuesHash,
        sig: sig ?? undefined,
        opaqueShareToken,
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
    } catch (err) {
      // The action REJECTED rather than returning {ok:false}: a network blip,
      // a cold-start 500, or a tab one deploy behind main (Next throws on an
      // unrecognized Server Action). Without this the form stuck on "sending"
      // forever and the agent silently lost the lead. Surface it through the
      // same inline error affordance as a returned failure, and free the
      // button so the viewer can retry. Mirrors login-form.tsx's catch.
      Sentry.captureException(err, { tags: { feature: "lead-capture" } });
      setStatus("error");
      setError(
        "Something interrupted the request. Check your connection and try again.",
      );
    }
  }

  if (status === "done") {
    return (
      <LeadCaptureConfirmation
        agentName={agentName}
        agentEmailed={agentEmailed}
        contact={contact}
      />
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border-2 p-5 sm:p-6"
      style={{ borderColor: accent }}
    >
      <h2 className="text-lg font-extrabold text-foreground">
        Interested in this deal?
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Send {agentName} a message. It is saved to their TrueCap dashboard with
        your email, so they can reply.
      </p>
      <AgentContactLine
        agentName={agentName}
        contact={contact}
        lead="Or reach"
        className="mt-1"
      />
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
          className="min-h-11 rounded-lg border border-input bg-background px-3 py-2 text-base text-foreground md:text-sm"
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (optional)"
          aria-label="Your name"
          className="min-h-11 rounded-lg border border-input bg-background px-3 py-2 text-base text-foreground md:text-sm"
        />
      </div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Anything you would like to ask? (optional)"
        rows={3}
        aria-label="Message"
        className="mt-3 w-full rounded-lg border border-input bg-background px-3 py-2 text-base text-foreground md:text-sm"
      />
      {status === "error" ? (
        <p role="alert" className="mt-2 text-sm text-destructive-text">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        style={{ background: accent }}
      >
        {status === "sending" ? (
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <Send aria-hidden="true" className="size-4" />
        )}
        Send to {agentName}
      </button>
      <p className="mt-3 text-2xs leading-relaxed text-muted-foreground">
        By sending, you agree to share your contact details with {agentName} so
        they can respond. Your info is not used for anything else.
      </p>
    </form>
  );
}
