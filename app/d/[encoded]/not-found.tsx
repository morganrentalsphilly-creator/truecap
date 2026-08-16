import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function SharedDealNotFound() {
  return (
    <main
      id="main"
      className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center"
    >
      <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-2">
        TrueCap
      </div>
      <h1 className="text-xl sm:text-2xl font-bold text-foreground">
        Link couldn&apos;t be opened
      </h1>
      <p className="text-sm text-muted-foreground mt-2 max-w-md">
        This share link looks broken, expired, or uses an older format. Ask the
        sender to create a fresh link.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-primary hover:underline"
      >
        Go to TrueCap
        <ArrowUpRight className="w-4 h-4" aria-hidden />
      </Link>
    </main>
  );
}
