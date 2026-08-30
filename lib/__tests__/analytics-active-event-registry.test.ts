import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { ANALYTICS_EVENT_DICTIONARY } from "@/lib/analytics-event-dictionary";

type ActiveEvent = {
  event: string;
  properties: string[];
  location: string;
};

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "__tests__" ? [] : sourceFiles(path);
    }
    return /\.[tj]sx?$/.test(entry.name) ? [path] : [];
  });
}

function objectPropertyNames(value: ts.Expression | undefined): string[] {
  if (!value || !ts.isObjectLiteralExpression(value)) return [];
  return value.properties.flatMap((property) => {
    if (ts.isSpreadAssignment(property) || !property.name) return [];
    return ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
      ? [property.name.text]
      : [];
  });
}

function activeEvents(): ActiveEvent[] {
  const events: ActiveEvent[] = [];
  for (const path of ["app", "components", "lib"].flatMap(sourceFiles)) {
    const source = readFileSync(path, "utf8");
    const file = ts.createSourceFile(
      path,
      source,
      ts.ScriptTarget.Latest,
      true,
    );
    const visit = (node: ts.Node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "trackEvent" &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        events.push({
          event: node.arguments[0].text,
          properties: objectPropertyNames(node.arguments[1]),
          location: path,
        });
      }
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "captureServerEvent" &&
        ts.isObjectLiteralExpression(node.arguments[0])
      ) {
        const eventProperty = node.arguments[0].properties.find(
          (property): property is ts.PropertyAssignment =>
            ts.isPropertyAssignment(property) &&
            property.name?.getText(file) === "event",
        );
        const propertiesProperty = node.arguments[0].properties.find(
          (property): property is ts.PropertyAssignment =>
            ts.isPropertyAssignment(property) &&
            property.name?.getText(file) === "properties",
        );
        if (eventProperty && ts.isStringLiteral(eventProperty.initializer)) {
          events.push({
            event: eventProperty.initializer.text,
            properties: objectPropertyNames(propertiesProperty?.initializer),
            location: path,
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
  }
  return events;
}

describe("active analytics event registry", () => {
  it("documents every literal event and every literal property", () => {
    for (const { event, properties, location } of activeEvents()) {
      const definition =
        ANALYTICS_EVENT_DICTIONARY[
          event as keyof typeof ANALYTICS_EVENT_DICTIONARY
        ];
      expect(definition, `${event} in ${location}`).toBeDefined();
      for (const property of properties) {
        expect(
          definition?.allowedProperties,
          `${event}.${property} in ${location}`,
        ).toContain(property);
      }
    }
  });
});
