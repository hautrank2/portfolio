import type { Metadata } from "next";
import PageHeader from "~/components/layouts/page-header";
import { CvContactActions } from "~/components/cv/cv-contact-actions";
import { CvDocument } from "~/components/cv/cv-document";
import { cvData } from "~/data/cv";
import { profileData } from "~/data/site";

export const metadata: Metadata = {
  title: "cv",
  description: `${cvData.name} — ${cvData.title}. Experience, projects and skills.`,
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
