/** The kinds of link a project card can show. */
export type ProjectLinkKindEnum = "website" | "github" | "api";

export type ProjectLinkModel = {
  title: string;
  url: string;
  kind: ProjectLinkKindEnum;
};

export type ProjectTechnologyModel = {
  title: string;
  logoUrl: string;
};

export type ProjectModel = {
  slug: string;
  title: string;
  desc: string;
  /** Optional — cards fall back to a gradient placeholder when there is no shot yet. */
  imgUrl?: string;
  featured: boolean;
  technologies: ProjectTechnologyModel[];
  links: ProjectLinkModel[];
};
