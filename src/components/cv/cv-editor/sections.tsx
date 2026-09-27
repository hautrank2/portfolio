import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import React from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";
import type { CvEditorApi } from "./hook";
import type { CvListKey } from "./type";

type FieldProps = Omit<React.ComponentProps<typeof Input>, "onChange"> & {
  label: string;
  hint?: string;
  onValueChange: (value: string) => void;
};

const Field = ({ label, hint, className, onValueChange, ...props }: FieldProps) => {
  const id = React.useId();
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        onChange={(event) => onValueChange(event.target.value)}
        {...props}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
};

type AreaFieldProps = Omit<React.ComponentProps<typeof Textarea>, "onChange"> & {
  label: string;
  hint?: string;
  onValueChange: (value: string) => void;
};

const AreaField = ({
  label,
  hint,
  className,
  onValueChange,
  ...props
}: AreaFieldProps) => {
  const id = React.useId();
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        onChange={(event) => onValueChange(event.target.value)}
        {...props}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
};

type ItemCardProps = {
  editor: CvEditorApi;
  listKey: CvListKey;
  index: number;
  count: number;
  title: string;
  children: React.ReactNode;
};

/** One repeatable block — an education row, a job, a project. */
const ItemCard = ({
  editor,
  listKey,
  index,
  count,
  title,
  children,
}: ItemCardProps) => (
  <div className="surface space-y-4 rounded-xl border border-border/60 p-4">
    <div className="flex items-center justify-between gap-2">
      <p className="min-w-0 truncate text-sm font-semibold">
        <span className="me-2 text-primary">#{index + 1}</span>
        {title || "Untitled"}
      </p>
      <div className="flex shrink-0 items-center">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Move up"
          disabled={index === 0}
          onClick={() => editor.moveItem(listKey, index, -1)}
        >
          <ArrowUp />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Move down"
          disabled={index === count - 1}
          onClick={() => editor.moveItem(listKey, index, 1)}
        >
          <ArrowDown />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Remove"
          className="text-destructive hover:text-destructive"
          onClick={() => editor.removeItem(listKey, index)}
        >
          <Trash2 />
        </Button>
      </div>
    </div>
    {children}
  </div>
);

const AddButton = ({
  editor,
  listKey,
  children,
}: {
  editor: CvEditorApi;
  listKey: CvListKey;
  children: React.ReactNode;
}) => (
  <Button
    type="button"
    variant="outline"
    className="w-full border-dashed"
    onClick={() => editor.addItem(listKey)}
  >
    <Plus />
    {children}
  </Button>
);

/**
 * Comma-separated in the form, an array in the model. Items are stored as typed
 * (leading space included) so the text round-trips keystroke by keystroke; only
 * items without one get a space, which makes clean data read `A, B`.
 */
const joinComma = (items: string[]) =>
  items
    .map((item, index) => (index === 0 || /^\s/.test(item) ? item : ` ${item}`))
    .join(",");
const splitComma = (text: string) => (text ? text.split(",") : []);

/** One entry per line. */
const joinLines = (items: string[]) => items.join("\n");
const splitLines = (text: string) => (text ? text.split("\n") : []);

export type CvSectionProps = {
  editor: CvEditorApi;
};

export const BasicsSection = ({ editor }: CvSectionProps) => {
  const { cv, setText } = editor;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Full name"
          value={cv.name}
          onValueChange={(v) => setText("name", v)}
        />
        <Field
          label="Title"
          placeholder="Web Developer"
          value={cv.title}
          onValueChange={(v) => setText("title", v)}
        />
        <Field
          label="Avatar"
          className="sm:col-span-2"
          hint="A path under public/ (e.g. /img/avt.jpg) or a full image URL."
          value={cv.avatar}
          onValueChange={(v) => setText("avatar", v)}
        />
        <Field
          label="Phone"
          type="tel"
          value={cv.phone}
          onValueChange={(v) => setText("phone", v)}
        />
        <Field
          label="Email"
          type="email"
          value={cv.email}
          onValueChange={(v) => setText("email", v)}
        />
        <Field
          label="Birthday"
          placeholder="Sep 06, 2002"
          value={cv.birthday}
          onValueChange={(v) => setText("birthday", v)}
        />
        <Field
          label="Location"
          value={cv.location}
          onValueChange={(v) => setText("location", v)}
        />
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold">Links</p>
        {cv.links.map((link, index) => (
          <div key={index} className="flex items-end gap-2">
            <Field
              label="Label"
              className="w-32 shrink-0"
              value={link.label}
              onValueChange={(v) => editor.updateItem("links", index, { label: v })}
            />
            <Field
              label="URL"
              type="url"
              className="min-w-0 flex-1"
              placeholder="https://"
              value={link.url}
              onValueChange={(v) => editor.updateItem("links", index, { url: v })}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Remove link"
              className="text-destructive hover:text-destructive"
              onClick={() => editor.removeItem("links", index)}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
        <AddButton editor={editor} listKey="links">
          Add link
        </AddButton>
      </div>
    </div>
  );
};

export const ObjectiveSection = ({ editor }: CvSectionProps) => (
  <AreaField
    label="Objective"
    hint="Leave a blank line between paragraphs. Two or three short paragraphs read best."
    className="[&_textarea]:min-h-72"
    value={editor.cv.objective.join("\n\n")}
    onValueChange={editor.setObjective}
  />
);

export const EducationSection = ({ editor }: CvSectionProps) => {
  const { cv, updateItem } = editor;
  return (
    <div className="space-y-4">
      {cv.education.map((edu, index) => (
        <ItemCard
          key={index}
          editor={editor}
          listKey="education"
          index={index}
          count={cv.education.length}
          title={edu.school}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="School"
              className="sm:col-span-2"
              value={edu.school}
              onValueChange={(v) => updateItem("education", index, { school: v })}
            />
            <Field
              label="Period"
              placeholder="Sep 2020 - Jul 2024"
              value={edu.period}
              onValueChange={(v) => updateItem("education", index, { period: v })}
            />
            <Field
              label="Major"
              value={edu.major}
              onValueChange={(v) => updateItem("education", index, { major: v })}
            />
            <Field
              label="Specialty"
              className="sm:col-span-2"
              value={edu.specialty}
              onValueChange={(v) =>
                updateItem("education", index, { specialty: v })
              }
            />
          </div>
        </ItemCard>
      ))}
      <AddButton editor={editor} listKey="education">
        Add education
      </AddButton>
    </div>
  );
};

export const SkillsSection = ({ editor }: CvSectionProps) => {
  const { cv, updateItem } = editor;
  return (
    <div className="space-y-4">
      {cv.skills.map((group, index) => (
        <ItemCard
          key={index}
          editor={editor}
          listKey="skills"
          index={index}
          count={cv.skills.length}
          title={group.label}
        >
          <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
            <Field
              label="Group"
              placeholder="Frontend"
              value={group.label}
              onValueChange={(v) => updateItem("skills", index, { label: v })}
            />
            <Field
              label="Skills"
              hint="Comma-separated."
              placeholder="React, Angular, Next.js"
              value={joinComma(group.items)}
              onValueChange={(v) =>
                updateItem("skills", index, { items: splitComma(v) })
              }
            />
          </div>
        </ItemCard>
      ))}
      <AddButton editor={editor} listKey="skills">
        Add skill group
      </AddButton>
    </div>
  );
};

export const ExperienceSection = ({ editor }: CvSectionProps) => {
  const { cv, updateItem } = editor;
  return (
    <div className="space-y-4">
      {cv.experiences.map((exp, index) => (
        <ItemCard
          key={index}
          editor={editor}
          listKey="experiences"
          index={index}
          count={cv.experiences.length}
          title={exp.company}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Company"
              value={exp.company}
              onValueChange={(v) =>
                updateItem("experiences", index, { company: v })
              }
            />
            <Field
              label="Role"
              value={exp.role}
              onValueChange={(v) => updateItem("experiences", index, { role: v })}
            />
            <Field
              label="Period"
              placeholder="Oct 2023 - Present"
              value={exp.period}
              onValueChange={(v) =>
                updateItem("experiences", index, { period: v })
              }
            />
            <Field
              label="Note"
              placeholder="Internship: Mar 2023 - Sep 2023"
              value={exp.note}
              onValueChange={(v) => updateItem("experiences", index, { note: v })}
            />
            <AreaField
              label="Highlights"
              hint="One bullet per line. Lead with a verb, end with the result."
              className="sm:col-span-2 [&_textarea]:min-h-36"
              value={joinLines(exp.highlights)}
              onValueChange={(v) =>
                updateItem("experiences", index, { highlights: splitLines(v) })
              }
            />
          </div>
        </ItemCard>
      ))}
      <AddButton editor={editor} listKey="experiences">
        Add experience
      </AddButton>
    </div>
  );
};

export const ProjectsSection = ({ editor }: CvSectionProps) => {
  const { cv, updateItem } = editor;
  return (
    <div className="space-y-4">
      {cv.projects.map((project, index) => (
        <ItemCard
          key={index}
          editor={editor}
          listKey="projects"
          index={index}
          count={cv.projects.length}
          title={project.name}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Name"
              className="sm:col-span-2"
              value={project.name}
              onValueChange={(v) => updateItem("projects", index, { name: v })}
            />
            <Field
              label="Type"
              placeholder="Work project"
              value={project.kind}
              onValueChange={(v) => updateItem("projects", index, { kind: v })}
            />
            <Field
              label="Period"
              placeholder="Sep 2024 - Present"
              value={project.period}
              onValueChange={(v) => updateItem("projects", index, { period: v })}
            />
            <Field
              label="Role"
              value={project.role}
              onValueChange={(v) => updateItem("projects", index, { role: v })}
            />
            <Field
              label="Tech stack"
              hint="Comma-separated."
              value={joinComma(project.stack)}
              onValueChange={(v) =>
                updateItem("projects", index, { stack: splitComma(v) })
              }
            />
            <AreaField
              label="Highlights"
              hint="One bullet per line."
              className="sm:col-span-2 [&_textarea]:min-h-36"
              value={joinLines(project.highlights)}
              onValueChange={(v) =>
                updateItem("projects", index, { highlights: splitLines(v) })
              }
            />
          </div>
        </ItemCard>
      ))}
      <AddButton editor={editor} listKey="projects">
        Add project
      </AddButton>
    </div>
  );
};
