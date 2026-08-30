import {
  buildSafeMarketMetadata,
  SafeMarketPage,
} from "@/components/marketing/safe-market-page";

const MARKET = {
  city: "Philadelphia",
  stateCode: "PA",
  stateName: "Pennsylvania",
  stateSlug: "pennsylvania",
  slug: "philadelphia",
} as const;

export const metadata = buildSafeMarketMetadata(MARKET);

export default function PhiladelphiaMarketPage() {
  return <SafeMarketPage {...MARKET} />;
}
