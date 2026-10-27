import { profileData } from "~/data/site";
import { createHttpServer } from "~/lib/http-server";
import type { GithubOverviewModel, GithubRepoModel } from "~/types";

// Contributor stats are computed lazily by GitHub, so that one call can be
// slow the first time a repo is asked about — longer than the default.
const STATS_TIMEOUT_MS = 20_000;

const github = createHttpServer({
  baseURL: "https://api.github.com",
  timeout: STATS_TIMEOUT_MS,
  headers: {
    Accept: "application/vnd.github+json",
    ...(process.env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
      : {}),
  },
});

type GithubRepoResponse = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  fork: boolean;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  pushed_at: string;
};

type GithubSearchResponse = { total_count: number };

type GithubContributorStat = {
  author: { login: string } | null;
  weeks: { a: number; d: number }[];
};

const toRepoLines = (repo: GithubRepoResponse) => ({
  id: repo.id,
  name: repo.name,
  fullName: repo.full_name,
  description: repo.description ?? undefined,
  url: repo.html_url,
  isFork: repo.fork,
  language: repo.language ?? undefined,
  stars: repo.stargazers_count,
  forks: repo.forks_count,
  updatedAt: repo.updated_at,
  pushedAt: repo.pushed_at,
});

/** The handle's added/removed lines in one repo, from contributor stats. */
const fetchRepoLines = async (fullName: string, handle: string) => {
  const result = await github.get<GithubContributorStat[]>(
    `/repos/${fullName}/stats/contributors`,
    { validateStatus: (status) => status === 200 || status === 202 },
  );
  if (result.status === 202) return { linesAdded: null, linesDeleted: null };

  const mine = result.data.find((stat) => stat.author?.login === handle);
  const totals = (mine?.weeks ?? []).reduce(
    (sum, week) => ({ a: sum.a + week.a, d: sum.d + week.d }),
    { a: 0, d: 0 },
  );
  return { linesAdded: totals.a, linesDeleted: totals.d };
};

/** Every public repo the handle owns, plus its PR and comment counts. */
export const getGithubOverview = async (): Promise<GithubOverviewModel> => {
  const handle = profileData.handle;

  const [reposResult, prResult, commentResult] = await Promise.all([
    github.get<GithubRepoResponse[]>(`/users/${handle}/repos`, {
      params: { per_page: 100, type: "owner", sort: "pushed" },
    }),
    github.get<GithubSearchResponse>("/search/issues", {
      params: { q: `author:${handle} type:pr`, per_page: 1 },
    }),
    // Issue/PR comments only — Search has no endpoint for review comments.
    github.get<GithubSearchResponse>("/search/issues", {
      params: { q: `commenter:${handle}`, per_page: 1 },
    }),
  ]);

  const repos: GithubRepoModel[] = await Promise.all(
    reposResult.data.map(async (repo) => ({
      ...toRepoLines(repo),
      ...(await fetchRepoLines(repo.full_name, handle)),
    })),
  );

  return {
    handle,
    repoCount: repos.length,
    totalStars: repos.reduce((sum, repo) => sum + repo.stars, 0),
    pullRequestCount: prResult.data.total_count,
    commentCount: commentResult.data.total_count,
    repos,
  };
};
