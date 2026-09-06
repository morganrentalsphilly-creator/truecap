import {
  buildSourceFirstArticleMetadata,
  SourceFirstArticle,
} from "@/components/marketing/source-first-article";
import { RelatedContent } from "@/components/marketing/related-content";

const ARTICLE = {
  slug: "how-to-estimate-rehab-costs",
  title: "How to estimate rehab costs without relying on generic price bands",
  seoTitle: "How to estimate rehab costs without generic bands",
  description:
    "A rehab-budget framework: document scope and condition, get local written bids, add permits and carrying costs, and set a disclosed uncertainty reserve.",
  publishedAt: "2026-05-27",
  modifiedAt: "2026-08-29",
  faqs: [
    {
      question: "What should a property-specific rehab budget include?",
      answer:
        "Document the scope and quantities, compare local written bids, include design, permits, testing, carrying costs, and closeout, and show any uncertainty reserve separately.",
    },
    {
      question: "Can a generic cost-per-square-foot table replace local bids?",
      answer:
        "No. Generic tables may provide dated screening context, but they do not establish the condition, scope, labor, materials, code requirements, or access costs for a specific property.",
    },
  ],
} as const;

export const metadata = buildSourceFirstArticleMetadata(ARTICLE);

export default function RehabEstimatePost() {
  return (
    <SourceFirstArticle article={ARTICLE}>
      <p>
        Generic cost-per-square-foot tables age quickly and can hide major
        differences in location, access, labor, materials, code requirements,
        property condition, and scope. Use them only as explicitly dated
        screening context when the source and method are known. A reviewed
        budget should be built from the actual property and local written bids.
      </p>

      <h2>1. Create a room-by-room scope</h2>
      <p>
        Record quantities, condition, finish level, demolition, disposal,
        protection, and sequencing. Separate cosmetic work from kitchens and
        baths, mechanical systems, roof and envelope, electrical, plumbing,
        structure, site work, and accessibility or code items.
      </p>

      <h2>2. Verify hidden-condition risk</h2>
      <p>
        A walkthrough cannot establish the condition of concealed wiring,
        plumbing, structure, moisture, environmental materials, sewer, or every
        mechanical component. Use appropriate inspections and qualified local
        professionals. Keep unresolved conditions visible instead of converting
        them to zero.
      </p>

      <h2>3. Obtain comparable written bids</h2>
      <p>
        Give bidders the same written scope and ask them to separate labor,
        materials, allowances, exclusions, permits, schedule, payment terms,
        warranty, and change-order rules. Confirm license and insurance where
        applicable. A low headline bid is not comparable when it excludes work
        another bid includes.
      </p>

      <h2>4. Add project costs beyond construction</h2>
      <ul>
        <li>Design, engineering, surveys, testing, and permit fees</li>
        <li>Temporary utilities, security, storage, and site protection</li>
        <li>Financing, insurance, tax, and other carrying costs</li>
        <li>Lost rent or lease-up assumptions during work</li>
        <li>Cleaning, punch-list, inspections, and closeout</li>
      </ul>

      <h2>5. Choose and disclose an uncertainty reserve</h2>
      <p>
        There is no universal contingency percentage. Set the reserve based on
        design completeness, building age and condition, access, price
        volatility, bid coverage, and unresolved risks. Show the base scope and
        uncertainty reserve separately so reviewers can see what is known and
        what remains provisional.
      </p>

      <h2>6. Reconcile the budget before relying on an acquisition model</h2>
      <p>
        Update the scope after inspections and bid leveling, then model schedule
        and cash timing as well as total cost. TrueCap&apos;s released core
        analyzer does not replace contractor bids, engineering, permits, or a
        specialist construction model. Use it only for the released preliminary
        rental metrics under the assumptions actually shown.
      </p>

      <RelatedContent kind="blog" slug={ARTICLE.slug} title={ARTICLE.title} className="mt-10" />
    </SourceFirstArticle>
  );
}
