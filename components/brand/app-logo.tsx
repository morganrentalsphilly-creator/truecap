import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type AppLogoProps = {
  href?: string;
  subtitle?: string;
  className?: string;
  imageClassName?: string;
  subtitleClassName?: string;
  onDark?: boolean;
  priority?: boolean;
};

export function AppLogo({
  href = "/",
  subtitle = "Professional real estate investment calculator",
  className,
  imageClassName,
  subtitleClassName,
  onDark = false,
  priority = false,
}: AppLogoProps) {
  const content = (
    <>
      <div className="relative h-[30px] w-[112px] overflow-hidden">
        <Image
          src="/Logo-png-w.png"
          alt="Truecap"
          fill
          priority={priority}
          sizes="112px"
          className={cn("object-contain object-left", onDark && "brightness-0 invert", imageClassName)}
        />
       
      </div>
      {subtitle ? (
        <p
          className={cn(
            "mt-0.5 max-w-[190px] whitespace-normal break-words text-xs leading-snug",
            onDark ? "text-sidebar-foreground/65" : "text-muted-foreground",
            subtitleClassName
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </>
  );

  if (!href) {
    return <div className={cn("flex min-w-0 flex-col items-start", className)}>{content}</div>;
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex min-w-0 flex-col items-start rounded-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      {content}
    </Link>
  );
}
