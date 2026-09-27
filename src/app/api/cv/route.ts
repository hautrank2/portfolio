import { writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeCv, tidyCv } from "~/lib/cv";

const CV_FILE = path.join(process.cwd(), "src", "data", "cv.json");

/**
 * Saves the editor's CV back into the repo. Development only: on a deployed
 * site there is no writable source tree, and nobody but the owner should be
 * able to change the CV anyway — publishing happens through git, not here.
 */
export async function PUT(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new Response(null, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body is not JSON." }, { status: 400 });
  }

  const cv = normalizeCv(body);
  if (!cv) {
    return Response.json({ error: "Body is not a CV." }, { status: 400 });
  }

  await writeFile(CV_FILE, `${JSON.stringify(tidyCv(cv), null, 2)}\n`, "utf8");
  return Response.json({ ok: true });
}
