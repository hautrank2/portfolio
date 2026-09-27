/** A labelled link on the CV header — LinkedIn, GitHub, the portfolio itself. */
export type CvLinkModel = {
  label: string;
  url: string;
};

export type CvEducationModel = {
  school: string;
  period: string;
  major: string;
  specialty: string;
};

/** One row of the skills table: `Frontend` → `React, Angular, Next.js`. */
export type CvSkillGroupModel = {
  label: string;
  items: string[];
};

export type CvExperienceModel = {
  company: string;
  role: string;
  period: string;
  /** Free-text line under the role, e.g. an internship before the full-time role. */
  note: string;
  highlights: string[];
};

export type CvProjectModel = {
  name: string;
  /** `Work project` / `Side project` — shown next to the period. */
  kind: string;
  period: string;
  role: string;
  stack: string[];
  highlights: string[];
};

export type CvModel = {
  name: string;
  title: string;
  /** Photo in the top-left corner — a path under `public/` or a full URL. */
  avatar: string;
  phone: string;
  birthday: string;
  email: string;
  location: string;
  links: CvLinkModel[];
  /** One entry per paragraph. */
  objective: string[];
  education: CvEducationModel[];
  skills: CvSkillGroupModel[];
  experiences: CvExperienceModel[];
  projects: CvProjectModel[];
};
