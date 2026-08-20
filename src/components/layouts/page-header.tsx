import React from "react";
import { Typography } from "~/components/ui/typography";

type PageHeaderPropsType = {
  kicker: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
};

function PageHeader({
  kicker,
  title,
  description,
  children,
}: PageHeaderPropsType) {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div
        aria-hidden
        className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_75%)]"
      />
      <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-8 lg:px-16 lg:py-24">
        <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          {kicker}
          <span aria-hidden className="h-px w-10 bg-primary/40" />
        </p>
        <Typography
          variant="h1"
          className="text-gradient mt-4 text-4xl font-extrabold leading-tight sm:text-6xl"
        >
          {title}
        </Typography>
        {description && (
          <Typography
            variant="p"
            className="mt-5 max-w-2xl text-lg text-foreground/80"
          >
            {description}
          </Typography>
        )}
        {children}
      </div>
    </section>
  );
}

export default PageHeader;
