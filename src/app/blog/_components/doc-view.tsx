import { ArrowLeft, CalendarDays, Clock } from "lucide-react";
import Link from "next/link";
import { extractHeadings, readingTime, renderMarkdown } from "~/components/blog/markdown";
import { Reveal } from "~/components/ui/reveal";
import { Typography } from "~/components/ui/typography";
import { cn } from "~/lib/utils";
import type { BlogNodeContextType } from "~/types";
import { docMarkdown } from "~/utils/blog-copy";
import { BlogBreadcrumb } from "./breadcrumb";
import { BlogCopyPage } from "./copy-page";
import { DocNav } from "./doc-nav";
import { StatusBadge } from "./status-badge";
import { BlogToc } from "./toc";
import { BlogVisitTracker } from "./visit-tracker";

export type DocViewProps = BlogNodeContextType;

/** A single note. */
const DocView = async ({ node, trail, prev, next }: DocViewProps) => {
  const content = await renderMarkdown(node.body);
  const headings = extractHeadings(node.body);

  // A top-level post: no track around it, so instead of a breadcrumb it gets a
  // Back button, and the TOC moves into a left rail next to that button. Docs
  // inside a track keep the breadcrumb and the right-hand TOC.
  const isPost = node.path.length === 1;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-8 lg:py-16">
      <BlogVisitTracker
        href={node.href}
        title={node.title}
        kind="doc"
        track={node.path[0]}
        trail={trail.map((item) => item.title).join(" · ")}
      />
      {!isPost && <BlogBreadcrumb trail={trail} />}

      <div
        className={cn(
          "gap-12 xl:grid",
          isPost
            ? "xl:grid-cols-[14rem_minmax(0,1fr)]"
            : "mt-8 xl:grid-cols-[minmax(0,1fr)_16rem] xl:grid-rows-[auto_minmax(0,1fr)] xl:gap-y-8"
        )}
      >
        {isPost ? (
          // The rail head. Below xl there is no rail, so it falls back to being
          // the row above the note — the same single instance either way.
          <aside className="xl:col-start-1 xl:row-start-1">
            <div className="xl:sticky xl:top-24">
              <div className="flex flex-wrap items-center gap-3 xl:flex-col xl:items-start xl:gap-4">
                <BackToBlog />
                <BlogCopyPage
                  title={node.title}
                  markdown={docMarkdown(node, trail)}
                />
              </div>
              <div className="mt-8 hidden xl:block">
                <BlogToc headings={headings} plain />
              </div>
            </div>
          </aside>
        ) : (
          // Same idea, right-hand rail: it heads the TOC column at xl and sits
          // above the note below it. Grid placement, so it stays one instance.
          <div className="mb-6 flex justify-end xl:col-start-2 xl:row-start-1 xl:mb-0 xl:justify-start">
            <BlogCopyPage
              title={node.title}
              markdown={docMarkdown(node, trail)}
            />
          </div>
        )}

        <article
          className={cn(
            "min-w-0",
            isPost
              ? "xl:col-start-2 xl:row-start-1"
              : "xl:col-start-1 xl:row-span-2 xl:row-start-1"
          )}
        >
          <header className="border-b border-border/60 pb-8">
            <Typography
              variant="h1"
              className="text-gradient text-3xl font-extrabold leading-tight sm:text-4xl"
            >
              {node.title}
            </Typography>

            {node.description && (
              <Typography variant="p" className="mt-4 text-lg text-foreground/70">
                {node.description}
              </Typography>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-foreground/45">
              {node.status && <StatusBadge status={node.status} />}
              {node.updated && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={13} />
                  Cập nhật {node.updated}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock size={13} />
                {readingTime(node.body)} phút đọc
              </span>
              {node.tags.length > 0 && (
                <span className="flex flex-wrap gap-1.5">
                  {node.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border/60 px-2 py-0.5"
                    >
                      #{tag}
                    </span>
                  ))}
                </span>
              )}
            </div>
          </header>

          <Reveal>
            <div className="prose-note mt-10">{content}</div>
          </Reveal>

          <DocNav prev={prev} next={next} />
        </article>

        {!isPost && (
          <aside className="hidden xl:col-start-2 xl:row-start-2 xl:block">
            <div className="sticky top-24">
              <BlogToc headings={headings} plain />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

type BackToBlogProps = { className?: string };

/** The post layout's way home — posts have no track, so no breadcrumb. */
const BackToBlog = ({ className }: BackToBlogProps) => (
  <Link
    href="/blog"
    className={cn(
      "group inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-1.5 text-sm text-foreground/70 transition-colors hover:border-primary/50 hover:text-primary",
      className
    )}
  >
    <ArrowLeft
      size={14}
      className="transition-transform group-hover:-translate-x-0.5"
    />
    Quay về Blog
  </Link>
);

export { DocView };
