"use client";

import { ExternalLink } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { TechnologyBadge } from "~/app/admin/_components/technology-list";
import type { GithubOverviewModel, GithubRepoModel } from "~/types";
import { RepoReview } from "./repo-review";

export type GithubBoardProps = {
  overview: GithubOverviewModel;
};

/** `null` while GitHub is still computing a repo's contributor stats. */
const formatLines = (repo: GithubRepoModel) =>
  repo.linesAdded === null || repo.linesDeleted === null
    ? "—"
    : `+${repo.linesAdded.toLocaleString("en-US")} / −${repo.linesDeleted.toLocaleString("en-US")}`;

export const GithubBoard = ({ overview }: GithubBoardProps) => {
  const repos = [...overview.repos].sort(
    (a, b) => Date.parse(b.pushedAt) - Date.parse(a.pushedAt),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">GitHub</h1>
        <a
          href={`https://github.com/${overview.handle}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          @{overview.handle}
          <ExternalLink className="size-3.5" />
        </a>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="surface rounded-xl border border-border/60 px-4 py-3">
          <dt className="text-xs text-muted-foreground">Public repos</dt>
          <dd className="mt-0.5 text-xl font-bold tabular-nums">
            {overview.repoCount}
          </dd>
        </div>
        <div className="surface rounded-xl border border-border/60 px-4 py-3">
          <dt className="text-xs text-muted-foreground">Stars</dt>
          <dd className="mt-0.5 text-xl font-bold tabular-nums">
            {overview.totalStars}
          </dd>
        </div>
        <div className="surface rounded-xl border border-border/60 px-4 py-3">
          <dt className="text-xs text-muted-foreground">Pull requests</dt>
          <dd className="mt-0.5 text-xl font-bold tabular-nums">
            {overview.pullRequestCount}
          </dd>
        </div>
        <div className="surface rounded-xl border border-border/60 px-4 py-3">
          <dt className="text-xs text-muted-foreground">Comments</dt>
          <dd className="mt-0.5 text-xl font-bold tabular-nums">
            {overview.commentCount}
          </dd>
        </div>
      </dl>

      <h2 className="text-sm font-medium text-muted-foreground">
        Pushed in the last 30 days
      </h2>

      {/* `Table` wraps itself in an `overflow-x-auto` div, which would trap a
          sticky header — so this outer div scrolls both ways instead. */}
      <div className="surface max-h-[70vh] overflow-auto rounded-xl border border-border/60 [&>[data-slot=table-container]]:overflow-visible">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead>Repository</TableHead>
              <TableHead>Language</TableHead>
              <TableHead className="text-right">Stars</TableHead>
              <TableHead className="text-right">Forks</TableHead>
              <TableHead className="text-right">Lines</TableHead>
              <TableHead>Pushed</TableHead>
              <TableHead className="text-right">AI review</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {repos.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-muted-foreground"
                >
                  No repos pushed in the last 30 days.
                </TableCell>
              </TableRow>
            )}
            {repos.map((repo) => (
              <TableRow key={repo.id}>
                <TableCell className="max-w-sm">
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium hover:underline"
                  >
                    {repo.name}
                  </a>
                  {repo.isFork && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      fork
                    </Badge>
                  )}
                  {repo.description && (
                    <p
                      className="mt-0.5 line-clamp-1 text-xs text-muted-foreground"
                      title={repo.description}
                    >
                      {repo.description}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  {repo.language ? (
                    <TechnologyBadge name={repo.language} />
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {repo.stars}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {repo.forks}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatLines(repo)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(repo.pushedAt).toLocaleDateString("en-GB")}
                </TableCell>
                <TableCell className="text-right">
                  <RepoReview repo={repo.name} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
