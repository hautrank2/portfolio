"use client";

import { FileText, FolderTree, History, X } from "lucide-react";
import Link from "next/link";
import { useLastVisited } from "~/hooks";
import { cn } from "~/lib/utils";

export type BlogResumeProps = {
  /** Track slug to scope to. Omit on `/blog` to resume from anywhere. */
  track?: string;
  className?: string;
};

/**
 * "Đọc tiếp" — a link back to the last note or section this browser opened.
 *
 * Nothing on the first render, since the history lives in localStorage. It
 * appears right after hydration rather than reserving a slot: a reader with no
 * history would otherwise stare at a permanent empty box.
 */
const BlogResume = ({ track, className }: BlogResumeProps) => {
  const { visited, clear } = useLastVisited({ track });

  if (!visited) return null;

  const Icon = visited.kind === "section" ? FolderTree : FileText;

  return (
    <div
      className={cn(
        "surface flex items-center gap-3 rounded-2xl border border-border/60 p-4",
        className
      )}
    >
      <History size={16} className="shrink-0 text-primary/70" />

      <div className="min-w-0 flex-1">
        <p className="text-[0.7rem] uppercase tracking-wide text-foreground/40">
          Đọc tiếp
        </p>
        <Link
          href={visited.href}
          className="group flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary"
        >
          <Icon size={13} className="shrink-0 text-foreground/40" />
          <span className="truncate">{visited.title}</span>
        </Link>
        {visited.trail && (
          <p className="mt-0.5 truncate text-xs text-foreground/40">
            {visited.trail}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={clear}
        aria-label="Xoá lịch sử đọc"
        className="shrink-0 rounded-full p-1.5 text-foreground/30 transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export { BlogResume };
