import type { VisitedEntryType } from "~/types";

const STORAGE_KEY = "htk2:blog:visited";

/** Enough to survive a browsing session; small enough to stay a cheap JSON blob. */
const LIMIT = 24;

/** Stable identity so `useSyncExternalStore` does not loop on an empty store. */
const EMPTY: readonly VisitedEntryType[] = [];

/**
 * `useSyncExternalStore` compares snapshots by reference, so reading the same
 * store twice has to hand back the same array. Parsing on every call would
 * return a fresh one each render and spin forever.
 */
let snapshot: readonly VisitedEntryType[] | null = null;

const listeners = new Set<() => void>();

const notify = () => {
  for (const listener of listeners) listener();
};

const isEntry = (value: unknown): value is VisitedEntryType => {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.href === "string" && typeof entry.title === "string";
};

/** Anything the user hand-edited, or an older shape, degrades to "no history". */
const parse = (raw: string | null): readonly VisitedEntryType[] => {
  if (!raw) return EMPTY;
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return EMPTY;
    const entries = data.filter(isEntry).slice(0, LIMIT);
    return entries.length ? entries : EMPTY;
  } catch {
    return EMPTY;
  }
};

/** Newest first. Empty on the server and until the first client read. */
export const readVisited = (): readonly VisitedEntryType[] => {
  if (snapshot) return snapshot;
  if (typeof window === "undefined") return EMPTY;

  try {
    snapshot = parse(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // Private mode and "block all cookies" both throw on access alone.
    snapshot = EMPTY;
  }
  return snapshot;
};

/** The server has no history to render, and neither does the first paint. */
export const readServerVisited = (): readonly VisitedEntryType[] => EMPTY;

export const subscribeVisited = (onChange: () => void) => {
  listeners.add(onChange);

  // Reading in a second tab should not resurrect a history cleared in this one.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    snapshot = null;
    notify();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
};

/**
 * Moves `entry` to the front, dropping any older visit to the same page. The
 * history is a stack of pages rather than one "last node" precisely so a reader
 * standing on the track page can still be offered the note they left.
 */
export const recordVisit = (entry: VisitedEntryType) => {
  const rest = readVisited().filter((item) => item.href !== entry.href);
  const next = [entry, ...rest].slice(0, LIMIT);

  snapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota or a blocked store: the in-memory snapshot still works this session.
  }
  notify();
};

export const clearVisited = () => {
  snapshot = EMPTY;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to remove if writing was never possible in the first place.
  }
  notify();
};
