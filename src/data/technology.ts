import type { ProjectTechnologyModel } from "~/types";
import {
  ANGULAR_LOGO,
  ANTD_LOGO,
  K8S_LOGO,
  NEST_LOGO,
  NEXT_LOGO,
  REACT_LOGO,
  THREEJS_LOGO,
} from "~/utils/logo";

/**
 * Every technologyData a project or a stack can be tagged with, keyed by a short
 * slug. One entry per logo in `public/logo/` — adding a key without dropping
 * the file in first ships a 404 into a card.
 *
 * `satisfies` rather than a type annotation: it still checks each entry, but
 * keeps the keys as literals so `technologyData.next` is a typo-proof lookup
 * instead of a possibly-undefined index.
 */
export const technologyData = {
  next: { title: "Next.js", logoUrl: NEXT_LOGO },
  react: { title: "React", logoUrl: REACT_LOGO },
  angular: { title: "Angular", logoUrl: ANGULAR_LOGO },
  nest: { title: "NestJS", logoUrl: NEST_LOGO },
  antd: { title: "Ant Design", logoUrl: ANTD_LOGO },
  k8s: { title: "Kubernetes", logoUrl: K8S_LOGO },
  threejs: { title: "Three.js", logoUrl: THREEJS_LOGO },
} satisfies Record<string, ProjectTechnologyModel>;
