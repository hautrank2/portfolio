import Image from "next/image";
import { readingTime, renderMarkdown } from "~/components/blog/markdown";
import { Reveal } from "~/components/ui/reveal";
import { Typography } from "~/components/ui/typography";
import { trackLogoData } from "~/data/blog";
import { flattenDocs, getPosts } from "~/utils/blog";
import { cn } from "~/lib/utils";
import type { BlogNodeContextType, BlogNodeType } from "~/types";
import { sectionMarkdown } from "~/utils/blog-copy";
import { BlogBreadcrumb } from "./breadcrumb";
import { BlogExplorer } from "./blog-explorer";
import { BlogCopyPage } from "./copy-page";
import { NodeCard } from "./node-card";
import { NoteList } from "./note-list";
import { BlogProgress } from "./progress";
import { BlogResume } from "./resume-card";
import { TrackCard } from "./track-card";
import { TrackTabs } from "./track-tabs";
import { BlogVisitTracker } from "./visit-tracker";

/** Maps every doc under a track to the top-level section it belongs to. */
const sectionLabels = (track: BlogNodeType) => {
  const labels: Record<string, string> = {};

  for (const section of track.children) {
    for (const doc of flattenDocs(section)) labels[doc.href] = section.title;
    if (section.kind === "doc") labels[section.href] = track.title;
  }
  return labels;
};

type ZoneHeadingProps = { title: string; hint: string };

/** Heading for one of the two zones at `/blog`: Roadmap and Bài lẻ. */
const ZoneHeading = ({ title, hint }: ZoneHeadingProps) => (
  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
    <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
    <p className="text-sm text-foreground/45">{hint}</p>
  </div>
);

type SectionViewProps = BlogNodeContextType & {
  /**
   * `/blog` owns the full viewport width, so it keeps the big PageHeader. Track
   * pages sit next to the nav rail and get a lighter in-column header instead.
   */
  standalone?: boolean;
};

/** A folder: its `index.md` intro, then its children in `order:` sequence. */
const SectionView = async ({ node, trail, standalone }: SectionViewProps) => {
  const intro = await renderMarkdown(node.body);
  const kicker = trail.at(-1)?.title ?? "Blog";

  // Only a track (`/blog/k8s`) gets the second view — deeper sections are small
  // enough that a flat listing would just repeat the cards above it.
  const isTrackRoot = node.path.length === 1;
  const notes = isTrackRoot ? flattenDocs(node) : [];

  // `/blog` resumes from anywhere; a track resumes only within itself. Deeper
  // sections get nothing — the reader is already inside what they left.
  const showResume = standalone || isTrackRoot;
  const logo = isTrackRoot ? trackLogoData[node.slug] : undefined;

  // A folder page is its listing, so what gets copied is the intro plus the
  // reading order underneath it — see `sectionMarkdown`.
  const copyButton = (
    <BlogCopyPage title={node.title || "Blog"} markdown={sectionMarkdown(node, trail)} />
  );

  // Gốc `/blog`: folder là track (card lớn có logo), file `.md` là bài lẻ —
  // chúng xuống feed riêng bên dưới thay vì giả làm một track.
  const isBlogRoot = node.path.length === 0;
  const children = isBlogRoot
    ? node.children.filter((child) => child.kind !== "doc")
    : node.children;
  const posts = isBlogRoot
    ? getPosts().map((post) => ({
        href: post.href,
        title: post.title,
        description: post.description,
        status: post.status,
        date: post.created ?? post.updated,
        minutes: readingTime(post.body),
        tags: post.tags,
      }))
    : [];

  const cards = children.map((child, index) => (
    <Reveal key={child.slug} delay={Math.min(index, 6) * 60}>
      {isBlogRoot ? <TrackCard node={child} /> : <NodeCard node={child} />}
    </Reveal>
  ));

  // `/blog` gets a deliberately flat hero — the cards are the page, so the
  // header only has to say where you are, not fill a viewport like PageHeader.
  const header = standalone ? (
    <section className="relative overflow-hidden border-b border-border/60">
      <div
        aria-hidden
        className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_75%)]"
      />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-end sm:justify-between sm:px-8 lg:px-16 lg:py-10">
        <div>
          <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {kicker}
            <span aria-hidden className="h-px w-10 bg-primary/40" />
          </p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <Typography
              variant="h1"
              className="text-gradient text-3xl font-extrabold leading-tight sm:text-4xl"
            >
              {node.title}
            </Typography>
            {node.description && (
              <Typography variant="p" className="text-sm text-foreground/60">
                {node.description}
              </Typography>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3 sm:mb-1.5">
          <BlogProgress done={node.progress.done} total={node.progress.total} />
          {copyButton}
        </div>
      </div>
    </section>
  ) : (
    <header className="border-b border-border/60 pb-8">
      <div className="flex items-center justify-between gap-4">
        <BlogBreadcrumb trail={trail} />
        {copyButton}
      </div>
      <div className="mt-5 flex items-center gap-3">
        {logo && (
          <Image
            src={logo.logoUrl}
            alt=""
            width={48}
            height={48}
            className="size-9 shrink-0 object-contain sm:size-11"
          />
        )}
        <Typography
          variant="h1"
          className="text-gradient text-3xl font-extrabold leading-tight sm:text-4xl"
        >
          {node.title}
        </Typography>
      </div>
      {node.description && (
        <Typography variant="p" className="mt-4 text-lg text-foreground/70">
          {node.description}
        </Typography>
      )}
      <BlogProgress
        done={node.progress.done}
        total={node.progress.total}
        className="mt-6"
      />
    </header>
  );

  return (
    <div className="pb-24">
      {/* The blog root is a landing page, not a stop on the trail. */}
      {node.path.length > 0 && (
        <BlogVisitTracker
          href={node.href}
          title={node.title}
          kind="section"
          track={node.path[0]}
          trail={trail.map((item) => item.title).join(" · ")}
        />
      )}

      {standalone && header}

      <div
        className={cn(
          "mx-auto w-full max-w-6xl px-4 sm:px-8",
          standalone ? "py-8 lg:py-10" : "py-12 lg:py-16"
        )}
      >
        {!standalone && header}

        {showResume && (
          <BlogResume
            track={isTrackRoot ? node.slug : undefined}
            className={standalone ? "mb-10" : "mt-10"}
          />
        )}

        {intro && (
          <Reveal className={standalone ? undefined : "mt-10"}>
            <div className="prose-note">{intro}</div>
          </Reveal>
        )}

        {isBlogRoot ? (
          <div className={intro ? "mt-14" : "mt-10"}>
            <BlogExplorer
              posts={posts}
              roadmap={
                cards.length > 0 && (
                  <section>
                    <ZoneHeading
                      title="Roadmap"
                      hint="chuỗi note dài theo chủ đề, đọc theo thứ tự — node xám là phần chưa viết"
                    />
                    <div className="mt-5 grid gap-5 sm:grid-cols-2">{cards}</div>
                  </section>
                )
              }
            />
          </div>
        ) : node.children.length > 0 ? (
          isTrackRoot ? (
            <div className={intro ? "mt-14" : "mt-10"}>
              <TrackTabs
                noteCount={notes.length}
                roadmap={cards}
                notes={
                  <NoteList notes={notes} sectionOf={sectionLabels(node)} />
                }
              />
            </div>
          ) : (
            <div className={cn(intro ? "mt-14" : "mt-10", "space-y-4")}>
              {cards}
            </div>
          )
        ) : null}

        {node.children.length === 0 && !intro && (
          <p className="text-foreground/50">Chưa có gì ở đây.</p>
        )}
      </div>
    </div>
  );
};

export { SectionView };
