import Link from "next/link";
import React from "react";
import { Typography } from "~/components/ui/typography";

type SectionHeadlinePropsType = {
  /** Section number shown as a kicker, e.g. "01". */
  index: string;
  title: string;
  /** Anchor id of the section this headline belongs to. */
  href: string;
  description?: string;
  /** Optional trailing control, e.g. a "view all" button. */
  action?: React.ReactNode;
};

function SectionHeadline({
  index,
  title,
  href,
  description,
  action,
}: SectionHeadlinePropsType) {
  return (
    <div className="flex flex-col gap-6 border-b border-border/60 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          {index}
          <span aria-hidden className="h-px w-10 bg-primary/40" />
        </p>
        <Link href={`#${href}`} className="group mt-3 block w-fit">
          <Typography
            variant="h1"
            className="text-3xl transition-colors group-hover:text-primary sm:text-4xl"
          >
            {title}
            <span className="ml-2 text-primary opacity-0 transition-opacity group-hover:opacity-100">
              #
            </span>
          </Typography>
        </Link>
        {description && (
          <Typography variant="p" className="mt-3 max-w-xl text-muted-foreground">
            {description}
          </Typography>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export default SectionHeadline;
