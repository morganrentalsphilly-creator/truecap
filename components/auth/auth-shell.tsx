import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLogo } from "@/components/brand/app-logo";

type AuthShellProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-6 bg-muted/40">
      <AppLogo className="mb-8 items-center" subtitleClassName="hidden sm:block" />

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
