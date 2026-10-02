import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Experiences from "~/components/sections/experiences";
import SectionHeadline from "~/components/sections/section-headline";
import { Button } from "~/components/ui/button";
import { Reveal } from "~/components/ui/reveal";
import { featuredProjectData, projectData } from "~/data/projects";
import AboutCta from "./_components/AboutCta";
import Hero from "./_components/Hero";
import ProjectSection from "./_components/ProjectSection";
import QuickFacts from "./_components/QuickFacts";

export default function Home() {
  const moreProjects = projectData.length - featuredProjectData.length;

  return (
    <div className="flex flex-col gap-24 pb-24 sm:gap-32">
      <Hero />

      <QuickFacts />

      <section
        id="experiences"
        className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 sm:px-8 lg:px-16"
      >
        <Reveal>
          <SectionHeadline
            index="01"
            title="Experiences"
            href="experiences"
            description="Where I have been studying and shipping over the last few years."
          />
        </Reveal>
        <Experiences />
      </section>

      <section
        id="projects"
        className="scroll-mt-24 border-y border-border/60 bg-primary/5 py-16 sm:py-20"
      >
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-8 lg:px-16">
          <Reveal>
            <SectionHeadline
              index="02"
              title="Projects"
              href="projects"
              description="Built on my own time, from first sketch to deploy. The ones marked as learning projects were for learning and practising a technology — written mostly by hand, with little AI, so the knowledge actually sticks."
              action={
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="group rounded-full"
                >
                  <Link href="/showcase">
                    {moreProjects > 0
                      ? `View all (${projectData.length})`
                      : "View all"}
                    <ArrowRight
                      size={16}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </Link>
                </Button>
              }
            />
          </Reveal>
          <div className="mt-10">
            <ProjectSection projects={featuredProjectData} />
          </div>
        </div>
      </section>

      <AboutCta />
    </div>
  );
}
