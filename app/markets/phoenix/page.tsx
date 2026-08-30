import {
  buildSafeMarketMetadata,
  SafeMarketPage,
} from "@/components/marketing/safe-market-page";

const MARKET = {
  city: "Phoenix",
  stateCode: "AZ",
  stateName: "Arizona",
  stateSlug: "arizona",
  slug: "phoenix",
} as const;

export const metadata = buildSafeMarketMetadata(MARKET);

export default function PhoenixMarketPage() {
  return <SafeMarketPage {...MARKET} />;
}
