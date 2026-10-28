import type { GithubCommitReviewModel } from "~/types";

export type RepoReviewProps = {
  /** Repo name under the handle. */
  repo: string;
};

export type UseRepoReviewProps = Pick<RepoReviewProps, "repo">;

export type RepoReviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; data: GithubCommitReviewModel }
  | { status: "error"; error: string };
