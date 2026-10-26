import { z } from "zod";

/**
 * Zod 3's array.max() reports a size error but still parses every element.
 * Reject an oversized array before that work, using the same public limit
 * and error. The typed identity gate preserves the array's input/output types
 * (including transformed elements) and leaves ordinary validation unchanged.
 * This bounds these arrays only; it is not a general payload-size guard.
 */
export function boundedArray<Element extends z.ZodTypeAny>(
  schema: z.ZodArray<Element>,
  maximum: number,
  message?: string,
) {
  return z.custom<z.input<typeof schema>>()
    .superRefine((value, context) => {
      if (Array.isArray(value) && value.length > maximum) {
        context.addIssue({
          code: z.ZodIssueCode.too_big,
          type: "array",
          maximum,
          inclusive: true,
          exact: false,
          message,
          fatal: true,
        });
      }
    })
    .pipe(schema.max(maximum, message));
}
