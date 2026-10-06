"use client";

import { formatDuration } from "~/utils/admin-time";
import type { LogtimeRankModel } from "~/utils/logtime-stats";

export type RankBarsProps = {
  rows: LogtimeRankModel[];
  /** Shown when there is nothing to rank. */
  emptyMessage: string;
};

/**
 * Horizontal bars comparing magnitude, each with its label and value written
 * out — so it reads as a table as well as a chart. All bars share one colour:
 * the job is "how much", not "which one". An entity's own colour (a project's,
 * a category's) rides beside its name as a dot.
 */
export const RankBars = ({ rows, emptyMessage }: RankBarsProps) => {
  const maxMinutes = Math.max(0, ...rows.map((row) => row.minutes));
  const totalMinutes = rows.reduce((sum, row) => sum + row.minutes, 0);

  if (maxMinutes === 0) {
    return <p className="py-6 text-center text-sm text-foreground/50">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-2">
      {rows.map((row) => {
        const share = Math.round((row.minutes / totalMinutes) * 100);
        return (
          <li
            key={row.key}
            title={`${row.label} · ${formatDuration(row.minutes)} · ${share}%`}
            className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-3 text-xs"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              {row.color && (
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  // The colour is user data, so it cannot be a Tailwind class.
                  style={{ backgroundColor: row.color }}
                />
              )}
              <span className="truncate">{row.label}</span>
            </span>
            <span className="h-3">
              {row.minutes > 0 && (
                <span
                  className="block h-full min-w-[2px] rounded-r-[4px] bg-[var(--viz-1)]"
                  style={{ width: `${(row.minutes / maxMinutes) * 100}%` }}
                />
              )}
            </span>
            <span className="tabular-nums text-muted-foreground">
              {formatDuration(row.minutes)}
            </span>
          </li>
        );
      })}
    </ul>
  );
};
