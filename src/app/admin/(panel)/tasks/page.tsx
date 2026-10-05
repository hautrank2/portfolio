"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { QueryStatus } from "~/app/admin/_components/query-status";
import { taskStatusData } from "~/data/admin";
import { useApiQuery } from "~/hooks";
import { parsePageQuery } from "~/utils/pagination";
import { localKeys, readLocal } from "~/utils/local";
import { objectIdSchema } from "~/utils/schema";
import type {
  CategoryModel,
  PageModel,
  TagModel,
  TaskFilterModel,
  TaskModel,
  TaskStatusType,
  WorkProjectModel,
} from "~/types";
import { TaskBoard } from "./_components/task-board";

const statusSchema = z.enum(taskStatusData);

const TasksContent = () => {
  const searchParams = useSearchParams();
  // A filter the URL got wrong is dropped rather than turned into an error.
  const status = statusSchema.safeParse(searchParams.get("status"));
  // `?project=` wins; without it the list opens on the project it was last
  // filtered by. Reading storage during render is safe here: everything under
  // `useSearchParams` renders in the browser only.
  const projectId = objectIdSchema.safeParse(
    searchParams.get("project") ?? readLocal(localKeys.adminTaskProject),
  );
  const filter: TaskFilterModel = {
    status: status.success ? status.data : undefined,
    projectId: projectId.success ? projectId.data : undefined,
  };
  const { page, pageSize } = parsePageQuery({
    page: searchParams.get("page"),
    pageSize: searchParams.get("pageSize"),
  });

  const listQuery = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (filter.status) listQuery.set("status", filter.status);
  if (filter.projectId) listQuery.set("project", filter.projectId);

  const tasks = useApiQuery<PageModel<TaskModel>>(`/api/tasks?${listQuery}`);
  const statusCounts = useApiQuery<Record<TaskStatusType, number>>(
    filter.projectId
      ? `/api/tasks/status-counts?project=${filter.projectId}`
      : "/api/tasks/status-counts"
  );
  const projects = useApiQuery<{ items: WorkProjectModel[] }>("/api/projects");
  const tags = useApiQuery<{ items: TagModel[] }>("/api/tags");
  const categories = useApiQuery<{ items: CategoryModel[] }>("/api/categories");

  if (
    !tasks.data ||
    !statusCounts.data ||
    !projects.data ||
    !tags.data ||
    !categories.data
  ) {
    return (
      <QueryStatus
        error={
          tasks.error ??
          statusCounts.error ??
          projects.error ??
          tags.error ??
          categories.error
        }
      />
    );
  }

  return (
    <TaskBoard
      tasks={tasks.data}
      filter={filter}
      statusCounts={statusCounts.data}
      projects={projects.data.items}
      tags={tags.data.items}
      categories={categories.data.items}
    />
  );
};

export default function TasksPage() {
  return (
    // `useSearchParams` needs a boundary so the shell can still prerender.
    <Suspense fallback={<QueryStatus />}>
      <TasksContent />
    </Suspense>
  );
}
