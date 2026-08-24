import type { Metadata } from "next";
import { notFound } from "next/navigation";

/**
 * No public refund guarantee is currently configured.
 *
 * Keep this route non-indexable and fail closed until an approved policy,
 * eligibility contract, and customer-support workflow are supplied together.
 * Billing, cancellation, and statutory refund rights remain governed by the
 * current checkout terms, Terms of Service, and applicable law.
 */
export const metadata: Metadata = {
  title: "Guarantee terms unavailable",
  description: "No public TrueCap refund guarantee is currently offered.",
  robots: { index: false, follow: false },
};

export default function GuaranteePage() {
  notFound();
}
