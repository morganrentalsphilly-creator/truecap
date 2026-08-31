import {
  buildSafeMarketMetadata,
  SafeMarketPage,
} from "@/components/marketing/safe-market-page";

const MARKET = {
  city: "Indianapolis",
  stateCode: "IN",
  stateName: "Indiana",
  stateSlug: "indiana",
  slug: "indianapolis",
} as const;

export const metadata = buildSafeMarketMetadata(MARKET);

export default function IndianapolisMarketPage() {
  return <SafeMarketPage {...MARKET} />;
}
