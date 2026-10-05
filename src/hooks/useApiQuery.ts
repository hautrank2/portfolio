import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { requestJson } from "~/lib/api-client";

type QueryState<T> = {
  /** Which request the rest of the state belongs to. */
  key: string | null;
  data?: T;
  error: string | null;
};

const listeners = new Set<() => void>();

/** Makes every mounted `useApiQuery` fetch again — call it after a write. */
export const refreshApiQueries = () => {
  for (const listener of listeners) listener();
};

/**
 * GETs `url` from the admin API whenever it changes. The previous data stays
 * visible while the next request is in flight, so a table does not blank out
 * between pages. A `401` means the session is gone and sends you to sign in.
 * Pass `null` to hold off.
 */
export const useApiQuery = <T>(url: string | null) => {
  const router = useRouter();
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<QueryState<T>>({ key: null, error: null });
  const key = url === null ? null : `${url}#${version}`;

  useEffect(() => {
    const refresh = () => setVersion((current) => current + 1);
    listeners.add(refresh);
    return () => {
      listeners.delete(refresh);
    };
  }, []);

  useEffect(() => {
    if (url === null) return;
    let cancelled = false;

    void requestJson<T>(url).then((result) => {
      // A newer request has started; this answer is for a URL nobody shows.
      if (cancelled) return;
      if (result.ok) {
        setState({ key: `${url}#${version}`, data: result.data, error: null });
        return;
      }
      if (result.status === 401) {
        router.replace("/admin/login");
        return;
      }
      setState((current) => ({
        ...current,
        key: `${url}#${version}`,
        error: result.error,
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [url, version, router]);

  return {
    data: state.data,
    error: state.error,
    isLoading: key !== null && state.key !== key,
  };
};
