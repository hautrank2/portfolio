import { Server, SquareArrowOutUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { Github } from "~/components/icons/github";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Typography } from "~/components/ui/typography";
import type { ProjectLinkKindEnum, ProjectModel } from "~/types";
import { cn } from "~/lib/utils";

const linkIcons = {
  website: SquareArrowOutUpRight,
  github: Github,
  api: Server,
} satisfies Record<ProjectLinkKindEnum, React.ElementType>;

/** "Weather forecast" -> "WF", used by the no-screenshot placeholder. */
function initials(title: string) {
  return title
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
}

type ProjectCardPropsType = {
  project: ProjectModel;
  className?: string;
};

function ProjectCard({ project, className }: ProjectCardPropsType) {
  return (
    <article
      className={cn(
        "surface group flex flex-col overflow-hidden rounded-2xl border border-border/60",
        "transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10",
        className
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden border-b border-border/60">
        {project.imgUrl ? (
          <Image
            src={project.imgUrl}
            alt={`${project.title} screenshot`}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center bg-gradient-to-br from-primary/25 via-primary/5 to-transparent">
            <span className="text-4xl font-extrabold uppercase tracking-tight text-foreground/25">
              {initials(project.title)}
            </span>
          </div>
        )}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background/80 to-transparent"
        />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <Typography variant="h3" className="text-xl">
          {project.title}
        </Typography>
        <Typography variant="p" className="mt-2 text-muted-foreground">
          {project.desc}
        </Typography>

        <div className="mt-4 flex flex-wrap gap-2">
          {project.technologies.map((tech) => (
            <Tooltip key={tech.title}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 rounded-full border border-border/60 py-1 pe-3 ps-1 text-sm">
                  <Image
                    src={tech.logoUrl}
                    alt=""
                    width={20}
                    height={20}
                    className="size-5 rounded-full bg-foreground/80 p-px"
                  />
                  {tech.title}
                </div>
              </TooltipTrigger>
              <TooltipContent>Built with {tech.title}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/60 pt-4">
          {project.links.map((link) => {
            const Icon = linkIcons[link.kind];
            return (
              <Link
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                <Icon size={15} />
                {link.title}
              </Link>
            );
          })}
        </div>
      </div>
    </article>
  );
}

export default ProjectCard;
