import type { TaskModel, WorkProjectModel } from "~/types";

export type TaskGanttProps = {
  /** Every task the filters let through — the chart is not paged. */
  tasks: TaskModel[];
  projectById: Map<string, WorkProjectModel>;
  onOpen: (task: TaskModel) => void;
};

export type UseTaskGanttProps = Pick<TaskGanttProps, "tasks">;

export type TaskGanttRow = {
  task: TaskModel;
  /** `YYYY-MM-DD`, in the admin zone like every day below. */
  start: string;
  /** Last day of the bar, inclusive. */
  end: string;
  /** Still open with no due date: the bar runs to today and fades out. */
  openEnded: boolean;
  /** Days past `end` the task has stayed open; 0 when it is not overdue. */
  overdueDays: number;
};
