import { labelColorData } from "~/data/admin";
import { useResourceDialog } from "~/hooks";
import type {
  WorkProjectInputModel,
  WorkProjectModel,
  WorkProjectStatusType,
} from "~/types";
import type { ProjectFormValues } from "../project-form/type";
import type { ProjectProgress, UseProjectBoardProps } from "./type";

const emptyValues = (): ProjectFormValues => ({
  title: "",
  description: "",
  status: "ACTIVE",
  color: labelColorData[0],
});

const toValues = (project: WorkProjectModel): ProjectFormValues => ({
  title: project.title,
  description: project.description ?? "",
  status: project.status,
  color: project.color,
});

const toInput = (values: ProjectFormValues): WorkProjectInputModel => ({
  title: values.title.trim(),
  description: values.description.trim() || undefined,
  status: values.status,
  color: values.color,
});

export const useProjectBoard = ({ tasks }: UseProjectBoardProps) => {
  const { handleReplace, ...dialog } = useResourceDialog<
    WorkProjectModel,
    ProjectFormValues,
    WorkProjectInputModel
  >({
    endpoint: "/api/projects",
    emptyValues,
    toValues,
    toInput,
  });

  /** Changes only the status, straight from the table. */
  const handleStatusChange = (
    project: WorkProjectModel,
    status: WorkProjectStatusType
  ) => handleReplace(project, { ...toInput(toValues(project)), status });

  const progressById = new Map<string, ProjectProgress>();
  for (const task of tasks) {
    if (!task.projectId) continue;
    const progress = progressById.get(task.projectId) ?? { total: 0, done: 0 };
    progress.total += 1;
    if (task.status === "DONE") progress.done += 1;
    progressById.set(task.projectId, progress);
  }

  return { ...dialog, progressById, handleStatusChange };
};
