"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";

export function GuaranteeViewTracker({ guarantee = "five_deal" }: { guarantee?: "five_deal" | "three_deal" }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackEvent("guarantee_viewed", { guarantee, placement: "pricing" });
  }, [guarantee]);
  return null;
}
