import { describe, expect, it } from "vitest";
import {
  fetchStorageObjectWindow,
  isCurrentStorageOwnerRead,
} from "@/lib/storage-object-window";

describe("fetchStorageObjectWindow", () => {
  it("restarts at zero so a deletion between clicks cannot skip the next object", async () => {
    const original = Array.from({ length: 101 }, (_, index) => `doc-${index}`);
    const first = await fetchStorageObjectWindow<string>({
      pageSize: 100,
      targetCount: 100,
      getKey: (row) => row,
      fetchPage: async (offset, limit) => original.slice(offset, offset + limit),
    });
    expect(first.rows).toHaveLength(100);
    expect(first.hasMore).toBe(true);

    const afterEarlierDelete = original.slice(1);
    const expanded = await fetchStorageObjectWindow<string>({
      pageSize: 100,
      targetCount: first.nextOffset + 100,
      getKey: (row) => row,
      fetchPage: async (offset, limit) =>
        afterEarlierDelete.slice(offset, offset + limit),
    });

    expect(expanded.rows).toContain("doc-100");
    expect(expanded.rows).toEqual(afterEarlierDelete);
    expect(expanded.nextOffset).toBe(100);
    expect(expanded.hasMore).toBe(false);
  });

  it("reads complete pages until the requested visible window is rebuilt", async () => {
    const rows = Array.from({ length: 250 }, (_, index) => index);
    const offsets: number[] = [];
    const result = await fetchStorageObjectWindow<number>({
      pageSize: 100,
      targetCount: 200,
      getKey: (row) => String(row),
      fetchPage: async (offset, limit) => {
        offsets.push(offset);
        return rows.slice(offset, offset + limit);
      },
    });

    expect(offsets).toEqual([0, 100, 0, 100]);
    expect(result.rows).toEqual(rows.slice(0, 200));
    expect(result.nextOffset).toBe(200);
    expect(result.hasMore).toBe(true);
  });

  it("detects and repairs a deletion between page reads in one rebuild", async () => {
    const original = Array.from({ length: 200 }, (_, index) => `doc-${index}`);
    let current = original;
    let calls = 0;

    const result = await fetchStorageObjectWindow<string>({
      pageSize: 100,
      targetCount: 200,
      getKey: (row) => row,
      fetchPage: async (offset, limit) => {
        calls += 1;
        const page = current.slice(offset, offset + limit);
        if (calls === 1) current = original.slice(1);
        return page;
      },
    });

    expect(calls).toBeGreaterThanOrEqual(5);
    expect(result.rows).toEqual(current);
    expect(result.rows).toContain("doc-199");
    expect(result.nextOffset).toBe(199);
    expect(result.hasMore).toBe(false);
  });
});

describe("isCurrentStorageOwnerRead", () => {
  it("drops a deferred private list when auth switches before it resolves", async () => {
    let currentOwnerId: string | null = "owner-a";
    let currentAuthRevision = 0;
    let resolveList!: (rows: string[]) => void;
    const deferredList = new Promise<string[]>((resolve) => {
      resolveList = resolve;
    });

    const pendingRead = (async () => {
      const expectedOwnerId = "owner-a";
      const startedAuthRevision = currentAuthRevision;
      const rows = await deferredList;
      return isCurrentStorageOwnerRead({
        expectedOwnerId,
        currentOwnerId,
        startedAuthRevision,
        currentAuthRevision,
      })
        ? rows
        : [];
    })();

    currentOwnerId = null;
    currentAuthRevision += 1;
    resolveList(["owner-a-private-file.pdf"]);

    await expect(pendingRead).resolves.toEqual([]);
  });
});
