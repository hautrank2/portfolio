import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import matter from "gray-matter";
import type {
  BlogFrontmatterType,
  BlogNodeContextType,
  BlogNodeType,
  BlogTreeItemType,
  OrderEntryType,
} from "~/types";

const BLOG_ROOT = path.join(process.cwd(), "content", "blog");
const INDEX_FILE = "index.md";

/** `kien-truc-va-dung-cluster` -> `Kien truc va dung cluster`. Last-resort title. */
function deslugify(slug: string) {
  const spaced = slug.replace(/[-_]/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function normalizeOrder(entry: OrderEntryType) {
  return typeof entry === "string" ? { slug: entry } : entry;
}

/**
 * YAML turns an unquoted `2026-08-20` into a Date, which React refuses to
 * render. Normalise everything back to a plain `YYYY-MM-DD` string so notes can
 * keep the unquoted form that is nicer to type.
 */
function toDateString(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

function readMarkdown(file: string) {
  const parsed = matter(fs.readFileSync(file, "utf8"));
  return { data: parsed.data as BlogFrontmatterType, body: parsed.content.trim() };
}

/**
 * Sorts `nodes` to match `order`, appending anything the list forgot and
 * inserting a `planned` placeholder for anything the list names but that has no
 * file yet. Those placeholders are the point: they turn the order list into a
 * visible backlog.
 */
function applyOrder(
  nodes: BlogNodeType[],
  order: OrderEntryType[] | undefined,
  parentPath: string[]
): BlogNodeType[] {
  if (!order?.length) {
    return [...nodes].sort((a, b) => a.title.localeCompare(b.title, "vi"));
  }

  const bySlug = new Map(nodes.map((node) => [node.slug, node]));
  const ordered: BlogNodeType[] = [];

  for (const raw of order) {
    const { slug, title } = normalizeOrder(raw);
    const found = bySlug.get(slug);

    if (found) {
      bySlug.delete(slug);
      ordered.push(title ? { ...found, title } : found);
      continue;
    }

    ordered.push({
      kind: "planned",
      slug,
      path: [...parentPath, slug],
      href: "",
      title: title ?? deslugify(slug),
      tags: [],
      body: "",
      children: [],
      progress: { done: 0, total: 1 },
    });
  }

  // Files on disk that the order list does not mention still get published —
  // silently dropping them would be a nasty way to lose a note.
  const rest = [...bySlug.values()].sort((a, b) =>
    a.title.localeCompare(b.title, "vi")
  );
  return [...ordered, ...rest];
}

function rollUp(children: BlogNodeType[], self: { isDoc: boolean }) {
  return children.reduce(
    (acc, child) => ({
      done: acc.done + child.progress.done,
      total: acc.total + child.progress.total,
    }),
    { done: self.isDoc ? 1 : 0, total: self.isDoc ? 1 : 0 }
  );
}

function buildDoc(file: string, parentPath: string[]): BlogNodeType | null {
  const slug = path.basename(file, ".md");
  const { data, body } = readMarkdown(file);
  if (data.draft) return null;

  const nodePath = [...parentPath, slug];
  return {
    kind: "doc",
    slug,
    path: nodePath,
    href: `/blog/${nodePath.join("/")}`,
    title: data.title ?? deslugify(slug),
    description: data.description,
    status: data.status,
    tags: data.tags ?? [],
    created: toDateString(data.created),
    updated: toDateString(data.updated),
    body,
    children: [],
    progress: { done: 1, total: 1 },
  };
}

/** Walks a folder into a node. Recurses, so nesting depth is unbounded. */
function buildSection(dir: string, parentPath: string[]): BlogNodeType | null {
  const slug = path.basename(dir);
  const nodePath = parentPath.length || slug !== "blog" ? [...parentPath, slug] : [];

  const indexFile = path.join(dir, INDEX_FILE);
  const index = fs.existsSync(indexFile)
    ? readMarkdown(indexFile)
    : { data: {} as BlogFrontmatterType, body: "" };
  if (index.data.draft) return null;

  const children: BlogNodeType[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === INDEX_FILE) continue;
    const full = path.join(dir, entry.name);

    const child = entry.isDirectory()
      ? buildSection(full, nodePath)
      : entry.name.endsWith(".md")
        ? buildDoc(full, nodePath)
        : null;

    if (child) children.push(child);
  }

  const ordered = applyOrder(children, index.data.order, nodePath);

  return {
    kind: "section",
    slug,
    path: nodePath,
    href: `/blog/${nodePath.join("/")}`.replace(/\/$/, ""),
    title: index.data.title ?? deslugify(slug),
    description: index.data.description,
    status: index.data.status,
    tags: index.data.tags ?? [],
    created: toDateString(index.data.created),
    updated: toDateString(index.data.updated),
    body: index.body,
    children: ordered,
    progress: rollUp(ordered, { isDoc: false }),
  };
}

/** The whole blog as one tree. Its children are the top-level tracks. */
export const getBlogTree = cache((): BlogNodeType => {
  if (!fs.existsSync(BLOG_ROOT)) {
    return {
      kind: "section",
      slug: "blog",
      path: [],
      href: "/blog",
      title: "Blog",
      tags: [],
      body: "",
      children: [],
      progress: { done: 0, total: 0 },
    };
  }
  return buildSection(BLOG_ROOT, [])!;
});

/** Depth-first, in reading order. Planned nodes are skipped — nothing to open. */
export const getReadingOrder = cache((): BlogNodeType[] => {
  const out: BlogNodeType[] = [];
  const walk = (node: BlogNodeType) => {
    for (const child of node.children) {
      if (child.kind === "planned") continue;
      out.push(child);
      walk(child);
    }
  };
  walk(getBlogTree());
  return out;
});

export const getBlogNode = cache(
  (segments: string[]): BlogNodeContextType | null => {
    const trail: BlogNodeType[] = [];
    let node = getBlogTree();

    for (const segment of segments) {
      const next = node.children.find(
        (child) => child.slug === segment && child.kind !== "planned"
      );
      if (!next) return null;
      trail.push(node);
      node = next;
    }

    const flat = getReadingOrder();
    const at = flat.findIndex((item) => item.href === node.href);

    return {
      node,
      trail: trail.slice(1), // drop the synthetic root
      prev: at > 0 ? flat[at - 1] : undefined,
      next: at >= 0 && at < flat.length - 1 ? flat[at + 1] : undefined,
    };
  }
);

/** Every routable path, for `generateStaticParams`. */
export function getAllBlogPaths(): string[][] {
  return getReadingOrder().map((node) => node.path);
}

/** Flattens to docs only — used by the "all notes" listing. */
export function getAllDocs(): BlogNodeType[] {
  return getReadingOrder().filter((node) => node.kind === "doc");
}

/** Strips bodies so the nav tree can cross the server/client boundary cheaply. */
export function toSidebarTree(node: BlogNodeType): BlogTreeItemType {
  return {
    kind: node.kind,
    slug: node.slug,
    href: node.href,
    title: node.title,
    progress: node.progress,
    children: node.children.map(toSidebarTree),
  };
}

/**
 * Document title for a blog path, prefix aside: `blog | k8s | nen-tang`.
 *
 * Capped at three segments. A note five folders deep would otherwise produce a
 * title no browser tab can show, and the middle folders are the least useful
 * part — the track and the page itself are what identify it.
 */
export function blogPathTitle(segments: string[] = []): string {
  const parts = ["blog", ...segments];
  if (parts.length <= 3) return parts.join(" | ");
  return [parts[0], parts[1], parts[parts.length - 1]].join(" | ");
}

/** Every doc below `node`, newest first — powers the "all notes" tab. */
export function flattenDocs(node: BlogNodeType): BlogNodeType[] {
  const out: BlogNodeType[] = [];

  const walk = (current: BlogNodeType) => {
    for (const child of current.children) {
      if (child.kind === "doc") out.push(child);
      walk(child);
    }
  };
  walk(node);

  // Undated notes sort last rather than jumping to the top on an empty string.
  return out.sort((a, b) => (b.updated ?? "").localeCompare(a.updated ?? ""));
}
