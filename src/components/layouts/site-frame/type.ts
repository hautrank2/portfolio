import type { ReactNode } from "react";

export type SiteFrameProps = {
  children: ReactNode;
  header: ReactNode;
  footer: ReactNode;
  effects: ReactNode;
  /** Rendered on every page, standalone and the room home included. */
  overlay: ReactNode;
};
