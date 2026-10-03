/**
 * Env flags for the funnel-leak features (docs/funnel-leaks-plan.md). Each
 * feature ships dark and is switched on independently with `on`; anything
 * else — unset, "off", a typo — is off.
 *
 * Not server-only on purpose: the static /analyze page reads the flag while
 * rendering and passes a boolean prop to the client analyzer.
 */
export type FunnelFlag =
  | "FUNNEL_MEMO_CAPTURE"
  | "FUNNEL_SEQUENCES"
  | "FUNNEL_UPGRADE_NUDGE";

export function isFunnelFlagOn(
  flag: FunnelFlag,
  env: Record<string, string | undefined> = process.env,
): boolean {
  return (env[flag] ?? "").trim().toLowerCase() === "on";
}
