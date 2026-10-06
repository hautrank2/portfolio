"use client";

import { cn } from "~/lib/utils";
import { formatDuration } from "~/utils/admin-time";
import type { LogtimeBucketModel } from "~/utils/logtime-stats";

export type ColumnChartProps = {
  buckets: LogtimeBucketModel[];
  /** What one column is, for the screen-reader table: "Day", "Week", "Month". */
  unitLabel: string;
};

/** Smallest "clean" number of hours at or above `hours`, for the top gridline. */
const niceCeiling = (hours: number) => {
  for (const step of [1, 2, 4, 6, 8, 10, 12, 16, 20, 24, 30, 40, 50, 60, 80, 100]) {
    if (hours <= step) return step;
  }
  return Math.ceil(hours / 50) * 50;
};

/**
 * Time on the x-axis, hours on the y-axis, one column per bucket. One series,
 * so one colour and no legend — the card's subtitle names what is plotted.
 */
export const ColumnChart = ({ buckets, unitLabel }: ColumnChartProps) => {
  const maxMinutes = Math.max(0, ...buckets.map((bucket) => bucket.minutes));
  const topHours = niceCeiling(maxMinutes / 60);
  const gridHours = [topHours, topHours / 2, 0];

  if (buckets.length === 0 || maxMinutes === 0) {
    return (
      <p className="py-10 text-center text-sm text-foreground/50">
        Nothing logged in this range.
      </p>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        {/* y-axis: clean round values, so unlabelled columns can still be read. */}
        <div
          aria-hidden
          className="flex h-44 w-8 shrink-0 flex-col justify-between text-right text-[11px] leading-none tabular-nums text-muted-foreground"
        >
          {gridHours.map((hours) => (
            <span key={hours} className="-translate-y-1/2 last:translate-y-1/2">
              {hours}h
            </span>
          ))}
        </div>

        <div className="relative h-44 min-w-0 flex-1">
          {/* Hairline, solid, recessive gridlines. */}
          <div aria-hidden className="absolute inset-0 flex flex-col justify-between">
            {gridHours.map((hours) => (
              <span key={hours} className="h-px w-full bg-border/70" />
            ))}
          </div>

          <ul className="absolute inset-0 flex items-end gap-[2px]">
            {buckets.map((bucket, index) => {
              const percent = (bucket.minutes / (topHours * 60)) * 100;
              // Keep the tooltip inside the plot at either end.
              const align =
                index < 3
                  ? "left-0"
                  : index > buckets.length - 4
                    ? "right-0"
                    : "left-1/2 -translate-x-1/2";

              return (
                <li
                  key={bucket.key}
                  tabIndex={0}
                  aria-label={`${bucket.label}: ${formatDuration(bucket.minutes)}`}
                  // The whole slot is the hover target, not just the thin bar.
                  className="group relative flex h-full min-w-0 flex-1 items-end justify-center outline-none"
                >
                  <span
                    className="w-full max-w-6 rounded-t-[4px] bg-[var(--viz-1)] transition-opacity group-hover:opacity-80 group-focus-visible:opacity-80"
                    style={{ height: `${percent}%` }}
                  />
                  <span
                    role="tooltip"
                    className={cn(
                      "pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md group-hover:block group-focus-visible:block",
                      align
                    )}
                  >
                    <span className="block text-muted-foreground">{bucket.label}</span>
                    <span className="font-semibold tabular-nums">
                      {formatDuration(bucket.minutes)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* x-axis ticks sit under their own column. */}
      <div aria-hidden className="ml-10 mt-1.5 flex gap-[2px]">
        {buckets.map((bucket) => (
          <span key={bucket.key} className="relative h-3 min-w-0 flex-1">
            {bucket.tick && (
              <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] leading-none text-muted-foreground">
                {bucket.tick}
              </span>
            )}
          </span>
        ))}
      </div>

      {/* The same numbers as a table, for anyone who cannot use the plot. */}
      <table className="sr-only">
        <caption>Logged time per {unitLabel.toLowerCase()}</caption>
        <thead>
          <tr>
            <th scope="col">{unitLabel}</th>
            <th scope="col">Time</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((bucket) => (
            <tr key={bucket.key}>
              <th scope="row">{bucket.label}</th>
              <td>{formatDuration(bucket.minutes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
