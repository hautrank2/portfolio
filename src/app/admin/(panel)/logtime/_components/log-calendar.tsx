"use client";

import { Plus } from "lucide-react";
import { formatDuration, today, weeksOfMonth } from "~/utils/admin-time";
import { cn } from "~/lib/utils";
import type { LogtimeModel } from "~/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type LogCalendarProps = {
  /** `YYYY-MM`. */
  month: string;
  /** Every logtime of the month, grouped by day (`YYYY-MM-DD`). */
  logtimesByDay: Map<string, LogtimeModel[]>;
  onAdd: (day: string) => void;
  onEdit: (logtime: LogtimeModel) => void;
};

/**
 * The month as a grid of days. A past day with nothing logged is marked, so a
 * gap is visible at a glance; days still to come are just empty.
 */
export const LogCalendar = ({
  month,
  logtimesByDay,
  onAdd,
  onEdit,
}: LogCalendarProps) => {
  const currentDay = today();

  return (
    <div className="surface overflow-x-auto rounded-xl border border-border/60">
      <div className="min-w-[56rem]">
        <div className="grid grid-cols-7 border-b border-border/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {WEEKDAYS.map((weekday) => (
            <div key={weekday} className="px-3 py-2">
              {weekday}
            </div>
          ))}
        </div>

        {weeksOfMonth(month).map((week, weekIndex) => (
          <div
            key={weekIndex}
            className="grid grid-cols-7 border-b border-border/60 last:border-b-0"
          >
            {week.map((day, dayIndex) => {
              if (!day) {
                return (
                  <div
                    key={`pad-${dayIndex}`}
                    className="min-h-28 border-r border-border/60 bg-foreground/[0.02] last:border-r-0"
                  />
                );
              }

              const logtimes = logtimesByDay.get(day) ?? [];
              const minutes = logtimes.reduce(
                (sum, logtime) => sum + logtime.durationMinutes,
                0
              );
              const isToday = day === currentDay;
              const isMissed = day < currentDay && logtimes.length === 0;

              return (
                <div
                  key={day}
                  className={cn(
                    "group flex min-h-28 flex-col gap-1.5 border-r border-border/60 p-2 last:border-r-0",
                    isMissed && "bg-destructive/5"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "grid size-6 place-items-center rounded-full text-xs font-semibold tabular-nums",
                        isToday
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground/70"
                      )}
                    >
                      {Number(day.slice(8))}
                    </span>
                    <span className="flex items-center gap-1">
                      {minutes > 0 && (
                        <span className="text-xs font-medium tabular-nums text-muted-foreground">
                          {formatDuration(minutes)}
                        </span>
                      )}
                      {isMissed && (
                        <span className="text-[0.65rem] font-medium uppercase tracking-wide text-destructive/80">
                          No log
                        </span>
                      )}
                      <button
                        type="button"
                        aria-label={`Add logtime on ${day}`}
                        onClick={() => onAdd(day)}
                        className="grid size-5 place-items-center rounded text-muted-foreground opacity-0 outline-none transition-opacity hover:bg-foreground/10 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50 group-hover:opacity-100"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </span>
                  </div>

                  <ul className="space-y-1">
                    {logtimes.map((logtime) => (
                      <li key={logtime.id}>
                        <button
                          type="button"
                          title={`${logtime.title} · ${formatDuration(logtime.durationMinutes)}`}
                          onClick={() => onEdit(logtime)}
                          className="line-clamp-2 w-full rounded-md border border-primary/20 bg-primary/10 px-1.5 py-1 text-left text-xs leading-snug outline-none transition-colors hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-ring/50"
                        >
                          {logtime.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
