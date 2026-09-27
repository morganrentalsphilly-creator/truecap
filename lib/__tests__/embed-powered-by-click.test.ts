/**
 * The in-iframe "Powered by TrueCap" link's click fallback.
 *
 * Snippets copied from 2026-08-30 until the credit shipped sandbox the iframe
 * without allow-popups, and those pastes are permanent. In that frame the
 * browser drops a target=_blank click (window.open returns null), so without
 * the fallback every such embed carries a dead credit link. The frame does
 * allow top navigation on a user click, so the link opens the tool page there
 * instead.
 *
 * The render tests (embed-powered-by.test.tsx) only see the href, target and
 * rel, which are identical with or without the handler. These call the
 * component's real onClick with window.open stubbed, so deleting or breaking
 * the fallback fails here.
 */
import type { MouseEvent, ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmbedPoweredByLink } from "@/components/embed/embed-powered-by-link";
import { EMBED_LIST } from "@/lib/embed-registry";
import { CANONICAL_SITE_URL } from "@/lib/site-url";

type LinkProps = {
  href: string;
  target: string;
  rel: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

type FakeClick = {
  defaultPrevented: boolean;
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  preventDefault: ReturnType<typeof vi.fn>;
};

/** The props EmbedPoweredByLink renders its <a> with (it uses no hooks). */
function linkProps(slug: string): LinkProps {
  return (EmbedPoweredByLink({ slug }) as ReactElement<LinkProps>).props;
}

function primaryClick(overrides: Partial<FakeClick> = {}): FakeClick {
  return {
    defaultPrevented: false,
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    preventDefault: vi.fn(),
    ...overrides,
  };
}

function clickLink(props: LinkProps, event: FakeClick): void {
  expect(props.onClick, "the credit link has a click handler").toBeTypeOf(
    "function",
  );
  props.onClick!(event as unknown as MouseEvent<HTMLAnchorElement>);
}

function stubWindowOpen(result: unknown) {
  const open = vi.fn(() => result);
  vi.stubGlobal("window", { open });
  return open;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const toolPage = (slug: string) => `${CANONICAL_SITE_URL}/tools/${slug}`;

describe("the in-iframe Powered by TrueCap click", () => {
  it.each(EMBED_LIST.map((entry) => [entry.slug] as const))(
    "%s: in a frame that blocks popups, the click opens the tool page in the top window",
    (slug) => {
      const props = linkProps(slug);
      expect(props).toMatchObject({
        href: toolPage(slug),
        target: "_blank",
        rel: "noopener",
      });
      const open = stubWindowOpen(null);
      const event = primaryClick();

      clickLink(props, event);

      expect(event.preventDefault).toHaveBeenCalledTimes(1);
      expect(open.mock.calls).toEqual([
        [toolPage(slug), "_blank"],
        [toolPage(slug), "_top"],
      ]);
    },
  );

  it.each(EMBED_LIST.map((entry) => [entry.slug] as const))(
    "%s: where popups are allowed, it opens one new tab with no opener",
    (slug) => {
      const tab: { opener: unknown } = { opener: { partner: "window" } };
      const open = stubWindowOpen(tab);
      const event = primaryClick();

      clickLink(linkProps(slug), event);

      expect(event.preventDefault).toHaveBeenCalledTimes(1);
      expect(open.mock.calls).toEqual([[toolPage(slug), "_blank"]]);
      expect(tab.opener).toBeNull();
    },
  );

  it.each([
    ["cmd-click", { metaKey: true }],
    ["ctrl-click", { ctrlKey: true }],
    ["shift-click", { shiftKey: true }],
    ["alt-click", { altKey: true }],
    ["middle-click", { button: 1 }],
    ["an already-handled click", { defaultPrevented: true }],
  ] as const)("leaves %s to the browser", (_label, overrides) => {
    const open = stubWindowOpen(null);
    const event = primaryClick(overrides);

    clickLink(linkProps(EMBED_LIST[0].slug), event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });
});
