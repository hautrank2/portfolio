import type { ProjectTechnologyModel } from "~/types";
import { technologyData } from "./technology";

/**
 * Logo for a top-level blog track, keyed by its folder slug under
 * `content/blog/`. Tracks are just folders on disk, so this is the one place
 * that knows a folder name maps to a brand.
 *
 * Typed with `| undefined` on purpose: a new track is a new folder and nothing
 * forces a logo to exist for it. Callers fall back to the generic icon.
 */
export const trackLogoData: Record<string, ProjectTechnologyModel | undefined> =
  {
    k8s: technologyData.k8s,
    threejs: technologyData.threejs,
  };
