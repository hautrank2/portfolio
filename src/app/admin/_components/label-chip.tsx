"use client";

import { cn } from "~/lib/utils";
import type { LabelModel } from "~/types";

export type LabelChipProps = React.ComponentProps<"span"> & {
  label: Pick<LabelModel, "title" | "color">;
};

/** A category or tag: its colour as a dot, its title as text. */
export const LabelChip = ({ label, className, ...props }: LabelChipProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2 py-0.5 text-xs font-medium",
        className
      )}
      {...props}
    >
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full"
        // The colour is user data, so it cannot be a Tailwind class.
        style={{ backgroundColor: label.color }}
      />
      {label.title}
    </span>
  );
};
