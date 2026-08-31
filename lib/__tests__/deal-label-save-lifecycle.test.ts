import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildLatestDealLabelPatch,
  coalesceDealLabelSaveKeys,
  dealLabelPatchKeys,
} from "../deal-label-save-lifecycle";

describe("deal label save lifecycle", () => {
  it("coalesces repeated blurs while retaining every requested field", () => {
    const first = dealLabelPatchKeys({ nickname: "First" });
    const queued = coalesceDealLabelSaveKeys(
      first,
      dealLabelPatchKeys({ market: "Philadelphia" }),
      dealLabelPatchKeys({ nickname: "Latest", neighborhood: "Fishtown" }),
    );

    expect(queued).toEqual(["nickname", "market", "neighborhood"]);
  });

  it("builds a coalesced send or retry from the latest normalized drafts", () => {
    expect(
      buildLatestDealLabelPatch(["nickname", "market"], {
        nickname: "  Latest nickname  ",
        market: "   ",
        neighborhood: "Unblurred draft",
      }),
    ).toEqual({ nickname: "Latest nickname", market: null });
  });

  it("can restore failed owner keys without dropping blurs queued behind it", () => {
    expect(
      coalesceDealLabelSaveKeys(
        ["nickname"],
        ["market", "neighborhood"],
      ),
    ).toEqual(["nickname", "market", "neighborhood"]);
  });

  it("wires serialized draining, failure recovery, and route invalidation", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/investcalc/deal-details-card.tsx"),
      "utf8",
    );
    const identitySync = source.slice(
      source.indexOf("useLayoutEffect(() =>"),
      source.indexOf("useEffect(() =>"),
    );
    const saveEntry = source.slice(
      source.indexOf("function save("),
      source.indexOf("if (!loaded)"),
    );
    const blurHandler = source.slice(
      source.indexOf("onBlur={(e) =>"),
      source.indexOf("/>\n          </label>", source.indexOf("onBlur={(e) =>")),
    );

    expect(identitySync).toContain("queuedSaveKeysRef.current = []");
    expect(identitySync).toContain("labelsRef.current = EMPTY");
    expect(source).toContain("const submittedKeys = queuedSaveKeysRef.current");
    expect(source).toContain("queuedSaveKeysRef.current = []");
    expect(source).toContain("restoreSubmittedKeys()");
    expect(source).toContain("flushQueuedSave()");
    expect(saveEntry.indexOf("coalesceDealLabelSaveKeys(")).toBeLessThan(
      saveEntry.indexOf("mutationRequestRef.current !== null"),
    );
    expect(
      blurHandler.indexOf("mutationRequestRef.current !== null"),
    ).toBeLessThan(
      blurHandler.indexOf('if ((labelsRef.current[f.key] ?? "") === value)'),
    );
    expect(source).toContain('if (failedPatch) return "error"');
    expect(source).not.toContain("if (isSaving || loadError)");
  });
});
