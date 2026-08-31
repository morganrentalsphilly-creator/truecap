import {
  buildSafeMarketMetadata,
  SafeMarketPage,
} from "@/components/marketing/safe-market-page";

const MARKET = {
  city: "Cleveland",
  stateCode: "OH",
  stateName: "Ohio",
  stateSlug: "ohio",
  slug: "cleveland",
} as const;

export const metadata = buildSafeMarketMetadata(MARKET);

export default function ClevelandMarketPage() {
  return <SafeMarketPage {...MARKET} />;
}
