/** Every date is an ISO string — models cross the JSON boundary as they are. */
export type LogtimeModel = {
  id: string;
  /** What was done — the one thing every entry has. */
  title: string;
  /** Rarely filled: anything worth keeping beyond the title. */
  note?: string;
  /** Optional: a logtime does not have to belong to a task. */
  taskId?: string;
  /** What kind of activity this was. */
  categoryId?: string;
  /** The day the work happened. */
  loggedAt: string;
  /** Stored in minutes; the form takes and shows hours. */
  durationMinutes: number;
  technologies: string[];
  createdAt: string;
  updatedAt: string;
};

/** Totals for a set of logtimes — what the month header on the page shows. */
export type LogtimeSummaryModel = {
  totalMinutes: number;
  /** Distinct days that have at least one logtime. */
  days: number;
  /**
   * Days of the month with nothing logged, counted up to today — days still
   * to come are not missed yet. `0` when the summary is not for one month.
   */
  missedDays: number;
  /** Most used first. */
  technologies: { name: string; count: number }[];
};

export type LogtimeInputModel = Omit<
  LogtimeModel,
  "id" | "createdAt" | "updatedAt"
>;
