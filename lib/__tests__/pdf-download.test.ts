import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadPdfBlob } from "@/lib/pdf/download";

describe("PDF browser downloads", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("delays object URL revocation until Safari has accepted the download", () => {
    vi.useFakeTimers();
    const click = vi.fn();
    const remove = vi.fn();
    const anchor = {
      href: "",
      download: "",
      rel: "",
      style: { display: "" },
      click,
      remove,
    };
    const appendChild = vi.fn();
    const createObjectURL = vi.fn(() => "blob:truecap-report");
    const revokeObjectURL = vi.fn();

    vi.stubGlobal("document", {
      createElement: vi.fn(() => anchor),
      body: { appendChild },
    });
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    const report = new Blob(["%PDF-1.7"], { type: "application/pdf" });
    downloadPdfBlob(report, "TrueCap-Report.pdf");

    expect(createObjectURL).toHaveBeenCalledWith(report);
    expect(anchor).toMatchObject({
      href: "blob:truecap-report",
      download: "TrueCap-Report.pdf",
      rel: "noopener",
    });
    expect(appendChild).toHaveBeenCalledWith(anchor);
    expect(click).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledOnce();
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(999);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(revokeObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:truecap-report");
  });
});
