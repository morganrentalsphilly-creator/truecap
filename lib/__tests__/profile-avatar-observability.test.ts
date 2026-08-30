import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "components/profile/profile-form.tsx"),
  "utf8",
);

describe("profile avatar observability", () => {
  it("reports the original upload error while showing sanitized copy", () => {
    const uploadStart = source.indexOf("const uploadCroppedAvatar = async () =>");
    const uploadEnd = source.indexOf(
      "const handleSendPasswordReset = async () =>",
      uploadStart,
    );
    const upload = source.slice(uploadStart, uploadEnd);

    expect(upload).toContain("} catch (error) {");
    expect(upload).toContain("description: friendlyToastError(error, {");
    expect(upload).toContain('feature: "profile-avatar"');
    expect(upload).not.toContain(
      'new Error("Profile avatar upload failed after session verification.")',
    );
  });
});
