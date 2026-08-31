import {
  buildSafeMarketMetadata,
  SafeMarketPage,
} from "@/components/marketing/safe-market-page";

const MARKET = {
  city: "Memphis",
  stateCode: "TN",
  stateName: "Tennessee",
  stateSlug: "tennessee",
  slug: "memphis",
} as const;

export const metadata = buildSafeMarketMetadata(MARKET);

export default function MemphisMarketPage() {
  return <SafeMarketPage {...MARKET} />;
}
