import { useState } from "react";
import { requestJson } from "~/lib/http-client";
import type { GithubCommitReviewModel } from "~/types";
import type { RepoReviewState, UseRepoReviewProps } from "./type";

// Matches the route's `maxDuration` — a big commit takes minutes to review.
const REVIEW_TIMEOUT_MS = 300_000;

/**
 * A review costs a Claude call, so it runs only when asked: the first time the
 * dialog opens, or on "Review again". Closing and reopening keeps the result.
 */
export const useRepoReview = ({ repo }: UseRepoReviewProps) => {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<RepoReviewState>({ status: "idle" });

  const runReview = async () => {
    setState({ status: "loading" });
    const result = await requestJson<GithubCommitReviewModel>("/api/github/review", {
      method: "POST",
      body: { repo },
      timeout: REVIEW_TIMEOUT_MS,
    });
    setState(
      result.ok
        ? { status: "done", data: result.data }
        : { status: "error", error: result.error },
    );
  };

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && state.status === "idle") void runReview();
  };

  return { open, onOpenChange, state, runReview };
};
