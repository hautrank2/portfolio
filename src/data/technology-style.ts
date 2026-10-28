import {
  ANGULAR_LOGO,
  ANTD_LOGO,
  K8S_LOGO,
  NEST_LOGO,
  NEXT_LOGO,
  REACT_LOGO,
  THREEJS_LOGO,
} from "~/utils/logo";

export type TechnologyStyleModel = {
  /** `#rrggbb` — tints the badge. */
  color: string;
  /** A file under `public/logo/`. Without one the badge shows a colour dot. */
  logoUrl?: string;
};

/**
 * How a technology looks in the admin area. The database only stores the
 * name as typed (`technologies: string[]`); colour and logo are decided here,
 * on the client. Keys are lowercase — look names up with `getTechnologyStyle`.
 * A name with no entry is not an error: it is shown as plain text.
 */
const technologyStyleData: Record<string, TechnologyStyleModel> = {
  kubernetes: { color: "#326ce5", logoUrl: K8S_LOGO },
  kubectl: { color: "#326ce5", logoUrl: K8S_LOGO },
  docker: { color: "#2496ed" },
  linux: { color: "#fcc624" },
  aws: { color: "#ff9900" },
  eks: { color: "#ff9900" },
  mongodb: { color: "#47a248" },
  networking: { color: "#a78bfa" },
  volumes: { color: "#34d399" },
  "next.js": { color: "#94a3b8", logoUrl: NEXT_LOGO },
  react: { color: "#61dafb", logoUrl: REACT_LOGO },
  angular: { color: "#dd0031", logoUrl: ANGULAR_LOGO },
  nestjs: { color: "#e0234e", logoUrl: NEST_LOGO },
  "ant design": { color: "#1677ff", logoUrl: ANTD_LOGO },
  "three.js": { color: "#94a3b8", logoUrl: THREEJS_LOGO },
  "claude api": { color: "#d97757" },
  "claude code": { color: "#d97757" },
  "claude agent sdk": { color: "#d97757" },
  mcp: { color: "#a78bfa" },
  typescript: { color: "#3178c6" },
  // Languages as GitHub reports them on a repo. Colours mostly follow
  // GitHub's own; CSS and C# use their logo colours instead.
  javascript: { color: "#f1e05a" },
  python: { color: "#3572a5" },
  "c#": { color: "#9b4f96" },
  html: { color: "#e34c26" },
  css: { color: "#1572b6" },
  scss: { color: "#c6538c" },
  java: { color: "#b07219" },
  go: { color: "#00add8" },
  rust: { color: "#dea584" },
  php: { color: "#4f5d95" },
  shell: { color: "#89e051" },
  dockerfile: { color: "#384d54" },
  vue: { color: "#41b883" },
  dart: { color: "#00b4ab" },
  kotlin: { color: "#a97bff" },
  swift: { color: "#f05138" },
  "c++": { color: "#f34b7d" },
  c: { color: "#555555" },
  "jupyter notebook": { color: "#da5b0b" },
  mdx: { color: "#fcb32c" },
  "node.js": { color: "#5fa04e" },
  tailwind: { color: "#38bdf8" },
};

/** Other spellings people actually type, mapped to a key above. */
const technologyAliasData: Record<string, string> = {
  k8s: "kubernetes",
  next: "next.js",
  nextjs: "next.js",
  nest: "nestjs",
  antd: "ant design",
  threejs: "three.js",
  ts: "typescript",
  js: "javascript",
  py: "python",
  csharp: "c#",
  cpp: "c++",
  golang: "go",
  node: "node.js",
  nodejs: "node.js",
  mongo: "mongodb",
  tailwindcss: "tailwind",
};

/** Case-insensitive; `undefined` when the name has no configured style. */
export const getTechnologyStyle = (name: string): TechnologyStyleModel | undefined => {
  const key = name.trim().toLowerCase();
  return technologyStyleData[technologyAliasData[key] ?? key];
};
