import { describe, expect, it } from "vitest";
import { isProductionGoogleHost } from "@/lib/analytics/google-host";

describe("production Google measurement host boundary", () => {
  it.each(["usetruecap.com", "www.usetruecap.com", "USETRUECAP.COM"])("allows %s", host => {
    expect(isProductionGoogleHost(host)).toBe(true);
  });

  it.each(["localhost", "127.0.0.1", "truecap-preview.vercel.app", "usetruecap.com.example.com", "example.com", ""])("rejects %s", host => {
    expect(isProductionGoogleHost(host)).toBe(false);
  });
});
