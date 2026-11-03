import { useEffect, useRef } from "react";
import {
  daysBetween,
  daysInRange,
  dayOf,
  shiftDay,
  today,
  weekdayOf,
} from "~/utils/admin-time";
import type { TaskModel } from "~/types";
import type { TaskGanttRow, UseTaskGanttProps } from "./type";

/** Pixels per day. */
export const DAY_WIDTH = 28;
/** Width of the sticky task column. */
export const NAME_WIDTH = 192;

// Room either side of the bars, so the first and last are not flush to the edge.
const LEAD_DAYS = 3;
const TRAIL_DAYS = 7;

const toRow = (task: TaskModel, currentDay: string): TaskGanttRow => {
  const start = dayOf(task.startDate ?? task.createdAt);
  // A closed task ends when it really ended, not when it was due.
  const closedAt =
    task.status === "DONE"
      ? (task.completedAt ?? task.updatedAt)
      : task.status === "CANCELLED"
        ? task.updatedAt
        : undefined;
  const planned = closedAt ?? task.dueDate;
  const end = planned ? dayOf(planned) : currentDay;
  const lastDay = end < start ? start : end;

  return {
    task,
    start,
    end: lastDay,
    openEnded: !planned,
    overdueDays: closedAt || !planned ? 0 : Math.max(daysBetween(lastDay, currentDay), 0),
  };
};

const byStart = (a: TaskGanttRow, b: TaskGanttRow) =>
  a.start.localeCompare(b.start) || a.end.localeCompare(b.end);

export const useTaskGantt = ({ tasks }: UseTaskGanttProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentDay = today();
  const rows = tasks.map((task) => toRow(task, currentDay)).sort(byStart);

  // Today is always in range, so the chart never opens on a stretch of nothing.
  const firstDay = rows.reduce(
    (first, row) => (row.start < first ? row.start : first),
    currentDay
  );
  const lastDay = rows.reduce(
    (last, row) => (row.end > last ? row.end : last),
    currentDay
  );
  const from = shiftDay(firstDay, -LEAD_DAYS);
  const days = daysInRange(from, shiftDay(lastDay, TRAIL_DAYS)).map((day) => ({
    day,
    isWeekend: weekdayOf(day) >= 5,
    isToday: day === currentDay,
  }));

  const months: { month: string; count: number }[] = [];
  for (const { day } of days) {
    const month = day.slice(0, 7);
    const last = months.at(-1);
    if (last?.month === month) last.count += 1;
    else months.push({ month, count: 1 });
  }

  const offsetOf = (day: string) => daysBetween(from, day) * DAY_WIDTH;
  const todayLeft = offsetOf(currentDay);

  // Opens on today rather than on the oldest task.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const timelineWidth = container.clientWidth - NAME_WIDTH;
    container.scrollLeft = todayLeft - timelineWidth / 2;
  }, [todayLeft]);

  return { scrollRef, rows, days, months, offsetOf, todayLeft };
};
