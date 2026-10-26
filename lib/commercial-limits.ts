/** Existing allowances, centralized without changing paid entitlements.
 * Increasing the Buy Box allowance needs explicit owner approval. */
export const MAX_CLIENTS = 100;
export const MAX_BUY_BOXES = 12;
export const COMMERCIAL_WORKSPACE_LIMITS = Object.freeze({ agentClients: MAX_CLIENTS, buyBoxes: MAX_BUY_BOXES });
