import Image from "next/image";
import PageHeader from "~/components/layouts/page-header";
import { Reveal } from "~/components/ui/reveal";
import { Typography } from "~/components/ui/typography";
import { trackLogoData } from "~/data/blog";
import { flattenDocs } from "~/lib/blog";
import { cn } from "~/lib/utils";
import { renderMarkdown } from "./markdown";
import type { BlogNodeContextType, BlogNodeType } from "~/types";
import { BlogBreadcrumb } from "./breadcrumb";
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

  // Gốc `/blog`: con của nó là các track, mỗi track một card lớn có logo.
  const isBlogRoot = node.path.length === 0;

  const cards = node.children.map((child, index) => (
    <Reveal key={child.slug} delay={Math.min(index, 6) * 60}>
      {isBlogRoot ? <TrackCard node={child} /> : <NodeCard node={child} />}
    </Reveal>
  ));

  const header = standalone ? (
    <PageHeader kicker={kicker} title={node.title} description={node.description}>
      <div className="mt-8 flex flex-col gap-4">
        {trail.length > 0 && <BlogBreadcrumb trail={trail} />}
        <BlogProgress done={node.progress.done} total={node.progress.total} />
      </div>
    </PageHeader>
  ) : (
    <header className="border-b border-border/60 pb-8">
      <BlogBreadcrumb trail={trail} />
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

      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-8 lg:py-16">
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

        {node.children.length > 0 &&
          (isTrackRoot ? (
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
            <div
              className={cn(
                intro ? "mt-14" : "mt-10",
                isBlogRoot
                  ? "grid gap-5 sm:grid-cols-2"
                  : "space-y-4"
              )}
            >
              {cards}
            </div>
          ))}

        {node.children.length === 0 && !intro && (
          <p className="text-foreground/50">Chưa có gì ở đây.</p>
        )}
      </div>
    </div>
  );
};

export { SectionView };
