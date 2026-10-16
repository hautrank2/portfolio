"use client";

import { ArrowUpRight, CalendarDays, Clock } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import type { NoteStatusType } from "~/types";
import { StatusBadge } from "./status-badge";

export type PostItemType = {
  href: string;
  title: string;
  description?: string;
  status?: NoteStatusType;
  /** `YYYY-MM-DD` shown on the card — created if present, else updated. */
  date?: string;
  minutes: number;
  tags: string[];
};

export type BlogExplorerProps = {
  /** Single posts, newest first. They lead the page — they are the blog. */
  posts: PostItemType[];
  /** The roadmap zone, rendered on the server (track cards carry logos). */
  roadmap: React.ReactNode;
};

/** `null` = everything; the sentinel = roadmap only; anything else is a tag. */
const ROADMAP = "\u0000roadmap";

/**
 * The `/blog` landing: posts first as cards, the roadmap tracks below, and one
 * filter row driving both. Posts get no zone label of their own — a single
 * post is simply what a blog entry is.
 */
export const BlogExplorer = ({ posts, roadmap }: BlogExplorerProps) => {
  const [active, setActive] = React.useState<string | null>(null);

  const tags = [...new Set(posts.flatMap((post) => post.tags))].sort();
  const shown =
    active && active !== ROADMAP
      ? posts.filter((post) => post.tags.includes(active))
      : posts;

  const toggle = (value: string) =>
    setActive((current) => (current === value ? null : value));

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <FilterChip
          label="Tất cả"
          active={active === null}
          onClick={() => setActive(null)}
        />
        <FilterChip
          label="Roadmap"
          active={active === ROADMAP}
          onClick={() => toggle(ROADMAP)}
        />
        {tags.map((tag) => (
          <FilterChip
            key={tag}
            label={`#${tag}`}
            active={active === tag}
            onClick={() => toggle(tag)}
          />
        ))}
      </div>

      {active !== ROADMAP && shown.length > 0 && (
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {shown.map((post) => (
            <PostCard key={post.href} post={post} />
          ))}
        </div>
      )}

      {active !== ROADMAP && shown.length === 0 && (
        <p className="mt-6 text-sm text-foreground/50">
          Chưa có bài nào mang tag này.
        </p>
      )}

      {(active === null || active === ROADMAP) && (
        <div className={active === ROADMAP ? "mt-6" : "mt-16"}>{roadmap}</div>
      )}
    </div>
  );
};

type PostCardProps = { post: PostItemType };

/** One single post at `/blog` — a proper card, same surface as the tracks. */
const PostCard = ({ post }: PostCardProps) => (
  <Link href={post.href} className="group block h-full">
    <Card className="surface h-full gap-0 border-border/60 py-0 transition-colors hover:border-primary/50">
      <CardContent className="flex h-full flex-col px-6 py-6">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold tracking-tight transition-colors group-hover:text-primary">
                {post.title}
              </h3>
              {post.status && <StatusBadge status={post.status} />}
            </div>
          </div>
          <ArrowUpRight
            size={16}
            className="mt-0.5 shrink-0 text-foreground/30 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
          />
        </div>

        {post.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-foreground/60">
            {post.description}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 text-xs text-foreground/40">
          {post.date && (
            <span className="flex items-center gap-1.5">
              <CalendarDays size={12} />
              {post.date}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Clock size={12} />
            {post.minutes} phút đọc
          </span>
          {post.tags.map((tag) => (
            <span key={tag} className="text-primary/60">
              #{tag}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  </Link>
);

type FilterChipProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

const FilterChip = ({ label, active, onClick }: FilterChipProps) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "rounded-full border px-3 py-1 text-xs transition-colors",
      active
        ? "border-primary/60 bg-primary/10 text-primary"
        : "border-border/60 text-foreground/60 hover:border-primary/40 hover:text-foreground"
    )}
  >
    {label}
  </button>
);
