import type {
  CvEducationModel,
  CvExperienceModel,
  CvLinkModel,
  CvModel,
  CvProjectModel,
  CvSkillGroupModel,
} from "~/types";

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const str = (value: unknown) => (typeof value === "string" ? value : "");

const strList = (value: unknown) =>
  Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];

const recordList = <T>(value: unknown, map: (item: UnknownRecord) => T) =>
  Array.isArray(value) ? value.filter(isRecord).map(map) : [];

/**
 * Coerces anything JSON-shaped into a complete `CvModel`, or `null` when it is
 * not a CV at all. Missing fields become empty rather than failing the whole
 * import, so a file from an older shape still opens.
 */
export const normalizeCv = (value: unknown): CvModel | null => {
  if (!isRecord(value) || typeof value.name !== "string") return null;

  return {
    name: value.name,
    title: str(value.title),
    avatar: str(value.avatar),
    phone: str(value.phone),
    birthday: str(value.birthday),
    email: str(value.email),
    location: str(value.location),
    links: recordList<CvLinkModel>(value.links, (item) => ({
      label: str(item.label),
      url: str(item.url),
    })),
    objective: strList(value.objective),
    education: recordList<CvEducationModel>(value.education, (item) => ({
      school: str(item.school),
      period: str(item.period),
      major: str(item.major),
      specialty: str(item.specialty),
    })),
    skills: recordList<CvSkillGroupModel>(value.skills, (item) => ({
      label: str(item.label),
      items: strList(item.items),
    })),
    experiences: recordList<CvExperienceModel>(value.experiences, (item) => ({
      company: str(item.company),
      role: str(item.role),
      period: str(item.period),
      note: str(item.note),
      highlights: strList(item.highlights),
    })),
    projects: recordList<CvProjectModel>(value.projects, (item) => ({
      name: str(item.name),
      kind: str(item.kind),
      period: str(item.period),
      role: str(item.role),
      stack: strList(item.stack),
      highlights: strList(item.highlights),
    })),
  };
};

/**
 * The editor keeps list fields exactly as typed — a trailing comma or space is
 * mid-keystroke, not garbage — so tidy them only on the way out.
 */
export const tidyCv = (cv: CvModel): CvModel => {
  const clean = (items: string[]) =>
    items.map((item) => item.trim()).filter(Boolean);

  return {
    ...cv,
    objective: clean(cv.objective),
    skills: cv.skills.map((group) => ({ ...group, items: clean(group.items) })),
    experiences: cv.experiences.map((exp) => ({
      ...exp,
      highlights: clean(exp.highlights),
    })),
    projects: cv.projects.map((project) => ({
      ...project,
      stack: clean(project.stack),
      highlights: clean(project.highlights),
    })),
  };
};
