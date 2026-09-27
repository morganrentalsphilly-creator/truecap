import {
  buildSafeMarketMetadata,
  SafeMarketPage,
} from "@/components/marketing/safe-market-page";

// HUD's Dallas, TX HUD Metro FMR Area (Collin, Dallas, Denton, Ellis, Hunt,
// Kaufman and Rockwall counties) excludes Tarrant County, so this page is
// Dallas; Fort Worth has its own page (/markets/fort-worth).
const MARKET = {
  city: "Dallas",
  stateCode: "TX",
  stateName: "Texas",
  stateSlug: "texas",
  slug: "dallas",
} as const;

export const metadata = buildSafeMarketMetadata(MARKET);

export default function DallasMarketPage() {
  return <SafeMarketPage {...MARKET} />;
}
