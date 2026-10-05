/** Every `localStorage` key the app uses, so two features never collide. */
export const localKeys = {
  /** Project the admin task list was last filtered by — its default filter. */
  adminTaskProject: "admin:tasks:project",
} as const;

export type LocalKey = (typeof localKeys)[keyof typeof localKeys];

// Storage can be missing (server render) or blocked (private mode), so every
// access is guarded and failure just means "nothing stored".

export const readLocal = (key: LocalKey): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

/** `null` removes the key. */
export const writeLocal = (key: LocalKey, value: string | null) => {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Nothing to do: the value simply will not be remembered.
  }
};
