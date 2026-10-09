import {
  taskStatusColorData,
  taskStatusData,
  taskStatusLabelData,
} from "~/data/admin";
import { useQueryParams, useResourceDialog } from "~/hooks";
import { splitList } from "~/lib/api-client";
import type {
  LogtimeInputModel,
  LogtimeModel,
  TaskInputModel,
  TaskModel,
  TaskStatusType,
} from "~/types";
import { dayOf, today, toIso } from "~/utils/admin-time";
import { localKeys, writeLocal } from "~/utils/local";
import {
  emptyValues as emptyLogValues,
  toInput as toLogInput,
  toValues as toLogValues,
} from "~/app/admin/(panel)/logtime/_components/log-board/hook";
import type { LogFormValues } from "~/app/admin/(panel)/logtime/_components/log-form/type";
import type { TaskFormValues } from "../task-form/type";
import type { TaskStatusOption, UseTaskBoardProps } from "./type";

/** Value of the project filter that means "do not filter". */
export const ALL_PROJECTS = "all";

const toValues = (task: TaskModel): TaskFormValues => ({
  title: task.title,
  description: task.description ?? "",
  status: task.status,
  priority: task.priority,
  dueDate: task.dueDate ? dayOf(task.dueDate) : "",
  projectId: task.projectId ?? "",
  tagIds: task.tags.map((tag) => tag.id),
  categoryIds: task.categories.map((category) => category.id),
  technologies: task.technologies.join(", "),
});

const toInput = (values: TaskFormValues): TaskInputModel => ({
  title: values.title.trim(),
  description: values.description.trim() || undefined,
  status: values.status,
  priority: values.priority,
  dueDate: values.dueDate ? toIso(values.dueDate) : undefined,
  projectId: values.projectId || undefined,
  tagIds: values.tagIds,
  categoryIds: values.categoryIds,
  technologies: splitList(values.technologies),
});

const isOpen = (status: TaskStatusType) =>
  status === "TODO" || status === "IN_PROGRESS";

export const useTaskBoard = ({
  filter,
  statusCounts,
  projects,
}: UseTaskBoardProps) => {
  const { setParams } = useQueryParams();
  const { handleReplace, ...dialog } = useResourceDialog<
    TaskModel,
    TaskFormValues,
    TaskInputModel
  >({
    endpoint: "/api/tasks",
    // A task added while looking at one project starts in that project.
    emptyValues: () => ({
      title: "",
      description: "",
      status: "TODO",
      priority: "MEDIUM",
      dueDate: "",
      projectId: filter.projectId ?? "",
      tagIds: [],
      categoryIds: [],
      technologies: "",
    }),
    toValues,
    toInput,
  });

  // A second dialog on the same page: time logged against a task, without
  // going to the logtime page for it.
  const logDialog = useResourceDialog<LogtimeModel, LogFormValues, LogtimeInputModel>({
    endpoint: "/api/logtimes",
    emptyValues: emptyLogValues,
    toValues: toLogValues,
    toInput: toLogInput,
  });

  /** Opens the logtime form for a new entry that starts out as this task's. */
  const handleLogtime = (task: TaskModel) =>
    logDialog.openForm(null, {
      taskId: task.id,
      categoryIds: task.categories.slice(0, 1).map((category) => category.id),
      technologies: task.technologies.join(", "),
    });

  /** Changes only the status, straight from the table. */
  const handleStatusChange = (task: TaskModel, status: TaskStatusType) =>
    handleReplace(task, { ...toInput(toValues(task)), status });

  // Filters live in the URL; a new filter has its own pages, so page resets.
  const handleStatusFilter = (status: TaskStatusType | null) =>
    setParams({ status, page: null });

  const handleProjectFilter = (value: string) => {
    const projectId = value === ALL_PROJECTS ? null : value;
    // Remembered so the list opens on the same project next time. Choosing
    // "All projects" forgets it — otherwise the default would come straight back.
    writeLocal(localKeys.adminTaskProject, projectId);
    setParams({ project: projectId, page: null });
  };

  const statusOptions: TaskStatusOption[] = [
    {
      value: null,
      label: "All",
      count: taskStatusData.reduce((sum, status) => sum + statusCounts[status], 0),
    },
    ...taskStatusData.map((status) => ({
      value: status,
      label: taskStatusLabelData[status],
      color: taskStatusColorData[status],
      count: statusCounts[status],
    })),
  ];

  const currentDay = today();
  /** Past its due day and still not finished or cancelled. */
  const isOverdue = (task: TaskModel) =>
    task.dueDate !== undefined &&
    isOpen(task.status) &&
    dayOf(task.dueDate) < currentDay;

  return {
    ...dialog,
    logDialog,
    handleLogtime,
    statusOptions,
    projectById: new Map(projects.map((project) => [project.id, project])),
    isOverdue,
    handleStatusChange,
    handleStatusFilter,
    handleProjectFilter,
  };
};
