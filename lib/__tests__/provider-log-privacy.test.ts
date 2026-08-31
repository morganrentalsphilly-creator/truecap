import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const enrichmentSource = readFileSync(
  join(process.cwd(), "app/actions/enrich-property.ts"),
  "utf8",
);

const STRIPE_LOG_SOURCES = [
  "app/api/stripe/webhooks/route.ts",
  "app/actions/billing.ts",
  "lib/stripe/subscription-sync.ts",
] as const;

const LOGGER_CALLEE =
  /^(?:console\.(?:log|warn|error)|Sentry\.capture(?:Message|Exception|Event)|reportUserBindingSkip)$/;
const RAW_PROVIDER_IDENTIFIER = new Set([
  "customerId",
  "existingCustomerId",
  "getCheckoutCustomerId",
  "getSubscriptionCustomerId",
  "priceId",
  "sessionId",
  "stripeCustomerId",
  "stripePriceId",
  "stripeSessionId",
  "stripeSubscriptionId",
  "subscriptionId",
  "stripe_customer_id",
  "stripe_price_id",
  "stripe_session_id",
  "stripe_subscription_id",
]);

function rawStripeIdentifiersInLogs(path: string): string[] {
  const source = readFileSync(join(process.cwd(), path), "utf8");
  const sourceFile = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const violations: string[] = [];

  function inspectLoggingArgument(
    node: ts.Node,
    reducedToCategory = false,
  ): void {
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(sourceFile) === "Boolean"
    ) {
      node.arguments.forEach((argument) =>
        inspectLoggingArgument(argument, true),
      );
      return;
    }
    if (
      !reducedToCategory &&
      ts.isIdentifier(node) &&
      RAW_PROVIDER_IDENTIFIER.has(node.text)
    ) {
      violations.push(node.text);
    }
    if (!reducedToCategory && ts.isPropertyAccessExpression(node)) {
      const owner = node.expression.getText(sourceFile);
      if (
        (node.name.text === "id" &&
          /(?:session|subscription|customer)$/i.test(owner)) ||
        (owner === "session" && node.name.text === "subscription")
      ) {
        violations.push(node.getText(sourceFile));
      }
    }
    ts.forEachChild(node, (child) =>
      inspectLoggingArgument(child, reducedToCategory),
    );
  }

  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      LOGGER_CALLEE.test(node.expression.getText(sourceFile))
    ) {
      node.arguments.forEach((argument) => inspectLoggingArgument(argument));
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

describe("provider logging privacy", () => {
  it("never writes request URLs, query strings, response bodies, or provider payloads to logs", () => {
    expect(enrichmentSource).not.toContain("${input}");
    expect(enrichmentSource).not.toContain("URL=${url}");
    expect(enrichmentSource).not.toContain("Body=");
    expect(enrichmentSource).not.toMatch(
      /console\.(?:warn|log|error)\([^\n]*,\s*(?:err|json|body)\s*\)/,
    );
    expect(enrichmentSource).not.toContain("ZIP ${input.zip}");
    expect(enrichmentSource).not.toContain('county="${input.county}"');
  });

  it("logs only controlled provider and error classifications", () => {
    expect(enrichmentSource).toContain('provider: "fred"');
    expect(enrichmentSource).toContain('provider: "hud"');
    expect(enrichmentSource).toContain('errorClass: "timeout"');
    expect(enrichmentSource).toContain("status: res.status");
  });

  it("keeps Stripe customer, checkout, price, and subscription ids out of production logs", () => {
    for (const path of STRIPE_LOG_SOURCES) {
      expect(rawStripeIdentifiersInLogs(path), path).toEqual([]);
    }
  });
});
