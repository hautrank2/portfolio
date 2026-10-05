import { BookOpen, ChevronRight, Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Typography } from "~/components/ui/typography";
import { demoPathTitle, getAllDemos, getDemo } from "~/utils/demo";
import type { DemoLinkKindEnum } from "~/types";
import { DemoVideo } from "../_components/demo-video";

type PagePropsType = { params: Promise<{ slug: string }> };

const LINK_ICONS: Record<DemoLinkKindEnum, typeof BookOpen> = {
  article: BookOpen,
  download: Download,
};

/** Every demo is known at build time; anything else is a static 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllDemos().map((demo) => ({ slug: demo.slug }));
}

export async function generateMetadata({
  params,
}: PagePropsType): Promise<Metadata> {
  const { slug } = await params;
  const demo = getDemo(slug);
  if (!demo) return {};

  return {
    title: demoPathTitle(slug),
    description: demo.description,
    openGraph: { title: demo.title, description: demo.description },
  };
}

export default async function DemoDetailPage({ params }: PagePropsType) {
  const { slug } = await params;
  const demo = getDemo(slug);
  if (!demo) notFound();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-8 lg:py-16">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1.5 text-xs text-foreground/50"
      >
        <Link href="/demo" className="transition-colors hover:text-primary">
          Demo
        </Link>
        <ChevronRight size={12} className="text-foreground/25" />
        <span>{demo.slug}</span>
      </nav>

      <header className="mt-10">
        <Typography
          variant="h1"
          className="text-gradient text-3xl font-extrabold leading-tight sm:text-4xl"
        >
          {demo.title}
        </Typography>
        <Typography variant="p" className="mt-4 text-lg text-foreground/70">
          {demo.description}
        </Typography>
      </header>

      <div className="mt-6 flex flex-wrap gap-3">
        {demo.links.map((link, index) => {
          const Icon = LINK_ICONS[link.kind];
          return (
            <Button
              key={link.href}
              asChild
              size="lg"
              variant={index === 0 ? "default" : "outline"}
            >
              {/* `<a>`, not `<Link>`: a link may point at the zip route handler
                  or off-site, and neither should be prefetched as a page. */}
              <a href={link.href}>
                <Icon />
                {link.title}
              </a>
            </Button>
          );
        })}
      </div>

      <div className="mt-8">
        <DemoVideo title={demo.title} youtubeUrl={demo.youtubeUrl} />
      </div>

      <section className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/40">
          Trong demo
        </h2>
        <ul className="mt-4 space-y-2 text-foreground/80">
          {demo.highlights.map((highlight) => (
            <li key={highlight} className="flex gap-3">
              <span
                aria-hidden
                className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary/60"
              />
              {highlight}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/40">
          Stack
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {demo.stack.map((tool) => (
            <li
              key={tool}
              className="rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-foreground/70"
            >
              {tool}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
