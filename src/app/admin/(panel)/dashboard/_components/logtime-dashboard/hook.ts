import { useQueryParams } from "~/hooks";
import { dayOf, shiftDay, today } from "~/utils/admin-time";
import { computeLogtimeStats } from "~/utils/logtime-stats";
import type { DashboardRangeType, UseLogtimeDashboardProps } from "./type";

/** The range the dashboard opens on; it is left out of the URL. */
export const DEFAULT_RANGE: DashboardRangeType = "30d";

export const RANGE_OPTIONS: { value: DashboardRangeType; label: string }[] = [
  { value: "month", label: "This month" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
];

/** First day a range covers, counted back from `currentDay`; none for "all". */
export const rangeStart = (range: DashboardRangeType, currentDay: string) => {
  switch (range) {
    case "month":
      return `${currentDay.slice(0, 7)}-01`;
    case "30d":
      return shiftDay(currentDay, -29);
    case "90d":
      return shiftDay(currentDay, -89);
    case "year":
      return `${currentDay.slice(0, 4)}-01-01`;
    case "all":
      return undefined;
  }
};

export const useLogtimeDashboard = ({
  from,
  logtimes,
  tasks,
  projects,
  categories,
}: UseLogtimeDashboardProps) => {
  const { setParams } = useQueryParams();
  const currentDay = today();

  // "All time" starts at the oldest entry. The list arrives newest first.
  const oldest = logtimes.at(-1);
  const firstDay = from ?? (oldest ? dayOf(oldest.loggedAt) : currentDay);

  const stats = computeLogtimeStats({
    logtimes,
    tasks,
    projects,
    categories,
    from: firstDay,
    to: currentDay,
    today: currentDay,
  });

  const handleRangeChange = (value: DashboardRangeType) =>
    setParams({ range: value === DEFAULT_RANGE ? null : value });

  return { stats, handleRangeChange };
};
