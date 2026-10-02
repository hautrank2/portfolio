import Link from "next/link";
import { cn } from "~/lib/utils";

type HeadingType = { depth: number; text: string; id: string };

export type BlogTocProps = {
  headings: HeadingType[];
};

/**
 * Sticky, link-only. Deliberately not a scroll-spy: that needs a client
 * component and an observer for something a reader glances at once.
 */
const BlogToc = ({ headings }: BlogTocProps) => {
  if (headings.length < 3) return null;

  return (
    <aside className="hidden xl:block">
      <div className="sticky top-24">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/40">
          Trong bài
        </p>
        <ul className="mt-4 space-y-2 border-l border-border/60">
          {headings.map((heading) => (
            <li key={heading.id}>
              <Link
                href={`#${heading.id}`}
                className={cn(
                  "-ml-px block border-l border-transparent py-0.5 text-sm text-foreground/55 transition-colors hover:border-primary hover:text-primary",
                  heading.depth === 2 ? "pl-4" : "pl-8 text-[0.8rem]"
                )}
              >
                {heading.text}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};

export { BlogToc };
