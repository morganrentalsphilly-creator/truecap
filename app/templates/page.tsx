// Legacy route. Analysis templates moved under /dashboard.
// permanentRedirect (308) rather than redirect (307) — see app/compare/page.tsx.
import { permanentRedirect } from "next/navigation";

export default function TemplatesPage() {
  permanentRedirect("/dashboard/templates");
}
