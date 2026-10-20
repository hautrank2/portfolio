import type { BlogNodeType } from "~/types";

/** Meta line above the body: only the fields the note actually filled in. */
function metaLine(node: BlogNodeType) {
  const parts: string[] = [];
  if (node.status) parts.push(`Trạng thái: ${node.status}`);
  if (node.created) parts.push(`Tạo: ${node.created}`);
  if (node.updated) parts.push(`Cập nhật: ${node.updated}`);
  if (node.tags.length > 0) {
    parts.push(`Tags: ${node.tags.map((tag) => `#${tag}`).join(", ")}`);
  }
  return parts.length > 0 ? `_${parts.join(" · ")}_` : undefined;
}

/**
 * Markdown outline of a subtree. A `planned` node has no page, so it is listed
 * as text rather than a dead link — the backlog is part of what the page says.
 */
function outline(nodes: BlogNodeType[], depth = 0): string[] {
  return nodes.flatMap((node) => [
    `${"  ".repeat(depth)}- ${
      node.href ? `[${node.title}](${node.href})` : `${node.title} (chưa viết)`
    }`,
    ...outline(node.children, depth + 1),
  ]);
}

/** Breadcrumb trail as one line, so a pasted note still says where it came from. */
function trailLine(trail: BlogNodeType[]) {
  if (trail.length === 0) return undefined;
  return `> ${trail.map((item) => item.title).join(" · ")}`;
}

function join(blocks: (string | undefined)[]) {
  return blocks.filter(Boolean).join("\n\n").trim();
}

/**
 * The whole note as Markdown: heading, description, meta, body. This is what
 * the copy button hands over — a self-contained document, not a DOM scrape.
 */
export function docMarkdown(node: BlogNodeType, trail: BlogNodeType[] = []) {
  return join([
    `# ${node.title}`,
    trailLine(trail),
    node.description,
    metaLine(node),
    node.body,
  ]);
}

/**
 * A folder page as Markdown: its intro, then the reading order underneath it.
 * The listing *is* the page here, so copying without it would copy nothing.
 */
export function sectionMarkdown(node: BlogNodeType, trail: BlogNodeType[] = []) {
  const children = outline(node.children);

  return join([
    `# ${node.title || "Blog"}`,
    trailLine(trail),
    node.description,
    node.body,
    children.length > 0 ? `## Nội dung\n\n${children.join("\n")}` : undefined,
    `_Tiến độ: ${node.progress.done}/${node.progress.total} note._`,
  ]);
}
