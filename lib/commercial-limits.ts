/** Workspace allowances approved in the October 28 product polish. */
export const MAX_CLIENTS = 100;
export const MAX_BUY_BOXES = 12;
export const MAX_AGENT_BUY_BOXES = 100;
export const COMMERCIAL_WORKSPACE_LIMITS = Object.freeze({ agentClients: MAX_CLIENTS, buyBoxes: MAX_BUY_BOXES, agentBuyBoxes: MAX_AGENT_BUY_BOXES });

/** Only verified Agent Pro entitlements receive the larger workspace. */
export function buyBoxLimitForFeatures(features: readonly string[]): number {
  return features.includes("client_buy_box") ? MAX_AGENT_BUY_BOXES : MAX_BUY_BOXES;
}
