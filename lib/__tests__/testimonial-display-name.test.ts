import { describe, expect, it } from "vitest";
import { formatTestimonialDisplayName } from "@/lib/testimonial-display-name";

describe("testimonial display-name consent", () => {
  it("returns only the attribution format the submitter selected", () => {
    expect(formatTestimonialDisplayName("Morgan Jane Page", "full_name")).toBe(
      "Morgan Jane Page",
    );
    expect(
      formatTestimonialDisplayName(
        "Morgan Jane Page",
        "first_name_last_initial",
      ),
    ).toBe("Morgan P.");
    expect(formatTestimonialDisplayName("Morgan Jane Page", "initials")).toBe(
      "M.J.P.",
    );
    expect(formatTestimonialDisplayName("Morgan Jane Page", "anonymous")).toBe(
      "Anonymous",
    );
  });

  it("fails closed when a non-anonymous format has no name", () => {
    expect(formatTestimonialDisplayName(" ", "full_name")).toBeNull();
    expect(formatTestimonialDisplayName(null, "initials")).toBeNull();
  });
});
