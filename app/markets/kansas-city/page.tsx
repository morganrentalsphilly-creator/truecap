import {
  buildSafeMarketMetadata,
  SafeMarketPage,
} from "@/components/marketing/safe-market-page";

const MARKET = {
  city: "Kansas City",
  stateCode: "MO",
  stateName: "Missouri",
  stateSlug: "missouri",
  slug: "kansas-city",
} as const;

export const metadata = buildSafeMarketMetadata(MARKET);

export default function KansasCityMarketPage() {
  return <SafeMarketPage {...MARKET} />;
}
