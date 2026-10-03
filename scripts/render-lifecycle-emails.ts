/**
 * scripts/render-lifecycle-emails.ts
 *
 * Renders EVERY lifecycle email to disk so it can be read before the
 * lifecycle mode is set to live: welcome, the 30 drip days, the Pro nudge,
 * win-back (the 33 emails the cron sends) and the two legacy trial emails.
 *
 * It sends nothing and reaches no network: it never reads the Resend key, it
 * opens no database connection, it loads no .env file, and `fetch` is
 * replaced with a function that throws before the first import runs.
 *
 * Usage:
 *
 *   npx -y tsx scripts/render-lifecycle-emails.ts
 *
 * The signing modules carry `import "server-only"`, which throws under plain
 * Node by design, and the react-server condition that would satisfy it makes
 * react-dom/server (which renders the emails) throw instead. So this script
 * answers that one marker package with an empty module, for this process
 * only, the way vitest.config.ts does for unit tests. The Next build is not
 * affected.
 *
 * Options:
 *   --user <uuid>   The account the unsubscribe link is signed for.
 *                   Default: a made-up id that belongs to no account.
 *   --out <dir>     Output folder. Default: .preview/lifecycle-emails (git-ignored).
 *   --site <url>    Site origin for the links. Default: https://usetruecap.com
 *
 * Environment (read from the shell that runs the script, never from a file):
 *   EMAIL_POSTAL_ADDRESS  Printed in every footer. Unset: the address slot is
 *                         empty and the report says none of the 35 emails
 *                         would send (the trial_day10 billing notice
 *                         included).
 *   SHARE_LINK_SECRET     Signs the unsubscribe link. Set it to the production
 *                         value, together with --user, to get a link that
 *                         works on the live site for that one account. Unset:
 *                         the script signs with a random key made for this
 *                         run, so the link has the right shape and verifies
 *                         here, but the live site rejects it.
 *
 * Output: <key>.html and <key>.txt for each email, index.json with what was
 * checked, and a one-line verdict per email on stdout. Exit code 1 when an
 * email has no verifiable unsubscribe link, or has no address although one
 * was given.
 */

import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

// See the header: `server-only` is a marker with no behavior of its own.
const localRequire = createRequire(path.join(process.cwd(), "package.json"));
const serverOnlyMarker = localRequire.resolve("server-only");
localRequire.cache[serverOnlyMarker] = {
  id: serverOnlyMarker,
  filename: serverOnlyMarker,
  loaded: true,
  exports: {},
} as unknown as NodeJS.Module;

const networkOff = (() => {
  throw new Error("render-lifecycle-emails makes no network call");
}) as unknown as typeof fetch;
globalThis.fetch = networkOff;

function arg(name: string): string | null {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  return value && !value.startsWith("--") ? value : null;
}

/** Made-up id for the default render; no account has it. */
const DEFAULT_USER_ID = "11111111-2222-4333-8444-555555555555";
const RECIPIENT = "reader@example.com";

type TrialContent = {
  subject: string;
  preheader?: string;
  headline: string;
  body: string[];
  cta_text: string;
  cta_url: string;
  signature_note?: string | null;
};

/** Undo the escaping React applies to text, to look for the address as typed. */
function decodeEntities(html: string): string {
  return html
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

async function main() {
  const root = process.cwd();
  const userId = arg("user") ?? DEFAULT_USER_ID;
  const siteUrl = (arg("site") ?? "https://usetruecap.com").replace(/\/+$/, "");
  const outDir = path.resolve(root, arg("out") ?? path.join(".preview", "lifecycle-emails"));

  const realSecret = Boolean(process.env.SHARE_LINK_SECRET);
  if (!realSecret) process.env.SHARE_LINK_SECRET = randomBytes(32).toString("hex");

  // Imported after the environment is settled, and after fetch is off.
  const { render } = await import("@react-email/render");
  const { default: LifecycleEmail } = await import("@/emails/lifecycle-email");
  const { renderLifecycleEmail } = await import("@/lib/email/render-lifecycle");
  const {
    buildLifecycleUnsubscribeHeaders,
    buildLifecycleUnsubscribeUrl,
    readEmailPostalAddress,
  } = await import("@/lib/email/lifecycle-compliance");
  const { MAX_DRIP_DAY } = await import("@/lib/lifecycle-emails");
  const { readSignedToken } = await import("@/lib/signed-token");
  const { UNSUBSCRIBE_TOKEN_SCOPE } = await import("@/lib/testimonials/feedback-email");
  type Due = import("@/lib/lifecycle-emails").DueLifecycleEmail;

  const postalAddress = readEmailPostalAddress();
  const unsubscribeUrl = buildLifecycleUnsubscribeUrl(siteUrl, userId);
  if (!unsubscribeUrl) {
    console.error(
      "No unsubscribe link could be signed: --user must be an account id (36 characters) and --site must be https.",
    );
    process.exitCode = 1;
    return;
  }
  const headers = buildLifecycleUnsubscribeHeaders(unsubscribeUrl);
  const footer = { unsubscribeUrl, postalAddress };

  const due: Due[] = [{ userId, email: RECIPIENT, kind: "welcome", key: "welcome" }];
  for (let day = 1; day <= MAX_DRIP_DAY; day++) {
    due.push({ userId, email: RECIPIENT, kind: "drip", key: `drip_${day}`, dripDay: day });
  }
  due.push({ userId, email: RECIPIENT, kind: "pro_nudge", key: "pro_nudge" });
  due.push({ userId, email: RECIPIENT, kind: "winback", key: "winback_21d" });

  const emails: Array<{ key: string; marketing: boolean; subject: string; html: string; text: string }> = [];
  for (const item of due) {
    const out = await renderLifecycleEmail(item, siteUrl, footer);
    if (!out) throw new Error(`No content for ${item.key}`);
    emails.push({ key: item.key, marketing: true, ...out });
  }

  // The two legacy trial emails, composed the way lib/email/trial-emails.ts
  // composes them: the day-1 pitch with the unsubscribe link, the day-10
  // billing notice without it.
  for (const trial of [
    { key: "trial_day1", file: "trial-day1.json", marketing: true },
    { key: "trial_day10", file: "trial-day10.json", marketing: false },
  ]) {
    const content = JSON.parse(
      await fs.readFile(path.join(root, "emails", "lifecycle-content", trial.file), "utf8"),
    ) as TrialContent;
    const html = await render(
      LifecycleEmail({
        preheader: content.preheader ?? content.subject,
        headline: content.headline,
        body: content.body,
        ctaText: content.cta_text,
        ctaUrl: content.cta_url,
        signatureNote: content.signature_note ?? null,
        siteUrl,
        manageUrl: `${siteUrl}/settings`,
        unsubscribeUrl: trial.marketing ? unsubscribeUrl : null,
        postalAddress,
      }),
    );
    emails.push({ key: trial.key, marketing: trial.marketing, subject: content.subject, html, text: "" });
  }

  await fs.mkdir(outDir, { recursive: true });
  const report: Array<Record<string, unknown>> = [];
  let failures = 0;
  for (const email of emails) {
    const hrefs = [...email.html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]!.replace(/&amp;/g, "&"));
    const linked = hrefs.filter((href) => href.startsWith(`${siteUrl}/email/unsubscribe?token=`));
    const token = linked[0] ? new URL(linked[0]).searchParams.get("token") ?? "" : "";
    const signedFor = token ? readSignedToken(UNSUBSCRIBE_TOKEN_SCOPE, token)?.u ?? null : null;
    const unsubscribeOk = email.marketing ? linked.length === 1 && signedFor === userId : linked.length === 0;
    const textOk = !email.marketing || email.text === "" || email.text.includes(unsubscribeUrl);
    const addressInHtml = postalAddress ? decodeEntities(email.html).includes(postalAddress) : false;
    const addressOk = !postalAddress || addressInHtml;
    const ok = unsubscribeOk && textOk && addressOk;
    if (!ok) failures += 1;
    await fs.writeFile(path.join(outDir, `${email.key}.html`), email.html);
    if (email.text) await fs.writeFile(path.join(outDir, `${email.key}.txt`), email.text);
    report.push({
      key: email.key,
      kind: email.marketing ? "marketing" : "billing notice",
      subject: email.subject,
      unsubscribeLinks: linked.length,
      unsubscribeSignedForUser: signedFor === userId,
      unsubscribeInPlainText: email.text ? email.text.includes(unsubscribeUrl) : null,
      postalAddressPrinted: addressInHtml,
      ok,
    });
    console.log(
      `${ok ? "ok  " : "FAIL"} ${email.key.padEnd(12)} unsubscribe link: ${linked.length}` +
        `${email.marketing ? (signedFor === userId ? " (signed for this user)" : " (NOT verifiable)") : " (billing notice, none expected)"}` +
        ` · address: ${postalAddress ? (addressInHtml ? "printed" : "MISSING") : "slot empty"}`,
    );
  }

  await fs.writeFile(
    path.join(outDir, "index.json"),
    JSON.stringify(
      {
        renderedAt: new Date().toISOString(),
        siteUrl,
        userId,
        signedWith: realSecret
          ? "SHARE_LINK_SECRET from the environment"
          : "a random key made for this run (the live site rejects these links)",
        postalAddress: postalAddress ? "set in the environment" : "EMAIL_POSTAL_ADDRESS is not set",
        wouldSend: postalAddress
          ? "all"
          : "none: no lifecycle email is sent or scheduled while EMAIL_POSTAL_ADDRESS is unset",
        listUnsubscribeHeaders: headers,
        emails: report,
      },
      null,
      2,
    ),
  );

  console.log("");
  console.log(`${emails.length} emails written to ${outDir}`);
  console.log(
    realSecret
      ? "Unsubscribe links are signed with SHARE_LINK_SECRET from the environment."
      : "Unsubscribe links are signed with a random key made for this run: right shape, rejected by the live site.",
  );
  console.log(
    postalAddress
      ? "Postal address: taken from EMAIL_POSTAL_ADDRESS."
      : "Postal address: EMAIL_POSTAL_ADDRESS is not set, so the slot is empty. With it unset, none of the 35 emails is sent; the trial_day10 billing notice carries no unsubscribe link.",
  );
  if (failures > 0) {
    console.error(`${failures} email(s) failed the footer check.`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
