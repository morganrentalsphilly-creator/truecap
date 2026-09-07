import { describe, expect, it } from "vitest";
import { formatTestimonialDisplayName } from "@/lib/testimonial-display-name";

describe("testimonial display-name consent", () => {
  it("returns only the attribution format the submitter selected", () => {
    expect(formatTestimonialDisplayName("Jordan Avery Lee", "full_name")).toBe(
      "Jordan Avery Lee",
    );
    expect(
      formatTestimonialDisplayName(
        "Jordan Avery Lee",
        "first_name_last_initial",
      ),
    ).toBe("Jordan L.");
    expect(formatTestimonialDisplayName("Jordan Avery Lee", "initials")).toBe(
      "J.A.L.",
    );
    expect(formatTestimonialDisplayName("Jordan Avery Lee", "anonymous")).toBe(
      "Anonymous",
    );
  });

  it("fails closed when a non-anonymous format has no name", () => {
    expect(formatTestimonialDisplayName(" ", "full_name")).toBeNull();
    expect(formatTestimonialDisplayName(null, "initials")).toBeNull();
  });
});
