"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { profileData } from "~/data/site";
import { cn } from "~/lib/utils";
import Nav from "./nav";

function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const trackScroll = () => setScrolled(window.scrollY > 24);

    trackScroll();
    window.addEventListener("scroll", trackScroll, { passive: true });
    return () => window.removeEventListener("scroll", trackScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-30 h-16",
        "flex items-center justify-between gap-4 px-4 sm:px-8 lg:px-16",
        "border-b transition-colors duration-500",
        scrolled
          ? "border-border/60 bg-background/80 backdrop-blur-md"
          : "border-transparent bg-transparent"
      )}
    >
      <Link href="/" className="group flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-sm font-bold tracking-tight text-primary-foreground transition-transform group-hover:-rotate-6">
          HT
        </span>
        <span className="hidden leading-tight sm:block">
          <span className="block text-sm font-semibold">{profileData.name}</span>
          <span className="block text-xs text-muted-foreground">
            @{profileData.handle}
          </span>
        </span>
      </Link>

      <Nav />
    </header>
  );
}

export default Header;
