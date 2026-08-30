import {
  buildSafeMarketMetadata,
  SafeMarketPage,
} from "@/components/marketing/safe-market-page";

const MARKET = {
  city: "Tampa",
  stateCode: "FL",
  stateName: "Florida",
  stateSlug: "florida",
  slug: "tampa",
} as const;

export const metadata = buildSafeMarketMetadata(MARKET);

export default function TampaMarketPage() {
  return <SafeMarketPage {...MARKET} />;
}
