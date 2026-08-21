import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { BlogNodeType } from "~/types";

export type BlogBreadcrumbProps = {
  trail: BlogNodeType[];
};

/** Ancestors of the current node, outermost first. */
const BlogBreadcrumb = ({ trail }: BlogBreadcrumbProps) => {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-1.5 text-xs text-foreground/50"
    >
      <Link href="/blog" className="transition-colors hover:text-primary">
        Blog
      </Link>
      {trail.map((node) => (
        <span key={node.href} className="flex items-center gap-1.5">
          <ChevronRight size={12} className="text-foreground/25" />
          <Link href={node.href} className="transition-colors hover:text-primary">
            {node.title}
          </Link>
        </span>
      ))}
    </nav>
  );
};

export { BlogBreadcrumb };
