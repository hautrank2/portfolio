import { Server, SquareArrowOutUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { Github } from "~/components/icons/github";
import { CardBody, CardContainer, CardItem } from "~/components/ui/3d-card";
import { Typography } from "~/components/ui/typography";
import { cn } from "~/lib/utils";
import type { ProjectLinkKindEnum, ProjectModel } from "~/types";

const linkIcons = {
  website: SquareArrowOutUpRight,
  github: Github,
  api: Server,
} satisfies Record<ProjectLinkKindEnum, React.ElementType>;

/** "Weather forecast" -> "WF", used by the no-screenshot placeholder. */
const initials = (title: string) =>
  title
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("");

export type ProjectCard3DProps = {
  project: ProjectModel;
  className?: string;
};

/**
 * A project card that tilts under the cursor, with each row lifted to its own
 * depth so the layers separate as it turns.
 *
 * `translateZ` values are deliberately ordered image > title > text > links:
 * the parallax reads as depth only if the amounts differ, and the screenshot is
 * what should feel closest.
 */
const ProjectCard3D = ({ project, className }: ProjectCard3DProps) => {
  return (
    <CardContainer
      /* The registry default is `py-20`, which would put 80px of dead space
         around every card in a grid. */
      containerClassName="py-0 h-full items-stretch"
      className="h-full w-full"
    >
      <CardBody
        className={cn(
          "surface group/card flex h-full w-full flex-col rounded-2xl border border-border/60",
          "transition-colors hover:border-primary/60",
          className
        )}
      >
        {/* `overflow-hidden` đặt ở ĐÂY chứ không phải trên CardBody: overflow
            khác `visible` ép `transform-style` về `flat`, gắn lên CardBody là
            giết luôn hiệu ứng tách lớp của cả thẻ. Item này không có con 3D
            nào nên bị ép flat cũng không sao. */}
        <CardItem
          translateZ={100}
          className="relative aspect-[16/10] w-full overflow-hidden rounded-t-2xl"
        >
          {project.imgUrl ? (
            <Image
              src={project.imgUrl}
              alt={`${project.title} screenshot`}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center bg-gradient-to-br from-primary/25 via-primary/5 to-transparent">
              <span className="text-4xl font-extrabold uppercase tracking-tight text-foreground/25">
                {initials(project.title)}
              </span>
            </div>
          )}
        </CardItem>

        <CardItem translateZ={60} className="mt-4 w-full px-5">
          <Typography variant="h3" className="text-xl">
            {project.title}
          </Typography>
        </CardItem>

        <CardItem translateZ={40} className="mt-2 w-full px-5">
          <Typography variant="p" className="text-muted-foreground">
            {project.desc}
          </Typography>
        </CardItem>

        <CardItem translateZ={30} className="mt-4 flex w-full flex-wrap gap-2 px-5">
          {project.technologies.map((tech) => (
            <span
              key={tech.title}
              className="flex items-center gap-2 rounded-full border border-border/60 py-1 pe-3 ps-1 text-sm"
            >
              <Image
                src={tech.logoUrl}
                alt=""
                width={20}
                height={20}
                className="size-5 rounded-full bg-foreground/80 p-px"
              />
              {tech.title}
            </span>
          ))}
        </CardItem>

        {/* `mt-auto` pins the links to the bottom so cards of different text
            lengths still line their footers up across the grid. */}
        <CardItem
          translateZ={20}
          className="mt-auto flex w-full flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/60 px-5 pt-4 pb-5"
        >
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
        </CardItem>
      </CardBody>
    </CardContainer>
  );
};

export default ProjectCard3D;
