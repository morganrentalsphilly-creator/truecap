export type InternalLinkEdge = {
  source: string;
  target: string;
  anchor: string;
  placement: "contextual" | "navigation" | "footer";
};

export type InternalLinkReport = {
  orphans: string[];
  weaklyLinked: string[];
  brokenTargets: string[];
  overlinked: string[];
  depth: Record<string, number | null>;
  incomingContextual: Record<string, number>;
};

export function analyzeInternalLinks(
  pages: string[],
  edges: InternalLinkEdge[],
  options: { root?: string; weakThreshold?: number; overlinkedThreshold?: number } = {},
): InternalLinkReport {
  const root = options.root ?? "/";
  const weakThreshold = options.weakThreshold ?? 2;
  const overlinkedThreshold = options.overlinkedThreshold ?? 150;
  const pageSet = new Set(pages);
  const incoming = Object.fromEntries(pages.map((page) => [page, 0]));
  const outgoing = Object.fromEntries(pages.map((page) => [page, 0]));
  const adjacency = new Map<string, Set<string>>();
  const broken = new Set<string>();

  for (const edge of edges) {
    if (!pageSet.has(edge.target)) broken.add(edge.target);
    if (!pageSet.has(edge.source) || !pageSet.has(edge.target)) continue;
    outgoing[edge.source] += 1;
    if (edge.placement === "contextual") incoming[edge.target] += 1;
    const targets = adjacency.get(edge.source) ?? new Set<string>();
    targets.add(edge.target);
    adjacency.set(edge.source, targets);
  }

  const depth: Record<string, number | null> = Object.fromEntries(pages.map((page) => [page, null]));
  if (pageSet.has(root)) {
    depth[root] = 0;
    const queue = [root];
    for (let index = 0; index < queue.length; index += 1) {
      const source = queue[index];
      for (const target of adjacency.get(source) ?? []) {
        if (depth[target] !== null) continue;
        depth[target] = (depth[source] ?? 0) + 1;
        queue.push(target);
      }
    }
  }

  return {
    orphans: pages.filter((page) => page !== root && depth[page] === null).sort(),
    weaklyLinked: pages.filter((page) => page !== root && incoming[page] < weakThreshold).sort(),
    brokenTargets: [...broken].sort(),
    overlinked: pages.filter((page) => outgoing[page] > overlinkedThreshold).sort(),
    depth,
    incomingContextual: incoming,
  };
}
