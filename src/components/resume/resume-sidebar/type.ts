import type React from "react";

export type ResumeSidebarItem = {
  /** Element id of the section, without `#`. */
  id: string;
  label: string;
};

export type ResumeSidebarProps = {
  items: ResumeSidebarItem[];
  /** Top of the sidebar: who this is — photo, name, title, contact actions. */
  header: React.ReactNode;
  /** Pinned to the bottom of the desktop sidebar — links, the printable CV. */
  footer?: React.ReactNode;
};

export type UseResumeSidebarProps = ResumeSidebarProps & {};
