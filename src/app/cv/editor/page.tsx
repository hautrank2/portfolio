import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CvEditor } from "~/components/cv/cv-editor";
import { cvData } from "~/data/cv";

export const metadata: Metadata = {
  title: "cv | editor",
  description: "Local-only editor for the CV.",
  // A working tool, not content — nothing here is worth a search result.
  robots: { index: false },
};

export default function CvEditorPage() {
  // Saving writes into the repo, which only exists on the dev machine. The
  // deployed site shows the CV read-only.
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-24 pt-10 sm:px-8 print:p-0">
      <div className="mb-8 print:hidden">
        <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          CV editor
          <span aria-hidden className="h-px w-10 bg-primary/40" />
        </p>
        <h1 className="text-gradient mt-3 text-3xl font-extrabold sm:text-4xl">
          Write your CV
        </h1>
        <p className="mt-2 max-w-2xl text-foreground/80">
          Edit on the left, watch the sheet update on the right. Save writes
          to <code className="text-primary">src/data/cv.json</code> — commit
          and push it to redeploy <code className="text-primary">/cv</code>.
        </p>
      </div>

      <CvEditor initialCv={cvData} />
    </div>
  );
}
