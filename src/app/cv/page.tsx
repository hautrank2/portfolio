import type { Metadata } from "next";
import { CvContactActions } from "~/components/cv/cv-contact-actions";
import PageHeader from "~/components/layouts/page-header";
import { cvData } from "~/data/cv";
import { profileData } from "~/data/site";
import { CvDocument } from "./_components/cv-document";

export const metadata: Metadata = {
  title: "cv",
  description: `${cvData.name} — ${cvData.title}. Experience, projects and skills.`,
  // Unlisted: reachable only by its link, which is shared by hand. Nothing on
  // the site points here, and search engines are asked to stay out too.
  robots: { index: false, follow: false },
};

export default function CvPage() {
  return (
    <div className="pb-24 print:pb-0">
      <div className="print:hidden">
        <PageHeader
          kicker="Curriculum vitae"
          title={`${cvData.name} · ${cvData.title}`}
          description="Everything on this site, condensed onto paper. If it looks like a fit, get in touch."
        >
          <div className="mt-8">
            <CvContactActions
              name={cvData.name}
              phone={cvData.phone}
              email={cvData.email}
              pdfHref={profileData.cv}
            />
          </div>
        </PageHeader>
      </div>

      <div className="px-4 py-12 sm:px-8 print:p-0">
        <CvDocument cv={cvData} className="rounded-xl print:rounded-none" />
      </div>
    </div>
  );
}
