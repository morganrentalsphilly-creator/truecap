import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "e2e/authenticated-core-workflows.spec.ts"),
  "utf8",
);

describe("authenticated core workflow fixture cleanup", () => {
  it("authenticates durable cleanup before creating the saved-deal fixture", () => {
    const testStart = source.indexOf(
      'test("saved deal moves through dashboard, durable scenario workspace',
    );
    const cleanupClient = source.indexOf(
      "storageProbeClient = createClient",
      testStart,
    );
    const cleanupAuth = source.indexOf(
      "await storageProbeClient.auth.signInWithPassword",
      cleanupClient,
    );
    const cleanupOwner = source.indexOf(
      "storageProbeOwnerId = probeOwnerId",
      cleanupAuth,
    );
    const createDeal = source.indexOf(
      "baseDealId = await saveUniqueSampleDeal(page, address)",
      testStart,
    );

    expect(cleanupClient).toBeGreaterThan(testStart);
    expect(cleanupAuth).toBeGreaterThan(cleanupClient);
    expect(cleanupOwner).toBeGreaterThan(cleanupAuth);
    expect(createDeal).toBeGreaterThan(cleanupOwner);
  });

  it("can clean a partial save by owner and address without a returned deal id", () => {
    const testStart = source.indexOf(
      'test("saved deal moves through dashboard, durable scenario workspace',
    );
    const finallyStart = source.indexOf("} finally {", testStart);
    const ownerCleanup = source.indexOf(
      "if (storageProbeOwnerId)",
      finallyStart,
    );
    const addressFilter = source.indexOf('.eq("address", address)', ownerCleanup);
    const baseIdGate = source.indexOf(
      "if (baseDealId && storageProbeOwnerId && uploadedDocumentName)",
      finallyStart,
    );

    expect(ownerCleanup).toBeGreaterThan(finallyStart);
    expect(ownerCleanup).toBeGreaterThan(baseIdGate);
    expect(addressFilter).toBeGreaterThan(ownerCleanup);
  });
});
