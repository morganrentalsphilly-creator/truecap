import {
  buildSafeMarketMetadata,
  SafeMarketPage,
} from "@/components/marketing/safe-market-page";

const MARKET = {
  city: "Detroit",
  stateCode: "MI",
  stateName: "Michigan",
  stateSlug: "michigan",
  slug: "detroit",
} as const;

export const metadata = buildSafeMarketMetadata(MARKET);

export default function DetroitMarketPage() {
  return <SafeMarketPage {...MARKET} />;
}
