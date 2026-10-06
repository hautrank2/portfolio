import type {
  CategoryModel,
  LogtimeModel,
  TaskModel,
  WorkProjectModel,
} from "~/types";
import { dayOf, daysInRange, shiftDay, weekdayOf } from "~/utils/admin-time";

// Turns a list of logtimes into everything the dashboard draws. Pure — no
// fetching, no React — so the numbers can be reasoned about on their own.

/** One row of a ranking: who, how much, and (optionally) their own colour. */
export type LogtimeRankModel = {
  key: string;
  label: string;
  minutes: number;
  /** Colour the entity already has elsewhere (a project, a category). */
  color?: string;
};

/** One column of the time chart. */
export type LogtimeBucketModel = {
  key: string;
  /** Full description, for the tooltip: "Mon, 05 Oct 2026" or a span. */
  label: string;
  /** Short axis label, or `null` when this column carries no tick. */
  tick: string | null;
  minutes: number;
};

export type LogtimeGranularityType = "day" | "week" | "month";

export type LogtimeStatsModel = {
  from: string;
  to: string;
  totalMinutes: number;
  entries: number;
  daysLogged: number;
  /** Days in the range, up to today, with nothing logged. */
  daysMissed: number;
  /** Average over the days that have at least one entry. */
  averageMinutesPerLoggedDay: number;
  /** Consecutive logged days ending today (or yesterday, if today is empty). */
  currentStreak: number;
  longestStreak: number;
  /** Minutes per day (`YYYY-MM-DD`), only for days that have some. */
  minutesByDay: Map<string, number>;
  granularity: LogtimeGranularityType;
  buckets: LogtimeBucketModel[];
  byProject: LogtimeRankModel[];
  byCategory: LogtimeRankModel[];
  byTechnology: LogtimeRankModel[];
  /** Always seven rows, Monday first — not sorted by size. */
  byWeekday: LogtimeRankModel[];
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

const NO_PROJECT = "none";
const OTHER = "other";

const formatShortDay = (day: string) =>
  `${Number(day.slice(8))} ${MONTHS[Number(day.slice(5, 7)) - 1]}`;

const formatLongDay = (day: string) =>
  `${WEEKDAYS[weekdayOf(day)]}, ${formatShortDay(day)} ${day.slice(0, 4)}`;

/** Largest first; past `limit` the tail is folded into one "Other" row. */
const rank = (rows: Map<string, LogtimeRankModel>, limit: number) => {
  const sorted = [...rows.values()].sort(
    (a, b) => b.minutes - a.minutes || a.label.localeCompare(b.label)
  );
  if (sorted.length <= limit) return sorted;

  const tail = sorted.slice(limit - 1);
  return [
    ...sorted.slice(0, limit - 1),
    {
      key: OTHER,
      label: `Other (${tail.length})`,
      minutes: tail.reduce((sum, row) => sum + row.minutes, 0),
    },
  ];
};

const add = (
  rows: Map<string, LogtimeRankModel>,
  key: string,
  label: string,
  minutes: number,
  color?: string
) => {
  const row = rows.get(key) ?? { key, label, minutes: 0, color };
  row.minutes += minutes;
  rows.set(key, row);
};

// Enough columns to read a trend, few enough to stay wider than a hairline.
const pickGranularity = (dayCount: number): LogtimeGranularityType => {
  if (dayCount <= 45) return "day";
  if (dayCount <= 190) return "week";
  return "month";
};

const toBuckets = (
  days: string[],
  minutesByDay: Map<string, number>,
  granularity: LogtimeGranularityType
): LogtimeBucketModel[] => {
  const buckets = new Map<string, LogtimeBucketModel & { last: string }>();

  for (const day of days) {
    const minutes = minutesByDay.get(day) ?? 0;
    // The bucket a day falls in is named after its first day.
    const key =
      granularity === "day"
        ? day
        : granularity === "week"
          ? shiftDay(day, -weekdayOf(day))
          : `${day.slice(0, 7)}-01`;

    const bucket = buckets.get(key);
    if (bucket) {
      bucket.minutes += minutes;
      bucket.last = day;
    } else {
      buckets.set(key, { key, label: "", tick: null, minutes, last: day });
    }
  }

  return [...buckets.values()].map(({ last, ...bucket }, index) => {
    const month = MONTHS[Number(bucket.key.slice(5, 7)) - 1];
    if (granularity === "day") {
      // A tick each Monday, plus the first column so the axis never starts bare.
      const isMonday = weekdayOf(bucket.key) === 0;
      return {
        ...bucket,
        label: formatLongDay(bucket.key),
        tick: isMonday || index === 0 ? formatShortDay(bucket.key) : null,
      };
    }
    if (granularity === "week") {
      return {
        ...bucket,
        label: `${formatShortDay(bucket.key)} – ${formatShortDay(last)}`,
        // Every other week: the labels are wider than the columns.
        tick: index % 2 === 0 ? formatShortDay(bucket.key) : null,
      };
    }
    return {
      ...bucket,
      label: `${month} ${bucket.key.slice(0, 4)}`,
      tick: month,
    };
  });
};

const countStreaks = (days: string[], minutesByDay: Map<string, number>) => {
  let longest = 0;
  let run = 0;
  for (const day of days) {
    run = minutesByDay.has(day) ? run + 1 : 0;
    longest = Math.max(longest, run);
  }

  // Today not being logged *yet* does not break a streak; a missed yesterday does.
  let cursor = days.length - 1;
  if (cursor >= 0 && !minutesByDay.has(days[cursor])) cursor -= 1;
  let current = 0;
  while (cursor >= 0 && minutesByDay.has(days[cursor])) {
    current += 1;
    cursor -= 1;
  }

  return { longest, current };
};

type StatsInput = {
  logtimes: LogtimeModel[];
  tasks: TaskModel[];
  projects: WorkProjectModel[];
  categories: CategoryModel[];
  /** First day of the range, `YYYY-MM-DD`. */
  from: string;
  /** Last day of the range; days after `today` are never counted as missed. */
  to: string;
  today: string;
};

export const computeLogtimeStats = ({
  logtimes,
  tasks,
  projects,
  categories,
  from,
  to,
  today,
}: StatsInput): LogtimeStatsModel => {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const categoryById = new Map(
    categories.map((category) => [category.id, category])
  );

  const minutesByDay = new Map<string, number>();
  const byProject = new Map<string, LogtimeRankModel>();
  const byCategory = new Map<string, LogtimeRankModel>();
  const byTechnology = new Map<string, LogtimeRankModel>();
  const weekdayMinutes = Array<number>(7).fill(0);
  let totalMinutes = 0;

  for (const logtime of logtimes) {
    const day = dayOf(logtime.loggedAt);
    const minutes = logtime.durationMinutes;
    totalMinutes += minutes;
    minutesByDay.set(day, (minutesByDay.get(day) ?? 0) + minutes);
    weekdayMinutes[weekdayOf(day)] += minutes;

    // A logtime reaches its project through its task.
    const task = logtime.taskId ? taskById.get(logtime.taskId) : undefined;
    const project = task?.projectId ? projectById.get(task.projectId) : undefined;
    if (project) add(byProject, project.id, project.title, minutes, project.color);
    else add(byProject, NO_PROJECT, "No project", minutes);

    const category = logtime.categoryId
      ? categoryById.get(logtime.categoryId)
      : undefined;
    if (category) {
      add(byCategory, category.id, category.title, minutes, category.color);
    } else {
      add(byCategory, NO_PROJECT, "No category", minutes);
    }

    // An entry with three technologies counts its whole time for each: the
    // question is "how long did I spend with X", not a split of the day.
    for (const technology of logtime.technologies) {
      add(byTechnology, technology.toLowerCase(), technology, minutes);
    }
  }

  // Missed days and streaks only make sense up to today.
  const lastCountedDay = to < today ? to : today;
  const days = from <= lastCountedDay ? daysInRange(from, lastCountedDay) : [];
  const daysLogged = days.filter((day) => minutesByDay.has(day)).length;
  const streaks = countStreaks(days, minutesByDay);
  const granularity = pickGranularity(days.length);

  return {
    from,
    to: lastCountedDay,
    totalMinutes,
    entries: logtimes.length,
    daysLogged,
    daysMissed: days.length - daysLogged,
    averageMinutesPerLoggedDay:
      daysLogged > 0 ? Math.round(totalMinutes / daysLogged) : 0,
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    minutesByDay,
    granularity,
    buckets: toBuckets(days, minutesByDay, granularity),
    byProject: rank(byProject, 8),
    byCategory: rank(byCategory, 8),
    byTechnology: rank(byTechnology, 10),
    byWeekday: WEEKDAYS.map((label, index) => ({
      key: label,
      label,
      minutes: weekdayMinutes[index],
    })),
  };
};
