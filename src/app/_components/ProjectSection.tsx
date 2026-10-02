import React from "react";
import { Reveal } from "~/components/ui/reveal";
import type { ProjectModel } from "~/types";
import ProjectCard from "./ProjectCard";

type ProjectSectionPropsType = {
  projects: ProjectModel[];
};

function ProjectSection({ projects }: ProjectSectionPropsType) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project, index) => (
        <Reveal key={project.slug} delay={index * 90} className="flex">
          <ProjectCard project={project} className="w-full" />
        </Reveal>
      ))}
    </div>
  );
}

export default ProjectSection;
