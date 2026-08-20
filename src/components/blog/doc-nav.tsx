import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { BlogNodeType } from "~/types";

/**
 * Previous/next follow the roadmap's reading order, not publish date — the
 * point of the order lists is that they beat chronology for a learning track.
 */
function DocNav({ prev, next }: { prev?: BlogNodeType; next?: BlogNodeType }) {
  if (!prev && !next) return null;

  return (
    <nav className="mt-16 grid gap-4 border-t border-border/60 pt-8 sm:grid-cols-2">
      {prev ? (
        <Link
          href={prev.href}
          className="surface group rounded-2xl border border-border/60 p-4 transition-colors hover:border-primary/50"
        >
          <span className="flex items-center gap-1.5 text-xs text-foreground/45">
            <ArrowLeft size={12} className="transition-transform group-hover:-translate-x-0.5" />
            Trước đó
          </span>
          <p className="mt-1.5 font-medium tracking-tight">{prev.title}</p>
        </Link>
      ) : (
        <span />
      )}

      {next && (
        <Link
          href={next.href}
          className="surface group rounded-2xl border border-border/60 p-4 text-right transition-colors hover:border-primary/50 sm:col-start-2"
        >
          <span className="flex items-center justify-end gap-1.5 text-xs text-foreground/45">
            Tiếp theo
            <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
          </span>
          <p className="mt-1.5 font-medium tracking-tight">{next.title}</p>
        </Link>
      )}
    </nav>
  );
}

export { DocNav };
