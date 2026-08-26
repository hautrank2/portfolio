"use client";

import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { trackLogoData } from "~/data/blog";
import { cn } from "~/lib/utils";
import type { BlogTreeItemType } from "~/types";
import { BlogProgress } from "./progress";

const isAncestor = (pathname: string, href: string) => {
  return href.length > 0 && pathname.startsWith(`${href}/`);
};

const ordinal = (index: number) => {
  return String(index + 1).padStart(2, "0");
};

/**
 * The sidebar navigates; it does not inventory. Nodes with no file behind them
 * would be dead rows here — 82 of the 104 in this track — so they stay on the
 * section pages, where being a visible backlog is the whole point.
 */
const written = (items: BlogTreeItemType[]) => {
  return items.filter((item) => item.kind !== "planned");
};

/** Width of the chevron slot. Leaves reserve it too, so labels share a margin. */
const TOGGLE_SLOT = "size-5 shrink-0";

type SidebarItemProps = {
  item: BlogTreeItemType;
  depth: number;
  /** Only the outermost level is numbered — deeper down it is just noise. */
  index?: number;
};

const SidebarItem = ({ item, depth, index }: SidebarItemProps) => {
  const pathname = usePathname();
  const active = pathname === item.href;
  const onPath = active || isAncestor(pathname, item.href);
  const children = written(item.children);

  const row = cn(
    "flex items-center gap-1 border-l-2 pr-2 transition-colors",
    active
      ? "border-primary bg-primary/10"
      : "border-transparent hover:border-primary/40"
  );

  const indent = { paddingLeft: `${0.25 + Math.min(depth, 3) * 0.75}rem` };

  // Every row is a link to its own page — a folder has one too, so there is no
  // separate "overview" entry. Expanding is the chevron's job alone.
  const label = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "min-w-0 flex-1 truncate py-1.5 text-[0.8rem] transition-colors",
        active
          ? "font-medium text-primary"
          : "text-foreground/60 hover:text-foreground"
      )}
    >
      {depth === 0 && index !== undefined && (
        <span className="mr-2 font-mono text-[0.65rem] tabular-nums text-foreground/30">
          {ordinal(index)}
        </span>
      )}
      {item.title}
    </Link>
  );

  if (children.length === 0) {
    return (
      <li>
        <div style={indent} className={row}>
          {/* Keeps leaf labels on the same x as their siblings' labels. */}
          <span aria-hidden className={TOGGLE_SLOT} />
          {label}
        </div>
      </li>
    );
  }

  return (
    <li>
      {/*
       * Uncontrolled, with the key folding in "is the current page inside me".
       * A navigation remounts the affected branches with the right default while
       * leaving branches the reader opened by hand alone.
       */}
      <Collapsible key={`${item.href}:${onPath}`} defaultOpen={onPath}>
        <div style={indent} className={row}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              aria-label={`Mở hoặc đóng ${item.title}`}
              className={cn(
                TOGGLE_SLOT,
                "group grid place-items-center rounded text-foreground/35 transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              <ChevronRight
                size={12}
                className="transition-transform group-data-[state=open]:rotate-90"
              />
            </button>
          </CollapsibleTrigger>

          {label}
        </div>

        <CollapsibleContent asChild>
          <ul>
            {children.map((child) => (
              <SidebarItem key={child.slug} item={child} depth={depth + 1} />
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
};

export type TrackNavProps = {
  tree: BlogTreeItemType;
};

const TrackNav = ({ tree }: TrackNavProps) => {
  const pathname = usePathname();
  const logo = trackLogoData[tree.slug];

  return (
    <nav aria-label="Nội dung track">
      <Link
        href={tree.href}
        className={cn(
          "flex items-center gap-2 text-sm font-semibold tracking-tight transition-colors hover:text-primary",
          pathname === tree.href ? "text-primary" : "text-foreground"
        )}
      >
        {logo && (
          <Image
            src={logo.logoUrl}
            alt=""
            width={24}
            height={24}
            className="size-4 shrink-0 object-contain"
          />
        )}
        {tree.title}
      </Link>

      <BlogProgress
        done={tree.progress.done}
        total={tree.progress.total}
        className="mt-3"
      />

      <ul className="mt-5 space-y-0.5">
        {written(tree.children).map((child, index) => (
          <SidebarItem key={child.slug} item={child} depth={0} index={index} />
        ))}
      </ul>
    </nav>
  );
};

export type BlogSidebarProps = {
  tree: BlogTreeItemType;
};

/** Sticky rail on large screens. */
const BlogSidebar = ({ tree }: BlogSidebarProps) => {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border/60 lg:block xl:w-72">
      <div className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto px-4 py-10">
        <TrackNav tree={tree} />
      </div>
    </aside>
  );
};

export type BlogTrackNavMobileProps = {
  tree: BlogTreeItemType;
};

/** Collapsed disclosure that replaces the rail below `lg`. */
const BlogTrackNavMobile = ({ tree }: BlogTrackNavMobileProps) => {
  const pathname = usePathname();

  return (
    <Collapsible
      key={pathname}
      className="border-b border-border/60 bg-background/80 backdrop-blur lg:hidden"
    >
      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-4 py-3 text-sm font-medium sm:px-8">
        <ChevronRight
          size={14}
          className="text-foreground/40 transition-transform group-data-[state=open]:rotate-90"
        />
        Lộ trình {tree.title}
        <span className="ml-auto text-xs font-normal tabular-nums text-foreground/40">
          {tree.progress.done}/{tree.progress.total}
        </span>
      </CollapsibleTrigger>

      <CollapsibleContent className="max-h-[60vh] overflow-y-auto px-4 pb-6 sm:px-8">
        <TrackNav tree={tree} />
      </CollapsibleContent>
    </Collapsible>
  );
};

export { BlogSidebar, BlogTrackNavMobile };
