import type { CategoryModel, TagModel } from "./label";

export type TaskStatusType = "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED";

export type TaskPriorityType = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

/** Every date is an ISO string — models cross the JSON boundary as they are. */
export type TaskModel = {
  id: string;
  title: string;
  description?: string;
  status: TaskStatusType;
  priority: TaskPriorityType;
  dueDate?: string;
  /** Optional: a task does not have to belong to a project. */
  projectId?: string;
  // Relations — stored as ids, resolved by the lib before the model leaves it.
  tags: TagModel[];
  categories: CategoryModel[];
  technologies: string[];
  createdAt: string;
  updatedAt: string;
  /** Set by the server when the status becomes `DONE`, cleared when it leaves. */
  completedAt?: string;
};

/** Narrows a task list. Both parts are optional and combine with AND. */
export type TaskFilterModel = {
  status?: TaskStatusType;
  projectId?: string;
};

/** What a client sends to create or replace a task: relations go by id. */
export type TaskInputModel = Pick<
  TaskModel,
  | "title"
  | "description"
  | "status"
  | "priority"
  | "dueDate"
  | "projectId"
  | "technologies"
> & {
  tagIds: string[];
  categoryIds: string[];
};
