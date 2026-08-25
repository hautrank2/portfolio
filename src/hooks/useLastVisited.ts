import { usePathname } from "next/navigation";
import * as React from "react";
import {
  clearVisited,
  readServerVisited,
  readVisited,
  subscribeVisited,
} from "~/lib/visited";
import type { VisitedEntryType } from "~/types";

export type UseLastVisitedProps = {
  /** Track slug (`k8s`) to scope to. Omit for "anywhere in the blog". */
  track?: string;
};

/**
 * The last blog node this browser opened, current page excluded.
 *
 * Excluding by href is what makes the order of effects irrelevant: the tracker
 * on a track page writes that page to the front of the history, and this hook
 * skips straight past it to the note the reader actually left off at.
 *
 * `visited` is `null` on the server and on the first client render — the store
 * only exists in the browser, and pretending otherwise would break hydration.
 */
const useLastVisited = ({ track }: UseLastVisitedProps = {}) => {
  const pathname = usePathname();
  const items = React.useSyncExternalStore(
    subscribeVisited,
    readVisited,
    readServerVisited
  );

  const visited = React.useMemo<VisitedEntryType | null>(() => {
    const found = items.find(
      (item) => item.href !== pathname && (!track || item.track === track)
    );
    return found ?? null;
  }, [items, pathname, track]);

  return { visited, clear: clearVisited };
};

export { useLastVisited };
