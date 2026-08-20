"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { navs } from "~/data/site";
import { cn } from "~/lib/utils";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Nav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="surface flex items-center gap-1 rounded-full border border-border/60 p-1"
    >
      {navs.map((nav) => {
        const active = isActive(pathname, nav.href);
        return (
          <Link
            key={nav.href}
            href={nav.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors sm:px-4",
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
