"use client";

import { cn } from "~/lib/utils";
import { TablePagination, type TablePaginationProps } from "./table-pagination";

export type DataTableShellProps = TablePaginationProps & {
  /** Shown instead of the table when this page has no rows. */
  emptyMessage: string;
  isEmpty: boolean;
  /**
   * Caps the table's height and scrolls the rows inside it, keeping the header
   * row and the last column (the row actions) in view.
   */
  scrollable?: boolean;
  className?: string;
  /** The `<Table>` itself. */
  children: React.ReactNode;
};

// `ui/table` wraps `<table>` in its own scroll container and takes no class
// for it, so the container and the cells are styled from out here by slot.
// Sticky cells sit above the rows scrolling under them, so they need an
// opaque background; the header's bottom rule is a shadow because a border
// on a sticky cell does not travel with it.
const SCROLLABLE_CLASSES = cn(
  "[&_[data-slot=table-container]]:max-h-[max(16rem,calc(100dvh-21rem))]",
  "[&_[data-slot=table-container]]:overflow-y-auto",
  "[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-card",
  "[&_th]:shadow-[inset_0_-1px_0_var(--border)]",
  "[&_td:last-child]:sticky [&_td:last-child]:right-0 [&_td:last-child]:bg-card",
  "[&_th:last-child]:right-0 [&_th:last-child]:z-20"
);

/** The card around every admin table: the table, or an empty note, then paging. */
export const DataTableShell = ({
  emptyMessage,
  isEmpty,
  scrollable = false,
  className,
  children,
  ...pagination
}: DataTableShellProps) => {
  return (
    <div
      className={cn(
        "surface overflow-hidden rounded-xl border border-border/60",
        scrollable && SCROLLABLE_CLASSES,
        className
      )}
    >
      {isEmpty ? (
        <p className="px-4 py-10 text-center text-sm text-foreground/50">
          {emptyMessage}
        </p>
      ) : (
        children
      )}
      <TablePagination {...pagination} />
    </div>
  );
};
