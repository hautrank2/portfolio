import { cache } from "react";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSlug)
  // Highlighting runs at build time, so the client ships zero highlighter JS.
  // That matters here: K8s notes are mostly long YAML blocks.
  .use(rehypePrettyCode, { theme: "github-dark-default", keepBackground: false })
  .use(rehypeStringify);

export const renderMarkdown = cache(async (markdown: string) => {
  if (!markdown.trim()) return "";
  const file = await processor.process(markdown);
  return String(file);
});

/** Headings we can build an in-page table of contents from. */
export function extractHeadings(markdown: string) {
  const headings: { depth: number; text: string; id: string }[] = [];
  let inFence = false;

  for (const line of markdown.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;

    const text = match[2].replace(/[*_`]/g, "");
    headings.push({
      depth: match[1].length,
      text,
      // Mirrors github-slugger, which is what rehype-slug uses.
      id: text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, "")
        .trim()
        .replace(/\s+/g, "-"),
    });
  }

  return headings;
}

/** Rough minutes-to-read, Vietnamese and English land close enough at ~200wpm. */
export function readingTime(markdown: string) {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
