import { expect, test, type Browser, type Page } from "@playwright/test";
import { BLOG_POSTS } from "@/app/blog/page";
import { BESPOKE_MARKETS, MARKET_CITIES } from "@/lib/markets/cities";

const expectedBlogPaths = BLOG_POSTS.filter((post) => post.available)
  .map((post) => `/blog/${post.slug}`)
  .sort();
const expectedMarketPaths = [...BESPOKE_MARKETS, ...MARKET_CITIES]
  .map((market) => `/markets/${market.slug}`)
  .sort();

async function openWithoutJavaScript(
  browser: Browser,
  path: string,
): Promise<Page> {
  const configuredBaseUrl = test.info().project.use.baseURL;
  if (typeof configuredBaseUrl !== "string") {
    throw new Error("content hub smoke tests require a configured baseURL");
  }
  const context = await browser.newContext({
    baseURL: configuredBaseUrl,
    javaScriptEnabled: false,
  });
  const page = await context.newPage();
  await page.goto(path, { waitUntil: "domcontentloaded" });
  return page;
}

async function expectMinimumTarget(page: Page, selector: string) {
  const target = page.locator(selector).filter({ visible: true }).first();
  await expect(target).toBeVisible();
  const box = await target.boundingBox();
  expect(box, `${selector} should have a measurable box`).not.toBeNull();
  expect(box!.height, `${selector} height`).toBeGreaterThanOrEqual(44);
  expect(box!.width, `${selector} width`).toBeGreaterThanOrEqual(44);
}

test.describe("crawlable content hubs", () => {
  test("blog exposes every registered article without JavaScript", async ({
    browser,
  }) => {
    const page = await openWithoutJavaScript(browser, "/blog");
    const paths = (
      await page
        .locator("[data-blog-post-link]")
        .evaluateAll((links) =>
          links.map(
            (link) => new URL((link as HTMLAnchorElement).href).pathname,
          ),
        )
    ).sort();

    expect(paths).toEqual(expectedBlogPaths);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/blog$/,
    );
    await page.context().close();
  });

  test("markets exposes every registered city without JavaScript", async ({
    browser,
  }) => {
    const page = await openWithoutJavaScript(browser, "/markets");
    const paths = (
      await page
        .locator("[data-market-city-link]")
        .evaluateAll((links) =>
          links.map(
            (link) => new URL((link as HTMLAnchorElement).href).pathname,
          ),
        )
    ).sort();

    expect(paths).toEqual(expectedMarketPaths);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/markets$/,
    );
    await page.context().close();
  });
});

test.describe("content discovery touch targets", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("cookie privacy and hub chips meet the 44px target", async ({
    page,
  }) => {
    await page.goto("/");
    await expectMinimumTarget(page, "[data-cookie-privacy-link]:visible");

    await page.getByRole("button", { name: "Reject", exact: true }).click();
    await page.goto("/blog");
    await expectMinimumTarget(page, 'nav[aria-label="Browse by topic"] a');

    await page.goto("/markets");
    await expectMinimumTarget(page, "[data-market-city-link]");
  });
});
