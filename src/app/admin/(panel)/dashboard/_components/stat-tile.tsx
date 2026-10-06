"use client";

import { TriangleAlert } from "lucide-react";
import { cn } from "~/lib/utils";

export type StatTileProps = {
  label: string;
  value: string;
  /** A line of context under the value: what it is measured against. */
  detail?: string;
  /** The one number the dashboard leads with. Use it on a single tile. */
  hero?: boolean;
  /** Marks the tile as needing attention — shown as an icon, not colour alone. */
  warning?: boolean;
  className?: string;
};

/** A single headline number. Not a chart: one value needs no axes. */
export const StatTile = ({
  label,
  value,
  detail,
  hero = false,
  warning = false,
  className,
}: StatTileProps) => {
  return (
    <div
      className={cn(
        "surface flex flex-col rounded-xl border border-border/60 px-4 py-3",
        className
      )}
    >
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {warning && (
          <TriangleAlert aria-label="Needs attention" className="size-3.5 text-amber-500" />
        )}
        {label}
      </dt>
      {/* Proportional figures: tabular digits look loose at display sizes. */}
      <dd
        className={cn(
          "mt-1 font-semibold leading-none tracking-tight",
          hero ? "text-5xl" : "text-2xl"
        )}
      >
        {value}
      </dd>
      {detail && <p className="mt-2 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
};
