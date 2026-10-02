"use client";

import {
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

/**
 * A tooltip that also opens on a tap.
 *
 * Radix Tooltip is a hover and keyboard-focus pattern: its trigger closes the
 * tooltip on click. On a phone a tap focuses the trigger (which opens the
 * tooltip) and then clicks it (which closes it again), so the analyzer's (i)
 * guidance buttons opened nothing: the audit tapped ten of ten twice and saw
 * no tooltip.
 *
 * This makes the tooltip controlled, the way GlossaryTip already is:
 *   - hover and keyboard focus still open it (Radix calls onOpenChange);
 *   - a tap or click toggles it. The click handler calls preventDefault,
 *     which is what stops Radix's own close-on-click (it checks
 *     event.defaultPrevented). The state the tooltip had at pointerdown is
 *     recorded first, because Radix closes an open tooltip on pointerdown
 *     and the click that follows must not reopen it;
 *   - Enter or Space on a native button arrives as a click with detail 0 and
 *     toggles from the current state;
 *   - Escape, blur, a tap elsewhere and scrolling still close it (Radix).
 *
 * Spread `triggerProps` on the element inside `<TooltipTrigger asChild>`.
 * A trigger that is not a native button (a `span role="button"`) also needs
 * `keyboardProps`, since Enter and Space do not click it.
 */
export function useTapTooltip() {
  const [open, setOpen] = useState(false);
  const openAtPointerDown = useRef(false);

  return {
    open,
    onOpenChange: setOpen,
    triggerProps: {
      onPointerDown: () => {
        openAtPointerDown.current = open;
      },
      onClick: (event: MouseEvent<HTMLElement>) => {
        event.preventDefault();
        if (event.detail === 0) {
          setOpen((current) => !current);
          return;
        }
        setOpen(!openAtPointerDown.current);
      },
    },
    keyboardProps: {
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        setOpen((current) => !current);
      },
    },
  };
}
