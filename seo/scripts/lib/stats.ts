/**
 * Small, dependency-free statistics for the loop: the CTR curve, a binomial
 * lower-tail test for "CTR below the curve", salted holdout hashing, and the
 * neutral band that keeps noise from being labelled a win or a loss.
 */

import { createHash } from "node:crypto";
import { loadConfig } from "./config.ts";

/** Expected CTR at an average position, linearly interpolated on the config curve. */
export function expectedCtr(position: number): number {
  const points = loadConfig().ctrCurve.points;
  if (!Number.isFinite(position) || position <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    const [x0, y0] = points[i - 1];
    if (position <= x1) return y0 + ((position - x0) / (x1 - x0)) * (y1 - y0);
  }
  return points[points.length - 1][1];
}

/** P(X <= k) for X ~ Binomial(n, p), computed in log space. */
export function binomialCdf(k: number, n: number, p: number): number {
  if (k < 0) return 0;
  if (k >= n) return 1;
  if (p <= 0) return 1;
  if (p >= 1) return k >= n ? 1 : 0;
  const logP = Math.log(p);
  const logQ = Math.log(1 - p);
  let logCoef = n * logQ; // i = 0
  let total = Math.exp(logCoef);
  for (let i = 1; i <= k; i += 1) {
    logCoef += Math.log(n - i + 1) - Math.log(i) + logP - logQ;
    total += Math.exp(logCoef);
  }
  return Math.min(1, total);
}

/** Uniform [0, 1) from a salted SHA-256 — deterministic, not guessable without the salt. */
export function saltedUnit(salt: string, key: string): number {
  const hex = createHash("sha256").update(`${salt}\u0000${key}`).digest("hex").slice(0, 12);
  return parseInt(hex, 16) / 2 ** 48;
}

/**
 * Label an outcome ratio (treated change / holdout change, as a multiplicative
 * factor) as win/loss/neutral. Inside the placebo band → neutral.
 */
export function labelOutcome(ratio: number | null): "win" | "loss" | "neutral" {
  if (ratio === null || !Number.isFinite(ratio) || ratio <= 0) return "neutral";
  const band = loadConfig().outcomes.neutralBandRatio;
  if (ratio >= band) return "win";
  if (ratio <= 1 / band) return "loss";
  return "neutral";
}

export function mean(values: number[]): number | null {
  const finite = values.filter((v) => Number.isFinite(v));
  return finite.length ? finite.reduce((a, b) => a + b, 0) / finite.length : null;
}
