import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AuthShellProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-6 bg-muted/40">
      <Link
        href="/"
        className="flex flex-col items-center justify-start gap-0 mb-8 min-w-0 rounded-lg text-foreground hover:opacity-90 transition-opacity"
      >
        <div className="flex items-center justify-start w-[100px] h-[30px] overflow-hidden">
          <Image
            src="/high-resolution-color-logo.png"
            alt="TrueCap"
            width={100}
            height={30}
            className="w-full h-full object-contain"
          />
        </div>
        <p className="hidden sm:block text-xs text-muted-foreground mt-0.5 truncate">
          Professional real estate investment calculator
        </p>
      </Link>

      <Card className="w-full max-w-md shadow-lg border-border/80">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl sm:text-2xl">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {children}
          {footer ? <div className="pt-2 text-center text-sm text-muted-foreground">{footer}</div> : null}
        </CardContent>
      </Card>
    </div>
  );
}
