import axios, { type AxiosInstance } from "axios";

// Server only. axios instances for calling *external* APIs (GitHub, Claude,
// …) from route handlers — never import this from a Client Component.
// Same-origin browser calls go through `~/lib/http-client` instead.

const DEFAULT_TIMEOUT_MS = 10_000;

export type HttpServerConfig = {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
};

/**
 * One instance per external service (e.g. `src/lib/github.ts` calling
 * `createHttpServer({ baseURL: "https://api.github.com", headers: {...} })`)
 * rather than one shared client carrying every service's auth header.
 */
export const createHttpServer = (config: HttpServerConfig = {}): AxiosInstance =>
  axios.create({
    baseURL: config.baseURL,
    timeout: config.timeout ?? DEFAULT_TIMEOUT_MS,
    headers: { Accept: "application/json", ...config.headers },
  });

/** Plain outbound client for one-off calls that do not need their own instance. */
export const httpServer = createHttpServer();
