import { profileData } from "~/data/site";
import { createHttpServer } from "~/lib/http-server";
import type { GithubOverviewModel, GithubRepoModel } from "~/types";

// Contributor stats are computed lazily by GitHub, so that one call can be
// slow the first time a repo is asked about — longer than the default.
const STATS_TIMEOUT_MS = 20_000;

// Only repos pushed this recently are listed — and only they cost a
// contributor-stats call, which keeps the page well under the rate limit.
const RECENT_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const githubHttp = createHttpServer({
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
  const result = await githubHttp.get<GithubContributorStat[]>(
    `/repos/${fullName}/stats/contributors`,
    { validateStatus: (status) => [200, 202, 204].includes(status) },
  );
  if (result.status === 202) return { linesAdded: null, linesDeleted: null };
  // 204 No Content — the repo has no commits yet, so nothing to count.
  if (result.status === 204) return { linesAdded: 0, linesDeleted: 0 };

  const mine = result.data.find((stat) => stat.author?.login === handle);
  const totals = (mine?.weeks ?? []).reduce(
    (sum, week) => ({ a: sum.a + week.a, d: sum.d + week.d }),
    { a: 0, d: 0 },
  );
  return { linesAdded: totals.a, linesDeleted: totals.d };
};

/**
 * The handle's public repos pushed in the last `RECENT_DAYS` days, plus
 * totals over all of them and the PR and comment counts.
 */
export const getGithubOverview = async (): Promise<GithubOverviewModel> => {
  const handle = profileData.handle;

  console.log("handle", handle);
  const [reposResult, prResult, issueCommentResult, prCommentResult] =
    await Promise.all([
      githubHttp.get<GithubRepoResponse[]>(`/users/${handle}/repos`, {
        params: { per_page: 100, type: "owner", sort: "pushed" },
      }),
      githubHttp.get<GithubSearchResponse>("/search/issues", {
        params: { q: `author:${handle} type:pr`, per_page: 1 },
      }),
      // Issue/PR comments only — Search has no endpoint for review comments.
      // Authenticated search rejects a query without is:issue / is:pull-request
      // (422), so the two kinds are counted separately and summed.
      githubHttp.get<GithubSearchResponse>("/search/issues", {
        params: { q: `commenter:${handle} is:issue`, per_page: 1 },
      }),
      githubHttp.get<GithubSearchResponse>("/search/issues", {
        params: { q: `commenter:${handle} is:pull-request`, per_page: 1 },
      }),
    ]);

  const since = Date.now() - RECENT_DAYS * DAY_MS;
  const recentRepos = reposResult.data.filter(
    (repo) => Date.parse(repo.pushed_at) >= since,
  );

  const repos: GithubRepoModel[] = await Promise.all(
    recentRepos.map(async (repo) => ({
      ...toRepoLines(repo),
      ...(await fetchRepoLines(repo.full_name, handle)),
    })),
  );

  console.log(reposResult, prResult, issueCommentResult, prCommentResult);

  return {
    handle,
    // Totals cover every repo, not just the recent ones listed.
    repoCount: reposResult.data.length,
    totalStars: reposResult.data.reduce(
      (sum, repo) => sum + repo.stargazers_count,
      0,
    ),
    pullRequestCount: prResult.data.total_count,
    commentCount:
      issueCommentResult.data.total_count + prCommentResult.data.total_count,
    repos,
  };
};

type GithubCommitListItem = { sha: string };

type GithubCommitResponse = {
  sha: string;
  html_url: string;
  commit: { message: string; committer: { date: string } | null };
  files?: { filename: string; status: string; patch?: string }[];
};

export type GithubCommitDiffModel = {
  sha: string;
  url: string;
  message: string;
  committedAt: string;
  files: { filename: string; status: string; patch?: string }[];
};

/**
 * The newest commit on a repo's default branch, with its per-file patches.
 * `repo` is a name under the handle — the owner is never taken from a client.
 */
export const getLatestCommit = async (
  repo: string,
): Promise<GithubCommitDiffModel | null> => {
  const fullName = `${profileData.handle}/${repo}`;
  const list = await githubHttp.get<GithubCommitListItem[]>(
    `/repos/${fullName}/commits`,
    // 409 — the repo is empty, so there is no commit to review.
    { params: { per_page: 1 }, validateStatus: (status) => [200, 409].includes(status) },
  );
  const latest = list.status === 200 ? list.data[0] : undefined;
  if (!latest) return null;

  const { data } = await githubHttp.get<GithubCommitResponse>(
    `/repos/${fullName}/commits/${latest.sha}`,
  );
  return {
    sha: data.sha,
    url: data.html_url,
    message: data.commit.message,
    committedAt: data.commit.committer?.date ?? "",
    files: data.files ?? [],
  };
};
