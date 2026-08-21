import type { Root } from "hast";
import Link from "next/link";
import type { ReactElement } from "react";
import { cache } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeReact from "rehype-react";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { CodeBlock } from "~/components/ui/code-block";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

/**
 * rehype-pretty-code tags the language as `data-language`. Lift it to a plain
 * `language` property so it reaches <CodeBlock> as a normal prop.
 */
function rehypeCodeLanguage() {
  return (tree: Root) => {
    visit(tree, "element", (node) => {
      if (node.tagName !== "pre") return;
      const props = node.properties ?? {};
      const language = props.dataLanguage ?? props["data-language"];
      if (typeof language === "string" && language !== "plaintext") {
        props.language = language;
      }
      node.properties = props;
    });
  };
}

type MarkdownLinkProps = React.ComponentProps<"a">;

/** Internal links go through the router; external ones open safely. */
const MarkdownLink = ({ href = "", ...props }: MarkdownLinkProps) => {
  if (href.startsWith("/")) return <Link href={href} {...props} />;
  if (href.startsWith("#")) return <a href={href} {...props} />;
  return <a href={href} target="_blank" rel="noreferrer" {...props} />;
};

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSlug)
  // Highlighting runs at build time, so the client ships zero highlighter JS.
  // That matters here: K8s notes are mostly long YAML blocks.
  .use(rehypePrettyCode, { theme: "github-dark-default", keepBackground: false })
  .use(rehypeCodeLanguage)
  .use(rehypeReact, {
    Fragment,
    jsx,
    jsxs,
    components: {
      a: MarkdownLink,
      pre: CodeBlock,
      table: Table,
      thead: TableHeader,
      tbody: TableBody,
      tfoot: TableFooter,
      tr: TableRow,
      th: TableHead,
      td: TableCell,
    },
  });

/** Markdown in, React elements out — so tables and code blocks are real components. */
export const renderMarkdown = cache(
  async (markdown: string): Promise<ReactElement | null> => {
    if (!markdown.trim()) return null;
    const file = await processor.process(markdown);
    return file.result;
  }
);

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
