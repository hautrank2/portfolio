import { ArrowUpRight, FolderTree } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { trackLogoData } from "~/data/blog";
import { cn } from "~/lib/utils";
import type { BlogNodeType } from "~/types";
import { BlogProgress } from "./progress";
import { StatusBadge } from "./status-badge";

export type TrackCardProps = {
  node: BlogNodeType;
  className?: string;
};

/**
 * A top-level track at `/blog` — one big card per topic, led by its logo.
 *
 * Deliberately not `NodeCard`: that one is a dense row built to list dozens of
 * sections and notes inside a track, where a large logo would be noise. There
 * are only ever a handful of tracks, and each is a brand a reader recognises
 * before they read the title.
 */
const TrackCard = ({ node, className }: TrackCardProps) => {
  const logo = trackLogoData[node.slug];
  const sections = node.children.slice(0, 4);

  return (
    <Link href={node.href} className={cn("group block", className)}>
      <Card className="surface h-full gap-0 border-border/60 py-0 transition-colors hover:border-primary/50">
        <CardHeader className="flex-row items-center gap-4 px-6 pt-6">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl border border-border/60 bg-foreground/5 p-2.5 transition-transform duration-300 group-hover:scale-105 sm:size-20 sm:p-3">
            {logo ? (
              <Image
                src={logo.logoUrl}
                alt=""
                width={80}
                height={80}
                className="size-full object-contain"
              />
            ) : (
              <FolderTree size={28} className="text-primary/70" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {node.title}
              </h3>
              {node.status && <StatusBadge status={node.status} />}
            </div>
            {node.description && (
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-foreground/60">
                {node.description}
              </p>
            )}
          </div>

          <ArrowUpRight
            size={18}
            className="mt-1 shrink-0 self-start text-foreground/30 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
          />
        </CardHeader>

        <CardContent className="px-6 pt-5 pb-6">
          {sections.length > 0 && (
            <p className="truncate text-xs text-foreground/40">
              {sections.map((section) => section.title).join(" · ")}
              {node.children.length > sections.length &&
                ` · +${node.children.length - sections.length}`}
            </p>
          )}
          <BlogProgress
            done={node.progress.done}
            total={node.progress.total}
            className="mt-4"
          />
        </CardContent>
      </Card>
    </Link>
  );
};

export { TrackCard };
