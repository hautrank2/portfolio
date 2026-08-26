import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Reveal } from "~/components/ui/reveal";
import { featuredProjectData, projectData } from "~/data/projects";
import AboutCta from "./components/AboutCta";
import Experiences from "./components/Experiences";
import Hero from "./components/Hero";
import ProjectSection from "./components/ProjectSection";
import QuickFacts from "./components/QuickFacts";
import SectionHeadline from "./components/SectionHeadline";

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
              description="A few things I built on my own time, from first sketch to deploy."
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
