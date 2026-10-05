/** Picks the icon on a demo link: an article to read, or a file to download. */
export type DemoLinkKindEnum = "article" | "download";

export type DemoLinkModel = {
  title: string;
  kind: DemoLinkKindEnum;
  /** Internal path (`/blog/...`) or an absolute URL. */
  href: string;
};

export type DemoModel = {
  slug: string;
  title: string;
  description: string;
  /**
   * Any YouTube link — `watch?v=`, `youtu.be/`, `shorts/` or `embed/`. Leave
   * empty until the video is uploaded; the page shows a placeholder instead.
   */
  youtubeUrl: string;
  /** A few short lines on what the demo shows. Rendered as a list. */
  highlights: string[];
  stack: string[];
  links: DemoLinkModel[];
};

/**
 * What the `/demo` list needs to draw a card. Hand-coded demo pages only have
 * this much — their content lives in their own route, not in the data file.
 */
export type DemoSummaryModel = Pick<
  DemoModel,
  "slug" | "title" | "description" | "stack"
>;
