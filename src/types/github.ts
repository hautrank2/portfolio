/** One public repo under the handle, with its contributor-stats line counts. */
export type GithubRepoModel = {
  id: number;
  name: string;
  fullName: string;
  description?: string;
  url: string;
  isFork: boolean;
  language?: string;
  stars: number;
  forks: number;
  updatedAt: string;
  pushedAt: string;
  /**
   * Lines the handle added/removed in this repo, from the contributor-stats
   * endpoint. `null` while GitHub is still computing them — it answers `202`
   * the first time a repo's stats are requested after a push.
   */
  linesAdded: number | null;
  linesDeleted: number | null;
};

/** What a client sends to have a repo's latest commit reviewed. */
export type GithubReviewInputModel = {
  /** Repo name under the handle, e.g. `portfolio` — not `owner/name`. */
  repo: string;
};

/** Claude's review of one repo's latest commit on its default branch. */
export type GithubCommitReviewModel = {
  repo: string;
  sha: string;
  /** First line of the commit message. */
  title: string;
  url: string;
  committedAt: string;
  /** Plain text — shown as-is, not rendered as markdown. */
  review: string;
  /** The model that wrote the review; differs from the requested one after a fallback. */
  model: string;
  /** Files left out of the diff: lockfiles and binaries with no patch. */
  skippedFiles: string[];
};

/** What the GitHub admin page shows — one request's worth of GitHub data. */
export type GithubOverviewModel = {
  handle: string;
  repoCount: number;
  totalStars: number;
  /** Pull requests authored by the handle, across all of GitHub. */
  pullRequestCount: number;
  /** Issue/PR comments left by the handle — an approximation via Search. */
  commentCount: number;
  repos: GithubRepoModel[];
};
