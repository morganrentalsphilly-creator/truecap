import {
  buildSafeMarketMetadata,
  SafeMarketPage,
} from "@/components/marketing/safe-market-page";

const MARKET = {
  city: "Charlotte",
  stateCode: "NC",
  stateName: "North Carolina",
  stateSlug: "north-carolina",
  slug: "charlotte",
} as const;

export const metadata = buildSafeMarketMetadata(MARKET);

export default function CharlotteMarketPage() {
  return <SafeMarketPage {...MARKET} />;
}
