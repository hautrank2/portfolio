import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { DemoSummaryModel } from "~/types";

export type DemoCardProps = {
  demo: DemoSummaryModel;
};

export const DemoCard = ({ demo }: DemoCardProps) => {
  return (
    <Link
      href={`/demo/${demo.slug}`}
      className="surface group flex h-full flex-col rounded-2xl border border-border/60 p-5 transition-colors hover:border-primary/50"
    >
      <div className="flex items-start gap-3">
        <h3 className="min-w-0 flex-1 text-lg font-semibold tracking-tight">
          {demo.title}
        </h3>
        <ArrowUpRight
          size={16}
          className="mt-1 shrink-0 text-foreground/30 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
        />
      </div>

      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-foreground/60">
        {demo.description}
      </p>

      <p className="mt-auto line-clamp-1 pt-5 text-xs text-foreground/55">
        {demo.stack.join(" · ")}
      </p>
    </Link>
  );
};
