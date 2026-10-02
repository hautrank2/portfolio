import type { Metadata } from "next";
import { Globe } from "lucide-react";
import type { IconType } from "react-icons";
import { FaGithub, FaLinkedinIn } from "react-icons/fa6";
import { CvContactActions } from "~/components/cv/cv-contact-actions";
import { cvData } from "~/data/cv";
import { profileData } from "~/data/site";
import type { CvModel } from "~/types";
import { ResumeSidebar } from "./_components/resume-sidebar";
import {
  ResumeAbout,
  ResumeContact,
  ResumeEducation,
  ResumeExperience,
  ResumePaperLink,
  ResumeProfile,
  ResumeProjects,
  ResumeSection,
  ResumeSkills,
  type ResumeStats,
} from "./_components/resume-sections";

export const metadata: Metadata = {
  title: "resume",
  description: `${cvData.name} — ${cvData.title}. An interactive resume: experience, projects and the stack behind them.`,
};

const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");

/**
 * Years since the earliest "Mon YYYY" in the experience entries (the internship
 * note counts), rounded down to the half year: 3.5 → "3.5+". Computed at build
 * time, so it ticks over on the next deploy rather than on its own.
 */
const yearsOfExperience = (cv: CvModel) => {
  const dates = cv.experiences
    .flatMap(
      (exp) => `${exp.period} ${exp.note}`.match(/[A-Z][a-z]{2} \d{4}/g) ?? []
    )
    .map((text) => {
      const [month, year] = text.split(" ");
      return new Date(Number(year), MONTHS.indexOf(month ?? ""), 1);
    })
    .filter((date) => !Number.isNaN(date.getTime()));
  if (dates.length === 0) return null;

  const start = Math.min(...dates.map((date) => date.getTime()));
  const years = (Date.now() - start) / (365.25 * 24 * 60 * 60 * 1000);
  return Math.floor(years * 2) / 2;
};

/** Icon for a CV link by its label; anything else gets a globe. */
const linkIcons: Record<string, IconType> = {
  github: FaGithub,
  linkedin: FaLinkedinIn,
};

const sections = [
  { id: "about", label: "About" },
  { id: "education", label: "Education" },
  { id: "skills", label: "Skills" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "contact", label: "Contact" },
];

export default function ResumePage() {
  const cv = cvData;
  const years = yearsOfExperience(cv);
  const technologies = new Set(
    cv.skills.flatMap((group) => group.items.map((item) => item.trim()))
  );
  const stats: ResumeStats = [
    ...(years ? [{ label: "Years building", value: `${years}+` }] : []),
    { label: "Projects", value: String(cv.projects.length) },
    { label: "Technologies", value: String(technologies.size) },
  ];

  const contactActions = (
    <CvContactActions
      name={cv.name}
      phone={cv.phone}
      email={cv.email}
      pdfHref={profileData.cv}
    />
  );

  return (
    <div className="grid w-full grid-cols-[minmax(0,1fr)] lg:grid-cols-[18rem_minmax(0,1fr)]">
      <ResumeSidebar
        items={sections}
        header={
          <ResumeProfile
            cv={cv}
            actions={
              <CvContactActions
                name={cv.name}
                phone={cv.phone}
                email={cv.email}
                pdfHref={profileData.cv}
                showCopy={false}
                size="sm"
              />
            }
          />
        }
        footer={
          <div className="space-y-4">
            <ResumePaperLink href="/cv" />
            <div className="flex flex-wrap items-center gap-2">
              {cv.links
                .filter((link) => link.url.trim())
                .map((link) => {
                  const Icon = linkIcons[link.label.toLowerCase()] ?? Globe;
                  return (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={link.label}
                      title={link.label}
                      className="grid size-9 place-items-center rounded-full border border-border/60 text-foreground/70 transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:text-primary"
                    >
                      <Icon className="size-4" />
                    </a>
                  );
                })}
            </div>
          </div>
        }
      />

      <div className="mx-auto w-full max-w-4xl min-w-0 space-y-28 px-4 pt-16 pb-24 sm:space-y-36 sm:px-8 lg:px-12 lg:py-12">
        <ResumeSection id="about" index={1} title="About">
          <ResumeAbout cv={cv} stats={stats} />
        </ResumeSection>
        <ResumeSection id="education" index={2} title="Education">
          <ResumeEducation cv={cv} />
        </ResumeSection>
        <ResumeSection id="skills" index={3} title="Skills">
          <ResumeSkills cv={cv} />
        </ResumeSection>
        <ResumeSection id="experience" index={4} title="Experience">
          <ResumeExperience cv={cv} />
        </ResumeSection>
        <ResumeSection id="projects" index={5} title="Projects">
          <ResumeProjects cv={cv} />
        </ResumeSection>
        <ResumeSection id="contact" index={6} title="Contact">
          <ResumeContact>{contactActions}</ResumeContact>
        </ResumeSection>
      </div>
    </div>
  );
}
