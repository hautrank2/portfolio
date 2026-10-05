import { normalizeCv } from "~/utils/cv";
import type { CvModel } from "~/types";
import cvJson from "./cv.json";

/**
 * The published CV. It lives in `cv.json` rather than in this file because the
 * editor on `localhost:8080/cv/editor` writes it back to disk — commit and push
 * the JSON to publish. Normalizing here keeps a hand-edited file from breaking
 * the build over a missing field.
 */
const parsed = normalizeCv(cvJson);
if (!parsed) throw new Error("src/data/cv.json is not a valid CV.");

export const cvData: CvModel = parsed;
