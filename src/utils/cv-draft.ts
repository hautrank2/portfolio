import type { CvModel } from "~/types";
import { normalizeCv } from "./cv";

const STORAGE_KEY = "htk2:cv:draft";

/**
 * Same reason as `utils/visited.ts`: `useSyncExternalStore` compares snapshots by
 * reference, so the parsed draft is cached rather than re-parsed per read.
 * `undefined` = not read yet, `null` = read, and there is no draft.
 */
let snapshot: CvModel | null | undefined;

const listeners = new Set<() => void>();

const notify = () => {
  for (const listener of listeners) listener();
};

export const readCvDraft = (): CvModel | null => {
  if (snapshot !== undefined) return snapshot;
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    snapshot = raw ? normalizeCv(JSON.parse(raw)) : null;
  } catch {
    // Private mode throws on access; a hand-mangled value throws on parse.
    snapshot = null;
  }
  return snapshot;
};

/** The server never has a draft — the editor starts from the published CV. */
export const readServerCvDraft = (): CvModel | null => null;

export const subscribeCvDraft = (onChange: () => void) => {
  listeners.add(onChange);

  // Keep two open editor tabs from silently overwriting each other.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    snapshot = undefined;
    notify();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
};

export const writeCvDraft = (cv: CvModel) => {
  snapshot = cv;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cv));
  } catch {
    // Quota or a blocked store: the in-memory draft still works this session.
  }
  notify();
};

export const clearCvDraft = () => {
  snapshot = null;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to remove if writing was never possible.
  }
  notify();
};
