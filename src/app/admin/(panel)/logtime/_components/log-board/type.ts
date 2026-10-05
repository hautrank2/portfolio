import type {
  CategoryModel,
  LogtimeModel,
  LogtimeSummaryModel,
  PageQueryModel,
  TaskModel,
} from "~/types";

/** How the month is shown — `?view=table` in the URL, calendar by default. */
export type LogViewType = "table" | "calendar";

export type LogBoardProps = {
  view: LogViewType;
  /** Every logtime of the month, newest first. Both views read from it. */
  logtimes: LogtimeModel[];
  /** Which slice of `logtimes` the table shows — from the URL. */
  paging: PageQueryModel;
  /** Totals for the whole month, whichever page or view is shown. */
  summary: LogtimeSummaryModel;
  /** For the task picker and for showing which task an entry belongs to. */
  tasks: TaskModel[];
  categories: CategoryModel[];
  /** `YYYY-MM` currently shown. */
  month: string;
};

export type UseLogBoardProps = LogBoardProps & {};
