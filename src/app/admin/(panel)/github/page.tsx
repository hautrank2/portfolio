"use client";

import { QueryStatus } from "~/app/admin/_components/query-status";
import { useApiQuery } from "~/hooks";
import type { GithubOverviewModel } from "~/types";
import { GithubBoard } from "./_components/github-board";

export default function GithubPage() {
  const overview = useApiQuery<GithubOverviewModel>("/api/github/overview");

  if (!overview.data) return <QueryStatus error={overview.error} />;

  return <GithubBoard overview={overview.data} />;
}
