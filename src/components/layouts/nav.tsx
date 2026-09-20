"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { navData } from "~/data/site";
import { cn } from "~/lib/utils";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Nav() {
  const pathname = usePathname();
  const ref = React.useRef<HTMLElement>(null);

  // On a phone the links scroll sideways, so the current page can sit past the
  // edge. Bring it into view — `block: "nearest"` keeps the page itself still.
  React.useEffect(() => {
    ref.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname]);

  return (
    <nav
      ref={ref}
      aria-label="Main"
      className="surface flex min-w-0 items-center gap-1 overflow-x-auto rounded-full border border-border/60 p-1 [scrollbar-width:none]"
    >
      {navData.map((nav) => {
        const active = isActive(pathname, nav.href);
        return (
          <Link
            key={nav.href}
            href={nav.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors sm:px-4",
              active
                ? "bg-primary/15 text-primary"
                : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
            )}
          >
            {nav.title}
          </Link>
        );
      })}
    </nav>
  );
}

export default Nav;
