import { permanentRedirect } from "next/navigation";

/**
 * The tax calculator is not part of the released product. Preserve existing
 * inbound links by sending readers to clearly labeled educational material.
 */
export default function RentalPropertyTaxCalculatorPage() {
  permanentRedirect("/blog/rental-property-tax-deductions");
}
