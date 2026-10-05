import type { PageQueryModel } from "~/types";

// Shared by the pages, the route handlers and the pagination control, so the
// URL means the same thing everywhere. Safe to import from the client.

export const pageSizeData = [10, 20, 50];

const DEFAULT_PAGE_SIZE = pageSizeData[0];
const MAX_PAGE_SIZE = 100;

type RawParam = string | string[] | null | undefined;

const toInteger = (value: RawParam) => {
  const text = Array.isArray(value) ? value[0] : value;
  const parsed = Number(text);
  return Number.isInteger(parsed) ? parsed : null;
};

/** Reads `page` / `pageSize`; anything missing or absurd falls back quietly. */
export const parsePageQuery = (params: {
  page?: RawParam;
  pageSize?: RawParam;
}): PageQueryModel => {
  const page = toInteger(params.page);
  const pageSize = toInteger(params.pageSize);
  return {
    page: page && page > 0 ? page : 1,
    pageSize:
      pageSize && pageSize > 0 ? Math.min(pageSize, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE,
  };
};

export const pageCountOf = (total: number, pageSize: number) =>
  Math.max(1, Math.ceil(total / pageSize));
