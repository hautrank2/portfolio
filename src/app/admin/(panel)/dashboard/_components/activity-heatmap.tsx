"use client";

import { cn } from "~/lib/utils";
import {
  daysInRange,
  formatDay,
  formatDuration,
  shiftDay,
  weekdayOf,
} from "~/utils/admin-time";

export type ActivityHeatmapProps = {
  from: string;
  to: string;
  minutesByDay: Map<string, number>;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// One hue, four steps: more time is a stronger colour. The steps themselves
// are set per theme on the dashboard root (`--heat-1` … `--heat-4`).
const LEVEL_CLASSES = [
  "bg-foreground/[0.06]",
  "bg-[var(--heat-1)]",
  "bg-[var(--heat-2)]",
  "bg-[var(--heat-3)]",
  "bg-[var(--heat-4)]",
];

const levelOf = (minutes: number, maxMinutes: number) =>
  minutes === 0 ? 0 : Math.min(4, Math.ceil((minutes / maxMinutes) * 4));

/**
 * Every day of the range as a cell — weeks left to right, Monday at the top.
 * Shows rhythm and gaps at a glance; the exact hours are in the tooltip.
 */
export const ActivityHeatmap = ({ from, to, minutesByDay }: ActivityHeatmapProps) => {
  if (from > to) {
    return (
      <p className="py-6 text-center text-sm text-foreground/50">
        Nothing to show in this range.
      </p>
    );
  }

  const maxMinutes = Math.max(1, ...minutesByDay.values());
  // Start on the Monday of the first week; days outside the range stay blank.
  const gridStart = shiftDay(from, -weekdayOf(from));
  const gridEnd = shiftDay(to, 6 - weekdayOf(to));
  const days = daysInRange(gridStart, gridEnd);
  const weeks: string[][] = [];
  for (let start = 0; start < days.length; start += 7) {
    weeks.push(days.slice(start, start + 7));
  }

  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex gap-2">
          <div
            aria-hidden
            className="mt-4 grid grid-rows-7 gap-[2px] text-[10px] leading-3 text-muted-foreground"
          >
            {WEEKDAYS.map((weekday, index) => (
              // Every other label: seven would crowd a 12px row.
              <span key={weekday} className="h-3">
                {index % 2 === 0 ? weekday : ""}
              </span>
            ))}
          </div>

          <div className="flex gap-[2px]">
            {weeks.map((week, weekIndex) => {
              // Name the month above the column where it begins.
              const firstOfMonth = week.find((day) => day.endsWith("-01"));
              const monthLabel =
                weekIndex === 0
                  ? MONTHS[Number(from.slice(5, 7)) - 1]
                  : firstOfMonth
                    ? MONTHS[Number(firstOfMonth.slice(5, 7)) - 1]
                    : "";

              return (
                <div key={week[0]} className="flex flex-col gap-[2px]">
                  <span
                    aria-hidden
                    className="h-3 w-3 overflow-visible whitespace-nowrap text-[10px] leading-3 text-muted-foreground"
                  >
                    {monthLabel}
                  </span>
                  {week.map((day) => {
                    if (day < from || day > to) {
                      return <span key={day} className="size-3" />;
                    }
                    const minutes = minutesByDay.get(day) ?? 0;
                    return (
                      <span
                        key={day}
                        title={`${formatDay(day)} · ${
                          minutes > 0 ? formatDuration(minutes) : "nothing logged"
                        }`}
                        className={cn(
                          "size-3 rounded-[3px]",
                          LEVEL_CLASSES[levelOf(minutes, maxMinutes)]
                        )}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        Less
        {LEVEL_CLASSES.map((className) => (
          <span key={className} aria-hidden className={cn("size-3 rounded-[3px]", className)} />
        ))}
        More
        <span className="ml-2">(up to {formatDuration(maxMinutes)} in a day)</span>
      </p>
    </div>
  );
};
