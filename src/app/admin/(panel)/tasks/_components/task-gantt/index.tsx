"use client";

import { StatusDot } from "~/app/admin/_components/status-select";
import { taskStatusColorData } from "~/data/admin";
import { cn } from "~/lib/utils";
import { formatDay, formatMonth } from "~/utils/admin-time";
import { DAY_WIDTH, NAME_WIDTH, useTaskGantt } from "./hook";
import type { TaskGanttProps } from "./type";

// A month narrower than this gets no label: it would run into the next one.
const MIN_LABELLED_DAYS = 5;

export const TaskGantt = ({ tasks, projectById, onOpen }: TaskGanttProps) => {
  const { scrollRef, rows, days, months, offsetOf, todayLeft } = useTaskGantt({ tasks });
  const timelineWidth = days.length * DAY_WIDTH;

  return (
    <div className="surface overflow-hidden rounded-xl border border-border/60">
      {rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-foreground/50">
          No tasks match these filters.
        </p>
      ) : (
        <div
          ref={scrollRef}
          className="max-h-[max(16rem,calc(100dvh-18rem))] overflow-auto"
        >
          <div style={{ width: NAME_WIDTH + timelineWidth }}>
            {/* Sticky cells sit above what scrolls under them, so they are opaque. */}
            <div className="sticky top-0 z-40 flex bg-card shadow-[inset_0_-1px_0_var(--border)]">
              <div
                className="sticky left-0 z-10 flex shrink-0 items-end bg-card px-4 pb-1.5 text-sm font-medium"
                style={{ width: NAME_WIDTH }}
              >
                Task
              </div>
              <div style={{ width: timelineWidth }}>
                <div className="flex">
                  {months.map(({ month, count }) => (
                    <div
                      key={month}
                      className="h-7 border-l border-border/60 pt-1.5 text-xs font-medium whitespace-nowrap text-foreground/70"
                      style={{ width: count * DAY_WIDTH }}
                    >
                      {count >= MIN_LABELLED_DAYS && (
                        <span
                          className="sticky inline-block px-2"
                          style={{ left: NAME_WIDTH }}
                        >
                          {formatMonth(month)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex">
                  {days.map(({ day, isWeekend, isToday }) => (
                    <div
                      key={day}
                      className={cn(
                        "shrink-0 pb-1.5 text-center text-[11px] tabular-nums",
                        isToday
                          ? "font-semibold text-primary"
                          : isWeekend
                            ? "text-foreground/40"
                            : "text-foreground/60"
                      )}
                      style={{ width: DAY_WIDTH }}
                    >
                      {Number(day.slice(8))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative">
              {/* Drawn once behind every row rather than repeated in each. */}
              <div
                aria-hidden
                className="absolute inset-y-0"
                style={{ left: NAME_WIDTH, width: timelineWidth }}
              >
                {days.map(
                  ({ day, isWeekend }, index) =>
                    isWeekend && (
                      <div
                        key={day}
                        className="absolute inset-y-0 bg-foreground/[0.04]"
                        style={{ left: index * DAY_WIDTH, width: DAY_WIDTH }}
                      />
                    )
                )}
                <div
                  className="absolute inset-y-0 z-20 w-px bg-primary"
                  style={{ left: todayLeft + DAY_WIDTH / 2 }}
                />
              </div>

              {rows.map(({ task, start, end, openEnded, overdueDays }) => {
                const color = taskStatusColorData[task.status];
                const closed = task.status === "DONE" || task.status === "CANCELLED";
                const project = task.projectId
                  ? projectById.get(task.projectId)
                  : undefined;
                const range = `${formatDay(start)} → ${openEnded ? "no due date" : formatDay(end)}`;
                const barLeft = offsetOf(start);
                const barWidth = offsetOf(end) - barLeft + DAY_WIDTH;

                return (
                  <div
                    key={task.id}
                    className="relative flex h-11 border-b border-border/40 last:border-b-0"
                  >
                    <button
                      type="button"
                      onClick={() => onOpen(task)}
                      title={task.title}
                      className="sticky left-0 z-30 flex shrink-0 items-center gap-2 bg-card px-4 text-left transition-colors hover:bg-muted"
                      style={{ width: NAME_WIDTH }}
                    >
                      <StatusDot color={color} />
                      <span className="min-w-0">
                        <span
                          className={cn(
                            "block truncate text-sm font-medium",
                            closed && "text-foreground/50 line-through"
                          )}
                        >
                          {task.title}
                        </span>
                        {project && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {project.title}
                          </span>
                        )}
                      </span>
                    </button>

                    <div className="relative" style={{ width: timelineWidth }}>
                      <button
                        type="button"
                        onClick={() => onOpen(task)}
                        aria-label={`Edit ${task.title}, ${range}`}
                        title={`${task.title}\n${range}`}
                        className={cn(
                          "absolute top-3 z-10 h-5 rounded-md transition-opacity hover:opacity-80",
                          closed && "opacity-50",
                          (openEnded || overdueDays > 0) && "rounded-r-none"
                        )}
                        style={{
                          left: barLeft + 1,
                          width: barWidth - 2,
                          // The colour is config data, so it cannot be a Tailwind class.
                          background: openEnded
                            ? `linear-gradient(to right, ${color} 60%, ${color}33)`
                            : color,
                        }}
                      />
                      {overdueDays > 0 && (
                        <div
                          aria-hidden
                          className="absolute top-3 h-5 rounded-r-md bg-destructive/40"
                          style={{
                            left: barLeft + barWidth - 1,
                            width: overdueDays * DAY_WIDTH,
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <p className="border-t border-border/60 px-4 py-2 text-xs text-muted-foreground">
        {rows.length} {rows.length === 1 ? "task" : "tasks"}. Bars run from the start date
        (or the day it was created) to the due date; closed tasks end when they closed.
        Red is time past due.
      </p>
    </div>
  );
};
