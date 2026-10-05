"use client";

import Image from "next/image";
import { Badge } from "~/components/ui/badge";
import { getTechnologyStyle } from "~/data/technology-style";
import { cn } from "~/lib/utils";

export type TechnologyBadgeProps = {
  name: string;
  /** Rendered after the name, e.g. a usage count. */
  children?: React.ReactNode;
};

/**
 * One technology. A name configured in `technology-style.ts` gets its colour
 * and logo; anything else is shown as plain text.
 */
export const TechnologyBadge = ({ name, children }: TechnologyBadgeProps) => {
  const style = getTechnologyStyle(name);

  if (!style) {
    return (
      <Badge variant="outline" className="whitespace-nowrap">
        {name}
        {children}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="gap-1.5 whitespace-nowrap"
      // The colour comes from config data, so it cannot be a Tailwind class.
      // The two-digit suffixes are alpha: a faint fill and a soft border.
      style={{ backgroundColor: `${style.color}1a`, borderColor: `${style.color}66` }}
    >
      {style.logoUrl ? (
        <Image
          src={style.logoUrl}
          alt=""
          width={14}
          height={14}
          className="size-3.5 shrink-0 object-contain"
        />
      ) : (
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: style.color }}
        />
      )}
      {name}
      {children}
    </Badge>
  );
};

export type TechnologyListProps = {
  technologies: string[];
  className?: string;
};

/** The technologies on a task or logtime. Renders nothing when there are none. */
export const TechnologyList = ({ technologies, className }: TechnologyListProps) => {
  if (technologies.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {technologies.map((name) => (
        <TechnologyBadge key={name} name={name} />
      ))}
    </div>
  );
};
