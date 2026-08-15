"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";

export function AgentProPageTracker() {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackEvent("agent_pro_page_viewed", { path: "/for-agents" });
  }, []);
  return null;
}
