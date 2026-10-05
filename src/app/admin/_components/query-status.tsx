"use client";

import { Spinner } from "~/components/ui/spinner";

export type QueryStatusProps = {
  /** First error among the page's requests, if any. */
  error?: string | null;
};

/** What an admin page shows until its first data arrives, or when it cannot. */
export const QueryStatus = ({ error }: QueryStatusProps) => {
  if (error) {
    return (
      <p role="alert" className="py-16 text-center text-sm text-destructive">
        {error}
      </p>
    );
  }

  return (
    <div role="status" className="flex justify-center py-16 text-muted-foreground">
      <Spinner className="size-5" />
      <span className="sr-only">Loading…</span>
    </div>
  );
};
