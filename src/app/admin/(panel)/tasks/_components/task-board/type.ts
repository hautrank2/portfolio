import type {
  CategoryModel,
  PageModel,
  TagModel,
  TaskFilterModel,
  TaskModel,
  TaskStatusType,
  WorkProjectModel,
} from "~/types";

export type TaskBoardProps = {
  /** The rows on screen — one page of the filtered list. */
  tasks: PageModel<TaskModel>;
  /** The filters in the URL (`?status=`, `?project=`), already validated. */
  filter: TaskFilterModel;
  /** Task count per status within the chosen project, for the filter tabs. */
  statusCounts: Record<TaskStatusType, number>;
  projects: WorkProjectModel[];
  tags: TagModel[];
  categories: CategoryModel[];
};

export type UseTaskBoardProps = TaskBoardProps & {};

export type TaskStatusOption = {
  /** `null` is "All". */
  value: TaskStatusType | null;
  label: string;
  /** `#rrggbb` of the status; "All" has none. */
  color?: string;
  count: number;
};
