"use client";

import { cn } from "~/lib/utils";
import { useResumeSidebar } from "./hook";
import type { ResumeSidebarProps } from "./type";

/**
 * The left column of `/resume`. On desktop it is a fixed-width panel flush with
 * the left edge of the window, pinned to the viewport: the
 * profile header on top, the section list with a reading-progress rail in the
 * middle, the footer at the bottom — while the content scrolls beside it.
 * Below `lg` the header simply sits above the content and the section list
 * becomes a strip of pills pinned under the site header.
 */
export const ResumeSidebar = (props: ResumeSidebarProps) => {
  const { items, header, footer } = props;
  const { activeId, progress } = useResumeSidebar(props);

  return (
    <>
      <aside className="px-4 pt-10 sm:px-8 lg:sticky lg:top-16 lg:flex lg:h-[calc(100dvh-4rem)] lg:flex-col lg:overflow-y-auto lg:border-r lg:border-border/60 lg:bg-card/40 lg:px-6 lg:py-8 lg:backdrop-blur-sm lg:[scrollbar-width:none]">
        {header}

        <nav
          aria-label="Resume sections"
          className="relative mt-8 hidden pl-5 lg:block"
        >
          {/* Rail + how far through the page the reader is. */}
          <span
            aria-hidden
            className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-border/60"
          />
          <span
            aria-hidden
            className="absolute left-0 top-1 w-0.5 rounded-full bg-primary transition-[height] duration-150"
            style={{ height: `calc((100% - 0.5rem) * ${progress})` }}
          />
          <ul className="space-y-0.5">
            {items.map((item, index) => {
              const active = activeId === item.id;
              return (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    aria-current={active ? "location" : undefined}
                    className={cn(
                      "group flex items-center gap-3 py-1.5 text-xs font-semibold uppercase tracking-widest transition-all duration-300",
                      active
                        ? "text-foreground"
                        : "text-foreground/45 hover:text-foreground/80"
                    )}
                  >
                    <span
                      className={cn(
                        "font-mono text-xs transition-colors",
                        active ? "text-primary" : "text-foreground/35"
                      )}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {/* The line grows on the active item, like a bookmark. */}
                    <span
                      aria-hidden
                      className={cn(
                        "h-px transition-all duration-300",
                        active
                          ? "w-10 bg-primary"
                          : "w-4 bg-foreground/30 group-hover:w-7 group-hover:bg-foreground/60"
                      )}
                    />
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        {footer && <div className="mt-auto hidden pt-6 lg:block">{footer}</div>}
      </aside>

      {/* Phone / tablet: the same list as a pinned strip of pills. */}
      <nav
        aria-label="Resume sections"
        className="sticky top-16 z-20 mt-10 border-y border-border/60 bg-background/80 px-4 py-2 backdrop-blur-md sm:px-8 lg:hidden"
      >
        <ul className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
          {items.map((item) => (
            <li key={item.id} className="shrink-0">
              <a
                href={`#${item.id}`}
                aria-current={activeId === item.id ? "location" : undefined}
                className={cn(
                  "block rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  activeId === item.id
                    ? "bg-primary/15 text-primary"
                    : "text-foreground/70 hover:text-foreground"
                )}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
};
