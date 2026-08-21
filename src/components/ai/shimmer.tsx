"use client";

import * as React from "react";
import { cn } from "~/lib/utils";

export type ShimmerProps = React.ComponentProps<"span">;

/**
 * Placeholder bar for output that has not arrived yet — the caret a terminal
 * shows while a command is still streaming.
 */
const Shimmer = ({ className, ...props }: ShimmerProps) => {
  return (
    <span
      data-slot="shimmer"
      aria-hidden
      className={cn(
        "inline-block h-4 animate-pulse rounded bg-foreground/20 align-middle",
        className
      )}
      {...props}
    />
  );
};

export { Shimmer };
