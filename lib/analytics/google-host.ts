/** Production Google properties must never receive local/preview QA visits. */
export function isProductionGoogleHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "usetruecap.com" || host === "www.usetruecap.com";
}
