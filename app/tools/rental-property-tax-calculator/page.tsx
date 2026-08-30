import { permanentRedirect } from "next/navigation";
import { HISTORICAL_TOOL_REDIRECTS } from "@/lib/historical-tool-redirects";

/**
 * The tax calculator is not part of the released product. Preserve existing
 * inbound links by sending readers to clearly labeled educational material.
 */
export default function RentalPropertyTaxCalculatorPage() {
  permanentRedirect(
    HISTORICAL_TOOL_REDIRECTS["rental-property-tax-calculator"],
  );
}
