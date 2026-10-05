"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { QueryStatus } from "~/app/admin/_components/query-status";
import { useApiQuery } from "~/hooks";
import { parsePageQuery } from "~/utils/pagination";
import type { PageModel, TaskModel, WorkProjectModel } from "~/types";
import { ProjectBoard } from "./_components/project-board";

const ProjectsContent = () => {
  const searchParams = useSearchParams();
  const { page, pageSize } = parsePageQuery({
    page: searchParams.get("page"),
    pageSize: searchParams.get("pageSize"),
  });

  const projects = useApiQuery<PageModel<WorkProjectModel>>(
    `/api/projects?page=${page}&pageSize=${pageSize}`
  );
  const tasks = useApiQuery<{ items: TaskModel[] }>("/api/tasks");

  if (!projects.data || !tasks.data) {
    return <QueryStatus error={projects.error ?? tasks.error} />;
  }

  return <ProjectBoard projects={projects.data} tasks={tasks.data.items} />;
};

export default function ProjectsPage() {
  return (
    // `useSearchParams` needs a boundary so the shell can still prerender.
    <Suspense fallback={<QueryStatus />}>
      <ProjectsContent />
    </Suspense>
  );
}
