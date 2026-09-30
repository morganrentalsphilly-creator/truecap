/**
 * The source-first post template (3 posts: what-is-a-good-cap-rate,
 * what-is-a-good-rental-yield, how-to-estimate-rehab-costs). The post file
 * passes an ARTICLE object and its prose as children; this renders them in
 * the shared article frame (components/marketing/article.tsx): the site
 * header, the post header under the H1, the body in `prose prose-ledger`,
 * the FAQ as ruled rows, the sources, the bio and related posts, then the
 * analyzer CTA before the footer. The metadata, the three JSON-LD objects
 * and the date wiring are this file's contract with the SEO guards: keep
 * them as they are.
 */

import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PostSources, type PostSource } from "@/components/blog/post-sources";
import { Header } from "@/components/investcalc/header";
import {
  ARTICLE_HEADER,
  ARTICLE_LEDE,
  ARTICLE_META,
  ARTICLE_META_LINK,
  ARTICLE_TITLE,
  ArticleBody,
  ArticleEnd,
  ArticleMain,
  ArticlePage,
} from "@/components/marketing/article";
import { BlogByline } from "@/components/marketing/blog-byline";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { FaqSection } from "@/components/marketing/faq-section";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";
import { JsonLd } from "@/components/seo/json-ld";

export type SourceFirstArticleIdentity = {
  slug: string;
  title: string;
  seoTitle?: string;
  description: string;
  publishedAt: string;
  modifiedAt: string;
  faqs: readonly {
    question: string;
    answer: string;
  }[];
};

export function buildSourceFirstArticleMetadata(
  article: SourceFirstArticleIdentity,
): Metadata {
  const seoTitle = article.seoTitle ?? article.title;
  return {
    title: seoTitle,
    description: article.description,
    alternates: { canonical: `/blog/${article.slug}` },
    openGraph: {
      title: seoTitle,
      description: article.description,
      url: `/blog/${article.slug}`,
      type: "article",
      publishedTime: article.publishedAt,
      modifiedTime: article.modifiedAt,
      images: [
        { url: "/home.jpg", width: 1200, height: 630, alt: article.title },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description: article.description,
      images: ["/home.jpg"],
    },
  };
}

export function SourceFirstArticle({
  article,
  children,
  sources = [],
}: {
  article: SourceFirstArticleIdentity;
  children: ReactNode;
  /** The post's primary sources, listed after the FAQ and above the author bio. */
  sources?: readonly PostSource[];
}) {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/blog/${article.slug}`;
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${canonicalUrl}#article`,
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.modifiedAt,
    author: { "@type": "Organization", "@id": `${siteUrl}/#organization`, name: "TrueCap", url: siteUrl },
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntityOfPage: canonicalUrl,
    image: [`${siteUrl}/home.jpg`],
    inLanguage: "en-US",
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "TrueCap",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${siteUrl}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: article.title,
        item: canonicalUrl,
      },
    ],
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: article.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <ArticlePage>
      {/* The site header, as on every other post (it was missing here). */}
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={articleLd} />
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={faqLd} />
      <ArticleMain>
        <header className={ARTICLE_HEADER}>
          <h1 className={ARTICLE_TITLE}>{article.title}</h1>
          <p className={ARTICLE_META}>
            <Link href="/blog" className={ARTICLE_META_LINK}>
              TrueCap Blog
            </Link>{" "}
            ·{" "}
            {new Date(article.publishedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <BlogByline />
          <p className={ARTICLE_LEDE}>{article.description}</p>
        </header>

        <article>
          <ArticleBody>{children}</ArticleBody>

          {/* faqLd above stays the one FAQPage node for these rows. */}
          <FaqSection
            id="source-first-faq"
            variant="inline"
            heading="Frequently asked questions"
            items={article.faqs.map((faq) => ({ q: faq.question, a: faq.answer }))}
            structuredData={false}
            contact={null}
          />
        </article>

        <PostSources sources={sources} />
        <RelatedBlogPosts currentSlug={article.slug} />
      </ArticleMain>
      <ArticleEnd>
        <BlogStickyCta />
      </ArticleEnd>
      <SiteFooter />
      <ScrollDepthTracker />
    </ArticlePage>
  );
}
