import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  GraduationCap,
  MapPin,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "~/components/ui/carousel";
import { Reveal } from "~/components/ui/reveal";
import { cn } from "~/lib/utils";
import type { CvModel } from "~/types";
import { TechIcon, techColor } from "./tech-icon";

/*
 * The sections of `/resume`. Server Components: the interactive pieces are
 * the scroll-spy sidebar and the projects carousel, so nothing else here ships
 * to the client beyond the <Reveal> wrappers that fade blocks in.
 */

const hasText = (value: string) => value.trim().length > 0;

const trimmed = (items: string[]) =>
  items.map((item) => item.trim()).filter(Boolean);

type ResumeSectionProps = {
  id: string;
  index: number;
  title: string;
  children: React.ReactNode;
};

/**
 * Small index + title, and an accent bar that grows in once the heading is
 * revealed — `<Reveal>` flips `data-visible`, which the bar keys its width off.
 */
export const ResumeSection = ({
  id,
  index,
  title,
  children,
}: ResumeSectionProps) => (
  // `html` already pads anchor jumps by 6rem for the site header; only the
  // mobile section strip under it needs a little extra.
  <section id={id} className="scroll-mt-6 lg:scroll-mt-0">
    <Reveal className="group mb-10">
      <h2 className="flex items-baseline gap-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
        <span className="font-mono text-base font-semibold text-primary">
          {String(index).padStart(2, "0")}
        </span>
        {title}
      </h2>
      <span
        aria-hidden
        className="mt-4 block h-1 w-0 rounded-full bg-primary transition-[width] delay-300 duration-700 ease-out group-data-[visible=true]:w-12 motion-reduce:w-12 motion-reduce:transition-none"
      />
    </Reveal>
    {children}
  </section>
);

// ---------------------------------------------------------------------------

export type ResumeStats = { label: string; value: string }[];

/**
 * The sidebar header: photo, name, title and the contact actions — the hero,
 * folded into the left column so it stays in view while the content scrolls.
 */
export const ResumeProfile = ({
  cv,
  actions,
}: {
  cv: CvModel;
  actions: React.ReactNode;
}) => (
  <Reveal>
    {hasText(cv.avatar) && (
      <div className="relative size-20">
        {/* Spinning conic ring behind the photo. */}
        <div
          aria-hidden
          className="absolute -inset-1 rounded-full bg-[conic-gradient(from_0deg,var(--primary),transparent_40%,var(--primary)_60%,transparent)] motion-safe:animate-[spin_8s_linear_infinite]"
        />
        <div
          aria-hidden
          className="absolute -inset-4 rounded-full bg-primary/25 blur-2xl"
        />
        <Image
          src={cv.avatar}
          alt={cv.name}
          fill
          priority
          sizes="80px"
          className="relative rounded-full border-[3px] border-background object-cover"
        />
      </div>
    )}
    <h1 className="text-gradient mt-5 text-3xl font-black leading-tight tracking-tight">
      {cv.name}
    </h1>
    <p className="mt-1 text-lg font-semibold text-primary">{cv.title}</p>
    {hasText(cv.location) && (
      <p className="mt-2 flex items-center gap-1.5 text-sm text-foreground/70">
        <MapPin size={14} aria-hidden className="text-primary" />
        {cv.location}
      </p>
    )}
    <div className="mt-6">{actions}</div>
  </Reveal>
);

// ---------------------------------------------------------------------------

export const ResumeAbout = ({
  cv,
  stats,
}: {
  cv: CvModel;
  stats: ResumeStats;
}) => {
  const [lead, ...rest] = trimmed(cv.objective);
  if (!lead) return null;

  return (
    <div className="space-y-6">
      <Reveal>
        <p className="text-xl font-semibold leading-snug text-foreground sm:text-2xl">
          {lead}
        </p>
      </Reveal>
      {stats.length > 0 && (
        <div className="grid grid-cols-3 gap-3 py-4">
          {stats.map((stat, index) => (
            <Reveal key={stat.label} delay={100 + index * 100}>
              <div className="surface h-full rounded-2xl border border-border/60 p-4 text-center transition-colors hover:border-primary/50 sm:p-5">
                <p className="text-gradient text-3xl font-black sm:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      )}
      {rest.map((paragraph, index) => (
        <Reveal key={index} delay={80 * (index + 1)}>
          <p className="border-l-2 border-primary/40 pl-5 text-base leading-relaxed text-foreground/75 sm:text-lg">
            {paragraph}
          </p>
        </Reveal>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------

export const ResumeEducation = ({ cv }: { cv: CvModel }) => (
  <div className="space-y-6">
    {cv.education.map((edu, index) => (
      <Reveal key={index} delay={index * 80}>
        <div className="surface group relative overflow-hidden rounded-3xl border border-border/60 p-6 transition-colors hover:border-primary/50 sm:p-8">
          <GraduationCap
            aria-hidden
            className="absolute -right-6 -bottom-8 size-44 text-primary/10 transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110"
          />
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <CalendarDays size={16} aria-hidden />
            {edu.period}
          </p>
          <h3 className="relative mt-3 text-xl font-bold sm:text-2xl">
            {edu.school}
          </h3>
          <div className="relative mt-4 flex flex-wrap gap-3 text-base">
            {hasText(edu.major) && (
              <span className="rounded-full bg-primary/10 px-4 py-1.5">
                {edu.major}
              </span>
            )}
            {hasText(edu.specialty) && (
              <span className="rounded-full bg-primary/10 px-4 py-1.5">
                {edu.specialty}
              </span>
            )}
          </div>
        </div>
      </Reveal>
    ))}
  </div>
);

// ---------------------------------------------------------------------------

export const ResumeSkills = ({ cv }: { cv: CvModel }) => (
  <div className="space-y-10">
    {cv.skills.map((group, groupIndex) => (
      <div key={groupIndex}>
        <Reveal>
          <h3 className="mb-4 text-lg font-bold text-foreground/80">
            {group.label}
          </h3>
        </Reveal>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
          {trimmed(group.items).map((item, index) => (
            <Reveal key={index} delay={index * 60}>
              <div
                // The brand colour drives the hover glow; unknown skills fall
                // back to the theme primary.
                style={
                  {
                    "--brand": techColor(item) ?? "var(--primary)",
                  } as React.CSSProperties
                }
                className="surface group flex h-full items-center gap-3 rounded-2xl border border-border/60 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--brand)] hover:shadow-[0_8px_30px_-12px_var(--brand)]"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-foreground/5 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                  <TechIcon name={item} size={24} />
                </span>
                <span className="text-base font-semibold">{item}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    ))}
  </div>
);

// ---------------------------------------------------------------------------

export const ResumeExperience = ({ cv }: { cv: CvModel }) => (
  <ol className="relative space-y-12 border-l-2 border-border/60 pl-8 sm:pl-10">
    {cv.experiences.map((exp, index) => (
      <li key={index} className="relative">
        {/* Timeline dot; the first (current) job pulses. */}
        <span
          aria-hidden
          className="absolute top-2 -left-[calc(2rem+7px)] grid size-3 place-items-center sm:-left-[calc(2.5rem+7px)]"
        >
          {index === 0 && (
            <span className="absolute size-full rounded-full bg-primary motion-safe:animate-ping" />
          )}
          <span className="relative size-3 rounded-full bg-primary ring-4 ring-background" />
        </span>

        <Reveal>
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <CalendarDays size={16} aria-hidden />
            {exp.period}
            {hasText(exp.note) && (
              <span className="text-muted-foreground">· {exp.note}</span>
            )}
          </p>
          <h3 className="mt-2 text-xl font-bold leading-tight sm:text-2xl">
            {exp.company}
          </h3>
          <p className="mt-1 text-lg font-semibold text-primary">{exp.role}</p>
        </Reveal>

        <ul className="mt-6 space-y-4">
          {trimmed(exp.highlights).map((item, itemIndex) => (
            // <Reveal> renders a <div>, so it goes inside the <li>, not around.
            <li key={itemIndex}>
              <Reveal
                delay={itemIndex * 60}
                className="flex gap-4 text-base leading-relaxed text-foreground/80"
              >
                <span
                  aria-hidden
                  className="mt-3 size-2 shrink-0 rotate-45 bg-primary"
                />
                {item}
              </Reveal>
            </li>
          ))}
        </ul>
      </li>
    ))}
  </ol>
);

// ---------------------------------------------------------------------------

/**
 * A horizontal carousel, one project per view. Drag, swipe, the arrow keys or
 * the buttons at either end of the control row all move it.
 */
export const ResumeProjects = ({ cv }: { cv: CvModel }) => (
  <Reveal>
    <Carousel opts={{ align: "start" }}>
      {/* Vertical padding keeps the hover shadow from being clipped by the
          carousel's overflow-hidden viewport. */}
      <CarouselContent className="py-4">
        {cv.projects.map((project, index) => {
          const stack = trimmed(project.stack);
          return (
            <CarouselItem key={index}>
              <article className="surface group relative h-full overflow-hidden rounded-3xl border border-border/60 p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 sm:p-8">
                {/* Light that follows the card edge on hover. */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-primary/0 blur-3xl transition-colors duration-500 group-hover:bg-primary/20"
                />
                <div className="relative flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-sm text-primary">
                      {String(index + 1).padStart(2, "0")}
                      {hasText(project.kind) && (
                        <span className="text-muted-foreground">
                          {" "}
                          · {project.kind}
                        </span>
                      )}
                    </p>
                    <h3 className="mt-2 text-xl font-bold sm:text-2xl">
                      {project.name}
                    </h3>
                    {hasText(project.role) && (
                      <p className="mt-1 text-lg font-semibold text-primary">
                        {project.role}
                      </p>
                    )}
                  </div>
                  {hasText(project.period) && (
                    <span className="flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-sm text-muted-foreground">
                      <CalendarDays size={14} aria-hidden />
                      {project.period}
                    </span>
                  )}
                </div>

                {stack.length > 0 && (
                  <div className="relative mt-5 flex flex-wrap gap-2">
                    {stack.map((tech, techIndex) => (
                      <span
                        key={techIndex}
                        className="flex items-center gap-2 rounded-full border border-border/60 bg-background/40 py-1 ps-2 pe-3 text-sm font-medium"
                      >
                        <TechIcon name={tech} size={16} />
                        {tech}
                      </span>
                    ))}
                  </div>
                )}

                <ul className="relative mt-6 space-y-3">
                  {trimmed(project.highlights).map((item, itemIndex) => (
                    <li
                      key={itemIndex}
                      className="flex gap-3 text-base leading-relaxed text-foreground/80"
                    >
                      <ArrowUpRight
                        aria-hidden
                        size={18}
                        className="mt-1 shrink-0 text-primary"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            </CarouselItem>
          );
        })}
      </CarouselContent>

      {/* Controls below the cards so they never cover the content. */}
      <div className="mt-4 flex items-center justify-between gap-4">
        <CarouselPrevious className="static size-10 translate-y-0" />
        <CarouselDots />
        <CarouselNext className="static size-10 translate-y-0" />
      </div>
    </Carousel>
  </Reveal>
);

// ---------------------------------------------------------------------------

export const ResumeContact = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <Reveal>
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-primary/30 bg-primary/10 p-8 sm:p-12",
        className
      )}
    >
      <div
        aria-hidden
        className="bg-grid pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_bottom_right,black,transparent_70%)]"
      />
      <p className="relative text-2xl font-extrabold leading-tight sm:text-4xl">
        Have something useful to build?
        <br />
        <span className="text-gradient">Let&apos;s talk about it.</span>
      </p>
      <div className="relative mt-8">{children}</div>
    </div>
  </Reveal>
);

// ---------------------------------------------------------------------------

/**
 * The way out to the paper CV. Drawn as a tiny A4 sheet — folded corner, a
 * title bar and a few text lines — so it reads as "the document you print"
 * rather than one more button. The sheet stays white in both themes: it is
 * paper, like the `/cv` page it leads to.
 */
export const ResumePaperLink = ({ href }: { href: string }) => (
  <Link
    href={href}
    className="group flex items-center gap-4 rounded-2xl border border-border/60 p-3 transition-colors hover:border-primary/60 hover:bg-primary/5"
  >
    <span
      aria-hidden
      className="relative h-14 w-10 shrink-0 rounded-[3px] bg-white p-1.5 shadow-md transition-transform duration-300 group-hover:-translate-y-1 group-hover:-rotate-3 group-hover:shadow-lg group-hover:shadow-primary/20"
    >
      {/* Folded corner. */}
      <span className="absolute top-0 right-0 size-2.5 rounded-bl-[3px] bg-gradient-to-bl from-transparent from-50% to-neutral-300 to-50%" />
      <span className="block h-1 w-4 rounded-full bg-primary" />
      <span className="mt-1.5 block h-0.5 w-full rounded-full bg-neutral-300" />
      <span className="mt-1 block h-0.5 w-5/6 rounded-full bg-neutral-300" />
      <span className="mt-1 block h-0.5 w-full rounded-full bg-neutral-300" />
      <span className="mt-1.5 block h-0.5 w-2/3 rounded-full bg-neutral-300" />
      <span className="mt-1 block h-0.5 w-full rounded-full bg-neutral-300" />
    </span>
    <span className="min-w-0 flex-1 leading-tight">
      <span className="block text-sm font-semibold">Printable CV</span>
      <span className="mt-0.5 block text-xs text-muted-foreground">
        A4 paper version
      </span>
    </span>
    <ArrowRight
      aria-hidden
      size={16}
      className="shrink-0 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary"
    />
  </Link>
);
