"use client";

import NumberFlow from "@number-flow/react";
import { useLayoutEffect, useState, type ComponentProps } from "react";

type Props = ComponentProps<typeof NumberFlow> & { initialValue: number };

/** Initialize the animation host at the old value even if its chunk arrives
 * after the parent has received a new value. Advance before the next paint,
 * so the first change animates just like later changes. */
export default function NumberFlowRenderer({ initialValue, value, ...props }: Props) {
  const [displayedValue, setDisplayedValue] = useState(initialValue);
  useLayoutEffect(() => setDisplayedValue(value), [value]);
  return <NumberFlow {...props} value={displayedValue} />;
}
