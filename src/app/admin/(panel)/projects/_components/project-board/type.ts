import type { PageModel, TaskModel, WorkProjectModel } from "~/types";

export type ProjectBoardProps = {
  /** The rows on screen — one page of the list. */
  projects: PageModel<WorkProjectModel>;
  /** Only used to count each project's tasks. */
  tasks: TaskModel[];
};

export type UseProjectBoardProps = ProjectBoardProps & {};

export type ProjectProgress = {
  total: number;
  done: number;
};
