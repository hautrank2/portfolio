/** How well-formed a note is. Purely informational, shown as a badge. */
export type NoteStatusType = "seed" | "growing" | "evergreen";

/**
 * One entry in a folder's `order:` list. A bare string is the child's slug; the
 * object form lets a not-yet-written child carry a real title so it can still
 * be listed as a planned node.
 */
export type OrderEntryType = string | { slug: string; title?: string };

/** Frontmatter we read off a `.md` file. Everything is optional but `title`. */
export type BlogFrontmatterType = {
  title?: string;
  description?: string;
  status?: NoteStatusType;
  tags?: string[];
  created?: string;
  updated?: string;
  /** Kept out of the build entirely — use it for raw backlog notes. */
  draft?: boolean;
  /** Only meaningful on an `index.md`: the reading order of its children. */
  order?: OrderEntryType[];
};

export type BlogNodeKindType =
  /** A folder — renders as a hub page listing its children. */
  | "section"
  /** A `.md` file — renders as a note. */
  | "doc"
  /** Listed in `order:` but no file yet. Rendered greyed out, not linkable. */
  | "planned";

export type BlogNodeType = {
  kind: BlogNodeKindType;
  /** Own slug, e.g. `cluster-la-gi`. */
  slug: string;
  /** Full path from the blog root, e.g. `["k8s", "kien-truc", "cluster-la-gi"]`. */
  path: string[];
  /** `/blog/k8s/kien-truc/cluster-la-gi`. Empty for planned nodes. */
  href: string;
  title: string;
  description?: string;
  status?: NoteStatusType;
  tags: string[];
  created?: string;
  updated?: string;
  /** Raw markdown body. Sections may have one (their `index.md` intro). */
  body: string;
  children: BlogNodeType[];
  /** How many descendant docs exist vs. how many are planned. */
  progress: { done: number; total: number };
  /**
   * Hierarchical position from the track root: [4] for a top-level card,
   * [4, 2] for the second child inside it. Drives the "4.2" chips.
   */
  numberPath: number[];
};

/** A node plus its neighbours in flattened reading order. */
export type BlogNodeContextType = {
  node: BlogNodeType;
  /** Ancestors, outermost first. Does not include the node itself. */
  trail: BlogNodeType[];
  prev?: BlogNodeType;
  next?: BlogNodeType;
};

/**
 * Trimmed-down node for the sidebar. Deliberately drops `body` — shipping every
 * note's markdown to the client just to draw a nav tree would dwarf the pages
 * themselves.
 */
export type BlogTreeItemType = {
  kind: BlogNodeKindType;
  slug: string;
  href: string;
  title: string;
  children: BlogTreeItemType[];
  progress: { done: number; total: number };
};

/**
 * One node this browser has opened, as kept in localStorage. Deliberately flat
 * and self-contained — the history has to render without loading the tree, and
 * an entry may outlive the note it points at.
 */
export type VisitedEntryType = {
  href: string;
  title: string;
  /** `planned` nodes have no page, so they can never end up here. */
  kind: Exclude<BlogNodeKindType, "planned">;
  /** Top-level track slug (`k8s`), so a track page can scope its own resume. */
  track?: string;
  /** Ancestor titles joined for display, e.g. `Kubernetes · Nền tảng`. */
  trail?: string;
  /** Epoch ms. Only used to sort — nothing renders the timestamp. */
  visitedAt: number;
};
