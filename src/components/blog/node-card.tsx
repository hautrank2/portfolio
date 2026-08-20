import { ArrowUpRight, FileText, FolderTree, Lock } from "lucide-react";
import Link from "next/link";
import { cn } from "~/lib/utils";
import type { BlogNodeType } from "~/types";
import { BlogProgress } from "./progress";
import { StatusBadge } from "./status-badge";

/** `01`, `02`, ... — derived from position, never stored in the content. */
function ordinal(index: number) {
  return String(index + 1).padStart(2, "0");
}

function NodeCard({ node, index }: { node: BlogNodeType; index: number }) {
  const planned = node.kind === "planned";
  const isSection = node.kind === "section";
  const Icon = planned ? Lock : isSection ? FolderTree : FileText;

  const body = (
    <>
      <div className="flex items-start gap-4">
        <span
          className={cn(
            "mt-0.5 font-mono text-xs tabular-nums",
            planned ? "text-foreground/25" : "text-primary/70"
          )}
        >
          {ordinal(index)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Icon
              size={14}
              className={planned ? "text-foreground/30" : "text-primary/70"}
            />
            <h3
              className={cn(
                "font-semibold tracking-tight",
                planned ? "text-foreground/40" : "text-foreground"
              )}
            >
              {node.title}
            </h3>
            {node.status && !planned && <StatusBadge status={node.status} />}
            {planned && (
              <span className="rounded-full border border-dashed border-foreground/20 px-2 py-0.5 text-[0.7rem] text-foreground/40">
                Chưa viết
              </span>
            )}
          </div>

          {node.description && (
            <p
              className={cn(
                "mt-2 text-sm leading-relaxed",
                planned ? "text-foreground/30" : "text-foreground/60"
              )}
            >
              {node.description}
            </p>
          )}

          {isSection && node.children.length > 0 && (
            <p className="mt-3 truncate text-xs text-foreground/40">
              {node.children.map((child) => child.title).join(" · ")}
            </p>
          )}

          {isSection && (
            <BlogProgress
              done={node.progress.done}
              total={node.progress.total}
              className="mt-4"
            />
          )}
        </div>

        {!planned && (
          <ArrowUpRight
            size={16}
            className="mt-1 shrink-0 text-foreground/30 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
          />
        )}
      </div>
    </>
  );

  const shell = cn(
    "block rounded-2xl border p-5 transition-colors",
    planned
      ? "cursor-not-allowed border-dashed border-border/40 bg-transparent"
      : "surface group border-border/60 hover:border-primary/50"
  );

  if (planned) {
    return (
      <div className={shell} aria-disabled>
        {body}
      </div>
    );
  }

  return (
    <Link href={node.href} className={shell}>
      {body}
    </Link>
  );
}

export { NodeCard };
