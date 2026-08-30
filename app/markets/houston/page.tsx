import {
  buildSafeMarketMetadata,
  SafeMarketPage,
} from "@/components/marketing/safe-market-page";

const MARKET = {
  city: "Houston",
  stateCode: "TX",
  stateName: "Texas",
  stateSlug: "texas",
  slug: "houston",
} as const;

export const metadata = buildSafeMarketMetadata(MARKET);

export default function HoustonMarketPage() {
  return <SafeMarketPage {...MARKET} />;
}
