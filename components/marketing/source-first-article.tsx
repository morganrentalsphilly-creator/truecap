import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { BlogByline } from "@/components/marketing/blog-byline";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";

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
}: {
  article: SourceFirstArticleIdentity;
  children: ReactNode;
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
    author: { "@type": "Person", "@id": `${siteUrl}/about#morgan` },
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
        item: `${siteUrl}/`,
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
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <main id="main" className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8 sm:mb-10">
          <Link
            href="/blog"
            className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            ← TrueCap Blog
          </Link>
          <h1 className="mt-2 text-balance text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">
            {article.title}
          </h1>
          <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {new Date(article.publishedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <BlogByline />
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {article.description}
          </p>
        </header>

        <article className="prose prose-slate max-w-none [&_h2]:mt-10 [&_h2]:font-extrabold [&_h2]:text-foreground [&_h3]:font-bold [&_h3]:text-foreground [&_li]:leading-relaxed [&_li]:text-foreground [&_p]:leading-relaxed [&_p]:text-foreground">
          {children}

          <section aria-labelledby="source-first-faq-heading">
            <h2 id="source-first-faq-heading">Frequently asked questions</h2>
            {article.faqs.map((faq) => (
              <div key={faq.question}>
                <h3>{faq.question}</h3>
                <p>{faq.answer}</p>
              </div>
            ))}
          </section>
        </article>

        <RelatedBlogPosts currentSlug={article.slug} />
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
      <BlogStickyCta />
    </div>
  );
}
