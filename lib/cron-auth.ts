import { createHash, timingSafeEqual } from "node:crypto";

/** Compare fixed-size digests so bearer validation never compares secret bytes directly. */
export function isValidCronBearer(
  request: Pick<Request, "headers">,
  secret: string | undefined = process.env.CRON_SECRET,
): boolean {
  if (!secret) return false;
  const authorization = request.headers.get("authorization");
  if (!authorization) return false;
  const expected = createHash("sha256").update(`Bearer ${secret}`).digest();
  const received = createHash("sha256").update(authorization).digest();
  return timingSafeEqual(expected, received);
}
