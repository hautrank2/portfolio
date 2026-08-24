import type { ProjectModel } from "~/types";

export const projects: ProjectModel[] = [
  {
    slug: "weather-forecast",
    title: "Weather forecast",
    desc: "A website to display weather informations.",
    imgUrl: "/img/home/weather-forecase.png",
    featured: true,
    technologies: [{ logoUrl: "/logo/angular.png", title: "Angular" }],
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
    technologies: [{ logoUrl: "/logo/nextjs.png", title: "Next.js" }],
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
    slug: "portfolio",
    title: "This portfolio",
    desc: "The site you are reading right now.",
    featured: true,
    technologies: [{ logoUrl: "/logo/nextjs.png", title: "Next.js" }],
    links: [
      {
        title: "GitHub",
        kind: "github",
        url: "https://github.com/hautrank2/portfolio",
      },
    ],
  },
];

export const featuredProjects = projects.filter((p) => p.featured);
