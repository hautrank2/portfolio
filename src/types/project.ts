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
  /**
   * Built to learn and practise a technology, mostly written by hand rather
   * than with AI. Flagged on the card so it is not read as client work.
   */
  learning?: boolean;
  /** Month work started, `YYYY-MM`. */
  start: string;
  /** Month work stopped, `YYYY-MM`. Omit while the project is still ongoing. */
  end?: string;
  technologies: ProjectTechnologyModel[];
  links: ProjectLinkModel[];
};
