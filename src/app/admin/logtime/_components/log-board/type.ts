import type { WorkLogModel } from "~/types";

export type LogBoardProps = {
  logs: WorkLogModel[];
  /** `YYYY-MM` currently shown. */
  month: string;
  username: string;
};

export type UseLogBoardProps = LogBoardProps & {};

export type LogDayGroup = {
  date: string;
  hours: number;
  logs: WorkLogModel[];
};

export type TechnologyCount = {
  name: string;
  count: number;
};
