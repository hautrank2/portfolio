import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import PageHeader from "~/components/layouts/page-header";
import { Button } from "~/components/ui/button";
import { Reveal } from "~/components/ui/reveal";
import { Typography } from "~/components/ui/typography";
import { experiences } from "~/data/experiences";
import { profile, stacks } from "~/data/site";
import Experiences from "../components/Experiences";
import SectionHeadline from "../components/SectionHeadline";

const current = experiences[0];

export const metadata: Metadata = {
  title: "About",
  description: profile.bio,
};

export default function AboutPage() {
  return (
    <div className="pb-24">
      <PageHeader
        kicker="About"
        title={`Hi, I am ${profile.name}`}
        description={profile.tagline}
      />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-4 py-16 sm:px-8 sm:gap-32 lg:px-16">
        <section className="grid gap-10 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-16">
          <Reveal>
            <div className="relative mx-auto w-fit">
              <div
                aria-hidden
                className="absolute -inset-6 rounded-3xl bg-primary/20 blur-3xl"
              />
              <Image
                className="relative size-56 rounded-3xl border border-border/60 object-cover sm:size-64"
                src={profile.avatar}
                alt={profile.name}
                width={320}
                height={320}
                priority
              />
            </div>
          </Reveal>

          <Reveal delay={100} className="space-y-5">
            <Typography variant="h2" className="pb-0 text-2xl sm:text-3xl">
              A frontend developer from Ho Chi Minh City
            </Typography>
            <Typography variant="p" className="text-lg text-foreground/80">
              I studied software engineering at Ho Chi Minh City University of
              Technology and Education{" "}
              <Link
                href={profile.university.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                (HCMUTE)
              </Link>
              . During those four years I joined the media group and received
              the Prize for Student of 5 merits.
            </Typography>
            <Typography variant="p" className="text-lg text-foreground/80">
              Since {current.duration.split(" - ")[0]} I have been a{" "}
              {current.role.toLowerCase()} at{" "}
              <Link
                href={current.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {current.company}
              </Link>
              , working on UI/UX design and website development. Sitting on both
              sides means I get to care about how a screen feels, not only
              whether it renders.
            </Typography>
            <Typography variant="p" className="text-lg text-foreground/80">
              Outside of work I build small side projects to try things out —
              a weather app in Angular, a fan page for Kevin De Bruyne in
              Next.js, and this portfolio.
            </Typography>
          </Reveal>
        </section>

        <section id="stack" className="scroll-mt-24">
          <Reveal>
            <SectionHeadline
              index="01"
              title="What I work with"
              href="stack"
              description="The tools I reach for, grouped by the part of the product they touch."
            />
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {stacks.map((stack, index) => (
              <Reveal key={stack.title} delay={index * 90}>
                <div className="surface h-full rounded-2xl border border-border/60 p-6 transition-colors hover:border-primary/50">
                  <Typography variant="h3" className="text-xl">
                    {stack.title}
                  </Typography>
                  <Typography variant="p" className="mt-2 text-muted-foreground">
                    {stack.desc}
                  </Typography>
                  {stack.tools.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {stack.tools.map((tool) => (
                        <span
                          key={tool.title}
                          className="flex items-center gap-2 rounded-full border border-border/60 py-1 pe-3 ps-1 text-sm"
                        >
                          <Image
                            src={tool.logoUrl}
                            alt=""
                            width={20}
                            height={20}
                            className="size-5 rounded-full bg-foreground/80 p-px"
                          />
                          {tool.title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="journey" className="scroll-mt-24">
          <Reveal>
            <SectionHeadline
              index="02"
              title="Journey"
              href="journey"
              description="School, then work — with a few photos from along the way."
            />
          </Reveal>
          <Experiences />
        </section>

        <Reveal className="flex flex-wrap items-center gap-3">
          <Button asChild size="lg" className="group rounded-full">
            <Link href="/showcase">
              See what I built
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full">
            <Link href={`mailto:${profile.email}`}>Say hello</Link>
          </Button>
        </Reveal>
      </div>
    </div>
  );
}
