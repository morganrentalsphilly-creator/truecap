import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ unpublish: vi.fn(async () => "unpublished" as const) }));

vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: () => ({}) }));
vi.mock("@/lib/testimonials/store", () => ({ unpublishTestimonialByToken: mocks.unpublish }));

import { GET, POST } from "@/app/api/testimonials/unpublish/route";

const TOKEN = "a".repeat(48);
const URL_WITH_TOKEN = `https://usetruecap.com/api/testimonials/unpublish?token=${TOKEN}`;

describe("founder veto link", () => {
  it("GET is side-effect free: it renders a confirmation form and never unpublishes", async () => {
    const response = await GET(new Request(URL_WITH_TOKEN));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-robots-tag")).toBe("noindex");
    expect(response.headers.get("cache-control")).toBe("no-store");
    const html = await response.text();
    expect(html).toContain('method="post"');
    expect(html).toContain(`name="token" value="${TOKEN}"`);
    expect(mocks.unpublish).not.toHaveBeenCalled();
  });

  it("GET with a malformed token is a 404 that echoes nothing back", async () => {
    const response = await GET(new Request("https://usetruecap.com/api/testimonials/unpublish?token=%3Cscript%3E"));
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain("<script>");
    expect(mocks.unpublish).not.toHaveBeenCalled();
  });

  it("POST with the form token performs the unpublish", async () => {
    const form = new FormData();
    form.set("token", TOKEN);
    const response = await POST(
      new Request("https://usetruecap.com/api/testimonials/unpublish", { method: "POST", body: form }),
    );
    expect(response.status).toBe(200);
    expect(mocks.unpublish).toHaveBeenCalledWith({}, TOKEN);
    expect(await response.text()).toContain("no longer published");
  });
});
