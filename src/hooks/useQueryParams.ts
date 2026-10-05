import { usePathname, useRouter, useSearchParams } from "next/navigation";

type QueryUpdates = Record<string, string | number | null | undefined>;

/**
 * Reads and rewrites the current URL's search params, for state that should
 * survive a reload and a shared link: the page number, filters, the month.
 * `null`, `undefined` and `""` remove a param; the rest are left as they are.
 */
export const useQueryParams = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const buildHref = (updates: QueryUpdates) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === undefined || value === "") next.delete(key);
      else next.set(key, String(value));
    }
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const setParams = (updates: QueryUpdates) => {
    router.push(buildHref(updates), { scroll: false });
  };

  return { searchParams, buildHref, setParams };
};
