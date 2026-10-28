import { z } from "zod";
import { reviewDiff } from "~/lib/anthropic";
import { getLatestCommit } from "~/lib/github";
import type { GithubCommitReviewModel } from "~/types";

// Joins the two outside services: GitHub supplies the diff, Claude reviews it.

export const githubReviewInputSchema = z.object({
  repo: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9._-]+$/),
});

// Generated files whose diff is noise to a reviewer and can dwarf the code.
const SKIPPED_FILES = new Set([
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "bun.lockb",
  "composer.lock",
  "Cargo.lock",
  "poetry.lock",
]);

// Well under the 1M-token context, and keeps one review's cost bounded.
// A larger diff is refused rather than cut, so a review never silently
// covers half a commit.
const MAX_DIFF_CHARS = 400_000;

export type CommitReviewResult =
  | { ok: true; data: GithubCommitReviewModel }
  | { ok: false; status: number; error: string };

export const reviewLatestCommit = async (
  repo: string,
): Promise<CommitReviewResult> => {
  const commit = await getLatestCommit(repo);
  if (!commit) return { ok: false, status: 404, error: "This repo has no commits." };

  const skippedFiles: string[] = [];
  const parts: string[] = [];
  for (const file of commit.files) {
    const basename = file.filename.split("/").pop() ?? file.filename;
    if (!file.patch || SKIPPED_FILES.has(basename)) {
      skippedFiles.push(file.filename);
      continue;
    }
    parts.push(`--- ${file.filename} (${file.status})\n${file.patch}`);
  }

  if (parts.length === 0) {
    return { ok: false, status: 422, error: "The latest commit has no text changes to review." };
  }
  if (skippedFiles.length > 0) {
    parts.push(`Not shown (lockfile or binary): ${skippedFiles.join(", ")}`);
  }

  const diff = parts.join("\n\n");
  if (diff.length > MAX_DIFF_CHARS) {
    return { ok: false, status: 413, error: "The latest commit is too large to review." };
  }

  const result = await reviewDiff(commit.message, diff);
  if (!result.ok) {
    return {
      ok: false,
      status: 502,
      error:
        result.reason === "refused"
          ? "Claude declined to review this commit."
          : "Claude returned an empty review.",
    };
  }

  return {
    ok: true,
    data: {
      repo,
      sha: commit.sha,
      title: commit.message.split("\n")[0] ?? "",
      url: commit.url,
      committedAt: commit.committedAt,
      review: result.review,
      model: result.model,
      skippedFiles,
    },
  };
};
