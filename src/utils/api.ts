import type { z } from "zod";
import { getSession } from "~/utils/auth";
import { parsePageQuery } from "~/utils/pagination";

// Helpers for route handlers under `src/app/api/`. Server only.

export type IdRouteContext = { params: Promise<{ id: string }> };

export const jsonError = (error: string, status: number) =>
  Response.json({ error }, { status });

/** The `401` to return, or `null` when the caller is the signed-in admin. */
export const requireAdmin = async () =>
  (await getSession()) ? null : jsonError("Not signed in.", 401);

/**
 * `?page=` (and optionally `?pageSize=`) asks a list endpoint for one page.
 * Without `page` the endpoint answers with the whole list, so `null` here.
 */
export const readPageQuery = (searchParams: URLSearchParams) =>
  searchParams.has("page")
    ? parsePageQuery({
        page: searchParams.get("page"),
        pageSize: searchParams.get("pageSize"),
      })
    : null;

/** Reads and validates a JSON body; a bad shape never reaches the lib. */
export const readBody = async <T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<{ data: T; error?: undefined } | { data?: undefined; error: Response }> => {
  const body: unknown = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  return parsed.success
    ? { data: parsed.data }
    : { error: jsonError("Invalid request body.", 400) };
};
