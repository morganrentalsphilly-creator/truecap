/**
 * Tests for lib/signed-token — the tamper-proof public tokens behind the
 * client portal and white-label embeds. The security properties are the whole
 * point: a token must not decode under a different scope, a tampered payload
 * must fail, and an unset secret must fail SAFE (no forgeable tokens).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SECRET = "test-share-link-secret-abc123";

async function fresh() {
  vi.resetModules();
  return import("@/lib/signed-token");
}

describe("signed-token", () => {
  beforeEach(() => {
    process.env.SHARE_LINK_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.SHARE_LINK_SECRET;
    vi.resetModules();
  });

  it("round-trips data under a scope", async () => {
    const { mintSignedToken, readSignedToken } = await fresh();
    const token = mintSignedToken("portal", { a: "agent-1", c: "client-1" })!;
    expect(token).toBeTypeOf("string");
    expect(readSignedToken("portal", token)).toEqual({ a: "agent-1", c: "client-1" });
  });

  it("rejects a token read under a DIFFERENT scope (no cross-feature replay)", async () => {
    const { mintSignedToken, readSignedToken } = await fresh();
    const token = mintSignedToken("portal", { a: "agent-1", c: "client-1" })!;
    expect(readSignedToken("embed", token)).toBeNull();
  });

  it("rejects a tampered payload (swapped agent id)", async () => {
    const { mintSignedToken, readSignedToken } = await fresh();
    const token = mintSignedToken("portal", { a: "agent-1", c: "client-1" })!;
    // Decode, swap the agent id, re-encode WITHOUT re-signing.
    const json = Buffer.from(token.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const obj = JSON.parse(json);
    obj.a = "attacker";
    const forged = Buffer.from(JSON.stringify(obj), "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(readSignedToken("portal", forged)).toBeNull();
  });

  it("is deterministic — same inputs, same token, so shared URLs stay stable", async () => {
    const { mintSignedToken, readSignedToken } = await fresh();
    const t1 = mintSignedToken("s", { a: "1", b: "2" })!;
    const t2 = mintSignedToken("s", { b: "2", a: "1" })!;
    expect(t1).toBe(t2);
    expect(readSignedToken("s", t1)).toEqual({ a: "1", b: "2" });
  });

  it("returns null on garbage tokens without throwing", async () => {
    const { readSignedToken } = await fresh();
    expect(readSignedToken("s", "not-base64-@@@")).toBeNull();
    expect(readSignedToken("s", "")).toBeNull();
    expect(readSignedToken("s", Buffer.from("{}").toString("base64url"))).toBeNull();
  });

  it("FAILS SAFE when the secret is unset — no token minted, none accepted", async () => {
    delete process.env.SHARE_LINK_SECRET;
    const { mintSignedToken, readSignedToken } = await fresh();
    expect(mintSignedToken("s", { a: "1" })).toBeNull();
    // A token minted earlier (with a secret) must not verify once the secret is gone.
    process.env.SHARE_LINK_SECRET = SECRET;
    const { mintSignedToken: mint2 } = await fresh();
    const token = mint2("s", { a: "1" })!;
    delete process.env.SHARE_LINK_SECRET;
    const { readSignedToken: read3 } = await fresh();
    expect(read3("s", token)).toBeNull();
  });

  it("rejects a payload whose signature was computed with a different key", async () => {
    const { mintSignedToken } = await fresh();
    const token = mintSignedToken("s", { a: "1" })!;
    process.env.SHARE_LINK_SECRET = "a-totally-different-secret";
    const { readSignedToken } = await fresh();
    expect(readSignedToken("s", token)).toBeNull();
  });
});
