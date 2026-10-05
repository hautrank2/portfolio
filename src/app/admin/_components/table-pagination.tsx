"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useQueryParams } from "~/hooks";
import { pageCountOf, pageSizeData } from "~/utils/pagination";

export type TablePaginationProps = {
  total: number;
  page: number;
  pageSize: number;
};

/**
 * Footer for an admin table. The page lives in `?page=` and `?pageSize=`, so
 * previous / next are plain links and every other search param is kept.
 */
export const TablePagination = ({ total, page, pageSize }: TablePaginationProps) => {
  const { buildHref, setParams } = useQueryParams();
  const pageCount = pageCountOf(total, pageSize);
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  // Page 1 is the default, so it is left out of the URL.
  const hrefOf = (target: number) => buildHref({ page: target === 1 ? null : target });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-4 py-3 text-sm">
      <p className="tabular-nums text-muted-foreground">
        {first}–{last} of {total}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Rows</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) =>
              // A new size changes what "page 3" means, so go back to the start.
              setParams({
                pageSize: Number(value) === pageSizeData[0] ? null : value,
                page: null,
              })
            }
          >
            <SelectTrigger size="sm" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeData.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <nav aria-label="Pagination" className="flex items-center gap-1">
          {page > 1 ? (
            <Button asChild variant="outline" size="icon">
              <Link href={hrefOf(page - 1)} scroll={false} aria-label="Previous page">
                <ChevronLeft />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="icon" disabled aria-label="Previous page">
              <ChevronLeft />
            </Button>
          )}
          <span className="min-w-24 text-center tabular-nums">
            Page {page} of {pageCount}
          </span>
          {page < pageCount ? (
            <Button asChild variant="outline" size="icon">
              <Link href={hrefOf(page + 1)} scroll={false} aria-label="Next page">
                <ChevronRight />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="icon" disabled aria-label="Next page">
              <ChevronRight />
            </Button>
          )}
        </nav>
      </div>
    </div>
  );
};
