"use client";

/**
 * Whether Agent Pro is sold on this deployment, made available to client
 * components (the marketing nav) without a NEXT_PUBLIC_ variable.
 *
 * `isAgentProConfigured()` reads a server-only env var (the Stripe Price id),
 * so the root layout evaluates it once and provides the boolean here. Client
 * links to /for-agents must be gated on it: without the Price the persona
 * route permanently redirects to /pricing, and the link-graph guard
 * (lib/__tests__/internal-link-graph.test.tsx) forbids linking a redirect.
 */

import { createContext, useContext, type ReactNode } from "react";

const AgentProConfigContext = createContext<boolean>(false);

export function AgentProConfigProvider({
  configured,
  children,
}: {
  configured: boolean;
  children: ReactNode;
}) {
  return (
    <AgentProConfigContext.Provider value={configured}>
      {children}
    </AgentProConfigContext.Provider>
  );
}

export function useAgentProConfigured(): boolean {
  return useContext(AgentProConfigContext);
}

/** The agent entry point: the persona page where it is sold, else the plan cards. */
export function agentsHref(configured: boolean): string {
  return configured ? "/for-agents" : "/pricing#plans";
}
