"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { QueryStatus } from "~/app/admin/_components/query-status";
import { useApiQuery } from "~/hooks";
import { currentMonth } from "~/utils/admin-time";
import { parsePageQuery } from "~/utils/pagination";
import { monthSchema } from "~/utils/schema";
import type {
  CategoryModel,
  LogtimeModel,
  LogtimeSummaryModel,
  TaskModel,
} from "~/types";
import { LogBoard } from "./_components/log-board";

const LogtimeContent = () => {
  const searchParams = useSearchParams();
  const parsedMonth = monthSchema.safeParse(searchParams.get("month"));
  const month = parsedMonth.success ? parsedMonth.data : currentMonth();
  const view = searchParams.get("view") === "table" ? "table" : "calendar";
  const paging = parsePageQuery({
    page: searchParams.get("page"),
    pageSize: searchParams.get("pageSize"),
  });

  // One request for the whole month serves both views: the calendar lays it
  // all out, the table pages through it on the client. A month is small, and
  // this way switching view or page does not hit the API again.
  const logtimes = useApiQuery<{ items: LogtimeModel[] }>(
    `/api/logtimes?month=${month}`,
  );
  const summary = useApiQuery<LogtimeSummaryModel>(
    `/api/logtimes/summary?month=${month}`,
  );
  const tasks = useApiQuery<{ items: TaskModel[] }>("/api/tasks");
  const categories = useApiQuery<{ items: CategoryModel[] }>("/api/categories");

  if (!logtimes.data || !summary.data || !tasks.data || !categories.data) {
    return (
      <QueryStatus
        error={
          logtimes.error ?? summary.error ?? tasks.error ?? categories.error
        }
      />
    );
  }

  return (
    <LogBoard
      view={view}
      logtimes={logtimes.data.items}
      paging={paging}
      summary={summary.data}
      tasks={tasks.data.items}
      categories={categories.data.items}
      month={month}
    />
  );
};

export default function LogtimePage() {
  return (
    // `useSearchParams` needs a boundary so the shell can still prerender.
    <Suspense fallback={<QueryStatus />}>
      <LogtimeContent />
    </Suspense>
  );
}
