import { CalendarDays, Clock } from "lucide-react";
import { Reveal } from "~/components/ui/reveal";
import { Typography } from "~/components/ui/typography";
import { extractHeadings, readingTime, renderMarkdown } from "./markdown";
import type { BlogNodeContextType } from "~/types";
import { BlogBreadcrumb } from "./breadcrumb";
import { DocNav } from "./doc-nav";
import { StatusBadge } from "./status-badge";
import { BlogToc } from "./toc";

export type DocViewProps = BlogNodeContextType;

/** A single note. */
const DocView = async ({ node, trail, prev, next }: DocViewProps) => {
  const content = await renderMarkdown(node.body);
  const headings = extractHeadings(node.body);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-8 lg:py-16">
      <BlogBreadcrumb trail={trail} />

      <div className="mt-10 gap-12 xl:grid xl:grid-cols-[minmax(0,1fr)_14rem]">
        <article className="min-w-0">
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

        <BlogToc headings={headings} />
      </div>
    </div>
  );
};

export { DocView };
