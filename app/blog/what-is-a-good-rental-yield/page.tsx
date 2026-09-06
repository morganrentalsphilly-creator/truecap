import {
  buildSourceFirstArticleMetadata,
  SourceFirstArticle,
} from "@/components/marketing/source-first-article";
import { RelatedContent } from "@/components/marketing/related-content";

const ARTICLE = {
  slug: "what-is-a-good-rental-yield",
  title: "What is a good rental yield? A consistent comparison method",
  seoTitle: "Rental yield: a consistent comparison method",
  description:
    "Rental yield depends on the formula and evidence behind it. Compare gross and net yield with consistent, property-specific inputs, not a market threshold.",
  publishedAt: "2026-05-24",
  modifiedAt: "2026-08-29",
  faqs: [
    {
      question: "What is the difference between gross and net rental yield?",
      answer:
        "Gross yield divides annual gross rent by a consistent price or cost basis. Net yield first subtracts the recurring operating expenses included in the stated convention.",
    },
    {
      question: "Is there one good rental-yield threshold for every property?",
      answer:
        "No. Formula, property type, condition, expense responsibility, location, evidence period, and omitted costs can all change the result. Compare consistent inputs and verify property-specific evidence.",
    },
  ],
} as const;

export const metadata = buildSourceFirstArticleMetadata(ARTICLE);

export default function GoodRentalYieldPost() {
  return (
    <SourceFirstArticle article={ARTICLE}>
      <p>
        Gross rental yield divides annual scheduled rent by purchase price. Net
        rental yield subtracts a defined set of operating expenses first. The
        words “net yield” are not enough by themselves: confirm exactly which
        expenses and vacancy assumptions the calculation includes.
      </p>

      <h2>Gross yield is a triage ratio</h2>
      <p>
        Gross yield is fast because it ignores property tax, insurance, vacancy,
        maintenance, management, HOA, utilities, and other costs. It can help
        compare similarly defined listings, but it cannot establish cash flow,
        lender coverage, or a suitable purchase.
      </p>

      <h2>Net yield requires a disclosed convention</h2>
      <p>
        To compare properties, use the same rent basis, vacancy treatment,
        expense categories, price basis, and period. Keep financing separate:
        acquisition cap rate and net operating yield are unlevered, while
        cash-on-cash return and model DSCR depend on the entered capital stack.
      </p>

      <h2>Verification checklist</h2>
      <ul>
        <li>Executed leases, rent roll, concessions, and recent collections</li>
        <li>Local vacancy and rent evidence relevant to the property</li>
        <li>Parcel tax, insurance quote, HOA, and owner-paid utilities</li>
        <li>Recurring maintenance and management obligations</li>
        <li>Capital needs shown separately from the NOI convention</li>
      </ul>

      <h2>Interpret the result carefully</h2>
      <p>
        There is no universal “good” rental-yield percentage. A higher modeled
        yield can reflect better income, a lower price, more operational risk,
        deferred work, or incomplete expenses. Compare the evidence and run
        downside scenarios; do not turn the ratio into a buy/pass rule.
      </p>

      <p>
        TrueCap&apos;s free core analyzer places the yield-related metrics
        beside editable operating and financing assumptions. It is a preliminary
        model—not an appraisal, lender approval, forecast, or investment
        recommendation.
      </p>

      <RelatedContent kind="blog" slug={ARTICLE.slug} title={ARTICLE.title} className="mt-10" />
    </SourceFirstArticle>
  );
}
