import type {
  CategoryModel,
  LogtimeModel,
  TaskModel,
  WorkProjectModel,
} from "~/types";

/** The period the dashboard covers — `?range=` in the URL. */
export type DashboardRangeType = "month" | "30d" | "90d" | "year" | "all";

export type LogtimeDashboardProps = {
  range: DashboardRangeType;
  /** First day of the range; `undefined` for "all time" (then the data decides). */
  from?: string;
  /** Every logtime in the range. */
  logtimes: LogtimeModel[];
  tasks: TaskModel[];
  projects: WorkProjectModel[];
  categories: CategoryModel[];
};

export type UseLogtimeDashboardProps = LogtimeDashboardProps & {};
