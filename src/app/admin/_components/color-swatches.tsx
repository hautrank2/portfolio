"use client";

import { labelColorData } from "~/data/admin";
import { cn } from "~/lib/utils";

export type ColorSwatchesProps = {
  value: string;
  onChange: (value: string) => void;
  /** Accessible name of the group, e.g. "Project colour". */
  label: string;
  className?: string;
};

/** The fixed palette a project, category or tag picks its colour from. */
export const ColorSwatches = ({
  value,
  onChange,
  label,
  className,
}: ColorSwatchesProps) => {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("flex items-center gap-1", className)}
    >
      {labelColorData.map((swatch) => (
        <button
          key={swatch}
          type="button"
          role="radio"
          aria-checked={swatch === value}
          aria-label={swatch}
          onClick={() => onChange(swatch)}
          className={cn(
            "size-5 rounded-full border-2 outline-none transition-transform focus-visible:ring-[3px] focus-visible:ring-ring/50",
            swatch === value ? "scale-110 border-foreground" : "border-transparent"
          )}
          // The colour is data, so it cannot be a Tailwind class.
          style={{ backgroundColor: swatch }}
        />
      ))}
    </div>
  );
};
