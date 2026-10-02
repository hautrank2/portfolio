"use client";

import * as React from "react";
import { recordVisit } from "~/lib/visited";
import type { VisitedEntryType } from "~/types";

export type BlogVisitTrackerProps = Omit<VisitedEntryType, "visitedAt">;

/**
 * Renders nothing; records that this node was opened.
 *
 * A component rather than a hook so the pages stay Server Components: the note
 * body never crosses the boundary, only the handful of strings below.
 */
const BlogVisitTracker = ({
  href,
  title,
  kind,
  track,
  trail,
}: BlogVisitTrackerProps) => {
  React.useEffect(() => {
    if (!href) return;
    recordVisit({ href, title, kind, track, trail, visitedAt: Date.now() });
  }, [href, title, kind, track, trail]);

  return null;
};

export { BlogVisitTracker };
