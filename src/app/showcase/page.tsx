import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import React from "react";
import PageHeader from "~/components/layouts/page-header";
import { Button } from "~/components/ui/button";
import { projects } from "~/data/projects";
import ProjectSection from "../components/ProjectSection";

export const metadata: Metadata = {
  title: "Showcase",
  description:
    "Every side project I have built and shipped, with links to the live site and the source.",
};

export default function ShowcasePage() {
  return (
    <div className="pb-24">
      <PageHeader
        kicker="Showcase"
        title="Things I have built"
        description="Side projects I picked up to learn something new, then took all the way to a deployed URL. Every one of them has its source open."
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-8 lg:px-16">
        <ProjectSection projects={projects} />

        <Button asChild variant="ghost" className="group mt-12 rounded-full">
          <Link href="/">
            <ArrowLeft
              size={16}
              className="transition-transform group-hover:-translate-x-1"
            />
            Back to home
          </Link>
        </Button>
      </div>
    </div>
  );
}
