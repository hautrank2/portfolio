import axios from "axios";

// axios for the browser → same-origin `/api/*` route handlers. Safe to import
// from the client. Server-to-external-API calls go through `~/lib/http-server`.

const DEFAULT_TIMEOUT_MS = 10_000;

export const httpClient = axios.create({
  timeout: DEFAULT_TIMEOUT_MS,
  headers: { Accept: "application/json" },
});

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  /** Milliseconds; only for endpoints known to be slow, like a code review. */
  timeout?: number;
};

const errorFromPayload = (payload: unknown, fallback: string) =>
  payload && typeof payload === "object" && "error" in payload
    ? String((payload as { error: unknown }).error)
    : fallback;

/**
 * Never throws: a network failure comes back as `status: 0`, so callers have
 * one shape to branch on. `T` is the caller's claim about the response body.
 */
export const requestJson = async <T>(
  url: string,
  { method = "GET", body, timeout }: RequestOptions = {}
): Promise<ApiResult<T>> => {
  try {
    const response = await httpClient.request<T>({ url, method, data: body, timeout });
    return { ok: true, data: response.data };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return {
        ok: false,
        status: error.response.status,
        error: errorFromPayload(error.response.data, "Request failed."),
      };
    }
    return { ok: false, status: 0, error: "Could not reach the server." };
  }
};

/**
 * For call sites that want axios's own throw-on-failure behaviour (forms
 * that only need a message to show, not the full `ApiResult` shape).
 */
export const getErrorMessage = (
  error: unknown,
  fallback: string,
  networkFallback = "Could not reach the server."
): string =>
  axios.isAxiosError(error) && error.response
    ? errorFromPayload(error.response.data, fallback)
    : networkFallback;
