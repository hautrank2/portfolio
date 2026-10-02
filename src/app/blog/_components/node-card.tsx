import { ArrowUpRight, FileText, FolderTree, Lock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { trackLogoData } from "~/data/blog";
import { cn } from "~/lib/utils";
import type { BlogNodeType } from "~/types";
import { BlogProgress } from "./progress";
import { StatusBadge } from "./status-badge";

/**
 * `01` at the top level, `4.2` inside a section — read off the node's
 * numberPath, which the loader derives from position. Never stored in content.
 */
const chip = (path: number[]) => {
  if (path.length <= 1) return String(path[0] ?? 1).padStart(2, "0");
  return path.join(".");
};

export type NodeCardProps = {
  node: BlogNodeType;
};

const NodeCard = ({ node }: NodeCardProps) => {
  const planned = node.kind === "planned";
  const isSection = node.kind === "section";
  const Icon = planned ? Lock : isSection ? FolderTree : FileText;

  // Only a track (`/blog/k8s`) carries a brand. A section three folders deep is
  // not "Kubernetes the technology", so it keeps the generic folder icon.
  const logo = node.path.length === 1 && !planned ? trackLogoData[node.slug] : undefined;

  const body = (
    <>
      <div className="flex items-start gap-4">
        <span
          className={cn(
            "mt-0.5 font-mono text-xs tabular-nums",
            planned ? "text-foreground/25" : "text-primary/70"
          )}
        >
          {chip(node.numberPath)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {logo ? (
              <Image
                src={logo.logoUrl}
                alt=""
                width={36}
                height={36}
                className="size-5 shrink-0 object-contain"
              />
            ) : (
              <Icon
                size={14}
                className={planned ? "text-foreground/30" : "text-primary/70"}
              />
            )}
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
};

export { NodeCard };
