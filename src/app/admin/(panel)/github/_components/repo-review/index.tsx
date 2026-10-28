"use client";

import { ExternalLink, Sparkles } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Spinner } from "~/components/ui/spinner";
import { useRepoReview } from "./hook";
import type { RepoReviewProps } from "./type";

export const RepoReview = (props: RepoReviewProps) => {
  const { open, onOpenChange, state, runReview } = useRepoReview(props);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Sparkles className="size-3.5" />
          Review
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 bg-card p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Review · {props.repo}</DialogTitle>
          <DialogDescription>
            {state.status === "done" ? (
              <a
                href={state.data.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <code>{state.data.sha.slice(0, 7)}</code> {state.data.title}
                <ExternalLink className="size-3" />
              </a>
            ) : (
              "Claude reviews the latest commit on the default branch."
            )}
          </DialogDescription>
        </DialogHeader>

        {/* The review scrolls; header and footer stay put. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 text-sm">
          {state.status === "loading" && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Spinner className="size-4" />
              Reviewing — this can take a minute or two…
            </p>
          )}
          {state.status === "error" && (
            <p className="text-destructive">{state.error}</p>
          )}
          {state.status === "done" && (
            <>
              <p className="whitespace-pre-wrap leading-relaxed">
                {state.data.review}
              </p>
              {state.data.skippedFiles.length > 0 && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Not reviewed: {state.data.skippedFiles.join(", ")}
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter className="items-center border-t border-border px-6 py-3 sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {state.status === "done" && state.data.model}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={state.status === "loading"}
            onClick={() => void runReview()}
          >
            Review again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
