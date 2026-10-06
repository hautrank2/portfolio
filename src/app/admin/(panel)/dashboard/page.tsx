"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { QueryStatus } from "~/app/admin/_components/query-status";
import { useApiQuery } from "~/hooks";
import type {
  CategoryModel,
  LogtimeModel,
  TaskModel,
  WorkProjectModel,
} from "~/types";
import { today } from "~/utils/admin-time";
import { LogtimeDashboard } from "./_components/logtime-dashboard";
import {
  DEFAULT_RANGE,
  RANGE_OPTIONS,
  rangeStart,
} from "./_components/logtime-dashboard/hook";

const DashboardContent = () => {
  const searchParams = useSearchParams();
  const requested = searchParams.get("range");
  // A range the URL got wrong falls back to the default rather than erroring.
  const range =
    RANGE_OPTIONS.find((option) => option.value === requested)?.value ??
    DEFAULT_RANGE;
  const currentDay = today();
  const from = rangeStart(range, currentDay);

  // One request for the whole period; the statistics are worked out here in
  // the browser, so switching range is the only thing that refetches.
  const logtimes = useApiQuery<{ items: LogtimeModel[] }>(
    from
      ? `/api/logtimes?from=${from}&to=${currentDay}`
      : `/api/logtimes?to=${currentDay}`,
  );
  const tasks = useApiQuery<{ items: TaskModel[] }>("/api/tasks");
  const projects = useApiQuery<{ items: WorkProjectModel[] }>("/api/projects");
  const categories = useApiQuery<{ items: CategoryModel[] }>("/api/categories");

  if (!logtimes.data || !tasks.data || !projects.data || !categories.data) {
    return (
      <QueryStatus
        error={
          logtimes.error ?? tasks.error ?? projects.error ?? categories.error
        }
      />
    );
  }

  return (
    <LogtimeDashboard
      range={range}
      from={from}
      logtimes={logtimes.data.items}
      tasks={tasks.data.items}
      projects={projects.data.items}
      categories={categories.data.items}
    />
  );
};

export default function DashboardPage() {
  return (
    // `useSearchParams` needs a boundary so the shell can still prerender.
    <Suspense fallback={<QueryStatus />}>
      <DashboardContent />
    </Suspense>
  );
}
