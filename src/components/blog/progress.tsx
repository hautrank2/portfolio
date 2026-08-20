import { cn } from "~/lib/utils";

/** `3 / 8 notes` plus a thin bar. Reads as coverage of a section's backlog. */
function BlogProgress({
  done,
  total,
  className,
}: {
  done: number;
  total: number;
  className?: string;
}) {
  if (!total) return null;
  const pct = Math.round((done / total) * 100);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="h-1 w-24 overflow-hidden rounded-full bg-foreground/10">
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-foreground/50">
        {done}/{total} notes
      </span>
    </div>
  );
}

export { BlogProgress };
