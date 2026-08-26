import type { ProjectModel } from "~/types";
import { technologyData } from "./technology";

export const projectData: ProjectModel[] = [
  {
    slug: "weather-forecast",
    title: "Weather forecast",
    desc: "A website to display weather informations.",
    imgUrl: "/img/home/weather-forecase.png",
    featured: true,
    technologies: [technologyData.angular],
    links: [
      {
        title: "Website",
        kind: "website",
        url: "https://weather-forecast-35f17.web.app",
      },
      {
        title: "GitHub",
        kind: "github",
        url: "https://github.com/hautrank2/weather-forecast",
      },
      { title: "API", kind: "api", url: "https://www.weatherapi.com" },
    ],
  },
  {
    slug: "kevin-fans",
    title: "Kevin Fans",
    desc: "This is where I talk about my idol Kevin De Bruyne.",
    imgUrl: "/img/home/kevin-de-bruyne.png",
    featured: true,
    technologies: [technologyData.next],
    links: [
      {
        title: "Website",
        kind: "website",
        url: "https://football-player-hautran02s-projects.vercel.app",
      },
      {
        title: "GitHub",
        kind: "github",
        url: "https://github.com/hautrank2/football-player",
      },
    ],
  },
  {
    slug: "ops-desk-client",
    title: "OpsDesk",
    desc: "This is software for managing assets and tickets",
    featured: true,
    imgUrl: "/img/ops-desk-page.png",
    technologies: [technologyData.next],
    links: [
      {
        title: "GitHub",
        kind: "github",
        url: "https://github.com/hautrank2/portfolio",
      },
    ],
  },
  {
    slug: "portfolio",
    title: "This portfolio",
    desc: "The site you are reading right now.",
    imgUrl: "/img/portfolio-page.png",
    featured: true,
    technologies: [technologyData.next],
    links: [
      {
        title: "GitHub",
        kind: "github",
        url: "https://github.com/hautrank2/portfolio",
      },
    ],
  },
];

export const featuredProjectData = projectData.filter((p) => p.featured);
