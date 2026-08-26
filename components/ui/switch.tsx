"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex size-11 shrink-0 items-center justify-center rounded-md outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&[data-state=checked]>span]:bg-primary [&[data-state=unchecked]>span]:bg-input dark:[&[data-state=unchecked]>span]:bg-input/80",
        className,
      )}
      {...props}
    >
      <span className="pointer-events-none inline-flex h-[1.15rem] w-8 items-center rounded-full border border-transparent shadow-xs transition-colors">
        <SwitchPrimitive.Thumb
          data-slot="switch-thumb"
          className="bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
        />
      </span>
    </SwitchPrimitive.Root>
  );
}

export { Switch };
