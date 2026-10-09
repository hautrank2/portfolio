import { cvData } from "~/data/cv";
import { renderCvPdf } from "./_components/cv-pdf";

/**
 * Rendered once at build time: the CV only changes when `cv.json` is committed,
 * and every commit is a new build. In `pnpm dev` it re-renders per request, so
 * a Save in the editor shows up in the next download.
 */
export const dynamic = "force-static";

/** `Trần Trung Hậu` → `TranTrungHau`: ASCII-only, so every browser keeps it. */
const toFilePart = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .replace(/[^A-Za-z0-9]+/g, "");

// e.g. CV_TranTrungHau_WebDeveloper.pdf
const fileName = `${["CV", cvData.name, cvData.title]
  .map(toFilePart)
  .filter(Boolean)
  .join("_")}.pdf`;

export async function GET() {
  const pdf = await renderCvPdf(cvData);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      // Unlisted, like the `/cv` page: keep the file out of search results.
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
