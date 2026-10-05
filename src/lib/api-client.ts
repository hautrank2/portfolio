// `fetch` for the admin hooks. Safe to import from the client.

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};

/**
 * Never throws: a network failure comes back as `status: 0`, so callers have
 * one shape to branch on. `T` is the caller's claim about the response body.
 */
export const requestJson = async <T>(
  url: string,
  { method = "GET", body }: RequestOptions = {}
): Promise<ApiResult<T>> => {
  try {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (response.ok) return { ok: true, data: payload as T };

    const error =
      payload && typeof payload === "object" && "error" in payload
        ? String(payload.error)
        : "Request failed.";
    return { ok: false, status: response.status, error };
  } catch {
    return { ok: false, status: 0, error: "Could not reach the server." };
  }
};

/** `"a, b ,a"` → `["a", "b"]` — how the forms take a list of technologies. */
export const splitList = (value: string) => [
  ...new Set(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  ),
];
