import { Code2 } from "lucide-react";
import React from "react";
import type { IconType } from "react-icons";
import { RiOpenaiFill } from "react-icons/ri";
import {
  SiAngular,
  SiAntdesign,
  SiClaude,
  SiDocker,
  SiDotnet,
  SiFastapi,
  SiFigma,
  SiGitlab,
  SiGooglegemini,
  SiJavascript,
  SiMongodb,
  SiMui,
  SiNestjs,
  SiNextdotjs,
  SiPostgresql,
  SiPython,
  SiReact,
  SiShadcnui,
  SiTailwindcss,
  SiTypescript,
} from "react-icons/si";
import { TbBrandCSharp } from "react-icons/tb";
import { cn } from "~/lib/utils";

type TechBrand = {
  icon: IconType;
  /**
   * Official brand colour. Raw hex on purpose — these belong to the brands, not
   * to our theme. `undefined` for black-on-white marks (Next.js, shadcn/ui,
   * OpenAI), which follow the text colour so they survive dark mode.
   */
  color?: string;
};

const brands: Record<string, TechBrand> = {
  typescript: { icon: SiTypescript, color: "#3178C6" },
  javascript: { icon: SiJavascript, color: "#F7DF1E" },
  python: { icon: SiPython, color: "#3776AB" },
  csharp: { icon: TbBrandCSharp, color: "#9B4F96" },
  react: { icon: SiReact, color: "#61DAFB" },
  angular: { icon: SiAngular, color: "#DD0031" },
  nextjs: { icon: SiNextdotjs },
  tailwindcss: { icon: SiTailwindcss, color: "#06B6D4" },
  shadcnui: { icon: SiShadcnui },
  antdesign: { icon: SiAntdesign, color: "#0170FE" },
  mui: { icon: SiMui, color: "#007FFF" },
  angularmaterial: { icon: SiAngular, color: "#E91E63" },
  nestjs: { icon: SiNestjs, color: "#E0234E" },
  net: { icon: SiDotnet, color: "#512BD4" },
  dotnet: { icon: SiDotnet, color: "#512BD4" },
  fastapi: { icon: SiFastapi, color: "#009688" },
  mongodb: { icon: SiMongodb, color: "#47A248" },
  postgresql: { icon: SiPostgresql, color: "#4169E1" },
  claude: { icon: SiClaude, color: "#D97757" },
  chatgpt: { icon: RiOpenaiFill },
  openai: { icon: RiOpenaiFill },
  gemini: { icon: SiGooglegemini, color: "#8E75B2" },
  figma: { icon: SiFigma, color: "#F24E1E" },
  gitlab: { icon: SiGitlab, color: "#FC6D26" },
  docker: { icon: SiDocker, color: "#2496ED" },
};

/** `Next.js` → `nextjs`, `C#` → `csharp`, `.NET` → `net`. */
const toKey = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/#/g, "sharp")
    .replace(/[^a-z0-9]/g, "");

/**
 * Brand colour for a skill typed in the CV editor, or `undefined` for one we
 * have no logo for. Exposed so a tile can tint its hover border to match.
 */
export const techColor = (name: string) => brands[toKey(name)]?.color;

export type TechIconProps = Omit<React.ComponentProps<"svg">, "ref"> & {
  name: string;
  size?: number;
};

/**
 * The real logo for a technology named in `cv.json`. Anything unknown — a new
 * skill added in the editor — falls back to a neutral code glyph rather than
 * breaking the page.
 */
export const TechIcon = ({
  name,
  size = 20,
  className,
  ...props
}: TechIconProps) => {
  const brand = brands[toKey(name)];

  if (!brand) {
    return (
      <Code2
        aria-hidden
        size={size}
        className={cn("text-primary", className)}
        {...props}
      />
    );
  }

  const Icon = brand.icon;
  return (
    <Icon
      aria-hidden
      size={size}
      color={brand.color}
      className={cn(!brand.color && "text-foreground", className)}
      {...props}
    />
  );
};
