import {
  buildSafeMarketMetadata,
  SafeMarketPage,
} from "@/components/marketing/safe-market-page";

const MARKET = {
  city: "Dallas–Fort Worth",
  stateCode: "TX",
  stateName: "Texas",
  stateSlug: "texas",
  slug: "dallas",
  analyzerAddress: "Dallas, TX",
} as const;

export const metadata = buildSafeMarketMetadata(MARKET);

export default function DallasMarketPage() {
  return <SafeMarketPage {...MARKET} />;
}
