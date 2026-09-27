import { Cake, Link2, Mail, MapPin, Phone } from "lucide-react";
import Image from "next/image";
import React from "react";
import { cn } from "~/lib/utils";
import type { CvModel } from "~/types";

export type CvDocumentProps = React.ComponentProps<"article"> & {
  cv: CvModel;
};

type CvSectionProps = {
  title: string;
  children: React.ReactNode;
};

const CvSection = ({ title, children }: CvSectionProps) => (
  <section className="space-y-3">
    <h2 className="flex items-center gap-3 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-primary">
      {title}
      <span aria-hidden className="h-px flex-1 bg-primary/30" />
    </h2>
    {children}
  </section>
);

const displayUrl = (url: string) =>
  url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

const hasText = (value: string) => value.trim().length > 0;

const trimmed = (items: string[]) =>
  items.map((item) => item.trim()).filter(Boolean);

// Keys are indexes on purpose: every list here is typed by hand in the editor,
// so duplicates (two "React" chips) are normal and must not collide.

/**
 * One A4 sheet, single column. Deliberately free of hooks so the published
 * `/cv` stays a Server Component, while the editor can still render it as a
 * live preview.
 */
export const CvDocument = ({ cv, className, ...props }: CvDocumentProps) => {
  const contacts = [
    { icon: Phone, value: cv.phone, href: `tel:${cv.phone.replace(/\s/g, "")}` },
    { icon: Mail, value: cv.email, href: `mailto:${cv.email}` },
    { icon: Cake, value: cv.birthday },
    { icon: MapPin, value: cv.location },
  ].filter((contact) => hasText(contact.value));
  const links = cv.links.filter((link) => hasText(link.url));
  const objective = trimmed(cv.objective);

  return (
    <article
      className={cn(
        "cv-paper mx-auto border border-border/60 w-full max-w-[210mm] space-y-7 px-6 py-8 text-[0.8125rem] leading-relaxed shadow-2xl sm:min-h-[297mm] sm:px-[14mm] sm:py-[12mm]",
        "print:max-w-none print:border-0 print:shadow-none",
        className
      )}
      {...props}
    >
      <header className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-center sm:gap-7">
        {hasText(cv.avatar) && (
          <Image
            src={cv.avatar}
            alt={cv.name}
            width={128}
            height={128}
            // The editor accepts any image URL; skipping the optimizer spares
            // a `remotePatterns` entry for every host someone might paste.
            unoptimized
            priority
            className="size-28 shrink-0 rounded-2xl border border-border object-cover sm:size-32"
          />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {cv.name || "Your name"}
          </h1>
          {hasText(cv.title) && (
            <p className="mt-1 text-base font-semibold text-primary">
              {cv.title}
            </p>
          )}
          {contacts.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-muted-foreground">
              {contacts.map(({ icon: Icon, value, href }, index) => (
                <li key={index} className="flex items-center gap-1.5">
                  <Icon aria-hidden className="size-3.5 text-primary" />
                  {href ? (
                    <a href={href} className="hover:text-primary">
                      {value}
                    </a>
                  ) : (
                    value
                  )}
                </li>
              ))}
            </ul>
          )}
          {links.length > 0 && (
            <ul className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-muted-foreground">
              {links.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 break-all hover:text-primary"
                  >
                    <Link2
                      aria-hidden
                      className="size-3.5 shrink-0 text-primary"
                    />
                    {displayUrl(link.url)}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      {objective.length > 0 && (
        <CvSection title="Objective">
          <div className="space-y-2 text-foreground/85">
            {objective.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </CvSection>
      )}

      {cv.education.length > 0 && (
        <CvSection title="Education">
          <div className="space-y-3">
            {cv.education.map((edu, index) => (
              <div key={index} className="break-inside-avoid">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="font-bold">{edu.school}</p>
                  <p className="text-xs text-muted-foreground">{edu.period}</p>
                </div>
                <p className="text-foreground/85">
                  {[
                    hasText(edu.major) ? `Major: ${edu.major}` : "",
                    hasText(edu.specialty) ? `Specialty: ${edu.specialty}` : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            ))}
          </div>
        </CvSection>
      )}

      {cv.skills.length > 0 && (
        <CvSection title="Skills">
          <dl className="space-y-2">
            {cv.skills.map((group, index) => (
              <div
                key={index}
                className="grid gap-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4"
              >
                <dt className="pt-px font-semibold">{group.label}</dt>
                <dd className="flex flex-wrap gap-1">
                  {trimmed(group.items).map((item, itemIndex) => (
                    <span
                      key={itemIndex}
                      className="rounded border border-primary/25 bg-primary/10 px-1.5 py-px text-[0.7rem]"
                    >
                      {item}
                    </span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </CvSection>
      )}

      {cv.experiences.length > 0 && (
        <CvSection title="Experience">
          <div className="space-y-5">
            {cv.experiences.map((exp, index) => (
              <div key={index} className="break-inside-avoid">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="font-bold">{exp.company}</p>
                  <p className="text-xs text-muted-foreground">{exp.period}</p>
                </div>
                <p className="font-medium text-primary">{exp.role}</p>
                {hasText(exp.note) && (
                  <p className="text-xs text-muted-foreground">{exp.note}</p>
                )}
                <BulletList items={exp.highlights} />
              </div>
            ))}
          </div>
        </CvSection>
      )}

      {cv.projects.length > 0 && (
        <CvSection title="Projects">
          <div className="space-y-5">
            {cv.projects.map((project, index) => {
              const stack = trimmed(project.stack);
              return (
                <div key={index} className="break-inside-avoid">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="font-bold">{project.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[project.kind, project.period]
                        .filter(hasText)
                        .join(" · ")}
                    </p>
                  </div>
                  {hasText(project.role) && (
                    <p>
                      <span className="font-semibold">Role:</span>{" "}
                      {project.role}
                    </p>
                  )}
                  {stack.length > 0 && (
                    <p>
                      <span className="font-semibold">Tech stack:</span>{" "}
                      {stack.join(", ")}
                    </p>
                  )}
                  <BulletList items={project.highlights} />
                </div>
              );
            })}
          </div>
        </CvSection>
      )}

    </article>
  );
};

const BulletList = ({ items }: { items: string[] }) => {
  const visible = trimmed(items);
  if (visible.length === 0) return null;

  return (
    <ul className="mt-1.5 list-disc space-y-1 pl-4 text-foreground/85 marker:text-primary/70">
      {visible.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
};
