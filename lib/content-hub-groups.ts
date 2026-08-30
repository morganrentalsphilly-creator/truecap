/**
 * Pure grouping helpers for the public content hubs.
 *
 * Keeping this logic outside the page components gives the crawlability tests
 * a data-level contract: every available article and every released market
 * must occur in exactly one server-rendered group. The helpers deliberately do
 * not filter or paginate URLs; presentation may change without orphaning an
 * entry from its hub.
 */

export type BlogHubPost = {
  slug: string;
};

export type BlogHubTopic = {
  slug: string;
  title: string;
  description: string;
  postSlugs: readonly string[];
};

export type BlogHubGroup<Post extends BlogHubPost> = {
  slug: string;
  title: string;
  description: string;
  posts: Post[];
};

export function groupBlogPostsByTopic<Post extends BlogHubPost>(
  posts: readonly Post[],
  topics: readonly BlogHubTopic[],
): BlogHubGroup<Post>[] {
  const postBySlug = new Map(posts.map((post) => [post.slug, post] as const));
  const assigned = new Set<string>();

  const groups = topics
    .map((topic) => {
      const topicPosts = topic.postSlugs.flatMap((slug) => {
        const post = postBySlug.get(slug);
        if (!post || assigned.has(slug)) return [];
        assigned.add(slug);
        return [post];
      });

      return {
        slug: topic.slug,
        title: topic.title,
        description: topic.description,
        posts: topicPosts,
      };
    })
    .filter((group) => group.posts.length > 0);

  const uncategorized = posts.filter((post) => !assigned.has(post.slug));
  if (uncategorized.length > 0) {
    groups.push({
      slug: "more-guides",
      title: "More rental investing guides",
      description:
        "Additional fundamentals and metric comparisons for screening rental opportunities.",
      posts: uncategorized,
    });
  }

  return groups;
}

export type MarketHubEntry = {
  slug: string;
  name: string;
  stateName: string;
};

export type MarketStateGroup<Entry extends MarketHubEntry> = {
  stateName: string;
  entries: Entry[];
};

export type MarketRangeGroup<Entry extends MarketHubEntry> = {
  slug: string;
  label: string;
  states: MarketStateGroup<Entry>[];
};

const MARKET_RANGE_DEFINITIONS = [
  { slug: "a-d", label: "A–D", start: "A", end: "D" },
  { slug: "e-j", label: "E–J", start: "E", end: "J" },
  { slug: "k-m", label: "K–M", start: "K", end: "M" },
  { slug: "n-r", label: "N–R", start: "N", end: "R" },
  { slug: "s-z", label: "S–Z", start: "S", end: "Z" },
] as const;

export function groupMarketsByStateRange<Entry extends MarketHubEntry>(
  entries: readonly Entry[],
): MarketRangeGroup<Entry>[] {
  const byState = new Map<string, Entry[]>();
  for (const entry of entries) {
    const stateEntries = byState.get(entry.stateName) ?? [];
    stateEntries.push(entry);
    byState.set(entry.stateName, stateEntries);
  }

  const states = [...byState.keys()].sort((a, b) => a.localeCompare(b));

  return MARKET_RANGE_DEFINITIONS.map((range) => ({
    slug: range.slug,
    label: range.label,
    states: states
      .filter((stateName) => {
        const firstLetter = stateName.charAt(0).toUpperCase();
        return firstLetter >= range.start && firstLetter <= range.end;
      })
      .map((stateName) => ({
        stateName,
        entries: [...(byState.get(stateName) ?? [])].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      })),
  })).filter((range) => range.states.length > 0);
}
