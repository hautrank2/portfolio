import cv from "~/data/cv.json";

// The last three are explicitly requested by the owner, in addition to the CV's skill list.
export const roomTechnologies = [
  { name: "React", file: "react" }, { name: "Angular", file: "angular" },
  { name: "Next.js", file: "nextjs" }, { name: "NestJS", file: "nestjs" },
  { name: "FastAPI", file: "fastapi" }, { name: "Docker", file: "docker" },
  { name: "TypeScript", file: "typescript" }, { name: "Python", file: "python" },
  { name: "MongoDB", file: "mongodb" }, { name: "PostgreSQL", file: "postgresql" },
  { name: ".NET", file: "dotnet" }, { name: "Linux", file: "linux" }, { name: "AWS", file: "aws" },
].filter(technology => [".NET", "Linux", "AWS"].includes(technology.name) || cv.skills.some(skill => skill.items.includes(technology.name)));
