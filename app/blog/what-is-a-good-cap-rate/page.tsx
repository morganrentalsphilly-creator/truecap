import {
  buildSourceFirstArticleMetadata,
  SourceFirstArticle,
} from "@/components/marketing/source-first-article";

const ARTICLE = {
  slug: "what-is-a-good-cap-rate",
  title: "What is a good cap rate? A property-specific framework",
  seoTitle: "Good cap rate: a property-specific framework",
  description:
    "There is no universal good cap rate. Learn what the ratio measures, how to compare consistent inputs, and which property-specific evidence to verify before relying on it.",
  publishedAt: "2026-05-24",
  modifiedAt: "2026-08-29",
  faqs: [
    {
      question: "How is cap rate calculated?",
      answer:
        "Divide modeled annual net operating income by a consistent purchase-price or value basis. State the NOI convention and keep financing outside the cap-rate calculation.",
    },
    {
      question: "Is a higher cap rate always better?",
      answer:
        "No. A higher result can reflect stronger income, a lower price, added risk, deferred work, unstable rent, or omitted expenses. Compare like-for-like inputs and verify the property evidence.",
    },
  ],
} as const;

export const metadata = buildSourceFirstArticleMetadata(ARTICLE);

export default function GoodCapRatePost() {
  return (
    <SourceFirstArticle article={ARTICLE}>
      <p>
        A cap rate is modeled annual net operating income divided by purchase
        price or value. It is useful for comparing unlevered operating yield,
        but it does not include financing, future appreciation, income taxes,
        sale proceeds, or every capital need.
      </p>

      <h2>Why there is no universal threshold</h2>
      <p>
        Property type, condition, lease terms, expense responsibility,
        submarket, data period, and the NOI convention all change the ratio. Two
        reported cap rates are not comparable when one uses current rent and
        verified expenses while the other uses optimistic future rent or omits
        recurring costs.
      </p>
      <p>
        A higher percentage is not proof of a better acquisition. It may reflect
        a lower price, stronger income, deferred maintenance, unstable rent,
        unusual tenant obligations, or missing expenses. A lower percentage is
        not proof of a bad acquisition either. The ratio is a screen, not a
        recommendation or fair-value opinion.
      </p>

      <h2>Build a comparable cap rate</h2>
      <ol>
        <li>Use the same price or valuation basis for every property.</li>
        <li>
          Separate in-place rent, reviewed market evidence, and an unverified
          pro-forma scenario.
        </li>
        <li>
          Include vacancy and recurring operating expenses under one disclosed
          NOI convention.
        </li>
        <li>
          Keep financing and below-NOI capital reserves visible, even though
          they are not part of acquisition cap rate.
        </li>
        <li>
          Compare the result with recent relevant local transactions or reports
          that document property type, geography, period, and method.
        </li>
      </ol>

      <h2>Evidence to verify</h2>
      <ul>
        <li>Current rent roll, leases, concessions, and collections</li>
        <li>Parcel tax and a reviewed post-sale tax scenario</li>
        <li>Insurance quotes, HOA obligations, and owner-paid utilities</li>
        <li>Maintenance history and near-term capital needs</li>
        <li>Comparable sales and income evidence from an appropriate source</li>
      </ul>

      <h2>Use TrueCap as a preliminary screen</h2>
      <p>
        The TrueCap analyzer calculates cap rate beside cash flow, cash-on-cash
        return, and model DSCR under editable assumptions. Labeled HUD and FRED
        values are starting benchmarks, not property facts; property tax remains
        a manual local input. Replace each value with reviewed property-specific
        evidence before relying on the result.
      </p>
    </SourceFirstArticle>
  );
}
