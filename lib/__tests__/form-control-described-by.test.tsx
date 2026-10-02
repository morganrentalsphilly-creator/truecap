/**
 * What describes a form field (go-to-market audit, row P2-73).
 *
 * FormControl (components/ui/form.tsx) hands its child an aria-describedby
 * that lists the field's description and, when there is one, its error. It
 * passes that through a Slot, and a Slot lets the child's own props win: an
 * input with a hand-set aria-describedby keeps only its own value, so the
 * error drops out of the description. The sign-up password field did that
 * (aria-describedby="password-policy"), and a rejected password was announced
 * once by role="alert" and then never read again with the field.
 *
 * Rendered on the server, where layout effects do not run: the description's
 * id joins the list after hydration (FormDescription registers itself in a
 * layout effect), so these cases read the error half of the list.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const ERROR = "Password must be at least 12 characters";

function Probe({ handSet }: { handSet: boolean }) {
  const form = useForm({ defaultValues: { password: "" } });
  // The state after a rejected sign-up: the field already carries an error.
  form.setError("password", { message: ERROR });
  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Password</FormLabel>
            <FormControl>
              {handSet ? (
                <Input aria-describedby="password-policy" {...field} />
              ) : (
                <Input {...field} />
              )}
            </FormControl>
            <FormDescription>Use 12 or more characters.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </Form>
  );
}

const attribute = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];

function rendered(handSet: boolean) {
  const html = renderToStaticMarkup(<Probe handSet={handSet} />);
  const input = html.match(/<input\b[^>]*>/)?.[0] ?? "";
  const message = html.match(/<p\b[^>]*data-slot="form-message"[^>]*>/)?.[0] ?? "";
  expect(html).toContain(ERROR);
  return {
    describedBy: (attribute(input, "aria-describedby") ?? "").split(" ").filter(Boolean),
    invalid: attribute(input, "aria-invalid"),
    messageId: attribute(message, "id"),
    messageRole: attribute(message, "role"),
  };
}

describe("FormControl describes a field by its error (P2-73)", () => {
  it("lists the error's id on the input when the input sets no aria-describedby of its own", () => {
    const field = rendered(false);
    expect(field.messageId).toBeTruthy();
    expect(field.messageRole).toBe("alert");
    expect(field.invalid).toBe("true");
    expect(field.describedBy).toContain(field.messageId);
  });

  it("loses the error when the input sets aria-describedby by hand: the defect", () => {
    const field = rendered(true);
    expect(field.messageId).toBeTruthy();
    expect(field.describedBy).toEqual(["password-policy"]);
    expect(field.describedBy).not.toContain(field.messageId);
  });

  it("the sign-up password field leaves both ids to FormControl", () => {
    const form = read("components/auth/sign-up-form.tsx");
    // No Input in the form sets the attribute by hand.
    expect(form).not.toMatch(/<Input\b[^>]*\baria-describedby=/);
    // The rule is still a description under the field, with FormControl's
    // own id (a hand-set id would leave the list pointing at nothing).
    expect(form).toMatch(
      /<FormDescription>\s*\{PASSWORD_POLICY_TEXT\}\s*<\/FormDescription>\s*<FormMessage \/>/,
    );
    expect(form).not.toMatch(/<FormDescription\s+id=/);
  });

  it("the sign-in fields say they are required, as the sign-up fields do", () => {
    // aria-required only: the form is noValidate and its own schema decides
    // what may be submitted, so nothing about submitting changes.
    const login = read("components/auth/login-form.tsx");
    const inputs = login.match(/<Input\b[^>]*>/g) ?? [];
    expect(inputs).toHaveLength(2);
    for (const tag of inputs) expect(tag).toContain('aria-required="true"');
    expect(login).toMatch(/<form onSubmit=\{form\.handleSubmit\(onSubmit\)\}[^>]*\bnoValidate>/);
  });
});
