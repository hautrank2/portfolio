"use client";

import {
  ClipboardCopy,
  Download,
  Eye,
  Printer,
  RotateCcw,
  Save,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { CvDocument } from "~/app/cv/_components/cv-document";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useCvEditor } from "./hook";
import {
  BasicsSection,
  EducationSection,
  ExperienceSection,
  ObjectiveSection,
  ProjectsSection,
  SkillsSection,
  type CvSectionProps,
} from "./sections";
import type { CvEditorProps } from "./type";

const sections: {
  value: string;
  label: string;
  Section: (props: CvSectionProps) => React.ReactNode;
}[] = [
  { value: "basics", label: "Basics", Section: BasicsSection },
  { value: "objective", label: "Objective", Section: ObjectiveSection },
  { value: "education", label: "Education", Section: EducationSection },
  { value: "skills", label: "Skills", Section: SkillsSection },
  { value: "experience", label: "Experience", Section: ExperienceSection },
  { value: "projects", label: "Projects", Section: ProjectsSection },
];

export const CvEditor = (props: CvEditorProps) => {
  const editor = useCvEditor(props);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] print:block">
      <div className="min-w-0 space-y-6 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={editor.save}
            disabled={!editor.hasDraft || editor.isSaving}
            className="rounded-full"
          >
            <Save />
            {editor.isSaving ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={editor.print}
            className="rounded-full"
          >
            <Printer />
            Print / PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={editor.exportJson}
            className="rounded-full"
          >
            <Download />
            Export JSON
          </Button>
          {/* A label forwards the click to its file input — no ref needed. */}
          <Button asChild variant="outline" className="rounded-full">
            <label>
              <Upload />
              Import
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={editor.importJson}
              />
            </label>
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={editor.copyJson}
            className="rounded-full"
          >
            <ClipboardCopy />
            Copy JSON
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={editor.reset}
            disabled={!editor.hasDraft}
            className="rounded-full text-destructive hover:text-destructive"
          >
            <RotateCcw />
            Reset
          </Button>
        </div>

        <p className="text-sm text-muted-foreground" aria-live="polite">
          {editor.message ??
            (editor.hasDraft
              ? "Unsaved changes — kept in this browser until you Save."
              : "Up to date with src/data/cv.json.")}
        </p>

        <Tabs defaultValue="basics">
          <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-full p-1 [scrollbar-width:none]">
            {sections.map(({ value, label }) => (
              <TabsTrigger key={value} value={value} className="rounded-full">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          {sections.map(({ value, Section }) => (
            <TabsContent key={value} value={value} className="mt-6">
              <Section editor={editor} />
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <div className="min-w-0 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto print:static print:max-h-none print:overflow-visible">
        <div className="mb-3 flex items-center justify-between gap-2 print:hidden">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Eye className="size-4 text-primary" />
            Live preview
          </p>
          <Link href="/cv" className="text-sm text-primary hover:underline">
            Published CV
          </Link>
        </div>
        <CvDocument
          cv={editor.cv}
          className="rounded-xl print:rounded-none sm:min-h-0"
        />
      </div>
    </div>
  );
};
