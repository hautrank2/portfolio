"use client";

import { cn } from "~/lib/utils";

export type ChartCardProps = {
  title: string;
  /** Says what is plotted and in which unit — a one-series chart has no legend. */
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
};

/** The frame every dashboard chart sits in: a title, a subtitle, the plot. */
export const ChartCard = ({ title, subtitle, className, children }: ChartCardProps) => {
  return (
    <section
      className={cn("surface rounded-xl border border-border/60 p-4", className)}
    >
      <h2 className="text-sm font-semibold">{title}</h2>
      {subtitle && (
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
};
