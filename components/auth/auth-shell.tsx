import { Building2, Calculator, Database, ShieldCheck } from "lucide-react";
import { AppLogo } from "@/components/brand/app-logo";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  panelTitle?: string;
  panelDescription?: string;
  className?: string;
};

const trustItems = [
  {
    icon: Calculator,
    title: "Screen the deal",
    description: "See cash flow, cap rate, CoC, DSCR, Deal Score and a plain-English verdict.",
  },
  {
    icon: Database,
    title: "Transparent starting data",
    description: "HUD rent benchmarks, FRED rate benchmarks and state tax estimates—labeled and editable.",
  },
  {
    icon: ShieldCheck,
    title: "Private saved work",
    description: "Authenticated access, owner-scoped saved data and privacy controls.",
  },
];

export function AuthShell({
  title,
  description,
  children,
  footer,
  panelTitle = "Know what the deal needs before you make an offer.",
  panelDescription = "Transparent assumptions. Clear acquisition decisions. Your work saved securely.",
  className,
}: AuthShellProps) {
  return (
    <main id="main" className="min-h-[100dvh] bg-white px-4 py-8 text-foreground sm:px-6 lg:bg-[#eef4f8] lg:px-8">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-6xl flex-col items-center justify-center">
        <div className="mb-8 flex flex-col items-center text-center sm:mb-12">
          <AppLogo
            priority
            className="items-center"
            imageClassName="object-center"
            subtitleClassName="mt-2 text-sm sm:text-base"
          />
        </div>

        <section
          className={cn(
            "grid w-full max-w-[930px] overflow-hidden bg-white lg:rounded-[22px] lg:border lg:border-border/80 lg:bg-card lg:shadow-[0_24px_70px_rgba(15,23,42,0.12)] lg:grid-cols-[1fr_1fr]",
            className
          )}
        >
          <aside className="relative hidden min-h-[610px] overflow-hidden bg-[#07162d] bg-[url('/home2.jpg')] bg-cover bg-center p-9 text-white lg:block">
            <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(5,15,32,0.94),rgba(9,26,52,0.84)_48%,rgba(11,29,58,0.64)),radial-gradient(circle_at_85%_20%,rgba(46,97,255,0.22),transparent_32%)]" />
            <div className="absolute inset-x-0 bottom-0 h-72 bg-[linear-gradient(180deg,transparent,rgba(4,14,31,0.96))]" />
            <div className="relative z-10 flex h-full flex-col">
              <AppLogo
                href="/"
                onDark
                subtitle=""
                className="mb-16"
                imageClassName="object-left"
              />

              <div className="max-w-[300px]">
                <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white">
                  {panelTitle}
                </h2>
                <p className="mt-6 text-sm leading-relaxed text-white/78">{panelDescription}</p>
              </div>

              <div className="m-10 space-y-7">
                {trustItems.map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/25 text-white shadow-[0_12px_32px_rgba(0,112,196,0.25)]">
                      <item.icon className="size-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-white">{item.title}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-white/72">
                        {item.description}
                      </span>
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-auto flex items-center gap-2 text-[11px] text-white/76">
                <ShieldCheck className="size-4" />
                <span>Authenticated access</span>
                <span className="text-white/35">•</span>
                <span>Owner-scoped saved data</span>
                <span className="text-white/35">•</span>
                <span>Privacy controls</span>
              </div>
            </div>
          </aside>

          <div className="flex min-h-0 items-center justify-center px-1 py-4 sm:min-h-[540px] sm:px-9 sm:py-8 lg:min-h-[610px] lg:px-14">
            <div className="w-full max-w-[350px]">
              <div className="mb-8 text-center lg:text-left">
                <div className="mx-auto mb-6 flex size-24 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.95),rgba(0,112,196,0.12))] text-primary shadow-[0_18px_42px_rgba(0,112,196,0.16)] ring-1 ring-primary/10 lg:hidden">
                  <Building2 className="size-12 stroke-[1.8]" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {title}
                </h1>
                {description ? (
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                ) : null}
              </div>

              {children}
              {footer ? <div className="pt-5 text-center text-sm text-muted-foreground">{footer}</div> : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
