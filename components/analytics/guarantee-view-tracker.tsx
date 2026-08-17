"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";

export function GuaranteeViewTracker({
  guarantee = "never_overpay",
  placement = "pricing",
}: {
  guarantee?: "five_deal" | "three_deal" | "never_overpay";
  placement?: string;
}) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackEvent("guarantee_viewed", { guarantee, placement });
  }, [guarantee, placement]);
  return null;
}
