import {
  buildSafeMarketMetadata,
  SafeMarketPage,
} from "@/components/marketing/safe-market-page";

const MARKET = {
  city: "Atlanta",
  stateCode: "GA",
  stateName: "Georgia",
  stateSlug: "georgia",
  slug: "atlanta",
} as const;

export const metadata = buildSafeMarketMetadata(MARKET);

export default function AtlantaMarketPage() {
  return <SafeMarketPage {...MARKET} />;
}
