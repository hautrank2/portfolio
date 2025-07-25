import { Github, Server, SquareArrowOutUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Typography } from "~/components/ui/typography";

function ProjectSection({}) {
  const data = [
    {
      title: "Weather forecast",
      desc: "An website to display weather informations",
      imgUrl: "/img/home/weather-forecase.png",
      technologies: [
        {
          logoUrl: "/logo/angular.png",
          title: "Angular",
        },
      ],
      links: [
        {
          title: "Website",
          icon: SquareArrowOutUpRight,
          url: "https://weather-forecast-35f17.web.app",
        },
        {
          title: "Gihub",
          icon: Github,
          url: "https://github.com/hautrank2/weather-forecast",
        },
        {
          title: "API",
          icon: Server,
          url: "https://www.weatherapi.com",
        },
      ],
    },
    {
      title: "Kevin Fans",
      desc: "This is where i talk about my idol kevin de bruyne",
      imgUrl: "/img/home/kevin-de-bruyne.png",
      technologies: [
        {
          logoUrl: "/logo/nextjs.png",
          title: "Nextjs",
        },
      ],
      links: [
        {
          title: "Website",
          icon: SquareArrowOutUpRight,
          url: "https://football-player-hautran02s-projects.vercel.app",
        },
        {
          title: "Gihub",
          icon: Github,
          url: "https://github.com/hautrank2/football-player",
        },
      ],
    },
  ];
  return (
    <div className="grid grid-cols-3 gap-4">
      {data.map((item) => {
        return (
          <div
            key={item.title}
            className="card border rounded-lg overflow-hidden"
          >
            <div className="w-full h-64 relative">
              <Image src={item.imgUrl} alt="img" fill objectFit="cover" />
            </div>

            <div className="p-4">
              <Typography variant={"h3"} className="uppercase">
                {item.title}
              </Typography>
              <Typography variant={"p"} className="mt-0">
                {item.desc}
              </Typography>

              <div className="flex items-center gap-2">
                <Typography variant={"h5"}>Technology:</Typography>
                <div className="flex items-center">
                  {item.technologies.map((tech) => (
                    <Tooltip key={tech.title}>
                      <TooltipTrigger asChild>
                        <Image
                          src={tech.logoUrl}
                          alt="logo"
                          width={32}
                          height={32}
                        />
                      </TooltipTrigger>
                      <TooltipContent>{tech.title}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 mt-4 flex-wrap">
                {item.links.map((link) => {
                  const ICON = link.icon;
                  return (
                    <Link
                      key={link.url}
                      href={link.url}
                      className="rounded-full px-6 py-2 border hover:bg-foreground/10 flex gap-2 items-center text-sm"
                      target="_blank"
                    >
                      <ICON size={16} />
                      {link.title}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ProjectSection;
