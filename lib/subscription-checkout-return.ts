export const SUBSCRIPTION_CHECKOUT_RETURN_KEY =
  "truecap:subscription-checkout-return-v1";

type SubscriptionCheckoutReturnState = {
  v: 1;
  billing: "success";
  sessionId: string | null;
  capturedAt: number;
};

type CheckoutReturnWindow = Pick<Window, "sessionStorage"> & {
  __truecapSubscriptionCheckoutReturn?: SubscriptionCheckoutReturnState;
};

const MAX_AGE_MS = 30 * 60 * 1000;

/** Capture the Stripe return before Google or any other measurement loads. */
export function subscriptionCheckoutReturnBootstrapScript(): string {
  return `(function(){var k=${JSON.stringify(SUBSCRIPTION_CHECKOUT_RETURN_KEY)};try{var u=new URL(window.location.href);if(u.pathname!=='/'||u.searchParams.get('billing')!=='success')return;var p={v:1,billing:'success',sessionId:u.searchParams.get('session_id'),capturedAt:Date.now()};window.__truecapSubscriptionCheckoutReturn=p;try{window.sessionStorage.setItem(k,JSON.stringify(p));}catch(_storageError){}u.searchParams.delete('billing');u.searchParams.delete('session_id');window.history.replaceState(window.history.state,'',u.pathname+u.search+u.hash);}catch(_error){try{if(window.location.pathname!=='/')return;var q=new URLSearchParams(window.location.search);q.delete('billing');q.delete('session_id');window.history.replaceState(window.history.state,'',window.location.pathname+(q.toString()?'?'+q.toString():'')+window.location.hash);}catch(_ignored){}}})();`;
}

export function consumeSubscriptionCheckoutReturn(
  target: CheckoutReturnWindow,
  now = Date.now()
): SubscriptionCheckoutReturnState | null {
  const inMemory = target.__truecapSubscriptionCheckoutReturn;
  delete target.__truecapSubscriptionCheckoutReturn;

  let stored: string | null = null;
  try {
    stored = target.sessionStorage.getItem(SUBSCRIPTION_CHECKOUT_RETURN_KEY);
    target.sessionStorage.removeItem(SUBSCRIPTION_CHECKOUT_RETURN_KEY);
  } catch {
    // The inline bootstrap retains the same payload in memory as a fallback.
  }
  if (inMemory) return inMemory;
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as Partial<SubscriptionCheckoutReturnState>;
    if (
      parsed.v !== 1 ||
      parsed.billing !== "success" ||
      typeof parsed.capturedAt !== "number" ||
      now - parsed.capturedAt < 0 ||
      now - parsed.capturedAt > MAX_AGE_MS ||
      (parsed.sessionId !== null && typeof parsed.sessionId !== "string")
    ) {
      return null;
    }
    return {
      v: 1,
      billing: "success",
      sessionId: parsed.sessionId ?? null,
      capturedAt: parsed.capturedAt,
    };
  } catch {
    return null;
  }
}
