"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";

export function GuaranteeViewTracker() {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackEvent("guarantee_viewed", { guarantee: "five_deal", placement: "pricing" });
  }, []);
  return null;
}
